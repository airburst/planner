export {};

    import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
    import type {
        accounts,
        assumptionSets,
        expenseProfiles,
        householdPlans,
        incomeStreams,
        people,
        scenarioOverrides,
        scenarios
    } from "../services/db/schema";
    import type { HouseholdYearState, Recommendation } from "../services/engine/types";

type HouseholdPlan = InferSelectModel<typeof householdPlans>;
type NewHouseholdPlan = InferInsertModel<typeof householdPlans>;
type Person = InferSelectModel<typeof people>;
type NewPerson = InferInsertModel<typeof people>;
type Account = InferSelectModel<typeof accounts>;
type NewAccount = InferInsertModel<typeof accounts>;
type IncomeStream = InferSelectModel<typeof incomeStreams>;
type NewIncomeStream = InferInsertModel<typeof incomeStreams>;
type ExpenseProfile = InferSelectModel<typeof expenseProfiles>;
type NewExpenseProfile = InferInsertModel<typeof expenseProfiles>;
type Scenario = InferSelectModel<typeof scenarios>;
type NewScenario = InferInsertModel<typeof scenarios>;
type ScenarioOverride = InferSelectModel<typeof scenarioOverrides>;
type NewScenarioOverride = InferInsertModel<typeof scenarioOverrides>;
type AssumptionSet = InferSelectModel<typeof assumptionSets>;
type NewAssumptionSet = InferInsertModel<typeof assumptionSets>;
type RetirementPotEntry = {
  pot: number;
  year: number;
  alreadyRetired: boolean;
};

type ProjectionResult = {
  planId: number;
  scenarioId: number | null;
  assumptionSetId: number | null;
  expenseProfileId: number | null;
  startYear: number;
  endYear: number;
  years: HouseholdYearState[];
  recommendations: Recommendation[];
  retirementPotByPerson: Record<number, RetirementPotEntry>;
};

declare global {
  interface Window {
    api: {
      ping: () => string;

      getPlans: () => Promise<HouseholdPlan[]>;
      getPlan: (id: number) => Promise<HouseholdPlan | null>;
      createPlan: (data: NewHouseholdPlan) => Promise<HouseholdPlan | null>;
      updatePlan: (
        id: number,
        data: Partial<NewHouseholdPlan>
      ) => Promise<HouseholdPlan | null>;
      deletePlan: (id: number) => Promise<{ success: boolean }>;

      getPeople: () => Promise<Person[]>;
      getPerson: (id: number) => Promise<Person | null>;
      getPeopleByPlan: (planId: number) => Promise<Person[]>;
      getPersonByPlanAndRole: (
        planId: number,
        role: "primary" | "partner"
      ) => Promise<Person | null>;
      createPerson: (data: NewPerson) => Promise<Person | null>;
      updatePerson: (id: number, data: Partial<NewPerson>) => Promise<Person | null>;
      deletePerson: (id: number) => Promise<{ success: boolean }>;
      deletePeopleByPlan: (planId: number) => Promise<{ success: boolean }>;

      getAccounts: () => Promise<Account[]>;
      getAccount: (id: number) => Promise<Account | null>;
      getAccountsByPlan: (planId: number) => Promise<Account[]>;
      createAccount: (data: NewAccount) => Promise<Account | null>;
      updateAccount: (id: number, data: Partial<NewAccount>) => Promise<Account | null>;
      deleteAccount: (id: number) => Promise<{ success: boolean }>;

      getIncomeStreams: () => Promise<IncomeStream[]>;
      getIncomeStream: (id: number) => Promise<IncomeStream | null>;
      getIncomeStreamsByPlan: (planId: number) => Promise<IncomeStream[]>;
      getIncomeStreamsByPerson: (personId: number) => Promise<IncomeStream[]>;
      getIncomeStreamsByPlanAndPerson: (
        planId: number,
        personId: number
      ) => Promise<IncomeStream[]>;
      createIncomeStream: (data: NewIncomeStream) => Promise<IncomeStream | null>;
      updateIncomeStream: (
        id: number,
        data: Partial<NewIncomeStream>
      ) => Promise<IncomeStream | null>;
      deleteIncomeStream: (id: number) => Promise<{ success: boolean }>;

      getExpenseProfileByPlan: (planId: number) => Promise<ExpenseProfile | null>;
      createExpenseProfile: (data: NewExpenseProfile) => Promise<ExpenseProfile | null>;
      updateExpenseProfile: (id: number, data: Partial<NewExpenseProfile>) => Promise<ExpenseProfile | null>;
      deleteExpenseProfile: (id: number) => Promise<{ success: boolean }>;

      getScenariosByPlan: (planId: number) => Promise<Scenario[]>;
      getScenario: (id: number) => Promise<Scenario | null>;
      createScenario: (data: NewScenario) => Promise<Scenario | null>;
      updateScenario: (id: number, data: Partial<NewScenario>) => Promise<Scenario | null>;
      deleteScenario: (id: number) => Promise<{ success: boolean }>;
      getScenarioOverrides: (scenarioId: number) => Promise<ScenarioOverride[]>;
      setScenarioOverrides: (scenarioId: number, overrides: NewScenarioOverride[]) => Promise<void>;

      getAssumptionSetByPlan: (planId: number) => Promise<AssumptionSet | null>;
      createAssumptionSet: (data: NewAssumptionSet) => Promise<AssumptionSet | null>;
      updateAssumptionSet: (id: number, data: Partial<NewAssumptionSet>) => Promise<AssumptionSet | null>;
      deleteAssumptionSet: (id: number) => Promise<{ success: boolean }>;

      runProjectionForPlan: (
        planId: number,
        options?: { scenarioId?: number; startYear?: number; endYear?: number }
      ) => Promise<ProjectionResult>;
      runProjectionForScenario: (
        scenarioId: number,
        options?: { startYear?: number; endYear?: number }
      ) => Promise<ProjectionResult>;
    };
  }
}