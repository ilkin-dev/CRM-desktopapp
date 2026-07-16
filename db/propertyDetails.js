// ============================================================
// PropertyDetails data access — one row per Home/Condo/Tenant policy
// (policyId is UNIQUE), so this is a get-or-create "upsert" rather
// than a list/create/update/delete CRUD set.
// ============================================================
const { normalizeParams, toFlag, newId, nowIso } = require("./helpers");

const FLAG_COLUMNS = ["hasPool", "hasTrampoline", "hasPets", "securitySystem", "sumpPump", "backwaterValve"];
const COLUMNS = [
  "propertyType", "yearBuilt", "squareFootage", "stories", "constructionType", "roofType",
  "roofAge", "heatingType", "electricalType", "electricalAmps", "electricalUpdatedYear",
  "plumbingType", "plumbingUpdatedYear", "foundationType", "basementType", "bedrooms",
  "bathrooms", "waterSource", "sewerType", "distanceToFireHydrantKm", "distanceToFireHallKm",
  ...FLAG_COLUMNS, "petDetails", "priorWaterDamageClaims", "mortgageLienholder", "replacementCostEstimate",
];

function rowToPropertyDetails(row) {
  if (!row) return row;
  const result = { ...row };
  FLAG_COLUMNS.forEach((c) => { result[c] = !!row[c]; });
  return result;
}

function toStoredParams(data, cols) {
  const params = normalizeParams(data, cols);
  FLAG_COLUMNS.forEach((c) => {
    if (c in data) params[c] = toFlag(data[c]);
  });
  return params;
}

function getForPolicy(db, policyId) {
  return rowToPropertyDetails(db.prepare("SELECT * FROM property_details WHERE policyId = ?").get(policyId));
}

function upsert(db, policyId, data) {
  const existing = db.prepare("SELECT id FROM property_details WHERE policyId = ?").get(policyId);
  if (existing) {
    const cols = COLUMNS.filter((c) => c in data);
    if (cols.length > 0) {
      const params = { policyId, updatedAt: nowIso(), ...toStoredParams(data, cols) };
      const setClause = cols.map((c) => `${c} = @${c}`).join(", ");
      db.prepare(`UPDATE property_details SET ${setClause}, updatedAt = @updatedAt WHERE policyId = @policyId`).run(params);
    }
    return { id: existing.id };
  }
  const id = newId();
  const now = nowIso();
  const params = { id, policyId, createdAt: now, updatedAt: now, ...toStoredParams(data, COLUMNS) };
  db.prepare(`
    INSERT INTO property_details (id, policyId, ${COLUMNS.join(", ")}, createdAt, updatedAt)
    VALUES (@id, @policyId, ${COLUMNS.map((c) => "@" + c).join(", ")}, @createdAt, @updatedAt)
  `).run(params);
  return { id };
}

module.exports = { getForPolicy, upsert };
