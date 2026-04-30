import { OnboardingState } from "../types";

interface Props {
  state: OnboardingState;
  onChange: (updates: Partial<OnboardingState>) => void;
}

export function OnboardingRetirementTimingStep({ state, onChange }: Props) {
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
            <label htmlFor="primary-retire-age" className="text-sm font-medium">
              {state.primaryPersonName ? `${state.primaryPersonName}'s` : "Your"} Retirement Age
            </label>
            <span className="text-lg font-semibold text-primary">{state.primaryRetirementAge}</span>
          </div>
          <input
            id="primary-retire-age"
            type="range"
            min="50"
            max="85"
            step="1"
            value={state.primaryRetirementAge}
            onChange={(e) => onChange({ primaryRetirementAge: Number(e.target.value) })}
            className="w-full"
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
              <label htmlFor="partner-retire-age" className="text-sm font-medium">
                {state.partnerName ? `${state.partnerName}'s` : "Partner's"} Retirement Age
              </label>
              <span className="text-lg font-semibold text-primary">
                {state.partnerRetirementAge || state.primaryRetirementAge}
              </span>
            </div>
            <input
              id="partner-retire-age"
              type="range"
              min="50"
              max="85"
              step="1"
              value={state.partnerRetirementAge || state.primaryRetirementAge}
              onChange={(e) => onChange({ partnerRetirementAge: Number(e.target.value) })}
              className="w-full"
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
            ? `${state.primaryPersonName} will retire at ${state.primaryRetirementAge} and ${state.partnerName} at ${state.partnerRetirementAge || state.primaryRetirementAge}.`
            : `${state.primaryPersonName} will retire at ${state.primaryRetirementAge}.`}
        </p>
      </div>
    </div>
  );
}
