// ============================================================
// Vehicle data access (one auto policy -> many vehicles).
// ============================================================
const { normalizeParams, toFlag, newId, nowIso } = require("./helpers");

const COLUMNS = [
  "year", "make", "model", "trim", "vin", "bodyType", "usage", "annualKm", "commuteKm",
  "purchaseDate", "ownership", "lienholder", "antiTheftDevice", "winterTires", "garagingAddress",
];

function rowToVehicle(row) {
  if (!row) return row;
  return { ...row, antiTheftDevice: !!row.antiTheftDevice, winterTires: !!row.winterTires };
}

function toStoredParams(data, cols) {
  const params = normalizeParams(data, cols);
  if ("antiTheftDevice" in data) params.antiTheftDevice = toFlag(data.antiTheftDevice);
  if ("winterTires" in data) params.winterTires = toFlag(data.winterTires);
  return params;
}

function listForPolicy(db, policyId) {
  return db.prepare("SELECT * FROM vehicles WHERE policyId = ?").all(policyId).map(rowToVehicle);
}

function create(db, data) {
  const id = newId();
  const params = { id, policyId: data.policyId, createdAt: nowIso(), ...toStoredParams(data, COLUMNS) };
  db.prepare(`
    INSERT INTO vehicles (id, policyId, ${COLUMNS.join(", ")}, createdAt)
    VALUES (@id, @policyId, ${COLUMNS.map((c) => "@" + c).join(", ")}, @createdAt)
  `).run(params);
  return { id };
}

function update(db, id, data) {
  const cols = COLUMNS.filter((c) => c in data);
  if (cols.length === 0) return;
  const params = { id, ...toStoredParams(data, cols) };
  const setClause = cols.map((c) => `${c} = @${c}`).join(", ");
  db.prepare(`UPDATE vehicles SET ${setClause} WHERE id = @id`).run(params);
}

function remove(db, id) {
  db.prepare("DELETE FROM vehicles WHERE id = ?").run(id);
}

module.exports = { listForPolicy, create, update, remove };
