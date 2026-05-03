/**
 * Unit Tests for Core Simulation Engine
 *
 * Tests all calculation functions with deterministic, verifiable scenarios
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  calculateAgeInYear,
  calculateGrowth,
  calculateHouseholdTaxResult,
  calculateIncomeForStream,
  calculatePersonalTax,
  calculatePersonTaxResult,
  findDepletionYear,
  findGapToTarget,
  findRetirementDeferralYears,
  findSafeAnnualSpend,
  isIncomeStreamActive,
  runMonteCarlo,
  runProjection,
} from "./index";
import {
  AccountContext,
  AssumptionSet,
  IncomeStreamContext,
  OneOffExpenseContext,
  OneOffIncomeContext,
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
      retirementYear: 2000,
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
        annualContribution: 0,
        employerContribution: 0,
      },
      {
        id: 2,
        planId: 1,
        personId: 1,
        name: "ISA",
        type: "isa",
        openingBalance: 150000, // £150k
        annualContribution: 0,
        employerContribution: 0,
      },
      {
        id: 3,
        planId: 1,
        personId: 1,
        name: "SIPP",
        type: "sipp",
        openingBalance: 250000, // £250k
        annualContribution: 0,
        employerContribution: 0,
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
      sippMinimumAgeAccess: 55, marriageAllowanceTransfer: 0,
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
      const higherRateTaxable = higherBand - basicRateTaxable;
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

    it("keeps the full personal allowance at exactly £100k", () => {
      const tax = calculatePersonalTax(100000, 12570, 50270, 125140, 0.2, 0.4, 0.45);
      const expected = Math.round(37700 * 0.2 + 49730 * 0.4);
      expect(tax).toBe(expected);
    });

    it("reduces personal allowance by £1 per £2 above £100k", () => {
      const tax = calculatePersonalTax(102000, 12570, 50270, 125140, 0.2, 0.4, 0.45);
      const expected = Math.round(37700 * 0.2 + 52730 * 0.4);
      expect(tax).toBe(expected);
    });

    it("creates an effective 60% marginal rate inside the tax trap bracket", () => {
      const tax105k = calculatePersonalTax(105000, 12570, 50270, 125140, 0.2, 0.4, 0.45);
      const tax107k = calculatePersonalTax(107000, 12570, 50270, 125140, 0.2, 0.4, 0.45);
      expect((tax107k - tax105k) / 2000).toBeCloseTo(0.6, 1);
    });

    it("reduces the personal allowance to zero at £125,140", () => {
      const tax = calculatePersonalTax(125140, 12570, 50270, 125140, 0.2, 0.4, 0.45);
      const expected = Math.round(37700 * 0.2 + (125140 - 37700) * 0.4);
      expect(tax).toBe(expected);
    });

    it("keeps personal allowance at zero above £125,140", () => {
      const tax = calculatePersonalTax(150000, 12570, 50270, 125140, 0.2, 0.4, 0.45);
      const expected = Math.round(37700 * 0.2 + (125140 - 37700) * 0.4 + (150000 - 125140) * 0.45);
      expect(tax).toBe(expected);
    });

    it("adds about £6k of extra tax between £100k and £110k", () => {
      const tax100k = calculatePersonalTax(100000, 12570, 50270, 125140, 0.2, 0.4, 0.45);
      const tax110k = calculatePersonalTax(110000, 12570, 50270, 125140, 0.2, 0.4, 0.45);
      expect(tax110k - tax100k).toBeCloseTo(6000, 0);
    });
  });

  describe("per-person tax pipeline", () => {
    it("builds a detailed person tax result from stream income and taxable SIPP withdrawals", () => {
      const taxResult = calculatePersonTaxResult(
        person.id,
        2027,
        [
          {
            id: 11,
            planId: 1,
            personId: person.id,
            name: "Salary",
            type: "salary",
            activationAge: 18,
            annualAmount: 30000,
            isIndexed: false,
          },
          {
            id: 12,
            planId: 1,
            personId: person.id,
            name: "DB Pension",
            type: "db_pension",
            activationAge: 60,
            annualAmount: 10000,
            isIndexed: false,
          },
        ],
        new Map([
          [11, 30000],
          [12, 10000],
        ]),
        [
          {
            accountType: "sipp",
            taxableComponent: 5000,
          },
        ],
        assumptions
      );

      expect(taxResult.tradingIncome).toBe(30000);
      expect(taxResult.pensionIncome).toBe(10000);
      expect(taxResult.sippWithdrawals).toBe(5000);
      expect(taxResult.totalIncome).toBe(45000);
      expect(taxResult.totalTax).toBe(calculatePersonalTax(45000, 12570, 50270, 125140, 0.2, 0.4, 0.45));
    });

    it("keeps partner-mode tax separate before summing household totals", () => {
      const primary: PersonContext = {
        id: 1,
        planId: 1,
        role: "primary",
        name: "Alex",
        dateOfBirth: new Date("1960-01-01"),
        retirementYear: 2000,
      };
      const secondary: PersonContext = {
        id: 2,
        planId: 1,
        role: "partner",
        name: "Sam",
        dateOfBirth: new Date("1962-01-01"),
        retirementYear: 2000,
      };
      const salaryStreams: IncomeStreamContext[] = [
        {
          id: 21,
          planId: 1,
          personId: 1,
          name: "Primary Salary",
          type: "salary",
          activationAge: 18,
          annualAmount: 10000,
          isIndexed: false,
        },
        {
          id: 22,
          planId: 1,
          personId: 2,
          name: "Partner Salary",
          type: "salary",
          activationAge: 18,
          annualAmount: 80000,
          isIndexed: false,
        },
      ];
      const zeroSpending: SpendingAssumption = {
        ...spending,
        annualSpendingTarget: 0,
        isIndexed: false,
      };

      const [year] = runProjection(
        [primary, secondary],
        [],
        salaryStreams,
        assumptions,
        zeroSpending,
        withdrawalStrategy,
        2026,
        2026
      );

      const primaryTax = year.taxBreakdown.people.get(primary.id);
      const secondaryTax = year.taxBreakdown.people.get(secondary.id);
      expect(primaryTax?.totalTax).toBe(0);
      expect(secondaryTax?.totalTax).toBe(calculatePersonalTax(80000, 12570, 50270, 125140, 0.2, 0.4, 0.45));
      expect(year.taxBreakdown.totalTax).toBe((primaryTax?.totalTax || 0) + (secondaryTax?.totalTax || 0));

      const pooledTax = calculatePersonalTax(90000, 12570, 50270, 125140, 0.2, 0.4, 0.45);
      expect(year.taxBreakdown.totalTax).toBeLessThan(pooledTax);
    });

    it("aggregates household tax from person-year states", () => {
      const taxOne = calculatePersonTaxResult(
        1,
        2026,
        [],
        new Map(),
        [{ accountType: "sipp", taxableComponent: 20000 }],
        assumptions
      );
      const taxTwo = calculatePersonTaxResult(
        2,
        2026,
        [],
        new Map(),
        [{ accountType: "sipp", taxableComponent: 40000 }],
        assumptions
      );
      const household = calculateHouseholdTaxResult(
        2026,
        new Map([
          [1, { taxBreakdown: taxOne } as unknown as import("./types").PersonYearState],
          [2, { taxBreakdown: taxTwo } as unknown as import("./types").PersonYearState],
        ])
      );

      expect(household.totalTax).toBe(taxOne.totalTax + taxTwo.totalTax);
      expect(household.people.get(1)?.totalTax).toBe(taxOne.totalTax);
      expect(household.people.get(2)?.totalTax).toBe(taxTwo.totalTax);
    });
  });

  describe("single-person drawdown via runProjection", () => {
    it("projects first year with no income (age 66 < activation 67)", () => {
      const [householdYear] = runProjection(
        [{ ...person, retirementYear: 2025 }],
        accounts,
        incomeStreams,
        assumptions,
        spending,
        withdrawalStrategy,
        2026,
        2026
      );
      const year = householdYear.people.get(person.id)!;

      expect(year.year).toBe(2026);
      expect(year.age).toBe(66);
      expect(year.totalIncome).toBe(0); // SP activates at 67
      expect(year.totalWithdrawals).toBeGreaterThan(0); // Bridge year — must draw

      let totalClosing = 0;
      for (const balance of year.closingBalances.values()) {
        totalClosing += balance;
      }
      expect(totalClosing).toBeGreaterThan(0); // assets remain
    });

    it("projects year with active income", () => {
      const [householdYear] = runProjection(
        [{ ...person, retirementYear: 2025 }],
        accounts,
        incomeStreams,
        assumptions,
        spending,
        withdrawalStrategy,
        2027,
        2027
      );
      const year = householdYear.people.get(person.id)!;

      expect(year.year).toBe(2027);
      expect(year.age).toBe(67);
      expect(year.totalIncome).toBeGreaterThan(0); // State pension active
    });

    it("applies withdrawal strategy in correct order", () => {
      const [householdYear] = runProjection(
        [{ ...person, retirementYear: 2025 }],
        accounts,
        incomeStreams,
        assumptions,
        spending,
        withdrawalStrategy,
        2026,
        2026
      );
      const year = householdYear.people.get(person.id)!;

      // Strategy is cash → ISA → SIPP, so cash gets drawn first.
      const cashWithdrawal = year.withdrawalDetails.find((w) => w.accountType === "cash");
      expect(cashWithdrawal).toBeDefined();
      // ISA withdrawals are tax-free (no taxable component).
      const isaWithdrawal = year.withdrawalDetails.find((w) => w.accountType === "isa");
      if (isaWithdrawal) {
        expect(isaWithdrawal.taxFreeComponent).toBe(isaWithdrawal.amountWithdrawn);
        expect(isaWithdrawal.taxableComponent).toBe(0);
      }
    });

    it("calculates deterministic results for same inputs", () => {
      const run1 = runProjection(
        [{ ...person, retirementYear: 2025 }],
        accounts,
        incomeStreams,
        assumptions,
        spending,
        withdrawalStrategy,
        2026,
        2026
      );
      const run2 = runProjection(
        [{ ...person, retirementYear: 2025 }],
        accounts,
        incomeStreams,
        assumptions,
        spending,
        withdrawalStrategy,
        2026,
        2026
      );
      const year1 = run1[0].people.get(person.id)!;
      const year2 = run2[0].people.get(person.id)!;

      expect(year1.totalWithdrawals).toBe(year2.totalWithdrawals);
      expect(year1.taxDue).toBe(year2.taxDue);
      let total1 = 0;
      for (const balance of year1.closingBalances.values()) {
        total1 += balance;
      }
      let total2 = 0;
      for (const balance of year2.closingBalances.values()) {
        total2 += balance;
      }
      expect(total1).toBe(total2); // Deterministic closing balances
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
        retirementYear: 2000,
      };

      const partnerAccounts: AccountContext[] = [
        {
          id: 4,
          planId: 1,
          personId: 2,
          name: "Cash",
          type: "cash",
          openingBalance: 50000,
          annualContribution: 0,
          employerContribution: 0,
        },
        {
          id: 5,
          planId: 1,
          personId: 2,
          name: "ISA",
          type: "isa",
          openingBalance: 100000,
          annualContribution: 0,
          employerContribution: 0,
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

describe("Accumulation phase (ACC-T1)", () => {
  const baseAssumptions: AssumptionSet = {
    id: 1,
    planId: 1,
    name: "Base",
    inflationRate: 0.02,
    investmentReturn: 0.04,
    personalAllowance: 12570,
    personalSavingsAllowance: 1000,
    basicRateBand: 50270,
    higherRateBand: 125140,
    basicRate: 0.2,
    higherRate: 0.4,
    additionalRate: 0.45,
    sippTaxFreePercentage: 0.25,
    sippMinimumAgeAccess: 55, marriageAllowanceTransfer: 0,
  };

  const baseSpending: SpendingAssumption = {
    id: 1,
    planId: 1,
    annualSpendingTarget: 40000,
    isIndexed: true,
  };

  const baseStrategy: WithdrawalStrategy = {
    accountTypeOrder: ["cash", "isa", "sipp", "other"],
    optimizeForTaxEfficiency: true,
    sippWithdrawalApproach: "flexible",
  };

  it("does not withdraw from accounts during accumulation years", () => {
    const accumulator: PersonContext = {
      id: 1,
      planId: 1,
      role: "primary",
      name: "Pre-retiree",
      dateOfBirth: new Date("1980-01-01"),
      retirementYear: 2045,
    };
    const account: AccountContext = {
      id: 1,
      planId: 1,
      personId: 1,
      name: "SIPP",
      type: "sipp",
      openingBalance: 100000,
      annualContribution: 10000,
      employerContribution: 0,
    };

    const [hh] = runProjection(
      [accumulator],
      [account],
      [],
      baseAssumptions,
      baseSpending,
      baseStrategy,
      2026,
      2026
    );
    const year = hh.people.get(1)!;

    expect(year.totalWithdrawals).toBe(0);
    expect(year.withdrawalsByAccount.size).toBe(0);
    expect(year.withdrawalDetails).toHaveLength(0);
  });

  it("adds annual contribution to closing balance during accumulation", () => {
    const accumulator: PersonContext = {
      id: 1,
      planId: 1,
      role: "primary",
      name: "Pre-retiree",
      dateOfBirth: new Date("1980-01-01"),
      retirementYear: 2045,
    };
    const account: AccountContext = {
      id: 1,
      planId: 1,
      personId: 1,
      name: "SIPP",
      type: "sipp",
      openingBalance: 100000,
      annualContribution: 10000,
      employerContribution: 0,
    };

    const [hh] = runProjection(
      [accumulator],
      [account],
      [],
      baseAssumptions,
      baseSpending,
      baseStrategy,
      2026,
      2026
    );
    const year = hh.people.get(1)!;

    // closing = opening (100000) + growth on opening + contribution (10000)
    // growth = round(100000 * ((1.04 * 1.02) - 1)) = round(100000 * 0.0608) = 6080
    const expectedClosing = 100000 + 6080 + 10000;
    expect(year.closingBalances.get(1)).toBe(expectedClosing);
  });

  it("treats canSustainSpending as true during accumulation even with shortfall", () => {
    const accumulator: PersonContext = {
      id: 1,
      planId: 1,
      role: "primary",
      name: "Pre-retiree",
      dateOfBirth: new Date("1980-01-01"),
      retirementYear: 2045,
    };
    const account: AccountContext = {
      id: 1,
      planId: 1,
      personId: 1,
      name: "ISA",
      type: "isa",
      openingBalance: 50000,
      annualContribution: 5000,
      employerContribution: 0,
    };

    const years = runProjection(
      [accumulator],
      [account],
      [],
      baseAssumptions,
      baseSpending,
      baseStrategy,
      2026,
      2026
    );

    expect(years[0].canSustainSpending).toBe(true);
  });

  it("flips to drawdown in the retirement year boundary", () => {
    const person: PersonContext = {
      id: 1,
      planId: 1,
      role: "primary",
      name: "Boundary",
      dateOfBirth: new Date("1965-01-01"), // age 62 in 2027 — SIPP accessible
      retirementYear: 2027,
    };
    const account: AccountContext = {
      id: 1,
      planId: 1,
      personId: 1,
      name: "ISA",
      type: "isa", // ISA so age check doesn't gate drawdown
      openingBalance: 200000,
      annualContribution: 5000,
      employerContribution: 0,
    };

    const years = runProjection(
      [person],
      [account],
      [],
      baseAssumptions,
      baseSpending,
      baseStrategy,
      2026,
      2027
    );

    // 2026 is accumulation: no withdrawal, contribution applied
    expect(years[0].people.get(1)?.totalWithdrawals).toBe(0);
    // 2027 is retirementYear: drawdown begins, contribution NOT applied
    expect(years[1].people.get(1)?.totalWithdrawals).toBeGreaterThan(0);
  });

  it("still computes tax on income streams active during accumulation", () => {
    const earlyDbPerson: PersonContext = {
      id: 1,
      planId: 1,
      role: "primary",
      name: "DB",
      dateOfBirth: new Date("1970-01-01"),
      retirementYear: 2045, // retiring at 75 (unusual but makes the test clear)
    };
    const account: AccountContext = {
      id: 1,
      planId: 1,
      personId: 1,
      name: "ISA",
      type: "isa",
      openingBalance: 50000,
      annualContribution: 0,
      employerContribution: 0,
    };
    const dbStream: IncomeStreamContext = {
      id: 1,
      planId: 1,
      personId: 1,
      name: "Early DB",
      type: "db_pension",
      activationAge: 55, // active in 2026 when person is 56
      annualAmount: 30000,
      isIndexed: false,
    };

    const [hh] = runProjection(
      [earlyDbPerson],
      [account],
      [dbStream],
      baseAssumptions,
      baseSpending,
      baseStrategy,
      2026,
      2026
    );
    const year = hh.people.get(1)!;

    expect(year.totalIncome).toBe(30000);
    expect(year.taxDue).toBeGreaterThan(0); // £30k - £12,570 = £17,430 taxed at 20% ≈ £3,486
  });

  it("does not apply contribution in the year of retirement (drawdown)", () => {
    const person: PersonContext = {
      id: 1,
      planId: 1,
      role: "primary",
      name: "Boundary",
      dateOfBirth: new Date("1965-01-01"),
      retirementYear: 2026,
    };
    const account: AccountContext = {
      id: 1,
      planId: 1,
      personId: 1,
      name: "Cash",
      type: "cash",
      openingBalance: 100000,
      annualContribution: 9999, // should be ignored — it's a drawdown year
      employerContribution: 0,
    };

    const [hh] = runProjection(
      [person],
      [account],
      [],
      baseAssumptions,
      baseSpending,
      baseStrategy,
      2026,
      2026
    );
    const year = hh.people.get(1)!;

    // 2026 == retirementYear → drawdown. With £40k spending and no income, withdrawal kicks in.
    expect(year.totalWithdrawals).toBeGreaterThan(0);
    // Closing should NOT include the £9,999 contribution.
    expect(year.closingBalances.get(1)).toBeLessThan(100000);
  });

  it("accumulates employer contribution alongside personal contribution (ACC-T2)", () => {
    const person: PersonContext = {
      id: 1,
      planId: 1,
      role: "primary",
      name: "Employee",
      dateOfBirth: new Date("1980-01-01"),
      retirementYear: 2045,
    };
    const sipp: AccountContext = {
      id: 1,
      planId: 1,
      personId: 1,
      name: "SIPP",
      type: "sipp",
      openingBalance: 100000,
      annualContribution: 5000,
      employerContribution: 3000,
    };

    const [hh] = runProjection(
      [person],
      [sipp],
      [],
      baseAssumptions,
      baseSpending,
      baseStrategy,
      2026,
      2026
    );
    const year = hh.people.get(1)!;

    // closing = opening (100000) + growth (6080) + personal (5000) + employer (3000)
    expect(year.closingBalances.get(1)).toBe(100000 + 6080 + 5000 + 3000);
  });

  it("does not apply employer contribution after retirement", () => {
    const retiree: PersonContext = {
      id: 1,
      planId: 1,
      role: "primary",
      name: "Retiree",
      dateOfBirth: new Date("1965-01-01"),
      retirementYear: 2025, // already retired
    };
    const sipp: AccountContext = {
      id: 1,
      planId: 1,
      personId: 1,
      name: "SIPP",
      type: "sipp",
      openingBalance: 200000,
      annualContribution: 5000,
      employerContribution: 3000,
    };

    const [hh] = runProjection(
      [retiree],
      [sipp],
      [],
      baseAssumptions,
      baseSpending,
      baseStrategy,
      2026,
      2026
    );
    const year = hh.people.get(1)!;

    // Drawdown — no contribution should be added. Withdrawals reduce balance.
    expect(year.totalWithdrawals).toBeGreaterThan(0);
    expect(year.closingBalances.get(1)).toBeLessThan(200000);
  });
});

describe("Household-level drawdown", () => {
  const assumptions: AssumptionSet = {
    id: 1, planId: 1, name: "Base",
    inflationRate: 0, investmentReturn: 0,
    personalAllowance: 12570, personalSavingsAllowance: 1000,
    basicRateBand: 50270, higherRateBand: 125140,
    basicRate: 0.2, higherRate: 0.4, additionalRate: 0.45,
    sippTaxFreePercentage: 0.25, sippMinimumAgeAccess: 55, marriageAllowanceTransfer: 0,
  };
  const strategy: WithdrawalStrategy = {
    accountTypeOrder: ["cash", "isa", "sipp", "other"],
    optimizeForTaxEfficiency: true, sippWithdrawalApproach: "flexible",
  };
  const primary: PersonContext = {
    id: 1, planId: 1, role: "primary", name: "P",
    dateOfBirth: new Date("1960-01-01"), retirementYear: 2025,
  };
  const partner: PersonContext = {
    id: 2, planId: 1, role: "partner", name: "Q",
    dateOfBirth: new Date("1962-01-01"), retirementYear: 2025,
  };

  it("draws only the household deficit, not 2× when both partners retired", () => {
    // Each has £15k state pension → household income £30k. Spending £50k → deficit £20k.
    const streams: IncomeStreamContext[] = [
      { id: 1, planId: 1, personId: 1, name: "SP-1", type: "state_pension", activationAge: 60, annualAmount: 15000, isIndexed: false },
      { id: 2, planId: 1, personId: 2, name: "SP-2", type: "state_pension", activationAge: 60, annualAmount: 15000, isIndexed: false },
    ];
    const accounts: AccountContext[] = [
      { id: 10, planId: 1, personId: 1, name: "P-ISA", type: "isa", openingBalance: 100000, annualContribution: 0, employerContribution: 0 },
      { id: 11, planId: 1, personId: 2, name: "Q-ISA", type: "isa", openingBalance: 100000, annualContribution: 0, employerContribution: 0 },
    ];
    const spending: SpendingAssumption = { id: 1, planId: 1, annualSpendingTarget: 50000, isIndexed: false };

    const [year] = runProjection(
      [primary, partner], accounts, streams, assumptions, spending, strategy, 2026, 2026
    );

    expect(year.totalHouseholdIncome).toBe(30000);
    expect(year.totalHouseholdWithdrawals).toBe(20000); // not 40000
  });

  it("does not draw from accounts owned by a partner still in accumulation", () => {
    const accumulator: PersonContext = { ...partner, retirementYear: 2050 };
    const accounts: AccountContext[] = [
      { id: 10, planId: 1, personId: 1, name: "P-ISA", type: "isa", openingBalance: 100000, annualContribution: 0, employerContribution: 0 },
      { id: 11, planId: 1, personId: 2, name: "Q-SIPP", type: "sipp", openingBalance: 200000, annualContribution: 0, employerContribution: 0 },
    ];
    const spending: SpendingAssumption = { id: 1, planId: 1, annualSpendingTarget: 30000, isIndexed: false };

    const [year] = runProjection(
      [primary, accumulator], accounts, [], assumptions, spending, strategy, 2026, 2026
    );

    // Drawdown only from primary's ISA. Partner's SIPP must be untouched.
    const primaryYear = year.people.get(1);
    const partnerYear = year.people.get(2);
    expect(primaryYear?.totalWithdrawals).toBeGreaterThan(0);
    expect(partnerYear?.totalWithdrawals).toBe(0);
    expect(partnerYear?.closingBalances.get(11)).toBe(200000);
  });

  it("attributes SIPP withdrawal tax to the SIPP owner only", () => {
    // Person A draws from SIPP. Person B has no taxable income.
    // Each should keep their own £12,570 allowance.
    const accounts: AccountContext[] = [
      { id: 10, planId: 1, personId: 1, name: "P-SIPP", type: "sipp", openingBalance: 200000, annualContribution: 0, employerContribution: 0 },
    ];
    const spending: SpendingAssumption = { id: 1, planId: 1, annualSpendingTarget: 25000, isIndexed: false };

    const [year] = runProjection(
      [primary, partner], accounts, [], assumptions, spending, strategy, 2026, 2026
    );

    const primaryTax = year.taxBreakdown.people.get(1);
    const partnerTax = year.taxBreakdown.people.get(2);
    expect(partnerTax?.totalTax).toBe(0); // no income at all
    // Person A draws £25k from SIPP. 25% tax-free = £6,250. Taxable = £18,750. After PA = £6,180. Tax = £1,236.
    expect(primaryTax?.totalTax).toBe(Math.round((25000 - Math.round(25000 * 0.25) - 12570) * 0.2));
  });

  it("populates SIPP withdrawal taxFreeComponent (25%) and taxableComponent (75%)", () => {
    const accounts: AccountContext[] = [
      { id: 10, planId: 1, personId: 1, name: "SIPP", type: "sipp", openingBalance: 200000, annualContribution: 0, employerContribution: 0 },
    ];
    const spending: SpendingAssumption = { id: 1, planId: 1, annualSpendingTarget: 20000, isIndexed: false };

    const [year] = runProjection(
      [primary], accounts, [], assumptions, spending, strategy, 2026, 2026
    );

    const detail = year.people.get(1)?.withdrawalDetails.find((d) => d.accountType === "sipp");
    expect(detail).toBeDefined();
    expect(detail!.taxFreeComponent).toBe(Math.round(20000 * 0.25));
    expect(detail!.taxableComponent).toBe(20000 - Math.round(20000 * 0.25));
  });

  it("pro-rates pension income in the activation year by birth month", () => {
    // DOB 1969-12-31 → turns 60 on 2029-12-31. Whole months remaining after birth month = 0.
    const personDecBirth: PersonContext = {
      id: 1, planId: 1, role: "primary", name: "Late",
      dateOfBirth: new Date("1969-12-31"), retirementYear: 2025,
    };
    const dbStream: IncomeStreamContext = {
      id: 1, planId: 1, personId: 1, name: "DB", type: "db_pension",
      activationAge: 60, annualAmount: 24000, isIndexed: false,
    };
    const noInflation: AssumptionSet = { ...assumptions, inflationRate: 0 };

    const years = runProjection(
      [personDecBirth], [], [dbStream], noInflation,
      { id: 1, planId: 1, annualSpendingTarget: 0, isIndexed: false },
      strategy, 2029, 2030
    );

    // Activation year 2029: December birthday → 0/12 of year.
    expect(years[0].people.get(1)?.totalIncome).toBe(0);
    // Year after activation: full year.
    expect(years[1].people.get(1)?.totalIncome).toBe(24000);
  });

  it("pro-rates by 6/12 for a mid-year birthday in the activation year", () => {
    // DOB 1969-06-15 → June birth, 5 months whole remaining (Jul-Nov; Dec is the 6th).
    // Formula: (11 - birthMonth0Indexed) / 12 = (11 - 5) / 12 = 6/12.
    const personJune: PersonContext = {
      id: 1, planId: 1, role: "primary", name: "Mid",
      dateOfBirth: new Date("1969-06-15"), retirementYear: 2025,
    };
    const stream: IncomeStreamContext = {
      id: 1, planId: 1, personId: 1, name: "DB", type: "db_pension",
      activationAge: 60, annualAmount: 24000, isIndexed: false,
    };
    const noInflation: AssumptionSet = { ...assumptions, inflationRate: 0 };

    const [year] = runProjection(
      [personJune], [], [stream], noInflation,
      { id: 1, planId: 1, annualSpendingTarget: 0, isIndexed: false },
      strategy, 2029, 2029
    );

    // 6/12 of £24k = £12,000.
    expect(year.people.get(1)?.totalIncome).toBe(12000);
  });

  it("treats Dec-birth retirement year as full accumulation (no drawdown)", () => {
    // DOB 31 Dec → drawdown factor 0 in retirementYear; contributions ~11/12.
    const decBirth: PersonContext = {
      id: 1, planId: 1, role: "primary", name: "Late",
      dateOfBirth: new Date("1969-12-31"), retirementYear: 2032,
    };
    const sipp: AccountContext = {
      id: 1, planId: 1, personId: 1, name: "SIPP", type: "sipp",
      openingBalance: 200000, annualContribution: 12000, employerContribution: 0,
    };
    const noInflation: AssumptionSet = { ...assumptions, inflationRate: 0 };

    const [year] = runProjection(
      [decBirth], [sipp], [], noInflation,
      { id: 1, planId: 1, annualSpendingTarget: 50000, isIndexed: false },
      strategy, 2032, 2032
    );

    expect(year.totalHouseholdWithdrawals).toBe(0);
    // Contribution proportional to birth month (Dec → 11/12 worked).
    expect(year.people.get(1)?.closingBalances.get(1))
      .toBe(200000 + Math.round(12000 * 11 / 12));
  });

  it("pro-rates retirement year drawdown for mid-year birth", () => {
    // DOB 1 Jul → drawdown factor 5/12 (Aug-Dec).
    const julyBirth: PersonContext = {
      id: 1, planId: 1, role: "primary", name: "Mid",
      dateOfBirth: new Date("1969-07-01"), retirementYear: 2032,
    };
    const isa: AccountContext = {
      id: 1, planId: 1, personId: 1, name: "ISA", type: "isa",
      openingBalance: 200000, annualContribution: 0, employerContribution: 0,
    };
    const noInflation: AssumptionSet = { ...assumptions, inflationRate: 0 };

    const [year] = runProjection(
      [julyBirth], [isa], [], noInflation,
      { id: 1, planId: 1, annualSpendingTarget: 24000, isIndexed: false },
      strategy, 2032, 2032
    );

    // Expected drawdown = spending × (11-6)/12 = 24000 × 5/12 = 10000.
    expect(year.totalHouseholdWithdrawals).toBe(10000);
  });

  it("applies full drawdown if any person is fully past their retirement year", () => {
    // P retired in 2025 (full drawdown). Q retiring this year with Dec birth.
    // Household drawdown factor = max(1, 0) = 1 → full year.
    const fullyRetired: PersonContext = { ...primary, retirementYear: 2025 };
    const decBirthRetiring: PersonContext = {
      id: 2, planId: 1, role: "partner", name: "Q",
      dateOfBirth: new Date("1969-12-31"), retirementYear: 2032,
    };
    const accounts: AccountContext[] = [
      { id: 10, planId: 1, personId: 1, name: "P-ISA", type: "isa", openingBalance: 100000, annualContribution: 0, employerContribution: 0 },
      { id: 11, planId: 1, personId: 2, name: "Q-ISA", type: "isa", openingBalance: 100000, annualContribution: 0, employerContribution: 0 },
    ];

    const [year] = runProjection(
      [fullyRetired, decBirthRetiring], accounts, [], assumptions,
      { id: 1, planId: 1, annualSpendingTarget: 30000, isIndexed: false },
      strategy, 2032, 2032
    );

    // Full year drawdown because the primary is post-retirement.
    expect(year.totalHouseholdWithdrawals).toBe(30000);
  });

  it("deactivates an income stream after endAge with end-year pro-rata", () => {
    // DOB 1969-06-15. Salary endAge = 65 (year 2034). In 2034, salary should run
    // for whole months strictly before birth month = 5/12 (Jan-May).
    // Years before 2034: full salary. Year 2034: 5/12. Year 2035+: nothing.
    const earner: PersonContext = {
      id: 1, planId: 1, role: "primary", name: "Earner",
      dateOfBirth: new Date("1969-06-15"), retirementYear: 2034,
    };
    const salary: IncomeStreamContext = {
      id: 1, planId: 1, personId: 1, name: "Salary", type: "salary",
      activationAge: 18, annualAmount: 60000, isIndexed: false, endAge: 65,
    };
    const noInflation: AssumptionSet = { ...assumptions, inflationRate: 0 };

    const years = runProjection(
      [earner], [], [salary], noInflation,
      { id: 1, planId: 1, annualSpendingTarget: 0, isIndexed: false },
      strategy, 2033, 2035
    );

    // 2033 (age 64): full salary
    expect(years[0].people.get(1)?.totalIncome).toBe(60000);
    // 2034 (age 65, end year): 5/12 — the months Jan-May
    expect(years[1].people.get(1)?.totalIncome).toBe(Math.round(60000 * 5 / 12));
    // 2035 (age 66, post-end): no salary
    expect(years[2].people.get(1)?.totalIncome).toBe(0);
  });

  it("calculates tax separately per person — two allowances of £12,570", () => {
    // Each person has £20k taxable income. With separate allowances, each pays
    // (20000 - 12570) * 0.2 = £1,486. Combined = £2,972. NOT (40000 - 12570) * 0.2 = £5,486.
    const streams: IncomeStreamContext[] = [
      { id: 1, planId: 1, personId: 1, name: "P-Pension", type: "db_pension", activationAge: 60, annualAmount: 20000, isIndexed: false },
      { id: 2, planId: 1, personId: 2, name: "Q-Pension", type: "db_pension", activationAge: 60, annualAmount: 20000, isIndexed: false },
    ];
    const spending: SpendingAssumption = { id: 1, planId: 1, annualSpendingTarget: 0, isIndexed: false };

    const [year] = runProjection(
      [primary, partner], [], streams, assumptions, spending, strategy, 2026, 2026
    );

    const expectedPerPerson = Math.round((20000 - 12570) * 0.2);
    expect(year.taxBreakdown.people.get(1)?.totalTax).toBe(expectedPerPerson);
    expect(year.taxBreakdown.people.get(2)?.totalTax).toBe(expectedPerPerson);
    expect(year.totalHouseholdTax).toBe(2 * expectedPerPerson);
  });
});

describe("Gap-to-target (ACC-T6)", () => {
  const baseAssumptions: AssumptionSet = {
    id: 1, planId: 1, name: "Base",
    inflationRate: 0.025, investmentReturn: 0.025,
    personalAllowance: 12570, personalSavingsAllowance: 1000,
    basicRateBand: 50270, higherRateBand: 125140,
    basicRate: 0.2, higherRate: 0.4, additionalRate: 0.45,
    sippTaxFreePercentage: 0.25, sippMinimumAgeAccess: 55, marriageAllowanceTransfer: 0,
  };
  const baseStrategy: WithdrawalStrategy = {
    accountTypeOrder: ["cash", "isa", "sipp", "other"],
    optimizeForTaxEfficiency: true, sippWithdrawalApproach: "flexible",
  };

  it("returns 0 when plan is already sustainable", () => {
    const person: PersonContext = {
      id: 1, planId: 1, role: "primary", name: "Wealthy",
      dateOfBirth: new Date("1965-01-01"), retirementYear: 2026,
    };
    const accounts: AccountContext[] = [
      // £2M cash — clearly sustainable for any reasonable spend.
      { id: 1, planId: 1, personId: 1, name: "Cash", type: "cash",
        openingBalance: 2_000_000, annualContribution: 0, employerContribution: 0 },
    ];

    const result = findGapToTarget(
      [person], accounts, [], baseAssumptions,
      { id: 1, planId: 1, annualSpendingTarget: 30000, isIndexed: true },
      baseStrategy, 2026, 2056
    );

    expect(result.isSustainable).toBe(true);
    expect(result.additionalAnnualContribution).toBe(0);
  });

  it("returns a positive £/yr for an under-funded plan", () => {
    // £50k savings, no contributions, 10 years to retirement, £30k spend target.
    const person: PersonContext = {
      id: 1, planId: 1, role: "primary", name: "Under-funded",
      dateOfBirth: new Date("1971-01-01"), retirementYear: 2036,
    };
    const accounts: AccountContext[] = [
      { id: 1, planId: 1, personId: 1, name: "ISA", type: "isa",
        openingBalance: 50000, annualContribution: 0, employerContribution: 0 },
    ];
    const sp: IncomeStreamContext = {
      id: 1, planId: 1, personId: 1, name: "SP", type: "state_pension",
      activationAge: 67, annualAmount: 11000, isIndexed: true,
    };

    const result = findGapToTarget(
      [person], accounts, [sp], baseAssumptions,
      { id: 1, planId: 1, annualSpendingTarget: 30000, isIndexed: true },
      baseStrategy, 2026, 2056
    );

    expect(result.isSustainable).toBe(false);
    expect(result.additionalAnnualContribution).toBeGreaterThan(0);
    expect(result.yearsToRetirement).toBe(10);
  });

  it("recommended contribution actually makes the plan sustainable", () => {
    // Take a borderline plan, get the recommendation, apply it, verify sustainability.
    const person: PersonContext = {
      id: 1, planId: 1, role: "primary", name: "Borderline",
      dateOfBirth: new Date("1971-01-01"), retirementYear: 2036,
    };
    const accounts: AccountContext[] = [
      { id: 1, planId: 1, personId: 1, name: "ISA", type: "isa",
        openingBalance: 80000, annualContribution: 0, employerContribution: 0 },
    ];

    const result = findGapToTarget(
      [person], accounts, [], baseAssumptions,
      { id: 1, planId: 1, annualSpendingTarget: 25000, isIndexed: true },
      baseStrategy, 2026, 2056
    );
    expect(result.isSustainable).toBe(false);

    // Apply the recommendation and re-run.
    const augmented = accounts.map((a, i) =>
      i === 0 ? { ...a, annualContribution: result.additionalAnnualContribution } : a
    );
    const years = runProjection(
      [person], augmented, [], baseAssumptions,
      { id: 1, planId: 1, annualSpendingTarget: 25000, isIndexed: true },
      baseStrategy, 2026, 2056
    );
    expect(years.every((y) => y.canSustainSpending)).toBe(true);
  });

  it("returns yearsToRetirement = 0 if everyone is already retired", () => {
    const retiree: PersonContext = {
      id: 1, planId: 1, role: "primary", name: "Retiree",
      dateOfBirth: new Date("1955-01-01"), retirementYear: 2020,
    };
    const accounts: AccountContext[] = [
      { id: 1, planId: 1, personId: 1, name: "Cash", type: "cash",
        openingBalance: 100000, annualContribution: 0, employerContribution: 0 },
    ];

    const result = findGapToTarget(
      [retiree], accounts, [], baseAssumptions,
      { id: 1, planId: 1, annualSpendingTarget: 30000, isIndexed: true },
      baseStrategy, 2026, 2056
    );

    // No years left to add contributions → cannot recommend
    expect(result.yearsToRetirement).toBe(0);
    expect(result.additionalAnnualContribution).toBe(0);
  });
});

describe("One-off events (G2-T7, G2-T8)", () => {
  const baseAssumptions: AssumptionSet = {
    id: 1, planId: 1, name: "Base",
    inflationRate: 0, investmentReturn: 0,
    personalAllowance: 12570, personalSavingsAllowance: 1000,
    basicRateBand: 50270, higherRateBand: 125140,
    basicRate: 0.2, higherRate: 0.4, additionalRate: 0.45,
    sippTaxFreePercentage: 0.25, sippMinimumAgeAccess: 55, marriageAllowanceTransfer: 0,
  };
  const baseStrategy: WithdrawalStrategy = {
    accountTypeOrder: ["cash", "isa", "sipp", "other"],
    optimizeForTaxEfficiency: true, sippWithdrawalApproach: "flexible",
  };
  const retiree: PersonContext = {
    id: 1, planId: 1, role: "primary", name: "P",
    dateOfBirth: new Date("1960-01-01"), retirementYear: 2020,
  };

  it("non-taxable windfall reduces drawdown in that year only", () => {
    const accounts: AccountContext[] = [
      { id: 1, planId: 1, personId: 1, name: "ISA", type: "isa",
        openingBalance: 200000, annualContribution: 0, employerContribution: 0 },
    ];
    const windfall: OneOffIncomeContext = {
      id: 1, planId: 1, personId: 1, name: "Inheritance",
      year: 2027, amount: 30000, taxable: false,
    };
    const spending: SpendingAssumption = { id: 1, planId: 1, annualSpendingTarget: 40000, isIndexed: false };

    const baseline = runProjection(
      [retiree], accounts, [], baseAssumptions, spending, baseStrategy, 2026, 2028, [], []
    );
    const withWindfall = runProjection(
      [retiree], accounts, [], baseAssumptions, spending, baseStrategy, 2026, 2028, [windfall], []
    );

    // 2026 + 2028: same drawdown as baseline
    expect(withWindfall[0].totalHouseholdWithdrawals).toBe(baseline[0].totalHouseholdWithdrawals);
    expect(withWindfall[2].totalHouseholdWithdrawals).toBe(baseline[2].totalHouseholdWithdrawals);
    // 2027: drawdown is reduced by £30k (the windfall covers part of spending)
    expect(withWindfall[1].totalHouseholdWithdrawals).toBe(
      baseline[1].totalHouseholdWithdrawals - 30000
    );
  });

  it("taxable windfall is taxed at the recipient's marginal rate", () => {
    const accounts: AccountContext[] = [
      { id: 1, planId: 1, personId: 1, name: "ISA", type: "isa",
        openingBalance: 200000, annualContribution: 0, employerContribution: 0 },
    ];
    // Recipient has no other taxable income — full personal allowance available.
    const taxableBonus: OneOffIncomeContext = {
      id: 1, planId: 1, personId: 1, name: "Big bonus",
      year: 2027, amount: 30000, taxable: true,
    };
    const spending: SpendingAssumption = { id: 1, planId: 1, annualSpendingTarget: 0, isIndexed: false };

    const [, year2027] = runProjection(
      [retiree], accounts, [], baseAssumptions, spending, baseStrategy, 2026, 2027, [taxableBonus], []
    );

    // Tax on £30k - £12,570 = £17,430 × 20% = £3,486
    expect(year2027.totalHouseholdTax).toBe(Math.round((30000 - 12570) * 0.2));
  });

  it("one-off expense increases drawdown in that year only", () => {
    const accounts: AccountContext[] = [
      { id: 1, planId: 1, personId: 1, name: "ISA", type: "isa",
        openingBalance: 200000, annualContribution: 0, employerContribution: 0 },
    ];
    const newCar: OneOffExpenseContext = {
      id: 1, planId: 1, name: "New car", year: 2027, amount: 20000,
    };
    const spending: SpendingAssumption = { id: 1, planId: 1, annualSpendingTarget: 30000, isIndexed: false };

    const baseline = runProjection(
      [retiree], accounts, [], baseAssumptions, spending, baseStrategy, 2026, 2028, [], []
    );
    const withCar = runProjection(
      [retiree], accounts, [], baseAssumptions, spending, baseStrategy, 2026, 2028, [], [newCar]
    );

    // 2026 + 2028 unchanged
    expect(withCar[0].totalHouseholdWithdrawals).toBe(baseline[0].totalHouseholdWithdrawals);
    expect(withCar[2].totalHouseholdWithdrawals).toBe(baseline[2].totalHouseholdWithdrawals);
    // 2027: drawdown is £20k more (the car expense)
    expect(withCar[1].totalHouseholdWithdrawals).toBe(
      baseline[1].totalHouseholdWithdrawals + 20000
    );
  });

  it("findSafeAnnualSpend returns a number close to a known sustainable rate", () => {
    // £500k ISA, retired, no income streams, 30-year horizon. The sustainable
    // rate should be roughly the assets / years = £16,667/yr — give or take
    // growth and tax effects.
    const accounts: AccountContext[] = [
      { id: 1, planId: 1, personId: 1, name: "ISA", type: "isa",
        openingBalance: 500000, annualContribution: 0, employerContribution: 0 },
    ];

    const safeSpend = findSafeAnnualSpend(
      [retiree], accounts, [], baseAssumptions,
      { id: 1, planId: 1, annualSpendingTarget: 0, isIndexed: false },
      baseStrategy, 2026, 2055, [], []
    );

    // Should be > 0 and somewhere in a reasonable range for a £500k pot over 30 years.
    expect(safeSpend).toBeGreaterThan(10000);
    expect(safeSpend).toBeLessThan(40000);
  });

  it("findSafeAnnualSpend returns 0 if nothing is sustainable", () => {
    // No accounts, no income → nothing is sustainable in drawdown.
    const safeSpend = findSafeAnnualSpend(
      [retiree], [], [], baseAssumptions,
      { id: 1, planId: 1, annualSpendingTarget: 0, isIndexed: false },
      baseStrategy, 2026, 2030, [], []
    );
    expect(safeSpend).toBe(0);
  });

  it("credits unused one-off income to savings during accumulation", () => {
    // 45yo retiring at 65 (year 2046). Single ISA £100k, no contributions,
    // zero growth. £30k windfall in 2030 — fully accumulation year.
    // Expected: by 2046 retirement, pot = 100k + 30k = 130k.
    const accumulator: PersonContext = {
      id: 1, planId: 1, role: "primary", name: "Pre",
      dateOfBirth: new Date("1981-01-01"), retirementYear: 2046,
    };
    const isa: AccountContext = {
      id: 1, planId: 1, personId: 1, name: "ISA", type: "isa",
      openingBalance: 100000, annualContribution: 0, employerContribution: 0,
    };
    const windfall: OneOffIncomeContext = {
      id: 1, planId: 1, personId: 1, name: "Inheritance",
      year: 2030, amount: 30000, taxable: false,
    };
    const noGrowth: AssumptionSet = { ...baseAssumptions, inflationRate: 0, investmentReturn: 0 };

    const years = runProjection(
      [accumulator], [isa], [], noGrowth,
      { id: 1, planId: 1, annualSpendingTarget: 0, isIndexed: false },
      baseStrategy, 2026, 2046, [windfall], []
    );

    // Closing balance at the year before retirement should reflect the windfall.
    const lastAccumulationYear = years[years.length - 2]; // 2045
    expect(lastAccumulationYear.totalHouseholdAssets).toBe(130000);
  });

  it("credits only the unused portion of a one-off in a drawdown year", () => {
    // Retired person, £30k spending, no streams, £60k windfall.
    // Spending gap = 30k. Windfall covers it; surplus = 30k → ISA bumps by 30k.
    const retiree: PersonContext = {
      id: 1, planId: 1, role: "primary", name: "R",
      dateOfBirth: new Date("1955-01-01"), retirementYear: 2020,
    };
    const isa: AccountContext = {
      id: 1, planId: 1, personId: 1, name: "ISA", type: "isa",
      openingBalance: 100000, annualContribution: 0, employerContribution: 0,
    };
    const noGrowth: AssumptionSet = { ...baseAssumptions, inflationRate: 0, investmentReturn: 0 };
    const surplusWindfall: OneOffIncomeContext = {
      id: 1, planId: 1, personId: 1, name: "Big inheritance",
      year: 2026, amount: 60000, taxable: false,
    };

    const [year] = runProjection(
      [retiree], [isa], [], noGrowth,
      { id: 1, planId: 1, annualSpendingTarget: 30000, isIndexed: false },
      baseStrategy, 2026, 2026, [surplusWindfall], []
    );

    // Spending gap = 30k. Windfall = 60k. Used = 30k. Surplus = 30k.
    // ISA opening 100k → closing = 100k + 30k = 130k.
    expect(year.totalHouseholdAssets).toBe(130000);
    expect(year.totalHouseholdWithdrawals).toBe(0);
  });

  it("ignores one-off events outside the projection window", () => {
    const accounts: AccountContext[] = [
      { id: 1, planId: 1, personId: 1, name: "ISA", type: "isa",
        openingBalance: 200000, annualContribution: 0, employerContribution: 0 },
    ];
    const ancientWindfall: OneOffIncomeContext = {
      id: 1, planId: 1, personId: 1, name: "Old inheritance",
      year: 2010, amount: 999999, taxable: false,
    };
    const spending: SpendingAssumption = { id: 1, planId: 1, annualSpendingTarget: 40000, isIndexed: false };

    const baseline = runProjection(
      [retiree], accounts, [], baseAssumptions, spending, baseStrategy, 2026, 2028, [], []
    );
    const withOld = runProjection(
      [retiree], accounts, [], baseAssumptions, spending, baseStrategy, 2026, 2028, [ancientWindfall], []
    );

    // Old windfall has no effect on current projection
    for (let i = 0; i < baseline.length; i++) {
      expect(withOld[i].totalHouseholdWithdrawals).toBe(baseline[i].totalHouseholdWithdrawals);
    }
  });
});

describe("Marriage Allowance (G4-T3)", () => {
  const baseAssumptions: AssumptionSet = {
    id: 1, planId: 1, name: "Base",
    inflationRate: 0, investmentReturn: 0,
    personalAllowance: 12570, personalSavingsAllowance: 1000,
    basicRateBand: 50270, higherRateBand: 125140,
    basicRate: 0.2, higherRate: 0.4, additionalRate: 0.45,
    sippTaxFreePercentage: 0.25, sippMinimumAgeAccess: 55,
    marriageAllowanceTransfer: 1260,
  };
  const strategy: WithdrawalStrategy = {
    accountTypeOrder: ["cash", "isa", "sipp", "other"],
    optimizeForTaxEfficiency: true, sippWithdrawalApproach: "flexible",
  };

  it("transfers £1,260 PA from a non-taxpaying partner to a basic-rate spouse", () => {
    // Non-earning partner (£0 income), basic-rate primary (£25k DB pension).
    // Without MA: primary tax = (25000 - 12570) × 0.2 = £2,486
    // With MA: primary tax = (25000 - 13830) × 0.2 = £2,234. Saving = £252.
    const primary: PersonContext = {
      id: 1, planId: 1, role: "primary", name: "P",
      dateOfBirth: new Date("1960-01-01"), retirementYear: 2020,
    };
    const partner: PersonContext = {
      id: 2, planId: 1, role: "partner", name: "Q",
      dateOfBirth: new Date("1962-01-01"), retirementYear: 2020,
    };
    const streams: IncomeStreamContext[] = [
      { id: 1, planId: 1, personId: 1, name: "DB", type: "db_pension",
        activationAge: 60, annualAmount: 25000, isIndexed: false },
    ];
    const accounts: AccountContext[] = [
      { id: 10, planId: 1, personId: 1, name: "P-ISA", type: "isa",
        openingBalance: 200000, annualContribution: 0, employerContribution: 0 },
      { id: 11, planId: 1, personId: 2, name: "Q-ISA", type: "isa",
        openingBalance: 100000, annualContribution: 0, employerContribution: 0 },
    ];
    const spending: SpendingAssumption = {
      id: 1, planId: 1, annualSpendingTarget: 0, isIndexed: false,
    };

    const [year] = runProjection(
      [primary, partner], accounts, streams, baseAssumptions, spending, strategy, 2026, 2026
    );

    const expectedTaxWithoutMA = Math.round((25000 - 12570) * 0.2);
    const expectedTaxWithMA = Math.round((25000 - (12570 + 1260)) * 0.2);
    expect(year.totalHouseholdTax).toBe(expectedTaxWithMA);
    expect(year.totalHouseholdTax).toBeLessThan(expectedTaxWithoutMA);
  });

  it("does not apply MA if neither partner has unused allowance", () => {
    // Both primary and partner above PA — no MA.
    const a: PersonContext = {
      id: 1, planId: 1, role: "primary", name: "A",
      dateOfBirth: new Date("1960-01-01"), retirementYear: 2020,
    };
    const b: PersonContext = {
      id: 2, planId: 1, role: "partner", name: "B",
      dateOfBirth: new Date("1962-01-01"), retirementYear: 2020,
    };
    const streams: IncomeStreamContext[] = [
      { id: 1, planId: 1, personId: 1, name: "A-DB", type: "db_pension",
        activationAge: 60, annualAmount: 25000, isIndexed: false },
      { id: 2, planId: 1, personId: 2, name: "B-DB", type: "db_pension",
        activationAge: 60, annualAmount: 20000, isIndexed: false },
    ];
    const spending: SpendingAssumption = {
      id: 1, planId: 1, annualSpendingTarget: 0, isIndexed: false,
    };

    const [year] = runProjection(
      [a, b], [], streams, baseAssumptions, spending, strategy, 2026, 2026
    );

    const aTax = Math.round((25000 - 12570) * 0.2);
    const bTax = Math.round((20000 - 12570) * 0.2);
    expect(year.totalHouseholdTax).toBe(aTax + bTax);
  });

  it("does not apply MA if recipient is a higher-rate taxpayer", () => {
    // Primary is higher rate (£60k), partner is non-earner. MA isn't available.
    const primary: PersonContext = {
      id: 1, planId: 1, role: "primary", name: "P",
      dateOfBirth: new Date("1960-01-01"), retirementYear: 2020,
    };
    const partner: PersonContext = {
      id: 2, planId: 1, role: "partner", name: "Q",
      dateOfBirth: new Date("1962-01-01"), retirementYear: 2020,
    };
    const streams: IncomeStreamContext[] = [
      { id: 1, planId: 1, personId: 1, name: "DB", type: "db_pension",
        activationAge: 60, annualAmount: 60000, isIndexed: false },
    ];
    const spending: SpendingAssumption = {
      id: 1, planId: 1, annualSpendingTarget: 0, isIndexed: false,
    };

    const [year] = runProjection(
      [primary, partner], [], streams, baseAssumptions, spending, strategy, 2026, 2026
    );

    const expectedTax = Math.round((50270 - 12570) * 0.2 + (60000 - 50270) * 0.4);
    expect(year.totalHouseholdTax).toBe(expectedTax);
  });
});

describe("Spending periods (Sprint 8.5)", () => {
  const baseAssumptions: AssumptionSet = {
    id: 1, planId: 1, name: "Base",
    inflationRate: 0, investmentReturn: 0,
    personalAllowance: 12570, personalSavingsAllowance: 1000,
    basicRateBand: 50270, higherRateBand: 125140,
    basicRate: 0.2, higherRate: 0.4, additionalRate: 0.45,
    sippTaxFreePercentage: 0.25, sippMinimumAgeAccess: 55,
    marriageAllowanceTransfer: 0,
  };
  const strategy: WithdrawalStrategy = {
    accountTypeOrder: ["cash", "isa", "sipp", "other"],
    optimizeForTaxEfficiency: true, sippWithdrawalApproach: "flexible",
  };
  const retiree: PersonContext = {
    id: 1, planId: 1, role: "primary", name: "P",
    dateOfBirth: new Date("1960-01-01"), retirementYear: 2020,
  };
  const accounts: AccountContext[] = [
    { id: 1, planId: 1, personId: 1, name: "ISA", type: "isa",
      openingBalance: 1_000_000, annualContribution: 0, employerContribution: 0 },
  ];

  it("uses the active period's amount, stepping at age boundaries", () => {
    // 1960-01-01 → age = year - 1960. Periods anchored on this age.
    const spending: SpendingAssumption = {
      id: 1, planId: 1, annualSpendingTarget: 0, isIndexed: false,
      periods: [
        { fromAge: 66, toAge: 75, annualAmount: 50000, inflationLinked: false },
        { fromAge: 75, toAge: 85, annualAmount: 40000, inflationLinked: false },
        { fromAge: 85, toAge: null, annualAmount: 30000, inflationLinked: false },
      ],
    };

    const years = runProjection(
      [retiree], accounts, [], baseAssumptions, spending, strategy, 2026, 2050
    );
    const drawdownByAge = (age: number) => {
      const year = 1960 + age;
      const row = years.find((y) => y.year === year);
      return row?.totalHouseholdWithdrawals ?? -1;
    };

    expect(drawdownByAge(66)).toBe(50000); // start of go-go
    expect(drawdownByAge(74)).toBe(50000); // last go-go year
    expect(drawdownByAge(75)).toBe(40000); // step to slow-go
    expect(drawdownByAge(84)).toBe(40000);
    expect(drawdownByAge(85)).toBe(30000); // step to no-go
    expect(drawdownByAge(89)).toBe(30000);
  });

  it("falls back to annualSpendingTarget when periods is empty", () => {
    const spending: SpendingAssumption = {
      id: 1, planId: 1, annualSpendingTarget: 25000, isIndexed: false,
    };

    const [year] = runProjection(
      [retiree], accounts, [], baseAssumptions, spending, strategy, 2026, 2026
    );

    expect(year.totalHouseholdWithdrawals).toBe(25000);
  });

  it("inflates a period amount when inflationLinked is true", () => {
    const inflation: AssumptionSet = { ...baseAssumptions, inflationRate: 0.03 };
    const spending: SpendingAssumption = {
      id: 1, planId: 1, annualSpendingTarget: 0, isIndexed: false,
      periods: [
        { fromAge: 66, toAge: null, annualAmount: 50000, inflationLinked: true },
      ],
    };

    const years = runProjection(
      [retiree], accounts, [], inflation, spending, strategy, 2026, 2028
    );

    // Year 2026 (age 66): £50,000 in baseline (startYear) terms.
    // Year 2027: £50,000 × 1.03.
    // Year 2028: £50,000 × 1.03^2.
    expect(years[0].totalHouseholdWithdrawals).toBe(50000);
    expect(years[1].totalHouseholdWithdrawals).toBe(Math.round(50000 * 1.03));
    expect(years[2].totalHouseholdWithdrawals).toBe(Math.round(50000 * 1.03 * 1.03));
  });

  it("returns 0 spending in years with no covering period", () => {
    // Period covers ages 70+, but plan starts at age 66.
    const spending: SpendingAssumption = {
      id: 1, planId: 1, annualSpendingTarget: 0, isIndexed: false,
      periods: [
        { fromAge: 70, toAge: null, annualAmount: 50000, inflationLinked: false },
      ],
    };

    const years = runProjection(
      [retiree], accounts, [], baseAssumptions, spending, strategy, 2026, 2030
    );

    // Years 2026-2029 (ages 66-69): no period, no spending, no drawdown.
    expect(years[0].totalHouseholdWithdrawals).toBe(0);
    expect(years[3].totalHouseholdWithdrawals).toBe(0);
    // Year 2030 (age 70): period kicks in.
    expect(years[4].totalHouseholdWithdrawals).toBe(50000);
  });
});

describe("Monte Carlo (Sprint 10)", () => {
  const flatAssumptions: AssumptionSet = {
    id: 1, planId: 1, name: "Base",
    inflationRate: 0, investmentReturn: 0.04,
    personalAllowance: 12570, personalSavingsAllowance: 1000,
    basicRateBand: 50270, higherRateBand: 125140,
    basicRate: 0.2, higherRate: 0.4, additionalRate: 0.45,
    sippTaxFreePercentage: 0.25, sippMinimumAgeAccess: 55,
    marriageAllowanceTransfer: 0,
  };
  const strategy: WithdrawalStrategy = {
    accountTypeOrder: ["cash", "isa", "sipp", "other"],
    optimizeForTaxEfficiency: true, sippWithdrawalApproach: "flexible",
  };
  const wealthy: PersonContext = {
    id: 1, planId: 1, role: "primary", name: "P",
    dateOfBirth: new Date("1955-01-01"), retirementYear: 2020,
  };
  const wealthyAccounts: AccountContext[] = [
    { id: 1, planId: 1, personId: 1, name: "ISA", type: "isa",
      openingBalance: 5_000_000, annualContribution: 0, employerContribution: 0 },
  ];
  const lowSpending: SpendingAssumption = {
    id: 1, planId: 1, annualSpendingTarget: 30000, isIndexed: false,
  };

  it("collapses to a single deterministic outcome when volatility = 0", () => {
    // With zero std dev, every iteration gets the assumption's investmentReturn.
    // All p10/p50/p90 should equal the deterministic baseline.
    const baseline = runProjection(
      [wealthy], wealthyAccounts, [], flatAssumptions, lowSpending, strategy, 2026, 2035
    );
    const mc = runMonteCarlo(
      [wealthy], wealthyAccounts, [], flatAssumptions, lowSpending, strategy, 2026, 2035,
      [], [], { iterations: 50, volatility: 0, seed: 42 }
    );
    expect(mc.successProbability).toBe(1);
    for (let i = 0; i < baseline.length; i++) {
      expect(mc.byYear[i].p50).toBe(baseline[i].totalHouseholdAssets);
      expect(mc.byYear[i].p10).toBe(baseline[i].totalHouseholdAssets);
      expect(mc.byYear[i].p90).toBe(baseline[i].totalHouseholdAssets);
    }
  });

  it("produces a sensible spread when volatility > 0", () => {
    const mc = runMonteCarlo(
      [wealthy], wealthyAccounts, [], flatAssumptions, lowSpending, strategy, 2026, 2055,
      [], [], { iterations: 200, volatility: 0.1, seed: 42 }
    );
    expect(mc.byYear).toHaveLength(30);
    const last = mc.byYear[mc.byYear.length - 1];
    // Strict ordering of percentiles.
    expect(last.p10).toBeLessThanOrEqual(last.p50);
    expect(last.p50).toBeLessThanOrEqual(last.p90);
    // For a wealthy plan, p10 should still be > 0.
    expect(last.p10).toBeGreaterThan(0);
  });

  it("is deterministic for a given seed", () => {
    const a = runMonteCarlo(
      [wealthy], wealthyAccounts, [], flatAssumptions, lowSpending, strategy, 2026, 2035,
      [], [], { iterations: 50, volatility: 0.1, seed: 99 }
    );
    const b = runMonteCarlo(
      [wealthy], wealthyAccounts, [], flatAssumptions, lowSpending, strategy, 2026, 2035,
      [], [], { iterations: 50, volatility: 0.1, seed: 99 }
    );
    expect(a.successProbability).toBe(b.successProbability);
    expect(a.byYear[5].p50).toBe(b.byYear[5].p50);
  });

  it("reports successProbability < 1 for a borderline plan with volatility", () => {
    // Tight plan: spending high relative to pot. Some return paths fail.
    const tight: AccountContext[] = [
      { id: 1, planId: 1, personId: 1, name: "ISA", type: "isa",
        openingBalance: 500_000, annualContribution: 0, employerContribution: 0 },
    ];
    const highSpend: SpendingAssumption = {
      id: 1, planId: 1, annualSpendingTarget: 35000, isIndexed: false,
    };
    const mc = runMonteCarlo(
      [wealthy], tight, [], flatAssumptions, highSpend, strategy, 2026, 2056,
      [], [], { iterations: 200, volatility: 0.15, seed: 7 }
    );
    expect(mc.successProbability).toBeGreaterThan(0);
    expect(mc.successProbability).toBeLessThan(1);
  });
});

describe("Recommendation engine helpers (Sprint 9)", () => {
  const noGrowth: AssumptionSet = {
    id: 1, planId: 1, name: "Base",
    inflationRate: 0, investmentReturn: 0,
    personalAllowance: 12570, personalSavingsAllowance: 1000,
    basicRateBand: 50270, higherRateBand: 125140,
    basicRate: 0.2, higherRate: 0.4, additionalRate: 0.45,
    sippTaxFreePercentage: 0.25, sippMinimumAgeAccess: 55,
    marriageAllowanceTransfer: 0,
  };
  const strategy: WithdrawalStrategy = {
    accountTypeOrder: ["cash", "isa", "sipp", "other"],
    optimizeForTaxEfficiency: true, sippWithdrawalApproach: "flexible",
  };

  describe("findDepletionYear", () => {
    it("returns null for a comfortably sustainable plan", () => {
      const retiree: PersonContext = {
        id: 1, planId: 1, role: "primary", name: "P",
        dateOfBirth: new Date("1955-01-01"), retirementYear: 2020,
      };
      const accounts: AccountContext[] = [
        { id: 1, planId: 1, personId: 1, name: "ISA", type: "isa",
          openingBalance: 5_000_000, annualContribution: 0, employerContribution: 0 },
      ];
      const result = findDepletionYear(
        [retiree], accounts, [], noGrowth,
        { id: 1, planId: 1, annualSpendingTarget: 30000, isIndexed: false },
        strategy, 2026, 2056
      );
      expect(result).toBeNull();
    });

    it("returns the first year where assets fall to zero", () => {
      // £50k pot, £20k/yr spend with no income → ~2.5 years runway.
      const retiree: PersonContext = {
        id: 1, planId: 1, role: "primary", name: "P",
        dateOfBirth: new Date("1955-01-01"), retirementYear: 2020,
      };
      const accounts: AccountContext[] = [
        { id: 1, planId: 1, personId: 1, name: "ISA", type: "isa",
          openingBalance: 50000, annualContribution: 0, employerContribution: 0 },
      ];
      const result = findDepletionYear(
        [retiree], accounts, [], noGrowth,
        { id: 1, planId: 1, annualSpendingTarget: 20000, isIndexed: false },
        strategy, 2026, 2056
      );
      expect(result).toBe(2028); // 2026 50→30, 2027 30→10, 2028 10→0 (depleted)
    });
  });

  describe("findRetirementDeferralYears", () => {
    it("returns 0 if the plan is already sustainable", () => {
      const retiree: PersonContext = {
        id: 1, planId: 1, role: "primary", name: "P",
        dateOfBirth: new Date("1980-01-01"), retirementYear: 2045,
      };
      const accounts: AccountContext[] = [
        { id: 1, planId: 1, personId: 1, name: "ISA", type: "isa",
          openingBalance: 5_000_000, annualContribution: 0, employerContribution: 0 },
      ];
      const result = findRetirementDeferralYears(
        [retiree], accounts, [], noGrowth,
        { id: 1, planId: 1, annualSpendingTarget: 30000, isIndexed: false },
        strategy, 2026, 2056
      );
      expect(result).toBe(0);
    });

    it("returns null if everyone is already past retirement", () => {
      const retiree: PersonContext = {
        id: 1, planId: 1, role: "primary", name: "P",
        dateOfBirth: new Date("1955-01-01"), retirementYear: 2020,
      };
      const accounts: AccountContext[] = [
        { id: 1, planId: 1, personId: 1, name: "ISA", type: "isa",
          openingBalance: 50000, annualContribution: 0, employerContribution: 0 },
      ];
      const result = findRetirementDeferralYears(
        [retiree], accounts, [], noGrowth,
        { id: 1, planId: 1, annualSpendingTarget: 100000, isIndexed: false },
        strategy, 2026, 2056
      );
      expect(result).toBeNull();
    });

    it("finds the smallest deferral that makes the plan sustainable", () => {
      // 45yo with £50k savings, £30k contributions, retiring at 60 (2041) and
      // spending £30k/yr until 95. Tight — needs to defer.
      const accumulator: PersonContext = {
        id: 1, planId: 1, role: "primary", name: "P",
        dateOfBirth: new Date("1981-01-01"), retirementYear: 2041,
      };
      const accounts: AccountContext[] = [
        { id: 1, planId: 1, personId: 1, name: "ISA", type: "isa",
          openingBalance: 50000, annualContribution: 30000, employerContribution: 0 },
      ];
      const result = findRetirementDeferralYears(
        [accumulator], accounts, [], noGrowth,
        { id: 1, planId: 1, annualSpendingTarget: 30000, isIndexed: false },
        strategy, 2026, 2076
      );
      // Some specific deferral N should make this sustainable. We don't
      // pin the exact N — just verify the helper returns a positive number.
      expect(result).not.toBeNull();
      expect(result!).toBeGreaterThan(0);
      expect(result!).toBeLessThanOrEqual(10);
    });
  });
});
