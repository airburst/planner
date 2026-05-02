CREATE TABLE `one_off_expenses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`plan_id` integer NOT NULL,
	`name` text NOT NULL,
	`year` integer NOT NULL,
	`amount` real NOT NULL,
	`description` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `household_plans`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `one_off_expenses_plan_id_idx` ON `one_off_expenses` (`plan_id`);--> statement-breakpoint
CREATE TABLE `one_off_incomes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`plan_id` integer NOT NULL,
	`person_id` integer,
	`name` text NOT NULL,
	`year` integer NOT NULL,
	`amount` real NOT NULL,
	`taxable` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `household_plans`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `one_off_incomes_plan_id_idx` ON `one_off_incomes` (`plan_id`);