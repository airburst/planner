import { Button } from "@/components/ui/button";
import type { HouseholdYearState } from "@/services/engine/types";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
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
type PanelMode = "details" | "year";

interface IncomeRow {
  year: number;
  total: number;
  [key: string]: number;
}

interface ActivationEvent {
  streamId: number;
  year: number;
  label: string;
  color: string;
}

interface HoverSummary {
  year: number;
  total: number;
}

const CHART_COLORS = [
  "#2563eb",
  "#0891b2",
  "#16a34a",
  "#ca8a04",
  "#dc2626",
  "#9333ea",
  "#0f766e",
  "#b45309",
];

export function IncomePhaseChart({ years, incomeStreams }: IncomePhaseChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("stacked");
  const [panelMode, setPanelMode] = useState<PanelMode>("details");
  const [dimmedStreamIds, setDimmedStreamIds] = useState<Set<number>>(new Set());
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [hoverSummary, setHoverSummary] = useState<HoverSummary | null>(null);

  const streamMeta = new Map<number, { label: string; color: string }>();

  incomeStreams.forEach((stream, index) => {
    const label = stream.name?.trim() || `Stream ${stream.id}`;
    streamMeta.set(stream.id, {
      label,
      color: CHART_COLORS[index % CHART_COLORS.length],
    });
  });

  const usedStreamIds = new Set<number>();
  const data = years.map((year) => {
    const row: IncomeRow = { year: year.year, total: 0 };

    year.people.forEach((personYear) => {
      personYear.incomeByStream.forEach((amount, streamId) => {
        const key = `stream_${streamId}`;
        row[key] = (row[key] ?? 0) + amount;
        row.total += amount;
        if (amount > 0) {
          usedStreamIds.add(streamId);
        }
      });
    });

    return row;
  });

  const streamIds = Array.from(usedStreamIds).sort((a, b) => a - b);
  const activeStreamIds = streamIds;

  const activationEvents = useMemo<ActivationEvent[]>(() => {
    const events = streamIds
      .map((streamId) => {
        const stream = incomeStreams.find((item) => item.id === streamId);
        if (!stream) {
          return null;
        }

        const activationYear = years.find((yearState, index) => {
          const person = yearState.people.get(stream.personId);
          if (!person) {
            return false;
          }

          if (person.age < stream.startAge) {
            return false;
          }

          if (index === 0) {
            return true;
          }

          const priorYear = years[index - 1];
          const priorPerson = priorYear.people.get(stream.personId);
          return !priorPerson || priorPerson.age < stream.startAge;
        });

        if (!activationYear) {
          return null;
        }

        const meta = streamMeta.get(streamId);
        return {
          streamId,
          year: activationYear.year,
          label: meta?.label || `Stream ${streamId}`,
          color: meta?.color || CHART_COLORS[0],
        };
      })
      .filter((event): event is ActivationEvent => Boolean(event));

    return events.sort((a, b) => a.year - b.year || a.streamId - b.streamId);
  }, [streamIds, incomeStreams, years, streamMeta]);

  const selectedEvent = useMemo(() => {
    if (activationEvents.length === 0) {
      return null;
    }
    if (selectedEventId === null) {
      return activationEvents[0];
    }
    return activationEvents.find((event) => event.streamId === selectedEventId) || activationEvents[0];
  }, [activationEvents, selectedEventId]);

  function toggleStream(streamId: number) {
    setDimmedStreamIds((prev) => {
      const next = new Set(prev);
      if (next.has(streamId)) {
        next.delete(streamId);
      } else {
        next.add(streamId);
      }
      return next;
    });
  }

  function resetEmphasis() {
    setDimmedStreamIds(new Set());
  }

  if (streamIds.length === 0) {
    return (
      <section className="rounded-lg border bg-card p-5 text-card-foreground">
        <h3 className="mb-1 text-lg font-semibold">Income Phase Visualisation</h3>
        <p className="text-sm text-muted-foreground">
          No active income streams were projected in the selected period.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border bg-card p-5 text-card-foreground shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="mb-1 text-lg font-semibold">Income Phase Visualisation</h3>
          <p className="text-sm text-muted-foreground">
            Layered annual income by stream across the projection timeline.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-background/60 p-1 shadow-sm">
          <Button size="sm" variant="outline" className="pointer-events-none px-2 text-xs">
            Cash Flow
          </Button>
          <Button
            size="sm"
            variant={panelMode === "details" ? "default" : "outline"}
            onClick={() => setPanelMode("details")}
          >
            Details
          </Button>
          <Button
            size="sm"
            variant={panelMode === "year" ? "default" : "outline"}
            onClick={() => setPanelMode("year")}
          >
            Year View
          </Button>
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

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {streamIds.map((streamId) => {
          const meta = streamMeta.get(streamId);
          const isDimmed = dimmedStreamIds.has(streamId);
          return (
            <button
              key={streamId}
              type="button"
              onClick={() => toggleStream(streamId)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors ${isDimmed
                ? "border-border text-muted-foreground"
                : "border-foreground/20 bg-muted/40 text-foreground"
                }`}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: meta?.color || CHART_COLORS[0] }}
              />
              <span>{meta?.label || `Stream ${streamId}`}</span>
            </button>
          );
        })}
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs"
          onClick={resetEmphasis}
          disabled={dimmedStreamIds.size === 0}
        >
          Reset emphasis
        </Button>
      </div>

      <div className="h-80 w-full rounded-md border bg-background/40 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            barCategoryGap={0}
            margin={{ top: 8, right: 16, left: 12, bottom: 0 }}
            onMouseMove={(state) => {
              if (state.isTooltipActive && state.activeLabel !== undefined) {
                const row = data.find((d) => d.year === state.activeLabel);
                if (row) setHoverSummary({ year: Number(state.activeLabel), total: row.total });
              } else {
                setHoverSummary(null);
              }
            }}
            onMouseLeave={() => setHoverSummary(null)}
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
                const streamId = Number(String(name ?? "").replace("stream_", ""));
                const meta = streamMeta.get(streamId);
                return [fmt(numericValue), meta?.label || `Stream ${streamId}`];
              }}
              labelFormatter={(label) => `Year ${label}`}
            />

            {activeStreamIds.map((streamId) => {
              const key = `stream_${streamId}`;
              const color = streamMeta.get(streamId)?.color || CHART_COLORS[0];
              const isDimmed = dimmedStreamIds.has(streamId);
              return (
                <Bar
                  key={key}
                  dataKey={key}
                  stackId={viewMode === "stacked" ? "income" : key}
                  fill={color}
                  fillOpacity={isDimmed ? 0.12 : 0.85}
                  isAnimationActive={false}
                />
              );
            })}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {panelMode === "year" && hoverSummary && (
        <div className="mt-3 rounded-md border bg-background/70 p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Year {hoverSummary.year}</p>
          <p className="mt-1 text-sm font-medium">Total projected income: {fmt(hoverSummary.total)}</p>
        </div>
      )}

      {activationEvents.length > 0 && (
        <div className="mt-4 rounded-md border bg-background/50 p-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Activation events
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {activationEvents.map((event) => {
              const isSelected = selectedEvent?.streamId === event.streamId;
              return (
                <button
                  key={`event-card-${event.streamId}`}
                  type="button"
                  onClick={() => setSelectedEventId(event.streamId)}
                  className={`rounded-md border px-3 py-2 text-left transition-colors ${isSelected
                    ? "border-foreground/30 bg-muted/60"
                    : "border-border bg-background/70 hover:bg-muted/40"
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: event.color }}
                    />
                    <p className="text-sm font-medium">{event.label}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Starts in {event.year}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        Click a stream label above to dim it. Click an event card to highlight that stream's activation year.
      </p>
    </section>
  );
}
