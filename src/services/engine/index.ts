/**
 * Core Simulation Engine
 *
 * Implements deterministic year-by-year projection of retirement savings
 * and income streams.
 */

import {
    AccountContext,
    AssumptionSet,
    HouseholdTaxResult,
    HouseholdYearState,
    IncomeStreamContext,
    OneOffExpenseContext,
    OneOffIncomeContext,
    PersonContext,
    PersonTaxResult,
    PersonYearState,
    SpendingAssumption,
    WithdrawalStrategy
} from "./types";

/**
 * Calculate age in a given year
 */
export function calculateAgeInYear(person: PersonContext, year: number): number {
  const personBirthYear = person.dateOfBirth.getFullYear();
  return year - personBirthYear;
}

/**
 * Determine if an income stream is active in a given year for a person
 */
export function isIncomeStreamActive(
  stream: IncomeStreamContext,
  person: PersonContext,
  year: number
): boolean {
  const age = calculateAgeInYear(person, year);
  if (age < stream.activationAge) return false;
  if (stream.endAge != null && age > stream.endAge) return false;
  return true;
}

/**
 * Pro-rata factor for the end year of an income stream (e.g. salary endAge).
 * Symmetric with the activation factor: months strictly BEFORE birth month.
 *
 *   31 Dec → 11/12 (worked Jan-Nov, last day of December is the cutoff)
 *   15 Jun →  5/12 (worked Jan-May)
 *    1 Jan →  0    (already past on 1 Jan)
 */
export function endYearProRataFactor(person: PersonContext): number {
  const birthMonth = person.dateOfBirth.getMonth();
  return Math.max(0, birthMonth) / 12;
}

/**
 * Calculate income from a stream in a given year
 */
export function calculateIncomeForStream(
  stream: IncomeStreamContext,
  baseAmount: number,
  yearsFromStart: number,
  inflationRate: number
): number {
  if (!stream.isIndexed) {
    return baseAmount;
  }
  // Apply inflation: amount * (1 + inflation_rate)^years
  return Math.round(baseAmount * Math.pow(1 + inflationRate, yearsFromStart));
}

/**
 * Calculate investment growth on balances
 */
export function calculateGrowth(
  balance: number,
  realReturnRate: number,
  inflationRate: number
): number {
  // Nominal return = (1 + real_return) * (1 + inflation) - 1
  const nominalReturn = (1 + realReturnRate) * (1 + inflationRate) - 1;
  return Math.round(balance * nominalReturn);
}

/**
 * Calculate the effective personal allowance after high-income tapering.
 */
export function calculateEffectivePersonalAllowance(
  incomeSubjectToTax: number,
  personalAllowance: number
): number {
  const highIncomeThreshold = 100000;
  return incomeSubjectToTax > highIncomeThreshold
    ? Math.max(0, personalAllowance - Math.floor((incomeSubjectToTax - highIncomeThreshold) / 2))
    : personalAllowance;
}

/**
 * Tax computation for a person in a year (UK 2026 rules)
 */
export function calculatePersonalTax(
  incomeSubjectToTax: number,
  personalAllowance: number,
  basicRateBand: number,
  higherRateBand: number,
  basicRate: number,
  higherRate: number,
  additionalRate: number
): number {
  const effectivePersonalAllowance = calculateEffectivePersonalAllowance(
    incomeSubjectToTax,
    personalAllowance
  );
  const basicRateTaxableBand = basicRateBand - personalAllowance;
  const additionalRateThreshold = higherRateBand - effectivePersonalAllowance;

  const taxableIncome = Math.max(0, incomeSubjectToTax - effectivePersonalAllowance);

  if (taxableIncome === 0) {
    return 0;
  }

  let tax = 0;

  // Basic rate (20%)
  const basicRateTaxable = Math.min(taxableIncome, basicRateTaxableBand);
  tax += basicRateTaxable * basicRate;

  // Higher rate (40%)
  if (taxableIncome > basicRateTaxableBand) {
    const higherRateTaxable = Math.min(
      taxableIncome - basicRateTaxableBand,
      additionalRateThreshold - basicRateTaxableBand
    );
    tax += higherRateTaxable * higherRate;
  }

  // Additional rate (45%)
  if (taxableIncome > additionalRateThreshold) {
    const additionalRateTaxable = taxableIncome - additionalRateThreshold;
    tax += additionalRateTaxable * additionalRate;
  }

  return Math.round(tax);
}

/**
 * Build a detailed tax result for a person in a year.
 */
export function calculatePersonTaxResult(
  personId: number,
  year: number,
  incomeStreams: IncomeStreamContext[],
  incomeByStream: Map<number, number>,
  withdrawalDetails: Array<{ accountType: string; taxableComponent: number }>,
  assumptions: AssumptionSet,
  additionalTaxableIncome: number = 0
): PersonTaxResult {
  let tradingIncome = 0;
  let investmentIncome = 0;
  let pensionIncome = 0;

  for (const stream of incomeStreams) {
    const amount = incomeByStream.get(stream.id) || 0;
    if (amount === 0) {
      continue;
    }

    if (stream.type === "salary") {
      tradingIncome += amount;
    } else if (
      stream.type === "db_pension" ||
      stream.type === "dc_pension" ||
      stream.type === "state_pension"
    ) {
      pensionIncome += amount;
    } else {
      investmentIncome += amount;
    }
  }

  const sippWithdrawals = withdrawalDetails
    .filter((detail) => detail.accountType === "sipp")
    .reduce((sum, detail) => sum + detail.taxableComponent, 0);

  // Lump-sum taxable one-offs are reported alongside investmentIncome (closest
  // semantic bucket: realised gains, bonuses, inheritance growth).
  investmentIncome += additionalTaxableIncome;

  const totalIncome = tradingIncome + investmentIncome + pensionIncome + sippWithdrawals;
  const personalAllowance = calculateEffectivePersonalAllowance(
    totalIncome,
    assumptions.personalAllowance
  );
  const taxableIncome = Math.max(0, totalIncome - personalAllowance);
  const basicRateTaxableBand = assumptions.basicRateBand - assumptions.personalAllowance;
  const additionalRateThreshold = assumptions.higherRateBand - personalAllowance;

  const basicRateTaxable = Math.min(taxableIncome, basicRateTaxableBand);
  const basicRateTax = Math.round(Math.max(0, basicRateTaxable) * assumptions.basicRate);

  const higherRateTaxable = Math.min(
    Math.max(0, taxableIncome - basicRateTaxableBand),
    Math.max(0, additionalRateThreshold - basicRateTaxableBand)
  );
  const higherRateTax = Math.round(Math.max(0, higherRateTaxable) * assumptions.higherRate);

  const additionalRateTaxable = Math.max(0, taxableIncome - additionalRateThreshold);
  const additionalRateTax = Math.round(additionalRateTaxable * assumptions.additionalRate);

  const totalTax = basicRateTax + higherRateTax + additionalRateTax;

  return {
    personId,
    year,
    tradingIncome,
    investmentIncome,
    pensionIncome,
    sippWithdrawals,
    totalIncome,
    personalAllowance,
    taxableIncome,
    basicRateTax,
    higherRateTax,
    additionalRateTax,
    totalTax,
    effectiveTaxRate: totalIncome > 0 ? totalTax / totalIncome : 0,
  };
}

/**
 * Aggregate person-level tax results into a household result.
 */
export function calculateHouseholdTaxResult(
  year: number,
  people: Map<number, PersonYearState>
): HouseholdTaxResult {
  const personTaxResults = new Map<number, PersonTaxResult>();
  let totalTax = 0;
  let totalIncome = 0;

  for (const [personId, personYear] of people.entries()) {
    personTaxResults.set(personId, personYear.taxBreakdown);
    totalTax += personYear.taxBreakdown.totalTax;
    totalIncome += personYear.taxBreakdown.totalIncome;
  }

  return {
    year,
    people: personTaxResults,
    totalTax,
    effectiveRate: totalIncome > 0 ? totalTax / totalIncome : 0,
  };
}

/**
 * Pro-rata factor for the activation year of an income stream.
 *
 * The engine uses calendar-year ages (`year - birthYear`) for activation, so
 * someone born late in the year would otherwise be credited a full year of
 * pension in their activation year. We pro-rata by the number of whole calendar
 * months remaining strictly after the birth month.
 *
 * Examples for activation year:
 *   - DOB 31 Dec → birthMonth=11 → 0/12 (no whole months left after December)
 *   - DOB 15 Jun → birthMonth=5  → 6/12
 *   - DOB  1 Jan → birthMonth=0  → 11/12 (conservative — treats Jan as partial)
 */
export function activationYearProRataFactor(person: PersonContext): number {
  const birthMonth = person.dateOfBirth.getMonth(); // 0-indexed
  return Math.max(0, 11 - birthMonth) / 12;
}

/**
 * In the retirement year, share of the year still spent contributing
 * (months strictly before the birth month). Symmetric with the activation factor.
 *
 *   31 Dec → 11/12 (worked Jan-Nov)
 *   15 Jun →  5/12 (worked Jan-May)
 *    1 Jan → 0    (retired immediately)
 */
export function retirementYearAccumulationFactor(person: PersonContext): number {
  const birthMonth = person.dateOfBirth.getMonth();
  return Math.max(0, birthMonth) / 12;
}

/**
 * Household-level drawdown factor for a year:
 *   - 1 if any person is past their retirement year (post-retirement)
 *   - per-person retirement-year activation factor if at boundary
 *   - 0 if everyone is still in accumulation
 *
 * Takes the maximum across people so a fully-retired partner triggers full
 * household drawdown even if another partner is mid-retirement-year.
 */
export function householdDrawdownFactor(people: PersonContext[], year: number): number {
  let factor = 0;
  for (const p of people) {
    if (year > p.retirementYear) {
      factor = 1;
    } else if (year === p.retirementYear) {
      factor = Math.max(factor, activationYearProRataFactor(p));
    }
  }
  return factor;
}

/**
 * Compute a person's stream income for a given year (no withdrawals).
 */
function computePersonStreamIncome(
  person: PersonContext,
  incomeStreams: IncomeStreamContext[],
  assumptions: AssumptionSet,
  year: number,
  baseYear: number
): { incomeByStream: Map<number, number>; totalIncome: number } {
  const incomeByStream = new Map<number, number>();
  let totalIncome = 0;
  const yearsFromBase = year - baseYear;
  const birthYear = person.dateOfBirth.getFullYear();

  for (const stream of incomeStreams) {
    if (stream.personId === person.id && isIncomeStreamActive(stream, person, year)) {
      const fullAmount = calculateIncomeForStream(
        stream,
        stream.annualAmount,
        yearsFromBase,
        assumptions.inflationRate
      );
      const activationYear = birthYear + stream.activationAge;
      const endYear = stream.endAge != null ? birthYear + stream.endAge : null;
      let proRata = 1;
      if (year === activationYear) proRata = activationYearProRataFactor(person);
      else if (endYear != null && year === endYear) proRata = endYearProRataFactor(person);
      const amount = Math.round(fullAmount * proRata);
      incomeByStream.set(stream.id, amount);
      totalIncome += amount;
    }
  }

  return { incomeByStream, totalIncome };
}

/**
 * Allocate a household-level deficit across drawable accounts, in strategy order.
 *
 * Only accounts owned by people in drawdown (year >= retirementYear) are touched.
 * SIPP withdrawals split into 25% tax-free / 75% taxable (UFPLS approximation).
 * Returns withdrawals indexed by account ID and per-person details for tax attribution.
 */
function allocateHouseholdWithdrawals(
  people: PersonContext[],
  accounts: AccountContext[],
  balancesByPerson: Map<number, Map<number, number>>,
  withdrawalStrategy: WithdrawalStrategy,
  assumptions: AssumptionSet,
  year: number,
  deficit: number
): {
  withdrawalsByAccount: Map<number, number>;
  withdrawalDetailsByPerson: Map<number, { accountId: number; accountType: AccountContext["type"]; amountWithdrawn: number; taxableComponent: number; taxFreeComponent: number; }[]>;
} {
  const withdrawalsByAccount = new Map<number, number>();
  const withdrawalDetailsByPerson = new Map<number, { accountId: number; accountType: AccountContext["type"]; amountWithdrawn: number; taxableComponent: number; taxFreeComponent: number; }[]>();
  if (deficit <= 0) {
    return { withdrawalsByAccount, withdrawalDetailsByPerson };
  }

  const peopleById = new Map(people.map((p) => [p.id, p] as const));
  let remaining = deficit;

  for (const accountType of withdrawalStrategy.accountTypeOrder) {
    if (remaining <= 0) break;
    for (const account of accounts) {
      if (remaining <= 0) break;
      if (account.type !== accountType) continue;
      if (account.personId == null) continue;

      const owner = peopleById.get(account.personId);
      if (!owner) continue;
      // Only draw from accounts owned by people in drawdown.
      if (year < owner.retirementYear) continue;
      // SIPPs cannot be touched before minimum access age (e.g. 55).
      if (account.type === "sipp") {
        const ownerAge = calculateAgeInYear(owner, year);
        if (ownerAge < assumptions.sippMinimumAgeAccess) continue;
      }

      const opening = balancesByPerson.get(owner.id)?.get(account.id) ?? 0;
      if (opening <= 0) continue;

      const draw = Math.min(remaining, opening);
      if (draw <= 0) continue;

      let taxFreeComponent = 0;
      let taxableComponent = 0;
      if (account.type === "sipp") {
        taxFreeComponent = Math.round(draw * assumptions.sippTaxFreePercentage);
        taxableComponent = draw - taxFreeComponent;
      } else if (account.type === "isa") {
        taxFreeComponent = draw;
      } else if (account.type === "cash") {
        // Cash is post-tax savings — drawdown is not income; treat as tax-free.
        taxFreeComponent = draw;
      } else {
        // Other (e.g. GIA) is taxable as a simplification.
        taxableComponent = draw;
      }

      withdrawalsByAccount.set(account.id, draw);
      const list = withdrawalDetailsByPerson.get(owner.id) ?? [];
      list.push({
        accountId: account.id,
        accountType: account.type,
        amountWithdrawn: draw,
        taxableComponent,
        taxFreeComponent,
      });
      withdrawalDetailsByPerson.set(owner.id, list);

      remaining -= draw;
    }
  }

  return { withdrawalsByAccount, withdrawalDetailsByPerson };
}

/**
 * Build a person's year state given pre-allocated household withdrawals.
 *
 * The withdrawal decisions are made at household level by the caller; this function
 * only applies them: computes tax on the person's stream income + their attributed
 * SIPP withdrawals, applies growth/contributions/closing balances. Each person's
 * tax uses their own personal allowance independently.
 */
export function projectPersonYear(
  person: PersonContext,
  accounts: AccountContext[],
  incomeStreams: IncomeStreamContext[],
  assumptions: AssumptionSet,
  year: number,
  baseYear: number,
  previousYearBalances: Map<number, number>,
  withdrawalsForPerson: Map<number, number>,
  withdrawalDetailsForPerson: { accountId: number; accountType: AccountContext["type"]; amountWithdrawn: number; taxableComponent: number; taxFreeComponent: number; }[],
  oneOffTaxableIncome: number = 0
): PersonYearState {
  const age = calculateAgeInYear(person, year);
  const isAccumulation = year < person.retirementYear;

  const openingBalances = new Map(previousYearBalances);
  let totalOpeningBalance = 0;
  for (const balance of openingBalances.values()) {
    totalOpeningBalance += balance;
  }

  const { incomeByStream, totalIncome } = computePersonStreamIncome(
    person,
    incomeStreams,
    assumptions,
    year,
    baseYear
  );

  let totalWithdrawals = 0;
  for (const amount of withdrawalsForPerson.values()) {
    totalWithdrawals += amount;
  }

  let incomeSubjectToTax = totalIncome;
  for (const detail of withdrawalDetailsForPerson) {
    incomeSubjectToTax += detail.taxableComponent;
  }

  const taxBreakdown = calculatePersonTaxResult(
    person.id,
    year,
    incomeStreams.filter((stream) => stream.personId === person.id),
    incomeByStream,
    withdrawalDetailsForPerson,
    assumptions,
    oneOffTaxableIncome
  );
  const taxDue = taxBreakdown.totalTax;

  const growthOnBalances = calculateGrowth(
    totalOpeningBalance - totalWithdrawals,
    assumptions.investmentReturn,
    assumptions.inflationRate
  );

  const closingBalances = new Map<number, number>();
  for (const account of accounts) {
    if (account.personId === person.id) {
      const opening = openingBalances.get(account.id) || 0;
      const withdrawal = withdrawalsForPerson.get(account.id) || 0;
      const proRataGrowth = opening > 0 && totalOpeningBalance > 0
        ? Math.round((opening / totalOpeningBalance) * growthOnBalances)
        : 0;
      const proRataTax = opening > 0 && totalOpeningBalance > 0
        ? Math.round((opening / totalOpeningBalance) * taxDue)
        : 0;
      // In the retirement year contributions continue for the months before
      // the birth month (when the person is still working).
      let contributionFactor: number;
      if (isAccumulation) {
        contributionFactor = 1;
      } else if (year === person.retirementYear) {
        contributionFactor = retirementYearAccumulationFactor(person);
      } else {
        contributionFactor = 0;
      }
      const contribution = Math.round(
        (account.annualContribution + account.employerContribution) * contributionFactor
      );

      const closing = opening - withdrawal + proRataGrowth - proRataTax + contribution;
      closingBalances.set(account.id, Math.max(0, closing));
    }
  }

  const effectiveTaxRate = totalIncome > 0 ? taxDue / totalIncome : 0;

  return {
    year,
    age,
    openingBalances,
    incomeByStream,
    totalIncome,
    withdrawalsByAccount: withdrawalsForPerson,
    totalWithdrawals,
    withdrawalDetails: withdrawalDetailsForPerson,
    incomeSubjectToTax,
    taxDue,
    effectiveTaxRate,
    taxBreakdown,
    growthOnBalances,
    inflationAdjustment: 0,
    closingBalances,
  };
}

/**
 * Run a full projection from start year to end year.
 *
 * Drawdown decisions are household-level: stream income from all people is summed,
 * the household deficit (target spending minus household income) is allocated across
 * all drawable accounts in `withdrawalStrategy.accountTypeOrder`. SIPP withdrawals
 * split into 25% tax-free + 75% taxable. Each person's tax is computed against
 * their own personal allowance.
 */
export function runProjection(
  people: PersonContext[],
  accounts: AccountContext[],
  incomeStreams: IncomeStreamContext[],
  assumptions: AssumptionSet,
  spending: SpendingAssumption,
  withdrawalStrategy: WithdrawalStrategy,
  startYear: number,
  endYear: number,
  oneOffIncomes: OneOffIncomeContext[] = [],
  oneOffExpenses: OneOffExpenseContext[] = []
): HouseholdYearState[] {
  const years: HouseholdYearState[] = [];

  const balancesByPerson = new Map<number, Map<number, number>>();
  for (const person of people) {
    const personBalances = new Map<number, number>();
    for (const account of accounts) {
      if (account.personId === person.id) {
        personBalances.set(account.id, account.openingBalance);
      }
    }
    balancesByPerson.set(person.id, personBalances);
  }

  for (let year = startYear; year <= endYear; year++) {
    const householdYear: HouseholdYearState = {
      year,
      people: new Map(),
      totalHouseholdIncome: 0,
      totalHouseholdWithdrawals: 0,
      totalHouseholdGrowth: 0,
      totalHouseholdTax: 0,
      totalHouseholdAssets: 0,
      taxBreakdown: { year, people: new Map(), totalTax: 0, effectiveRate: 0 },
      canSustainSpending: false,
      deficitOrSurplus: 0,
      spendingCoverage: 0,
    };

    // Pass 1: stream income for every person, summed to household income.
    let householdStreamIncome = 0;
    const incomesByPerson = new Map<number, ReturnType<typeof computePersonStreamIncome>>();
    for (const person of people) {
      const income = computePersonStreamIncome(person, incomeStreams, assumptions, year, startYear);
      incomesByPerson.set(person.id, income);
      householdStreamIncome += income.totalIncome;
    }

    // Pass 1b: collect one-off events for this calendar year.
    const oneOffTaxableByPerson = new Map<number, number>();
    let oneOffNonTaxableHousehold = 0;
    let oneOffHouseholdCash = 0;
    for (const event of oneOffIncomes) {
      if (event.year !== year) continue;
      oneOffHouseholdCash += event.amount;
      if (event.taxable && event.personId != null) {
        oneOffTaxableByPerson.set(
          event.personId,
          (oneOffTaxableByPerson.get(event.personId) ?? 0) + event.amount
        );
      } else if (!event.taxable) {
        oneOffNonTaxableHousehold += event.amount;
      }
    }
    const oneOffExpenseTotal = oneOffExpenses
      .filter((e) => e.year === year)
      .reduce((sum, e) => sum + e.amount, 0);

    // Pass 2: household deficit pro-rated by retirement-year boundary.
    // For people fully past retirement, factor = 1 (full year of drawdown).
    // For someone in their retirementYear, factor < 1 by birth month.
    const drawdownFactor = householdDrawdownFactor(people, year);
    const adjustedSpending = (spending.isIndexed
      ? Math.round(spending.annualSpendingTarget * Math.pow(1 + assumptions.inflationRate, year - startYear))
      : spending.annualSpendingTarget) + oneOffExpenseTotal;
    // One-off inflows (taxable + non-taxable) reduce the deficit just like stream income.
    const householdDeficit = drawdownFactor > 0
      ? Math.max(0, Math.round((adjustedSpending - householdStreamIncome - oneOffHouseholdCash) * drawdownFactor))
      : 0;
    void oneOffNonTaxableHousehold;

    // Pass 3: allocate withdrawals across drawable accounts in strategy order.
    const { withdrawalsByAccount, withdrawalDetailsByPerson } = allocateHouseholdWithdrawals(
      people,
      accounts,
      balancesByPerson,
      withdrawalStrategy,
      assumptions,
      year,
      householdDeficit
    );

    // Pass 4: per-person year state (tax, growth, contributions, closing balances).
    for (const person of people) {
      const personBalances = balancesByPerson.get(person.id) || new Map();
      const personWithdrawals = new Map<number, number>();
      for (const account of accounts) {
        if (account.personId !== person.id) continue;
        const amt = withdrawalsByAccount.get(account.id);
        if (amt) personWithdrawals.set(account.id, amt);
      }
      const personDetails = withdrawalDetailsByPerson.get(person.id) ?? [];

      const personYear = projectPersonYear(
        person,
        accounts,
        incomeStreams,
        assumptions,
        year,
        startYear,
        personBalances,
        personWithdrawals,
        personDetails,
        oneOffTaxableByPerson.get(person.id) ?? 0
      );

      householdYear.people.set(person.id, personYear);
      householdYear.totalHouseholdIncome += personYear.totalIncome;
      householdYear.totalHouseholdWithdrawals += personYear.totalWithdrawals;
      householdYear.totalHouseholdGrowth += personYear.growthOnBalances;
      householdYear.totalHouseholdTax += personYear.taxDue;

      balancesByPerson.set(person.id, personYear.closingBalances);
      for (const balance of personYear.closingBalances.values()) {
        householdYear.totalHouseholdAssets += balance;
      }
    }

    householdYear.taxBreakdown = calculateHouseholdTaxResult(year, householdYear.people);
    householdYear.totalHouseholdTax = householdYear.taxBreakdown.totalTax;

    householdYear.deficitOrSurplus = householdYear.totalHouseholdIncome - adjustedSpending;
    // During accumulation, sustainability is meaningless; otherwise the household is
    // sustainable if income covers spending, or if assets remain to draw from.
    householdYear.canSustainSpending = drawdownFactor === 0
      || householdYear.totalHouseholdAssets > 0
      || householdYear.deficitOrSurplus >= 0;
    householdYear.spendingCoverage = householdYear.totalHouseholdIncome / Math.max(1, adjustedSpending);

    years.push(householdYear);
  }

  return years;
}

function isProjectionSustainable(years: HouseholdYearState[]): boolean {
  return years.every((y) => y.canSustainSpending);
}

/**
 * Find the highest annual spending target that keeps every year sustainable.
 * Binary searches over the spending target with the same accounts, streams,
 * and one-off events. Result rounded DOWN to the nearest £100 so the figure
 * is guaranteed-safe.
 */
export function findSafeAnnualSpend(
  people: PersonContext[],
  accounts: AccountContext[],
  incomeStreams: IncomeStreamContext[],
  assumptions: AssumptionSet,
  spending: SpendingAssumption,
  withdrawalStrategy: WithdrawalStrategy,
  startYear: number,
  endYear: number,
  oneOffIncomes: OneOffIncomeContext[] = [],
  oneOffExpenses: OneOffExpenseContext[] = []
): number {
  const runWithSpend = (target: number): boolean => {
    const trial: SpendingAssumption = { ...spending, annualSpendingTarget: target };
    const years = runProjection(
      people, accounts, incomeStreams, assumptions, trial, withdrawalStrategy,
      startYear, endYear, oneOffIncomes, oneOffExpenses
    );
    return isProjectionSustainable(years);
  };

  // 0 may itself be unsustainable (e.g. mid-retirement person with debts).
  if (!runWithSpend(0)) return 0;

  // Find an upper bound that's not sustainable.
  let hi = Math.max(spending.annualSpendingTarget, 1000) * 2;
  while (runWithSpend(hi)) {
    hi *= 2;
    if (hi > 10_000_000) return hi; // unreasonable but stop here
  }

  let lo = 0;
  for (let i = 0; i < 25; i++) {
    const mid = (lo + hi) / 2;
    if (runWithSpend(mid)) lo = mid;
    else hi = mid;
  }

  // Round DOWN to nearest £100 so the figure is guaranteed-safe.
  return Math.floor(lo / 100) * 100;
}

/**
 * Find the additional annual contribution needed to make an under-funded plan
 * sustainable. Binary-searches the £/yr extra to add to the primary person's
 * preferred account (SIPP > ISA > first available) until every year sustains.
 *
 * Returns:
 *   - isSustainable: true if no extra contribution is needed
 *   - additionalAnnualContribution: rounded to the nearest £100, or 0 if N/A
 *   - yearsToRetirement: years from startYear to the earliest retirementYear
 */
export function findGapToTarget(
  people: PersonContext[],
  accounts: AccountContext[],
  incomeStreams: IncomeStreamContext[],
  assumptions: AssumptionSet,
  spending: SpendingAssumption,
  withdrawalStrategy: WithdrawalStrategy,
  startYear: number,
  endYear: number,
  oneOffIncomes: OneOffIncomeContext[] = [],
  oneOffExpenses: OneOffExpenseContext[] = []
): {
  isSustainable: boolean;
  additionalAnnualContribution: number;
  yearsToRetirement: number;
} {
  const baselineYears = runProjection(
    people, accounts, incomeStreams, assumptions, spending, withdrawalStrategy,
    startYear, endYear, oneOffIncomes, oneOffExpenses
  );
  if (isProjectionSustainable(baselineYears)) {
    return { isSustainable: true, additionalAnnualContribution: 0, yearsToRetirement: 0 };
  }

  const earliestRetirement = Math.min(...people.map((p) => p.retirementYear));
  const yearsToRetirement = Math.max(0, earliestRetirement - startYear);

  // Cannot recommend additional contributions if everyone is already retired.
  if (yearsToRetirement === 0) {
    return { isSustainable: false, additionalAnnualContribution: 0, yearsToRetirement: 0 };
  }

  const primary = people.find((p) => p.role === "primary") ?? people[0];
  if (!primary) {
    return { isSustainable: false, additionalAnnualContribution: 0, yearsToRetirement };
  }

  const targetAccount =
    accounts.find((a) => a.personId === primary.id && a.type === "sipp") ??
    accounts.find((a) => a.personId === primary.id && a.type === "isa") ??
    accounts.find((a) => a.personId === primary.id);

  if (!targetAccount) {
    return { isSustainable: false, additionalAnnualContribution: 0, yearsToRetirement };
  }

  const runWithExtra = (extra: number): boolean => {
    const augmented = accounts.map((a) =>
      a.id === targetAccount.id
        ? { ...a, annualContribution: a.annualContribution + extra }
        : a
    );
    const years = runProjection(
      people, augmented, incomeStreams, assumptions, spending, withdrawalStrategy,
      startYear, endYear, oneOffIncomes, oneOffExpenses
    );
    return isProjectionSustainable(years);
  };

  // Find an upper bound that makes the plan sustainable.
  let hi = 1000;
  while (!runWithExtra(hi)) {
    hi *= 2;
    if (hi > 10_000_000) {
      // Plan can't be saved by contributions alone (e.g. accumulating for 0 years
      // before retirement, or spending dwarfs all reasonable savings).
      return { isSustainable: false, additionalAnnualContribution: 0, yearsToRetirement };
    }
  }

  // Binary search.
  let lo = 0;
  for (let i = 0; i < 25; i++) {
    const mid = (lo + hi) / 2;
    if (runWithExtra(mid)) hi = mid;
    else lo = mid;
  }

  // Round up to nearest £100 so the recommendation is a clean number that's
  // guaranteed to still be sustainable.
  return {
    isSustainable: false,
    additionalAnnualContribution: Math.ceil(hi / 100) * 100,
    yearsToRetirement,
  };
}
