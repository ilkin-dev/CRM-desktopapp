// ============================================================
// Client detail — Documents tab: upload form + document grid.
// ============================================================
import {
  DOCUMENT_CATEGORIES, uploadClientDocument, listClientDocuments, deleteClientDocument,
} from "../../storage.js";
import { escapeHtml, toast, showSpinner, docIcon } from "../../utils.js";
import { icon } from "../../icons.js";

export async function renderDocumentsTab(panel, clientId) {
  panel.innerHTML = "";
  panel.appendChild(document.getElementById("tpl-tab-documents").content.cloneNode(true));

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
