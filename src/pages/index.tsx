import { Button } from "@/components/ui/button";
import { useCreatePlan, usePlans } from "@/renderer/hooks/use-plans";
import { useNavigate } from "@tanstack/react-router";

export function HomePage() {
  const navigate = useNavigate();
  const plansQuery = usePlans();
  const createPlan = useCreatePlan();

  const plans = plansQuery.data ?? [];

  const createSamplePlan = async () => {
    const name = `Plan ${plans.length + 1}`;
    await createPlan.mutateAsync({ name, description: "Created from renderer flow" });
  };

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-3xl font-semibold tracking-tight">Planner</h1>
      <p className="text-muted-foreground">
        Long-term retirement and financial planning
      </p>

      {/* Create new plan section */}
      <section className="rounded-lg border bg-primary/5 p-6 text-card-foreground">
        <h2 className="mb-3 text-lg font-semibold">Get Started</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Create a new plan and walk through our guided setup process.
        </p>
        <Button onClick={() => navigate({ to: "/onboarding" })}>
          Create New Plan
        </Button>
      </section>

      {/* Existing plans section */}
      <section className="rounded-lg border bg-card p-4 text-card-foreground">
        <h2 className="mb-3 text-lg font-semibold">Your Plans</h2>
        <div className="mb-4 flex flex-wrap gap-3">
          <Button onClick={createSamplePlan} disabled={createPlan.isPending}>
            {createPlan.isPending ? "Creating..." : "Add Plan (Quick)"}
          </Button>
        </div>

        {plans.length === 0 ? (
          <p className="text-sm text-muted-foreground">No plans yet. Start with the guided setup above.</p>
        ) : (
          <ul className="space-y-2">
            {plans.map((plan) => (
              <li
                key={plan.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div>
                  <p className="font-medium">{plan.name}</p>
                  <p className="text-sm text-muted-foreground">Plan id: {plan.id}</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() =>
                    navigate({ to: "/plan/$planId", params: { planId: String(plan.id) } })
                  }
                >
                  Open
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
