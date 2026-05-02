export type OnboardingStepKey =
  | "household"
  | "retirement-timing"
  | "assets"
  | "income-phases"
  | "spending-target";

export interface OnboardingState {
  // Household
  primaryPersonName: string;
  primaryDateOfBirth: string;   // ISO date "YYYY-MM-DD"
  hasPartner: boolean;
  partnerName?: string;
  partnerDateOfBirth?: string;

  // Retirement timing
  primaryRetirementAge: number;
  partnerRetirementAge?: number;

  // Assets
  currentSavings: number;
  accountType: "cash" | "isa" | "sipp" | "mixed";
  annualContribution: number;
  employerContribution: number;

  // Current employment (pre-retirement salary)
  hasSalary: boolean;
  salaryAnnual?: number;
  partnerHasSalary?: boolean;
  partnerSalaryAnnual?: number;

  // Income phases
  hasDbPension: boolean;
  dbPensionAge?: number;
  dbPensionAnnualAmount?: number;
  hasStatePension: boolean;
  statePensionAge?: number;
  statePensionAnnualAmount?: number;
  partnerHasDbPension?: boolean;
  partnerDbPensionAge?: number;
  partnerDbPensionAnnualAmount?: number;
  partnerHasStatePension?: boolean;
  partnerStatePensionAge?: number;
  partnerStatePensionAnnualAmount?: number;

  // Spending target
  annualSpendingTarget: number;
  essentialAnnual: number;       // subset of annualSpendingTarget
}
