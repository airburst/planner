import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { app } from "electron";
import path from "node:path";
import * as schema from "./schema";

export { schema };

export function setupDatabase(customDbPath?: string) {
	const dbPath = customDbPath ?? path.join(app.getPath("home"), "planner.db");
	const sqlite = new Database(dbPath);
	sqlite.pragma("journal_mode = WAL");

	const db = drizzle(sqlite, { schema });
	const migrationsPath = path.join(app.getAppPath(), "src/main/db/migrations");
	migrate(db, { migrationsFolder: migrationsPath });

	return { db, sqlite, dbPath };
}