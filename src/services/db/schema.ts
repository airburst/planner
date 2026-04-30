import { sql } from "drizzle-orm";
import {
    index,
    integer,
    real,
    sqliteTable,
    text,
    uniqueIndex
} from "drizzle-orm/sqlite-core";

export const householdPlans = sqliteTable("household_plans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text("updated_at").notNull().default(sql`(CURRENT_TIMESTAMP)`)
});

export const people = sqliteTable(
  "people",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    planId: integer("plan_id")
      .notNull()
      .references(() => householdPlans.id),
    role: text("role", { enum: ["primary", "partner"] }).notNull(),
    firstName: text("first_name").notNull(),
    dateOfBirth: text("date_of_birth"),
    retirementAge: integer("retirement_age"),
    statePensionAge: integer("state_pension_age"),
    createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`)
  },
  (table) => ({
    peoplePlanIdx: index("people_plan_id_idx").on(table.planId),
    peoplePlanRoleUnq: uniqueIndex("people_plan_role_unq").on(
      table.planId,
      table.role
    )
  })
);

export const accounts = sqliteTable(
  "accounts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    planId: integer("plan_id")
      .notNull()
      .references(() => householdPlans.id),
    personId: integer("person_id").references(() => people.id),
    name: text("name").notNull(),
    wrapperType: text("wrapper_type", {
      enum: ["sipp", "isa", "gia", "cash", "other"]
    }).notNull(),
    currentBalance: real("current_balance").notNull().default(0),
    annualContribution: real("annual_contribution").notNull().default(0),
    createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`)
  },
  (table) => ({
    accountsPlanIdx: index("accounts_plan_id_idx").on(table.planId),
    accountsPersonIdx: index("accounts_person_id_idx").on(table.personId)
  })
);

export const incomeStreams = sqliteTable(
  "income_streams",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    planId: integer("plan_id")
      .notNull()
      .references(() => householdPlans.id),
    personId: integer("person_id")
      .notNull()
      .references(() => people.id),
    streamType: text("stream_type", {
      enum: ["employment", "db_pension", "state_pension", "other"]
    }).notNull(),
    name: text("name").notNull(),
    startAge: integer("start_age").notNull(),
    endAge: integer("end_age"),
    annualAmount: real("annual_amount").notNull(),
    inflationLinked: integer("inflation_linked", { mode: "boolean" })
      .notNull()
      .default(true),
    taxable: integer("taxable", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`)
  },
  (table) => ({
    incomeStreamsPlanIdx: index("income_streams_plan_id_idx").on(table.planId),
    incomeStreamsPersonIdx: index("income_streams_person_id_idx").on(
      table.personId
    )
  })
);

export const expenseProfiles = sqliteTable(
  "expense_profiles",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    planId: integer("plan_id")
      .notNull()
      .references(() => householdPlans.id),
    name: text("name").notNull(),
    essentialAnnual: real("essential_annual").notNull(),
    discretionaryAnnual: real("discretionary_annual").notNull(),
    inflationLinked: integer("inflation_linked", { mode: "boolean" })
      .notNull()
      .default(true),
    createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`)
  },
  (table) => ({
    expenseProfilesPlanIdx: index("expense_profiles_plan_id_idx").on(table.planId)
  })
);

export const assumptionSets = sqliteTable(
  "assumption_sets",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    planId: integer("plan_id")
      .notNull()
      .references(() => householdPlans.id),
    name: text("name").notNull(),
    inflationRate: real("inflation_rate").notNull().default(0.025),
    nominalGrowthRate: real("nominal_growth_rate").notNull().default(0.05),
    statePensionAnnual: real("state_pension_annual").notNull().default(0),
    taxPolicyJson: text("tax_policy_json").notNull().default("{}"),
    createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`)
  },
  (table) => ({
    assumptionSetsPlanIdx: index("assumption_sets_plan_id_idx").on(table.planId)
  })
);

export const scenarios = sqliteTable(
  "scenarios",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    planId: integer("plan_id")
      .notNull()
      .references(() => householdPlans.id),
    baseScenarioId: integer("base_scenario_id"),
    name: text("name").notNull(),
    assumptionSetId: integer("assumption_set_id").references(
      () => assumptionSets.id
    ),
    expenseProfileId: integer("expense_profile_id").references(
      () => expenseProfiles.id
    ),
    notes: text("notes"),
    createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`)
  },
  (table) => ({
    scenariosPlanIdx: index("scenarios_plan_id_idx").on(table.planId),
    scenariosBaseIdx: index("scenarios_base_scenario_id_idx").on(
      table.baseScenarioId
    )
  })
);

export const scenarioOverrides = sqliteTable(
  "scenario_overrides",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    scenarioId: integer("scenario_id")
      .notNull()
      .references(() => scenarios.id),
    fieldPath: text("field_path").notNull(),
    valueJson: text("value_json").notNull(),
    createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`)
  },
  (table) => ({
    scenarioOverridesScenarioIdx: index("scenario_overrides_scenario_id_idx").on(
      table.scenarioId
    )
  })
);

export const projectionRuns = sqliteTable(
  "projection_runs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    scenarioId: integer("scenario_id")
      .notNull()
      .references(() => scenarios.id),
    runLabel: text("run_label"),
    rulesVersion: text("rules_version").notNull(),
    status: text("status", { enum: ["pending", "completed", "failed"] })
      .notNull()
      .default("pending"),
    startedAt: text("started_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
    completedAt: text("completed_at")
  },
  (table) => ({
    projectionRunsScenarioIdx: index("projection_runs_scenario_id_idx").on(
      table.scenarioId
    )
  })
);

export const projectionYearRows = sqliteTable(
  "projection_year_rows",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    projectionRunId: integer("projection_run_id")
      .notNull()
      .references(() => projectionRuns.id),
    yearIndex: integer("year_index").notNull(),
    agePrimary: integer("age_primary").notNull(),
    agePartner: integer("age_partner"),
    totalIncome: real("total_income").notNull().default(0),
    totalTax: real("total_tax").notNull().default(0),
    totalSpending: real("total_spending").notNull().default(0),
    endNetWorth: real("end_net_worth").notNull().default(0),
    endSippBalance: real("end_sipp_balance").notNull().default(0),
    endIsaBalance: real("end_isa_balance").notNull().default(0),
    shortfall: real("shortfall").notNull().default(0),
    detailsJson: text("details_json").notNull().default("{}"),
    createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`)
  },
  (table) => ({
    projectionYearRowsRunIdx: index("projection_year_rows_run_id_idx").on(
      table.projectionRunId
    ),
    projectionYearRowsRunYearUnq: uniqueIndex(
      "projection_year_rows_run_year_unq"
    ).on(table.projectionRunId, table.yearIndex)
  })
);

export const recommendations = sqliteTable(
  "recommendations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    projectionRunId: integer("projection_run_id")
      .notNull()
      .references(() => projectionRuns.id),
    priority: integer("priority").notNull(),
    code: text("code").notNull(),
    title: text("title").notNull(),
    rationale: text("rationale").notNull(),
    impactScore: real("impact_score"),
    actionJson: text("action_json").notNull().default("{}"),
    createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`)
  },
  (table) => ({
    recommendationsRunIdx: index("recommendations_run_id_idx").on(
      table.projectionRunId
    ),
    recommendationsRunPriorityUnq: uniqueIndex(
      "recommendations_run_priority_unq"
    ).on(table.projectionRunId, table.priority)
  })
);
