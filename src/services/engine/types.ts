/**
 * Calculation Engine - Core Types and Interfaces
 *
 * Defines the domain model for retirement projections, income phases,
 * withdrawals, taxes, and recommendations.
 */

/**
 * A person in the plan (primary or partner)
 */
export interface PersonContext {
  id: number;
  planId: number;
  role: "primary" | "partner";
  name: string;
  dateOfBirth: Date;
  retirementYear: number;
}

/**
 * An account holding retirement savings
 */
export interface AccountContext {
  id: number;
  planId: number;
  personId: number;
  name: string;
  type: "cash" | "isa" | "sipp" | "other";
  openingBalance: number; // GBP pence
  annualContribution: number; // GBP per year, applied during accumulation phase
  employerContribution: number; // GBP per year, applied during accumulation phase (SIPP only)
}

/**
 * An income stream (pension, salary, etc)
 */
export interface IncomeStreamContext {
  id: number;
  planId: number;
  personId: number;
  name: string;
  type: "db_pension" | "dc_pension" | "state_pension" | "salary" | "other";
  activationAge: number; // Age at which income begins
  endAge?: number; // Age after which income stops (e.g. salary stops at retirement)
  annualAmount: number; // GBP pence (if fixed) or starting amount
  isIndexed: boolean; // If true, increases with inflation
}

/**
 * Assumptions that drive the projection
 */
export interface AssumptionSet {
  id: number;
  planId: number;
  name: string;

  // Economic assumptions
  inflationRate: number; // e.g., 0.023 for 2.3%
  investmentReturn: number; // e.g., 0.04 for 4% real return

  // Tax assumptions (UK 2026)
  personalAllowance: number; // GBP per year
  personalSavingsAllowance: number; // GBP per year
  basicRateBand: number; // Upper limit of basic rate (20%)
  higherRateBand: number; // Upper limit of higher rate (40%)
  basicRate: number; // 0.20
  higherRate: number; // 0.40
  additionalRate: number; // 0.45

  // SIPP assumptions
  sippTaxFreePercentage: number; // 0.25 for 25% tax-free lump sum
  sippMinimumAgeAccess: number; // 55 for current rules
}

/**
 * A one-off income event (windfall, inheritance, property sale, bonus)
 * applied in a single calendar year. Can optionally be attributed to a
 * specific person for tax purposes; if no personId is set, the household
 * gets a non-attributed cash inflow.
 */
export interface OneOffIncomeContext {
  id: number;
  planId: number;
  personId: number | null;
  name: string;
  year: number;
  amount: number;
  taxable: boolean;
}

/**
 * A one-off expenditure (car, renovation, gift, care cost) applied in a
 * single calendar year. Increases that year's spending target.
 */
export interface OneOffExpenseContext {
  id: number;
  planId: number;
  name: string;
  year: number;
  amount: number;
}

/**
 * Spending goal
 */
export interface SpendingAssumption {
  id: number;
  planId: number;
  annualSpendingTarget: number; // GBP per year
  isIndexed: boolean;
}

/**
 * Annual state for a person in a year
 */
export interface PersonYearState {
  year: number;
  age: number;

  // Balances (opening)
  openingBalances: Map<number, number>; // accountId -> balance

  // Income
  incomeByStream: Map<number, number>; // streamId -> amount this year
  totalIncome: number;

  // Withdrawals
  withdrawalsByAccount: Map<number, number>; // accountId -> withdrawal amount
  totalWithdrawals: number;
  withdrawalDetails: WithdrawalDetail[];

  // Tax
  incomeSubjectToTax: number; // After personal allowance
  taxDue: number;
  effectiveTaxRate: number;
  taxBreakdown: PersonTaxResult;

  // Investment returns
  growthOnBalances: number;
  inflationAdjustment: number;

  // Closing balances
  closingBalances: Map<number, number>; // accountId -> balance
}

/**
 * Tracking withdrawal source for audit/explanation
 */
export interface WithdrawalDetail {
  accountId: number;
  accountType: "cash" | "isa" | "sipp" | "other";
  amountWithdrawn: number;
  taxableComponent: number; // Amount subject to income tax
  taxFreeComponent: number; // Amount not subject to tax
}

/**
 * Household year state (aggregated from people)
 */
export interface HouseholdYearState {
  year: number;
  people: Map<number, PersonYearState>; // personId -> PersonYearState

  // Household totals
  totalHouseholdIncome: number;
  totalHouseholdWithdrawals: number;
  totalHouseholdGrowth: number;
  totalHouseholdTax: number;
  totalHouseholdAssets: number; // Sum of all closing balances
  taxBreakdown: HouseholdTaxResult;

  // Sustainability
  canSustainSpending: boolean;
  deficitOrSurplus: number;
  spendingCoverage: number; // Ratio of income to spending target
}

/**
 * Complete projection run result
 */
export interface ProjectionRun {
  id: number;
  planId: number;
  assumptionSetId: number;
  createdAt: Date;

  years: HouseholdYearState[];

  // Summary stats
  successRate: number; // % of years where plan is sustainable
  medianWealthAtEnd: number;
  minWealthAcrossYears: number;
  maxWealthAcrossYears: number;
}

/**
 * A recommendation based on projection results
 */
export interface Recommendation {
  id: number;
  projectionRunId: number;
  priority: "high" | "medium" | "low";
  category: "spending" | "income" | "withdrawal" | "tax" | "other";
  title: string;
  description: string;
  rationale: string; // Why this recommendation
  yearTriggered: number; // Year in projection where issue occurred
  impactScore?: number; // Headline £/yr or £ figure to surface in the UI
  impactLabel?: string; // Suffix for the impact figure (e.g. "/yr saved")
}

/**
 * Withdrawal strategy configuration
 */
export interface WithdrawalStrategy {
  // Order in which to draw down accounts
  // E.g., ["cash", "isa", "sipp"]
  accountTypeOrder: ("cash" | "isa" | "sipp" | "other")[];

  // Whether to maximize tax efficiency
  optimizeForTaxEfficiency: boolean;

  // SIPP-specific rules
  sippWithdrawalApproach: "annual_percentage" | "fixed_amount" | "flexible";
  sippAnnualPercentage?: number; // For annual % approach
}

/**
 * Tax computation result for a single person in a year
 */
export interface PersonTaxResult {
  personId: number;
  year: number;

  // Income components
  tradingIncome: number;
  investmentIncome: number;
  pensionIncome: number;
  sippWithdrawals: number;

  totalIncome: number;
  personalAllowance: number;
  taxableIncome: number;

  // Tax calculation
  basicRateTax: number;
  higherRateTax: number;
  additionalRateTax: number;
  totalTax: number;

  effectiveTaxRate: number;
}

/**
 * Household tax result (aggregated from people)
 */
export interface HouseholdTaxResult {
  year: number;
  people: Map<number, PersonTaxResult>; // personId -> PersonTaxResult
  totalTax: number;
  effectiveRate: number;
}
