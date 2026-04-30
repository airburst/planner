/**
 * Bridge-Year Withdrawal Strategy Module (P3-T3)
 *
 * Handles tax-efficient withdrawal ordering for "bridge years" (pre-State Pension)
 * Covers SIPP 25% tax-free cash and ISA tax-free withdrawals
 */


/**
 * Withdrawal priority ranking
 */
export type WithdrawalPriority = "cash" | "isa" | "sipp" | "other";

/**
 * Tax-aware withdrawal strategy
 */
export interface TaxEfficientStrategy {
  priority: WithdrawalPriority[];
  maximizeISATaxFree: boolean;
  useSippTaxFreeAllowance: boolean;
  sippTaxFreePercentageUsed: number; // 0-1, typically 0.25
}

/**
 * Withdrawal result with tax implications
 */
export interface WithdrawalResult {
  accountType: WithdrawalPriority;
  amountWithdrawn: number;
  taxableAmount: number;
  taxFreeAmount: number;
  explanation: string;
}

/**
 * Account balance tracker
 */
export interface AccountBalance {
  accountId: number;
  type: WithdrawalPriority;
  balance: number;
  taxFreeAllowanceRemaining?: number; // For SIPP
}

/**
 * Default UK-optimized withdrawal strategy
 */
export function getDefaultWithdrawalStrategy(): TaxEfficientStrategy {
  return {
    // Prioritize: Cash first (most flexible), then ISA (tax-free), then SIPP
    priority: ["cash", "isa", "sipp", "other"],
    maximizeISATaxFree: true,
    useSippTaxFreeAllowance: true,
    sippTaxFreePercentageUsed: 0.25,
  };
}

/**
 * Calculate bridge years (years before State Pension starts)
 */
export function calculateBridgeYears(
  retirementAge: number,
  statePensionAge: number
): number {
  return Math.max(0, statePensionAge - retirementAge);
}

/**
 * Withdraw from account with tax implications
 */
export function calculateWithdrawal(
  account: AccountBalance,
  amountNeeded: number,
  sippTaxFreeAllowanceRemaining: number
): WithdrawalResult {
  const amountAvailable = Math.min(account.balance, amountNeeded);

  switch (account.type) {
    case "isa": {
      // ISA withdrawals are always tax-free
      return {
        accountType: "isa",
        amountWithdrawn: amountAvailable,
        taxableAmount: 0,
        taxFreeAmount: amountAvailable,
        explanation: "ISA withdrawal (tax-free by nature)",
      };
    }

    case "sipp": {
      // SIPP has tax-free allowance (25%) then taxable component
      const sippTaxFreeAllowance = Math.round(amountAvailable * (sippTaxFreeAllowanceRemaining / amountAvailable));
      const sippTaxableAmount = amountAvailable - sippTaxFreeAllowance;

      return {
        accountType: "sipp",
        amountWithdrawn: amountAvailable,
        taxableAmount: sippTaxableAmount,
        taxFreeAmount: sippTaxFreeAllowance,
        explanation: `SIPP withdrawal (£${sippTaxFreeAllowance} tax-free, £${sippTaxableAmount} taxable)`,
      };
    }

    case "cash": {
      // Cash withdrawals are fully taxable (except savings allowance)
      return {
        accountType: "cash",
        amountWithdrawn: amountAvailable,
        taxableAmount: amountAvailable,
        taxFreeAmount: 0,
        explanation: "Cash withdrawal (fully taxable, less savings allowance)",
      };
    }

    case "other":
    default:
      return {
        accountType: "other",
        amountWithdrawn: amountAvailable,
        taxableAmount: amountAvailable,
        taxFreeAmount: 0,
        explanation: "Other account withdrawal (treated as taxable)",
      };
  }
}

/**
 * Execute withdrawal sequence using priority strategy
 */
export function executeWithdrawalSequence(
  accounts: AccountBalance[],
  amountNeeded: number,
  strategy: TaxEfficientStrategy,
  sippTaxFreeAllowanceRemaining: number
): WithdrawalResult[] {
  const results: WithdrawalResult[] = [];
  let remainingNeeded = amountNeeded;

  // Sort accounts by priority
  const sortedAccounts = [...accounts].sort((a, b) => {
    const priorityA = strategy.priority.indexOf(a.type);
    const priorityB = strategy.priority.indexOf(b.type);
    return priorityA - priorityB;
  });

  for (const account of sortedAccounts) {
    if (remainingNeeded <= 0 || account.balance <= 0) continue;

    const result = calculateWithdrawal(account, remainingNeeded, sippTaxFreeAllowanceRemaining);

    results.push(result);
    remainingNeeded -= result.amountWithdrawn;
  }

  return results;
}

/**
 * Determine if a year is a bridge year and analyze requirements
 */
export interface BridgeYearAnalysis {
  isBridgeYear: boolean;
  yearsUntilStatePension: number;
  incomeGap: number;
  recommendedWithdrawalSources: WithdrawalPriority[];
  explanation: string;
}

/**
 * Analyze whether a year is in bridge period and withdrawal needs
 */
export function analyzeBridgeYear(
  currentAge: number,
  retirementAge: number,
  statePensionAge: number,
  currentIncome: number,
  spendingTarget: number,
  accountBalances: Map<WithdrawalPriority, number>
): BridgeYearAnalysis {
  const isBridgeYear = currentAge >= retirementAge && currentAge < statePensionAge;
  const incomeGap = Math.max(0, spendingTarget - currentIncome);
  const yearsUntilStatePension = Math.max(0, statePensionAge - currentAge);

  // Calculate available tax-free resources
  const isaBalance = accountBalances.get("isa") || 0;

  let recommendedSources: WithdrawalPriority[] = [];
  let explanation = "";

  if (!isBridgeYear) {
    explanation = "Not in bridge period";
  } else if (incomeGap === 0) {
    explanation = "Spending covered by income, no withdrawals needed";
  } else if (isaBalance >= incomeGap) {
    recommendedSources = ["isa"];
    explanation = `Bridge year: Withdraw £${incomeGap} from ISA (fully tax-free)`;
  } else {
    // Need to use ISA + other sources
    recommendedSources = ["isa", "cash", "sipp"];
    explanation = `Bridge year: £${isaBalance} from ISA (tax-free) + £${incomeGap - isaBalance} from cash/SIPP (taxable)`;
  }

  return {
    isBridgeYear,
    yearsUntilStatePension,
    incomeGap,
    recommendedWithdrawalSources: recommendedSources,
    explanation,
  };
}

/**
 * Generate bridge-year withdrawal plan for multi-year period
 */
export interface BridgeYearPlan {
  startAge: number;
  endAge: number;
  years: BridgeYearPlanYear[];
  totalWithdrawalNeed: number;
  taxFreeCapacity: number; // Available from ISA
}

export interface BridgeYearPlanYear {
  year: number;
  age: number;
  incomeGap: number;
  preferredSources: WithdrawalPriority[];
  taxableWithdrawalNeeded: number;
  note: string;
}

/**
 * Create multi-year bridge-year withdrawal plan
 */
export function generateBridgeYearPlan(
  startAge: number,
  retirementAge: number,
  statePensionAge: number,
  annualIncomeGaps: number[], // Gaps for each year
  isaBalance: number
): BridgeYearPlan {
  const years: BridgeYearPlanYear[] = [];
  let totalWithdrawalNeed = 0;
  let isaUsed = 0;

  for (let i = 0; i < annualIncomeGaps.length; i++) {
    const age = startAge + i;
    const gap = annualIncomeGaps[i];
    const isBridge = age >= retirementAge && age < statePensionAge;

    const sources: WithdrawalPriority[] = [];
    let taxableNeeded = gap;

    if (isBridge && gap > 0) {
      // Try to use ISA first
      const isaUsableThisYear = Math.min(gap, isaBalance - isaUsed);
      if (isaUsableThisYear > 0) {
        sources.push("isa");
        isaUsed += isaUsableThisYear;
        taxableNeeded = gap - isaUsableThisYear;
      }

      if (taxableNeeded > 0) {
        sources.push("cash");
        sources.push("sipp");
      }
    }

    totalWithdrawalNeed += gap;

    years.push({
      year: 2026 + i,
      age,
      incomeGap: gap,
      preferredSources: sources,
      taxableWithdrawalNeeded: taxableNeeded,
      note: isBridge ? `Bridge year ${age - retirementAge + 1}/${statePensionAge - retirementAge}` : "State Pension active",
    });
  }

  return {
    startAge,
    endAge: startAge + annualIncomeGaps.length - 1,
    years,
    totalWithdrawalNeed,
    taxFreeCapacity: isaBalance,
  };
}
