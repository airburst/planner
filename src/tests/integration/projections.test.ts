import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "./helpers/db";
import { createMockIpc, registerPlannerHandlers } from "./helpers/ipc";

/** Minimal shape of a projection result returned by the IPC handler */
interface ProjectionResult {
  planId: number;
  scenarioId: number | null;
  assumptionSetId: number | null;
  expenseProfileId: number | null;
  startYear: number;
  endYear: number;
  years: Array<{
    year: number;
    totalHouseholdIncome: number;
    totalHouseholdWithdrawals: number;
    totalHouseholdTax: number;
    totalHouseholdAssets: number;
    canSustainSpending: boolean;
    deficitOrSurplus: number;
    spendingCoverage: number;
    taxBreakdown: {
      year: number;
      totalTax: number;
      effectiveRate: number;
    };
    people: Map<number, {
      totalIncome: number;
      taxDue: number;
      withdrawalDetails: Array<{
        accountType: string;
        amountWithdrawn: number;
        taxableComponent: number;
        taxFreeComponent: number;
      }>;
    }>;
  }>;
  recommendations: Array<{
    id: number;
    projectionRunId: number;
    priority: "high" | "medium" | "low";
    category: string;
    title: string;
    yearTriggered: number;
  }>;
}

// Helpers for seeding test data -----------------------------------------------

async function seedPlan(
  invoke: <T>(channel: string, ...args: unknown[]) => Promise<T>
): Promise<number> {
  const plan = await invoke<{ id: number }>("plans:create", {
    name: "Test Plan",
    description: "Integration test plan",
  });
  return plan.id;
}

async function seedPerson(
  invoke: <T>(channel: string, ...args: unknown[]) => Promise<T>,
  planId: number,
  dateOfBirth: string,
  role: "primary" | "partner" = "primary"
): Promise<number> {
  const person = await invoke<{ id: number }>("people:create", {
    planId,
    role,
    firstName: role === "primary" ? "Alice" : "Bob",
    dateOfBirth,
    retirementAge: 65,
    statePensionAge: 67,
  });
  return person.id;
}

// -----------------------------------------------------------------------------

describe("projections IPC", () => {
  let testDb: TestDb;
  let invoke: <T = unknown>(channel: string, ...args: unknown[]) => Promise<T>;

  beforeEach(() => {
    testDb = createTestDb();
    const mockIpc = createMockIpc();
    registerPlannerHandlers(mockIpc.ipcMain, testDb.db, testDb.schema);
    invoke = mockIpc.invoke;
  });

  afterEach(() => {
    testDb.teardown();
  });

  describe("projections:runForPlan — basic structure", () => {
    it("returns the expected envelope shape", async () => {
      const planId = await seedPlan(invoke);
      await seedPerson(invoke, planId, "1960-01-01");

      const result = await invoke<ProjectionResult>(
        "projections:runForPlan",
        planId,
        { startYear: 2026, endYear: 2028 }
      );

      expect(result.planId).toBe(planId);
      expect(result.startYear).toBe(2026);
      expect(result.endYear).toBe(2028);
      expect(result.years).toHaveLength(3);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it("each year row has the required fields", async () => {
      const planId = await seedPlan(invoke);
      await seedPerson(invoke, planId, "1960-01-01");

      const result = await invoke<ProjectionResult>(
        "projections:runForPlan",
        planId,
        { startYear: 2026, endYear: 2026 }
      );

      const year = result.years[0];
      expect(year.year).toBe(2026);
      expect(typeof year.totalHouseholdIncome).toBe("number");
      expect(typeof year.totalHouseholdAssets).toBe("number");
      expect(typeof year.canSustainSpending).toBe("boolean");
      expect(typeof year.taxBreakdown.totalTax).toBe("number");
    });

    it("throws when a person is missing dateOfBirth", async () => {
      const planId = await seedPlan(invoke);
      // Insert a person without dateOfBirth by directly using the DB
      testDb.db.insert(testDb.schema.people).values({
        planId,
        role: "primary",
        firstName: "NoDate",
        dateOfBirth: null,
      }).run();

      await expect(
        invoke("projections:runForPlan", planId, { startYear: 2026, endYear: 2027 })
      ).rejects.toThrow("missing dateOfBirth");
    });
  });

  describe("projections:runForPlan — income and tax", () => {
    it("income streams activate at the correct age", async () => {
      const planId = await seedPlan(invoke);
      // Person born 1960, age 66 in 2026, state pension starts at 67 (2027)
      const personId = await seedPerson(invoke, planId, "1960-01-01");

      await invoke("income-streams:create", {
        planId,
        personId,
        streamType: "state_pension",
        name: "State Pension",
        startAge: 67,
        annualAmount: 12000,
        inflationLinked: false,
      });

      const result = await invoke<ProjectionResult>(
        "projections:runForPlan",
        planId,
        { startYear: 2026, endYear: 2028 }
      );

      // No state pension income in 2026 (age 66)
      expect(result.years[0].totalHouseholdIncome).toBe(0);
      // 2027 is the activation year — January birth → 11/12 pro-rated.
      expect(result.years[1].totalHouseholdIncome).toBe(Math.round(12000 * 11 / 12));
      // Full year from 2028 onwards.
      expect(result.years[2].totalHouseholdIncome).toBe(12000);
    });

    it("applies UK personal allowance — no tax below £12,570", async () => {
      const planId = await seedPlan(invoke);
      const personId = await seedPerson(invoke, planId, "1960-01-01");

      await invoke("income-streams:create", {
        planId,
        personId,
        streamType: "state_pension",
        name: "State Pension",
        startAge: 65,         // already activated by 2026 (age 66) — full year
        annualAmount: 10000,  // below personal allowance
        inflationLinked: false,
      });

      const result = await invoke<ProjectionResult>(
        "projections:runForPlan",
        planId,
        { startYear: 2026, endYear: 2026 }
      );

      expect(result.years[0].totalHouseholdIncome).toBe(10000);
      expect(result.years[0].totalHouseholdTax).toBe(0);
    });

    it("taxes income above the personal allowance at 20%", async () => {
      const planId = await seedPlan(invoke);
      const personId = await seedPerson(invoke, planId, "1960-01-01");

      await invoke("income-streams:create", {
        planId,
        personId,
        streamType: "employment",
        name: "Salary",
        startAge: 18,
        annualAmount: 25000,
        inflationLinked: false,
      });

      const result = await invoke<ProjectionResult>(
        "projections:runForPlan",
        planId,
        { startYear: 2026, endYear: 2026 }
      );

      const expectedTax = Math.round((25000 - 12570) * 0.2);
      expect(result.years[0].totalHouseholdTax).toBe(expectedTax);
    });

    it("produces deterministic results for identical inputs", async () => {
      const planId = await seedPlan(invoke);
      const personId = await seedPerson(invoke, planId, "1960-01-01");

      await invoke("income-streams:create", {
        planId,
        personId,
        streamType: "state_pension",
        name: "State Pension",
        startAge: 67,
        annualAmount: 12000,
        inflationLinked: false,
      });

      const [first, second] = await Promise.all([
        invoke<ProjectionResult>("projections:runForPlan", planId, { startYear: 2026, endYear: 2030 }),
        invoke<ProjectionResult>("projections:runForPlan", planId, { startYear: 2026, endYear: 2030 }),
      ]);

      // Year-by-year totals must be identical
      for (let i = 0; i < first.years.length; i++) {
        expect(second.years[i].totalHouseholdIncome).toBe(first.years[i].totalHouseholdIncome);
        expect(second.years[i].totalHouseholdTax).toBe(first.years[i].totalHouseholdTax);
        expect(second.years[i].totalHouseholdAssets).toBe(first.years[i].totalHouseholdAssets);
      }
    });
  });

  describe("projections:runForPlan — accounts and withdrawals", () => {
    it("assets decay when spending exceeds income", async () => {
      const planId = await seedPlan(invoke);
      const personId = await seedPerson(invoke, planId, "1960-01-01");

      // ISA with £60k, no income, spending target £20k — assets must fall
      await invoke("accounts:create", {
        planId,
        personId,
        name: "ISA",
        wrapperType: "isa",
        currentBalance: 60000,
        annualContribution: 0,
      });

      await testDb.db.insert(testDb.schema.expenseProfiles).values({
        planId,
        name: "Base expenses",
        essentialAnnual: 20000,
        discretionaryAnnual: 0,
        inflationLinked: false,
      }).run();

      const result = await invoke<ProjectionResult>(
        "projections:runForPlan",
        planId,
        { startYear: 2026, endYear: 2028 }
      );

      const firstYear = result.years[0];
      const secondYear = result.years[1];
      // Withdrawals must be made
      expect(firstYear.totalHouseholdWithdrawals).toBeGreaterThan(0);
      // Assets must decrease year-on-year
      expect(secondYear.totalHouseholdAssets).toBeLessThan(firstYear.totalHouseholdAssets);
    });

    it("ISA withdrawals carry zero tax", async () => {
      const planId = await seedPlan(invoke);
      const personId = await seedPerson(invoke, planId, "1960-01-01");

      await invoke("accounts:create", {
        planId,
        personId,
        name: "ISA",
        wrapperType: "isa",
        currentBalance: 100000,
        annualContribution: 0,
      });

      await testDb.db.insert(testDb.schema.expenseProfiles).values({
        planId,
        name: "Base expenses",
        essentialAnnual: 30000,
        discretionaryAnnual: 0,
        inflationLinked: false,
      }).run();

      const result = await invoke<ProjectionResult>(
        "projections:runForPlan",
        planId,
        { startYear: 2026, endYear: 2026 }
      );

      // All withdrawals from ISA — should be tax-free, total tax = 0
      expect(result.years[0].totalHouseholdTax).toBe(0);
      expect(result.years[0].totalHouseholdWithdrawals).toBeGreaterThan(0);
    });
  });

  describe("projections:runForPlan — assumption sets and scenarios", () => {
    it("uses a custom assumption set when linked to a scenario", async () => {
      const planId = await seedPlan(invoke);
      const personId = await seedPerson(invoke, planId, "1960-01-01");

      await invoke("income-streams:create", {
        planId,
        personId,
        streamType: "employment",
        name: "Salary",
        startAge: 18,
        annualAmount: 25000,
        inflationLinked: false,
      });

      // Assumption set with higher inflation rate
      const [assumptionSetRow] = await testDb.db
        .insert(testDb.schema.assumptionSets)
        .values({
          planId,
          name: "High inflation",
          inflationRate: 0.04,
          nominalGrowthRate: 0.06,
          statePensionAnnual: 0,
          taxPolicyJson: "{}",
        })
        .returning();

      const [scenarioRow] = await testDb.db
        .insert(testDb.schema.scenarios)
        .values({
          planId,
          name: "High inflation scenario",
          assumptionSetId: assumptionSetRow.id,
          expenseProfileId: null,
        })
        .returning();

      const result = await invoke<ProjectionResult>(
        "projections:runForPlan",
        planId,
        { scenarioId: scenarioRow.id, startYear: 2026, endYear: 2026 }
      );

      expect(result.assumptionSetId).toBe(assumptionSetRow.id);
      expect(result.scenarioId).toBe(scenarioRow.id);
    });

    it("falls back to plan-level assumption set when no scenario is specified", async () => {
      const planId = await seedPlan(invoke);
      await seedPerson(invoke, planId, "1960-01-01");

      const [assumptionSetRow] = await testDb.db
        .insert(testDb.schema.assumptionSets)
        .values({
          planId,
          name: "Default",
          inflationRate: 0.025,
          nominalGrowthRate: 0.05,
          statePensionAnnual: 0,
          taxPolicyJson: "{}",
        })
        .returning();

      const result = await invoke<ProjectionResult>(
        "projections:runForPlan",
        planId,
        { startYear: 2026, endYear: 2026 }
      );

      expect(result.assumptionSetId).toBe(assumptionSetRow.id);
      expect(result.scenarioId).toBeNull();
    });
  });

  describe("projections:runForPlan — recommendations", () => {
    it("emits no recommendations for a well-funded plan", async () => {
      const planId = await seedPlan(invoke);
      const personId = await seedPerson(invoke, planId, "1960-01-01");

      // Generous state pension, no spending requirement
      await invoke("income-streams:create", {
        planId,
        personId,
        streamType: "state_pension",
        name: "State Pension",
        startAge: 66,
        annualAmount: 50000,
        inflationLinked: false,
      });

      const result = await invoke<ProjectionResult>(
        "projections:runForPlan",
        planId,
        { startYear: 2026, endYear: 2030 }
      );

      // No spending target, no accounts → no unsustainable years, no depletion
      const highPriority = result.recommendations.filter((r) => r.priority === "high");
      expect(highPriority).toHaveLength(0);
    });

    it("raises a high-priority spending recommendation when assets are depleted", async () => {
      const planId = await seedPlan(invoke);
      const personId = await seedPerson(invoke, planId, "1960-01-01");

      // Very small ISA, large spending, no income → depletion certain
      await invoke("accounts:create", {
        planId,
        personId,
        name: "ISA",
        wrapperType: "isa",
        currentBalance: 10000,
        annualContribution: 0,
      });

      await testDb.db.insert(testDb.schema.expenseProfiles).values({
        planId,
        name: "High spending",
        essentialAnnual: 40000,
        discretionaryAnnual: 0,
        inflationLinked: false,
      }).run();

      const result = await invoke<ProjectionResult>(
        "projections:runForPlan",
        planId,
        { startYear: 2026, endYear: 2028 }
      );

      const highPriority = result.recommendations.filter((r) => r.priority === "high");
      expect(highPriority.length).toBeGreaterThan(0);
    });

    it("raises a withdrawal recommendation when taxable SIPP withdrawals are needed", async () => {
      const planId = await seedPlan(invoke);
      const personId = await seedPerson(invoke, planId, "1960-01-01");

      // SIPP only — withdrawals will be taxable
      await invoke("accounts:create", {
        planId,
        personId,
        name: "SIPP",
        wrapperType: "sipp",
        currentBalance: 200000,
        annualContribution: 0,
      });

      await testDb.db.insert(testDb.schema.expenseProfiles).values({
        planId,
        name: "Moderate spending",
        essentialAnnual: 25000,
        discretionaryAnnual: 0,
        inflationLinked: false,
      }).run();

      const result = await invoke<ProjectionResult>(
        "projections:runForPlan",
        planId,
        { startYear: 2026, endYear: 2027 }
      );

      const withdrawalRec = result.recommendations.find(
        (r) => r.category === "withdrawal" && r.title.includes("withdrawal sequencing")
      );
      expect(withdrawalRec).toBeDefined();
      expect(withdrawalRec?.priority).toBe("medium");
    });
  });

  describe("projections:runForPlan — partner mode", () => {
    it("taxes primary and partner separately, not as pooled income", async () => {
      const planId = await seedPlan(invoke);
      const primaryId = await seedPerson(invoke, planId, "1960-01-01", "primary");
      const partnerId = await seedPerson(invoke, planId, "1962-01-01", "partner");

      // Each person earns £30k — combined £60k
      for (const personId of [primaryId, partnerId]) {
        await invoke("income-streams:create", {
          planId,
          personId,
          streamType: "employment",
          name: "Salary",
          startAge: 18,
          annualAmount: 30000,
          inflationLinked: false,
        });
      }

      const result = await invoke<ProjectionResult>(
        "projections:runForPlan",
        planId,
        { startYear: 2026, endYear: 2026 }
      );

      const year = result.years[0];
      // Each person pays tax on £30k individually (basic rate only)
      const perPersonTax = Math.round((30000 - 12570) * 0.2);
      const expectedHouseholdTax = perPersonTax * 2;
      expect(year.totalHouseholdTax).toBe(expectedHouseholdTax);

      // Pooled £60k would attract higher-rate tax — per-person total must be lower
      const pooledTax = Math.round((50270 - 12570) * 0.2 + (60000 - 50270) * 0.4);
      expect(year.totalHouseholdTax).toBeLessThan(pooledTax);
    });
  });

  describe("projections:runForPlan — retirement pot", () => {
    it("returns retirementPotByPerson for an accumulating person (ACC-T4)", async () => {
      const planId = await seedPlan(invoke);
      // Person born 1980, age 46 in 2026, retires at 65 → retirement year 2045.
      const person = await invoke<{ id: number }>("people:create", {
        planId,
        role: "primary",
        firstName: "Pre-retiree",
        dateOfBirth: "1980-01-01",
        retirementAge: 65,
        statePensionAge: 67,
      });
      await invoke("accounts:create", {
        planId,
        personId: person.id,
        name: "ISA",
        wrapperType: "isa",
        currentBalance: 100000,
        annualContribution: 10000,
      });

      const result = await invoke<{ retirementPotByPerson: Record<number, { pot: number; year: number; alreadyRetired: boolean }> }>(
        "projections:runForPlan",
        planId,
        { startYear: 2026, endYear: 2046 }
      );

      expect(result.retirementPotByPerson).toBeDefined();
      expect(result.retirementPotByPerson[person.id]).toBeDefined();
      expect(result.retirementPotByPerson[person.id].year).toBe(2045);
      expect(result.retirementPotByPerson[person.id].alreadyRetired).toBe(false);
      // Lower bound: opening + 19 years of contributions, no growth → £290k.
      // Real result includes growth → must be much higher.
      expect(result.retirementPotByPerson[person.id].pot).toBeGreaterThan(290000);
    });

    it("flags alreadyRetired and uses opening balance when retirementYear <= startYear", async () => {
      const planId = await seedPlan(invoke);
      // Person born 1958, age 68 in 2026, retired at 65 (2023).
      const person = await invoke<{ id: number }>("people:create", {
        planId,
        role: "primary",
        firstName: "Already retired",
        dateOfBirth: "1958-01-01",
        retirementAge: 65,
        statePensionAge: 67,
      });
      await invoke("accounts:create", {
        planId,
        personId: person.id,
        name: "ISA",
        wrapperType: "isa",
        currentBalance: 250000,
        annualContribution: 0,
      });

      const result = await invoke<{ retirementPotByPerson: Record<number, { pot: number; year: number; alreadyRetired: boolean }> }>(
        "projections:runForPlan",
        planId,
        { startYear: 2026, endYear: 2030 }
      );

      expect(result.retirementPotByPerson[person.id].alreadyRetired).toBe(true);
      expect(result.retirementPotByPerson[person.id].pot).toBe(250000);
    });
  });
});
