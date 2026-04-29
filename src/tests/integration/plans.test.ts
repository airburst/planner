import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "./helpers/db";
import { createMockIpc, registerPlannerHandlers } from "./helpers/ipc";

describe("plans IPC", () => {
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

  it("creates, reads, updates, and deletes a plan", async () => {
    const created = await invoke<{ id: number; name: string }>("plans:create", {
      name: "Base Plan",
      description: "Initial scenario"
    });

    expect(created).toBeTruthy();
    expect(created?.name).toBe("Base Plan");

    const fetched = await invoke<{ id: number; name: string }>(
      "plans:getById",
      created.id
    );
    expect(fetched?.id).toBe(created.id);

    const updated = await invoke<{ id: number; name: string; description: string }>(
      "plans:update",
      created.id,
      { name: "Updated Plan", description: "Edited" }
    );
    expect(updated?.name).toBe("Updated Plan");
    expect(updated?.description).toBe("Edited");

    const allPlans = await invoke<Array<{ id: number; name: string }>>("plans:getAll");
    expect(allPlans).toHaveLength(1);

    const deleted = await invoke<{ success: boolean }>("plans:delete", created.id);
    expect(deleted.success).toBe(true);

    const afterDelete = await invoke<Array<{ id: number; name: string }>>("plans:getAll");
    expect(afterDelete).toHaveLength(0);
  });
});
