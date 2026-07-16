// ============================================================
// Task data access.
// ============================================================
const { toNullable, toFlag, newId, nowIso } = require("./helpers");

function rowToTask(row) {
  if (!row) return row;
  return { ...row, done: !!row.done };
}

function list(db) {
  return db.prepare("SELECT * FROM tasks").all().map(rowToTask);
}

function create(db, data) {
  const id = newId();
  db.prepare(`
    INSERT INTO tasks (id, title, dueDate, done, notes, clientId, createdAt)
    VALUES (@id, @title, @dueDate, 0, @notes, @clientId, @createdAt)
  `).run({
    id,
    title: data.title,
    dueDate: toNullable(data.dueDate),
    notes: toNullable(data.notes),
    clientId: toNullable(data.clientId),
    createdAt: nowIso(),
  });
  return { id };
}

function update(db, id, data) {
  const fields = [];
  const params = { id };
  if ("done" in data) {
    fields.push("done = @done");
    params.done = toFlag(data.done);
  }
  if ("title" in data) {
    fields.push("title = @title");
    params.title = data.title;
  }
  if ("dueDate" in data) {
    fields.push("dueDate = @dueDate");
    params.dueDate = toNullable(data.dueDate);
  }
  if ("notes" in data) {
    fields.push("notes = @notes");
    params.notes = toNullable(data.notes);
  }
  if ("clientId" in data) {
    fields.push("clientId = @clientId");
    params.clientId = toNullable(data.clientId);
  }
  if (fields.length === 0) return;
  db.prepare(`UPDATE tasks SET ${fields.join(", ")} WHERE id = @id`).run(params);
}

function remove(db, id) {
  db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
}

module.exports = { list, create, update, remove };
