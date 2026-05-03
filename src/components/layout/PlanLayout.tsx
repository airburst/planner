import { Button } from "@/components/ui/button";
import { PlanProvider } from "@/contexts/PlanContext";
import { usePlans } from "@/hooks/use-plans";
import { ScenarioModal } from "@/pages/plan/[id]/ScenarioModal";
import { Outlet, useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { AppHeader } from "./AppHeader";

export function PlanLayout() {
  const params = useParams({ from: "/plan/$planId" });
  const planId = Number(params.planId);
  const navigate = useNavigate();

  const plansQuery = usePlans();
  const selectedPlan = (plansQuery.data ?? []).find((p) => p.id === planId) ?? null;

  const [selectedScenarioId, setSelectedScenarioId] = useState<number | null>(null);
  const [scenarioModalOpen, setScenarioModalOpen] = useState(false);

  if (!plansQuery.isLoading && !selectedPlan) {
    return (
      <main className="mx-auto max-w-screen-2xl space-y-6 p-6">
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
    <PlanProvider
      value={{
        planId,
        selectedScenarioId,
        setSelectedScenarioId,
        openScenarioModal: () => setScenarioModalOpen(true),
      }}
    >
      <AppHeader
        planId={planId}
        selectedScenarioId={selectedScenarioId}
        onScenarioSelect={setSelectedScenarioId}
        onScenarioCreate={() => setScenarioModalOpen(true)}
      />
      <main className="mx-auto max-w-screen-2xl space-y-6 p-6">
        <Outlet />
      </main>
      <ScenarioModal
        planId={planId}
        open={scenarioModalOpen}
        onOpenChange={setScenarioModalOpen}
      />
    </PlanProvider>
  );
}
