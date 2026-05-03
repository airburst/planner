import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { fmt } from "./utils";

interface Account {
  id: number;
  name: string;
  wrapperType: string;
  currentBalance: number;
}

interface Props {
  accounts: Account[];
}

// Group accounts by wrapper type and sum balances. Matches the mockup's
// donut: a small ring of segments + a centred "Total" label.
const TYPE_LABELS: Record<string, string> = {
  sipp: "Pensions",
  isa: "ISAs",
  cash: "Cash",
  gia: "Investments",
  other: "Other",
};

const TYPE_COLOURS: Record<string, string> = {
  sipp: "var(--sw-primary, #0ea5a4)",
  isa: "#1e293b",
  cash: "#94a3b8",
  gia: "#cbd5e1",
  other: "#e2e8f0",
};

export function AssetAllocationCard({ accounts }: Props) {
  const totals = new Map<string, number>();
  for (const a of accounts) {
    if (a.currentBalance <= 0) continue;
    totals.set(a.wrapperType, (totals.get(a.wrapperType) ?? 0) + a.currentBalance);
  }
  const total = Array.from(totals.values()).reduce((s, v) => s + v, 0);
  const data = Array.from(totals.entries())
    .map(([type, value]) => ({
      type,
      label: TYPE_LABELS[type] ?? type,
      value,
      pct: total > 0 ? value / total : 0,
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <section className="rounded-lg border bg-card p-5 text-card-foreground">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold">Asset allocation</h3>
        {total > 0 && (
          <p className="text-xs text-muted-foreground">{fmt(total)} total</p>
        )}
      </div>

      {total === 0 ? (
        <p className="text-sm text-muted-foreground">
          No accounts yet. Add some on the Assets tab to see your allocation.
        </p>
      ) : (
        <div className="flex items-center gap-6">
          <div className="relative h-40 w-40 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={2}
                  startAngle={90}
                  endAngle={450}
                  stroke="none"
                >
                  {data.map((entry) => (
                    <Cell
                      key={entry.type}
                      fill={TYPE_COLOURS[entry.type] ?? "#cbd5e1"}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => fmt(typeof value === "number" ? value : Number(value) || 0)}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid var(--border, #e2e8f0)",
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</p>
              <p className="text-sm font-semibold">100%</p>
            </div>
          </div>
          <ul className="flex-1 space-y-1.5 text-sm">
            {data.map((d) => (
              <li key={d.type} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: TYPE_COLOURS[d.type] ?? "#cbd5e1" }}
                  />
                  <span>{d.label}</span>
                </span>
                <span className="text-muted-foreground">
                  {Math.round(d.pct * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
