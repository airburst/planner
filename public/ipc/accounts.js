const { eq } = require("drizzle-orm");

module.exports = function registerAccountsHandlers(ipcMain, db, schema) {
  ipcMain.handle("accounts:getAll", async () => {
    return db.select().from(schema.accounts);
  });

  ipcMain.handle("accounts:getById", async (_, id) => {
    const rows = await db
      .select()
      .from(schema.accounts)
      .where(eq(schema.accounts.id, id));
    return rows[0] ?? null;
  });

  ipcMain.handle("accounts:getByPlan", async (_, planId) => {
    return db
      .select()
      .from(schema.accounts)
      .where(eq(schema.accounts.planId, planId));
  });

  ipcMain.handle("accounts:create", async (_, data) => {
    const rows = await db.insert(schema.accounts).values(data).returning();
    return rows[0] ?? null;
  });

  ipcMain.handle("accounts:update", async (_, id, data) => {
    const rows = await db
      .update(schema.accounts)
      .set(data)
      .where(eq(schema.accounts.id, id))
      .returning();
    return rows[0] ?? null;
  });

  ipcMain.handle("accounts:delete", async (_, id) => {
    await db.delete(schema.accounts).where(eq(schema.accounts.id, id));
    return { success: true };
  });
};
