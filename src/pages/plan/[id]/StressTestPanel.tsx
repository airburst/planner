import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { fmt } from "./utils";

type StressPreset = "high-inflation" | "lower-returns" | "early-death" | "market-crash";

interface StressResult {
  preset: string;
  startYear: number;
  endYear: number;
  years: Array<{
    totalHouseholdAssets: number;
    totalHouseholdTax: number;
    totalHouseholdWithdrawals: number;
    canSustainSpending: boolean;
  }>;
  safeAnnualSpend: number;
}

interface BaseSummary {
  endAssets: number;
  totalTax: number;
  totalDrawdown: number;
  hasShortfall: boolean;
  safeAnnualSpend: number;
}

interface Props {
  planId: number;
  scenarioId?: number | null;
  baseSummary: BaseSummary | null;
}

const PRESETS: { key: StressPreset; label: string; blurb: string }[] = [
  { key: "high-inflation", label: "High inflation", blurb: "Inflation +2% above your assumption" },
  { key: "lower-returns", label: "Lower returns", blurb: "Investment return −2% below your assumption" },
  { key: "early-death", label: "Early death", blurb: "Longevity target reduced by 10 years" },
  { key: "market-crash", label: "Market crash", blurb: "Account balances drop 30% on day one" },
];

function summariseStress(result: StressResult): BaseSummary {
  const totalTax = result.years.reduce((s, y) => s + y.totalHouseholdTax, 0);
  const totalDrawdown = result.years.reduce((s, y) => s + y.totalHouseholdWithdrawals, 0);
  const endAssets = result.years[result.years.length - 1]?.totalHouseholdAssets ?? 0;
  const hasShortfall = result.years.some((y) => !y.canSustainSpending);
  return { endAssets, totalTax, totalDrawdown, hasShortfall, safeAnnualSpend: result.safeAnnualSpend };
}

function deltaCell(base: number, stress: number, isNegativeBetter = false) {
  const diff = stress - base;
  if (diff === 0) return null;
  const sign = diff > 0 ? "+" : "";
  const isBad = isNegativeBetter ? diff > 0 : diff < 0;
  return (
    <p className={`mt-1 text-xs ${isBad ? "text-sw-on-error-container" : "text-green-600"}`}>
      {sign}{fmt(diff)}
    </p>
  );
}

export function StressTestPanel({ planId, scenarioId, baseSummary }: Props) {
  const [activePreset, setActivePreset] = useState<StressPreset | null>(null);

  const stressMutation = useMutation({
    mutationFn: async (preset: StressPreset) => {
      return window.api.runStressTest(planId, preset, scenarioId ? { scenarioId } : {});
    },
  });

  // Clear previous stress result when the underlying projection switches
  // (e.g. user picks a different scenario). Otherwise the panel keeps showing
  // the old delta against an outdated base.
  const reset = stressMutation.reset;
  useEffect(() => {
    setActivePreset(null);
    reset();
  }, [scenarioId, reset]);

  const runPreset = (preset: StressPreset) => {
    setActivePreset(preset);
    stressMutation.mutate(preset);
  };

  const stressSummary = stressMutation.data ? summariseStress(stressMutation.data as StressResult) : null;
  const activePresetMeta = PRESETS.find((p) => p.key === activePreset);

  return (
    <section className="rounded-lg border bg-card p-5 text-card-foreground">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Stress tests</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Run a what-if without changing your plan. Results show the impact vs your base projection.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {PRESETS.map((p) => {
          const isActive = activePreset === p.key && stressMutation.data;
          return (
            <Button
              key={p.key}
              size="sm"
              variant={isActive ? "default" : "outline"}
              onClick={() => runPreset(p.key)}
              disabled={stressMutation.isPending}
              className="h-auto justify-start py-2 text-left whitespace-normal"
            >
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium">{p.label}</span>
                <span className="text-[11px] text-muted-foreground">{p.blurb}</span>
              </div>
            </Button>
          );
        })}
      </div>

      {stressMutation.isPending && (
        <p className="mt-4 text-sm text-muted-foreground animate-pulse">Running stress test…</p>
      )}

      {stressMutation.isError && (
        <p className="mt-4 text-sm text-destructive">
          Stress test failed: {stressMutation.error instanceof Error ? stressMutation.error.message : "unknown"}
        </p>
      )}

      {stressSummary && baseSummary && activePresetMeta && (
        <div className="mt-4 space-y-3">
          <h4 className="text-sm font-semibold">{activePresetMeta.label} vs base</h4>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Assets at end</p>
              <p className="mt-1 text-lg font-semibold">{fmt(stressSummary.endAssets)}</p>
              {deltaCell(baseSummary.endAssets, stressSummary.endAssets)}
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Total tax</p>
              <p className="mt-1 text-lg font-semibold">{fmt(stressSummary.totalTax)}</p>
              {deltaCell(baseSummary.totalTax, stressSummary.totalTax, true)}
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Total drawdown</p>
              <p className="mt-1 text-lg font-semibold">{fmt(stressSummary.totalDrawdown)}</p>
              {deltaCell(baseSummary.totalDrawdown, stressSummary.totalDrawdown, true)}
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Safe annual spend</p>
              <p className="mt-1 text-lg font-semibold">{fmt(stressSummary.safeAnnualSpend)}/yr</p>
              {deltaCell(baseSummary.safeAnnualSpend, stressSummary.safeAnnualSpend)}
            </div>
            <div className="rounded-md border p-3 col-span-2 md:col-span-4">
              <p className="text-xs text-muted-foreground">Status</p>
              <p className={`mt-1 text-sm font-semibold ${stressSummary.hasShortfall ? "text-sw-on-error-container" : "text-green-600"}`}>
                {stressSummary.hasShortfall ? "⚠ Shortfall under stress" : "✓ Plan still sustainable"}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
