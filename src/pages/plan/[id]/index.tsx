import { Button } from "@/components/ui/button";
import { useAccountsByPlan } from "@/hooks/use-accounts";
import { useIncomeStreamsByPlan } from "@/hooks/use-income-streams";
import { usePeopleByPlan } from "@/hooks/use-people";
import { usePlans } from "@/hooks/use-plans";
import { useProjection } from "@/hooks/use-projection";
import { useNavigate, useParams } from "@tanstack/react-router";
import { IncomePhaseChart } from "./IncomePhaseChart";
import { ProjectionError } from "./ProjectionError";
import { ProjectionSummary } from "./ProjectionSummary";
import { ProjectionTable } from "./ProjectionTable";
import { RecommendationPanel } from "./RecommendationPanel";

export function PlanDetailPage() {
  const params = useParams({ from: "/plan/$planId" });
  const planId = Number(params.planId);
  const navigate = useNavigate();

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
        <ProjectionError
          planId={planId}
          message={
            projectionQuery.error instanceof Error
              ? projectionQuery.error.message
              : "An unexpected error occurred."
          }
        />
      )}

      {/* Projection results */}
      {projectionQuery.data && projectionQuery.data.years.length > 0 && (
        <>
          <ProjectionSummary
            years={projectionQuery.data.years}
            startYear={projectionQuery.data.startYear}
            endYear={projectionQuery.data.endYear}
          />
          <IncomePhaseChart
            years={projectionQuery.data.years}
            incomeStreams={incomeStreams}
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
