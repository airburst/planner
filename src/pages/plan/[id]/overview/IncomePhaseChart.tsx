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
import { fmt } from "../_shared/utils";

type IncomeStreamRow = Awaited<ReturnType<Window["api"]["getIncomeStreamsByPlan"]>>[number];
type OneOffIncomeRow = Awaited<ReturnType<Window["api"]["getOneOffIncomesByPlan"]>>[number];

interface IncomePhaseChartProps {
  years: HouseholdYearState[];
  incomeStreams: IncomeStreamRow[];
  oneOffIncomes?: OneOffIncomeRow[];
}

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
  group: "income" | "drawdown" | "oneoff";
}

const ONE_OFF_INCOME_KEY = "oneoff_income";
const ONE_OFF_INCOME_COLOR = "#fbbf24"; // warm amber — distinct from streams + drawdowns

const SEGMENT_GAP = 1;
const TOP_RADIUS = 6;

interface BarShapeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
  payload?: Record<string, unknown>;
}

/**
 * Render a stacked-bar segment with:
 *   - rounded top corners only on the topmost visible segment of each row
 *   - 1px gap above each non-topmost segment (so the segments don't touch)
 */
function makeBarShape(seriesKey: string) {
  return function BarShape(props: BarShapeProps) {
    const { x = 0, y = 0, width = 0, height = 0, fill, payload } = props;
    if (height <= 0 || width <= 0) return null;
    const isTopmost = payload?._topmostKey === seriesKey;

    if (isTopmost) {
      const r = Math.min(TOP_RADIUS, width / 2, height);
      const d = [
        `M ${x} ${y + height}`,
        `L ${x} ${y + r}`,
        `Q ${x} ${y} ${x + r} ${y}`,
        `L ${x + width - r} ${y}`,
        `Q ${x + width} ${y} ${x + width} ${y + r}`,
        `L ${x + width} ${y + height}`,
        `Z`,
      ].join(" ");
      return <path d={d} fill={fill} />;
    }
    // Non-topmost: shrink by 2px from the top to create the inter-segment gap.
    return (
      <rect
        x={x}
        y={y + SEGMENT_GAP}
        width={width}
        height={Math.max(0, height - SEGMENT_GAP)}
        fill={fill}
      />
    );
  };
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

const SPENDING_TARGET_COLOR = "var(--sw-error)";

const SPENDING_TARGET_KEY = "spendingTarget";

export function IncomePhaseChart({ years, incomeStreams, oneOffIncomes = [] }: IncomePhaseChartProps) {
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(() => new Set([SPENDING_TARGET_KEY]));

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

  // Pre-bucket one-off income events by year for fast lookup.
  const oneOffByYear = useMemo(() => {
    const map = new Map<number, number>();
    for (const event of oneOffIncomes) {
      if (event.amount <= 0) continue;
      map.set(event.year, (map.get(event.year) ?? 0) + event.amount);
    }
    return map;
  }, [oneOffIncomes]);

  // Compute per-year chart rows: each stream and each drawdown source as its own field.
  const { data, activeStreamIds, activeDrawdownKeys, hasOneOffIncome } = useMemo(() => {
    const usedStreamIds = new Set<number>();
    const usedDrawdownKeys = new Set<string>();
    let oneOffSeen = false;

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

      // One-off income events (windfalls) — stack between stream income and drawdowns.
      const oneOffAmount = oneOffByYear.get(year.year) ?? 0;
      if (oneOffAmount > 0) {
        row[ONE_OFF_INCOME_KEY] = oneOffAmount;
        row.total += oneOffAmount;
        oneOffSeen = true;
      }

      return row;
    });

    return {
      data: rows,
      activeStreamIds: Array.from(usedStreamIds).sort((a, b) => a - b),
      activeDrawdownKeys: ["drawdown_cash", "drawdown_isa", "drawdown_sipp_tfls", "drawdown_sipp_taxable", "drawdown_other"]
        .filter((k) => usedDrawdownKeys.has(k)),
      hasOneOffIncome: oneOffSeen,
    };
  }, [years, oneOffByYear]);

  // Series metadata in stack order (bottom → top): streams, then one-off income,
  // then drawdowns. One-off windfalls sit between recurring income and drawdown
  // because they reduce drawdown need just like stream income does.
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
    if (hasOneOffIncome) {
      list.push({
        key: ONE_OFF_INCOME_KEY,
        label: "One-off income",
        color: ONE_OFF_INCOME_COLOR,
        group: "oneoff",
      });
    }
    activeDrawdownKeys.forEach((k) => {
      list.push({
        key: k,
        label: DRAWDOWN_LABELS[k],
        color: DRAWDOWN_COLORS[k],
        group: "drawdown",
      });
    });
    return list;
  }, [activeStreamIds, activeDrawdownKeys, streamMeta, hasOneOffIncome]);

  // Annotate each row with its currently-visible topmost stack key.
  // Recomputed when hiddenKeys changes so toggling visibility updates rounding.
  const dataWithTopmost = useMemo(() => {
    const visibleKeys = series.filter((s) => !hiddenKeys.has(s.key)).map((s) => s.key);
    return data.map((row) => {
      let topmostKey: string | undefined;
      for (let i = visibleKeys.length - 1; i >= 0; i--) {
        const k = visibleKeys[i];
        if ((row[k] ?? 0) > 0) {
          topmostKey = k;
          break;
        }
      }
      return { ...row, _topmostKey: topmostKey };
    });
  }, [data, series, hiddenKeys]);

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
            Annual income sources and bridge-year drawdowns. The dashed line marks your spending target.
          </p>
        </div>
      </div>

      {/* Legend / toggles — grouped by series type. Visual separator between
          groups replaces per-chip "drawdown" / "windfall" labels. */}
      {(() => {
        const incomeSeries = series.filter((s) => s.group === "income");
        const oneOffSeries = series.filter((s) => s.group === "oneoff");
        const drawdownSeries = series.filter((s) => s.group === "drawdown");
        const groups = [incomeSeries, oneOffSeries, drawdownSeries].filter(
          (g) => g.length > 0
        );
        const targetHidden = hiddenKeys.has(SPENDING_TARGET_KEY);

        const renderChip = (s: SeriesMeta) => {
          const isHidden = hiddenKeys.has(s.key);
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => toggle(s.key)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                isHidden
                  ? "border-border text-muted-foreground"
                  : "border-foreground/15 bg-muted/40 text-foreground"
              }`}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: s.color, opacity: isHidden ? 0.3 : 1 }}
              />
              <span>{s.label}</span>
            </button>
          );
        };

        return (
          <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
            {groups.map((group, i) => (
              <div key={i} className="flex flex-wrap items-center gap-1.5">
                {group.map(renderChip)}
                {i < groups.length - 1 && (
                  <span className="mx-1 h-4 w-px bg-border" aria-hidden />
                )}
              </div>
            ))}
            <span className="mx-1 h-4 w-px bg-border" aria-hidden />
            <button
              type="button"
              onClick={() => toggle(SPENDING_TARGET_KEY)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                targetHidden
                  ? "border-border text-muted-foreground"
                  : "border-foreground/15 bg-muted/40 text-foreground"
              }`}
            >
              <span
                className="h-0.5 w-3 rounded-full"
                style={{ backgroundColor: SPENDING_TARGET_COLOR, opacity: targetHidden ? 0.3 : 1 }}
              />
              <span>Spending target</span>
            </button>
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto h-7 px-2 text-xs"
              onClick={resetHidden}
              disabled={hiddenKeys.size === 0}
            >
              Reset
            </Button>
          </div>
        );
      })()}

      <div className="h-96 w-full rounded-md border bg-background/40 p-2">
        {/* debounce + minHeight silence recharts' first-frame -1×-1 warning
            when this route is mounted from a lazy-loaded chunk. */}
        <ResponsiveContainer width="100%" height="100%" minHeight={1} debounce={50}>
          <ComposedChart
            data={dataWithTopmost}
            barCategoryGap={0}
            margin={{ top: 8, right: 16, left: 12, bottom: 0 }}
          >
            <defs>
              {series.map((s) => (
                <linearGradient
                  key={`grad-${s.key}`}
                  id={`grad-${s.key}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.55} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={1} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="year"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={90}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              tickFormatter={(value) => fmt(Number(value))}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 10,
                border: "1px solid var(--border)",
                backgroundColor: "var(--card)",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.18)",
              }}
              labelStyle={{ color: "var(--card-foreground)", fontWeight: 600 }}
              itemStyle={{ color: "var(--card-foreground)" }}
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
                  stackId="cashflow"
                  fill={`url(#grad-${s.key})`}
                  shape={makeBarShape(s.key)}
                  isAnimationActive
                  animationDuration={400}
                  animationEasing="ease-out"
                />
              );
            })}

            {!hiddenKeys.has(SPENDING_TARGET_KEY) && (
              <Line
                type="step"
                dataKey="spendingTarget"
                name="Spending target"
                stroke={SPENDING_TARGET_COLOR}
                strokeWidth={2.5}
                strokeDasharray="6 3"
                dot={false}
                isAnimationActive
                animationDuration={400}
                animationEasing="ease-out"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Click a legend chip to hide that series. Drawdown bars are stacked above stream income; the
        dashed target line shows when external income alone covers spending.
      </p>
    </section>
  );
}
