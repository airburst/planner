import { Button } from "@/components/ui/button";
import { useCreateAccount, useDeleteAccount, useUpdateAccount } from "@/hooks/use-accounts";
import { useState } from "react";

type Account = {
  id: number;
  planId: number;
  personId: number | null;
  name: string;
  wrapperType: "sipp" | "isa" | "gia" | "cash" | "other";
  currentBalance: number;
  annualContribution: number;
  employerContribution: number;
};

type Person = { id: number; firstName: string; role: "primary" | "partner" };

interface Props {
  planId: number;
  accounts: Account[];
  people: Person[];
}

interface DraftAccount {
  name: string;
  wrapperType: "sipp" | "isa" | "gia" | "cash" | "other";
  currentBalance: number;
  annualContribution: number;
  employerContribution: number;
  personId: number | null;
}

const WRAPPER_LABELS: Record<string, string> = {
  sipp: "SIPP",
  isa: "ISA",
  gia: "GIA",
  cash: "Cash",
  other: "Other",
};

const fmt = (v: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(v);

const BLANK: DraftAccount = {
  name: "",
  wrapperType: "sipp",
  currentBalance: 0,
  annualContribution: 0,
  employerContribution: 0,
  personId: null,
};

export function AccountsPanel({ planId, accounts, people }: Props) {
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const deleteAccount = useDeleteAccount();

  // null = closed, "new" = add form, number = editing existing id
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<DraftAccount>(BLANK);

  const openNew = () => {
    setDraft({ ...BLANK, personId: people[0]?.id ?? null });
    setEditingId("new");
  };

  const openEdit = (a: Account) => {
    setDraft({
      name: a.name,
      wrapperType: a.wrapperType,
      currentBalance: a.currentBalance,
      annualContribution: a.annualContribution,
      employerContribution: a.employerContribution,
      personId: a.personId,
    });
    setEditingId(a.id);
  };

  const save = async (existingId?: number) => {
    const payload = {
      ...draft,
      employerContribution: draft.wrapperType === "sipp" ? draft.employerContribution : 0,
    };
    if (existingId !== undefined) {
      await updateAccount.mutateAsync({ id: existingId, data: payload });
    } else {
      await createAccount.mutateAsync({ planId, ...payload });
    }
    setEditingId(null);
  };

  const remove = async (a: Account) => {
    await deleteAccount.mutateAsync({ id: a.id, planId });
  };

  const isSaving = createAccount.isPending || updateAccount.isPending;

  const personName = (id: number | null) =>
    people.find((p) => p.id === id)?.firstName ?? "Unassigned";

  const renderForm = (existingId?: number) => (
    <div className="rounded-lg border border-ring/40 bg-sw-surface-container-low p-4 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {existingId ? "Edit Account" : "New Account"}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1 col-span-2">
          <label className="text-xs font-medium text-muted-foreground">Account Name</label>
          <input
            type="text"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder="e.g. My SIPP"
            className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Type</label>
          <select
            value={draft.wrapperType}
            onChange={(e) => setDraft((d) => ({ ...d, wrapperType: e.target.value as DraftAccount["wrapperType"] }))}
            className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {Object.entries(WRAPPER_LABELS).map(([v, label]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
        </div>

        {people.length > 0 && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Owner</label>
            <select
              value={draft.personId ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, personId: e.target.value ? Number(e.target.value) : null }))}
              className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Unassigned</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>{p.firstName}</option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Current Balance (£)</label>
          <input
            type="number"
            min={0}
            step={1000}
            value={draft.currentBalance}
            onChange={(e) => setDraft((d) => ({ ...d, currentBalance: Number(e.target.value) }))}
            className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Annual Contribution (£)</label>
          <input
            type="number"
            min={0}
            step={100}
            value={draft.annualContribution}
            onChange={(e) => setDraft((d) => ({ ...d, annualContribution: Number(e.target.value) }))}
            className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {draft.wrapperType === "sipp" && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Employer Contribution (£)</label>
            <input
              type="number"
              min={0}
              step={100}
              value={draft.employerContribution}
              onChange={(e) => setDraft((d) => ({ ...d, employerContribution: Number(e.target.value) }))}
              className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={() => save(existingId)} disabled={!draft.name || isSaving}>
          {isSaving ? "Saving…" : "Save"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
      </div>
    </div>
  );

  return (
    <div className="sw-card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-base">Accounts</h3>
        {editingId === null && (
          <Button size="sm" variant="outline" onClick={openNew}>+ Add</Button>
        )}
      </div>

      {accounts.length === 0 && editingId === null && (
        <p className="text-sm text-muted-foreground">No accounts added yet.</p>
      )}

      <div className="space-y-3">
        {editingId === "new" && renderForm()}

        {accounts.map((account) =>
          editingId === account.id ? (
            <div key={account.id}>{renderForm(account.id)}</div>
          ) : (
            <div key={account.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{account.name}</span>
                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {WRAPPER_LABELS[account.wrapperType]}
                  </span>
                  {account.personId && (
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {personName(account.personId)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {fmt(account.currentBalance)} balance
                  {account.annualContribution > 0 ? ` · ${fmt(account.annualContribution)}/yr` : ""}
                  {account.employerContribution > 0 ? ` · ${fmt(account.employerContribution)}/yr employer` : ""}
                </p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => openEdit(account)}>Edit</Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => remove(account)}
                  disabled={deleteAccount.isPending}
                >
                  Delete
                </Button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
