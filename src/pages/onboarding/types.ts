export type OnboardingStepKey =
  | "household"
  | "retirement-timing"
  | "assets"
  | "income-phases"
  | "spending-target";

export interface OnboardingState {
  // Household
  primaryPersonName: string;
  hasPartner: boolean;
  partnerName?: string;

  // Retirement timing
  primaryRetirementAge: number;
  partnerRetirementAge?: number;

  // Assets
  currentSavings: number;
  accountType: "cash" | "isa" | "sipp" | "mixed";

  // Income phases
  hasDbPension: boolean;
  dbPensionAge?: number;
  dbPensionAnnualAmount?: number;
  hasStatePension: boolean;
  statePensionAge?: number;

  // Spending target
  annualSpendingTarget: number;
}
