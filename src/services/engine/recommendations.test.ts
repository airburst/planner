import { describe, expect, it } from "vitest";

import { generateRecommendations } from "./recommendations";
import { HouseholdYearState, PersonTaxResult, PersonYearState } from "./types";

function createTaxBreakdown(overrides: Partial<PersonTaxResult> = {}): PersonTaxResult {
  return {
    personId: 1,
    year: 2026,
    tradingIncome: 0,
    investmentIncome: 0,
    pensionIncome: 0,
    sippWithdrawals: 0,
    totalIncome: 0,
    personalAllowance: 12570,
    taxableIncome: 0,
    basicRateTax: 0,
    higherRateTax: 0,
    additionalRateTax: 0,
    totalTax: 0,
    effectiveTaxRate: 0,
    ...overrides,
  };
}

function createPersonYearState(
  taxBreakdown: PersonTaxResult,
  overrides: Partial<PersonYearState> = {}
): PersonYearState {
  return {
    year: taxBreakdown.year,
    age: 66,
    openingBalances: new Map(),
    incomeByStream: new Map(),
    totalIncome: taxBreakdown.totalIncome,
    withdrawalsByAccount: new Map(),
    totalWithdrawals: 0,
    withdrawalDetails: [],
    incomeSubjectToTax: taxBreakdown.totalIncome,
    taxDue: taxBreakdown.totalTax,
    effectiveTaxRate: taxBreakdown.effectiveTaxRate,
    taxBreakdown,
    growthOnBalances: 0,
    inflationAdjustment: 0,
    closingBalances: new Map(),
    ...overrides,
  };
}

function createHouseholdYearState(overrides: Partial<HouseholdYearState> = {}): HouseholdYearState {
  const personTax = createTaxBreakdown();
  const personYear = createPersonYearState(personTax);

  return {
    year: 2026,
    people: new Map([[1, personYear]]),
    totalHouseholdIncome: personYear.totalIncome,
    totalHouseholdWithdrawals: personYear.totalWithdrawals,
    totalHouseholdGrowth: 0,
    totalHouseholdTax: personYear.taxDue,
    totalHouseholdAssets: 100000,
    taxBreakdown: {
      year: 2026,
      people: new Map([[1, personTax]]),
      totalTax: personTax.totalTax,
      effectiveRate: personTax.effectiveTaxRate,
    },
    canSustainSpending: true,
    deficitOrSurplus: 0,
    spendingCoverage: 1,
    ...overrides,
  };
}

describe("Recommendation Engine", () => {
  it("creates a high-priority spending recommendation for the first unsustainable year", () => {
    const recommendations = generateRecommendations(99, [
      createHouseholdYearState({ year: 2026, canSustainSpending: true }),
      createHouseholdYearState({ year: 2027, canSustainSpending: false, deficitOrSurplus: -5000 }),
    ]);

    const spendingRecommendation = recommendations.find((item) => item.category === "spending");
    expect(spendingRecommendation?.priority).toBe("high");
    expect(spendingRecommendation?.yearTriggered).toBe(2027);
  });

  it("creates a depletion recommendation when assets hit zero after previously being positive", () => {
    const recommendations = generateRecommendations(99, [
      createHouseholdYearState({ year: 2031, totalHouseholdAssets: 10000, canSustainSpending: true }),
      createHouseholdYearState({ year: 2032, totalHouseholdAssets: 0, canSustainSpending: false }),
    ]);

    const depletionRecommendation = recommendations.find((item) => item.title.includes("depletion"));
    expect(depletionRecommendation?.category).toBe("withdrawal");
    expect(depletionRecommendation?.priority).toBe("high");
  });

  it("creates a tax recommendation for personal allowance taper exposure", () => {
    const taperedTax = createTaxBreakdown({
      year: 2028,
      totalIncome: 110000,
      personalAllowance: 7570,
      totalTax: 33432,
      effectiveTaxRate: 33432 / 110000,
    });
    const recommendations = generateRecommendations(99, [
      createHouseholdYearState({
        year: 2028,
        people: new Map([[1, createPersonYearState(taperedTax)]]),
        taxBreakdown: {
          year: 2028,
          people: new Map([[1, taperedTax]]),
          totalTax: taperedTax.totalTax,
          effectiveRate: taperedTax.effectiveTaxRate,
        },
      }),
    ]);

    const taxRecommendation = recommendations.find((item) => item.category === "tax");
    expect(taxRecommendation?.yearTriggered).toBe(2028);
    expect(taxRecommendation?.priority).toBe("medium");
  });

  it("creates a withdrawal recommendation when taxable withdrawals appear", () => {
    const personTax = createTaxBreakdown({ year: 2030, totalIncome: 30000, totalTax: 3486, effectiveTaxRate: 3486 / 30000 });
    const personYear = createPersonYearState(personTax, {
      totalWithdrawals: 15000,
      withdrawalDetails: [
        {
          accountId: 1,
          accountType: "sipp",
          amountWithdrawn: 15000,
          taxableComponent: 12000,
          taxFreeComponent: 3000,
        },
      ],
    });
    const recommendations = generateRecommendations(99, [
      createHouseholdYearState({
        year: 2030,
        people: new Map([[1, personYear]]),
        totalHouseholdWithdrawals: 15000,
        taxBreakdown: {
          year: 2030,
          people: new Map([[1, personTax]]),
          totalTax: personTax.totalTax,
          effectiveRate: personTax.effectiveTaxRate,
        },
      }),
    ]);

    const withdrawalRecommendation = recommendations.find((item) => item.title.includes("withdrawal sequencing"));
    expect(withdrawalRecommendation?.category).toBe("withdrawal");
    expect(withdrawalRecommendation?.priority).toBe("medium");
  });

  it("returns deterministic recommendations for the same projection years", () => {
    const years = [
      createHouseholdYearState({ year: 2029, canSustainSpending: false, totalHouseholdAssets: 0 }),
    ];
    const firstRun = generateRecommendations(99, years);
    const secondRun = generateRecommendations(99, years);

    expect(secondRun).toEqual(firstRun);
  });

  it("does not create depletion recommendation when assets never become positive", () => {
    const recommendations = generateRecommendations(99, [
      createHouseholdYearState({ year: 2029, totalHouseholdAssets: 0, canSustainSpending: false }),
      createHouseholdYearState({ year: 2030, totalHouseholdAssets: 0, canSustainSpending: false }),
    ]);

    const depletionRecommendation = recommendations.find((item) => item.title.includes("depletion"));
    expect(depletionRecommendation).toBeUndefined();
  });

  it("produces no contradictory recommendations in a baseline healthy scenario", () => {
    const recommendations = generateRecommendations(99, [
      createHouseholdYearState({
        year: 2026,
        canSustainSpending: true,
        totalHouseholdAssets: 250000,
      }),
      createHouseholdYearState({
        year: 2027,
        canSustainSpending: true,
        totalHouseholdAssets: 260000,
      }),
    ]);

    expect(recommendations).toEqual([]);
    expect(recommendations.some((item) => item.title.toLowerCase().includes("reduce spending"))).toBe(false);
    expect(recommendations.some((item) => item.title.toLowerCase().includes("increase spending"))).toBe(false);
  });

  it("keeps priority ordering stable and all rationale fields populated in stressed scenario", () => {
    const taperedTax = createTaxBreakdown({
      year: 2031,
      totalIncome: 110000,
      personalAllowance: 7570,
      totalTax: 33432,
      effectiveTaxRate: 33432 / 110000,
    });

    const stressedYear = createHouseholdYearState({
      year: 2031,
      canSustainSpending: false,
      totalHouseholdAssets: 0,
      people: new Map([
        [
          1,
          createPersonYearState(taperedTax, {
            withdrawalDetails: [
              {
                accountId: 1,
                accountType: "sipp",
                amountWithdrawn: 12000,
                taxableComponent: 9000,
                taxFreeComponent: 3000,
              },
            ],
          }),
        ],
      ]),
      taxBreakdown: {
        year: 2031,
        people: new Map([[1, taperedTax]]),
        totalTax: taperedTax.totalTax,
        effectiveRate: taperedTax.effectiveTaxRate,
      },
    });

    const recommendations = generateRecommendations(99, [
      createHouseholdYearState({ year: 2030, totalHouseholdAssets: 50000, canSustainSpending: true }),
      stressedYear,
    ]);

    const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    for (let i = 1; i < recommendations.length; i++) {
      expect(priorityOrder[recommendations[i - 1].priority]).toBeLessThanOrEqual(
        priorityOrder[recommendations[i].priority]
      );
    }

    for (const recommendation of recommendations) {
      expect(recommendation.rationale.trim().length).toBeGreaterThan(0);
    }
  });

  it("does not emit depletion recommendation for income-only scenario with zero assets", () => {
    const incomeTax = createTaxBreakdown({
      year: 2035,
      totalIncome: 40000,
      totalTax: 5486,
      effectiveTaxRate: 5486 / 40000,
    });

    const recommendations = generateRecommendations(99, [
      createHouseholdYearState({
        year: 2035,
        totalHouseholdIncome: 40000,
        totalHouseholdAssets: 0,
        canSustainSpending: true,
        people: new Map([[1, createPersonYearState(incomeTax)]]),
        taxBreakdown: {
          year: 2035,
          people: new Map([[1, incomeTax]]),
          totalTax: incomeTax.totalTax,
          effectiveRate: incomeTax.effectiveTaxRate,
        },
      }),
    ]);

    expect(recommendations.find((item) => item.title.includes("depletion"))).toBeUndefined();
  });
});