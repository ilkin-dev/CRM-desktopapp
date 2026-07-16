// ============================================================
// Local data access layer — calls into window.crmAPI (exposed by
// preload.js), which talks to the main process's SQLite database over
// IPC. Function names/signatures match the previous Firestore-backed
// version exactly so views/*.js needed no changes when this replaced
// Firebase.
// ============================================================

export const STATUSES = [
  "New Lead",
  "Quoted",
  "Bound",
  "Active Client",
  "Renewal Due",
  "Referral Source",
  "Lapsed/Lost",
];

// ---------------- Clients ----------------

export async function listClients() {
  return window.crmAPI.clients.list();
}

export async function getClient(id) {
  return window.crmAPI.clients.get(id);
}

export async function createClient(data) {
  return window.crmAPI.clients.create(data);
}

export async function updateClient(id, data) {
  return window.crmAPI.clients.update(id, data);
}

export async function deleteClient(id) {
  return window.crmAPI.clients.delete(id);
}

// ---------------- Interactions ----------------

export async function listInteractionsForClient(clientId) {
  return window.crmAPI.interactions.listForClient(clientId);
}

export async function listAllInteractions() {
  return window.crmAPI.interactions.listAll();
}

export async function createInteraction(data) {
  return window.crmAPI.interactions.create(data);
}

// ---------------- Tasks (standalone, optionally linked to a client) ----------------

export async function listTasks() {
  return window.crmAPI.tasks.list();
}

export async function createTask(data) {
  return window.crmAPI.tasks.create(data);
}

export async function updateTask(id, data) {
  return window.crmAPI.tasks.update(id, data);
}

export async function deleteTask(id) {
  return window.crmAPI.tasks.delete(id);
}
