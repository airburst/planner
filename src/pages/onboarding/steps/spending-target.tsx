import { OnboardingState } from "../types";

interface Props {
  state: OnboardingState;
  onChange: (updates: Partial<OnboardingState>) => void;
}

export function OnboardingSpendingTargetStep({ state, onChange }: Props) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const monthlyAmount = state.annualSpendingTarget / 12;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Spending Target</h2>
        <p className="text-muted-foreground text-sm mb-6">
          How much do you plan to spend each year in retirement?
        </p>
      </div>

      <div className="space-y-6">
        {/* Annual spending */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label htmlFor="spending" className="text-sm font-medium">
              Annual Spending Target
            </label>
            <span className="text-lg font-semibold text-primary">
              {formatCurrency(state.annualSpendingTarget)}
            </span>
          </div>
          <input
            id="spending"
            type="range"
            min="10000"
            max="200000"
            step="1000"
            value={state.annualSpendingTarget}
            onChange={(e) => onChange({ annualSpendingTarget: Number(e.target.value) })}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>£10k</span>
            <span>£200k</span>
          </div>
        </div>

        {/* Monthly breakdown */}
        <div className="rounded-md bg-blue-50 dark:bg-blue-950 p-4 space-y-2">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
            Monthly equivalent: {formatCurrency(monthlyAmount)}
          </p>
          <p className="text-xs text-blue-800 dark:text-blue-200">
            This is an average; actual spending may vary by month.
          </p>
        </div>
      </div>

      <div className="rounded-md bg-muted p-4">
        <p className="text-sm text-muted-foreground">
          You're planning for {formatCurrency(state.annualSpendingTarget)} per year ({formatCurrency(monthlyAmount)} per month) in retirement.
        </p>
      </div>

      {/* Summary */}
      <div className="rounded-md border p-4 space-y-3 bg-card/50">
        <h3 className="font-semibold text-sm">Your Plan Summary</h3>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li>• Planning for: {state.primaryPersonName} {state.hasPartner && `and ${state.partnerName}`}</li>
          <li>• Retirement at: {state.primaryRetirementAge} {state.hasPartner && `and ${state.partnerRetirementAge}`}</li>
          <li>• Current savings: {formatCurrency(state.currentSavings)}</li>
          <li>• Annual spending: {formatCurrency(state.annualSpendingTarget)}</li>
        </ul>
      </div>
    </div>
  );
}
