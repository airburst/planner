const { eq, asc } = require("drizzle-orm");

module.exports = function registerSpendingPeriodsHandlers(ipcMain, db, schema) {
  ipcMain.handle("spending-periods:getByPlan", async (_, planId) => {
    return db
      .select()
      .from(schema.spendingPeriods)
      .where(eq(schema.spendingPeriods.planId, planId))
      .orderBy(asc(schema.spendingPeriods.sortOrder), asc(schema.spendingPeriods.fromAge));
  });

  ipcMain.handle("spending-periods:create", async (_, data) => {
    const rows = await db.insert(schema.spendingPeriods).values(data).returning();
    return rows[0] ?? null;
  });

  ipcMain.handle("spending-periods:update", async (_, id, data) => {
    const rows = await db
      .update(schema.spendingPeriods)
      .set(data)
      .where(eq(schema.spendingPeriods.id, id))
      .returning();
    return rows[0] ?? null;
  });

  ipcMain.handle("spending-periods:delete", async (_, id) => {
    await db.delete(schema.spendingPeriods).where(eq(schema.spendingPeriods.id, id));
    return { success: true };
  });

  ipcMain.handle("spending-periods:replaceAll", async (_, planId, periods) => {
    await db.delete(schema.spendingPeriods).where(eq(schema.spendingPeriods.planId, planId));
    if (periods.length === 0) return [];
    const rows = await db
      .insert(schema.spendingPeriods)
      .values(periods.map((p) => ({ ...p, planId })))
      .returning();
    return rows;
  });
};
