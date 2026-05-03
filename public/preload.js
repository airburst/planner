const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  ping: () => "pong",

  getPlans: () => ipcRenderer.invoke("plans:getAll"),
  getPlan: (id) => ipcRenderer.invoke("plans:getById", id),
  createPlan: (data) => ipcRenderer.invoke("plans:create", data),
  updatePlan: (id, data) => ipcRenderer.invoke("plans:update", id, data),
  deletePlan: (id) => ipcRenderer.invoke("plans:delete", id),

  getPeople: () => ipcRenderer.invoke("people:getAll"),
  getPerson: (id) => ipcRenderer.invoke("people:getById", id),
  getPeopleByPlan: (planId) => ipcRenderer.invoke("people:getByPlan", planId),
  getPersonByPlanAndRole: (planId, role) =>
    ipcRenderer.invoke("people:getByPlanAndRole", planId, role),
  createPerson: (data) => ipcRenderer.invoke("people:create", data),
  updatePerson: (id, data) => ipcRenderer.invoke("people:update", id, data),
  deletePerson: (id) => ipcRenderer.invoke("people:delete", id),
  deletePeopleByPlan: (planId) => ipcRenderer.invoke("people:deleteByPlan", planId),

  getAccounts: () => ipcRenderer.invoke("accounts:getAll"),
  getAccount: (id) => ipcRenderer.invoke("accounts:getById", id),
  getAccountsByPlan: (planId) => ipcRenderer.invoke("accounts:getByPlan", planId),
  createAccount: (data) => ipcRenderer.invoke("accounts:create", data),
  updateAccount: (id, data) => ipcRenderer.invoke("accounts:update", id, data),
  deleteAccount: (id) => ipcRenderer.invoke("accounts:delete", id),

  getIncomeStreams: () => ipcRenderer.invoke("income-streams:getAll"),
  getIncomeStream: (id) => ipcRenderer.invoke("income-streams:getById", id),
  getIncomeStreamsByPlan: (planId) =>
    ipcRenderer.invoke("income-streams:getByPlan", planId),
  getIncomeStreamsByPerson: (personId) =>
    ipcRenderer.invoke("income-streams:getByPerson", personId),
  getIncomeStreamsByPlanAndPerson: (planId, personId) =>
    ipcRenderer.invoke("income-streams:getByPlanAndPerson", planId, personId),
  createIncomeStream: (data) => ipcRenderer.invoke("income-streams:create", data),
  updateIncomeStream: (id, data) =>
    ipcRenderer.invoke("income-streams:update", id, data),
  deleteIncomeStream: (id) => ipcRenderer.invoke("income-streams:delete", id)
,

  runProjectionForPlan: (planId, options) =>
    ipcRenderer.invoke("projections:runForPlan", planId, options),

  runProjectionForScenario: (scenarioId, options) =>
    ipcRenderer.invoke("projections:runForScenario", scenarioId, options),

  runStressTest: (planId, preset, options = {}) =>
    ipcRenderer.invoke("projections:runStressTest", planId, preset, options),

  runMonteCarlo: (planId, options = {}) =>
    ipcRenderer.invoke("projections:runMonteCarlo", planId, options),

  getExpenseProfileByPlan: (planId) =>
    ipcRenderer.invoke("expense-profiles:getByPlan", planId),
  createExpenseProfile: (data) =>
    ipcRenderer.invoke("expense-profiles:create", data),
  updateExpenseProfile: (id, data) =>
    ipcRenderer.invoke("expense-profiles:update", id, data),
  deleteExpenseProfile: (id) =>
    ipcRenderer.invoke("expense-profiles:delete", id),

  getScenariosByPlan: (planId) =>
    ipcRenderer.invoke("scenarios:getByPlan", planId),
  getScenario: (id) => ipcRenderer.invoke("scenarios:get", id),
  createScenario: (data) => ipcRenderer.invoke("scenarios:create", data),
  updateScenario: (id, data) => ipcRenderer.invoke("scenarios:update", id, data),
  deleteScenario: (id) => ipcRenderer.invoke("scenarios:delete", id),
  getScenarioOverrides: (scenarioId) =>
    ipcRenderer.invoke("scenarios:getOverrides", scenarioId),
  setScenarioOverrides: (scenarioId, overrides) =>
    ipcRenderer.invoke("scenarios:setOverrides", scenarioId, overrides),

  getAssumptionSetByPlan: (planId) =>
    ipcRenderer.invoke("assumption-sets:getByPlan", planId),
  createAssumptionSet: (data) =>
    ipcRenderer.invoke("assumption-sets:create", data),
  updateAssumptionSet: (id, data) =>
    ipcRenderer.invoke("assumption-sets:update", id, data),
  deleteAssumptionSet: (id) =>
    ipcRenderer.invoke("assumption-sets:delete", id),

  getOneOffIncomesByPlan: (planId) =>
    ipcRenderer.invoke("one-off-incomes:getByPlan", planId),
  createOneOffIncome: (data) =>
    ipcRenderer.invoke("one-off-incomes:create", data),
  updateOneOffIncome: (id, data) =>
    ipcRenderer.invoke("one-off-incomes:update", id, data),
  deleteOneOffIncome: (id) =>
    ipcRenderer.invoke("one-off-incomes:delete", id),

  getOneOffExpensesByPlan: (planId) =>
    ipcRenderer.invoke("one-off-expenses:getByPlan", planId),
  createOneOffExpense: (data) =>
    ipcRenderer.invoke("one-off-expenses:create", data),
  updateOneOffExpense: (id, data) =>
    ipcRenderer.invoke("one-off-expenses:update", id, data),
  deleteOneOffExpense: (id) =>
    ipcRenderer.invoke("one-off-expenses:delete", id),

  getSpendingPeriodsByPlan: (planId) =>
    ipcRenderer.invoke("spending-periods:getByPlan", planId),
  createSpendingPeriod: (data) =>
    ipcRenderer.invoke("spending-periods:create", data),
  updateSpendingPeriod: (id, data) =>
    ipcRenderer.invoke("spending-periods:update", id, data),
  deleteSpendingPeriod: (id) =>
    ipcRenderer.invoke("spending-periods:delete", id),
  replaceSpendingPeriods: (planId, periods) =>
    ipcRenderer.invoke("spending-periods:replaceAll", planId, periods),

  // Auto-update + shell helpers
  onUpdateAvailable: (callback) => {
    ipcRenderer.on("update-available", (_, version) => callback(version));
  },
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on("update-downloaded", (_, version) => callback(version));
  },
  onUpdateNotAvailable: (callback) => {
    ipcRenderer.on("update-not-available", () => callback());
  },
  checkForUpdates: () => ipcRenderer.invoke("updater:check"),
  restartToUpdate: () => ipcRenderer.send("restart-to-update"),
  openExternal: (url) => ipcRenderer.invoke("shell:openExternal", url),
});