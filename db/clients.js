// ============================================================
// Client data access. `db` is the better-sqlite3 connection, passed
// in by ipc.js rather than imported here, keeping this module a pure
// function of (db, args) -> result.
// ============================================================
const { normalizeParams, newId, nowIso } = require("./helpers");

const COLUMNS = [
  "fullName", "status", "phone", "email", "lineOfBusiness", "carrier", "renewalDate",
  "referralSource", "notes", "dateOfBirth", "maritalStatus", "occupation", "employer",
  "secondaryPhone", "mailingAddress", "mailingCity", "mailingProvince", "mailingPostalCode",
  "propertyAddressSameAsMailing", "propertyAddress", "propertyCity", "propertyProvince",
  "propertyPostalCode", "preferredContactMethod", "preferredContactTime", "language",
  "driversLicenseNumber", "licenseProvince", "licenseExpiry", "yearsLicensed", "licenseClass",
];

function list(db) {
  return db.prepare("SELECT * FROM clients ORDER BY fullName").all();
}

function get(db, id) {
  return db.prepare("SELECT * FROM clients WHERE id = ?").get(id) || null;
}

function create(db, data) {
  const id = newId();
  const now = nowIso();
  const params = { id, createdAt: now, updatedAt: now, ...normalizeParams(data, COLUMNS) };
  db.prepare(`
    INSERT INTO clients (id, ${COLUMNS.join(", ")}, createdAt, updatedAt)
    VALUES (@id, ${COLUMNS.map((c) => "@" + c).join(", ")}, @createdAt, @updatedAt)
  `).run(params);
  return { id };
}

function update(db, id, data) {
  const cols = COLUMNS.filter((c) => c in data);
  if (cols.length === 0) return;
  const params = { id, updatedAt: nowIso(), ...normalizeParams(data, cols) };
  const setClause = cols.map((c) => `${c} = @${c}`).join(", ");
  db.prepare(`UPDATE clients SET ${setClause}, updatedAt = @updatedAt WHERE id = @id`).run(params);
}

function remove(db, id) {
  db.prepare("DELETE FROM clients WHERE id = ?").run(id); // cascades to interactions/policies/etc.
}

module.exports = { list, get, create, update, remove };
