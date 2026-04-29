/**
 * Unit Tests for Withdrawal Strategy Module (P3-T3)
 */

import { describe, expect, it } from "vitest";
import {
    AccountBalance,
    analyzeBridgeYear,
    calculateBridgeYears,
    calculateWithdrawal,
    executeWithdrawalSequence,
    generateBridgeYearPlan,
    getDefaultWithdrawalStrategy,
} from "./withdrawal-strategy";

describe("Withdrawal Strategy Module (P3-T3)", () => {
  describe("getDefaultWithdrawalStrategy", () => {
    it("returns UK-optimized strategy", () => {
      const strategy = getDefaultWithdrawalStrategy();
      expect(strategy.priority).toEqual(["cash", "isa", "sipp", "other"]);
      expect(strategy.maximizeISATaxFree).toBe(true);
      expect(strategy.useSippTaxFreeAllowance).toBe(true);
      expect(strategy.sippTaxFreePercentageUsed).toBe(0.25);
    });
  });

  describe("calculateBridgeYears", () => {
    it("calculates bridge years between retirement and State Pension", () => {
      expect(calculateBridgeYears(60, 67)).toBe(7); // DB pension at 60, SP at 67
      expect(calculateBridgeYears(65, 67)).toBe(2);
      expect(calculateBridgeYears(67, 67)).toBe(0); // No bridge
    });

    it("returns zero if retired after State Pension age", () => {
      expect(calculateBridgeYears(70, 67)).toBe(0);
    });
  });

  describe("calculateWithdrawal", () => {
    it("handles ISA withdrawals (tax-free)", () => {
      const account: AccountBalance = {
        accountId: 1,
        type: "isa",
        balance: 100000,
      };

      const result = calculateWithdrawal(account, 50000, 0);
      expect(result.amountWithdrawn).toBe(50000);
      expect(result.taxFreeAmount).toBe(50000);
      expect(result.taxableAmount).toBe(0);
    });

    it("handles SIPP withdrawals (25% tax-free + taxable)", () => {
      const account: AccountBalance = {
        accountId: 2,
        type: "sipp",
        balance: 200000,
      };

      const result = calculateWithdrawal(account, 40000, 10000); // 25% allowance
      expect(result.amountWithdrawn).toBe(40000);
      expect(result.taxFreeAmount).toBeLessThanOrEqual(10000);
      expect(result.taxableAmount).toBeGreaterThan(0);
    });

    it("handles cash withdrawals (all taxable)", () => {
      const account: AccountBalance = {
        accountId: 3,
        type: "cash",
        balance: 50000,
      };

      const result = calculateWithdrawal(account, 25000, 0);
      expect(result.amountWithdrawn).toBe(25000);
      expect(result.taxableAmount).toBe(25000);
      expect(result.taxFreeAmount).toBe(0);
    });

    it("respects account balance limits", () => {
      const account: AccountBalance = {
        accountId: 1,
        type: "isa",
        balance: 30000,
      };

      const result = calculateWithdrawal(account, 50000, 0);
      expect(result.amountWithdrawn).toBe(30000); // Limited by balance
    });
  });

  describe("executeWithdrawalSequence", () => {
    it("withdraws in priority order", () => {
      const accounts: AccountBalance[] = [
        { accountId: 1, type: "cash", balance: 30000 },
        { accountId: 2, type: "isa", balance: 50000 },
        { accountId: 3, type: "sipp", balance: 100000 },
      ];

      const strategy = getDefaultWithdrawalStrategy();
      const results = executeWithdrawalSequence(accounts, 80000, strategy, 0);

      // Should withdraw: 30k cash + 50k ISA (first 80k needed)
      expect(results[0].accountType).toBe("cash");
      expect(results[1].accountType).toBe("isa");
    });

    it("prioritizes tax-efficient sources", () => {
      const accounts: AccountBalance[] = [
        { accountId: 1, type: "cash", balance: 100000 },
        { accountId: 2, type: "isa", balance: 100000 },
      ];

      const strategy = getDefaultWithdrawalStrategy();
      const results = executeWithdrawalSequence(accounts, 50000, strategy, 0);

      // Should take from cash first per default strategy
      expect(results[0].accountType).toBe("cash");
    });

    it("returns results with tax implications", () => {
      const accounts: AccountBalance[] = [
        { accountId: 1, type: "isa", balance: 30000 },
        { accountId: 2, type: "cash", balance: 50000 },
      ];

      const strategy = getDefaultWithdrawalStrategy();
      const results = executeWithdrawalSequence(accounts, 50000, strategy, 0);

      for (const result of results) {
        expect(result.amountWithdrawn).toBeGreaterThanOrEqual(0);
        expect(result.taxableAmount + result.taxFreeAmount).toBe(result.amountWithdrawn);
      }
    });
  });

  describe("analyzeBridgeYear", () => {
    it("identifies bridge years correctly", () => {
      // Age 60-67, retired at 65, State Pension at 67
      const analysis = analyzeBridgeYear(65, 65, 67, 10000, 40000, new Map([["isa", 50000]]));
      expect(analysis.isBridgeYear).toBe(true);
      expect(analysis.yearsUntilStatePension).toBe(2);
    });

    it("identifies non-bridge years", () => {
      const beforeRetirement = analyzeBridgeYear(60, 65, 67, 0, 40000, new Map());
      expect(beforeRetirement.isBridgeYear).toBe(false);

      const afterStatePension = analyzeBridgeYear(70, 65, 67, 15000, 40000, new Map());
      expect(afterStatePension.isBridgeYear).toBe(false);
    });

    it("calculates income gap", () => {
      const analysis = analyzeBridgeYear(66, 65, 67, 10000, 40000, new Map([["isa", 50000]]));
      expect(analysis.incomeGap).toBe(30000); // 40k - 10k
    });

    it("recommends ISA withdrawal when sufficient", () => {
      const analysis = analyzeBridgeYear(66, 65, 67, 10000, 40000, new Map([["isa", 50000]]));
      expect(analysis.recommendedWithdrawalSources).toContain("isa");
      expect(analysis.recommendedWithdrawalSources).not.toContain("cash");
    });

    it("recommends mixed sources when ISA insufficient", () => {
      const analysis = analyzeBridgeYear(66, 65, 67, 10000, 50000, new Map([["isa", 20000]]));
      expect(analysis.recommendedWithdrawalSources).toContain("isa");
      expect(analysis.recommendedWithdrawalSources).toContain("cash");
    });
  });

  describe("generateBridgeYearPlan", () => {
    it("generates multi-year bridge plan", () => {
      const gaps = [20000, 25000, 30000]; // 3 years of income gaps
      const plan = generateBridgeYearPlan(60, 65, 68, gaps, 50000);

      expect(plan.years).toHaveLength(3);
      expect(plan.startAge).toBe(60);
      expect(plan.endAge).toBe(62);
    });

    it("calculates total withdrawal need", () => {
      const gaps = [20000, 20000, 20000];
      const plan = generateBridgeYearPlan(60, 65, 68, gaps, 100000);
      expect(plan.totalWithdrawalNeed).toBe(60000);
    });

    it("tracks ISA usage across years", () => {
      const gaps = [30000, 30000]; // 2 years, 60k total
      const plan = generateBridgeYearPlan(60, 65, 67, gaps, 50000);

      // Should use 50k from ISA in first year(s), then taxable
      let totalISAUsed = 0;
      for (const year of plan.years) {
        if (year.preferredSources.includes("isa")) {
          totalISAUsed += year.incomeGap - year.taxableWithdrawalNeeded;
        }
      }

      expect(totalISAUsed).toBeLessThanOrEqual(50000);
    });

    it("identifies bridge vs non-bridge years", () => {
      const gaps = [30000, 30000, 0];
      const plan = generateBridgeYearPlan(60, 65, 67, gaps, 50000);

      expect(plan.years[0].note).toContain("Bridge year");
      expect(plan.years[1].note).toContain("Bridge year");
      expect(plan.years[2].note).not.toContain("Bridge year");
    });
  });
});
