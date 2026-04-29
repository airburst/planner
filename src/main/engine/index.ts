/**
 * Core Simulation Engine
 *
 * Implements deterministic year-by-year projection of retirement savings
 * and income streams.
 */

import {
  AccountContext,
  AssumptionSet,
  HouseholdYearState,
  IncomeStreamContext,
  PersonContext,
  PersonYearState,
  ProjectionRun,
  SpendingAssumption,
  WithdrawalStrategy,
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
 * Tax computation for a person in a year (simplified UK 2026 rules)
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
  // High income personal allowance withdrawal (tax trap)
  // For every £2 over £100k, allowance is reduced by £1
  const highIncomeThreshold = 100000;
  const effectivePersonalAllowance = incomeSubjectToTax > highIncomeThreshold
    ? Math.max(0, personalAllowance - Math.floor((incomeSubjectToTax - highIncomeThreshold) / 2))
    : personalAllowance;

  const taxableIncome = Math.max(0, incomeSubjectToTax - effectivePersonalAllowance);

  if (taxableIncome === 0) {
    return 0;
  }

  let tax = 0;

  // Basic rate (20%)
  const basicRateTaxable = Math.min(taxableIncome, basicRateBand - effectivePersonalAllowance);
  tax += basicRateTaxable * basicRate;

  // Higher rate (40%)
  if (taxableIncome > basicRateBand - personalAllowance) {
  if (taxableIncome > basicRateBand - effectivePersonalAllowance) {
    const higherRateTaxable = Math.min(
      taxableIncome - (basicRateBand - effectivePersonalAllowance),
      higherRateBand - basicRateBand
    );
    tax += higherRateTaxable * higherRate;
  }

  // Additional rate (45%)
  if (taxableIncome > higherRateBand - effectivePersonalAllowance) {
    const additionalRateTaxable = taxableIncome - (higherRateBand - effectivePersonalAllowance);
    tax += additionalRateTaxable * additionalRate;
  }

  return Math.round(tax);
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

  // Calculate required withdrawals (if income insufficient)
  const adjustedSpending = spending.isIndexed
    ? Math.round(spending.annualSpendingTarget * Math.pow(1 + assumptions.inflationRate, yearsFromBase))
    : spending.annualSpendingTarget;

  const deficit = Math.max(0, adjustedSpending - totalIncome);

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

  // Calculate tax
  const taxDue = calculatePersonalTax(
    incomeSubjectToTax,
    assumptions.personalAllowance,
    assumptions.basicRateBand,
    assumptions.higherRateBand,
    assumptions.basicRate,
    assumptions.higherRate,
    assumptions.additionalRate
  );

  // Calculate growth and inflation adjustment
  const growthOnBalances = calculateGrowth(
    totalOpeningBalance - totalWithdrawals,
    assumptions.investmentReturn,
    assumptions.inflationRate
  );

  // Calculate closing balances
  const closingBalances = new Map<number, number>();
  let totalClosing = 0;

  for (const account of accounts) {
    if (account.personId === person.id) {
      const opening = openingBalances.get(account.id) || 0;
      const withdrawal = withdrawalsByAccount.get(account.id) || 0;
      const proRataGrowth = opening > 0 && totalOpeningBalance > 0
        ? Math.round((opening / totalOpeningBalance) * growthOnBalances)
        : 0;

      const closing = opening - withdrawal + proRataGrowth - (opening > 0 ? Math.round((opening / totalOpeningBalance) * taxDue) : 0);
      closingBalances.set(account.id, Math.max(0, closing));
      totalClosing += Math.max(0, closing);
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
