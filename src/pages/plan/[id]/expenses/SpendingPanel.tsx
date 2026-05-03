import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  useCreateExpenseProfile,
  useExpenseProfileByPlan,
  useUpdateExpenseProfile,
} from "@/hooks/use-expense-profiles";
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

const BLANK_PERIOD: DraftPeriod = {
  name: "",
  fromAge: 65,
  toAge: null,
  annualAmount: 0,
  inflationLinked: true,
};

export function SpendingPanel({ planId, periods, people }: Props) {
  const profileQuery = useExpenseProfileByPlan(planId);
  const createProfile = useCreateExpenseProfile();
  const updateProfile = useUpdateExpenseProfile();

  const createPeriod = useCreateSpendingPeriod();
  const updatePeriod = useUpdateSpendingPeriod();
  const deletePeriod = useDeleteSpendingPeriod();
  const replacePeriods = useReplaceSpendingPeriods();

  const profile = profileQuery.data ?? null;
  const fallbackAnnual = (profile?.essentialAnnual ?? 0) + (profile?.discretionaryAnnual ?? 0);
  const primary = people.find((p) => p.role === "primary") ?? people[0];

  const [editingBaseline, setEditingBaseline] = useState(false);
  const [essential, setEssential] = useState(0);
  const [discretionary, setDiscretionary] = useState(0);

  const [editingPeriodId, setEditingPeriodId] = useState<number | "new" | null>(null);
  const [periodDraft, setPeriodDraft] = useState<DraftPeriod>(BLANK_PERIOD);

  const openBaselineEdit = () => {
    setEssential(profile?.essentialAnnual ?? 0);
    setDiscretionary(profile?.discretionaryAnnual ?? 0);
    setEditingBaseline(true);
  };

  const saveBaseline = async () => {
    const data = {
      planId,
      name: "Retirement spending",
      essentialAnnual: essential,
      discretionaryAnnual: discretionary,
      inflationLinked: true,
    };
    if (profile) {
      await updateProfile.mutateAsync({ id: profile.id, data });
    } else {
      await createProfile.mutateAsync(data);
    }
    setEditingBaseline(false);
  };

  const openNewPeriod = () => {
    setPeriodDraft({ ...BLANK_PERIOD, fromAge: 65, annualAmount: fallbackAnnual });
    setEditingPeriodId("new");
  };

  const openEditPeriod = (p: SpendingPeriod) => {
    setPeriodDraft({
      name: p.name,
      fromAge: p.fromAge,
      toAge: p.toAge,
      annualAmount: p.annualAmount,
      inflationLinked: p.inflationLinked,
    });
    setEditingPeriodId(p.id);
  };

  const savePeriod = async (existingId?: number) => {
    if (existingId !== undefined) {
      await updatePeriod.mutateAsync({ id: existingId, data: periodDraft });
    } else {
      await createPeriod.mutateAsync({
        planId,
        name: periodDraft.name || "Period",
        fromAge: periodDraft.fromAge,
        toAge: periodDraft.toAge,
        annualAmount: periodDraft.annualAmount,
        inflationLinked: periodDraft.inflationLinked,
        sortOrder: periods.length,
      });
    }
    setEditingPeriodId(null);
  };

  const removePeriod = async (p: SpendingPeriod) => {
    await deletePeriod.mutateAsync({ id: p.id, planId });
  };

  const applyGoGoPreset = async () => {
    const retireAge = 65;
    const baseline = fallbackAnnual > 0 ? fallbackAnnual : 50000;
    await replacePeriods.mutateAsync({
      planId,
      periods: [
        { planId, name: "Go-go", fromAge: retireAge, toAge: 75, annualAmount: baseline, inflationLinked: true, sortOrder: 0 },
        { planId, name: "Slow-go", fromAge: 75, toAge: 85, annualAmount: Math.round(baseline * 0.8), inflationLinked: true, sortOrder: 1 },
        { planId, name: "No-go", fromAge: 85, toAge: null, annualAmount: Math.round(baseline * 0.6), inflationLinked: true, sortOrder: 2 },
      ],
    });
  };

  const isSavingProfile = createProfile.isPending || updateProfile.isPending;
  const isSavingPeriod = createPeriod.isPending || updatePeriod.isPending || replacePeriods.isPending;

  if (profileQuery.isLoading) {
    return (
      <div className="sw-card">
        <h3 className="font-semibold text-base">Spending</h3>
        <p className="text-sm text-muted-foreground mt-2 animate-pulse">Loading…</p>
      </div>
    );
  }

  const total = (profile?.essentialAnnual ?? 0) + (profile?.discretionaryAnnual ?? 0);
  const editTotal = essential + discretionary;

  const renderPeriodForm = (existingId?: number) => (
    <div className="rounded-lg border border-ring/40 bg-secondary p-4 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {existingId ? "Edit period" : "New period"}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1 col-span-2">
          <label className="text-xs font-medium text-muted-foreground">Name</label>
          <input
            type="text"
            value={periodDraft.name}
            onChange={(e) => setPeriodDraft((d) => ({ ...d, name: e.target.value }))}
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
            value={periodDraft.fromAge}
            onChange={(e) => setPeriodDraft((d) => ({ ...d, fromAge: Number(e.target.value) }))}
            className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">To age (blank = end)</label>
          <input
            type="number"
            min={50}
            max={110}
            value={periodDraft.toAge ?? ""}
            onChange={(e) => setPeriodDraft((d) => ({ ...d, toAge: e.target.value ? Number(e.target.value) : null }))}
            className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1 col-span-2">
          <label className="text-xs font-medium text-muted-foreground">Annual spend (£)</label>
          <input
            type="number"
            min={0}
            step={500}
            value={periodDraft.annualAmount}
            onChange={(e) => setPeriodDraft((d) => ({ ...d, annualAmount: Number(e.target.value) }))}
            className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1 col-span-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={periodDraft.inflationLinked}
              onChange={(e) => setPeriodDraft((d) => ({ ...d, inflationLinked: e.target.checked }))}
              className="h-4 w-4 rounded border border-input"
            />
            <span>Inflation-linked</span>
          </label>
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={() => savePeriod(existingId)} disabled={isSavingPeriod}>
          {isSavingPeriod ? "Saving…" : "Save"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setEditingPeriodId(null)}>Cancel</Button>
      </div>
    </div>
  );

  return (
    <div className="sw-card space-y-6">
      {/* Baseline */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-base">Spending</h3>
          {!editingBaseline && (
            <Button size="sm" variant="outline" onClick={openBaselineEdit}>
              {profile ? "Edit baseline" : "Set up"}
            </Button>
          )}
        </div>

        {editingBaseline ? (
          <div className="rounded-lg border border-ring/40 bg-secondary p-4 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Essential Spending</label>
                  <p className="text-xs text-muted-foreground">Housing, food, utilities, healthcare</p>
                </div>
                <span className="text-base font-semibold text-primary">{fmt(essential)}</span>
              </div>
              <Slider value={essential} onValueChange={(v) => setEssential(v)} min={0} max={200000} step={500} />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>£0</span><span>£200k</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Discretionary Spending</label>
                  <p className="text-xs text-muted-foreground">Travel, leisure, gifts</p>
                </div>
                <span className="text-base font-semibold text-primary">{fmt(discretionary)}</span>
              </div>
              <Slider value={discretionary} onValueChange={(v) => setDiscretionary(v)} min={0} max={200000} step={500} />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>£0</span><span>£200k</span>
              </div>
            </div>

            <div className="rounded-md bg-background border border-border p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Essential</span>
                <span>{fmt(essential)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discretionary</span>
                <span>{fmt(discretionary)}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{fmt(editTotal)}</span>
              </div>
              <p className="text-xs text-muted-foreground">{fmt(editTotal / 12)}/month</p>
            </div>

            <div className="flex gap-2">
              <Button size="sm" onClick={saveBaseline} disabled={isSavingProfile}>
                {isSavingProfile ? "Saving…" : "Save"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditingBaseline(false)}>Cancel</Button>
            </div>
          </div>
        ) : !profile ? (
          <p className="text-sm text-muted-foreground">No spending target set.</p>
        ) : (
          <div className="rounded-lg border border-border bg-card p-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Essential</span>
              <span className="font-medium">{fmt(profile.essentialAnnual)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discretionary</span>
              <span className="font-medium">{fmt(profile.discretionaryAnnual)}</span>
            </div>
            <div className="h-px bg-border" />
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>{fmt(total)}</span>
            </div>
            <p className="text-xs text-muted-foreground">{fmt(total / 12)}/month</p>
          </div>
        )}
      </div>

      {/* Life stages */}
      <div className="space-y-3 border-t border-border pt-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Life-stage overrides</p>
            <p className="text-xs text-muted-foreground">
              Vary the baseline by age band (e.g. higher in early retirement, lower in late life).
            </p>
          </div>
          <div className="flex gap-2">
            {periods.length === 0 && (
              <Button size="sm" variant="outline" onClick={applyGoGoPreset} disabled={isSavingPeriod}>
                Use go-go preset
              </Button>
            )}
            {editingPeriodId === null && (
              <Button size="sm" variant="outline" onClick={openNewPeriod}>+ Add period</Button>
            )}
          </div>
        </div>

        {periods.length === 0 && editingPeriodId === null && (
          <p className="text-sm text-muted-foreground">
            No life-stage overrides — using the {fmt(fallbackAnnual)}/yr baseline for every retirement year.
          </p>
        )}

        <div className="space-y-3">
          {editingPeriodId === "new" && renderPeriodForm()}
          {periods.map((p) =>
            editingPeriodId === p.id ? (
              <div key={p.id}>{renderPeriodForm(p.id)}</div>
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
                  <Button size="sm" variant="ghost" onClick={() => openEditPeriod(p)}>Edit</Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => removePeriod(p)}
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
            Periods anchor on {primary.firstName}&apos;s age. Inflation applies from today&apos;s pounds.
          </p>
        )}
      </div>
    </div>
  );
}
