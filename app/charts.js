// ============================================================
// Minimal dependency-free SVG bar chart renderer used by the Reports
// view. No charting library — just enough SVG generation to draw
// labeled vertical or horizontal bars, matching the app's design tokens.
// ============================================================
import { escapeHtml } from "./utils.js";

const BAR_COLOR = "#2563eb"; // var(--accent)
const TRACK_COLOR = "#e2e8f0"; // var(--border)
const TEXT_COLOR = "#64748b"; // var(--grey)

// Renders a vertical bar chart (bars grow upward, labels below) into
// `container`. `data` is [{ label, value }]. `formatValue` formats the
// value shown above each bar (defaults to the raw number).
export function renderVerticalBarChart(container, data, opts = {}) {
  const formatValue = opts.formatValue || ((v) => String(v));
  const width = opts.width || 480;
  const height = opts.height || 180;
  const barGap = 14;
  const labelHeight = 28;
  const valueHeight = 18;
  const chartHeight = height - labelHeight - valueHeight;
  const max = Math.max(1, ...data.map((d) => d.value));
  const barWidth = data.length ? (width - barGap * (data.length - 1)) / data.length : width;

  if (data.every((d) => d.value === 0)) {
    container.innerHTML = '<div class="chart-empty">No data yet.</div>';
    return;
  }

  let bars = "";
  data.forEach((d, i) => {
    const x = i * (barWidth + barGap);
    const barH = Math.max(2, (d.value / max) * chartHeight);
    const y = valueHeight + (chartHeight - barH);
    bars += `
      <text x="${x + barWidth / 2}" y="${valueHeight - 6}" text-anchor="middle" font-size="11" fill="${TEXT_COLOR}" font-weight="700">${escapeHtml(formatValue(d.value))}</text>
      <rect x="${x}" y="${y}" width="${barWidth}" height="${barH}" rx="4" fill="${BAR_COLOR}"><title>${escapeHtml(d.label)}: ${escapeHtml(formatValue(d.value))}</title></rect>
      <text x="${x + barWidth / 2}" y="${valueHeight + chartHeight + 18}" text-anchor="middle" font-size="11" fill="${TEXT_COLOR}">${escapeHtml(d.label)}</text>
    `;
  });

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" class="bar-chart" preserveAspectRatio="xMidYMid meet">
      <line x1="0" y1="${valueHeight + chartHeight}" x2="${width}" y2="${valueHeight + chartHeight}" stroke="${TRACK_COLOR}" stroke-width="1" />
      ${bars}
    </svg>
  `;
}

// Renders a horizontal bar chart (bars grow rightward, labels on the
// left) into `container`. `data` is [{ label, value }].
export function renderHorizontalBarChart(container, data, opts = {}) {
  const formatValue = opts.formatValue || ((v) => String(v));
  const width = opts.width || 480;
  const rowHeight = opts.rowHeight || 30;
  const labelWidth = opts.labelWidth || 130;
  const height = data.length * rowHeight;
  const max = Math.max(1, ...data.map((d) => d.value));
  const trackWidth = width - labelWidth - 44;

  if (data.length === 0 || data.every((d) => d.value === 0)) {
    container.innerHTML = '<div class="chart-empty">No data yet.</div>';
    return;
  }

  let rows = "";
  data.forEach((d, i) => {
    const y = i * rowHeight;
    const barW = Math.max(2, (d.value / max) * trackWidth);
    rows += `
      <text x="${labelWidth - 8}" y="${y + rowHeight / 2 + 4}" text-anchor="end" font-size="12" fill="${TEXT_COLOR}">${escapeHtml(d.label)}</text>
      <rect x="${labelWidth}" y="${y + 6}" width="${trackWidth}" height="${rowHeight - 12}" rx="4" fill="${TRACK_COLOR}" />
      <rect x="${labelWidth}" y="${y + 6}" width="${barW}" height="${rowHeight - 12}" rx="4" fill="${BAR_COLOR}"><title>${escapeHtml(d.label)}: ${escapeHtml(formatValue(d.value))}</title></rect>
      <text x="${labelWidth + barW + 8}" y="${y + rowHeight / 2 + 4}" font-size="11" fill="${TEXT_COLOR}" font-weight="700">${escapeHtml(formatValue(d.value))}</text>
    `;
  });

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" class="bar-chart" preserveAspectRatio="xMidYMid meet">
      ${rows}
    </svg>
  `;
}
