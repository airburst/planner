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
  return age >= stream.activationAge;
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
  assumptions: AssumptionSet
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
 * Run a single year of projection for a person
 */
export function projectPersonYear(
  person: PersonContext,
  accounts: AccountContext[],
  incomeStreams: IncomeStreamContext[],
  assumptions: AssumptionSet,
  spending: SpendingAssumption,
  withdrawalStrategy: WithdrawalStrategy,
  year: number,
  baseYear: number,
  previousYearBalances: Map<number, number>
): PersonYearState {
  const age = calculateAgeInYear(person, year);
  const yearsFromBase = year - baseYear;
  const isAccumulation = year < person.retirementYear;

  // Initialize opening balances
  const openingBalances = new Map(previousYearBalances);
  let totalOpeningBalance = 0;
  for (const balance of openingBalances.values()) {
    totalOpeningBalance += balance;
  }

  // Calculate active income
  const incomeByStream = new Map<number, number>();
  let totalIncome = 0;

  for (const stream of incomeStreams) {
    if (stream.personId === person.id && isIncomeStreamActive(stream, person, year)) {
      const amount = calculateIncomeForStream(
        stream,
        stream.annualAmount,
        yearsFromBase,
        assumptions.inflationRate
      );
      incomeByStream.set(stream.id, amount);
      totalIncome += amount;
    }
  }

  // Calculate required withdrawals (if income insufficient).
  // During accumulation no withdrawals occur — the user is funding spending from external income.
  const adjustedSpending = spending.isIndexed
    ? Math.round(spending.annualSpendingTarget * Math.pow(1 + assumptions.inflationRate, yearsFromBase))
    : spending.annualSpendingTarget;

  const deficit = isAccumulation ? 0 : Math.max(0, adjustedSpending - totalIncome);

  const withdrawalsByAccount = new Map<number, number>();
  const withdrawalDetails = [];
  let totalWithdrawals = 0;

  // Simple withdrawal strategy: take from cash first, then ISA, then SIPP
  if (deficit > 0) {
    let remainingDeficit = deficit;

    // Prioritize withdrawal order
    for (const accountType of withdrawalStrategy.accountTypeOrder) {
      for (const account of accounts) {
        if (
          account.personId === person.id &&
          account.type === accountType &&
          remainingDeficit > 0
        ) {
          const currentBalance = openingBalances.get(account.id) || 0;
          const withdrawal = Math.min(remainingDeficit, currentBalance);

          if (withdrawal > 0) {
            withdrawalsByAccount.set(account.id, withdrawal);

            // Track withdrawal details for tax purposes
            const taxableComponent = account.type === "isa" ? 0 : withdrawal;
            withdrawalDetails.push({
              accountId: account.id,
              accountType: account.type,
              amountWithdrawn: withdrawal,
              taxableComponent,
              taxFreeComponent: withdrawal - taxableComponent,
            });

            totalWithdrawals += withdrawal;
            remainingDeficit -= withdrawal;
          }
        }
      }
    }
  }

  // Calculate taxable income (income + taxable portion of withdrawals)
  let incomeSubjectToTax = totalIncome;
  for (const detail of withdrawalDetails) {
    incomeSubjectToTax += detail.taxableComponent;
  }

  const taxBreakdown = calculatePersonTaxResult(
    person.id,
    year,
    incomeStreams.filter((stream) => stream.personId === person.id),
    incomeByStream,
    withdrawalDetails,
    assumptions
  );
  const taxDue = taxBreakdown.totalTax;

  // Calculate growth and inflation adjustment
  const growthOnBalances = calculateGrowth(
    totalOpeningBalance - totalWithdrawals,
    assumptions.investmentReturn,
    assumptions.inflationRate
  );

  // Calculate closing balances
  const closingBalances = new Map<number, number>();

  for (const account of accounts) {
    if (account.personId === person.id) {
      const opening = openingBalances.get(account.id) || 0;
      const withdrawal = withdrawalsByAccount.get(account.id) || 0;
      const proRataGrowth = opening > 0 && totalOpeningBalance > 0
        ? Math.round((opening / totalOpeningBalance) * growthOnBalances)
        : 0;
      const proRataTax = opening > 0 && totalOpeningBalance > 0
        ? Math.round((opening / totalOpeningBalance) * taxDue)
        : 0;
      const contribution = isAccumulation
        ? account.annualContribution + account.employerContribution
        : 0;

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
    withdrawalsByAccount,
    totalWithdrawals,
    withdrawalDetails,
    incomeSubjectToTax,
    taxDue,
    effectiveTaxRate,
    taxBreakdown,
    growthOnBalances,
    inflationAdjustment: 0, // Track separately if needed
    closingBalances,
  };
}

/**
 * Run a full projection from start year to end year
 */
export function runProjection(
  people: PersonContext[],
  accounts: AccountContext[],
  incomeStreams: IncomeStreamContext[],
  assumptions: AssumptionSet,
  spending: SpendingAssumption,
  withdrawalStrategy: WithdrawalStrategy,
  startYear: number,
  endYear: number
): HouseholdYearState[] {
  const years: HouseholdYearState[] = [];

  // Track balances by person
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

  // Project each year
  for (let year = startYear; year <= endYear; year++) {
    const householdYear: HouseholdYearState = {
      year,
      people: new Map(),
      totalHouseholdIncome: 0,
      totalHouseholdWithdrawals: 0,
      totalHouseholdGrowth: 0,
      totalHouseholdTax: 0,
      totalHouseholdAssets: 0,
      taxBreakdown: {
        year,
        people: new Map(),
        totalTax: 0,
        effectiveRate: 0,
      },
      canSustainSpending: false,
      deficitOrSurplus: 0,
      spendingCoverage: 0,
    };

    // Project each person
    for (const person of people) {
      const personBalances = balancesByPerson.get(person.id) || new Map();

      const personYear = projectPersonYear(
        person,
        accounts,
        incomeStreams,
        assumptions,
        spending,
        withdrawalStrategy,
        year,
        startYear,
        personBalances
      );

      householdYear.people.set(person.id, personYear);
      householdYear.totalHouseholdIncome += personYear.totalIncome;
      householdYear.totalHouseholdWithdrawals += personYear.totalWithdrawals;
      householdYear.totalHouseholdGrowth += personYear.growthOnBalances;
      householdYear.totalHouseholdTax += personYear.taxDue;

      // Update balances for next year
      balancesByPerson.set(person.id, personYear.closingBalances);

      // Track total assets
      for (const balance of personYear.closingBalances.values()) {
        householdYear.totalHouseholdAssets += balance;
      }
    }

    householdYear.taxBreakdown = calculateHouseholdTaxResult(year, householdYear.people);
    householdYear.totalHouseholdTax = householdYear.taxBreakdown.totalTax;

    // Calculate household sustainability
    const adjustedSpending = spending.isIndexed
      ? Math.round(spending.annualSpendingTarget * Math.pow(1 + assumptions.inflationRate, year - startYear))
      : spending.annualSpendingTarget;

    householdYear.deficitOrSurplus = householdYear.totalHouseholdIncome - adjustedSpending;
    householdYear.canSustainSpending = householdYear.totalHouseholdAssets > 0 || householdYear.deficitOrSurplus >= 0;
    householdYear.spendingCoverage = householdYear.totalHouseholdIncome / Math.max(1, adjustedSpending);

    years.push(householdYear);
  }

  return years;
}
