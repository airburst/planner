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
  deletePeopleByPlan: (planId) => ipcRenderer.invoke("people:deleteByPlan", planId)
});