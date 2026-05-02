import { Button } from "@/components/ui/button";
import { OnboardingAccount, OnboardingAccountWrapper, OnboardingState } from "../types";

interface Props {
  state: OnboardingState;
  onChange: (updates: Partial<OnboardingState>) => void;
}

const WRAPPER_LABELS: Record<OnboardingAccountWrapper, string> = {
  sipp: "SIPP",
  isa: "ISA",
  gia: "GIA",
  cash: "Cash",
};

const WRAPPER_OPTIONS: { value: OnboardingAccountWrapper; label: string }[] = [
  { value: "sipp", label: "SIPP (pension)" },
  { value: "isa", label: "ISA (tax-free)" },
  { value: "gia", label: "GIA (general investment)" },
  { value: "cash", label: "Cash savings" },
];

const fmt = (v: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(v);

const BLANK_ACCOUNT: OnboardingAccount = {
  wrapperType: "sipp",
  currentBalance: 0,
  annualContribution: 0,
  employerContribution: 0,
};

export function OnboardingAssetsStep({ state, onChange }: Props) {
  const accounts = state.accounts;

  const updateAccount = (index: number, patch: Partial<OnboardingAccount>) => {
    const next = accounts.map((a, i) => (i === index ? { ...a, ...patch } : a));
    onChange({ accounts: next });
  };

  const addAccount = () => {
    onChange({ accounts: [...accounts, { ...BLANK_ACCOUNT }] });
  };

  const removeAccount = (index: number) => {
    onChange({ accounts: accounts.filter((_, i) => i !== index) });
  };

  const totalBalance = accounts.reduce((sum, a) => sum + a.currentBalance, 0);
  const totalContribution = accounts.reduce(
    (sum, a) => sum + a.annualContribution + (a.wrapperType === "sipp" ? a.employerContribution : 0),
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-1 text-xl font-semibold">Current Assets</h2>
        <p className="text-sm text-muted-foreground">
          Add each retirement account separately. Most people have at least one SIPP and an ISA.
        </p>
      </div>

      <div className="space-y-3">
        {accounts.map((account, idx) => (
          <div key={idx} className="space-y-3 rounded-md border bg-sw-surface-container-low p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Account {idx + 1}
              </p>
              {accounts.length > 1 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                  onClick={() => removeAccount(idx)}
                >
                  Remove
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Account type</label>
                <select
                  value={account.wrapperType}
                  onChange={(e) => updateAccount(idx, { wrapperType: e.target.value as OnboardingAccountWrapper })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {WRAPPER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Current balance (£)</label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={account.currentBalance}
                  onChange={(e) => updateAccount(idx, { currentBalance: Number(e.target.value) })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Annual contribution (£)</label>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={account.annualContribution}
                  onChange={(e) => updateAccount(idx, { annualContribution: Number(e.target.value) })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {account.wrapperType === "sipp" && (
                <div className="space-y-1 col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">Employer contribution (£/yr)</label>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={account.employerContribution}
                    onChange={(e) => updateAccount(idx, { employerContribution: Number(e.target.value) })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              )}
            </div>
          </div>
        ))}

        <Button size="sm" variant="outline" onClick={addAccount}>
          + Add another account
        </Button>
      </div>

      <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
        <p>
          {accounts.length} {accounts.length === 1 ? "account" : "accounts"} totalling {fmt(totalBalance)}.
          {totalContribution > 0 && ` Adding ${fmt(totalContribution)}/yr.`}
        </p>
        {accounts.length > 0 && (
          <ul className="mt-2 space-y-0.5 text-xs">
            {accounts.map((a, i) => (
              <li key={i}>
                {WRAPPER_LABELS[a.wrapperType]}: {fmt(a.currentBalance)}
                {a.annualContribution > 0 && ` · ${fmt(a.annualContribution)}/yr`}
                {a.wrapperType === "sipp" && a.employerContribution > 0 && ` · ${fmt(a.employerContribution)}/yr employer`}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
