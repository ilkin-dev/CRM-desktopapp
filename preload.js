// ============================================================
// Preload script: the only bridge between the sandboxed renderer and
// the main process. contextIsolation stays on and nodeIntegration
// stays off in the BrowserWindow — the renderer only ever sees the
// whitelisted window.crmAPI surface below, never raw ipcRenderer,
// fs, or the SQLite connection.
// ============================================================
const { contextBridge, ipcRenderer } = require("electron");

function invoke(channel) {
  return (...args) => ipcRenderer.invoke(channel, ...args);
}

contextBridge.exposeInMainWorld("crmAPI", {
  auth: {
    hasPassword: invoke("auth:hasPassword"),
    setPassword: invoke("auth:setPassword"),
    login: invoke("auth:login"),
    logout: invoke("auth:logout"),
  },
  clients: {
    list: invoke("clients:list"),
    get: invoke("clients:get"),
    create: invoke("clients:create"),
    update: invoke("clients:update"),
    delete: invoke("clients:delete"),
  },
  interactions: {
    listForClient: invoke("interactions:listForClient"),
    listAll: invoke("interactions:listAll"),
    create: invoke("interactions:create"),
  },
  tasks: {
    list: invoke("tasks:list"),
    create: invoke("tasks:create"),
    update: invoke("tasks:update"),
    delete: invoke("tasks:delete"),
  },
  documents: {
    upload: invoke("documents:upload"),
    listForClient: invoke("documents:listForClient"),
    delete: invoke("documents:delete"),
  },
  policies: {
    listForClient: invoke("policies:listForClient"),
    get: invoke("policies:get"),
    create: invoke("policies:create"),
    update: invoke("policies:update"),
    delete: invoke("policies:delete"),
  },
  vehicles: {
    listForPolicy: invoke("vehicles:listForPolicy"),
    create: invoke("vehicles:create"),
    update: invoke("vehicles:update"),
    delete: invoke("vehicles:delete"),
  },
  drivers: {
    listForClient: invoke("drivers:listForClient"),
    create: invoke("drivers:create"),
    update: invoke("drivers:update"),
    delete: invoke("drivers:delete"),
    assignToVehicle: invoke("drivers:assignToVehicle"),
    unassignFromVehicle: invoke("drivers:unassignFromVehicle"),
    listRecordEntries: invoke("drivers:listRecordEntries"),
    addRecordEntry: invoke("drivers:addRecordEntry"),
  },
  propertyDetails: {
    getForPolicy: invoke("propertyDetails:getForPolicy"),
    upsert: invoke("propertyDetails:upsert"),
  },
  householdMembers: {
    listForClient: invoke("householdMembers:listForClient"),
    create: invoke("householdMembers:create"),
    delete: invoke("householdMembers:delete"),
  },
});
