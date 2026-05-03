import { useProjection } from "@/hooks/use-projection";
import { useScenarioProjection } from "@/hooks/use-scenarios";
import { HouseholdYearState } from "@/services/engine/types";
import { formatCurrency } from "../_shared/utils";

interface ScenarioComparisonProps {
  planId: number;
  selectedScenarioId: number | null;
}

function computeMetrics(years: HouseholdYearState[]) {
  if (!years || years.length === 0) {
    return {
      endAssets: 0,
      totalTax: 0,
      totalDrawdown: 0,
      avgDrawdown: 0,
      years,
    };
  }

  const totalTax = years.reduce((sum, y) => sum + y.totalHouseholdTax, 0);
  // Total amount drawn from accounts across the projection. (Earlier code
  // reported "withdrawals - income" which masked normal drawdown as £0.)
  const totalDrawdown = years.reduce(
    (sum, y) => sum + (y.totalHouseholdWithdrawals || 0),
    0
  );
  // Average over the years that include any drawdown only — gives a more
  // representative figure than dividing by the full plan length.
  const drawdownYears = years.filter((y) => (y.totalHouseholdWithdrawals || 0) > 0).length;
  const avgDrawdown = drawdownYears > 0 ? totalDrawdown / drawdownYears : 0;
  const endAssets = years[years.length - 1]?.totalHouseholdAssets ?? 0;
  const hasShortfall = years.some((y) => !y.canSustainSpending);

  return {
    endAssets,
    totalTax,
    totalDrawdown,
    avgDrawdown,
    hasShortfall,
    years,
  };
}

function MetricCard({
  label,
  value,
  delta,
  isDeltaBad,
}: {
  label: string;
  value: string;
  delta?: string;
  isDeltaBad?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card p-3 text-card-foreground">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
      {delta && (
        <p
          className={`mt-1 text-xs ${isDeltaBad ? "text-red-600" : "text-green-600"
            }`}
        >
          {delta}
        </p>
      )}
    </div>
  );
}

function formatDelta(
  value: number,
  isNegativeBetter: boolean = false
): { value: string; isBad: boolean } {
  const sign = value > 0 ? "+" : "";
  const isBad = isNegativeBetter ? value > 0 : value < 0;
  return { value: `${sign}${formatCurrency(value)}`, isBad };
}

export function ScenarioComparison({
  planId,
  selectedScenarioId,
}: ScenarioComparisonProps) {
  const baseProjection = useProjection(planId);
  const scenarioProjection = useScenarioProjection(selectedScenarioId);

  // If no scenario is selected, just show base plan
  if (!selectedScenarioId) {
    const baseMetrics =
      baseProjection.data && baseProjection.data.years
        ? computeMetrics(baseProjection.data.years)
        : null;

    if (!baseMetrics) {
      return null;
    }

    return (
      <div className="rounded-lg border bg-card p-4 text-card-foreground">
        <h3 className="font-semibold mb-3">Projection Summary</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <MetricCard
            label="Assets at end"
            value={formatCurrency(baseMetrics.endAssets)}
          />
          <MetricCard
            label="Total tax"
            value={formatCurrency(baseMetrics.totalTax)}
          />
          <MetricCard
            label="Avg annual drawdown"
            value={formatCurrency(baseMetrics.avgDrawdown)}
          />
          <MetricCard
            label="Status"
            value={baseMetrics.hasShortfall ? "⚠ Shortfall" : "✓ Sustainable"}
          />
        </div>
      </div>
    );
  }

  // Show comparison view
  if (scenarioProjection.isLoading) {
    return (
      <div className="rounded-lg border bg-card p-4 text-card-foreground">
        <p className="animate-pulse text-sm text-muted-foreground">
          Calculating scenario…
        </p>
      </div>
    );
  }

  if (scenarioProjection.isError) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
        <p className="text-sm font-medium">Error running scenario projection</p>
        <p className="text-xs text-destructive/80 mt-1">
          {scenarioProjection.error instanceof Error
            ? scenarioProjection.error.message
            : "Unknown error"}
        </p>
      </div>
    );
  }

  const baseMetrics =
    baseProjection.data && baseProjection.data.years
      ? computeMetrics(baseProjection.data.years)
      : null;

  const scenarioMetrics =
    scenarioProjection.data && scenarioProjection.data.years
      ? computeMetrics(scenarioProjection.data.years)
      : null;

  if (!baseMetrics || !scenarioMetrics) {
    return null;
  }

  // Calculate deltas
  const deltaAssets = scenarioMetrics.endAssets - baseMetrics.endAssets;
  const deltaTax = scenarioMetrics.totalTax - baseMetrics.totalTax;
  const deltaDrawdown = scenarioMetrics.avgDrawdown - baseMetrics.avgDrawdown;

  const { value: assetsDeltaStr, isBad: assetsDeltaBad } = formatDelta(deltaAssets, false);
  const { value: taxDeltaStr, isBad: taxDeltaBad } = formatDelta(deltaTax, true);
  const { value: drawdownDeltaStr, isBad: drawdownDeltaBad } = formatDelta(deltaDrawdown, true);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4 text-card-foreground">
        <h3 className="font-semibold mb-4">Scenario vs Base Plan</h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Base Plan Column */}
          <div>
            <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Base Plan</h4>
            <div className="space-y-2">
              <MetricCard
                label="Assets at end"
                value={formatCurrency(baseMetrics.endAssets)}
              />
              <MetricCard
                label="Total tax"
                value={formatCurrency(baseMetrics.totalTax)}
              />
              <MetricCard
                label="Avg annual drawdown"
                value={formatCurrency(baseMetrics.avgDrawdown)}
              />
              <MetricCard
                label="Status"
                value={
                  baseMetrics.hasShortfall ? "⚠ Shortfall" : "✓ Sustainable"
                }
              />
            </div>
          </div>

          {/* Scenario Column */}
          <div>
            <h4 className="text-sm font-semibold mb-3 text-muted-foreground">
              Scenario
            </h4>
            <div className="space-y-2">
              <MetricCard
                label="Assets at end"
                value={formatCurrency(scenarioMetrics.endAssets)}
                delta={assetsDeltaStr}
                isDeltaBad={assetsDeltaBad}
              />
              <MetricCard
                label="Total tax"
                value={formatCurrency(scenarioMetrics.totalTax)}
                delta={taxDeltaStr}
                isDeltaBad={taxDeltaBad}
              />
              <MetricCard
                label="Avg annual drawdown"
                value={formatCurrency(scenarioMetrics.avgDrawdown)}
                delta={drawdownDeltaStr}
                isDeltaBad={drawdownDeltaBad}
              />
              <MetricCard
                label="Status"
                value={
                  scenarioMetrics.hasShortfall ? "⚠ Shortfall" : "✓ Sustainable"
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
