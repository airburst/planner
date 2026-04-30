import { Badge } from "@/components/ui/badge";
import type { Recommendation } from "@/main/engine/types";

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

export function RecommendationPanel({ recommendations }: { recommendations: Recommendation[] }) {
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

  const sorted = [...recommendations].sort(
    (a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9)
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
