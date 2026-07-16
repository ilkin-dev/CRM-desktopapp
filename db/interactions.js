// ============================================================
// Interaction (timeline entry) data access.
// ============================================================
const { toNullable, toFlag, newId, nowIso } = require("./helpers");

function rowToInteraction(row) {
  if (!row) return row;
  return { ...row, followUpDone: !!row.followUpDone };
}

function listForClient(db, clientId) {
  return db
    .prepare("SELECT * FROM interactions WHERE clientId = ? ORDER BY date DESC")
    .all(clientId)
    .map(rowToInteraction);
}

function listAll(db) {
  return db.prepare("SELECT * FROM interactions").all().map(rowToInteraction);
}

function create(db, data) {
  const id = newId();
  const now = nowIso();
  db.prepare(`
    INSERT INTO interactions (
      id, clientId, policyId, type, date, summary, quoteAmount, quoteLOB,
      followUpDate, followUpDone, premiumAmount, commissionRate, commissionAmount, createdAt
    ) VALUES (
      @id, @clientId, @policyId, @type, @date, @summary, @quoteAmount, @quoteLOB,
      @followUpDate, @followUpDone, @premiumAmount, @commissionRate, @commissionAmount, @createdAt
    )
  `).run({
    id,
    clientId: data.clientId,
    policyId: toNullable(data.policyId),
    type: data.type,
    date: toNullable(data.date),
    summary: toNullable(data.summary),
    quoteAmount: toNullable(data.quoteAmount),
    quoteLOB: toNullable(data.quoteLOB),
    followUpDate: toNullable(data.followUpDate),
    followUpDone: toFlag(data.followUpDone),
    premiumAmount: toNullable(data.premiumAmount),
    commissionRate: toNullable(data.commissionRate),
    commissionAmount: toNullable(data.commissionAmount),
    createdAt: now,
  });
  return { id };
}

module.exports = { listForClient, listAll, create };
