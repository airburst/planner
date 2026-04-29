/**
 * Unit Tests for Phased Income Module (P3-T2)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  getActiveIncomeStreamsForYear,
  calculatePersonIncomePhase,
  generatePersonIncomeReport,
  analyzeIncomePhases,
  arePhaseSequencesEquivalent,
  projectHouseholdIncomePhases,
  detectIncomeTransitions,
} from "./phased-income";
import { PersonContext, IncomeStreamContext } from "./types";

describe("Phased Income Module (P3-T2)", () => {
  let person: PersonContext;
  let partner: PersonContext;
  let incomeStreams: IncomeStreamContext[];

  beforeEach(() => {
    person = {
      id: 1,
      planId: 1,
      role: "primary",
      name: "John Smith",
      dateOfBirth: new Date("1960-01-01"),
    };

    partner = {
      id: 2,
      planId: 1,
      role: "partner",
      name: "Jane Smith",
      dateOfBirth: new Date("1962-01-01"),
    };

    incomeStreams = [
      {
        id: 1,
        planId: 1,
        personId: 1,
        name: "DB Pension",
        type: "db_pension",
        activationAge: 60,
        annualAmount: 20000,
        isIndexed: true,
      },
      {
        id: 2,
        planId: 1,
        personId: 1,
        name: "State Pension",
        type: "state_pension",
        activationAge: 67,
        annualAmount: 12000,
        isIndexed: true,
      },
      {
        id: 3,
        planId: 1,
        personId: 2,
        name: "State Pension",
        type: "state_pension",
        activationAge: 67,
        annualAmount: 12000,
        isIndexed: true,
      },
    ];
  });

  describe("getActiveIncomeStreamsForYear", () => {
    it("returns no streams before activation age", () => {
      const streams = getActiveIncomeStreamsForYear(person, incomeStreams, 2019, 2026, 0.02);
      expect(streams).toHaveLength(0);
    });

    it("returns stream at activation age", () => {
      // 2020: person age 60, DB pension activates
      const streams = getActiveIncomeStreamsForYear(person, incomeStreams, 2020, 2026, 0.02);
      expect(streams).toHaveLength(1);
      expect(streams[0].name).toBe("DB Pension");
    });

    it("returns multiple concurrent streams", () => {
      // 2027: person age 67, both DB and State Pension active
      const streams = getActiveIncomeStreamsForYear(person, incomeStreams, 2027, 2026, 0.02);
      expect(streams).toHaveLength(2);
      const types = streams.map((s) => s.type);
      expect(types).toContain("db_pension");
      expect(types).toContain("state_pension");
    });

    it("applies inflation to indexed streams", () => {
      // 2027: 1 year from base (2026)
      const streams = getActiveIncomeStreamsForYear(person, incomeStreams, 2027, 2026, 0.02);
      const statePension = streams.find((s) => s.name === "State Pension");
      expect(statePension?.amount).toBe(Math.round(12000 * 1.02));
    });

    it("does not apply inflation to non-indexed streams", () => {
      const nonIndexedStream: IncomeStreamContext = {
        id: 99,
        planId: 1,
        personId: 1,
        name: "Fixed Income",
        type: "other",
        activationAge: 65,
        annualAmount: 10000,
        isIndexed: false,
      };

      const streams = getActiveIncomeStreamsForYear(
        person,
        [nonIndexedStream],
        2030,
        2026,
        0.02
      );
      expect(streams[0].amount).toBe(10000); // Not inflated
    });

    it("handles different people's streams separately", () => {
      const streams = getActiveIncomeStreamsForYear(person, incomeStreams, 2027, 2026, 0.02);
      const personIds = streams.map((s) => ({ streamId: s.streamId }));

      // Should only contain person 1's streams
      for (const stream of streams) {
        expect([1, 2]).toContain(stream.streamId);
      }
    });
  });

  describe("calculatePersonIncomePhase", () => {
    it("calculates zero income before first activation", () => {
      const phase = calculatePersonIncomePhase(person, incomeStreams, 2019, 2026, 0.02);
      expect(phase.totalIncome).toBe(0);
      expect(phase.activeStreamCount).toBe(0);
    });

    it("calculates single stream income at activation", () => {
      const phase = calculatePersonIncomePhase(person, incomeStreams, 2020, 2026, 0.02);
      expect(phase.totalIncome).toBe(20000);
      expect(phase.activeStreamCount).toBe(1);
      expect(phase.age).toBe(60);
    });

    it("aggregates multiple concurrent streams", () => {
      // 2027: age 67, both DB and State Pension
      const phase = calculatePersonIncomePhase(person, incomeStreams, 2027, 2026, 0.02);
      const dbAmount = Math.round(20000 * Math.pow(1.02, 1));
      const spAmount = Math.round(12000 * 1.02);
      expect(phase.totalIncome).toBe(dbAmount + spAmount);
      expect(phase.activeStreamCount).toBe(2);
    });

    it("correctly identifies year and age", () => {
      const phase = calculatePersonIncomePhase(person, incomeStreams, 2035, 2026, 0.02);
      expect(phase.year).toBe(2035);
      expect(phase.age).toBe(75);
    });
  });

  describe("generatePersonIncomeReport", () => {
    it("generates report across 30-year period", () => {
      const report = generatePersonIncomeReport(person, incomeStreams, 2026, 2055, 0.02);
      expect(report.years).toHaveLength(30);
      expect(report.personId).toBe(1);
      expect(report.name).toBe("John Smith");
    });

    it("identifies first active age correctly", () => {
      const report = generatePersonIncomeReport(person, incomeStreams, 2019, 2030, 0.02);
      expect(report.firstActiveAge).toBe(60); // DB pension at 60
    });

    it("detects income transition years", () => {
      const report = generatePersonIncomeReport(person, incomeStreams, 2019, 2030, 0.02);
      // Should have transition at year 2027 (age 67) when State Pension activates
      const transitionYears = report.incomeTransitionYears;
      expect(transitionYears).toContain(2027);
    });

    it("aggregates total income by type", () => {
      const report = generatePersonIncomeReport(person, incomeStreams, 2026, 2055, 0.02);
      expect(report.totalIncomeByType.has("db_pension")).toBe(true);
      expect(report.totalIncomeByType.has("state_pension")).toBe(true);
      const dbTotal = report.totalIncomeByType.get("db_pension") || 0;
      expect(dbTotal).toBeGreaterThan(0);
    });

    it("returns -1 for firstActiveAge if no income streams", () => {
      const emptyStreams: IncomeStreamContext[] = [];
      const report = generatePersonIncomeReport(person, emptyStreams, 2026, 2055, 0.02);
      expect(report.firstActiveAge).toBe(-1);
    });
  });

  describe("analyzeIncomePhases", () => {
    it("identifies distinct income phase patterns", () => {
      const report = generatePersonIncomeReport(person, incomeStreams, 2019, 2030, 0.02);
      const patterns = analyzeIncomePhases(report);

      // Should have at least 2 patterns: DB only, then DB + State Pension
      expect(patterns.length).toBeGreaterThanOrEqual(2);
    });

    it("captures age when pattern begins", () => {
      const report = generatePersonIncomeReport(person, incomeStreams, 2019, 2030, 0.02);
      const patterns = analyzeIncomePhases(report);

      const pattern60 = patterns.find((p) => p.age === 60);
      expect(pattern60?.activeStreams).toContain("DB Pension");

      const pattern67 = patterns.find((p) => p.age === 67);
      expect(pattern67?.activeStreams).toContain("DB Pension");
      expect(pattern67?.activeStreams).toContain("State Pension");
    });

    it("generates human-readable descriptions", () => {
      const report = generatePersonIncomeReport(person, incomeStreams, 2019, 2030, 0.02);
      const patterns = analyzeIncomePhases(report);

      for (const pattern of patterns) {
        expect(pattern.description).toContain(String(pattern.age));
        expect(pattern.description.includes("+") || pattern.activeStreams.length <= 1).toBe(
          true
        );
      }
    });
  });

  describe("arePhaseSequencesEquivalent", () => {
    it("returns true for identical phases", () => {
      const phase1 = calculatePersonIncomePhase(person, incomeStreams, 2026, 2026, 0.02);
      const phase2 = calculatePersonIncomePhase(person, incomeStreams, 2026, 2026, 0.02);
      expect(arePhaseSequencesEquivalent(phase1, phase2)).toBe(true);
    });

    it("returns false for different total income", () => {
      const phase1 = calculatePersonIncomePhase(person, incomeStreams, 2020, 2026, 0.02);
      const phase2 = calculatePersonIncomePhase(person, incomeStreams, 2027, 2026, 0.02);
      expect(arePhaseSequencesEquivalent(phase1, phase2)).toBe(false);
    });

    it("returns false for different stream counts", () => {
      const phase1 = calculatePersonIncomePhase(person, incomeStreams, 2020, 2026, 0.02);
      const phase2 = calculatePersonIncomePhase(person, incomeStreams, 2027, 2026, 0.02);
      expect(phase1.streams.length).not.toBe(phase2.streams.length);
      expect(arePhaseSequencesEquivalent(phase1, phase2)).toBe(false);
    });
  });

  describe("projectHouseholdIncomePhases", () => {
    it("projects income for multiple people", () => {
      const phases = projectHouseholdIncomePhases(
        [person, partner],
        incomeStreams,
        2026,
        2030,
        0.02
      );

      expect(phases).toHaveLength(5); // 2026-2030
      for (const phase of phases) {
        expect(phase.peoplePhases.size).toBe(2);
      }
    });

    it("aggregates household income correctly", () => {
      const phases = projectHouseholdIncomePhases(
        [person, partner],
        incomeStreams,
        2026,
        2026,
        0.02
      );

      const phase = phases[0];
      let manualTotal = 0;
      for (const personPhase of phase.peoplePhases.values()) {
        manualTotal += personPhase.totalIncome;
      }
      expect(phase.totalHouseholdIncome).toBe(manualTotal);
    });

    it("aggregates income by sources", () => {
      const phases = projectHouseholdIncomePhases(
        [person, partner],
        incomeStreams,
        2026,
        2030,
        0.02
      );

      for (const phase of phases) {
        if (phase.incomeBySources.size > 0) {
          const totalBySource = Array.from(phase.incomeBySources.values()).reduce(
            (a, b) => a + b,
            0
          );
          expect(totalBySource).toBe(phase.totalHouseholdIncome);
        }
      }
    });
  });

  describe("detectIncomeTransitions", () => {
    it("detects activation events", () => {
      const report = generatePersonIncomeReport(person, incomeStreams, 2019, 2030, 0.02);
      const events = detectIncomeTransitions(report);

      // Should detect DB Pension activation at age 60
      const dbActivation = events.find(
        (e) => e.event === "activation" && e.streamName === "DB Pension"
      );
      expect(dbActivation).toBeDefined();
      expect(dbActivation?.age).toBe(60);
    });

    it("detects multiple sequential activations", () => {
      const report = generatePersonIncomeReport(person, incomeStreams, 2019, 2030, 0.02);
      const events = detectIncomeTransitions(report);

      const activations = events.filter((e) => e.event === "activation");
      expect(activations.length).toBeGreaterThanOrEqual(2);
    });

    it("calculates income differences", () => {
      const report = generatePersonIncomeReport(person, incomeStreams, 2019, 2030, 0.02);
      const events = detectIncomeTransitions(report);

      for (const event of events) {
        expect(event.difference).toBe(event.newIncome - event.previousIncome);
      }
    });

    it("associates events with correct person and year", () => {
      const report = generatePersonIncomeReport(person, incomeStreams, 2019, 2030, 0.02);
      const events = detectIncomeTransitions(report);

      for (const event of events) {
        expect(event.personId).toBe(report.personId);
        expect(event.personName).toBe(report.name);
      }
    });
  });
});
