import { Slider } from "@/components/ui/slider";
import { OnboardingState } from "../types";

interface Props {
  state: OnboardingState;
  onChange: (updates: Partial<OnboardingState>) => void;
}

function currentAgeFrom(dob: string | undefined): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  return new Date().getFullYear() - birth.getFullYear();
}

export function OnboardingRetirementTimingStep({ state, onChange }: Props) {
  const primaryAge = currentAgeFrom(state.primaryDateOfBirth);
  const partnerAge = currentAgeFrom(state.partnerDateOfBirth);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Retirement Timing</h2>
        <p className="text-muted-foreground text-sm mb-6">
          When do you plan to retire?
        </p>
      </div>

      <div className="space-y-6">
        {/* Primary retirement age */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="primary-retire-age" className="text-sm font-medium">
                {state.primaryPersonName ? `${state.primaryPersonName}'s` : "Your"} Retirement Age
              </label>
              {primaryAge !== null && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Currently {primaryAge} — retiring in {Math.max(0, state.primaryRetirementAge - primaryAge)} years
                </p>
              )}
            </div>
            <span className="text-lg font-semibold text-primary">{state.primaryRetirementAge}</span>
          </div>
          <Slider
            value={[state.primaryRetirementAge]}
            onValueChange={([v]) => onChange({ primaryRetirementAge: v })}
            min={50}
            max={85}
            step={1}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>50</span>
            <span>85</span>
          </div>
        </div>

        {/* Partner retirement age (conditional) */}
        {state.hasPartner && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="partner-retire-age" className="text-sm font-medium">
                  {state.partnerName ? `${state.partnerName}'s` : "Partner's"} Retirement Age
                </label>
                {partnerAge !== null && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Currently {partnerAge} — retiring in {Math.max(0, (state.partnerRetirementAge ?? state.primaryRetirementAge) - partnerAge)} years
                  </p>
                )}
              </div>
              <span className="text-lg font-semibold text-primary">
                {state.partnerRetirementAge ?? state.primaryRetirementAge}
              </span>
            </div>
            <Slider
              value={[state.partnerRetirementAge ?? state.primaryRetirementAge]}
              onValueChange={([v]) => onChange({ partnerRetirementAge: v })}
              min={50}
              max={85}
              step={1}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>50</span>
              <span>85</span>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-md bg-muted p-4">
        <p className="text-sm text-muted-foreground">
          {state.hasPartner
            ? `${state.primaryPersonName} retires at ${state.primaryRetirementAge}, ${state.partnerName || "partner"} at ${state.partnerRetirementAge ?? state.primaryRetirementAge}.`
            : `${state.primaryPersonName || "You"} will retire at ${state.primaryRetirementAge}.`}
        </p>
      </div>
    </div>
  );
}
