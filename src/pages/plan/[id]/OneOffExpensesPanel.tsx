import { Button } from "@/components/ui/button";
import {
  useCreateOneOffExpense,
  useDeleteOneOffExpense,
  useUpdateOneOffExpense,
} from "@/hooks/use-one-off-expenses";
import { useState } from "react";

type OneOffExpense = {
  id: number;
  planId: number;
  name: string;
  year: number;
  amount: number;
  description: string | null;
};

interface Props {
  planId: number;
  oneOffExpenses: OneOffExpense[];
}

interface DraftExpense {
  name: string;
  year: number;
  amount: number;
  description: string;
}

const fmt = (v: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(v);

const BLANK: DraftExpense = {
  name: "",
  year: new Date().getFullYear(),
  amount: 0,
  description: "",
};

export function OneOffExpensesPanel({ planId, oneOffExpenses }: Props) {
  const createExpense = useCreateOneOffExpense();
  const updateExpense = useUpdateOneOffExpense();
  const deleteExpense = useDeleteOneOffExpense();

  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<DraftExpense>(BLANK);

  const openNew = () => {
    setDraft(BLANK);
    setEditingId("new");
  };

  const openEdit = (e: OneOffExpense) => {
    setDraft({
      name: e.name,
      year: e.year,
      amount: e.amount,
      description: e.description ?? "",
    });
    setEditingId(e.id);
  };

  const save = async (existingId?: number) => {
    const payload = {
      ...draft,
      description: draft.description.trim() || null,
    };
    if (existingId !== undefined) {
      await updateExpense.mutateAsync({ id: existingId, data: payload });
    } else {
      await createExpense.mutateAsync({ planId, ...payload });
    }
    setEditingId(null);
  };

  const remove = async (e: OneOffExpense) => {
    await deleteExpense.mutateAsync({ id: e.id, planId });
  };

  const isSaving = createExpense.isPending || updateExpense.isPending;

  const renderForm = (existingId?: number) => (
    <div className="rounded-lg border border-ring/40 bg-sw-surface-container-low p-4 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {existingId ? "Edit expense event" : "New expense event"}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1 col-span-2">
          <label className="text-xs font-medium text-muted-foreground">Name</label>
          <input
            type="text"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder="e.g. New car, Roof repair"
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

        <div className="space-y-1 col-span-2">
          <label className="text-xs font-medium text-muted-foreground">Notes (optional)</label>
          <input
            type="text"
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
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
        <h3 className="font-semibold text-base">One-off expenses</h3>
        {editingId === null && (
          <Button size="sm" variant="outline" onClick={openNew}>+ Add</Button>
        )}
      </div>

      {oneOffExpenses.length === 0 && editingId === null && (
        <p className="text-sm text-muted-foreground">No one-off expenses planned.</p>
      )}

      <div className="space-y-3">
        {editingId === "new" && renderForm()}
        {oneOffExpenses.map((e) =>
          editingId === e.id ? (
            <div key={e.id}>{renderForm(e.id)}</div>
          ) : (
            <div key={e.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{e.name}</span>
                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{e.year}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {fmt(e.amount)}{e.description ? ` · ${e.description}` : ""}
                </p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => openEdit(e)}>Edit</Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => remove(e)}
                  disabled={deleteExpense.isPending}
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
