// ============================================================
// Local password gate. No accounts, no tokens — a single bcrypt hash
// stored in the settings table, plus an in-memory "unlocked" flag that
// resets to false every time the app process starts (that's the whole
// point of a lock screen: relaunching the app should ask again).
// ============================================================
const bcrypt = require("bcryptjs");

let unlocked = false;

function hasPassword(db) {
  return !!db.prepare("SELECT value FROM settings WHERE key = 'passwordHash'").get();
}

function setPassword(db, password) {
  const hash = bcrypt.hashSync(password, 10);
  db.prepare(`
    INSERT INTO settings (key, value) VALUES ('passwordHash', @hash)
    ON CONFLICT(key) DO UPDATE SET value = @hash
  `).run({ hash });
  unlocked = true;
}

function login(db, password) {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'passwordHash'").get();
  if (!row) return false;
  const ok = bcrypt.compareSync(password, row.value);
  if (ok) unlocked = true;
  return ok;
}

function logout() {
  unlocked = false;
}

function isUnlocked() {
  return unlocked;
}

module.exports = { hasPassword, setPassword, login, logout, isUnlocked };
