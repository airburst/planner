const { eq } = require("drizzle-orm");
const {
  findDepletionYear,
  findGapToTarget,
  findRetirementDeferralYears,
  findSafeAnnualSpend,
  generateRecommendations,
  runProjection,
} = require("../engine.js");

function parseTaxPolicyJson(taxPolicyJson) {
  if (!taxPolicyJson) {
    return {};
  }

  try {
    return JSON.parse(taxPolicyJson);
  } catch {
    return {};
  }
}

function mapWrapperType(wrapperType) {
  if (wrapperType === "gia") {
    return "other";
  }

  return wrapperType;
}

function mapIncomeStreamType(streamType) {
  if (streamType === "employment") {
    return "salary";
  }

  return streamType;
}

function buildAssumptionSet(row) {
  const taxPolicy = parseTaxPolicyJson(row?.taxPolicyJson);
  const inflationRate = row?.inflationRate ?? 0.025;
  const nominalGrowthRate = row?.nominalGrowthRate ?? 0.05;

  return {
    id: row?.id ?? 0,
    planId: row?.planId ?? 0,
    name: row?.name ?? "Default assumptions",
    inflationRate,
    investmentReturn: nominalGrowthRate - inflationRate,
    personalAllowance: taxPolicy.personalAllowance ?? 12570,
    personalSavingsAllowance: taxPolicy.personalSavingsAllowance ?? 1000,
    basicRateBand: taxPolicy.basicRateBand ?? 50270,
    higherRateBand: taxPolicy.higherRateBand ?? 125140,
    basicRate: taxPolicy.basicRate ?? 0.2,
    higherRate: taxPolicy.higherRate ?? 0.4,
    additionalRate: taxPolicy.additionalRate ?? 0.45,
    sippTaxFreePercentage: taxPolicy.sippTaxFreePercentage ?? 0.25,
    sippMinimumAgeAccess: taxPolicy.sippMinimumAgeAccess ?? 55,
    marriageAllowanceTransfer: taxPolicy.marriageAllowanceTransfer ?? 1260,
  };
}

/**
 * For each person, capture the total opening balance at the start of their
 * retirement year. If the person is already retired (retirementYear <= startYear),
 * use the first year's opening balance. Returns { [personId]: { pot, year, alreadyRetired } }.
 */
function computeRetirementPotByPerson(enginePeople, years, startYear) {
  const result = {};
  for (const person of enginePeople) {
    const alreadyRetired = person.retirementYear <= startYear;
    const targetYear = alreadyRetired ? startYear : person.retirementYear;
    const yearState = years.find((y) => y.year === targetYear);
    let pot = 0;
    const personState = yearState?.people?.get(person.id);
    if (personState) {
      for (const balance of personState.openingBalances.values()) {
        pot += balance;
      }
    }
    result[person.id] = { pot, year: targetYear, alreadyRetired };
  }
  return result;
}

function applyOverridesToEngineData(engineData, overrides) {
  // structuredClone preserves Date instances (JSON.stringify+parse turns them
  // into strings and breaks engine.calculateAgeInYear).
  const data = structuredClone(engineData);

  for (const override of overrides) {
    const path = override.fieldPath.split(".");
    const value = JSON.parse(override.valueJson);

    let current = data;
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      const index = parseInt(path[i + 1], 10);

      if (!isNaN(index)) {
        // Navigate into the array element, not just the array.
        current = current[key][index];
        i++; // Skip the consumed index segment in the next iteration.
      } else {
        if (!current[key]) {
          current[key] = {};
        }
        current = current[key];
      }
    }

    const lastKey = path[path.length - 1];
    current[lastKey] = value;
  }

  // Re-derive engine-only fields that depend on overridden values. The scenario
  // modal writes `people.X.retirementAge` (the DB field name) but the engine
  // reads `retirementYear`. Without this step the override silently no-ops.
  // Note: structuredClone preserves Date instances under Node, but vitest's
  // mocked environment may already coerce Date to string. Be permissive.
  // Reject impossible retirementAge values (e.g. legacy scenarios that stored
  // a delta like -2 instead of an absolute age) — keep the original retirementYear.
  if (Array.isArray(data.people)) {
    for (const person of data.people) {
      if (typeof person.retirementAge === "number" && person.dateOfBirth) {
        if (person.retirementAge < 18 || person.retirementAge > 100) {
          continue;
        }
        const dob =
          person.dateOfBirth instanceof Date
            ? person.dateOfBirth
            : new Date(person.dateOfBirth);
        person.dateOfBirth = dob;
        person.retirementYear = dob.getFullYear() + person.retirementAge;
      }
    }
  }

  return data;
}

module.exports = function registerProjectionHandlers(ipcMain, db, schema) {
  ipcMain.handle("projections:runForPlan", async (_, planId, options = {}) => {
    const people = await db
      .select()
      .from(schema.people)
      .where(eq(schema.people.planId, planId));

    const accounts = await db
      .select()
      .from(schema.accounts)
      .where(eq(schema.accounts.planId, planId));

    const incomeStreams = await db
      .select()
      .from(schema.incomeStreams)
      .where(eq(schema.incomeStreams.planId, planId));

    const oneOffIncomes = await db
      .select()
      .from(schema.oneOffIncomes)
      .where(eq(schema.oneOffIncomes.planId, planId));

    const oneOffExpenses = await db
      .select()
      .from(schema.oneOffExpenses)
      .where(eq(schema.oneOffExpenses.planId, planId));

    const spendingPeriods = await db
      .select()
      .from(schema.spendingPeriods)
      .where(eq(schema.spendingPeriods.planId, planId));

    const scenarios = await db
      .select()
      .from(schema.scenarios)
      .where(eq(schema.scenarios.planId, planId));

    const scenario = options.scenarioId
      ? scenarios.find((row) => row.id === options.scenarioId) || null
      : scenarios[0] || null;

    const assumptionSet = scenario?.assumptionSetId
      ? (
          await db
            .select()
            .from(schema.assumptionSets)
            .where(eq(schema.assumptionSets.id, scenario.assumptionSetId))
        )[0] || null
      : (
          await db
            .select()
            .from(schema.assumptionSets)
            .where(eq(schema.assumptionSets.planId, planId))
        )[0] || null;

    const expenseProfile = scenario?.expenseProfileId
      ? (
          await db
            .select()
            .from(schema.expenseProfiles)
            .where(eq(schema.expenseProfiles.id, scenario.expenseProfileId))
        )[0] || null
      : (
          await db
            .select()
            .from(schema.expenseProfiles)
            .where(eq(schema.expenseProfiles.planId, planId))
        )[0] || null;

    const currentYear = new Date().getFullYear();
    const startYear = options.startYear ?? currentYear;
    // Default end year = max(birthYear + longevityTargetAge), fallback 95.
    const longevityEndYear = people.reduce((max, p) => {
      if (!p.dateOfBirth) return max;
      const birthYear = new Date(p.dateOfBirth).getFullYear();
      const target = p.longevityTargetAge ?? 95;
      return Math.max(max, birthYear + target);
    }, 0);
    const endYear = options.endYear ?? (longevityEndYear || startYear + 30);

    const enginePeople = people.map((person) => {
      if (!person.dateOfBirth) {
        throw new Error(`Person ${person.id} is missing dateOfBirth`);
      }

      const birthYear = new Date(person.dateOfBirth).getFullYear();
      const retirementYear = person.retirementAge != null
        ? birthYear + person.retirementAge
        : startYear;

      return {
        id: person.id,
        planId: person.planId,
        role: person.role,
        name: person.firstName,
        dateOfBirth: new Date(person.dateOfBirth),
        retirementYear,
      };
    });

    const engineAccounts = accounts.map((account) => ({
      id: account.id,
      planId: account.planId,
      personId: account.personId,
      name: account.name,
      type: mapWrapperType(account.wrapperType),
      openingBalance: account.currentBalance,
      annualContribution: account.annualContribution ?? 0,
      employerContribution: account.employerContribution ?? 0,
    }));

    const engineIncomeStreams = incomeStreams.map((stream) => ({
      id: stream.id,
      planId: stream.planId,
      personId: stream.personId,
      name: stream.name,
      type: mapIncomeStreamType(stream.streamType),
      activationAge: stream.startAge,
      endAge: stream.endAge ?? undefined,
      annualAmount: stream.annualAmount,
      isIndexed: stream.inflationLinked,
    }));

    const engineAssumptions = buildAssumptionSet(assumptionSet);
    const enginePeriods = (spendingPeriods ?? []).map((p) => ({
      fromAge: p.fromAge,
      toAge: p.toAge,
      annualAmount: p.annualAmount,
      inflationLinked: p.inflationLinked,
    }));
    const spending = {
      id: expenseProfile?.id ?? 0,
      planId,
      annualSpendingTarget:
        (expenseProfile?.essentialAnnual ?? 0) + (expenseProfile?.discretionaryAnnual ?? 0),
      isIndexed: expenseProfile?.inflationLinked ?? true,
      periods: enginePeriods.length > 0 ? enginePeriods : undefined,
    };
    const withdrawalStrategy = {
      accountTypeOrder: ["cash", "isa", "sipp", "other"],
      optimizeForTaxEfficiency: true,
      sippWithdrawalApproach: "flexible",
    };

    const years = runProjection(
      enginePeople,
      engineAccounts,
      engineIncomeStreams,
      engineAssumptions,
      spending,
      withdrawalStrategy,
      startYear,
      endYear,
      oneOffIncomes,
      oneOffExpenses
    );

    const safeAnnualSpend = findSafeAnnualSpend(
      enginePeople, engineAccounts, engineIncomeStreams, engineAssumptions,
      spending, withdrawalStrategy, startYear, endYear, oneOffIncomes, oneOffExpenses
    );

    // Depletion runway: compare baseline depletion year vs a re-run with
    // 10% lower spending. Reduces both the flat target and any periods.
    const baselineDepletion = findDepletionYear(
      enginePeople, engineAccounts, engineIncomeStreams, engineAssumptions,
      spending, withdrawalStrategy, startYear, endYear, oneOffIncomes, oneOffExpenses
    );
    let depletionRunwayDelta = null;
    if (baselineDepletion !== null) {
      const reducedSpending = {
        ...spending,
        annualSpendingTarget: spending.annualSpendingTarget * 0.9,
        periods: spending.periods?.map((p) => ({ ...p, annualAmount: p.annualAmount * 0.9 })),
      };
      const reducedDepletion = findDepletionYear(
        enginePeople, engineAccounts, engineIncomeStreams, engineAssumptions,
        reducedSpending, withdrawalStrategy, startYear, endYear, oneOffIncomes, oneOffExpenses
      );
      const yearsExtended = reducedDepletion === null
        ? endYear - baselineDepletion
        : reducedDepletion - baselineDepletion;
      depletionRunwayDelta = { yearsExtended, reducedDepletionYear: reducedDepletion };
    }

    const retirementDeferralYears = findRetirementDeferralYears(
      enginePeople, engineAccounts, engineIncomeStreams, engineAssumptions,
      spending, withdrawalStrategy, startYear, endYear, oneOffIncomes, oneOffExpenses
    );

    return {
      planId,
      scenarioId: scenario?.id ?? null,
      assumptionSetId: assumptionSet?.id ?? null,
      expenseProfileId: expenseProfile?.id ?? null,
      startYear,
      endYear,
      years,
      recommendations: generateRecommendations(0, years, {
        targetSpending: spending.annualSpendingTarget,
        safeAnnualSpend,
        depletionRunwayDelta,
        retirementDeferralYears,
      }),
      retirementPotByPerson: computeRetirementPotByPerson(enginePeople, years, startYear),
      accumulationShortfall: findGapToTarget(
        enginePeople,
        engineAccounts,
        engineIncomeStreams,
        engineAssumptions,
        spending,
        withdrawalStrategy,
        startYear,
        endYear,
        oneOffIncomes,
        oneOffExpenses
      ),
      safeAnnualSpend,
    };
  });

  ipcMain.handle("projections:runStressTest", async (_, planId, preset, options = {}) => {
    const people = await db.select().from(schema.people).where(eq(schema.people.planId, planId));
    const accounts = await db.select().from(schema.accounts).where(eq(schema.accounts.planId, planId));
    const incomeStreams = await db.select().from(schema.incomeStreams).where(eq(schema.incomeStreams.planId, planId));
    const oneOffIncomes = await db.select().from(schema.oneOffIncomes).where(eq(schema.oneOffIncomes.planId, planId));
    const oneOffExpenses = await db.select().from(schema.oneOffExpenses).where(eq(schema.oneOffExpenses.planId, planId));
    const spendingPeriods = await db.select().from(schema.spendingPeriods).where(eq(schema.spendingPeriods.planId, planId));

    // If the user is viewing a scenario, layer its overrides + custom assumption
    // set / expense profile on top of the plan baseline before applying the stress.
    let scenario = null;
    let scenarioOverrides = [];
    if (options.scenarioId != null) {
      scenario = (await db
        .select()
        .from(schema.scenarios)
        .where(eq(schema.scenarios.id, options.scenarioId)))[0] || null;
      if (scenario) {
        scenarioOverrides = await db
          .select()
          .from(schema.scenarioOverrides)
          .where(eq(schema.scenarioOverrides.scenarioId, options.scenarioId));
      }
    }
    const assumptionSet = scenario?.assumptionSetId
      ? (await db.select().from(schema.assumptionSets).where(eq(schema.assumptionSets.id, scenario.assumptionSetId)))[0] || null
      : (await db.select().from(schema.assumptionSets).where(eq(schema.assumptionSets.planId, planId)))[0] || null;
    const expenseProfile = scenario?.expenseProfileId
      ? (await db.select().from(schema.expenseProfiles).where(eq(schema.expenseProfiles.id, scenario.expenseProfileId)))[0] || null
      : (await db.select().from(schema.expenseProfiles).where(eq(schema.expenseProfiles.planId, planId)))[0] || null;

    const currentYear = new Date().getFullYear();
    const startYear = options.startYear ?? currentYear;

    // Apply preset adjustments to people, accounts, assumptions, and longevity.
    let longevityShift = 0;
    let enginePeople = people.map((person) => {
      if (!person.dateOfBirth) {
        throw new Error(`Person ${person.id} is missing dateOfBirth`);
      }
      const birthYear = new Date(person.dateOfBirth).getFullYear();
      const retirementYear = person.retirementAge != null
        ? birthYear + person.retirementAge
        : startYear;
      return {
        id: person.id,
        planId: person.planId,
        role: person.role,
        name: person.firstName,
        dateOfBirth: new Date(person.dateOfBirth),
        retirementYear,
        longevityTargetAge: person.longevityTargetAge ?? 95,
      };
    });

    let engineAccounts = accounts.map((a) => ({
      id: a.id,
      planId: a.planId,
      personId: a.personId,
      name: a.name,
      type: mapWrapperType(a.wrapperType),
      openingBalance: a.currentBalance,
      annualContribution: a.annualContribution ?? 0,
      employerContribution: a.employerContribution ?? 0,
    }));
    let engineIncomeStreams = incomeStreams.map((s) => ({
      id: s.id, planId: s.planId, personId: s.personId, name: s.name,
      type: mapIncomeStreamType(s.streamType),
      activationAge: s.startAge,
      endAge: s.endAge ?? undefined,
      annualAmount: s.annualAmount,
      isIndexed: s.inflationLinked,
    }));
    let engineAssumptions = buildAssumptionSet(assumptionSet);
    const enginePeriods = (spendingPeriods ?? []).map((p) => ({
      fromAge: p.fromAge,
      toAge: p.toAge,
      annualAmount: p.annualAmount,
      inflationLinked: p.inflationLinked,
    }));
    const spending = {
      id: expenseProfile?.id ?? 0,
      planId,
      annualSpendingTarget: (expenseProfile?.essentialAnnual ?? 0) + (expenseProfile?.discretionaryAnnual ?? 0),
      isIndexed: expenseProfile?.inflationLinked ?? true,
      periods: enginePeriods.length > 0 ? enginePeriods : undefined,
    };
    const withdrawalStrategy = {
      accountTypeOrder: ["cash", "isa", "sipp", "other"],
      optimizeForTaxEfficiency: true,
      sippWithdrawalApproach: "flexible",
    };

    // If a scenario is in scope, layer its overrides on top of the engine data
    // BEFORE applying the stress preset.
    if (scenarioOverrides && scenarioOverrides.length > 0) {
      const overriddenData = applyOverridesToEngineData(
        { people: enginePeople, accounts: engineAccounts, incomeStreams: engineIncomeStreams },
        scenarioOverrides
      );
      enginePeople = overriddenData.people;
      engineAccounts = overriddenData.accounts;
      engineIncomeStreams = overriddenData.incomeStreams;
    }

    switch (preset) {
      case "high-inflation":
        engineAssumptions = { ...engineAssumptions, inflationRate: engineAssumptions.inflationRate + 0.02 };
        break;
      case "lower-returns":
        engineAssumptions = { ...engineAssumptions, investmentReturn: engineAssumptions.investmentReturn - 0.02 };
        break;
      case "early-death":
        longevityShift = -10;
        enginePeople = enginePeople.map((p) => ({ ...p, longevityTargetAge: p.longevityTargetAge + longevityShift }));
        break;
      case "market-crash":
        // 30% one-time hit applied to current balances at year 0.
        engineAccounts = engineAccounts.map((a) => ({ ...a, openingBalance: a.openingBalance * 0.7 }));
        break;
      default:
        throw new Error(`Unknown stress preset: ${preset}`);
    }

    // Recompute endYear after any longevity shift.
    const longevityEndYear = enginePeople.reduce((max, p) => {
      const birthYear = p.dateOfBirth.getFullYear();
      return Math.max(max, birthYear + p.longevityTargetAge);
    }, 0);
    const endYear = options.endYear ?? (longevityEndYear || startYear + 30);

    const years = runProjection(
      enginePeople, engineAccounts, engineIncomeStreams, engineAssumptions,
      spending, withdrawalStrategy, startYear, endYear, oneOffIncomes, oneOffExpenses
    );
    const safeAnnualSpend = findSafeAnnualSpend(
      enginePeople, engineAccounts, engineIncomeStreams, engineAssumptions,
      spending, withdrawalStrategy, startYear, endYear, oneOffIncomes, oneOffExpenses
    );

    return {
      preset,
      planId,
      startYear,
      endYear,
      years,
      safeAnnualSpend,
    };
  });

  ipcMain.handle("projections:runForScenario", async (_, scenarioId, options = {}) => {
    const scenario = await db
      .select()
      .from(schema.scenarios)
      .where(eq(schema.scenarios.id, scenarioId))
      .then((rows) => rows[0] || null);

    if (!scenario) {
      throw new Error(`Scenario ${scenarioId} not found`);
    }

    const planId = scenario.planId;
    const people = await db
      .select()
      .from(schema.people)
      .where(eq(schema.people.planId, planId));

    const accounts = await db
      .select()
      .from(schema.accounts)
      .where(eq(schema.accounts.planId, planId));

    const incomeStreams = await db
      .select()
      .from(schema.incomeStreams)
      .where(eq(schema.incomeStreams.planId, planId));

    const oneOffIncomes = await db
      .select()
      .from(schema.oneOffIncomes)
      .where(eq(schema.oneOffIncomes.planId, planId));

    const oneOffExpenses = await db
      .select()
      .from(schema.oneOffExpenses)
      .where(eq(schema.oneOffExpenses.planId, planId));

    const spendingPeriods = await db
      .select()
      .from(schema.spendingPeriods)
      .where(eq(schema.spendingPeriods.planId, planId));

    const assumptionSet = scenario.assumptionSetId
      ? (
          await db
            .select()
            .from(schema.assumptionSets)
            .where(eq(schema.assumptionSets.id, scenario.assumptionSetId))
        )[0] || null
      : (
          await db
            .select()
            .from(schema.assumptionSets)
            .where(eq(schema.assumptionSets.planId, planId))
        )[0] || null;

    const expenseProfile = scenario.expenseProfileId
      ? (
          await db
            .select()
            .from(schema.expenseProfiles)
            .where(eq(schema.expenseProfiles.id, scenario.expenseProfileId))
        )[0] || null
      : (
          await db
            .select()
            .from(schema.expenseProfiles)
            .where(eq(schema.expenseProfiles.planId, planId))
        )[0] || null;

    const overrides = await db
      .select()
      .from(schema.scenarioOverrides)
      .where(eq(schema.scenarioOverrides.scenarioId, scenarioId));

    const currentYear = new Date().getFullYear();
    const startYear = options.startYear ?? currentYear;
    // Default end year = max(birthYear + longevityTargetAge), fallback 95.
    const longevityEndYear = people.reduce((max, p) => {
      if (!p.dateOfBirth) return max;
      const birthYear = new Date(p.dateOfBirth).getFullYear();
      const target = p.longevityTargetAge ?? 95;
      return Math.max(max, birthYear + target);
    }, 0);
    const endYear = options.endYear ?? (longevityEndYear || startYear + 30);

    let enginePeople = people.map((person) => {
      if (!person.dateOfBirth) {
        throw new Error(`Person ${person.id} is missing dateOfBirth`);
      }

      const birthYear = new Date(person.dateOfBirth).getFullYear();
      const retirementYear = person.retirementAge != null
        ? birthYear + person.retirementAge
        : startYear;

      return {
        id: person.id,
        planId: person.planId,
        role: person.role,
        name: person.firstName,
        dateOfBirth: new Date(person.dateOfBirth),
        retirementYear,
      };
    });

    let engineAccounts = accounts.map((account) => ({
      id: account.id,
      planId: account.planId,
      personId: account.personId,
      name: account.name,
      type: mapWrapperType(account.wrapperType),
      openingBalance: account.currentBalance,
      annualContribution: account.annualContribution ?? 0,
      employerContribution: account.employerContribution ?? 0,
    }));

    let engineIncomeStreams = incomeStreams.map((stream) => ({
      id: stream.id,
      planId: stream.planId,
      personId: stream.personId,
      name: stream.name,
      type: mapIncomeStreamType(stream.streamType),
      activationAge: stream.startAge,
      endAge: stream.endAge ?? undefined,
      annualAmount: stream.annualAmount,
      isIndexed: stream.inflationLinked,
    }));

    // Apply scenario overrides if they exist
    if (overrides && overrides.length > 0) {
      const engineData = {
        people: enginePeople,
        accounts: engineAccounts,
        incomeStreams: engineIncomeStreams,
      };

      const overriddenData = applyOverridesToEngineData(engineData, overrides);
      enginePeople = overriddenData.people;
      engineAccounts = overriddenData.accounts;
      engineIncomeStreams = overriddenData.incomeStreams;
    }

    const engineAssumptions = buildAssumptionSet(assumptionSet);
    const enginePeriods = (spendingPeriods ?? []).map((p) => ({
      fromAge: p.fromAge,
      toAge: p.toAge,
      annualAmount: p.annualAmount,
      inflationLinked: p.inflationLinked,
    }));
    const spending = {
      id: expenseProfile?.id ?? 0,
      planId,
      annualSpendingTarget:
        (expenseProfile?.essentialAnnual ?? 0) + (expenseProfile?.discretionaryAnnual ?? 0),
      isIndexed: expenseProfile?.inflationLinked ?? true,
      periods: enginePeriods.length > 0 ? enginePeriods : undefined,
    };
    const withdrawalStrategy = {
      accountTypeOrder: ["cash", "isa", "sipp", "other"],
      optimizeForTaxEfficiency: true,
      sippWithdrawalApproach: "flexible",
    };

    const years = runProjection(
      enginePeople,
      engineAccounts,
      engineIncomeStreams,
      engineAssumptions,
      spending,
      withdrawalStrategy,
      startYear,
      endYear,
      oneOffIncomes,
      oneOffExpenses
    );

    const safeAnnualSpend = findSafeAnnualSpend(
      enginePeople, engineAccounts, engineIncomeStreams, engineAssumptions,
      spending, withdrawalStrategy, startYear, endYear, oneOffIncomes, oneOffExpenses
    );

    // Depletion runway: compare baseline depletion year vs a re-run with
    // 10% lower spending. Reduces both the flat target and any periods.
    const baselineDepletion = findDepletionYear(
      enginePeople, engineAccounts, engineIncomeStreams, engineAssumptions,
      spending, withdrawalStrategy, startYear, endYear, oneOffIncomes, oneOffExpenses
    );
    let depletionRunwayDelta = null;
    if (baselineDepletion !== null) {
      const reducedSpending = {
        ...spending,
        annualSpendingTarget: spending.annualSpendingTarget * 0.9,
        periods: spending.periods?.map((p) => ({ ...p, annualAmount: p.annualAmount * 0.9 })),
      };
      const reducedDepletion = findDepletionYear(
        enginePeople, engineAccounts, engineIncomeStreams, engineAssumptions,
        reducedSpending, withdrawalStrategy, startYear, endYear, oneOffIncomes, oneOffExpenses
      );
      const yearsExtended = reducedDepletion === null
        ? endYear - baselineDepletion
        : reducedDepletion - baselineDepletion;
      depletionRunwayDelta = { yearsExtended, reducedDepletionYear: reducedDepletion };
    }

    const retirementDeferralYears = findRetirementDeferralYears(
      enginePeople, engineAccounts, engineIncomeStreams, engineAssumptions,
      spending, withdrawalStrategy, startYear, endYear, oneOffIncomes, oneOffExpenses
    );

    return {
      planId,
      scenarioId: scenario.id,
      assumptionSetId: assumptionSet?.id ?? null,
      expenseProfileId: expenseProfile?.id ?? null,
      startYear,
      endYear,
      years,
      recommendations: generateRecommendations(0, years, {
        targetSpending: spending.annualSpendingTarget,
        safeAnnualSpend,
        depletionRunwayDelta,
        retirementDeferralYears,
      }),
      retirementPotByPerson: computeRetirementPotByPerson(enginePeople, years, startYear),
      accumulationShortfall: findGapToTarget(
        enginePeople,
        engineAccounts,
        engineIncomeStreams,
        engineAssumptions,
        spending,
        withdrawalStrategy,
        startYear,
        endYear,
        oneOffIncomes,
        oneOffExpenses
      ),
      safeAnnualSpend,
    };
  });
};
