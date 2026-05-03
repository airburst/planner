import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { fmt } from "../_shared/utils";

interface Props {
  planId: number;
  scenarioId?: number | null;
}

interface MonteCarloResult {
  iterations: number;
  successProbability: number;
  byYear: Array<{ year: number; p10: number; p50: number; p90: number }>;
}

const ITERATION_OPTIONS = [200, 500, 1000, 2000];

export function MonteCarloPanel({ planId, scenarioId }: Props) {
  const [iterations, setIterations] = useState(1000);
  const [volatilityPct, setVolatilityPct] = useState(10);

  const mutation = useMutation({
    mutationFn: () =>
      window.api.runMonteCarlo(planId, {
        iterations,
        volatility: volatilityPct / 100,
        scenarioId: scenarioId ?? undefined,
      }),
  });

  // Reset cached result when scenario changes — outdated otherwise.
  const reset = mutation.reset;
  useEffect(() => {
    reset();
  }, [scenarioId, reset]);

  const result = mutation.data as MonteCarloResult | undefined;
  const successPct = result ? Math.round(result.successProbability * 100) : null;
  const last = result ? result.byYear[result.byYear.length - 1] : null;
  const successColor = (pct: number) =>
    pct >= 90 ? "text-green-600" : pct >= 75 ? "text-amber-600" : "text-sw-on-error-container";

  return (
    <section className="rounded-lg border bg-card p-5 text-card-foreground">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Monte Carlo simulation</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Re-runs the projection many times with random year-by-year investment returns
            to estimate the probability the plan succeeds.
          </p>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Iterations</label>
          <Select
            value={iterations}
            onValueChange={(v) => setIterations(Number(v))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ITERATION_OPTIONS.map((n) => (
                <SelectItem key={n} value={n}>
                  {n.toLocaleString("en-GB")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            Return volatility (std dev): {volatilityPct}%
          </label>
          <Slider
            value={volatilityPct}
            onValueChange={(v) => setVolatilityPct(v)}
            min={0}
            max={25}
            step={1}
          />
          <p className="text-[11px] text-muted-foreground">
            Equity-heavy ~15%, balanced ~10%, conservative ~5%.
          </p>
        </div>
        <div className="flex items-end">
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="w-full"
          >
            {mutation.isPending ? "Running…" : "Run simulation"}
          </Button>
        </div>
      </div>

      {mutation.isError && (
        <p className="text-sm text-destructive">
          Failed: {mutation.error instanceof Error ? mutation.error.message : "unknown"}
        </p>
      )}

      {result && successPct !== null && last && (
        <div className="space-y-3">
          <div className="rounded-md border p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Probability of success
            </p>
            <p className={`mt-1 text-3xl font-semibold ${successColor(successPct)}`}>
              {successPct}%
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {result.iterations.toLocaleString("en-GB")} simulations sustained spending
              every year in {successPct}% of paths.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Pessimistic (p10) end assets</p>
              <p className="mt-1 text-lg font-semibold">{fmt(last.p10)}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Median (p50) end assets</p>
              <p className="mt-1 text-lg font-semibold">{fmt(last.p50)}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Optimistic (p90) end assets</p>
              <p className="mt-1 text-lg font-semibold">{fmt(last.p90)}</p>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Returns are drawn from a normal distribution centred on your assumed real
            investment return. Sequence-of-returns risk is captured: each year's draw
            is independent.
          </p>
        </div>
      )}
    </section>
  );
}
