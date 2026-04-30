import { describe, expect, it } from "vitest";
import {
    defaultGoldenAssumptions,
    defaultGoldenWithdrawalStrategy,
    goldenProjectionFixtures,
} from "./fixtures/golden-projections";
import { runProjection } from "./index";

describe("Golden projection fixtures", () => {
  it("covers benchmark personas required by P5-T2", () => {
    expect(goldenProjectionFixtures.length).toBeGreaterThanOrEqual(3);
    expect(goldenProjectionFixtures.length).toBeLessThanOrEqual(5);
    expect(goldenProjectionFixtures.some((f) => f.id === "single-early-retiree-bridge")).toBe(true);
    expect(goldenProjectionFixtures.some((f) => f.id === "couple-db-plus-state")).toBe(true);
  });

  it.each(goldenProjectionFixtures)(
    "$id remains stable year-by-year",
    ({ people, accounts, incomeStreams, spending, startYear, endYear, expectedRows }) => {
      const years = runProjection(
        people,
        accounts,
        incomeStreams,
        defaultGoldenAssumptions,
        spending,
        defaultGoldenWithdrawalStrategy,
        startYear,
        endYear
      );

      const actualRows = years.map((year) => ({
        year: year.year,
        totalHouseholdIncome: year.totalHouseholdIncome,
        totalHouseholdTax: year.totalHouseholdTax,
        totalHouseholdAssets: year.totalHouseholdAssets,
      }));

      expect(actualRows).toEqual(expectedRows);
    }
  );
});
