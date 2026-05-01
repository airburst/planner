import { useProjection } from "@/hooks/use-projection";
import { HouseholdYearState } from "@/services/engine/types";
import { formatCurrency } from "./utils";

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

  const totalTax = years.reduce((sum, y) => sum + y.totalTax, 0);
  const totalDrawdown = years.reduce((sum, y) => {
    const income = y.totalIncome || 0;
    const spending = y.totalSpending || 0;
    return sum + Math.max(0, spending - income);
  }, 0);
  const avgDrawdown = totalDrawdown / years.length;
  const endAssets = years[years.length - 1]?.endNetWorth ?? 0;
  const hasShortfall = years.some((y) => y.shortfall > 0);

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
  isDelta,
}: {
  label: string;
  value: string;
  delta?: string;
  isDelta?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card p-3 text-card-foreground">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
      {delta && (
        <p
          className={`mt-1 text-xs ${isDelta && delta.startsWith("-")
              ? "text-red-600"
              : "text-green-600"
            }`}
        >
          {delta}
        </p>
      )}
    </div>
  );
}

export function ScenarioComparison({
  planId,
  selectedScenarioId,
}: ScenarioComparisonProps) {
  const baseProjection = useProjection(planId);

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
            value={
              baseMetrics.hasShortfall ? "⚠ Shortfall" : "✓ Sustainable"
            }
          />
        </div>
      </div>
    );
  }

  // Scenario selected - would need to run projection for scenario
  // For now, just show base plan metrics
  // TODO: Implement scenario projection comparison
  return (
    <div className="rounded-lg border bg-card p-4 text-card-foreground">
      <h3 className="font-semibold mb-3">Scenario Comparison</h3>
      <p className="text-sm text-muted-foreground">
        Scenario comparison not yet implemented. Select a scenario to create and compare.
      </p>
    </div>
  );
}
