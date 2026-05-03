import { usePlans } from "@/hooks/use-plans";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

/**
 * Home is a thin redirect: send the user straight into a plan's Overview if
 * they already have one (the common case). If none exists, send them through
 * onboarding. The legacy "Plans" listing has been removed; multi-plan
 * switching now lives in the AppHeader.
 */
export function HomePage() {
  const navigate = useNavigate();
  const plansQuery = usePlans();

  useEffect(() => {
    if (plansQuery.isLoading) return;
    const plans = plansQuery.data ?? [];
    if (plans.length === 0) {
      navigate({ to: "/onboarding", replace: true });
    } else {
      navigate({
        to: "/plan/$planId/overview",
        params: { planId: String(plans[0].id) },
        replace: true,
      });
    }
  }, [plansQuery.isLoading, plansQuery.data, navigate]);

  return (
    <main className="mx-auto max-w-screen-2xl space-y-6 p-6">
      <p className="animate-pulse text-sm text-muted-foreground">Loading…</p>
    </main>
  );
}
