// ============================================================
// Reports view: commission/premium trend, pipeline conversion,
// referral source performance, activity overview.
// ============================================================
import { STATUSES, listClients, listAllInteractions } from "../db.js";
import { hydrateIcons } from "../icons.js";
import { renderVerticalBarChart, renderHorizontalBarChart } from "../charts.js";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const CONVERTED_STATUSES = ["Bound", "Active Client", "Renewal Due"];

function lastNMonthKeys(n) {
  const keys = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: MONTH_LABELS[d.getMonth()] });
  }
  return keys;
}

function startOfWeek(date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function lastNWeekBuckets(n) {
  const buckets = [];
  const today = new Date();
  const currentWeekStart = startOfWeek(today);
  for (let i = n - 1; i >= 0; i--) {
    const start = new Date(currentWeekStart);
    start.setDate(start.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    buckets.push({
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
      label: start.toLocaleDateString("en-CA", { month: "short", day: "numeric" }),
    });
  }
  return buckets;
}

export async function renderReports(content) {
  content.innerHTML = "";
  content.appendChild(document.getElementById("tpl-reports").content.cloneNode(true));
  hydrateIcons(content);

  const [clients, interactions] = await Promise.all([listClients(), listAllInteractions()]);
  const binds = interactions.filter((i) => i.type === "Bind");

  // ---- Commission & Premium trend ----
  const months = lastNMonthKeys(6);
  const commissionByMonth = Object.fromEntries(months.map((m) => [m.key, 0]));
  const premiumByMonth = Object.fromEntries(months.map((m) => [m.key, 0]));
  binds.forEach((b) => {
    const key = (b.date || "").slice(0, 7);
    if (key in commissionByMonth) commissionByMonth[key] += b.commissionAmount || 0;
    if (key in premiumByMonth) premiumByMonth[key] += b.premiumAmount || 0;
  });
  renderVerticalBarChart(
    document.getElementById("report-commission-chart"),
    months.map((m) => ({ label: m.label, value: commissionByMonth[m.key] })),
    { formatValue: (v) => (v ? "$" + v.toLocaleString() : "$0") }
  );
  renderVerticalBarChart(
    document.getElementById("report-premium-chart"),
    months.map((m) => ({ label: m.label, value: premiumByMonth[m.key] })),
    { formatValue: (v) => (v ? "$" + v.toLocaleString() : "$0") }
  );

  // ---- Pipeline conversion ----
  const countByStatus = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  clients.forEach((c) => {
    if (c.status in countByStatus) countByStatus[c.status]++;
  });
  const converted = clients.filter((c) => CONVERTED_STATUSES.includes(c.status)).length;
  const conversionRate = clients.length ? Math.round((converted / clients.length) * 100) : 0;
  document.getElementById("report-conversion-stats").innerHTML = `
    <div class="stat"><div class="num">${clients.length}</div><div class="label">Total Clients</div></div>
    <div class="stat"><div class="num">${converted}</div><div class="label">Bound or Better</div></div>
    <div class="stat"><div class="num">${conversionRate}%</div><div class="label">Conversion Rate</div></div>
  `;
  renderHorizontalBarChart(
    document.getElementById("report-pipeline-chart"),
    STATUSES.map((s) => ({ label: s, value: countByStatus[s] })),
    { labelWidth: 130 }
  );

  // ---- Referral source performance ----
  const countBySource = {};
  clients.forEach((c) => {
    const source = (c.referralSource || "").trim() || "Unknown";
    countBySource[source] = (countBySource[source] || 0) + 1;
  });
  const referralData = Object.entries(countBySource)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
  renderHorizontalBarChart(document.getElementById("report-referral-chart"), referralData, { labelWidth: 150 });

  // ---- Activity overview ----
  const weeks = lastNWeekBuckets(6);
  const activityData = weeks.map((w) => ({
    label: w.label,
    value: interactions.filter((i) => i.date && i.date >= w.start && i.date <= w.end).length,
  }));
  renderVerticalBarChart(document.getElementById("report-activity-chart"), activityData);
}
