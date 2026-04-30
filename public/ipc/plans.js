const { eq, inArray } = require("drizzle-orm");

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
    const scenarios = await db
      .select({ id: schema.scenarios.id })
      .from(schema.scenarios)
      .where(eq(schema.scenarios.planId, id));

    const scenarioIds = scenarios.map((row) => row.id);

    if (scenarioIds.length > 0) {
      const projectionRuns = await db
        .select({ id: schema.projectionRuns.id })
        .from(schema.projectionRuns)
        .where(inArray(schema.projectionRuns.scenarioId, scenarioIds));

      const runIds = projectionRuns.map((row) => row.id);

      if (runIds.length > 0) {
        await db
          .delete(schema.recommendations)
          .where(inArray(schema.recommendations.projectionRunId, runIds));
        await db
          .delete(schema.projectionYearRows)
          .where(inArray(schema.projectionYearRows.projectionRunId, runIds));
      }

      await db
        .delete(schema.projectionRuns)
        .where(inArray(schema.projectionRuns.scenarioId, scenarioIds));
      await db
        .delete(schema.scenarioOverrides)
        .where(inArray(schema.scenarioOverrides.scenarioId, scenarioIds));
      await db.delete(schema.scenarios).where(eq(schema.scenarios.planId, id));
    }

    await db.delete(schema.incomeStreams).where(eq(schema.incomeStreams.planId, id));
    await db.delete(schema.accounts).where(eq(schema.accounts.planId, id));
    await db.delete(schema.people).where(eq(schema.people.planId, id));
    await db.delete(schema.assumptionSets).where(eq(schema.assumptionSets.planId, id));
    await db.delete(schema.expenseProfiles).where(eq(schema.expenseProfiles.planId, id));
    await db.delete(schema.householdPlans).where(eq(schema.householdPlans.id, id));

    return { success: true };
  });
};
