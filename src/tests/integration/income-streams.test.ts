import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "./helpers/db";
import { createMockIpc, registerPlannerHandlers } from "./helpers/ipc";

describe("income streams IPC", () => {
  let testDb: TestDb;
  let invoke: <T = unknown>(channel: string, ...args: unknown[]) => Promise<T>;

  beforeEach(() => {
    testDb = createTestDb();
    const mockIpc = createMockIpc();
    registerPlannerHandlers(mockIpc.ipcMain, testDb.db, testDb.schema);
    invoke = mockIpc.invoke;
  });

  afterEach(() => {
    testDb.teardown();
  });

  it("creates and queries income streams by plan and person", async () => {
    const plan = await invoke<{ id: number }>("plans:create", {
      name: "Income Plan",
      description: "For stream tests"
    });

    const person = await invoke<{ id: number }>("people:create", {
      planId: plan.id,
      role: "primary",
      firstName: "Alex"
    });

    const stream = await invoke<{ id: number; streamType: string; annualAmount: number }>(
      "income-streams:create",
      {
        planId: plan.id,
        personId: person.id,
        streamType: "db_pension",
        name: "DB Pension",
        startAge: 60,
        annualAmount: 12000,
        taxable: true,
        inflationLinked: true
      }
    );

    expect(stream).toBeTruthy();
    expect(stream?.streamType).toBe("db_pension");

    const byPlan = await invoke<Array<{ id: number }>>("income-streams:getByPlan", plan.id);
    expect(byPlan).toHaveLength(1);

    const byPerson = await invoke<Array<{ id: number }>>(
      "income-streams:getByPerson",
      person.id
    );
    expect(byPerson).toHaveLength(1);

    const byPlanAndPerson = await invoke<Array<{ id: number }>>(
      "income-streams:getByPlanAndPerson",
      plan.id,
      person.id
    );
    expect(byPlanAndPerson).toHaveLength(1);

    const deleted = await invoke<{ success: boolean }>("income-streams:delete", stream.id);
    expect(deleted.success).toBe(true);
  });
});
