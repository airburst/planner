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
  }
};
