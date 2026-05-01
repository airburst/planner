import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useCreateExpenseProfile, useExpenseProfileByPlan, useUpdateExpenseProfile } from "@/hooks/use-expense-profiles";
import { useState } from "react";

interface Props {
  planId: number;
}

const fmt = (v: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(v);

export function SpendingPanel({ planId }: Props) {
  const profileQuery = useExpenseProfileByPlan(planId);
  const createProfile = useCreateExpenseProfile();
  const updateProfile = useUpdateExpenseProfile();

  const profile = profileQuery.data ?? null;

  const [editing, setEditing] = useState(false);
  const [essential, setEssential] = useState(0);
  const [discretionary, setDiscretionary] = useState(0);

  const openEdit = () => {
    setEssential(profile?.essentialAnnual ?? 0);
    setDiscretionary(profile?.discretionaryAnnual ?? 0);
    setEditing(true);
  };

  const save = async () => {
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
    setEditing(false);
  };

  const isSaving = createProfile.isPending || updateProfile.isPending;
  const total = essential + discretionary;

  if (profileQuery.isLoading) {
    return (
      <div className="sw-card">
        <h3 className="font-semibold text-base">Spending</h3>
        <p className="text-sm text-muted-foreground mt-2 animate-pulse">Loading…</p>
      </div>
    );
  }

  if (editing) {
    const editTotal = essential + discretionary;
    return (
      <div className="sw-card space-y-4">
        <h3 className="font-semibold text-base">Spending</h3>

        <div className="rounded-lg border border-ring/40 bg-sw-surface-container-low p-4 space-y-4">
          {/* Essential */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Essential Spending</label>
                <p className="text-xs text-muted-foreground">Housing, food, utilities, healthcare</p>
              </div>
              <span className="text-base font-semibold text-primary">{fmt(essential)}</span>
            </div>
            <Slider
              value={essential}
              onValueChange={(v) => setEssential(v)}
              min={0}
              max={200000}
              step={500}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>£0</span><span>£200k</span>
            </div>
          </div>

          {/* Discretionary */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Discretionary Spending</label>
                <p className="text-xs text-muted-foreground">Travel, leisure, gifts</p>
              </div>
              <span className="text-base font-semibold text-primary">{fmt(discretionary)}</span>
            </div>
            <Slider
              value={discretionary}
              onValueChange={(v) => setDiscretionary(v)}
              min={0}
              max={200000}
              step={500}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>£0</span><span>£200k</span>
            </div>
          </div>

          {/* Summary */}
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
            <Button size="sm" onClick={save} disabled={isSaving}>
              {isSaving ? "Saving…" : "Save"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sw-card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-base">Spending</h3>
        <Button size="sm" variant="outline" onClick={openEdit}>
          {profile ? "Edit" : "Set up"}
        </Button>
      </div>

      {!profile ? (
        <p className="text-sm text-muted-foreground">No spending target set.</p>
      ) : (
        <div className="space-y-2">
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
        </div>
      )}
    </div>
  );
}
