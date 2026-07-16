// ============================================================
// Client detail — Overview tab: expanded household info + a
// read-only list of household members (add/remove happens on the
// Edit Client form).
// ============================================================
import { listHouseholdMembers } from "../../db.js";
import { fmtDate, escapeHtml } from "../../utils.js";

function fullAddress(street, city, province, postalCode) {
  const parts = [street, city, province, postalCode].map((p) => (p || "").trim()).filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
}

export async function renderOverviewTab(panel, client) {
  panel.innerHTML = "";
  panel.appendChild(document.getElementById("tpl-tab-overview").content.cloneNode(true));

  const mailing = fullAddress(client.mailingAddress, client.mailingCity, client.mailingProvince, client.mailingPostalCode);
  const property = client.propertyAddressSameAsMailing
    ? "Same as mailing address"
    : fullAddress(client.propertyAddress, client.propertyCity, client.propertyProvince, client.propertyPostalCode);
  const license = [client.driversLicenseNumber, client.licenseProvince, client.licenseClass]
    .filter(Boolean)
    .join(" — ") || "—";

  document.getElementById("detail-info").innerHTML = `
    <dt>Phone</dt><dd>${escapeHtml(client.phone || "—")}</dd>
    <dt>Secondary Phone</dt><dd>${escapeHtml(client.secondaryPhone || "—")}</dd>
    <dt>Email</dt><dd>${escapeHtml(client.email || "—")}</dd>
    <dt>Date of Birth</dt><dd>${fmtDate(client.dateOfBirth)}</dd>
    <dt>Marital Status</dt><dd>${escapeHtml(client.maritalStatus || "—")}</dd>
    <dt>Occupation</dt><dd>${escapeHtml([client.occupation, client.employer].filter(Boolean).join(" at ") || "—")}</dd>
    <dt>Preferred Contact</dt><dd>${escapeHtml([client.preferredContactMethod, client.preferredContactTime].filter(Boolean).join(" — ") || "—")}</dd>
    <dt>Language</dt><dd>${escapeHtml(client.language || "—")}</dd>
    <dt>Line(s) of Business</dt><dd>${escapeHtml(client.lineOfBusiness || "—")}</dd>
    <dt>Carrier</dt><dd>${escapeHtml(client.carrier || "—")}</dd>
    <dt>Renewal Date</dt><dd>${fmtDate(client.renewalDate)}</dd>
    <dt>Referral Source</dt><dd>${escapeHtml(client.referralSource || "—")}</dd>
    <dt>Driver's License</dt><dd>${escapeHtml(license)}</dd>
    <dt>Mailing Address</dt><dd>${escapeHtml(mailing)}</dd>
    <dt>Property Address</dt><dd>${escapeHtml(property)}</dd>
    <dt>Notes</dt><dd>${escapeHtml(client.notes || "—")}</dd>
  `;

  const membersEl = document.getElementById("detail-household-members");
  const members = await listHouseholdMembers(client.id);
  if (members.length === 0) {
    membersEl.innerHTML = '<div class="empty-note">No household members added yet — add them from Edit Client.</div>';
  } else {
    membersEl.innerHTML = "";
    members.forEach((m) => {
      const row = document.createElement("div");
      row.className = "mini-list-row";
      row.innerHTML = `
        <span class="mini-list-title">${escapeHtml(m.fullName)}</span>
        <span class="mini-list-sub">${escapeHtml(m.relationship || "")}${m.dateOfBirth ? " — " + fmtDate(m.dateOfBirth) : ""}</span>
      `;
      membersEl.appendChild(row);
    });
  }
}
