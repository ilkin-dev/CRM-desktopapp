// ============================================================
// Client document data access. Files live on disk under
// `documentsRoot/{clientId}/{category}/{timestamp}_{filename}`; this
// table just indexes them with metadata (SQLite has no equivalent of
// Storage's listAll()/getMetadata(), so we need a real table now).
//
// The `id` returned to the renderer doubles as the opaque "path"
// value the existing views/client-detail.js already round-trips
// through listClientDocuments() -> deleteClientDocument(doc.path),
// so that call site needs no changes.
// ============================================================
const fs = require("fs");
const path = require("path");
const { newId, nowIso } = require("./helpers");

function slug(str) {
  return String(str).replace(/[^a-zA-Z0-9]+/g, "-");
}

function buildCrmFileUrl(filePath) {
  const segments = filePath.split(path.sep).filter(Boolean).map(encodeURIComponent);
  return "crm-file:///" + segments.join("/");
}

function rowToDocument(row) {
  return {
    id: row.id,
    path: row.id,
    name: row.name,
    category: row.category,
    url: buildCrmFileUrl(row.filePath),
    contentType: row.contentType,
    uploadedAt: row.uploadedAt,
  };
}

function upload(db, documentsRoot, { clientId, category, name, contentType, data }) {
  const id = newId();
  const dir = path.join(documentsRoot, clientId, slug(category || "Other"));
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${Date.now()}_${name}`);
  fs.writeFileSync(filePath, Buffer.from(data));

  const uploadedAt = nowIso();
  db.prepare(`
    INSERT INTO documents (id, clientId, policyId, category, name, filePath, contentType, uploadedAt)
    VALUES (@id, @clientId, NULL, @category, @name, @filePath, @contentType, @uploadedAt)
  `).run({ id, clientId, category: category || "Other", name, filePath, contentType: contentType || "", uploadedAt });

  return rowToDocument({ id, category: category || "Other", name, filePath, contentType: contentType || "", uploadedAt });
}

function listForClient(db, clientId) {
  return db
    .prepare("SELECT * FROM documents WHERE clientId = ? ORDER BY uploadedAt DESC")
    .all(clientId)
    .map(rowToDocument);
}

function remove(db, id) {
  const row = db.prepare("SELECT * FROM documents WHERE id = ?").get(id);
  if (!row) return;
  db.prepare("DELETE FROM documents WHERE id = ?").run(id);
  try {
    fs.unlinkSync(row.filePath);
  } catch (err) {
    // File already missing on disk — the index row is still removed, not fatal.
  }
}

module.exports = { upload, listForClient, remove };
