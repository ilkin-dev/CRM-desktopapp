// ============================================================
// Opens the local SQLite database and runs pending migrations.
// Takes the target file path as a parameter (rather than reaching
// into Electron's `app` module itself) so this module stays a plain
// Node module the main process wires up, not an Electron-coupled one.
// ============================================================
const Database = require("better-sqlite3");
const { runMigrations } = require("./migrations");

function openDatabase(dbFilePath) {
  const db = new Database(dbFilePath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  runMigrations(db);
  return db;
}

module.exports = { openDatabase };
