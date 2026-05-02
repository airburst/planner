import type { HouseholdYearState } from "@/services/engine/types";
import { fmt } from "./utils";

type RetirementPotEntry = { pot: number; year: number; alreadyRetired: boolean };
type Person = { id: number; firstName: string };

interface ProjectionSummaryProps {
  years: HouseholdYearState[];
  startYear: number;
  endYear: number;
  retirementPotByPerson?: Record<number, RetirementPotEntry>;
  people?: Person[];
}

export function ProjectionSummary({
  years,
  startYear,
  endYear,
  retirementPotByPerson,
  people = [],
}: ProjectionSummaryProps) {
  const allSustainable = years.every((y) => y.canSustainSpending);
  const firstUnsustainable = years.find((y) => !y.canSustainSpending);
  const lastYear = years.at(-1);
  const totalTax = years.reduce((sum, y) => sum + y.totalHouseholdTax, 0);
  const totalWithdrawals = years.reduce((sum, y) => sum + y.totalHouseholdWithdrawals, 0);

  const potEntries = retirementPotByPerson
    ? Object.entries(retirementPotByPerson).map(([id, entry]) => ({
        personId: Number(id),
        ...entry,
      }))
    : [];
  const householdPot = potEntries.reduce((sum, e) => sum + e.pot, 0);
  const allRetired = potEntries.length > 0 && potEntries.every((e) => e.alreadyRetired);

  return (
    <section className="rounded-lg border bg-card p-5 text-card-foreground">
      <h3 className="mb-1 text-lg font-semibold">Projection Summary</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        {startYear}–{endYear} · {years.length} years
      </p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <p className="text-xs text-muted-foreground">
            {allRetired ? "Pot at start" : "Pot at retirement"}
          </p>
          {potEntries.length > 0 ? (
            <>
              <p className="mt-1 font-semibold">{fmt(householdPot)}</p>
              {potEntries.length > 1 && (
                <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                  {potEntries.map((e) => {
                    const name = people.find((p) => p.id === e.personId)?.firstName ?? `Person ${e.personId}`;
                    return (
                      <li key={e.personId}>
                        {name}: {fmt(e.pot)}
                        {!e.alreadyRetired && <span className="ml-1">({e.year})</span>}
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          ) : (
            <p className="mt-1 font-semibold">—</p>
          )}
        </div>
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
