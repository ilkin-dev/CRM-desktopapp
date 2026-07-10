// ============================================================
// Client detail view: info panel, interaction timeline + logging,
// and document uploads.
// ============================================================
import { getClient, updateClient, listInteractionsForClient, createInteraction } from "../db.js";
import {
  DOCUMENT_CATEGORIES, uploadClientDocument, listClientDocuments, deleteClientDocument,
} from "../storage.js";
import {
  fmtDate, todayStr, escapeHtml, toast, showSpinner, currencyValue,
  applyFieldFormatters, statusClass, statusIcon, docIcon, interactionTypeIcon,
} from "../utils.js";
import { icon, hydrateIcons } from "../icons.js";

export async function renderClientDetail(content, clientId) {
  content.innerHTML = "";
  content.appendChild(document.getElementById("tpl-client-detail").content.cloneNode(true));
  hydrateIcons(content);

  const client = await getClient(clientId);
  if (!client) {
    content.innerHTML = '<div class="card">Client not found. <a href="#/clients">Back to clients</a></div>';
    return;
  }

  document.getElementById("detail-name").textContent = client.fullName;
  const statusEl = document.getElementById("detail-status");
  statusEl.innerHTML = `${statusIcon(client.status)} ${escapeHtml(client.status || "")}`;
  statusEl.className = "badge " + statusClass(client.status);
  document.getElementById("edit-client-link").href = `#/clients/${clientId}/edit`;

  document.getElementById("detail-info").innerHTML = `
    <dt>Phone</dt><dd>${escapeHtml(client.phone || "—")}</dd>
    <dt>Email</dt><dd>${escapeHtml(client.email || "—")}</dd>
    <dt>Line(s) of Business</dt><dd>${escapeHtml(client.lineOfBusiness || "—")}</dd>
    <dt>Carrier</dt><dd>${escapeHtml(client.carrier || "—")}</dd>
    <dt>Renewal Date</dt><dd>${fmtDate(client.renewalDate)}</dd>
    <dt>Referral Source</dt><dd>${escapeHtml(client.referralSource || "—")}</dd>
    <dt>Notes</dt><dd>${escapeHtml(client.notes || "—")}</dd>
  `;

  document.getElementById("i-date").value = todayStr();

  const typeSelect = document.getElementById("i-type");
  const quoteAmountWrap = document.getElementById("i-quote-amount-wrap");
  const quoteLOBWrap = document.getElementById("i-quote-lob-wrap");
  const premiumWrap = document.getElementById("i-premium-wrap");
  const commissionRateWrap = document.getElementById("i-commission-rate-wrap");
  const commissionAmountWrap = document.getElementById("i-commission-amount-wrap");
  const quoteAmountInput = document.getElementById("i-quoteAmount");
  const premiumInput = document.getElementById("i-premiumAmount");
  const rateInput = document.getElementById("i-commissionRate");
  const commissionAmountInput = document.getElementById("i-commissionAmount");
  applyFieldFormatters(document.getElementById("interaction-form"));

  function toggleTypeFields() {
    const isQuote = typeSelect.value === "Quote";
    const isBind = typeSelect.value === "Bind";
    quoteAmountWrap.style.display = isQuote ? "" : "none";
    quoteLOBWrap.style.display = isQuote || isBind ? "" : "none";
    premiumWrap.style.display = isBind ? "" : "none";
    commissionRateWrap.style.display = isBind ? "" : "none";
    commissionAmountWrap.style.display = isBind ? "" : "none";
  }
  typeSelect.addEventListener("change", toggleTypeFields);
  toggleTypeFields();

  function autoCalcCommission() {
    const premium = currencyValue(premiumInput) || 0;
    const rate = Number(rateInput.value) || 0;
    if (premium && rate) commissionAmountInput.value = ((premium * rate) / 100).toFixed(2);
  }
  premiumInput.addEventListener("blur", autoCalcCommission);
  rateInput.addEventListener("input", autoCalcCommission);

  document.getElementById("interaction-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const isBind = typeSelect.value === "Bind";
    const data = {
      clientId,
      type: typeSelect.value,
      date: document.getElementById("i-date").value || todayStr(),
      summary: document.getElementById("i-summary").value.trim(),
      quoteAmount: currencyValue(quoteAmountInput),
      quoteLOB: document.getElementById("i-quoteLOB").value.trim() || null,
      followUpDate: document.getElementById("i-followUpDate").value || null,
      followUpDone: false,
      premiumAmount: isBind ? currencyValue(premiumInput) : null,
      commissionRate: isBind && rateInput.value ? Number(rateInput.value) : null,
      commissionAmount: isBind ? currencyValue(commissionAmountInput) : null,
    };
    if (!data.summary) return;
    await createInteraction(data);
    toast(isBind ? "Policy bind logged." : `${data.type} logged.`, "success");
    if (isBind) {
      // Binding a policy naturally moves the client to Active Client if they aren't already.
      const c = await getClient(clientId);
      if (c && c.status !== "Active Client") {
        await updateClient(clientId, { status: "Active Client" });
      }
    }
    renderClientDetail(content, clientId); // refresh
  });

  // ---- Documents ----
  const docCategorySelect = document.getElementById("doc-category");
  DOCUMENT_CATEGORIES.forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    docCategorySelect.appendChild(opt);
  });

  const docStatus = document.getElementById("doc-upload-status");
  const docsGrid = document.getElementById("documents-grid");

  document.getElementById("document-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById("doc-file");
    const file = fileInput.files[0];
    if (!file) return;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    docStatus.textContent = `Uploading ${file.name}...`;
    docStatus.classList.remove("error");
    try {
      await uploadClientDocument(clientId, docCategorySelect.value, file);
      docStatus.textContent = "";
      fileInput.value = "";
      toast("Document uploaded.", "success");
      await renderDocuments(clientId, docsGrid);
    } catch (err) {
      docStatus.textContent = "Upload failed: " + (err.message || "unknown error");
      docStatus.classList.add("error");
      toast("Upload failed.", "error");
    } finally {
      submitBtn.disabled = false;
    }
  });

  showSpinner(docsGrid);
  await renderDocuments(clientId, docsGrid);

  const interactions = await listInteractionsForClient(clientId);
  const timeline = document.getElementById("detail-timeline");
  if (interactions.length === 0) {
    timeline.innerHTML = '<div class="empty-note">No interactions logged yet.</div>';
  } else {
    timeline.innerHTML = "";
    interactions.forEach((i) => {
      const div = document.createElement("div");
      div.className = "timeline-item";
      let extra = "";
      if (i.type === "Quote" && (i.quoteAmount || i.quoteLOB)) {
        extra = ` — ${i.quoteLOB || ""} ${i.quoteAmount ? "$" + i.quoteAmount.toLocaleString() : ""}`.trim();
      }
      if (i.type === "Bind" && (i.premiumAmount || i.commissionAmount)) {
        extra = ` — ${i.quoteLOB || ""} Premium: ${i.premiumAmount ? "$" + i.premiumAmount.toLocaleString() : "—"}, Commission: ${i.commissionAmount ? "$" + i.commissionAmount.toLocaleString() : "—"}`.trim();
      }
      const followUp = i.followUpDate ? ` <span class="tag">Follow-up: ${fmtDate(i.followUpDate)}</span>` : "";
      div.innerHTML = `
        <div class="meta"><span class="type-tag">${interactionTypeIcon(i.type)} ${escapeHtml(i.type)}</span>${fmtDate(i.date)}${followUp}</div>
        <div class="summary">${escapeHtml(i.summary)}${extra ? "<br><em>" + escapeHtml(extra) + "</em>" : ""}</div>
      `;
      timeline.appendChild(div);
    });
  }
}

async function renderDocuments(clientId, gridEl) {
  let docs;
  try {
    docs = await listClientDocuments(clientId);
  } catch (err) {
    gridEl.innerHTML = `<div class="empty-note">Couldn't load documents: ${escapeHtml(err.message || "unknown error")}</div>`;
    return;
  }
  if (docs.length === 0) {
    gridEl.innerHTML = '<div class="empty-note">No documents uploaded yet.</div>';
    return;
  }
  gridEl.innerHTML = "";
  docs.forEach((doc) => {
    const card = document.createElement("div");
    card.className = "doc-card";
    card.innerHTML = `
      <div class="doc-thumb">
        ${isImageType(doc.contentType) ? `<img src="${doc.url}" alt="${escapeHtml(doc.name)}" />` : icon("other", { className: "file-icon" })}
      </div>
      <div class="doc-meta">
        <div class="doc-category">${docIcon(doc.category)} ${escapeHtml(doc.category)}</div>
        <div class="doc-name" title="${escapeHtml(doc.name)}">${escapeHtml(doc.name)}</div>
      </div>
      <div class="doc-actions">
        <a href="${doc.url}" target="_blank" rel="noopener">${icon("eye", { className: "icon-sm" })} View</a>
        <button type="button" class="doc-delete">${icon("trash", { className: "icon-sm" })} Delete</button>
      </div>
    `;
    card.querySelector(".doc-delete").addEventListener("click", async () => {
      if (!confirm(`Delete "${doc.name}"? This cannot be undone.`)) return;
      try {
        await deleteClientDocument(doc.path);
        toast("Document deleted.", "success");
        await renderDocuments(clientId, gridEl);
      } catch (err) {
        toast("Delete failed.", "error");
      }
    });
    gridEl.appendChild(card);
  });
}

function isImageType(contentType) {
  return !!(contentType && contentType.startsWith("image/"));
}
