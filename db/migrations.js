// ============================================================
// Tiny hand-rolled migration runner. Applies numbered .sql files from
// db/migrations/ in order, tracked in a schema_migrations table, once
// at app startup before any IPC handler is registered.
// ============================================================
const fs = require("fs");
const path = require("path");

function runMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      appliedAt TEXT NOT NULL
    );
  `);

  const migrationsDir = path.join(__dirname, "migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const applied = new Set(
    db.prepare("SELECT version FROM schema_migrations").all().map((r) => r.version)
  );

  for (const file of files) {
    const version = parseInt(file.slice(0, 3), 10);
    if (applied.has(version)) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    const apply = db.transaction(() => {
      db.exec(sql);
      db.prepare("INSERT INTO schema_migrations (version, appliedAt) VALUES (?, ?)").run(
        version,
        new Date().toISOString()
      );
    });
    apply();
  }
}

module.exports = { runMigrations };
