const { and, eq } = require("drizzle-orm");

module.exports = function registerIncomeStreamsHandlers(ipcMain, db, schema) {
  ipcMain.handle("income-streams:getAll", async () => {
    return db.select().from(schema.incomeStreams);
  });

  ipcMain.handle("income-streams:getById", async (_, id) => {
    const rows = await db
      .select()
      .from(schema.incomeStreams)
      .where(eq(schema.incomeStreams.id, id));
    return rows[0] ?? null;
  });

  ipcMain.handle("income-streams:getByPlan", async (_, planId) => {
    return db
      .select()
      .from(schema.incomeStreams)
      .where(eq(schema.incomeStreams.planId, planId));
  });

  ipcMain.handle("income-streams:getByPerson", async (_, personId) => {
    return db
      .select()
      .from(schema.incomeStreams)
      .where(eq(schema.incomeStreams.personId, personId));
  });

  ipcMain.handle(
    "income-streams:getByPlanAndPerson",
    async (_, planId, personId) => {
      return db
        .select()
        .from(schema.incomeStreams)
        .where(
          and(
            eq(schema.incomeStreams.planId, planId),
            eq(schema.incomeStreams.personId, personId)
          )
        );
    }
  );

  ipcMain.handle("income-streams:create", async (_, data) => {
    const rows = await db.insert(schema.incomeStreams).values(data).returning();
    return rows[0] ?? null;
  });

  ipcMain.handle("income-streams:update", async (_, id, data) => {
    const rows = await db
      .update(schema.incomeStreams)
      .set(data)
      .where(eq(schema.incomeStreams.id, id))
      .returning();
    return rows[0] ?? null;
  });

  ipcMain.handle("income-streams:delete", async (_, id) => {
    await db.delete(schema.incomeStreams).where(eq(schema.incomeStreams.id, id));
    return { success: true };
  });
};
