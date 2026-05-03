import { Button } from "@/components/ui/button";
import {
  useCreateOneOffIncome,
  useDeleteOneOffIncome,
  useUpdateOneOffIncome,
} from "@/hooks/use-one-off-incomes";
import { useState } from "react";

type OneOffIncome = {
  id: number;
  planId: number;
  personId: number | null;
  name: string;
  year: number;
  amount: number;
  taxable: boolean;
};

type Person = { id: number; firstName: string };

interface Props {
  planId: number;
  oneOffIncomes: OneOffIncome[];
  people: Person[];
}

interface DraftIncome {
  name: string;
  year: number;
  amount: number;
  taxable: boolean;
  personId: number | null;
}

const fmt = (v: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(v);

const BLANK: DraftIncome = {
  name: "",
  year: new Date().getFullYear(),
  amount: 0,
  taxable: false,
  personId: null,
};

export function OneOffIncomesPanel({ planId, oneOffIncomes, people }: Props) {
  const createIncome = useCreateOneOffIncome();
  const updateIncome = useUpdateOneOffIncome();
  const deleteIncome = useDeleteOneOffIncome();

  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<DraftIncome>(BLANK);

  const openNew = () => {
    setDraft({ ...BLANK, personId: people[0]?.id ?? null });
    setEditingId("new");
  };

  const openEdit = (i: OneOffIncome) => {
    setDraft({
      name: i.name,
      year: i.year,
      amount: i.amount,
      taxable: i.taxable,
      personId: i.personId,
    });
    setEditingId(i.id);
  };

  const save = async (existingId?: number) => {
    if (existingId !== undefined) {
      await updateIncome.mutateAsync({ id: existingId, data: draft });
    } else {
      await createIncome.mutateAsync({ planId, ...draft });
    }
    setEditingId(null);
  };

  const remove = async (i: OneOffIncome) => {
    await deleteIncome.mutateAsync({ id: i.id, planId });
  };

  const isSaving = createIncome.isPending || updateIncome.isPending;

  const renderForm = (existingId?: number) => (
    <div className="rounded-lg border border-ring/40 bg-secondary p-4 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {existingId ? "Edit income event" : "New income event"}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1 col-span-2">
          <label className="text-xs font-medium text-muted-foreground">Name</label>
          <input
            type="text"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder="e.g. Inheritance, Property sale"
            className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Year</label>
          <input
            type="number"
            min={1900}
            max={2100}
            step={1}
            value={draft.year}
            onChange={(e) => setDraft((d) => ({ ...d, year: Number(e.target.value) }))}
            className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Amount (£)</label>
          <input
            type="number"
            min={0}
            step={1000}
            value={draft.amount}
            onChange={(e) => setDraft((d) => ({ ...d, amount: Number(e.target.value) }))}
            className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {people.length > 0 && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Owner (for tax)</label>
            <select
              value={draft.personId ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, personId: e.target.value ? Number(e.target.value) : null }))}
              className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Household</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>{p.firstName}</option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1 col-span-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.taxable}
              onChange={(e) => setDraft((d) => ({ ...d, taxable: e.target.checked }))}
              className="h-4 w-4 rounded border border-input"
            />
            <span>Taxable as income</span>
          </label>
        </div>
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
        <h3 className="font-semibold text-base">One-off income</h3>
        {editingId === null && (
          <Button size="sm" variant="outline" onClick={openNew}>+ Add</Button>
        )}
      </div>

      {oneOffIncomes.length === 0 && editingId === null && (
        <p className="text-sm text-muted-foreground">No windfalls planned.</p>
      )}

      <div className="space-y-3">
        {editingId === "new" && renderForm()}
        {oneOffIncomes.map((i) =>
          editingId === i.id ? (
            <div key={i.id}>{renderForm(i.id)}</div>
          ) : (
            <div key={i.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{i.name}</span>
                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{i.year}</span>
                  {i.taxable && (
                    <span className="text-xs text-sw-on-error-container bg-sw-error-container/40 px-1.5 py-0.5 rounded">taxable</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{fmt(i.amount)}</p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => openEdit(i)}>Edit</Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => remove(i)}
                  disabled={deleteIncome.isPending}
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
