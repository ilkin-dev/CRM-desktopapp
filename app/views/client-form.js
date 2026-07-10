// ============================================================
// Add/Edit client form.
// ============================================================
import { STATUSES, getClient, createClient, updateClient, deleteClient } from "../db.js";
import {
  toast, attachPhoneFormatter, buildLobCheckboxes, getLobCheckboxValues, LOB_OPTIONS,
} from "../utils.js";
import { hydrateIcons } from "../icons.js";

export async function renderClientForm(content, clientId) {
  content.innerHTML = "";
  content.appendChild(document.getElementById("tpl-client-form").content.cloneNode(true));
  hydrateIcons(content);

  const statusSelect = document.getElementById("f-status");
  STATUSES.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    statusSelect.appendChild(opt);
  });

  const phoneInput = document.getElementById("f-phone");
  attachPhoneFormatter(phoneInput);

  const lobGroup = document.getElementById("f-lob-group");
  const lobOtherInput = document.getElementById("f-lob-other");
  function syncLobOtherVisibility() {
    const checked = getLobCheckboxValues(lobGroup);
    lobOtherInput.classList.toggle("hidden", !checked.includes("Other"));
  }

  let existing = null;
  let existingLob = [];
  if (clientId) {
    existing = await getClient(clientId);
    document.getElementById("client-form-title").textContent = "Edit Client";
    document.getElementById("f-fullName").value = existing.fullName || "";
    document.getElementById("f-status").value = existing.status || "New Lead";
    phoneInput.value = existing.phone || "";
    document.getElementById("f-email").value = existing.email || "";
    document.getElementById("f-carrier").value = existing.carrier || "";
    document.getElementById("f-renewalDate").value = existing.renewalDate || "";
    document.getElementById("f-referralSource").value = existing.referralSource || "";
    document.getElementById("f-notes").value = existing.notes || "";

    // Parse stored comma-separated LOB string back into checkboxes,
    // treating any value not in the known list as "Other" free text.
    const stored = (existing.lineOfBusiness || "").split(",").map((s) => s.trim()).filter(Boolean);
    const known = stored.filter((v) => LOB_OPTIONS.includes(v));
    const unknown = stored.filter((v) => !LOB_OPTIONS.includes(v));
    existingLob = known;
    if (unknown.length) {
      existingLob = existingLob.concat(["Other"]);
      lobOtherInput.value = unknown.join(", ");
    }

    const delBtn = document.getElementById("delete-client-btn");
    delBtn.classList.remove("hidden");
    delBtn.addEventListener("click", async () => {
      if (confirm(`Delete ${existing.fullName}? This also removes their interaction history. This cannot be undone.`)) {
        await deleteClient(clientId);
        toast(`${existing.fullName} deleted.`, "success");
        window.location.hash = "#/clients";
      }
    });
  } else {
    statusSelect.value = "New Lead";
  }

  buildLobCheckboxes(lobGroup, existingLob);
  syncLobOtherVisibility();
  lobGroup.addEventListener("change", syncLobOtherVisibility);

  document.getElementById("client-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const checkedLob = getLobCheckboxValues(lobGroup);
    const lobValues = checkedLob.filter((v) => v !== "Other");
    if (checkedLob.includes("Other") && lobOtherInput.value.trim()) {
      lobValues.push(lobOtherInput.value.trim());
    }
    const data = {
      fullName: document.getElementById("f-fullName").value.trim(),
      status: document.getElementById("f-status").value,
      phone: phoneInput.value.trim(),
      email: document.getElementById("f-email").value.trim(),
      lineOfBusiness: lobValues.join(", "),
      carrier: document.getElementById("f-carrier").value.trim(),
      renewalDate: document.getElementById("f-renewalDate").value,
      referralSource: document.getElementById("f-referralSource").value.trim(),
      notes: document.getElementById("f-notes").value.trim(),
    };
    if (!data.fullName) return;
    if (clientId) {
      await updateClient(clientId, data);
      toast("Client updated.", "success");
      window.location.hash = `#/clients/${clientId}`;
    } else {
      const ref = await createClient(data);
      toast("Client added.", "success");
      window.location.hash = `#/clients/${ref.id}`;
    }
  });
}
