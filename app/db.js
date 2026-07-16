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

export const POLICY_TYPES = ["Auto", "Home", "Tenant", "Condo", "Umbrella", "Business", "Other"];
export const POLICY_STATUSES = ["Active", "Pending", "Lapsed", "Cancelled"];
export const PAYMENT_FREQUENCIES = ["Annual", "Monthly", "EFT"];
export const COMMON_ENDORSEMENTS = [
  "Accident Forgiveness", "Loss of Use", "Water Damage", "Identity Theft",
  "Waiver of Depreciation", "Roadside Assistance", "Rental Reimbursement",
  "Scheduled Personal Property",
];

export const VEHICLE_USAGE_OPTIONS = ["Pleasure", "Commute", "Business"];
export const VEHICLE_OWNERSHIP_OPTIONS = ["Owned", "Financed", "Leased"];

export const DRIVER_RELATIONSHIPS = ["Self", "Spouse", "Child", "Other"];
export const HOUSEHOLD_RELATIONSHIPS = ["Spouse", "Child", "Parent", "Other"];
export const DRIVING_RECORD_TYPES = ["Violation", "Claim"];

export const CONTACT_METHODS = ["Phone", "Email", "Text"];

export const PROPERTY_TYPES = ["House", "Condo", "Townhouse", "Tenant"];
export const CONSTRUCTION_TYPES = ["Wood Frame", "Brick", "Concrete", "Stucco", "Other"];
export const ROOF_TYPES = ["Asphalt Shingle", "Metal", "Tile", "Flat/Membrane", "Other"];
export const HEATING_TYPES = ["Forced Air Gas", "Forced Air Oil", "Electric Baseboard", "Heat Pump", "Radiant", "Other"];
export const ELECTRICAL_TYPES = ["Breakers", "Fuses", "Knob & Tube"];
export const PLUMBING_TYPES = ["Copper", "PEX", "Galvanized", "Other"];
export const FOUNDATION_TYPES = ["Poured Concrete", "Block", "Stone", "Other"];
export const BASEMENT_TYPES = ["None", "Unfinished", "Finished", "Walkout"];
export const WATER_SOURCES = ["Municipal", "Well"];
export const SEWER_TYPES = ["Municipal", "Septic"];

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

// ---------------- Household members ----------------

export async function listHouseholdMembers(clientId) {
  return window.crmAPI.householdMembers.listForClient(clientId);
}

export async function createHouseholdMember(data) {
  return window.crmAPI.householdMembers.create(data);
}

export async function deleteHouseholdMember(id) {
  return window.crmAPI.householdMembers.delete(id);
}

// ---------------- Policies ----------------

export async function listPoliciesForClient(clientId) {
  return window.crmAPI.policies.listForClient(clientId);
}

export async function getPolicy(id) {
  return window.crmAPI.policies.get(id);
}

export async function createPolicy(data) {
  return window.crmAPI.policies.create(data);
}

export async function updatePolicy(id, data) {
  return window.crmAPI.policies.update(id, data);
}

export async function deletePolicy(id) {
  return window.crmAPI.policies.delete(id);
}

// ---------------- Vehicles ----------------

export async function listVehiclesForPolicy(policyId) {
  return window.crmAPI.vehicles.listForPolicy(policyId);
}

export async function createVehicle(data) {
  return window.crmAPI.vehicles.create(data);
}

export async function updateVehicle(id, data) {
  return window.crmAPI.vehicles.update(id, data);
}

export async function deleteVehicle(id) {
  return window.crmAPI.vehicles.delete(id);
}

// ---------------- Drivers ----------------

export async function listDriversForClient(clientId) {
  return window.crmAPI.drivers.listForClient(clientId);
}

export async function createDriver(data) {
  return window.crmAPI.drivers.create(data);
}

export async function updateDriver(id, data) {
  return window.crmAPI.drivers.update(id, data);
}

export async function deleteDriver(id) {
  return window.crmAPI.drivers.delete(id);
}

export async function listDrivingRecordEntries(driverId) {
  return window.crmAPI.drivers.listRecordEntries(driverId);
}

export async function addDrivingRecordEntry(driverId, data) {
  return window.crmAPI.drivers.addRecordEntry(driverId, data);
}

// ---------------- Property details ----------------

export async function getPropertyDetails(policyId) {
  return window.crmAPI.propertyDetails.getForPolicy(policyId);
}

export async function savePropertyDetails(policyId, data) {
  return window.crmAPI.propertyDetails.upsert(policyId, data);
}
