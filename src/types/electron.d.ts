export {};

    import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
    import type { householdPlans, people } from "../main/db/schema";

type HouseholdPlan = InferSelectModel<typeof householdPlans>;
type NewHouseholdPlan = InferInsertModel<typeof householdPlans>;
type Person = InferSelectModel<typeof people>;
type NewPerson = InferInsertModel<typeof people>;

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
    };
  }
}