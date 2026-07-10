// ============================================================
// Shared formatting/DOM helpers used across view modules.
// ============================================================
import { icon, typeIcon } from "./icons.js";

export const LOB_OPTIONS = ["Auto", "Home", "Auto + Home Bundle", "Tenant", "Condo", "Business/Commercial", "Umbrella", "Other"];

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d + "T00:00:00");
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.round((target - today) / 86400000);
}

export function todayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export function statusClass(status) {
  return "status-" + String(status).replace(/[^a-zA-Z0-9]+/g, "-");
}

const STATUS_ICON = {
  "New Lead": "new-lead",
  Quoted: "quoted",
  Bound: "bound",
  "Active Client": "active-client",
  "Renewal Due": "renewal-due",
  "Referral Source": "referral-source",
  "Lapsed/Lost": "lapsed",
};
export function statusIcon(status) {
  return icon(STATUS_ICON[status] || "other", { className: "icon-sm" });
}

const LOB_ICON = {
  Auto: "auto",
  Home: "home",
  "Auto + Home Bundle": "bundle",
  Tenant: "tenant",
  Condo: "condo",
  "Business/Commercial": "business",
  Umbrella: "umbrella",
  Other: "other",
};
export function lobIcon(lob) {
  return icon(LOB_ICON[lob] || "other", { className: "icon-sm" });
}

const DOC_ICON = {
  "Driver's License": "license",
  "Vehicle Photo": "vehicle-photo",
  "Bill of Sale": "bill-of-sale",
  "Finance Application": "finance-app",
  "Proof of Insurance": "proof-of-insurance",
  Other: "folder",
};
export function docIcon(cat) {
  return icon(DOC_ICON[cat] || "folder", { className: "icon-sm" });
}

export function interactionTypeIcon(type) {
  return typeIcon(type, { className: "icon-sm" });
}

export function toast(message, type) {
  const iconName = type === "success" ? "check-circle" : type === "error" ? "alert-circle" : "info-circle";
  const container = document.getElementById("toast-container");
  const el = document.createElement("div");
  el.className = "toast" + (type ? " " + type : "");
  el.innerHTML = `${icon(iconName, { className: "icon-sm" })}<span>${escapeHtml(message)}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add("fade-out");
    setTimeout(() => el.remove(), 220);
  }, 2600);
}

export function showSpinner(container) {
  container.innerHTML = "";
  container.appendChild(document.getElementById("tpl-spinner").content.cloneNode(true));
}

// Formats a phone number as (XXX) XXX-XXXX while the user types.
export function attachPhoneFormatter(input) {
  input.addEventListener("input", () => {
    const digits = input.value.replace(/\D/g, "").slice(0, 10);
    let out = digits;
    if (digits.length > 6) out = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    else if (digits.length > 3) out = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    else if (digits.length > 0) out = `(${digits}`;
    input.value = out;
  });
}

// Shows a plain number while focused (easy editing), formats as currency
// with commas on blur. Reads/writes plain numeric strings via input.value
// regardless of display state.
export function attachCurrencyFormatter(input) {
  function toPlain() {
    const n = Number(String(input.value).replace(/[^0-9.]/g, ""));
    input.value = n ? String(n) : "";
  }
  function toFormatted() {
    const n = Number(String(input.value).replace(/[^0-9.]/g, ""));
    input.value = n ? n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
  }
  input.addEventListener("focus", toPlain);
  input.addEventListener("blur", toFormatted);
  if (input.value) toFormatted();
}

export function currencyValue(input) {
  const n = Number(String(input.value).replace(/[^0-9.]/g, ""));
  return n || null;
}

// Auto-attaches formatters to any [data-format] input inside a container.
export function applyFieldFormatters(container) {
  container.querySelectorAll('[data-format="phone"]').forEach(attachPhoneFormatter);
  container.querySelectorAll('[data-format="currency"]').forEach(attachCurrencyFormatter);
}

// Builds the Line-of-Business checkbox group into `container`, pre-checking
// values found in `selected` (array of strings).
export function buildLobCheckboxes(container, selected) {
  container.innerHTML = "";
  const selectedSet = new Set(selected || []);
  LOB_OPTIONS.forEach((opt) => {
    const label = document.createElement("label");
    label.className = "checkbox-pill";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.value = opt;
    cb.checked = selectedSet.has(opt);
    if (cb.checked) label.classList.add("checked");
    cb.addEventListener("change", () => label.classList.toggle("checked", cb.checked));
    label.appendChild(cb);
    const textSpan = document.createElement("span");
    textSpan.innerHTML = ` ${lobIcon(opt)} ${escapeHtml(opt)}`;
    label.appendChild(textSpan);
    container.appendChild(label);
  });
}

export function getLobCheckboxValues(container) {
  return Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map((cb) => cb.value);
}
