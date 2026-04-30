import { Button } from "@/components/ui/button";
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
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [state, setState] = useState<OnboardingState>({
    primaryPersonName: "",
    hasPartner: false,
    primaryRetirementAge: 65,
    currentSavings: 0,
    accountType: "mixed",
    hasDbPension: false,
    hasStatePension: true,
    statePensionAge: 67,
    annualSpendingTarget: 50000,
  });

  const currentStep = STEPS[currentStepIndex];
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  const handleNext = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleComplete = async () => {
    try {
      const planName = `${state.primaryPersonName}'s Plan`;
      const result = await createPlan.mutateAsync({
        name: planName,
        description: `Created via onboarding flow on ${new Date().toLocaleDateString()}`,
      });

      if (!result) {
        throw new Error("Plan creation returned no result");
      }

      navigate({ to: "/plan/$planId", params: { planId: String(result.id) } });
    } catch (error) {
      console.error("Failed to create plan:", error);
    }
  };

  const handleStateChange = (updates: Partial<OnboardingState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

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

      {/* Navigation */}
      <div className="flex justify-between gap-3">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStepIndex === 0}
        >
          Previous
        </Button>

        {currentStepIndex === STEPS.length - 1 ? (
          <Button
            onClick={handleComplete}
            disabled={!state.primaryPersonName || createPlan.isPending}
          >
            {createPlan.isPending ? "Creating..." : "Complete & Create Plan"}
          </Button>
        ) : (
          <Button onClick={handleNext}>
            Next
          </Button>
        )}
      </div>
    </main>
  );
}
