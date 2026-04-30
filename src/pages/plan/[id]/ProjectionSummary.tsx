import type { HouseholdYearState } from "@/services/engine/types";
import { fmt } from "./utils";

interface ProjectionSummaryProps {
  years: HouseholdYearState[];
  startYear: number;
  endYear: number;
}

export function ProjectionSummary({ years, startYear, endYear }: ProjectionSummaryProps) {
  const allSustainable = years.every((y) => y.canSustainSpending);
  const firstUnsustainable = years.find((y) => !y.canSustainSpending);
  const lastYear = years.at(-1);
  const totalTax = years.reduce((sum, y) => sum + y.totalHouseholdTax, 0);
  const totalWithdrawals = years.reduce((sum, y) => sum + y.totalHouseholdWithdrawals, 0);

  return (
    <section className="rounded-lg border bg-card p-5 text-card-foreground">
      <h3 className="mb-1 text-lg font-semibold">Projection Summary</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        {startYear}–{endYear} · {years.length} years
      </p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <p className="text-xs text-muted-foreground">Sustainability</p>
          {allSustainable ? (
            <p className="mt-1 font-semibold text-green-600 dark:text-green-400">
              All years funded
            </p>
          ) : (
            <p className="mt-1 font-semibold text-red-600 dark:text-red-400">
              Shortfall from {firstUnsustainable?.year}
            </p>
          )}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Assets at end</p>
          <p className="mt-1 font-semibold">
            {lastYear ? fmt(lastYear.totalHouseholdAssets) : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Estimated total tax</p>
          <p className="mt-1 font-semibold">{fmt(totalTax)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total drawdown</p>
          <p className="mt-1 font-semibold">{fmt(totalWithdrawals)}</p>
        </div>
      </div>
    </section>
  );
}
