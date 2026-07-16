// ============================================================
// Client detail — Timeline tab: log an interaction + the timeline
// list itself.
// ============================================================
import { getClient, updateClient, listInteractionsForClient, createInteraction } from "../../db.js";
import {
  fmtDate, todayStr, escapeHtml, toast, currencyValue, applyFieldFormatters, interactionTypeIcon,
} from "../../utils.js";

export async function renderTimelineTab(panel, clientId, onClientChanged) {
  panel.innerHTML = "";
  panel.appendChild(document.getElementById("tpl-tab-timeline").content.cloneNode(true));

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
        if (onClientChanged) onClientChanged();
      }
    }
    renderTimelineTab(panel, clientId, onClientChanged); // refresh
  });

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
