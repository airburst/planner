import { Badge } from "@/components/ui/badge";
import type { Recommendation } from "@/services/engine/types";
import { fmt } from "../_shared/utils";

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

type AccumulationShortfall = {
  isSustainable: boolean;
  additionalAnnualContribution: number;
  yearsToRetirement: number;
};

interface Props {
  recommendations: Recommendation[];
  accumulationShortfall?: AccumulationShortfall;
}

export function RecommendationPanel({ recommendations, accumulationShortfall }: Props) {
  const showShortfall =
    accumulationShortfall &&
    !accumulationShortfall.isSustainable &&
    accumulationShortfall.additionalAnnualContribution > 0;

  if (recommendations.length === 0 && !showShortfall) {
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
      {showShortfall && (
        <div className="mb-4 rounded-md border border-sw-error/40 bg-sw-error-container/40 p-4">
          <div className="flex items-center gap-2">
            <Badge variant="high">SAVE MORE</Badge>
            <span className="text-xs text-muted-foreground">
              {accumulationShortfall.yearsToRetirement} years to retirement
            </span>
          </div>
          <p className="mt-2 font-medium">
            Increase contributions by {fmt(accumulationShortfall.additionalAnnualContribution)}/yr
            to close the gap
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Current plan runs out of funds before the end of the projection window.
            An extra {fmt(accumulationShortfall.additionalAnnualContribution)} saved each year for
            the next {accumulationShortfall.yearsToRetirement} years would make the plan sustainable.
          </p>
        </div>
      )}
      {sorted.length > 0 && (
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
              {typeof rec.impactScore === "number" && rec.impactScore > 0 && (
                <p className="mt-1 text-sm font-semibold text-sw-on-error-container dark:text-red-300">
                  {rec.impactFormat === "count" ? rec.impactScore : fmt(rec.impactScore)}
                  {rec.impactLabel ?? ""}
                </p>
              )}
              <p className="mt-1 text-sm text-muted-foreground">{rec.rationale}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
