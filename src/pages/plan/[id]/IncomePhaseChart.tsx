import { Button } from "@/components/ui/button";
import type { HouseholdYearState } from "@/services/engine/types";
import { useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmt } from "./utils";

type IncomeStreamRow = Awaited<ReturnType<Window["api"]["getIncomeStreamsByPlan"]>>[number];

interface IncomePhaseChartProps {
  years: HouseholdYearState[];
  incomeStreams: IncomeStreamRow[];
}

type ViewMode = "stacked" | "separated";

interface ChartRow {
  year: number;
  spendingTarget: number;
  total: number;
  [key: string]: number;
}

interface SeriesMeta {
  key: string;
  label: string;
  color: string;
  group: "income" | "drawdown";
}

// Voyant-inspired palette: streams in warm green/teal/purple, drawdowns in cool blue family.
const STREAM_COLORS = [
  "#0f766e", // dark teal — primary stream (state pension)
  "#a855f7", // purple — DB pension
  "#0891b2", // cyan — secondary stream
  "#16a34a", // green — salary / employment
  "#ca8a04", // amber — other income
  "#dc2626", // red — last-resort fallback
];

const DRAWDOWN_COLORS: Record<string, string> = {
  drawdown_cash: "#5eead4",       // light teal — cash savings
  drawdown_isa: "#14b8a6",        // teal — ISA (tax-free savings)
  drawdown_sipp_tfls: "#3b82f6",  // blue — SIPP 25% tax-free lump sum
  drawdown_sipp_taxable: "#93c5fd", // light blue — SIPP taxable component
  drawdown_other: "#a78bfa",      // purple — other accounts
};

const DRAWDOWN_LABELS: Record<string, string> = {
  drawdown_cash: "Cash drawdown",
  drawdown_isa: "ISA drawdown (tax-free)",
  drawdown_sipp_tfls: "SIPP — tax-free 25%",
  drawdown_sipp_taxable: "SIPP — taxable",
  drawdown_other: "Other drawdown",
};

const SPENDING_TARGET_COLOR = "#22c55e";

export function IncomePhaseChart({ years, incomeStreams }: IncomePhaseChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("stacked");
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());

  // Build per-stream metadata using a stable colour assignment.
  const streamMeta = useMemo(() => {
    const map = new Map<number, { label: string; color: string }>();
    incomeStreams.forEach((stream, index) => {
      const label = stream.name?.trim() || `Stream ${stream.id}`;
      map.set(stream.id, {
        label,
        color: STREAM_COLORS[index % STREAM_COLORS.length],
      });
    });
    return map;
  }, [incomeStreams]);

  // Compute per-year chart rows: each stream and each drawdown source as its own field.
  const { data, activeStreamIds, activeDrawdownKeys } = useMemo(() => {
    const usedStreamIds = new Set<number>();
    const usedDrawdownKeys = new Set<string>();

    const rows: ChartRow[] = years.map((year) => {
      const row: ChartRow = {
        year: year.year,
        spendingTarget: year.totalHouseholdIncome - year.deficitOrSurplus,
        total: 0,
      };

      // Stream income summed across people.
      year.people.forEach((personYear) => {
        personYear.incomeByStream.forEach((amount, streamId) => {
          if (amount <= 0) return;
          const key = `stream_${streamId}`;
          row[key] = (row[key] ?? 0) + amount;
          row.total += amount;
          usedStreamIds.add(streamId);
        });

        // Drawdown sources from each withdrawal detail.
        for (const detail of personYear.withdrawalDetails) {
          if (detail.amountWithdrawn <= 0) continue;
          if (detail.accountType === "sipp") {
            if (detail.taxFreeComponent > 0) {
              row.drawdown_sipp_tfls = (row.drawdown_sipp_tfls ?? 0) + detail.taxFreeComponent;
              row.total += detail.taxFreeComponent;
              usedDrawdownKeys.add("drawdown_sipp_tfls");
            }
            if (detail.taxableComponent > 0) {
              row.drawdown_sipp_taxable = (row.drawdown_sipp_taxable ?? 0) + detail.taxableComponent;
              row.total += detail.taxableComponent;
              usedDrawdownKeys.add("drawdown_sipp_taxable");
            }
          } else {
            const key = `drawdown_${detail.accountType}`;
            row[key] = (row[key] ?? 0) + detail.amountWithdrawn;
            row.total += detail.amountWithdrawn;
            usedDrawdownKeys.add(key);
          }
        }
      });

      return row;
    });

    return {
      data: rows,
      activeStreamIds: Array.from(usedStreamIds).sort((a, b) => a - b),
      activeDrawdownKeys: ["drawdown_cash", "drawdown_isa", "drawdown_sipp_tfls", "drawdown_sipp_taxable", "drawdown_other"]
        .filter((k) => usedDrawdownKeys.has(k)),
    };
  }, [years]);

  // Series metadata in stack order (bottom → top): streams, then drawdowns.
  const series: SeriesMeta[] = useMemo(() => {
    const list: SeriesMeta[] = [];
    activeStreamIds.forEach((id) => {
      const meta = streamMeta.get(id);
      list.push({
        key: `stream_${id}`,
        label: meta?.label ?? `Stream ${id}`,
        color: meta?.color ?? STREAM_COLORS[0],
        group: "income",
      });
    });
    activeDrawdownKeys.forEach((k) => {
      list.push({
        key: k,
        label: DRAWDOWN_LABELS[k],
        color: DRAWDOWN_COLORS[k],
        group: "drawdown",
      });
    });
    return list;
  }, [activeStreamIds, activeDrawdownKeys, streamMeta]);

  const toggle = (key: string) => {
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const resetHidden = () => setHiddenKeys(new Set());

  if (series.length === 0) {
    return (
      <section className="rounded-lg border bg-card p-5 text-card-foreground">
        <h3 className="mb-1 text-lg font-semibold">Cash Flow</h3>
        <p className="text-sm text-muted-foreground">
          No income or drawdown projected in the selected period.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border bg-card p-5 text-card-foreground shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="mb-1 text-lg font-semibold">Cash Flow</h3>
          <p className="text-sm text-muted-foreground">
            Annual income sources and bridge-year drawdowns. The green line marks your spending target.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-background/60 p-1 shadow-sm">
          <Button
            size="sm"
            variant={viewMode === "stacked" ? "default" : "outline"}
            onClick={() => setViewMode("stacked")}
          >
            Stacked
          </Button>
          <Button
            size="sm"
            variant={viewMode === "separated" ? "default" : "outline"}
            onClick={() => setViewMode("separated")}
          >
            Split
          </Button>
        </div>
      </div>

      {/* Legend / toggles */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {series.map((s) => {
          const isHidden = hiddenKeys.has(s.key);
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => toggle(s.key)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors ${
                isHidden
                  ? "border-border text-muted-foreground"
                  : "border-foreground/20 bg-muted/40 text-foreground"
              }`}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: s.color, opacity: isHidden ? 0.3 : 1 }}
              />
              <span>{s.label}</span>
              {s.group === "drawdown" && (
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">drawdown</span>
              )}
            </button>
          );
        })}
        <span className="inline-flex items-center gap-2 rounded-full border border-dashed px-3 py-1 text-xs text-muted-foreground">
          <span
            className="h-0.5 w-4 rounded-full"
            style={{ backgroundColor: SPENDING_TARGET_COLOR }}
          />
          <span>Spending target</span>
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs"
          onClick={resetHidden}
          disabled={hiddenKeys.size === 0}
        >
          Reset
        </Button>
      </div>

      <div className="h-96 w-full rounded-md border bg-background/40 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            barCategoryGap={2}
            margin={{ top: 8, right: 16, left: 12, bottom: 0 }}
          >
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="year"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={90}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              tickFormatter={(value) => fmt(Number(value))}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 10,
                border: "1px solid #e2e8f0",
                backgroundColor: "#ffffff",
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              }}
              labelStyle={{ color: "#0f172a", fontWeight: 600 }}
              formatter={(value, name) => {
                const numericValue = Number(Array.isArray(value) ? value[0] : value ?? 0);
                if (name === "Spending target") {
                  return [fmt(numericValue), "Spending target"];
                }
                const match = series.find((s) => s.key === name);
                return [fmt(numericValue), match?.label ?? String(name)];
              }}
              labelFormatter={(label) => `Year ${label}`}
            />

            {series.map((s) => {
              if (hiddenKeys.has(s.key)) return null;
              return (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  stackId={viewMode === "stacked" ? "cashflow" : s.key}
                  fill={s.color}
                  fillOpacity={0.9}
                  isAnimationActive={false}
                />
              );
            })}

            <Line
              type="stepAfter"
              dataKey="spendingTarget"
              name="Spending target"
              stroke={SPENDING_TARGET_COLOR}
              strokeWidth={2.5}
              strokeDasharray="6 3"
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Click a legend chip to hide that series. Drawdown bars are stacked above stream income so the green
        line shows when external income alone covers spending.
      </p>
    </section>
  );
}
