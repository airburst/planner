import { Slider } from "@/components/ui/slider";
import { OnboardingState } from "../types";

interface Props {
  state: OnboardingState;
  onChange: (updates: Partial<OnboardingState>) => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(value);

function PersonIncomeSection({
  title,
  hasSalary,
  onHasSalaryChange,
  salaryAnnual,
  onSalaryAnnualChange,
  hasDbPension,
  onHasDbPensionChange,
  dbPensionAge,
  onDbPensionAgeChange,
  dbPensionAnnualAmount,
  onDbPensionAnnualAmountChange,
  hasStatePension,
  onHasStatePensionChange,
  statePensionAge,
  onStatePensionAgeChange,
  statePensionAnnualAmount,
  onStatePensionAnnualAmountChange,
}: {
  title: string;
  hasSalary: boolean;
  onHasSalaryChange: (next: boolean) => void;
  salaryAnnual: number;
  onSalaryAnnualChange: (next: number) => void;
  hasDbPension: boolean;
  onHasDbPensionChange: (next: boolean) => void;
  dbPensionAge: number;
  onDbPensionAgeChange: (next: number) => void;
  dbPensionAnnualAmount: number;
  onDbPensionAnnualAmountChange: (next: number) => void;
  hasStatePension: boolean;
  onHasStatePensionChange: (next: boolean) => void;
  statePensionAge: number;
  onStatePensionAgeChange: (next: number) => void;
  statePensionAnnualAmount: number;
  onStatePensionAnnualAmountChange: (next: number) => void;
}) {
  return (
    <section className="space-y-4 rounded-md border p-4">
      <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>

      <div className="space-y-3 rounded-md border p-4">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={hasSalary}
            onChange={(e) => onHasSalaryChange(e.target.checked)}
            className="h-4 w-4 rounded border border-input"
          />
          <span className="text-sm font-medium">Salary / employment income (until retirement)</span>
        </label>

        {hasSalary && (
          <div className="mt-4 space-y-2 border-t pt-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Annual salary (gross)</label>
              <span className="text-lg font-semibold text-primary">
                {formatCurrency(salaryAnnual)}
              </span>
            </div>
            <Slider
              value={salaryAnnual}
              onValueChange={onSalaryAnnualChange}
              min={0}
              max={200000}
              step={1000}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>£0</span>
              <span>£200k</span>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-md border p-4">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={hasDbPension}
            onChange={(e) => onHasDbPensionChange(e.target.checked)}
            className="h-4 w-4 rounded border border-input"
          />
          <span className="text-sm font-medium">Defined benefit (DB) pension</span>
        </label>

        {hasDbPension && (
          <div className="mt-4 space-y-2 border-t pt-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">DB pension starts at age</label>
              <span className="text-lg font-semibold text-primary">{dbPensionAge}</span>
            </div>
            <Slider
              value={dbPensionAge}
              onValueChange={onDbPensionAgeChange}
              min={55}
              max={75}
              step={1}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>55</span>
              <span>75</span>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <label className="text-sm font-medium">Annual DB pension amount</label>
              <span className="text-lg font-semibold text-primary">
                {formatCurrency(dbPensionAnnualAmount)}
              </span>
            </div>
            <Slider
              value={dbPensionAnnualAmount}
              onValueChange={onDbPensionAnnualAmountChange}
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

      <div className="space-y-3 rounded-md border p-4">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={hasStatePension}
            onChange={(e) => onHasStatePensionChange(e.target.checked)}
            className="h-4 w-4 rounded border border-input"
          />
          <span className="text-sm font-medium">State Pension</span>
        </label>

        {hasStatePension && (
          <div className="mt-4 space-y-2 border-t pt-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">State Pension starts at age</label>
              <span className="text-lg font-semibold text-primary">{statePensionAge}</span>
            </div>
            <Slider
              value={statePensionAge}
              onValueChange={onStatePensionAgeChange}
              min={60}
              max={75}
              step={1}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>60</span>
              <span>75</span>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <label className="text-sm font-medium">Annual State Pension forecast</label>
              <span className="text-lg font-semibold text-primary">
                {formatCurrency(statePensionAnnualAmount)}
              </span>
            </div>
            <Slider
              value={statePensionAnnualAmount}
              onValueChange={onStatePensionAnnualAmountChange}
              min={0}
              max={15000}
              step={100}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>£0</span>
              <span>£15k</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Default £11,502/yr (2024/25 full new SP). Check your forecast at gov.uk/check-state-pension.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

export function OnboardingIncomePhesesStep({ state, onChange }: Props) {
  const primaryLabel = state.primaryPersonName ? `${state.primaryPersonName}` : "You";
  const partnerLabel = state.partnerName ? `${state.partnerName}` : "Partner";

  const primarySummary = state.hasDbPension && state.hasStatePension
    ? `${primaryLabel}: DB pension ${formatCurrency(state.dbPensionAnnualAmount ?? 0)}/yr from ${state.dbPensionAge ?? 60}, plus State Pension from ${state.statePensionAge ?? 67}.`
    : state.hasDbPension
      ? `${primaryLabel}: DB pension ${formatCurrency(state.dbPensionAnnualAmount ?? 0)}/yr from ${state.dbPensionAge ?? 60}.`
      : state.hasStatePension
        ? `${primaryLabel}: State Pension from ${state.statePensionAge ?? 67}.`
        : `${primaryLabel}: no guaranteed pension income entered.`;

  const partnerSummary = state.hasPartner
    ? state.partnerHasDbPension && state.partnerHasStatePension
      ? `${partnerLabel}: DB pension ${formatCurrency(state.partnerDbPensionAnnualAmount ?? 0)}/yr from ${state.partnerDbPensionAge ?? 60}, plus State Pension from ${state.partnerStatePensionAge ?? state.statePensionAge ?? 67}.`
      : state.partnerHasDbPension
        ? `${partnerLabel}: DB pension ${formatCurrency(state.partnerDbPensionAnnualAmount ?? 0)}/yr from ${state.partnerDbPensionAge ?? 60}.`
        : state.partnerHasStatePension
          ? `${partnerLabel}: State Pension from ${state.partnerStatePensionAge ?? state.statePensionAge ?? 67}.`
          : `${partnerLabel}: no guaranteed pension income entered.`
    : "";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Retirement Income</h2>
        <p className="text-muted-foreground text-sm mb-6">
          What income will you have in retirement?
        </p>
      </div>

      <div className="space-y-6">
        <PersonIncomeSection
          title={`${primaryLabel}'s income`}
          hasSalary={state.hasSalary}
          onHasSalaryChange={(next) => onChange({ hasSalary: next })}
          salaryAnnual={state.salaryAnnual ?? 0}
          onSalaryAnnualChange={(next) => onChange({ salaryAnnual: next })}
          hasDbPension={state.hasDbPension}
          onHasDbPensionChange={(next) => onChange({ hasDbPension: next })}
          dbPensionAge={state.dbPensionAge ?? 60}
          onDbPensionAgeChange={(next) => onChange({ dbPensionAge: next })}
          dbPensionAnnualAmount={state.dbPensionAnnualAmount ?? 0}
          onDbPensionAnnualAmountChange={(next) => onChange({ dbPensionAnnualAmount: next })}
          hasStatePension={state.hasStatePension}
          onHasStatePensionChange={(next) => onChange({ hasStatePension: next })}
          statePensionAge={state.statePensionAge ?? 67}
          onStatePensionAgeChange={(next) => onChange({ statePensionAge: next })}
          statePensionAnnualAmount={state.statePensionAnnualAmount ?? 11502}
          onStatePensionAnnualAmountChange={(next) => onChange({ statePensionAnnualAmount: next })}
        />

        {state.hasPartner && (
          <PersonIncomeSection
            title={`${partnerLabel}'s income`}
            hasSalary={state.partnerHasSalary ?? false}
            onHasSalaryChange={(next) => onChange({ partnerHasSalary: next })}
            salaryAnnual={state.partnerSalaryAnnual ?? 0}
            onSalaryAnnualChange={(next) => onChange({ partnerSalaryAnnual: next })}
            hasDbPension={state.partnerHasDbPension ?? false}
            onHasDbPensionChange={(next) => onChange({ partnerHasDbPension: next })}
            dbPensionAge={state.partnerDbPensionAge ?? 60}
            onDbPensionAgeChange={(next) => onChange({ partnerDbPensionAge: next })}
            dbPensionAnnualAmount={state.partnerDbPensionAnnualAmount ?? 0}
            onDbPensionAnnualAmountChange={(next) => onChange({ partnerDbPensionAnnualAmount: next })}
            hasStatePension={state.partnerHasStatePension ?? false}
            onHasStatePensionChange={(next) => onChange({ partnerHasStatePension: next })}
            statePensionAge={state.partnerStatePensionAge ?? state.statePensionAge ?? 67}
            onStatePensionAgeChange={(next) => onChange({ partnerStatePensionAge: next })}
            statePensionAnnualAmount={state.partnerStatePensionAnnualAmount ?? state.statePensionAnnualAmount ?? 11502}
            onStatePensionAnnualAmountChange={(next) => onChange({ partnerStatePensionAnnualAmount: next })}
          />
        )}
      </div>

      <div className="rounded-md bg-muted p-4">
        <p className="text-sm text-muted-foreground">
          {state.hasPartner ? `${primarySummary} ${partnerSummary}` : primarySummary}
        </p>
      </div>
    </div>
  );
}
