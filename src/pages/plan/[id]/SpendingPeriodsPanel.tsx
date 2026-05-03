import { Button } from "@/components/ui/button";
import {
  useCreateSpendingPeriod,
  useDeleteSpendingPeriod,
  useReplaceSpendingPeriods,
  useUpdateSpendingPeriod,
} from "@/hooks/use-spending-periods";
import { useState } from "react";

type SpendingPeriod = {
  id: number;
  planId: number;
  name: string;
  fromAge: number;
  toAge: number | null;
  annualAmount: number;
  inflationLinked: boolean;
  sortOrder: number;
};

type Person = { id: number; firstName: string; role: "primary" | "partner" };

interface Props {
  planId: number;
  periods: SpendingPeriod[];
  people: Person[];
  /** Falls back to this single annual figure if there are no periods. */
  fallbackAnnual: number;
}

interface DraftPeriod {
  name: string;
  fromAge: number;
  toAge: number | null;
  annualAmount: number;
  inflationLinked: boolean;
}

const fmt = (v: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(v);

const BLANK: DraftPeriod = {
  name: "",
  fromAge: 65,
  toAge: null,
  annualAmount: 0,
  inflationLinked: true,
};

export function SpendingPeriodsPanel({ planId, periods, people, fallbackAnnual }: Props) {
  const createPeriod = useCreateSpendingPeriod();
  const updatePeriod = useUpdateSpendingPeriod();
  const deletePeriod = useDeleteSpendingPeriod();
  const replacePeriods = useReplaceSpendingPeriods();

  const primary = people.find((p) => p.role === "primary") ?? people[0];
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<DraftPeriod>(BLANK);

  const openNew = () => {
    setDraft({ ...BLANK, fromAge: 65, annualAmount: fallbackAnnual });
    setEditingId("new");
  };

  const openEdit = (p: SpendingPeriod) => {
    setDraft({
      name: p.name,
      fromAge: p.fromAge,
      toAge: p.toAge,
      annualAmount: p.annualAmount,
      inflationLinked: p.inflationLinked,
    });
    setEditingId(p.id);
  };

  const save = async (existingId?: number) => {
    if (existingId !== undefined) {
      await updatePeriod.mutateAsync({ id: existingId, data: draft });
    } else {
      await createPeriod.mutateAsync({
        planId,
        name: draft.name || "Period",
        fromAge: draft.fromAge,
        toAge: draft.toAge,
        annualAmount: draft.annualAmount,
        inflationLinked: draft.inflationLinked,
        sortOrder: periods.length,
      });
    }
    setEditingId(null);
  };

  const remove = async (p: SpendingPeriod) => {
    await deletePeriod.mutateAsync({ id: p.id, planId });
  };

  const applyGoGoPreset = async () => {
    // Anchor on primary's age. If we don't have one, use 65.
    const retireAge = 65; // could read from person.retirementAge if exposed
    const baseline = fallbackAnnual > 0 ? fallbackAnnual : 50000;
    await replacePeriods.mutateAsync({
      planId,
      periods: [
        {
          planId, name: "Go-go", fromAge: retireAge, toAge: 75,
          annualAmount: baseline, inflationLinked: true, sortOrder: 0,
        },
        {
          planId, name: "Slow-go", fromAge: 75, toAge: 85,
          annualAmount: Math.round(baseline * 0.8), inflationLinked: true, sortOrder: 1,
        },
        {
          planId, name: "No-go", fromAge: 85, toAge: null,
          annualAmount: Math.round(baseline * 0.6), inflationLinked: true, sortOrder: 2,
        },
      ],
    });
  };

  const isSaving = createPeriod.isPending || updatePeriod.isPending || replacePeriods.isPending;

  const renderForm = (existingId?: number) => (
    <div className="rounded-lg border border-ring/40 bg-sw-surface-container-low p-4 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {existingId ? "Edit period" : "New period"}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1 col-span-2">
          <label className="text-xs font-medium text-muted-foreground">Name</label>
          <input
            type="text"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder="e.g. Go-go, Slow-go"
            className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">From age</label>
          <input
            type="number"
            min={50}
            max={100}
            value={draft.fromAge}
            onChange={(e) => setDraft((d) => ({ ...d, fromAge: Number(e.target.value) }))}
            className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">To age (blank = end)</label>
          <input
            type="number"
            min={50}
            max={110}
            value={draft.toAge ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, toAge: e.target.value ? Number(e.target.value) : null }))}
            className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1 col-span-2">
          <label className="text-xs font-medium text-muted-foreground">Annual spend (£)</label>
          <input
            type="number"
            min={0}
            step={500}
            value={draft.annualAmount}
            onChange={(e) => setDraft((d) => ({ ...d, annualAmount: Number(e.target.value) }))}
            className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1 col-span-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.inflationLinked}
              onChange={(e) => setDraft((d) => ({ ...d, inflationLinked: e.target.checked }))}
              className="h-4 w-4 rounded border border-input"
            />
            <span>Inflation-linked</span>
          </label>
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={() => save(existingId)} disabled={isSaving}>
          {isSaving ? "Saving…" : "Save"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
      </div>
    </div>
  );

  return (
    <div className="sw-card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-base">Spending by life stage</h3>
        <div className="flex gap-2">
          {periods.length === 0 && (
            <Button size="sm" variant="outline" onClick={applyGoGoPreset} disabled={isSaving}>
              Use go-go preset
            </Button>
          )}
          {editingId === null && (
            <Button size="sm" variant="outline" onClick={openNew}>+ Add period</Button>
          )}
        </div>
      </div>

      {periods.length === 0 && editingId === null && (
        <p className="text-sm text-muted-foreground">
          Using a flat {fmt(fallbackAnnual)}/yr target. Add periods to model
          changing spend (e.g. higher in early retirement, lower in late life).
        </p>
      )}

      <div className="space-y-3">
        {editingId === "new" && renderForm()}
        {periods.map((p) =>
          editingId === p.id ? (
            <div key={p.id}>{renderForm(p.id)}</div>
          ) : (
            <div key={p.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{p.name}</span>
                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    Age {p.fromAge}{p.toAge ? `–${p.toAge}` : "+"}
                  </span>
                  {!p.inflationLinked && (
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">flat</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{fmt(p.annualAmount)}/yr</p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>Edit</Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => remove(p)}
                  disabled={deletePeriod.isPending}
                >
                  Delete
                </Button>
              </div>
            </div>
          )
        )}
      </div>

      {primary && periods.length > 0 && (
        <p className="text-[11px] text-muted-foreground">
          Periods anchor on {primary.firstName}&apos;s age. Inflation applies from today's pounds.
        </p>
      )}
    </div>
  );
}
