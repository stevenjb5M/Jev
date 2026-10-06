// Draws the results as a small SVG image that GitHub can show in a README.
// Three panels, one per measure, because each has its own units.

import type { Summary } from "./race.js";
import { TICKETS } from "./tickets.js";

const WIDTH = 720;
const LABEL_W = 90;
const VALUE_W = 110;
const BAR_H = 22;
const BAR_GAP = 2;
const PANEL_GAP = 34;
const PLOT_W = WIDTH - 40 - LABEL_W - VALUE_W; // 20px padding on each side

interface Panel {
  title: string;
  value: (s: Summary) => number;
  format: (n: number) => string;
}

const PANELS: Panel[] = [
  { title: "Median time per answer (lower is better)", value: (s) => s.medianMs, format: (n) => `${n.toFixed(0)} ms` },
  { title: "Cost per 1,000 tickets (lower is better)", value: (s) => s.costPer1kTickets, format: formatDollars },
  { title: "Accuracy (higher is better)", value: (s) => s.accuracy * 100, format: (n) => `${n.toFixed(0)}%` },
];

export function renderChart(summaries: Summary[], demo: boolean): string {
  const [jev, llm] = summaries;
  const speedup = jev && llm ? llm.medianMs / jev.medianMs : NaN;
  const headline = `${demo ? "DEMO (simulated): " : ""}Jev answered ${speedup.toFixed(1)}× faster`;

  let y = 86;
  const body: string[] = [];
  for (const panel of PANELS) {
    body.push(`<text class="title" x="0" y="${y}">${panel.title}</text>`);
    y += 12;
    const max = Math.max(...summaries.map(panel.value), Number.EPSILON);
    summaries.forEach((summary, i) => {
      const value = panel.value(summary);
      const w = Math.max(2, (value / max) * PLOT_W);
      const barY = y + i * (BAR_H + BAR_GAP);
      const mid = barY + BAR_H / 2 + 4;
      body.push(
        `<g><title>${summary.racer}: ${panel.format(value)}</title>`,
        `<text class="label" x="${LABEL_W - 10}" y="${mid}" text-anchor="end">${summary.racer}</text>`,
        `<path class="s${i + 1}" d="${bar(LABEL_W, barY, w, BAR_H)}"/>`,
        `<text class="value" x="${LABEL_W + w + 8}" y="${mid}">${panel.format(value)}</text></g>`,
      );
    });
    y += summaries.length * (BAR_H + BAR_GAP);
    body.push(`<line class="axis" x1="${LABEL_W}" x2="${LABEL_W}" y1="${y - summaries.length * (BAR_H + BAR_GAP)}" y2="${y - BAR_GAP}"/>`);
    y += PANEL_GAP;
  }

  const height = y - PANEL_GAP + 34;
  const models = summaries.map((s) => `${s.racer} = ${s.model}`).join("  ·  ");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}" role="img" aria-label="${headline}">
<style>
  svg { --bg:#fcfcfb; --ink:#0b0b0b; --ink2:#52514e; --axis:#c9c8c3; --s1:#2a78d6; --s2:#eb6834; }
  @media (prefers-color-scheme: dark) {
    svg { --bg:#1a1a19; --ink:#ffffff; --ink2:#c3c2b7; --axis:#4a4945; --s1:#3987e5; --s2:#d95926; }
  }
  text { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; fill: var(--ink); }
  .headline { font-size: 22px; font-weight: 700; }
  .sub { font-size: 12px; fill: var(--ink2); }
  .title { font-size: 13px; font-weight: 600; fill: var(--ink2); }
  .label { font-size: 13px; }
  .value { font-size: 13px; font-variant-numeric: tabular-nums; }
  .axis { stroke: var(--axis); stroke-width: 1; }
  .s1 { fill: var(--s1); }
  .s2 { fill: var(--s2); }
</style>
<rect width="100%" height="100%" rx="8" fill="var(--bg)"/>
<g transform="translate(20 0)">
<text class="headline" x="0" y="34">${headline}</text>
<text class="sub" x="0" y="54">Same ${TICKETS.length} support tickets, same categories, one at a time</text>
${body.join("\n")}
<text class="sub" x="0" y="${height - 16}">${models}</text>
</g>
</svg>
`;
}

// A bar with a 4px rounded end on the right, square on the baseline.
function bar(x: number, y: number, w: number, h: number): string {
  const r = Math.min(4, w / 2);
  return `M${x},${y}h${w - r}a${r},${r} 0 0 1 ${r},${r}v${h - 2 * r}a${r},${r} 0 0 1 -${r},${r}h-${w - r}z`;
}

function formatDollars(n: number): string {
  if (n === 0) return "$0";
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toPrecision(2)}`;
}
