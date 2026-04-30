import { OnboardingState } from "../types";

interface Props {
  state: OnboardingState;
  onChange: (updates: Partial<OnboardingState>) => void;
}

export function OnboardingAssetsStep({ state, onChange }: Props) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Current Assets</h2>
        <p className="text-muted-foreground text-sm mb-6">
          How much have you saved for retirement?
        </p>
      </div>

      <div className="space-y-6">
        {/* Current savings */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label htmlFor="savings" className="text-sm font-medium">
              Total Savings
            </label>
            <span className="text-lg font-semibold text-primary">
              {formatCurrency(state.currentSavings)}
            </span>
          </div>
          <input
            id="savings"
            type="range"
            min="0"
            max="1000000"
            step="5000"
            value={state.currentSavings}
            onChange={(e) => onChange({ currentSavings: Number(e.target.value) })}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>£0</span>
            <span>£1M</span>
          </div>
        </div>

        {/* Account type */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Where are your savings?</label>
          <div className="space-y-2">
            {[
              { value: "cash", label: "Cash savings" },
              { value: "isa", label: "ISA (tax-free)" },
              { value: "sipp", label: "SIPP (pension)" },
              { value: "mixed", label: "Mix of different accounts" },
            ].map(({ value, label }) => (
              <label
                key={value}
                className="flex items-center gap-3 p-3 border rounded-md cursor-pointer hover:bg-muted"
              >
                <input
                  type="radio"
                  name="account-type"
                  value={value}
                  checked={state.accountType === value}
                  onChange={(e) => onChange({ accountType: e.target.value as typeof state.accountType })}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium">{label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-md bg-muted p-4">
        <p className="text-sm text-muted-foreground">
          {formatCurrency(state.currentSavings)} in {state.accountType === "cash" ? "cash savings" : state.accountType === "isa" ? "ISA accounts" : state.accountType === "sipp" ? "SIPP/pension" : "mixed accounts"}.
        </p>
      </div>
    </div>
  );
}
