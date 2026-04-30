const { eq } = require("drizzle-orm");

module.exports = function registerExpenseProfilesHandlers(ipcMain, db, schema) {
  ipcMain.handle("expense-profiles:getByPlan", async (_, planId) => {
    const rows = await db
      .select()
      .from(schema.expenseProfiles)
      .where(eq(schema.expenseProfiles.planId, planId));
    return rows[0] ?? null;
  });

  ipcMain.handle("expense-profiles:create", async (_, data) => {
    const rows = await db.insert(schema.expenseProfiles).values(data).returning();
    return rows[0] ?? null;
  });

  ipcMain.handle("expense-profiles:update", async (_, id, data) => {
    const rows = await db
      .update(schema.expenseProfiles)
      .set(data)
      .where(eq(schema.expenseProfiles.id, id))
      .returning();
    return rows[0] ?? null;
  });

  ipcMain.handle("expense-profiles:delete", async (_, id) => {
    await db.delete(schema.expenseProfiles).where(eq(schema.expenseProfiles.id, id));
    return { success: true };
  });
};
