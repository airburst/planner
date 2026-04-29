const { and, eq } = require("drizzle-orm");

module.exports = function registerPeopleHandlers(ipcMain, db, schema) {
  ipcMain.handle("people:getAll", async () => {
    return db.select().from(schema.people);
  });

  ipcMain.handle("people:getById", async (_, id) => {
    const rows = await db
      .select()
      .from(schema.people)
      .where(eq(schema.people.id, id));
    return rows[0] ?? null;
  });

  ipcMain.handle("people:getByPlan", async (_, planId) => {
    return db.select().from(schema.people).where(eq(schema.people.planId, planId));
  });

  ipcMain.handle("people:create", async (_, data) => {
    const rows = await db.insert(schema.people).values(data).returning();
    return rows[0] ?? null;
  });

  ipcMain.handle("people:update", async (_, id, data) => {
    const rows = await db
      .update(schema.people)
      .set(data)
      .where(eq(schema.people.id, id))
      .returning();
    return rows[0] ?? null;
  });

  ipcMain.handle("people:delete", async (_, id) => {
    await db.delete(schema.people).where(eq(schema.people.id, id));
    return { success: true };
  });

  ipcMain.handle("people:deleteByPlan", async (_, planId) => {
    await db.delete(schema.people).where(eq(schema.people.planId, planId));
    return { success: true };
  });

  ipcMain.handle("people:getByPlanAndRole", async (_, planId, role) => {
    const rows = await db
      .select()
      .from(schema.people)
      .where(and(eq(schema.people.planId, planId), eq(schema.people.role, role)));
    return rows[0] ?? null;
  });
};
