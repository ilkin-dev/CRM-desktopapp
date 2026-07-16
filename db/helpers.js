// ============================================================
// Small shared helpers for the data-access modules in this folder.
// better-sqlite3 rejects `undefined` bound parameters, so every
// insert/update normalizes missing fields to `null` here rather than
// at each call site.
// ============================================================
const crypto = require("crypto");

function toNullable(v) {
  return v === undefined ? null : v;
}

function toFlag(v) {
  if (v === undefined || v === null) return 0;
  return v ? 1 : 0;
}

// Builds a params object with every column present (undefined -> null)
// for use with a named-parameter INSERT/UPDATE statement.
function normalizeParams(data, columns) {
  const params = {};
  columns.forEach((col) => {
    params[col] = toNullable(data[col]);
  });
  return params;
}

function newId() {
  return crypto.randomUUID();
}

function nowIso() {
  return new Date().toISOString();
}

module.exports = { toNullable, toFlag, normalizeParams, newId, nowIso };
