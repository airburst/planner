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

  // Compute retirement-year markers from people's DOB + retirementAge.
  const markers = useMemo(() => {
    return people
      .map((p) => {
        if (!p.dateOfBirth || typeof p.retirementAge !== "number") return null;
        const birthYear = new Date(p.dateOfBirth).getFullYear();
        return { year: birthYear + p.retirementAge, label: `${p.firstName} retires` };
      })
      .filter((m): m is { year: number; label: string } => m !== null);
  }, [people]);

  const peak = data.reduce((max, d) => Math.max(max, d.assets), 0);
  const final = data.at(-1)?.assets ?? 0;

  const body = (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
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
