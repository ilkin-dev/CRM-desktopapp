// ============================================================
// Driver data access (one client -> many drivers), plus the
// vehicle_drivers assignment join table and driving_record_entries
// (violations/claims) that hang off a driver.
// ============================================================
const { normalizeParams, toNullable, newId, nowIso } = require("./helpers");

const COLUMNS = [
  "fullName", "dateOfBirth", "relationship", "licenseNumber", "licenseProvince",
  "licenseExpiry", "licenseClass", "yearsLicensed",
];

function listForClient(db, clientId) {
  return db.prepare("SELECT * FROM drivers WHERE clientId = ?").all(clientId);
}

function create(db, data) {
  const id = newId();
  const params = { id, clientId: data.clientId, createdAt: nowIso(), ...normalizeParams(data, COLUMNS) };
  db.prepare(`
    INSERT INTO drivers (id, clientId, ${COLUMNS.join(", ")}, createdAt)
    VALUES (@id, @clientId, ${COLUMNS.map((c) => "@" + c).join(", ")}, @createdAt)
  `).run(params);
  return { id };
}

function update(db, id, data) {
  const cols = COLUMNS.filter((c) => c in data);
  if (cols.length === 0) return;
  const params = { id, ...normalizeParams(data, cols) };
  const setClause = cols.map((c) => `${c} = @${c}`).join(", ");
  db.prepare(`UPDATE drivers SET ${setClause} WHERE id = @id`).run(params);
}

function remove(db, id) {
  db.prepare("DELETE FROM drivers WHERE id = ?").run(id);
}

function assignToVehicle(db, vehicleId, driverId) {
  db.prepare("INSERT OR IGNORE INTO vehicle_drivers (vehicleId, driverId) VALUES (?, ?)").run(vehicleId, driverId);
}

function unassignFromVehicle(db, vehicleId, driverId) {
  db.prepare("DELETE FROM vehicle_drivers WHERE vehicleId = ? AND driverId = ?").run(vehicleId, driverId);
}

function listRecordEntries(db, driverId) {
  return db
    .prepare("SELECT * FROM driving_record_entries WHERE driverId = ? ORDER BY date DESC")
    .all(driverId)
    .map((row) => ({ ...row, atFault: row.atFault === null ? null : !!row.atFault }));
}

function addRecordEntry(db, driverId, data) {
  const id = newId();
  db.prepare(`
    INSERT INTO driving_record_entries (id, driverId, type, date, description, amount, atFault, createdAt)
    VALUES (@id, @driverId, @type, @date, @description, @amount, @atFault, @createdAt)
  `).run({
    id,
    driverId,
    type: data.type,
    date: toNullable(data.date),
    description: toNullable(data.description),
    amount: toNullable(data.amount),
    atFault: data.atFault === undefined || data.atFault === null ? null : data.atFault ? 1 : 0,
    createdAt: nowIso(),
  });
  return { id };
}

module.exports = {
  listForClient, create, update, remove,
  assignToVehicle, unassignFromVehicle,
  listRecordEntries, addRecordEntry,
};
