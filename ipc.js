// ============================================================
// Registers every ipcMain.handle channel the renderer's preload
// bridge (window.crmAPI) calls into. Every channel except the auth
// ones requires the app to be unlocked first (defense in depth on
// top of the renderer's own login-gated UI).
// ============================================================
const fs = require("fs");
const path = require("path");

const authModule = require("./db/auth");
const clientsModule = require("./db/clients");
const interactionsModule = require("./db/interactions");
const tasksModule = require("./db/tasks");
const documentsModule = require("./db/documents");
const policiesModule = require("./db/policies");
const vehiclesModule = require("./db/vehicles");
const driversModule = require("./db/drivers");
const propertyDetailsModule = require("./db/propertyDetails");
const householdMembersModule = require("./db/householdMembers");

function registerIpcHandlers(ipcMain, db, documentsRoot) {
  const handle = (channel, fn) => {
    ipcMain.handle(channel, (event, ...args) => {
      if (!authModule.isUnlocked()) return Promise.reject(new Error("Not authenticated."));
      return fn(...args);
    });
  };

  // ---- Auth (no unlock check — these are how you unlock) ----
  ipcMain.handle("auth:hasPassword", () => authModule.hasPassword(db));
  ipcMain.handle("auth:setPassword", (event, password) => authModule.setPassword(db, password));
  ipcMain.handle("auth:login", (event, password) => authModule.login(db, password));
  ipcMain.handle("auth:logout", () => authModule.logout());

  // ---- Clients ----
  handle("clients:list", () => clientsModule.list(db));
  handle("clients:get", (id) => clientsModule.get(db, id));
  handle("clients:create", (data) => clientsModule.create(db, data));
  handle("clients:update", (id, data) => clientsModule.update(db, id, data));
  handle("clients:delete", (id) => {
    clientsModule.remove(db, id);
    try {
      fs.rmSync(path.join(documentsRoot, id), { recursive: true, force: true });
    } catch (err) {
      // Nothing to clean up — not fatal.
    }
  });

  // ---- Interactions ----
  handle("interactions:listForClient", (clientId) => interactionsModule.listForClient(db, clientId));
  handle("interactions:listAll", () => interactionsModule.listAll(db));
  handle("interactions:create", (data) => interactionsModule.create(db, data));

  // ---- Tasks ----
  handle("tasks:list", () => tasksModule.list(db));
  handle("tasks:create", (data) => tasksModule.create(db, data));
  handle("tasks:update", (id, data) => tasksModule.update(db, id, data));
  handle("tasks:delete", (id) => tasksModule.remove(db, id));

  // ---- Documents ----
  handle("documents:upload", (payload) => documentsModule.upload(db, documentsRoot, payload));
  handle("documents:listForClient", (clientId) => documentsModule.listForClient(db, clientId));
  handle("documents:delete", (id) => documentsModule.remove(db, id));

  // ---- Policies ----
  handle("policies:listForClient", (clientId) => policiesModule.listForClient(db, clientId));
  handle("policies:get", (id) => policiesModule.get(db, id));
  handle("policies:create", (data) => policiesModule.create(db, data));
  handle("policies:update", (id, data) => policiesModule.update(db, id, data));
  handle("policies:delete", (id) => policiesModule.remove(db, id));

  // ---- Vehicles ----
  handle("vehicles:listForPolicy", (policyId) => vehiclesModule.listForPolicy(db, policyId));
  handle("vehicles:create", (data) => vehiclesModule.create(db, data));
  handle("vehicles:update", (id, data) => vehiclesModule.update(db, id, data));
  handle("vehicles:delete", (id) => vehiclesModule.remove(db, id));

  // ---- Drivers ----
  handle("drivers:listForClient", (clientId) => driversModule.listForClient(db, clientId));
  handle("drivers:create", (data) => driversModule.create(db, data));
  handle("drivers:update", (id, data) => driversModule.update(db, id, data));
  handle("drivers:delete", (id) => driversModule.remove(db, id));
  handle("drivers:assignToVehicle", (vehicleId, driverId) => driversModule.assignToVehicle(db, vehicleId, driverId));
  handle("drivers:unassignFromVehicle", (vehicleId, driverId) => driversModule.unassignFromVehicle(db, vehicleId, driverId));
  handle("drivers:listRecordEntries", (driverId) => driversModule.listRecordEntries(db, driverId));
  handle("drivers:addRecordEntry", (driverId, data) => driversModule.addRecordEntry(db, driverId, data));

  // ---- Property details ----
  handle("propertyDetails:getForPolicy", (policyId) => propertyDetailsModule.getForPolicy(db, policyId));
  handle("propertyDetails:upsert", (policyId, data) => propertyDetailsModule.upsert(db, policyId, data));

  // ---- Household members ----
  handle("householdMembers:listForClient", (clientId) => householdMembersModule.listForClient(db, clientId));
  handle("householdMembers:create", (data) => householdMembersModule.create(db, data));
  handle("householdMembers:delete", (id) => householdMembersModule.remove(db, id));
}

module.exports = { registerIpcHandlers };
