import { Button } from "@/components/ui/button";
import { useCreateAccount } from "@/hooks/use-accounts";
import { useCreateExpenseProfile } from "@/hooks/use-expense-profiles";
import { useCreateIncomeStream } from "@/hooks/use-income-streams";
import { useCreatePerson } from "@/hooks/use-people";
import { useCreatePlan } from "@/hooks/use-plans";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { STEPS } from "./constants";
import { OnboardingAssetsStep } from "./steps/assets";
import { OnboardingHouseholdStep } from "./steps/household";
import { OnboardingIncomePhesesStep } from "./steps/income-phases";
import { OnboardingRetirementTimingStep } from "./steps/retirement-timing";
import { OnboardingSpendingTargetStep } from "./steps/spending-target";
import type { OnboardingState } from "./types";

export function OnboardingPage() {
  const navigate = useNavigate();
  const createPlan = useCreatePlan();
  const createPerson = useCreatePerson();
  const createAccount = useCreateAccount();
  const createIncomeStream = useCreateIncomeStream();
  const createExpenseProfile = useCreateExpenseProfile();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [state, setState] = useState<OnboardingState>({
    primaryPersonName: "",
    primaryDateOfBirth: "",
    hasPartner: false,
    primaryRetirementAge: 65,
    currentSavings: 0,
    accountType: "mixed",
    annualContribution: 0,
    employerContribution: 0,
    hasSalary: false,
    partnerHasSalary: false,
    hasDbPension: false,
    hasStatePension: true,
    statePensionAge: 67,
    statePensionAnnualAmount: 11502,
    partnerHasDbPension: false,
    partnerHasStatePension: true,
    partnerStatePensionAnnualAmount: 11502,
    annualSpendingTarget: 30000,
    essentialAnnual: 21000,   // 70% default
  });

  const currentStep = STEPS[currentStepIndex];
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  const handleNext = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
      setSubmitError(null);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
      setSubmitError(null);
    }
  };

  const handleComplete = async () => {
    setSubmitError(null);
    try {
      // 1. Plan
      const planName = `${state.primaryPersonName}'s Plan`;
      const plan = await createPlan.mutateAsync({
        name: planName,
        description: `Created via onboarding flow on ${new Date().toLocaleDateString()}`,
      });
      if (!plan) throw new Error("Plan creation returned no result");

      // 2. Primary person
      const primaryPerson = await createPerson.mutateAsync({
        planId: plan.id,
        role: "primary",
        firstName: state.primaryPersonName,
        dateOfBirth: state.primaryDateOfBirth || null,
        retirementAge: state.primaryRetirementAge,
        statePensionAge: state.statePensionAge,
      });
      if (!primaryPerson) throw new Error("Failed to create primary person");

      // 3. Partner
      let partnerPerson: { id: number; firstName: string } | null = null;
      if (state.hasPartner && state.partnerName) {
        partnerPerson = await createPerson.mutateAsync({
          planId: plan.id,
          role: "partner",
          firstName: state.partnerName,
          dateOfBirth: state.partnerDateOfBirth || null,
          retirementAge: state.partnerRetirementAge ?? state.primaryRetirementAge,
          statePensionAge: state.partnerStatePensionAge ?? state.statePensionAge,
        });
      }

      // 4. Account
      const wrapperTypeMap = { cash: "cash", isa: "isa", sipp: "sipp", mixed: "sipp" } as const;
      const accountNameMap = { cash: "Cash Savings", isa: "ISA", sipp: "SIPP", mixed: "SIPP" };
      const wrapperType = wrapperTypeMap[state.accountType];
      await createAccount.mutateAsync({
        planId: plan.id,
        personId: primaryPerson.id,
        name: accountNameMap[state.accountType],
        wrapperType,
        currentBalance: state.currentSavings,
        annualContribution: state.annualContribution,
        employerContribution: wrapperType === "sipp" ? state.employerContribution : 0,
      });

      // 5. Income streams
      if (state.hasSalary && state.salaryAnnual && state.salaryAnnual > 0) {
        await createIncomeStream.mutateAsync({
          planId: plan.id,
          personId: primaryPerson.id,
          streamType: "employment",
          name: "Salary",
          startAge: 18,
          endAge: state.primaryRetirementAge,
          annualAmount: state.salaryAnnual,
          inflationLinked: true,
          taxable: true,
        });
      }

      if (partnerPerson && state.partnerHasSalary && state.partnerSalaryAnnual && state.partnerSalaryAnnual > 0) {
        await createIncomeStream.mutateAsync({
          planId: plan.id,
          personId: partnerPerson.id,
          streamType: "employment",
          name: `${partnerPerson.firstName}'s Salary`,
          startAge: 18,
          endAge: state.partnerRetirementAge ?? state.primaryRetirementAge,
          annualAmount: state.partnerSalaryAnnual,
          inflationLinked: true,
          taxable: true,
        });
      }

      if (state.hasStatePension) {
        await createIncomeStream.mutateAsync({
          planId: plan.id,
          personId: primaryPerson.id,
          streamType: "state_pension",
          name: "State Pension",
          startAge: state.statePensionAge ?? 67,
          annualAmount: state.statePensionAnnualAmount ?? 11502,
          inflationLinked: true,
          taxable: true,
        });
      }

      if (state.hasDbPension) {
        await createIncomeStream.mutateAsync({
          planId: plan.id,
          personId: primaryPerson.id,
          streamType: "db_pension",
          name: "DB Pension",
          startAge: state.dbPensionAge ?? 60,
          annualAmount: state.dbPensionAnnualAmount ?? 0,
          inflationLinked: true,
          taxable: true,
        });
      }

      if (partnerPerson && state.partnerHasStatePension) {
        await createIncomeStream.mutateAsync({
          planId: plan.id,
          personId: partnerPerson.id,
          streamType: "state_pension",
          name: `${partnerPerson.firstName}'s State Pension`,
          startAge: state.partnerStatePensionAge ?? state.statePensionAge ?? 67,
          annualAmount:
            state.partnerStatePensionAnnualAmount ??
            state.statePensionAnnualAmount ??
            11502,
          inflationLinked: true,
          taxable: true,
        });
      }

      if (partnerPerson && state.partnerHasDbPension) {
        await createIncomeStream.mutateAsync({
          planId: plan.id,
          personId: partnerPerson.id,
          streamType: "db_pension",
          name: `${partnerPerson.firstName}'s DB Pension`,
          startAge: state.partnerDbPensionAge ?? state.dbPensionAge ?? 60,
          annualAmount: state.partnerDbPensionAnnualAmount ?? 0,
          inflationLinked: true,
          taxable: true,
        });
      }

      // 6. Expense profile
      const essential = Math.min(state.essentialAnnual, state.annualSpendingTarget);
      await createExpenseProfile.mutateAsync({
        planId: plan.id,
        name: "Retirement spending",
        essentialAnnual: essential,
        discretionaryAnnual: state.annualSpendingTarget - essential,
        inflationLinked: true,
      });

      navigate({ to: "/plan/$planId", params: { planId: String(plan.id) } });
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Something went wrong. Please try again."
      );
    }
  };

  const handleStateChange = (updates: Partial<OnboardingState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  const isSubmitting =
    createPlan.isPending ||
    createPerson.isPending ||
    createAccount.isPending ||
    createIncomeStream.isPending ||
    createExpenseProfile.isPending;

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-6 py-12">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Create Your Plan</h1>
        <p className="text-muted-foreground">Let's set up your retirement plan step by step.</p>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Step {currentStepIndex + 1} of {STEPS.length}
        </p>
      </div>

      {/* Step content */}
      <div className="rounded-lg border bg-card p-6 text-card-foreground">
        {currentStep === "household" && (
          <OnboardingHouseholdStep state={state} onChange={handleStateChange} />
        )}
        {currentStep === "retirement-timing" && (
          <OnboardingRetirementTimingStep state={state} onChange={handleStateChange} />
        )}
        {currentStep === "assets" && (
          <OnboardingAssetsStep state={state} onChange={handleStateChange} />
        )}
        {currentStep === "income-phases" && (
          <OnboardingIncomePhesesStep state={state} onChange={handleStateChange} />
        )}
        {currentStep === "spending-target" && (
          <OnboardingSpendingTargetStep state={state} onChange={handleStateChange} />
        )}
      </div>

      {/* Error banner */}
      {submitError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {submitError}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between gap-3">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStepIndex === 0 || isSubmitting}
        >
          Previous
        </Button>

        {currentStepIndex === STEPS.length - 1 ? (
          <Button onClick={handleComplete} disabled={!state.primaryPersonName || isSubmitting}>
            {isSubmitting ? "Creating…" : "Complete & Create Plan"}
          </Button>
        ) : (
          <Button onClick={handleNext}>Next</Button>
        )}
      </div>
    </main>
  );
}
