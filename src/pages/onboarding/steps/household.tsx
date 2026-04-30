import { OnboardingState } from "../types";

interface Props {
  state: OnboardingState;
  onChange: (updates: Partial<OnboardingState>) => void;
}

export function OnboardingHouseholdStep({ state, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Household Setup</h2>
        <p className="text-muted-foreground text-sm mb-6">
          Let's start with who we're planning for.
        </p>
      </div>

      <div className="space-y-4">
        {/* Primary person name */}
        <div className="space-y-2">
          <label htmlFor="primary-name" className="text-sm font-medium">
            Your Name
          </label>
          <input
            id="primary-name"
            type="text"
            placeholder="e.g., John Smith"
            value={state.primaryPersonName}
            onChange={(e) => onChange({ primaryPersonName: e.target.value })}
            className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Has partner */}
        <div className="space-y-2">
          <label htmlFor="has-partner" className="flex items-center gap-2 cursor-pointer">
            <input
              id="has-partner"
              type="checkbox"
              checked={state.hasPartner}
              onChange={(e) => onChange({ hasPartner: e.target.checked })}
              className="h-4 w-4 border border-input rounded cursor-pointer"
            />
            <span className="text-sm font-medium">I have a partner/spouse</span>
          </label>
        </div>

        {/* Partner name (conditional) */}
        {state.hasPartner && (
          <div className="space-y-2">
            <label htmlFor="partner-name" className="text-sm font-medium">
              Partner's Name
            </label>
            <input
              id="partner-name"
              type="text"
              placeholder="e.g., Jane Smith"
              value={state.partnerName || ""}
              onChange={(e) => onChange({ partnerName: e.target.value })}
              className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        )}
      </div>

      <div className="rounded-md bg-muted p-4">
        <p className="text-sm text-muted-foreground">
          {state.hasPartner
            ? `We'll model ${state.primaryPersonName} and ${state.partnerName || "your partner"}'s retirement together.`
            : `We'll model ${state.primaryPersonName}'s retirement independently.`}
        </p>
      </div>
    </div>
  );
}
