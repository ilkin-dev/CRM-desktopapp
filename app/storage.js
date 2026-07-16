// ============================================================
// Local document storage access layer. Files are saved to disk by the
// main process (see db/documents.js) and indexed in SQLite; this
// module just wraps window.crmAPI.documents.* with the same function
// names/shapes the previous Firebase Storage version exposed, so
// views/client-detail.js needed no changes.
// ============================================================

export const DOCUMENT_CATEGORIES = [
  "Driver's License",
  "Vehicle Photo",
  "Bill of Sale",
  "Finance Application",
  "Proof of Insurance",
  "Policy Declaration Page",
  "Home Inspection Report",
  "Prior Insurance Pink Slip",
  "Other",
];

export async function uploadClientDocument(clientId, category, file) {
  const data = await file.arrayBuffer();
  return window.crmAPI.documents.upload({
    clientId,
    category,
    name: file.name,
    contentType: file.type,
    data,
  });
}

export async function listClientDocuments(clientId) {
  return window.crmAPI.documents.listForClient(clientId);
}

export async function deleteClientDocument(path) {
  // `path` is the opaque id documents:listForClient's rows carry in
  // their .path field (see db/documents.js) — not a filesystem path.
  return window.crmAPI.documents.delete(path);
}
