const { eq } = require("drizzle-orm");

module.exports = function registerPlansHandlers(ipcMain, db, schema) {
  ipcMain.handle("plans:getAll", async () => {
    return db.select().from(schema.householdPlans);
  });

  ipcMain.handle("plans:getById", async (_, id) => {
    const rows = await db
      .select()
      .from(schema.householdPlans)
      .where(eq(schema.householdPlans.id, id));
    return rows[0] ?? null;
  });

  ipcMain.handle("plans:create", async (_, data) => {
    const rows = await db
      .insert(schema.householdPlans)
      .values(data)
      .returning();
    return rows[0] ?? null;
  });

  ipcMain.handle("plans:update", async (_, id, data) => {
    const rows = await db
      .update(schema.householdPlans)
      .set({
        ...data,
        updatedAt: new Date().toISOString()
      })
      .where(eq(schema.householdPlans.id, id))
      .returning();
    return rows[0] ?? null;
  });

  ipcMain.handle("plans:delete", async (_, id) => {
    await db.delete(schema.householdPlans).where(eq(schema.householdPlans.id, id));
    return { success: true };
  });
};
