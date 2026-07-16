// ============================================================
// Policy data access. deductibles/endorsements/additionalInsureds are
// stored as JSON text columns (their shape varies by policy type) and
// parsed/stringified at this boundary so callers always see real JS
// values, never raw JSON strings.
// ============================================================
const { normalizeParams, newId, nowIso } = require("./helpers");

const SCALAR_COLUMNS = [
  "type", "carrier", "policyNumber", "status", "effectiveDate", "renewalDate",
  "premium", "paymentFrequency", "priorCarrier", "claimsFreeYears", "liabilityLimit", "notes",
];
const JSON_COLUMNS = ["deductibles", "endorsements", "additionalInsureds"];
const ALL_COLUMNS = [...SCALAR_COLUMNS, ...JSON_COLUMNS];

function rowToPolicy(row) {
  if (!row) return row;
  const policy = { ...row };
  JSON_COLUMNS.forEach((col) => {
    policy[col] = row[col] ? JSON.parse(row[col]) : col === "deductibles" ? {} : [];
  });
  return policy;
}

function toStoredParams(data) {
  const params = normalizeParams(data, SCALAR_COLUMNS);
  JSON_COLUMNS.forEach((col) => {
    params[col] = col in data ? JSON.stringify(data[col]) : null;
  });
  return params;
}

function listForClient(db, clientId) {
  return db
    .prepare("SELECT * FROM policies WHERE clientId = ? ORDER BY renewalDate")
    .all(clientId)
    .map(rowToPolicy);
}

function get(db, id) {
  return rowToPolicy(db.prepare("SELECT * FROM policies WHERE id = ?").get(id));
}

function create(db, data) {
  const id = newId();
  const now = nowIso();
  const params = { id, clientId: data.clientId, createdAt: now, updatedAt: now, ...toStoredParams(data) };
  db.prepare(`
    INSERT INTO policies (id, clientId, ${ALL_COLUMNS.join(", ")}, createdAt, updatedAt)
    VALUES (@id, @clientId, ${ALL_COLUMNS.map((c) => "@" + c).join(", ")}, @createdAt, @updatedAt)
  `).run(params);
  return { id };
}

function update(db, id, data) {
  const cols = ALL_COLUMNS.filter((c) => c in data);
  if (cols.length === 0) return;
  const params = { id, updatedAt: nowIso(), ...toStoredParams(data) };
  const setClause = cols.map((c) => `${c} = @${c}`).join(", ");
  db.prepare(`UPDATE policies SET ${setClause}, updatedAt = @updatedAt WHERE id = @id`).run(params);
}

function remove(db, id) {
  db.prepare("DELETE FROM policies WHERE id = ?").run(id); // cascades to vehicles/property_details
}

module.exports = { listForClient, get, create, update, remove };
