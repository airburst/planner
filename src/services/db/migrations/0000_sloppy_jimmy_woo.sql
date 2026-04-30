CREATE TABLE `accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`plan_id` integer NOT NULL,
	`person_id` integer,
	`name` text NOT NULL,
	`wrapper_type` text NOT NULL,
	`current_balance` real DEFAULT 0 NOT NULL,
	`annual_contribution` real DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `household_plans`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `accounts_plan_id_idx` ON `accounts` (`plan_id`);--> statement-breakpoint
CREATE INDEX `accounts_person_id_idx` ON `accounts` (`person_id`);--> statement-breakpoint
CREATE TABLE `assumption_sets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`plan_id` integer NOT NULL,
	`name` text NOT NULL,
	`inflation_rate` real DEFAULT 0.025 NOT NULL,
	`nominal_growth_rate` real DEFAULT 0.05 NOT NULL,
	`state_pension_annual` real DEFAULT 0 NOT NULL,
	`tax_policy_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `household_plans`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `assumption_sets_plan_id_idx` ON `assumption_sets` (`plan_id`);--> statement-breakpoint
CREATE TABLE `expense_profiles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`plan_id` integer NOT NULL,
	`name` text NOT NULL,
	`essential_annual` real NOT NULL,
	`discretionary_annual` real NOT NULL,
	`inflation_linked` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `household_plans`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `expense_profiles_plan_id_idx` ON `expense_profiles` (`plan_id`);--> statement-breakpoint
CREATE TABLE `household_plans` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `income_streams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`plan_id` integer NOT NULL,
	`person_id` integer NOT NULL,
	`stream_type` text NOT NULL,
	`name` text NOT NULL,
	`start_age` integer NOT NULL,
	`end_age` integer,
	`annual_amount` real NOT NULL,
	`inflation_linked` integer DEFAULT true NOT NULL,
	`taxable` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `household_plans`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `income_streams_plan_id_idx` ON `income_streams` (`plan_id`);--> statement-breakpoint
CREATE INDEX `income_streams_person_id_idx` ON `income_streams` (`person_id`);--> statement-breakpoint
CREATE TABLE `people` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`plan_id` integer NOT NULL,
	`role` text NOT NULL,
	`first_name` text NOT NULL,
	`date_of_birth` text,
	`retirement_age` integer,
	`state_pension_age` integer,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `household_plans`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `people_plan_id_idx` ON `people` (`plan_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `people_plan_role_unq` ON `people` (`plan_id`,`role`);--> statement-breakpoint
CREATE TABLE `projection_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`scenario_id` integer NOT NULL,
	`run_label` text,
	`rules_version` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`started_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`completed_at` text,
	FOREIGN KEY (`scenario_id`) REFERENCES `scenarios`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `projection_runs_scenario_id_idx` ON `projection_runs` (`scenario_id`);--> statement-breakpoint
CREATE TABLE `projection_year_rows` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`projection_run_id` integer NOT NULL,
	`year_index` integer NOT NULL,
	`age_primary` integer NOT NULL,
	`age_partner` integer,
	`total_income` real DEFAULT 0 NOT NULL,
	`total_tax` real DEFAULT 0 NOT NULL,
	`total_spending` real DEFAULT 0 NOT NULL,
	`end_net_worth` real DEFAULT 0 NOT NULL,
	`end_sipp_balance` real DEFAULT 0 NOT NULL,
	`end_isa_balance` real DEFAULT 0 NOT NULL,
	`shortfall` real DEFAULT 0 NOT NULL,
	`details_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`projection_run_id`) REFERENCES `projection_runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `projection_year_rows_run_id_idx` ON `projection_year_rows` (`projection_run_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `projection_year_rows_run_year_unq` ON `projection_year_rows` (`projection_run_id`,`year_index`);--> statement-breakpoint
CREATE TABLE `recommendations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`projection_run_id` integer NOT NULL,
	`priority` integer NOT NULL,
	`code` text NOT NULL,
	`title` text NOT NULL,
	`rationale` text NOT NULL,
	`impact_score` real,
	`action_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`projection_run_id`) REFERENCES `projection_runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `recommendations_run_id_idx` ON `recommendations` (`projection_run_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `recommendations_run_priority_unq` ON `recommendations` (`projection_run_id`,`priority`);--> statement-breakpoint
CREATE TABLE `scenario_overrides` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`scenario_id` integer NOT NULL,
	`field_path` text NOT NULL,
	`value_json` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`scenario_id`) REFERENCES `scenarios`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `scenario_overrides_scenario_id_idx` ON `scenario_overrides` (`scenario_id`);--> statement-breakpoint
CREATE TABLE `scenarios` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`plan_id` integer NOT NULL,
	`base_scenario_id` integer,
	`name` text NOT NULL,
	`assumption_set_id` integer,
	`expense_profile_id` integer,
	`notes` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `household_plans`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assumption_set_id`) REFERENCES `assumption_sets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`expense_profile_id`) REFERENCES `expense_profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `scenarios_plan_id_idx` ON `scenarios` (`plan_id`);--> statement-breakpoint
CREATE INDEX `scenarios_base_scenario_id_idx` ON `scenarios` (`base_scenario_id`);