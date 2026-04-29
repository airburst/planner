export {};

    import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
    import type {
        accounts,
        householdPlans,
        incomeStreams,
        people
    } from "../main/db/schema";

type HouseholdPlan = InferSelectModel<typeof householdPlans>;
type NewHouseholdPlan = InferInsertModel<typeof householdPlans>;
type Person = InferSelectModel<typeof people>;
type NewPerson = InferInsertModel<typeof people>;
type Account = InferSelectModel<typeof accounts>;
type NewAccount = InferInsertModel<typeof accounts>;
type IncomeStream = InferSelectModel<typeof incomeStreams>;
type NewIncomeStream = InferInsertModel<typeof incomeStreams>;

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
    };
  }
}