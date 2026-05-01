const { eq } = require("drizzle-orm");

module.exports = function registerScenarioHandlers(ipcMain, db, schema) {
  ipcMain.handle("scenarios:getByPlan", async (_, planId) => {
    return db
      .select()
      .from(schema.scenarios)
      .where(eq(schema.scenarios.planId, planId));
  });

  ipcMain.handle("scenarios:get", async (_, scenarioId) => {
    const result = await db
      .select()
      .from(schema.scenarios)
      .where(eq(schema.scenarios.id, scenarioId));
    return result[0] || null;
  });

  ipcMain.handle("scenarios:create", async (_, data) => {
    const inserted = await db.insert(schema.scenarios).values(data).returning();
    return inserted[0] || null;
  });

  ipcMain.handle("scenarios:update", async (_, scenarioId, data) => {
    const updated = await db
      .update(schema.scenarios)
      .set(data)
      .where(eq(schema.scenarios.id, scenarioId))
      .returning();
    return updated[0] || null;
  });

  ipcMain.handle("scenarios:delete", async (_, scenarioId) => {
    // Delete scenario overrides first
    await db
      .delete(schema.scenarioOverrides)
      .where(eq(schema.scenarioOverrides.scenarioId, scenarioId));

    // Delete projection runs and related data
    const projectionRuns = await db
      .select()
      .from(schema.projectionRuns)
      .where(eq(schema.projectionRuns.scenarioId, scenarioId));

    for (const run of projectionRuns) {
      await db
        .delete(schema.recommendations)
        .where(eq(schema.recommendations.projectionRunId, run.id));

      await db
        .delete(schema.projectionYearRows)
        .where(eq(schema.projectionYearRows.projectionRunId, run.id));
    }

    await db
      .delete(schema.projectionRuns)
      .where(eq(schema.projectionRuns.scenarioId, scenarioId));

    // Delete the scenario
    await db
      .delete(schema.scenarios)
      .where(eq(schema.scenarios.id, scenarioId));

    return { success: true };
  });

  ipcMain.handle("scenarios:getOverrides", async (_, scenarioId) => {
    return db
      .select()
      .from(schema.scenarioOverrides)
      .where(eq(schema.scenarioOverrides.scenarioId, scenarioId));
  });

  ipcMain.handle("scenarios:setOverrides", async (_, scenarioId, overridesList) => {
    // Clear existing overrides
    await db
      .delete(schema.scenarioOverrides)
      .where(eq(schema.scenarioOverrides.scenarioId, scenarioId));

    // Insert new overrides
    if (overridesList && overridesList.length > 0) {
      await db.insert(schema.scenarioOverrides).values(overridesList);
    }

    return { success: true };
  });
};
