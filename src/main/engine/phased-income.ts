/**
 * Phased Income Module (P3-T2)
 *
 * Handles complex multi-stream income activation patterns:
 * - Concurrent income streams (e.g., DB pension + State Pension + part-time work)
 * - Age-based activation logic
 * - Inflation-indexed income sources
 * - Income phase sequencing and aggregation
 */

import {
    IncomeStreamContext,
    PersonContext
} from "./types";

/**
 * Income phase for a specific person in a year
 */
export interface PersonIncomePhase {
  year: number;
  age: number;
  streams: ActiveIncomeStream[];
  totalIncome: number;
  activeStreamCount: number;
}

/**
 * A single active income stream in a year
 */
export interface ActiveIncomeStream {
  id: number;
  streamId: number;
  name: string;
  type: string;
  activationAge: number;
  amount: number; // Actual amount for this year
}

/**
 * Comprehensive income phase report for a person
 */
export interface PersonIncomeReport {
  personId: number;
  name: string;
  years: PersonIncomePhase[];
  totalIncomeByType: Map<string, number>;
  firstActiveAge: number;
  incomeTransitionYears: number[]; // Years where income changes
}

/**
 * Household income aggregation for a year
 */
export interface HouseholdIncomePhase {
  year: number;
  peoplePhases: Map<number, PersonIncomePhase>; // personId -> PersonIncomePhase
  totalHouseholdIncome: number;
  incomeBySources: Map<string, number>; // Income type -> total amount
}

/**
 * Calculate age-based activation of all income streams for a person in a year
 */
export function getActiveIncomeStreamsForYear(
  person: PersonContext,
  streams: IncomeStreamContext[],
  year: number,
  baseYear: number,
  inflationRate: number
): ActiveIncomeStream[] {
  const age = year - person.dateOfBirth.getFullYear();
  const yearsFromBase = year - baseYear;
  const active: ActiveIncomeStream[] = [];

  for (const stream of streams) {
    if (stream.personId === person.id && age >= stream.activationAge) {
      // Calculate inflation-adjusted amount
      const amount = stream.isIndexed
        ? Math.round(stream.annualAmount * Math.pow(1 + inflationRate, yearsFromBase))
        : stream.annualAmount;

      active.push({
        id: active.length,
        streamId: stream.id,
        name: stream.name,
        type: stream.type,
        activationAge: stream.activationAge,
        amount,
      });
    }
  }

  return active;
}

/**
 * Calculate person's income phase for a specific year
 */
export function calculatePersonIncomePhase(
  person: PersonContext,
  streams: IncomeStreamContext[],
  year: number,
  baseYear: number,
  inflationRate: number
): PersonIncomePhase {
  const age = year - person.dateOfBirth.getFullYear();
  const activeStreams = getActiveIncomeStreamsForYear(
    person,
    streams,
    year,
    baseYear,
    inflationRate
  );

  const totalIncome = activeStreams.reduce((sum, s) => sum + s.amount, 0);

  return {
    year,
    age,
    streams: activeStreams,
    totalIncome,
    activeStreamCount: activeStreams.length,
  };
}

/**
 * Generate comprehensive income report for a person across projection years
 */
export function generatePersonIncomeReport(
  person: PersonContext,
  streams: IncomeStreamContext[],
  startYear: number,
  endYear: number,
  inflationRate: number
): PersonIncomeReport {
  const years: PersonIncomePhase[] = [];
  const totalIncomeByType = new Map<string, number>();
  const transitionYears: number[] = [];
  let previousStreamCount = 0;
  let firstActiveAge = -1;

  for (let year = startYear; year <= endYear; year++) {
    const phase = calculatePersonIncomePhase(person, streams, year, startYear, inflationRate);
    years.push(phase);

    // Track first year with active income
    if (firstActiveAge === -1 && phase.totalIncome > 0) {
      firstActiveAge = phase.age;
    }

    // Track transitions (when number of streams changes)
    if (previousStreamCount !== phase.activeStreamCount && year > startYear) {
      transitionYears.push(year);
    }
    previousStreamCount = phase.activeStreamCount;

    // Aggregate by type
    for (const stream of phase.streams) {
      const current = totalIncomeByType.get(stream.type) || 0;
      totalIncomeByType.set(stream.type, current + stream.amount);
    }
  }

  return {
    personId: person.id,
    name: person.name,
    years,
    totalIncomeByType,
    firstActiveAge: firstActiveAge === -1 ? -1 : firstActiveAge,
    incomeTransitionYears: transitionYears,
  };
}

/**
 * Detect income phase patterns (e.g., DB pension at 60, State Pension at 67)
 */
export interface IncomePhasePattern {
  age: number;
  activeStreams: string[]; // Stream names
  description: string;
}

/**
 * Analyze and identify income phase transitions in a person's plan
 */
export function analyzeIncomePhases(report: PersonIncomeReport): IncomePhasePattern[] {
  const patterns: IncomePhasePattern[] = [];
  const seenPatterns = new Set<string>();

  for (const phase of report.years) {
    if (phase.activeStreamCount > 0) {
      const streamNames = phase.streams.map((s) => s.name).sort();
      const key = streamNames.join("|");

      if (!seenPatterns.has(key)) {
        seenPatterns.add(key);
        patterns.push({
          age: phase.age,
          activeStreams: streamNames,
          description: `${phase.age}: ${streamNames.join(" + ")}`,
        });
      }
    }
  }

  return patterns;
}

/**
 * Check if two income phases are equivalent (same streams, amounts)
 */
export function arePhaseSequencesEquivalent(
  phase1: PersonIncomePhase,
  phase2: PersonIncomePhase
): boolean {
  if (phase1.totalIncome !== phase2.totalIncome) return false;
  if (phase1.streams.length !== phase2.streams.length) return false;

  const streams1 = phase1.streams.map((s) => s.streamId).sort();
  const streams2 = phase2.streams.map((s) => s.streamId).sort();

  return streams1.every((id, i) => id === streams2[i]);
}

/**
 * Project income across years for multiple people (household)
 */
export function projectHouseholdIncomePhases(
  people: PersonContext[],
  streams: IncomeStreamContext[],
  startYear: number,
  endYear: number,
  inflationRate: number
): HouseholdIncomePhase[] {
  const householdPhases: HouseholdIncomePhase[] = [];

  for (let year = startYear; year <= endYear; year++) {
    const peoplePhases = new Map<number, PersonIncomePhase>();
    let totalHouseholdIncome = 0;
    const incomeBySources = new Map<string, number>();

    for (const person of people) {
      const personPhase = calculatePersonIncomePhase(
        person,
        streams,
        year,
        startYear,
        inflationRate
      );

      peoplePhases.set(person.id, personPhase);
      totalHouseholdIncome += personPhase.totalIncome;

      for (const stream of personPhase.streams) {
        const current = incomeBySources.get(stream.type) || 0;
        incomeBySources.set(stream.type, current + stream.amount);
      }
    }

    householdPhases.push({
      year,
      peoplePhases,
      totalHouseholdIncome,
      incomeBySources,
    });
  }

  return householdPhases;
}

/**
 * Identify critical income transitions (where new income starts or ends)
 */
export interface IncomeTransitionEvent {
  year: number;
  age: number;
  personId: number;
  personName: string;
  event: "activation" | "increase" | "completion";
  streamName: string;
  previousIncome: number;
  newIncome: number;
  difference: number;
}

/**
 * Detect all income transition events across projection
 */
export function detectIncomeTransitions(
  report: PersonIncomeReport
): IncomeTransitionEvent[] {
  const events: IncomeTransitionEvent[] = [];
  let previousIncome = 0;
  let previousStreams = new Set<number>();

  for (const phase of report.years) {
    const currentStreams = new Set(phase.streams.map((s) => s.streamId));

    // Check for new activations
    for (const stream of phase.streams) {
      if (!previousStreams.has(stream.streamId)) {
        events.push({
          year: phase.year,
          age: phase.age,
          personId: report.personId,
          personName: report.name,
          event: "activation",
          streamName: stream.name,
          previousIncome,
          newIncome: phase.totalIncome,
          difference: phase.totalIncome - previousIncome,
        });
      }
    }

    // Check for income changes
    if (previousIncome > 0 && phase.totalIncome !== previousIncome) {
      const existing = events.find(
        (e) =>
          e.year === phase.year &&
          e.personId === report.personId &&
          e.event === "activation"
      );

      if (!existing && phase.streams.length === previousStreams.size) {
        events.push({
          year: phase.year,
          age: phase.age,
          personId: report.personId,
          personName: report.name,
          event: "increase",
          streamName: "Indexed income",
          previousIncome,
          newIncome: phase.totalIncome,
          difference: phase.totalIncome - previousIncome,
        });
      }
    }

    previousIncome = phase.totalIncome;
    previousStreams = currentStreams;
  }

  return events;
}
