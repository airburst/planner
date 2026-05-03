import type { HouseholdYearState } from "@/services/engine/types";
import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmt } from "./utils";

interface Person {
  id: number;
  firstName: string;
  retirementAge?: number | null;
  dateOfBirth?: string | null;
}

interface Props {
  years: HouseholdYearState[];
  people?: Person[];
  /** Tighter chart for embedding in tighter spaces (Expenses page side cards). */
  height?: number;
  /** When true, omits the title and chrome so it fits inside another card. */
  embedded?: boolean;
}

/**
 * Total household assets across the projection. Visualises the accumulation
 * peak and the drawdown slope. Vertical reference markers mark each person's
 * retirement year so users see where the curve turns.
 */
export function SavingsBurndownChart({
  years,
  people = [],
  height = 280,
  embedded = false,
}: Props) {
  const data = useMemo(
    () =>
      years.map((y) => ({
        year: y.year,
        assets: y.totalHouseholdAssets,
      })),
    [years]
  );

  // Retirement-year markers from people's DOB + retirementAge. Sorted by year
  // and assigned a `lane` so labels for close-together retirements stack
  // vertically instead of overlapping at the top of the chart.
  const markers = useMemo(() => {
    const raw = people
      .map((p) => {
        if (!p.dateOfBirth || typeof p.retirementAge !== "number") return null;
        const birthYear = new Date(p.dateOfBirth).getFullYear();
        return {
          year: birthYear + p.retirementAge,
          // Short label keeps the top of the chart legible. Age in parens
          // gives the absolute retirement age without "retires" repetition.
          label: `${p.firstName} (${p.retirementAge})`,
        };
      })
      .filter((m): m is { year: number; label: string } => m !== null)
      .sort((a, b) => a.year - b.year);

    // Assign each marker a vertical lane: 0 for the first, increment whenever
    // the previous marker is within `CLUSTER_WINDOW` years.
    const CLUSTER_WINDOW = 3;
    let lane = 0;
    let lastYear = -Infinity;
    return raw.map((m) => {
      if (m.year - lastYear <= CLUSTER_WINDOW) lane += 1;
      else lane = 0;
      lastYear = m.year;
      return { ...m, lane };
    });
  }, [people]);

  // Top margin scales with how many lanes we'll need so labels don't clip.
  const maxLane = markers.reduce((m, x) => Math.max(m, x.lane), 0);
  const topMargin = 28 + maxLane * 14;

  const peak = data.reduce((max, d) => Math.max(max, d.assets), 0);
  const final = data.at(-1)?.assets ?? 0;

  const body = (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: topMargin, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="burndownFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="year"
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={{ stroke: "var(--border)" }}
        />
        <YAxis
          tickFormatter={(v) => `£${Math.round(v / 1000)}k`}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          width={60}
        />
        <Tooltip
          formatter={(value) => fmt(typeof value === "number" ? value : Number(value) || 0)}
          labelFormatter={(label) => `Year ${label}`}
          contentStyle={{
            borderRadius: 8,
            border: "1px solid var(--border)",
            fontSize: 12,
            background: "var(--card)",
          }}
        />
        <Area
          type="monotone"
          dataKey="assets"
          stroke="none"
          fill="url(#burndownFill)"
          isAnimationActive
        />
        <Line
          type="monotone"
          dataKey="assets"
          stroke="var(--primary)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
          isAnimationActive
        />
        {markers.map((m) => (
          <ReferenceLine
            key={`${m.year}-${m.label}`}
            x={m.year}
            stroke="var(--muted-foreground)"
            strokeDasharray="3 3"
            label={{
              value: m.label,
              position: "top",
              // Pull each lane upward so close-together markers stack instead
              // of overlapping at the same Y. Lane 0 sits closest to the chart.
              dy: -m.lane * 14,
              fill: "var(--muted-foreground)",
              fontSize: 10,
            }}
          />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );

  if (embedded) return body;

  return (
    <section className="rounded-lg border bg-card p-5 text-card-foreground">
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <h3 className="text-base font-semibold">Wealth projection</h3>
          <p className="text-xs text-muted-foreground">
            Household assets over the projection horizon.
          </p>
        </div>
        <div className="flex items-baseline gap-4 text-xs">
          <div>
            <span className="text-muted-foreground">Peak </span>
            <span className="font-medium">{fmt(peak)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">End </span>
            <span className="font-medium">{fmt(final)}</span>
          </div>
        </div>
      </div>
      {body}
    </section>
  );
}
