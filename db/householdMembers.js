// ============================================================
// Household member data access (one client -> many dependents/spouse/etc).
// ============================================================
const { toNullable, newId, nowIso } = require("./helpers");

function listForClient(db, clientId) {
  return db.prepare("SELECT * FROM household_members WHERE clientId = ?").all(clientId);
}

function create(db, data) {
  const id = newId();
  db.prepare(`
    INSERT INTO household_members (id, clientId, fullName, dateOfBirth, relationship, createdAt)
    VALUES (@id, @clientId, @fullName, @dateOfBirth, @relationship, @createdAt)
  `).run({
    id,
    clientId: data.clientId,
    fullName: data.fullName,
    dateOfBirth: toNullable(data.dateOfBirth),
    relationship: toNullable(data.relationship),
    createdAt: nowIso(),
  });
  return { id };
}

function remove(db, id) {
  db.prepare("DELETE FROM household_members WHERE id = ?").run(id);
}

module.exports = { listForClient, create, remove };
