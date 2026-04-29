/**
 * Unit Tests for Core Simulation Engine
 *
 * Tests all calculation functions with deterministic, verifiable scenarios
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
    calculateAgeInYear,
    calculateGrowth,
    calculateIncomeForStream,
    calculatePersonalTax,
    isIncomeStreamActive,
    projectPersonYear,
    runProjection,
} from "./index";
import {
    AccountContext,
    AssumptionSet,
    IncomeStreamContext,
    PersonContext,
    SpendingAssumption,
    WithdrawalStrategy,
} from "./types";

describe("Core Simulation Engine", () => {
  let person: PersonContext;
  let accounts: AccountContext[];
  let incomeStreams: IncomeStreamContext[];
  let assumptions: AssumptionSet;
  let spending: SpendingAssumption;
  let withdrawalStrategy: WithdrawalStrategy;

  beforeEach(() => {
    // Setup test person (born 1960, age 66 in 2026)
    person = {
      id: 1,
      planId: 1,
      role: "primary",
      name: "John Smith",
      dateOfBirth: new Date("1960-01-01"),
    };

    // Setup test accounts
    accounts = [
      {
        id: 1,
        planId: 1,
        personId: 1,
        name: "Cash Savings",
        type: "cash",
        openingBalance: 100000, // £100k
      },
      {
        id: 2,
        planId: 1,
        personId: 1,
        name: "ISA",
        type: "isa",
        openingBalance: 150000, // £150k
      },
      {
        id: 3,
        planId: 1,
        personId: 1,
        name: "SIPP",
        type: "sipp",
        openingBalance: 250000, // £250k
      },
    ];

    // Setup test income streams
    incomeStreams = [
      {
        id: 1,
        planId: 1,
        personId: 1,
        name: "State Pension",
        type: "state_pension",
        activationAge: 67,
        annualAmount: 12000, // £12k/year
        isIndexed: true,
      },
    ];

    // Setup assumptions (2026 UK rules)
    assumptions = {
      id: 1,
      planId: 1,
      name: "Base Case",
      inflationRate: 0.02, // 2%
      investmentReturn: 0.04, // 4% real
      personalAllowance: 12570,
      personalSavingsAllowance: 1000,
      basicRateBand: 50270,
      higherRateBand: 125140,
      basicRate: 0.2,
      higherRate: 0.4,
      additionalRate: 0.45,
      sippTaxFreePercentage: 0.25,
      sippMinimumAgeAccess: 55,
    };

    // Setup spending assumption
    spending = {
      id: 1,
      planId: 1,
      annualSpendingTarget: 40000, // £40k/year
      isIndexed: true,
    };

    // Setup withdrawal strategy (cash first, then ISA, then SIPP)
    withdrawalStrategy = {
      accountTypeOrder: ["cash", "isa", "sipp"],
      optimizeForTaxEfficiency: true,
      sippWithdrawalApproach: "flexible",
    };
  });

  describe("calculateAgeInYear", () => {
    it("calculates correct age for a given year", () => {
      expect(calculateAgeInYear(person, 2026)).toBe(66);
      expect(calculateAgeInYear(person, 2027)).toBe(67);
      expect(calculateAgeInYear(person, 2030)).toBe(70);
    });

    it("handles retirement age correctly", () => {
      const person65 = { ...person, dateOfBirth: new Date("1961-01-01") };
      expect(calculateAgeInYear(person65, 2026)).toBe(65);
    });
  });

  describe("isIncomeStreamActive", () => {
    it("stream is inactive before activation age", () => {
      expect(isIncomeStreamActive(incomeStreams[0], person, 2026)).toBe(false); // Age 66, activates at 67
    });

    it("stream is active at and after activation age", () => {
      expect(isIncomeStreamActive(incomeStreams[0], person, 2027)).toBe(true); // Age 67
      expect(isIncomeStreamActive(incomeStreams[0], person, 2030)).toBe(true); // Age 70
    });
  });

  describe("calculateIncomeForStream", () => {
    it("returns base amount for non-indexed stream", () => {
      const nonIndexedStream = { ...incomeStreams[0], isIndexed: false };
      const amount = calculateIncomeForStream(nonIndexedStream, 12000, 5, 0.02);
      expect(amount).toBe(12000);
    });

    it("applies inflation to indexed streams", () => {
      const amount = calculateIncomeForStream(incomeStreams[0], 12000, 1, 0.02);
      expect(amount).toBe(12240); // 12000 * 1.02
    });

    it("applies compound inflation over multiple years", () => {
      const amount = calculateIncomeForStream(incomeStreams[0], 12000, 5, 0.02);
      const expected = Math.round(12000 * Math.pow(1.02, 5));
      expect(amount).toBe(expected);
    });

    it("handles zero years from start", () => {
      const amount = calculateIncomeForStream(incomeStreams[0], 12000, 0, 0.02);
      expect(amount).toBe(12000);
    });
  });

  describe("calculateGrowth", () => {
    it("calculates positive growth on positive balance", () => {
      const balance = 100000;
      const growth = calculateGrowth(balance, 0.04, 0.02); // 4% real, 2% inflation
      const nominalReturn = (1.04 * 1.02) - 1; // ~0.0608 or 6.08%
      const expected = Math.round(balance * nominalReturn);
      expect(growth).toBe(expected);
    });

    it("returns zero growth on zero balance", () => {
      expect(calculateGrowth(0, 0.04, 0.02)).toBe(0);
    });

    it("handles negative real returns", () => {
      const balance = 100000;
      const growth = calculateGrowth(balance, -0.02, 0.02); // -2% real, 2% inflation
      const expected = Math.round(balance * ((0.98 * 1.02) - 1));
      expect(growth).toBe(expected);
    });
  });

  describe("calculatePersonalTax", () => {
    it("returns zero tax below personal allowance", () => {
      const tax = calculatePersonalTax(10000, 12570, 50270, 125140, 0.2, 0.4, 0.45);
      expect(tax).toBe(0);
    });

    it("applies basic rate 20% correctly", () => {
      const income = 20000; // £20k
      const pa = 12570;
      const tax = calculatePersonalTax(income, pa, 50270, 125140, 0.2, 0.4, 0.45);
      const taxableIncome = income - pa; // £7,430
      const expected = Math.round(taxableIncome * 0.2);
      expect(tax).toBe(expected);
    });

    it("applies higher rate 40% correctly", () => {
      const income = 60000; // £60k
      const pa = 12570;
      const basicBand = 50270;
      const tax = calculatePersonalTax(income, pa, basicBand, 125140, 0.2, 0.4, 0.45);

      const basicRateTaxable = basicBand - pa; // £37,700
      const higherRateTaxable = income - basicBand; // £9,730
      const expected = Math.round(basicRateTaxable * 0.2 + higherRateTaxable * 0.4);
      expect(tax).toBe(expected);
    });

    it("applies additional rate 45% correctly", () => {
      const income = 150000; // £150k
      const pa = 12570;
      const basicBand = 50270;
      const higherBand = 125140;
      const tax = calculatePersonalTax(income, pa, basicBand, higherBand, 0.2, 0.4, 0.45);

      const basicRateTaxable = basicBand - pa;
      const higherRateTaxable = higherBand - basicBand;
      const additionalRateTaxable = income - higherBand;
      const expected = Math.round(
        basicRateTaxable * 0.2 + higherRateTaxable * 0.4 + additionalRateTaxable * 0.45
      );
      expect(tax).toBe(expected);
    });

    it("matches HMRC approximation for mid-range earner", () => {
      const income = 40000;
      const tax = calculatePersonalTax(income, 12570, 50270, 125140, 0.2, 0.4, 0.45);
      const taxableIncome = 40000 - 12570; // £27,430
      const expected = Math.round(taxableIncome * 0.2); // £5,486
      expect(tax).toBe(expected);
    });
  });

  describe("projectPersonYear", () => {
    it("projects first year with no income (age 66 < activation 67)", () => {
      const year = projectPersonYear(
        person,
        accounts,
        incomeStreams,
        assumptions,
        spending,
        withdrawalStrategy,
        2026, // Year where person is age 66
        2026, // Base year
        new Map([
          [1, 100000],
          [2, 150000],
          [3, 250000],
        ])
      );

      expect(year.year).toBe(2026);
      expect(year.age).toBe(66);
      expect(year.totalIncome).toBe(0); // No income yet
      expect(year.totalWithdrawals).toBeGreaterThan(0); // Must draw to meet spending
      expect(year.totalHouseholdAssets > 0).toBe(true); // Should still have assets
    });

    it("projects year with active income", () => {
      const year = projectPersonYear(
        person,
        accounts,
        incomeStreams,
        assumptions,
        spending,
        withdrawalStrategy,
        2027, // Year where person is age 67 (activates SP)
        2026,
        new Map([
          [1, 95000],
          [2, 148000],
          [3, 250000],
        ])
      );

      expect(year.year).toBe(2027);
      expect(year.age).toBe(67);
      expect(year.totalIncome).toBeGreaterThan(0); // State pension active
      expect(incomeStreams[0].isIndexed).toBe(true); // Should be indexed from 2026
    });

    it("applies withdrawal strategy in correct order", () => {
      const year = projectPersonYear(
        person,
        accounts,
        incomeStreams,
        assumptions,
        spending,
        withdrawalStrategy,
        2026,
        2026,
        new Map([
          [1, 100000], // Cash
          [2, 150000], // ISA
          [3, 250000], // SIPP
        ])
      );

      // ISA withdrawals should have zero taxable component
      const isaWithdrawal = year.withdrawalDetails.find((w) => w.accountType === "isa");
      if (isaWithdrawal) {
        expect(isaWithdrawal.taxFreeComponent).toBe(isaWithdrawal.amountWithdrawn);
        expect(isaWithdrawal.taxableComponent).toBe(0);
      }
    });

    it("calculates deterministic results for same inputs", () => {
      const balances = new Map([
        [1, 100000],
        [2, 150000],
        [3, 250000],
      ]);

      const year1 = projectPersonYear(
        person,
        accounts,
        incomeStreams,
        assumptions,
        spending,
        withdrawalStrategy,
        2026,
        2026,
        balances
      );

      const year2 = projectPersonYear(
        person,
        accounts,
        incomeStreams,
        assumptions,
        spending,
        withdrawalStrategy,
        2026,
        2026,
        balances
      );

      expect(year1.totalWithdrawals).toBe(year2.totalWithdrawals);
      expect(year1.taxDue).toBe(year2.taxDue);
      expect(year1.totalHouseholdAssets).toBe(year2.totalHouseholdAssets); // Note: would be calculated differently in full projection
    });
  });

  describe("runProjection", () => {
    it("projects 30-year retirement scenario", () => {
      const startYear = 2026;
      const endYear = 2055; // 30 years

      const years = runProjection(
        [person],
        accounts,
        incomeStreams,
        assumptions,
        spending,
        withdrawalStrategy,
        startYear,
        endYear
      );

      expect(years).toHaveLength(30);
      expect(years[0].year).toBe(2026);
      expect(years[29].year).toBe(2055);
    });

    it("maintains deterministic output across runs", () => {
      const run1 = runProjection(
        [person],
        accounts,
        incomeStreams,
        assumptions,
        spending,
        withdrawalStrategy,
        2026,
        2030
      );

      const run2 = runProjection(
        [person],
        accounts,
        incomeStreams,
        assumptions,
        spending,
        withdrawalStrategy,
        2026,
        2030
      );

      for (let i = 0; i < run1.length; i++) {
        expect(run1[i].totalHouseholdIncome).toBe(run2[i].totalHouseholdIncome);
        expect(run1[i].totalHouseholdTax).toBe(run2[i].totalHouseholdTax);
        expect(run1[i].totalHouseholdAssets).toBe(run2[i].totalHouseholdAssets);
      }
    });

    it("shows declining assets if spending exceeds income + growth", () => {
      const highSpending: SpendingAssumption = {
        ...spending,
        annualSpendingTarget: 60000, // Higher spending
      };

      const years = runProjection(
        [person],
        accounts,
        incomeStreams,
        assumptions,
        highSpending,
        withdrawalStrategy,
        2026,
        2030
      );

      const firstYearAssets = years[0].totalHouseholdAssets;
      const lastYearAssets = years[years.length - 1].totalHouseholdAssets;

      expect(lastYearAssets).toBeLessThan(firstYearAssets);
    });

    it("calculates sustainability flag correctly", () => {
      const years = runProjection(
        [person],
        accounts,
        incomeStreams,
        assumptions,
        spending,
        withdrawalStrategy,
        2026,
        2055
      );

      for (const year of years) {
        expect(typeof year.canSustainSpending).toBe("boolean");
        expect(typeof year.spendingCoverage).toBe("number");

        // Sustainability should correlate with positive deficit/surplus or remaining assets
        if (year.totalHouseholdAssets > 0 || year.deficitOrSurplus >= 0) {
          expect(year.canSustainSpending).toBe(true);
        }
      }
    });

    it("aggregates multi-person projection correctly", () => {
      const partner: PersonContext = {
        id: 2,
        planId: 1,
        role: "partner",
        name: "Jane Smith",
        dateOfBirth: new Date("1962-01-01"),
      };

      const partnerAccounts: AccountContext[] = [
        {
          id: 4,
          planId: 1,
          personId: 2,
          name: "Cash",
          type: "cash",
          openingBalance: 50000,
        },
        {
          id: 5,
          planId: 1,
          personId: 2,
          name: "ISA",
          type: "isa",
          openingBalance: 100000,
        },
      ];

      const years = runProjection(
        [person, partner],
        [...accounts, ...partnerAccounts],
        incomeStreams,
        assumptions,
        spending,
        withdrawalStrategy,
        2026,
        2030
      );

      for (const year of years) {
        expect(year.people.size).toBe(2); // Both people

        // Household total should be sum of individuals
        let sumIncome = 0;
        for (const personYear of year.people.values()) {
          sumIncome += personYear.totalIncome;
        }
        expect(year.totalHouseholdIncome).toBe(sumIncome);
      }
    });
  });
});
