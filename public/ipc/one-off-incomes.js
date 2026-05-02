const { eq } = require("drizzle-orm");

module.exports = function registerOneOffIncomesHandlers(ipcMain, db, schema) {
  ipcMain.handle("one-off-incomes:getByPlan", async (_, planId) => {
    return db
      .select()
      .from(schema.oneOffIncomes)
      .where(eq(schema.oneOffIncomes.planId, planId));
  });

  ipcMain.handle("one-off-incomes:create", async (_, data) => {
    const rows = await db.insert(schema.oneOffIncomes).values(data).returning();
    return rows[0] ?? null;
  });

  ipcMain.handle("one-off-incomes:update", async (_, id, data) => {
    const rows = await db
      .update(schema.oneOffIncomes)
      .set(data)
      .where(eq(schema.oneOffIncomes.id, id))
      .returning();
    return rows[0] ?? null;
  });

  ipcMain.handle("one-off-incomes:delete", async (_, id) => {
    await db.delete(schema.oneOffIncomes).where(eq(schema.oneOffIncomes.id, id));
    return { success: true };
  });
};
