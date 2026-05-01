import { Slider } from "@/components/ui/slider";
import { OnboardingState } from "../types";

interface Props {
  state: OnboardingState;
  onChange: (updates: Partial<OnboardingState>) => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(value);

export function OnboardingIncomePhesesStep({ state, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Retirement Income</h2>
        <p className="text-muted-foreground text-sm mb-6">
          What income will you have in retirement?
        </p>
      </div>

      <div className="space-y-6">
        {/* DB Pension */}
        <div className="space-y-3 rounded-md border p-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={state.hasDbPension}
              onChange={(e) => onChange({ hasDbPension: e.target.checked })}
              className="h-4 w-4 border border-input rounded"
            />
            <span className="text-sm font-medium">I have a defined benefit (DB) pension</span>
          </label>

          {state.hasDbPension && (
            <div className="space-y-2 mt-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <label htmlFor="db-age" className="text-sm font-medium">
                  DB Pension starts at age
                </label>
                <span className="text-lg font-semibold text-primary">{state.dbPensionAge || 60}</span>
              </div>
              <Slider
                value={state.dbPensionAge || 60}
                onValueChange={(v) => onChange({ dbPensionAge: v })}
                min={55}
                max={75}
                step={1}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>55</span>
                <span>75</span>
              </div>

              <div className="flex items-center justify-between mt-4">
                <label htmlFor="db-amount" className="text-sm font-medium">
                  Annual DB pension amount
                </label>
                <span className="text-lg font-semibold text-primary">
                  {formatCurrency(state.dbPensionAnnualAmount ?? 0)}
                </span>
              </div>
              <Slider
                value={state.dbPensionAnnualAmount ?? 0}
                onValueChange={(v) => onChange({ dbPensionAnnualAmount: v })}
                min={0}
                max={60000}
                step={500}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>£0</span>
                <span>£60k</span>
              </div>
            </div>
          )}
        </div>

        {/* State Pension */}
        <div className="space-y-3 rounded-md border p-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={state.hasStatePension}
              onChange={(e) => onChange({ hasStatePension: e.target.checked })}
              className="h-4 w-4 border border-input rounded"
            />
            <span className="text-sm font-medium">I will receive State Pension</span>
          </label>

          {state.hasStatePension && (
            <div className="space-y-2 mt-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <label htmlFor="sp-age" className="text-sm font-medium">
                  State Pension starts at age
                </label>
                <span className="text-lg font-semibold text-primary">{state.statePensionAge || 67}</span>
              </div>
              <Slider
                value={state.statePensionAge || 67}
                onValueChange={(v) => onChange({ statePensionAge: v })}
                min={60}
                max={75}
                step={1}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>60</span>
                <span>75</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-md bg-muted p-4">
        <p className="text-sm text-muted-foreground">
          {state.hasDbPension && state.hasStatePension
            ? `DB pension of ${formatCurrency(state.dbPensionAnnualAmount ?? 0)}/yr at ${state.dbPensionAge} and State Pension at ${state.statePensionAge}.`
            : state.hasDbPension
              ? `DB pension of ${formatCurrency(state.dbPensionAnnualAmount ?? 0)}/yr at ${state.dbPensionAge}.`
              : state.hasStatePension
                ? `You'll have State Pension at ${state.statePensionAge}.`
                : "You'll rely on your savings for retirement income."}
        </p>
      </div>
    </div>
  );
}
