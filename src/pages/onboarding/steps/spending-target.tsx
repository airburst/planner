import { Slider } from "@/components/ui/slider";
import { OnboardingState } from "../types";

interface Props {
  state: OnboardingState;
  onChange: (updates: Partial<OnboardingState>) => void;
}

const fmt = (value: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(value);

export function OnboardingSpendingTargetStep({ state, onChange }: Props) {
  const essential = Math.min(state.essentialAnnual, state.annualSpendingTarget);
  const discretionary = state.annualSpendingTarget - essential;

  const handleTotalChange = (total: number) => {
    onChange({
      annualSpendingTarget: total,
      essentialAnnual: Math.min(state.essentialAnnual, total),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Spending Target</h2>
        <p className="text-muted-foreground text-sm mb-6">
          How much do you plan to spend each year in retirement?
        </p>
      </div>

      <div className="space-y-6">
        {/* Total annual spending */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Total Annual Spending</label>
            <span className="text-lg font-semibold text-primary">
              {fmt(state.annualSpendingTarget)}
            </span>
          </div>
          <Slider
            value={state.annualSpendingTarget}
            onValueChange={(v) => handleTotalChange(v)}
            min={10000}
            max={200000}
            step={1000}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>£10k</span>
            <span>£200k</span>
          </div>
        </div>

        {/* Essential spending */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium">Essential Spending</label>
              <p className="text-xs text-muted-foreground mt-0.5">Housing, food, utilities, healthcare</p>
            </div>
            <span className="text-lg font-semibold text-primary">{fmt(essential)}</span>
          </div>
          <Slider
            value={essential}
            onValueChange={(v) => onChange({ essentialAnnual: v })}
            min={0}
            max={state.annualSpendingTarget}
            step={500}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>£0</span>
            <span>{fmt(state.annualSpendingTarget)}</span>
          </div>
        </div>

        {/* Split summary */}
        <div className="rounded-md bg-secondary p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Essential</span>
            <span className="font-medium">{fmt(essential)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Discretionary</span>
            <span className="font-medium">{fmt(discretionary)}</span>
          </div>
          <div className="h-px bg-border my-1" />
          <div className="flex justify-between text-sm font-semibold">
            <span>Total</span>
            <span>{fmt(state.annualSpendingTarget)}</span>
          </div>
          <p className="text-xs text-muted-foreground pt-1">
            Monthly equivalent: {fmt(state.annualSpendingTarget / 12)}
          </p>
        </div>
      </div>

      {/* Plan summary */}
      <div className="rounded-md border p-4 space-y-2 bg-card/50">
        <h3 className="font-semibold text-sm">Your Plan Summary</h3>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li>• Planning for: {state.primaryPersonName}{state.hasPartner && ` and ${state.partnerName}`}</li>
          <li>• Retirement at: {state.primaryRetirementAge}{state.hasPartner && `, ${state.partnerRetirementAge ?? state.primaryRetirementAge}`}</li>
          <li>• Annual spending: {fmt(state.annualSpendingTarget)} ({fmt(essential)} essential)</li>
        </ul>
      </div>
    </div>
  );
}
