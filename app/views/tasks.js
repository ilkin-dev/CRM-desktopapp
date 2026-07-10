// ============================================================
// Tasks view: add/complete/delete standalone or client-linked tasks.
// ============================================================
import { listTasks, createTask, updateTask, deleteTask, listClients } from "../db.js";
import { fmtDate, daysUntil, escapeHtml, toast } from "../utils.js";
import { icon, hydrateIcons } from "../icons.js";

export async function renderTasks(content) {
  content.innerHTML = "";
  content.appendChild(document.getElementById("tpl-tasks").content.cloneNode(true));
  hydrateIcons(content);

  const [tasks, clients] = await Promise.all([listTasks(), listClients()]);
  const clientsById = Object.fromEntries(clients.map((c) => [c.id, c]));

  const clientSelect = document.getElementById("t-clientId");
  clients
    .slice()
    .sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""))
    .forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.fullName;
      clientSelect.appendChild(opt);
    });

  document.getElementById("task-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("t-title").value.trim();
    if (!title) return;
    await createTask({
      title,
      dueDate: document.getElementById("t-dueDate").value || null,
      clientId: document.getElementById("t-clientId").value || null,
      notes: document.getElementById("t-notes").value.trim(),
    });
    toast("Task added.", "success");
    renderTasks(content);
  });

  function taskRow(t) {
    const c = t.clientId ? clientsById[t.clientId] : null;
    const row = document.createElement("div");
    row.className = "task-row";
    const overdue = !t.done && t.dueDate && daysUntil(t.dueDate) < 0;
    row.innerHTML = `
      <input type="checkbox" ${t.done ? "checked" : ""} />
      <span class="task-title ${t.done ? "done" : ""}">${escapeHtml(t.title)}</span>
      ${c ? `<span class="task-client">${escapeHtml(c.fullName)}</span>` : ""}
      <span class="task-due" style="${overdue ? "color:#c0392b;font-weight:bold;" : ""}">${t.dueDate ? fmtDate(t.dueDate) : ""}</span>
      <button class="btn btn-ghost" style="padding:4px 10px;font-size:12px;">${icon("trash", { className: "icon-sm" })} Delete</button>
    `;
    row.querySelector('input[type="checkbox"]').addEventListener("change", async (ev) => {
      await updateTask(t.id, { done: ev.target.checked });
      renderTasks(content);
    });
    row.querySelector("button").addEventListener("click", async () => {
      if (confirm(`Delete task "${t.title}"?`)) {
        await deleteTask(t.id);
        toast("Task deleted.", "success");
        renderTasks(content);
      }
    });
    return row;
  }

  const openList = document.getElementById("tasks-open-list");
  const doneList = document.getElementById("tasks-done-list");
  const open = tasks.filter((t) => !t.done).sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"));
  const done = tasks.filter((t) => t.done);

  openList.innerHTML = "";
  if (open.length === 0) openList.innerHTML = '<div class="empty-note">No open tasks.</div>';
  else open.forEach((t) => openList.appendChild(taskRow(t)));

  doneList.innerHTML = "";
  if (done.length === 0) doneList.innerHTML = '<div class="empty-note">Nothing completed yet.</div>';
  else done.forEach((t) => doneList.appendChild(taskRow(t)));
}
