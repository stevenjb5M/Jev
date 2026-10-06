// The race: send every ticket to every racer, one at a time, and record
// how long each answer took, whether it was right, and what it cost.
//
//   npm run race        -> real race (needs TYPESAFE_API_KEY + ANTHROPIC_API_KEY)
//   npm run race:demo   -> fake racers, no keys needed, writes to results/demo/

import { mkdir, writeFile } from "node:fs/promises";
import { claudeRacer, demoRacer, jevRacer, type Racer } from "./racers.js";
import { renderChart } from "./chart.js";
import { TICKETS } from "./tickets.js";

export interface Lap {
  ticket: number;
  expected: string;
  answer: string | null;
  correct: boolean;
  ms: number;
  inputTokens: number;
  outputTokens: number;
  error?: string;
}

export interface Summary {
  racer: string;
  model: string;
  accuracy: number;
  medianMs: number;
  p90Ms: number;
  totalSeconds: number;
  costUSD: number;
  costPer1kTickets: number;
  errors: number;
}

const demo = process.argv.includes("--demo");
const outDir = demo ? "results/demo" : "results";
// The website in docs/ reads this file (GitHub Pages serves the docs/ folder).
const siteData = demo ? "docs/data/demo.json" : "docs/data/results.json";

try {
  process.loadEnvFile(); // loads keys from .env if the file exists
} catch {}

const racers: Racer[] = demo
  ? [
      demoRacer("Jev", { input: 0.042, output: 0 }, [15, 40], 0.95),
      demoRacer("Claude", { input: 4, output: 20 }, [150, 400], 0.95),
    ]
  : [jevRacer(), claudeRacer()];

const laps: Record<string, Lap[]> = {};

for (const racer of racers) {
  console.log(`\n🏁 ${racer.name} (${racer.model})`);

  // One warm-up call that doesn't count, so connection setup isn't timed.
  await racer.classify(TICKETS[0]!.text).catch(() => {});

  laps[racer.name] = [];
  for (const ticket of TICKETS) {
    const start = performance.now();
    let lap: Lap;
    try {
      const guess = await racer.classify(ticket.text);
      lap = {
        ticket: ticket.id,
        expected: ticket.answer,
        answer: guess.answer,
        correct: guess.answer === ticket.answer,
        ms: performance.now() - start,
        inputTokens: guess.inputTokens,
        outputTokens: guess.outputTokens,
      };
    } catch (error) {
      lap = {
        ticket: ticket.id,
        expected: ticket.answer,
        answer: null,
        correct: false,
        ms: performance.now() - start,
        inputTokens: 0,
        outputTokens: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
    laps[racer.name]!.push(lap);
    const mark = lap.error ? "💥" : lap.correct ? "✅" : "❌";
    console.log(
      `  ${mark} #${String(ticket.id).padStart(2)}  ${lap.ms.toFixed(0).padStart(6)} ms  ` +
        `${ticket.answer.padEnd(9)} -> ${lap.answer ?? lap.error}`,
    );
  }
}

const summaries = racers.map((racer) => summarize(racer, laps[racer.name]!));

await mkdir(outDir, { recursive: true });
await mkdir("docs/data", { recursive: true });
const runAt = new Date().toISOString();
const json = JSON.stringify({ demo, runAt, tickets: TICKETS, summaries, laps }, null, 2) + "\n";
await writeFile(`${outDir}/results.json`, json);
await writeFile(siteData, json);
await writeFile(`${outDir}/RESULTS.md`, renderMarkdown(summaries, runAt));
await writeFile(`${outDir}/chart.svg`, renderChart(summaries, demo));

console.log("\n" + renderTable(summaries));
console.log(`\nSaved ${outDir}/results.json, ${outDir}/RESULTS.md, ${outDir}/chart.svg and ${siteData}`);

// ---------------------------------------------------------------------------

function summarize(racer: Racer, laps: Lap[]): Summary {
  const times = laps.filter((lap) => !lap.error).map((lap) => lap.ms);
  const input = sum(laps.map((lap) => lap.inputTokens));
  const output = sum(laps.map((lap) => lap.outputTokens));
  const costUSD = (input * racer.price.input + output * racer.price.output) / 1_000_000;
  return {
    racer: racer.name,
    model: racer.model,
    accuracy: laps.filter((lap) => lap.correct).length / laps.length,
    medianMs: percentile(times, 0.5),
    p90Ms: percentile(times, 0.9),
    totalSeconds: sum(laps.map((lap) => lap.ms)) / 1000,
    costUSD,
    costPer1kTickets: (costUSD / laps.length) * 1000,
    errors: laps.filter((lap) => lap.error).length,
  };
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]!;
}

function rows(summaries: Summary[]): string[][] {
  return [
    ["Racer", "Model", "Accuracy", "Median", "p90", "Total time", "Cost per 1,000 tickets", "Errors"],
    ...summaries.map((s) => [
      s.racer,
      s.model,
      `${(s.accuracy * 100).toFixed(0)}%`,
      `${s.medianMs.toFixed(0)} ms`,
      `${s.p90Ms.toFixed(0)} ms`,
      `${s.totalSeconds.toFixed(1)} s`,
      `$${s.costPer1kTickets.toFixed(4)}`,
      String(s.errors),
    ]),
  ];
}

function renderTable(summaries: Summary[]): string {
  const table = rows(summaries);
  const widths = table[0]!.map((_, col) => Math.max(...table.map((row) => row[col]!.length)));
  return table.map((row) => row.map((cell, col) => cell.padEnd(widths[col]!)).join("  ")).join("\n");
}

function renderMarkdown(summaries: Summary[], runAt: string): string {
  const [header, ...body] = rows(summaries);
  const line = (cells: string[]) => `| ${cells.join(" | ")} |`;
  const [jev, llm] = summaries;
  const speedup = jev && llm ? (llm.medianMs / jev.medianMs).toFixed(1) : "?";
  return [
    demo ? "> ⚠️ **DEMO DATA.** These numbers are simulated, not measured.\n" : "",
    `# Race results`,
    ``,
    `Ran ${TICKETS.length} tickets on ${runAt.slice(0, 10)}. Jev's median answer was **${speedup}× faster**.`,
    ``,
    `![Race chart](chart.svg)`,
    ``,
    line(header!),
    line(header!.map(() => "---")),
    ...body.map(line),
    ``,
  ].join("\n");
}
