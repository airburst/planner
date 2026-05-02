import { Button } from "@/components/ui/button";
import {
  useAssumptionSetByPlan,
  useCreateAssumptionSet,
  useDeleteAssumptionSet,
  useUpdateAssumptionSet,
} from "@/hooks/use-assumption-sets";
import { useState } from "react";

interface Props {
  planId: number;
}

interface TaxPolicy {
  personalAllowance: number;
  basicRateBand: number;
  higherRateBand: number;
  basicRate: number;
  higherRate: number;
  additionalRate: number;
  sippMinimumAgeAccess: number;
}

interface DraftAssumptions {
  name: string;
  inflationRate: number;
  nominalGrowthRate: number;
  taxPolicy: TaxPolicy;
}

const UK_2026_DEFAULTS: TaxPolicy = {
  personalAllowance: 12570,
  basicRateBand: 50270,
  higherRateBand: 125140,
  basicRate: 0.2,
  higherRate: 0.4,
  additionalRate: 0.45,
  sippMinimumAgeAccess: 57,
};

const BLANK_DRAFT: DraftAssumptions = {
  name: "2025/26",
  inflationRate: 0.025,
  nominalGrowthRate: 0.05,
  taxPolicy: { ...UK_2026_DEFAULTS },
};

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const fmt = (v: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(v);

function parseTaxPolicy(json: string | null): TaxPolicy {
  if (!json) return { ...UK_2026_DEFAULTS };
  try {
    const parsed = JSON.parse(json);
    return { ...UK_2026_DEFAULTS, ...parsed };
  } catch {
    return { ...UK_2026_DEFAULTS };
  }
}

export function AssumptionsPanel({ planId }: Props) {
  const query = useAssumptionSetByPlan(planId);
  const createAssumptionSet = useCreateAssumptionSet();
  const updateAssumptionSet = useUpdateAssumptionSet();
  const deleteAssumptionSet = useDeleteAssumptionSet();

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<DraftAssumptions>(BLANK_DRAFT);

  const existing = query.data ?? null;

  const openEdit = () => {
    if (existing) {
      setDraft({
        name: existing.name,
        inflationRate: existing.inflationRate,
        nominalGrowthRate: existing.nominalGrowthRate,
        taxPolicy: parseTaxPolicy(existing.taxPolicyJson),
      });
    } else {
      setDraft({ ...BLANK_DRAFT });
    }
    setIsEditing(true);
  };

  const save = async () => {
    const payload = {
      name: draft.name,
      inflationRate: draft.inflationRate,
      nominalGrowthRate: draft.nominalGrowthRate,
      taxPolicyJson: JSON.stringify(draft.taxPolicy),
    };
    if (existing) {
      await updateAssumptionSet.mutateAsync({ id: existing.id, planId, data: payload });
    } else {
      await createAssumptionSet.mutateAsync({ planId, ...payload });
    }
    setIsEditing(false);
  };

  const remove = async () => {
    if (!existing) return;
    await deleteAssumptionSet.mutateAsync({ id: existing.id, planId });
  };

  const setTax = (field: keyof TaxPolicy, value: number) =>
    setDraft((d) => ({ ...d, taxPolicy: { ...d.taxPolicy, [field]: value } }));

  const isSaving = createAssumptionSet.isPending || updateAssumptionSet.isPending;

  if (isEditing) {
    return (
      <div className="sw-card space-y-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {existing ? "Edit Assumptions" : "New Assumption Set"}
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1 col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Tax Year Label</label>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="e.g. 2025/26"
              className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Inflation Rate (%)</label>
            <input
              type="number"
              min={0}
              max={20}
              step={0.1}
              value={(draft.inflationRate * 100).toFixed(1)}
              onChange={(e) => setDraft((d) => ({ ...d, inflationRate: Number(e.target.value) / 100 }))}
              className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Nominal Growth Rate (%)</label>
            <input
              type="number"
              min={0}
              max={30}
              step={0.1}
              value={(draft.nominalGrowthRate * 100).toFixed(1)}
              onChange={(e) => setDraft((d) => ({ ...d, nominalGrowthRate: Number(e.target.value) / 100 }))}
              className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="col-span-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tax Thresholds</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Personal Allowance (£)</label>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={draft.taxPolicy.personalAllowance}
                  onChange={(e) => setTax("personalAllowance", Number(e.target.value))}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Basic Rate Band (£)</label>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={draft.taxPolicy.basicRateBand}
                  onChange={(e) => setTax("basicRateBand", Number(e.target.value))}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Higher Rate Threshold (£)</label>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={draft.taxPolicy.higherRateBand}
                  onChange={(e) => setTax("higherRateBand", Number(e.target.value))}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">SIPP Min Access Age</label>
                <input
                  type="number"
                  min={50}
                  max={70}
                  step={1}
                  value={draft.taxPolicy.sippMinimumAgeAccess}
                  onChange={(e) => setTax("sippMinimumAgeAccess", Number(e.target.value))}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Basic Rate (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={(draft.taxPolicy.basicRate * 100).toFixed(1)}
                  onChange={(e) => setTax("basicRate", Number(e.target.value) / 100)}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Higher Rate (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={(draft.taxPolicy.higherRate * 100).toFixed(1)}
                  onChange={(e) => setTax("higherRate", Number(e.target.value) / 100)}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Additional Rate (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={(draft.taxPolicy.additionalRate * 100).toFixed(1)}
                  onChange={(e) => setTax("additionalRate", Number(e.target.value) / 100)}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={save} disabled={!draft.name || isSaving}>
            {isSaving ? "Saving…" : "Save"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  const taxPolicy = existing ? parseTaxPolicy(existing.taxPolicyJson) : null;

  return (
    <div className="sw-card space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-base">Assumptions</h3>
          {!existing && (
            <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
              using defaults
            </span>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={openEdit}>
          {existing ? "Edit" : "Customise"}
        </Button>
      </div>

      {existing && taxPolicy ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground mb-1">Tax Year</p>
            <p className="text-sm font-medium">{existing.name}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Inflation</p>
              <p className="font-medium">{pct(existing.inflationRate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Growth</p>
              <p className="font-medium">{pct(existing.nominalGrowthRate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Personal Allowance</p>
              <p className="font-medium">{fmt(taxPolicy.personalAllowance)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Basic Rate Band</p>
              <p className="font-medium">{fmt(taxPolicy.basicRateBand)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Higher Rate Threshold</p>
              <p className="font-medium">{fmt(taxPolicy.higherRateBand)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Rates</p>
              <p className="font-medium">
                {pct(taxPolicy.basicRate)} / {pct(taxPolicy.higherRate)} / {pct(taxPolicy.additionalRate)}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={remove}
            disabled={deleteAssumptionSet.isPending}
          >
            Reset to defaults
          </Button>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground space-y-1">
          <p>Personal Allowance {fmt(UK_2026_DEFAULTS.personalAllowance)} · Basic rate {pct(UK_2026_DEFAULTS.basicRate)}</p>
          <p>Basic band {fmt(UK_2026_DEFAULTS.basicRateBand)} · Inflation {pct(BLANK_DRAFT.inflationRate)} · Growth {pct(BLANK_DRAFT.nominalGrowthRate)}</p>
          <p className="text-xs">Customise to override for this plan.</p>
        </div>
      )}
    </div>
  );
}
