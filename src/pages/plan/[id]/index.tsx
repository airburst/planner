import type { HouseholdYearState, Recommendation } from "@/main/engine/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { queryKeys } from "@/renderer/hooks/query-keys";
import { useAccountsByPlan } from "@/renderer/hooks/use-accounts";
import { useIncomeStreamsByPlan } from "@/renderer/hooks/use-income-streams";
import { usePeopleByPlan } from "@/renderer/hooks/use-people";
import { usePlans } from "@/renderer/hooks/use-plans";
import { useProjection } from "@/renderer/hooks/use-projection";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";

// ─── Formatting helpers ───────────────────────────────────────────────────────

const gbpFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

function fmt(n: number) {
  return gbpFormatter.format(n);
}

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProjectionSummary({
  years,
  startYear,
  endYear,
}: {
  years: HouseholdYearState[];
  startYear: number;
  endYear: number;
}) {
  const allSustainable = years.every((y) => y.canSustainSpending);
  const firstUnsustainable = years.find((y) => !y.canSustainSpending);
  const lastYear = years.at(-1);
  const totalTax = years.reduce((sum, y) => sum + y.totalHouseholdTax, 0);
  const totalWithdrawals = years.reduce((sum, y) => sum + y.totalHouseholdWithdrawals, 0);

  return (
    <section className="rounded-lg border bg-card p-5 text-card-foreground">
      <h3 className="mb-1 text-lg font-semibold">Projection Summary</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        {startYear}–{endYear} · {years.length} years
      </p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <p className="text-xs text-muted-foreground">Sustainability</p>
          {allSustainable ? (
            <p className="mt-1 font-semibold text-green-600 dark:text-green-400">
              All years funded
            </p>
          ) : (
            <p className="mt-1 font-semibold text-red-600 dark:text-red-400">
              Shortfall from {firstUnsustainable?.year}
            </p>
          )}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Assets at end</p>
          <p className="mt-1 font-semibold">
            {lastYear ? fmt(lastYear.totalHouseholdAssets) : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Estimated total tax</p>
          <p className="mt-1 font-semibold">{fmt(totalTax)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total drawdown</p>
          <p className="mt-1 font-semibold">{fmt(totalWithdrawals)}</p>
        </div>
      </div>
    </section>
  );
}

function RecommendationPanel({ recommendations }: { recommendations: Recommendation[] }) {
  if (recommendations.length === 0) {
    return (
      <section className="rounded-lg border bg-card p-5 text-card-foreground">
        <h3 className="mb-2 text-lg font-semibold">Recommendations</h3>
        <p className="text-sm text-muted-foreground">
          No recommendations — the plan looks healthy.
        </p>
      </section>
    );
  }

  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const sorted = [...recommendations].sort(
    (a, b) => (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9)
  );

  return (
    <section className="rounded-lg border bg-card p-5 text-card-foreground">
      <h3 className="mb-4 text-lg font-semibold">Recommendations</h3>
      <ul className="space-y-3">
        {sorted.map((rec) => (
          <li key={rec.id} className="rounded-md border p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={rec.priority as "high" | "medium" | "low"}>
                {rec.priority.toUpperCase()}
              </Badge>
              <Badge variant="muted">{rec.category}</Badge>
              <span className="text-xs text-muted-foreground">triggered {rec.yearTriggered}</span>
            </div>
            <p className="mt-2 font-medium">{rec.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{rec.rationale}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProjectionTable({ years }: { years: HouseholdYearState[] }) {
  return (
    <section className="rounded-lg border bg-card text-card-foreground">
      <div className="border-b p-5">
        <h3 className="text-lg font-semibold">Year by Year</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <th className="px-4 py-2">Year</th>
              <th className="px-4 py-2 text-right">Income</th>
              <th className="px-4 py-2 text-right">Tax</th>
              <th className="px-4 py-2 text-right">Eff. rate</th>
              <th className="px-4 py-2 text-right">Drawdown</th>
              <th className="px-4 py-2 text-right">Assets</th>
              <th className="px-4 py-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {years.map((y) => (
              <tr
                key={y.year}
                className={
                  y.canSustainSpending
                    ? "border-b hover:bg-muted/20"
                    : "border-b bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/30"
                }
              >
                <td className="px-4 py-2 font-medium">{y.year}</td>
                <td className="px-4 py-2 text-right">{fmt(y.totalHouseholdIncome)}</td>
                <td className="px-4 py-2 text-right">{fmt(y.totalHouseholdTax)}</td>
                <td className="px-4 py-2 text-right text-muted-foreground">
                  {y.totalHouseholdIncome > 0
                    ? pct(y.totalHouseholdTax / y.totalHouseholdIncome)
                    : "—"}
                </td>
                <td className="px-4 py-2 text-right">{fmt(y.totalHouseholdWithdrawals)}</td>
                <td className="px-4 py-2 text-right">{fmt(y.totalHouseholdAssets)}</td>
                <td className="px-4 py-2 text-center">
                  {y.canSustainSpending ? (
                    <span className="text-green-600 dark:text-green-400">✓</span>
                  ) : (
                    <span className="text-red-600 dark:text-red-400">✗</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function PlanDetailPage() {
  const params = useParams({ from: "/plan/$planId" });
  const planId = Number(params.planId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const plansQuery = usePlans();
  const peopleQuery = usePeopleByPlan(planId);
  const accountsQuery = useAccountsByPlan(planId);
  const incomeStreamsQuery = useIncomeStreamsByPlan(planId);
  const projectionQuery = useProjection(planId);

  const selectedPlan = (plansQuery.data ?? []).find((p) => p.id === planId) ?? null;
  const people = peopleQuery.data ?? [];
  const accounts = accountsQuery.data ?? [];
  const incomeStreams = incomeStreamsQuery.data ?? [];

  if (!selectedPlan) {
    return (
      <main className="mx-auto max-w-5xl space-y-6 p-6">
        <section className="rounded-lg border bg-card p-5 text-card-foreground">
          <h2 className="text-lg font-semibold">Plan not found</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This plan does not exist or has not loaded yet.
          </p>
          <Button className="mt-4" variant="outline" onClick={() => navigate({ to: "/" })}>
            ← Back to plans
          </Button>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{selectedPlan.name}</h1>
          {selectedPlan.description && (
            <p className="mt-1 text-sm text-muted-foreground">{selectedPlan.description}</p>
          )}
        </div>
        <Button variant="outline" onClick={() => navigate({ to: "/" })}>
          ← Plans
        </Button>
      </div>

      {/* Plan snapshot */}
      <section className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4 text-card-foreground">
          <p className="text-xs text-muted-foreground">People</p>
          <p className="mt-1 text-2xl font-semibold">{people.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-card-foreground">
          <p className="text-xs text-muted-foreground">Accounts</p>
          <p className="mt-1 text-2xl font-semibold">{accounts.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-card-foreground">
          <p className="text-xs text-muted-foreground">Income streams</p>
          <p className="mt-1 text-2xl font-semibold">{incomeStreams.length}</p>
        </div>
      </section>

      {/* Projection loading */}
      {projectionQuery.isLoading && (
        <section className="rounded-lg border bg-card p-5 text-card-foreground">
          <p className="animate-pulse text-sm text-muted-foreground">Running projection…</p>
        </section>
      )}

      {/* Projection error */}
      {projectionQuery.isError && (
        <section className="rounded-lg border border-red-200 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950/20">
          <h3 className="font-semibold text-red-700 dark:text-red-400">Projection failed</h3>
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {projectionQuery.error instanceof Error
              ? projectionQuery.error.message
              : "An unexpected error occurred."}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Ensure all people have a date of birth set and the plan has at least one income
            stream or account.
          </p>
          <Button
            className="mt-3"
            variant="outline"
            onClick={() =>
              queryClient.invalidateQueries({
                queryKey: queryKeys.projection.forPlan(planId),
              })
            }
          >
            Retry
          </Button>
        </section>
      )}

      {/* Projection results */}
      {projectionQuery.data && projectionQuery.data.years.length > 0 && (
        <>
          <ProjectionSummary
            years={projectionQuery.data.years}
            startYear={projectionQuery.data.startYear}
            endYear={projectionQuery.data.endYear}
          />
          <RecommendationPanel recommendations={projectionQuery.data.recommendations} />
          <ProjectionTable years={projectionQuery.data.years} />
        </>
      )}

      {/* Empty state */}
      {projectionQuery.data && projectionQuery.data.years.length === 0 && (
        <section className="rounded-lg border bg-card p-5 text-card-foreground">
          <p className="text-sm text-muted-foreground">
            No projection data. Add a person with a date of birth to get started.
          </p>
        </section>
      )}
    </main>
  );
}
