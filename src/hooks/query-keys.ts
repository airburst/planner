export const queryKeys = {
  plans: {
    all: ["plans"] as const
  },
  people: {
    all: ["people"] as const,
    byPlan: (planId: number) => ["people", "plan", planId] as const
  },
  accounts: {
    all: ["accounts"] as const,
    byPlan: (planId: number) => ["accounts", "plan", planId] as const
  },
  incomeStreams: {
    all: ["income-streams"] as const,
    byPlan: (planId: number) => ["income-streams", "plan", planId] as const
  },
  expenseProfiles: {
    byPlan: (planId: number) => ["expense-profiles", "plan", planId] as const
  },
  scenarios: {
    forPlan: (planId: number) => ["scenarios", "plan", planId] as const,
    byId: (scenarioId: number | null) => ["scenarios", "id", scenarioId] as const,
    overrides: (scenarioId: number | null) => ["scenarios", "overrides", scenarioId] as const
  },
  projection: {
    forPlan: (planId: number) => ["projection", "plan", planId] as const
  },
  assumptionSets: {
    byPlan: (planId: number) => ["assumption-sets", "plan", planId] as const
  }
};
