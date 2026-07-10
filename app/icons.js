// ============================================================
// Centralized SVG icon registry. Every icon shares the same visual
// language the sidebar nav originally used (24x24 viewBox, 2px stroke,
// currentColor) so icons automatically inherit whatever color context
// they're placed in (badge color, button color, danger red, etc.)
// instead of needing per-icon CSS.
// ============================================================

const ICONS = {
  // Nav
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  clients: '<circle cx="9" cy="8" r="3.2"/><path d="M2.5 20c0-3.6 2.9-6.2 6.5-6.2s6.5 2.6 6.5 6.2"/><circle cx="17" cy="7.5" r="2.6"/><path d="M15.8 13.6c2.9.3 5.2 2.7 5.2 6"/>',
  "add-client": '<circle cx="12" cy="12" r="9.25"/><path d="M12 8v8M8 12h8"/>',
  tasks: '<path d="M4 6.5l1.6 1.6L8.5 5" /><path d="M11 6h9"/><path d="M4 12.5l1.6 1.6L8.5 11" /><path d="M11 12h9"/><path d="M4 18.5l1.6 1.6L8.5 17" /><path d="M11 18h9"/>',
  commissions: '<circle cx="12" cy="12" r="9.25"/><path d="M12 7.3v9.4M9.3 15.2c0 1.1 1.1 1.9 2.7 1.9s2.7-.8 2.7-1.9-1.1-1.6-2.7-1.9c-1.6-.3-2.7-.8-2.7-1.9s1.1-1.9 2.7-1.9 2.7.7 2.7 1.7"/>',

  // Client status
  "new-lead": '<circle cx="12" cy="12" r="3.2"/><path d="M12 3v3.2M12 17.8V21M3 12h3.2M17.8 12H21M5.6 5.6l2.3 2.3M16.1 16.1l2.3 2.3M18.4 5.6l-2.3 2.3M7.9 16.1l-2.3 2.3"/>',
  quoted: '<path d="M4 5.5h16v10H9l-4 3.5v-3.5H4z"/>',
  bound: '<rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  "active-client": '<circle cx="12" cy="12" r="9.25"/><path d="M8 12.3l2.6 2.6L16.5 9"/>',
  "renewal-due": '<circle cx="12" cy="12" r="9.25"/><path d="M12 7v5.3l3.6 2.2"/>',
  "referral-source": '<circle cx="8.5" cy="9" r="3"/><path d="M2.7 20c0-3.3 2.6-5.7 5.8-5.7s5.8 2.4 5.8 5.7"/><path d="M14 9.3l1.7 1.7 3.3-3.6"/>',
  lapsed: '<circle cx="12" cy="12" r="9.25"/><path d="M6 6l12 12"/>',

  // Line of business
  auto: '<path d="M4 16v-3.5L6 8h12l2 4.5V16"/><path d="M4 16h16v2.5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1V17h-9v1.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V16z"/><circle cx="7.5" cy="16" r="1.4"/><circle cx="16.5" cy="16" r="1.4"/>',
  home: '<path d="M4 11.5L12 4l8 7.5"/><path d="M6 10v9.5a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V10"/>',
  bundle: '<path d="M4 11.5L9 7l5 4.5"/><path d="M5.5 10.2v7.3a1 1 0 0 0 1 1H12"/><path d="M14 20v-4.8l3-2.7 3 2.7V20"/><path d="M14.6 15l2.4-2.2 2.4 2.2"/>',
  tenant: '<circle cx="8.5" cy="8.5" r="3"/><path d="M10.7 10.7L20 20M16.3 16.3l2.3-2.3M18.6 18.6l1.8-1.8"/>',
  condo: '<rect x="4" y="4" width="7" height="16" rx="1"/><rect x="13" y="9" width="7" height="11" rx="1"/><path d="M6.5 7.5h2M6.5 11h2M6.5 14.5h2M15.5 12.5h2M15.5 16h2"/>',
  business: '<rect x="3.5" y="8" width="17" height="11" rx="1.5"/><path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  umbrella: '<path d="M12 3c4.7 0 8.5 3.5 8.7 7.8H3.3C3.5 6.5 7.3 3 12 3z"/><path d="M12 10.8V19a2 2 0 0 1-3.6 1.2"/>',
  other: '<path d="M6 2.5h8l4 4V21a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1z"/><path d="M14 2.5V7h4"/>',

  // Interaction type / document extras not covered above
  call: '<path d="M5 4.5h3.2l1.3 4-2 1.4a11 11 0 0 0 5.6 5.6l1.4-2 4 1.3V18a1.5 1.5 0 0 1-1.6 1.5A15 15 0 0 1 3.5 6.1 1.5 1.5 0 0 1 5 4.5z"/>',
  email: '<rect x="3.5" y="5.5" width="17" height="13" rx="1.5"/><path d="M4 6.5l8 6.5 8-6.5"/>',
  meeting: '<circle cx="8.5" cy="9" r="3"/><path d="M2.7 20c0-3.3 2.6-5.7 5.8-5.7s5.8 2.4 5.8 5.7"/><circle cx="16.5" cy="8" r="2.6"/><path d="M15.3 14.1c2.9.3 5.2 2.7 5.2 6"/>',
  note: '<path d="M6 2.5h8l4 4V21a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1z"/><path d="M8 12h8M8 15.5h8M8 8.5h4"/>',
  license: '<rect x="3.5" y="5.5" width="17" height="13" rx="1.8"/><circle cx="8.5" cy="11.5" r="2"/><path d="M6 16c.4-1.6 1.6-2.5 2.5-2.5s2.1.9 2.5 2.5"/><path d="M14 10h4M14 13h4"/>',
  "vehicle-photo": '<rect x="3.5" y="6" width="17" height="13" rx="1.8"/><circle cx="8.3" cy="11" r="2"/><path d="M3.5 16.5l4.3-4 3 2.8 3.4-3.6 5.8 5"/>',
  "bill-of-sale": '<path d="M6 2.5h12v19l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3-2 1.3z"/><path d="M8.5 7h7M8.5 10.5h7M8.5 14h4.5"/>',
  "finance-app": '<rect x="3" y="5.5" width="18" height="13" rx="1.8"/><path d="M3 9.5h18"/><path d="M6 14.5h4"/>',
  "proof-of-insurance": '<path d="M12 3l7 3v5.5c0 4.7-3 8.3-7 9.5-4-1.2-7-4.8-7-9.5V6z"/><path d="M9 12l2.2 2.2L15.5 10"/>',
  folder: '<path d="M3.5 7a1.5 1.5 0 0 1 1.5-1.5h4l2 2h8A1.5 1.5 0 0 1 20.5 9v8a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 17z"/>',

  // UI actions
  plus: '<path d="M12 4.5v15M4.5 12h15"/>',
  edit: '<path d="M4 20l.9-4.2L15.4 5.3a1.8 1.8 0 0 1 2.5 0l1 1a1.8 1.8 0 0 1 0 2.5L8.4 19.3z"/><path d="M13.8 6.9l3.3 3.3"/>',
  trash: '<path d="M5 7h14"/><path d="M9.5 7V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v2"/><path d="M7 7l1 12.5a1.5 1.5 0 0 0 1.5 1.4h5a1.5 1.5 0 0 0 1.5-1.4L17 7"/><path d="M10.3 11v6M13.7 11v6"/>',
  save: '<path d="M5 4.5h11l3 3V19a.5.5 0 0 1-.5.5H5a.5.5 0 0 1-.5-.5V5a.5.5 0 0 1 .5-.5z"/><path d="M8 4.5V10h8V4.5"/><path d="M8 14h8v5.5H8z"/>',
  upload: '<path d="M12 15.5V4.5"/><path d="M7.5 9L12 4.5 16.5 9"/><path d="M4.5 15.5V18a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-2.5"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.6"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M19.5 19.5l-4.4-4.4"/>',
  "check-circle": '<circle cx="12" cy="12" r="9.25"/><path d="M8 12.3l2.6 2.6L16.5 9"/>',
  "alert-circle": '<circle cx="12" cy="12" r="9.25"/><path d="M12 7.5v6"/><circle cx="12" cy="16.7" r="1" fill="currentColor" stroke="none"/>',
  "info-circle": '<circle cx="12" cy="12" r="9.25"/><path d="M12 11v5.5"/><circle cx="12" cy="7.7" r="1" fill="currentColor" stroke="none"/>',
  key: '<circle cx="8" cy="14.5" r="3.5"/><path d="M10.5 12L18.5 4"/><path d="M15.5 7l2 2M18 4.5l2 2"/>',
  logout: '<path d="M9.5 20H5.5A1.5 1.5 0 0 1 4 18.5v-13A1.5 1.5 0 0 1 5.5 4h4"/><path d="M15.5 16.5L20 12l-4.5-4.5"/><path d="M20 12H9.5"/>',
  calendar: '<rect x="4" y="5.5" width="16" height="15" rx="1.8"/><path d="M4 10h16"/><path d="M8 3.5v3M16 3.5v3"/>',
  chart: '<path d="M4 19.5V5.5"/><path d="M4 19.5h16"/><path d="M7 16l3.5-4 3 2.5L18 9"/>',
  attachment: '<path d="M8 12.5l6.5-6.5a3 3 0 1 1 4.2 4.2L11 17.9a5 5 0 1 1-7.1-7.1L12.5 2.2"/>',
  "circle-dot": '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none"/>',
  filter: '<path d="M4 5.5h16l-6 7.5V19l-4 2v-8z"/>',
  close: '<path d="M5.5 5.5l13 13M18.5 5.5l-13 13"/>',
  chevron: '<path d="M6 9l6 6 6-6"/>',
  command: '<circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="7" r="2.5"/><circle cx="7" cy="17" r="2.5"/><circle cx="17" cy="17" r="2.5"/><path d="M9.2 7h5.6M9.2 17h5.6M7 9.2v5.6M17 9.2v5.6"/>',
  table: '<rect x="3.5" y="4.5" width="17" height="15" rx="1.8"/><path d="M3.5 10h17M9.5 4.5v15"/>',
  board: '<rect x="3.5" y="4.5" width="5" height="15" rx="1.3"/><rect x="9.5" y="4.5" width="5" height="9" rx="1.3"/><rect x="15.5" y="4.5" width="5" height="12" rx="1.3"/>',
  bell: '<path d="M12 3.5a5 5 0 0 0-5 5v3.2c0 .9-.4 1.8-1 2.4L4.8 15.4c-.6.6-.2 1.6.6 1.6h13.2c.8 0 1.2-1 .6-1.6l-1.2-1.3c-.6-.6-1-1.5-1-2.4V8.5a5 5 0 0 0-5-5z"/><path d="M9.5 19a2.5 2.5 0 0 0 5 0"/>',
};

// Interaction type → icon name (some intentionally reuse a status/LOB icon
// for a related concept instead of drawing a near-duplicate shape).
const TYPE_TO_ICON = {
  Call: "call",
  Quote: "quoted",
  Email: "email",
  Meeting: "meeting",
  Note: "note",
  Bind: "bound",
  "DASH Report": "license",
};

export function icon(name, opts) {
  const o = opts || {};
  const cls = o.className ? ` ${o.className}` : "";
  const body = ICONS[name];
  if (!body) {
    console.warn(`icons.js: unknown icon "${name}"`);
    return "";
  }
  return `<svg class="icon${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

// Resolves an interaction-type label (e.g. "Call", "DASH Report") to its
// icon markup. Falls back to "note" for unrecognized types.
export function typeIcon(type, opts) {
  return icon(TYPE_TO_ICON[type] || "note", opts);
}

// Hydrates every `[data-icon]` placeholder inside `root` (defaults to the
// whole document) into the real inline SVG, preserving whatever classes
// the placeholder element already had (e.g. `nav-icon`, `brand-icon`).
// Used for icons that live in static HTML (index.html <template> markup)
// as opposed to icons embedded directly in JS-built template strings,
// which call icon()/typeIcon() inline instead.
export function hydrateIcons(root) {
  (root || document).querySelectorAll("[data-icon]").forEach((el) => {
    const name = el.dataset.icon;
    const cls = el.className || "";
    el.outerHTML = icon(name, { className: cls });
  });
}
