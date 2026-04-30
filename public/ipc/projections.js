const { eq } = require("drizzle-orm");
const {
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
  };
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
    const endYear = options.endYear ?? (startYear + 30);

    const enginePeople = people.map((person) => {
      if (!person.dateOfBirth) {
        throw new Error(`Person ${person.id} is missing dateOfBirth`);
      }

      return {
        id: person.id,
        planId: person.planId,
        role: person.role,
        name: person.firstName,
        dateOfBirth: new Date(person.dateOfBirth),
      };
    });

    const engineAccounts = accounts.map((account) => ({
      id: account.id,
      planId: account.planId,
      personId: account.personId,
      name: account.name,
      type: mapWrapperType(account.wrapperType),
      openingBalance: account.currentBalance,
    }));

    const engineIncomeStreams = incomeStreams.map((stream) => ({
      id: stream.id,
      planId: stream.planId,
      personId: stream.personId,
      name: stream.name,
      type: mapIncomeStreamType(stream.streamType),
      activationAge: stream.startAge,
      annualAmount: stream.annualAmount,
      isIndexed: stream.inflationLinked,
    }));

    const engineAssumptions = buildAssumptionSet(assumptionSet);
    const spending = {
      id: expenseProfile?.id ?? 0,
      planId,
      annualSpendingTarget:
        (expenseProfile?.essentialAnnual ?? 0) + (expenseProfile?.discretionaryAnnual ?? 0),
      isIndexed: expenseProfile?.inflationLinked ?? true,
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
      endYear
    );

    return {
      planId,
      scenarioId: scenario?.id ?? null,
      assumptionSetId: assumptionSet?.id ?? null,
      expenseProfileId: expenseProfile?.id ?? null,
      startYear,
      endYear,
      years,
      recommendations: generateRecommendations(0, years),
    };
  });
};