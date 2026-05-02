const { eq } = require("drizzle-orm");

module.exports = function registerOneOffExpensesHandlers(ipcMain, db, schema) {
  ipcMain.handle("one-off-expenses:getByPlan", async (_, planId) => {
    return db
      .select()
      .from(schema.oneOffExpenses)
      .where(eq(schema.oneOffExpenses.planId, planId));
  });

  ipcMain.handle("one-off-expenses:create", async (_, data) => {
    const rows = await db.insert(schema.oneOffExpenses).values(data).returning();
    return rows[0] ?? null;
  });

  ipcMain.handle("one-off-expenses:update", async (_, id, data) => {
    const rows = await db
      .update(schema.oneOffExpenses)
      .set(data)
      .where(eq(schema.oneOffExpenses.id, id))
      .returning();
    return rows[0] ?? null;
  });

  ipcMain.handle("one-off-expenses:delete", async (_, id) => {
    await db.delete(schema.oneOffExpenses).where(eq(schema.oneOffExpenses.id, id));
    return { success: true };
  });
};
