const { eq } = require("drizzle-orm");

module.exports = function registerAssumptionSetsHandlers(ipcMain, db, schema) {
  ipcMain.handle("assumption-sets:getByPlan", async (_, planId) => {
    const rows = await db
      .select()
      .from(schema.assumptionSets)
      .where(eq(schema.assumptionSets.planId, planId));
    return rows[0] || null;
  });

  ipcMain.handle("assumption-sets:create", async (_, data) => {
    const inserted = await db
      .insert(schema.assumptionSets)
      .values(data)
      .returning();
    return inserted[0] || null;
  });

  ipcMain.handle("assumption-sets:update", async (_, id, data) => {
    const updated = await db
      .update(schema.assumptionSets)
      .set(data)
      .where(eq(schema.assumptionSets.id, id))
      .returning();
    return updated[0] || null;
  });

  ipcMain.handle("assumption-sets:delete", async (_, id) => {
    await db
      .delete(schema.assumptionSets)
      .where(eq(schema.assumptionSets.id, id));
    return { success: true };
  });
};
