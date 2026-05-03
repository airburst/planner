import { Button } from "@/components/ui/button";
import { queryKeys } from "@/hooks/query-keys";
import { useQueryClient } from "@tanstack/react-query";

export function ProjectionError({ planId, message }: { planId: number; message: string }) {
  const queryClient = useQueryClient();

  return (
    <section className="rounded-lg border border-red-200 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950/20">
      <h3 className="font-semibold text-red-700 dark:text-red-400">Projection failed</h3>
      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{message}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        Ensure all people have a date of birth set and the plan has at least one income stream
        or account.
      </p>
      <Button
        className="mt-3"
        variant="outline"
        onClick={() =>
          queryClient.invalidateQueries({ queryKey: queryKeys.projection.forPlan(planId) })
        }
      >
        Retry
      </Button>
    </section>
  );
}
