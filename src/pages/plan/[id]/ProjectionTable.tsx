import type { HouseholdYearState } from "@/main/engine/types";
import { fmt, pct } from "./utils";

export function ProjectionTable({ years }: { years: HouseholdYearState[] }) {
  return (
    <section className="rounded-lg border bg-card text-card-foreground">
      <div className="border-b p-5">
        <h3 className="text-lg font-semibold">Year by Year</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <th className="px-4 py-2">Year</th>
              <th className="px-4 py-2 text-right">Income</th>
              <th className="px-4 py-2 text-right">Tax</th>
              <th className="px-4 py-2 text-right">Eff. rate</th>
              <th className="px-4 py-2 text-right">Drawdown</th>
              <th className="px-4 py-2 text-right">Assets</th>
              <th className="px-4 py-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {years.map((y) => (
              <tr
                key={y.year}
                className={
                  y.canSustainSpending
                    ? "border-b hover:bg-muted/20"
                    : "border-b bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/30"
                }
              >
                <td className="px-4 py-2 font-medium">{y.year}</td>
                <td className="px-4 py-2 text-right">{fmt(y.totalHouseholdIncome)}</td>
                <td className="px-4 py-2 text-right">{fmt(y.totalHouseholdTax)}</td>
                <td className="px-4 py-2 text-right text-muted-foreground">
                  {y.totalHouseholdIncome > 0
                    ? pct(y.totalHouseholdTax / y.totalHouseholdIncome)
                    : "—"}
                </td>
                <td className="px-4 py-2 text-right">{fmt(y.totalHouseholdWithdrawals)}</td>
                <td className="px-4 py-2 text-right">{fmt(y.totalHouseholdAssets)}</td>
                <td className="px-4 py-2 text-center">
                  {y.canSustainSpending ? (
                    <span className="text-green-600 dark:text-green-400">✓</span>
                  ) : (
                    <span className="text-red-600 dark:text-red-400">✗</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
