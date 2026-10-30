"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const { complaintStats, slaDecision } = require("../app.js");
const { buildDeck, validateSpec, validateDiagram } = require("../starter/.github/skills/banking-executive-deck/scripts/build-deck.cjs");
const { renderDiagram } = require("../starter/scripts/render-diagram.cjs");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const spec = JSON.parse(read("starter/input/deck-spec.json"));
const diagrams = JSON.parse(read("starter/input/diagram-layouts.json"));
const csv = read("starter/input/complaints.csv");

test("CSV baseline is calculated from all 12 actual fixtures", () => {
  const stats = complaintStats(csv);
  assert.equal(stats.total, 12);
  assert.equal(stats.onTime, 9);
  assert.equal(stats.ackPercent, 75);
  assert.equal(stats.slow, 5);
  assert.equal(stats.resolutionTotal, 1280);
  assert.deepEqual(stats.cases.filter(row => row.ackMinutes > 15).map(row => row.case_id),
    ["DEMO-C002", "DEMO-C006", "DEMO-C009"]);
  assert.deepEqual(stats.cases.filter(row => row.resolutionMinutes > 120).map(row => row.case_id),
    ["DEMO-C002", "DEMO-C004", "DEMO-C006", "DEMO-C009", "DEMO-C012"]);
  assert.equal(stats.cases.find(row => row.case_id === "DEMO-C004").ackMinutes, 15);
});

test("CSV errors cannot silently create success-shaped metrics", () => {
  assert.throws(() => complaintStats(""), /kosong/);
  assert.throws(() => complaintStats(csv.replace("ack_at", "ack")), /Header/);
  assert.throws(() => complaintStats(csv.replace("DEMO-C002", "DEMO-C001")), /duplikat/);
  assert.throws(() => complaintStats(csv.replace("09:04:00+07:00", "08:04:00+07:00")), /Urutan waktu/);
  assert.throws(() => complaintStats(csv.replace("08:00:00+07:00", "08:00:00Z")), /Timezone/);
});

test("exact SLA boundary triggers at 120, not after 120", () => {
  assert.equal(slaDecision(119, 120, false, false).tone, "");
  assert.equal(slaDecision(120, 120, false, false).tone, "escalate");
  assert.equal(slaDecision(121, 120, false, false).tone, "escalate");
  assert.equal(slaDecision(89, 90, false, false).tone, "");
  assert.equal(slaDecision(90, 90, false, false).tone, "escalate");
  assert.equal(slaDecision(91, 90, false, false).tone, "escalate");
});

test("fraud overrides elapsed threshold; closed is not an active SLA case", () => {
  assert.equal(slaDecision(1, 120, false, true).tone, "urgent");
  assert.equal(slaDecision(121, 120, true, false).tone, "");
  assert.match(slaDecision(121, 120, true, true).message, /review manusia terpisah/);
  assert.throws(() => slaDecision(-1, 120, false, false), /tidak valid/);
  assert.throws(() => slaDecision(12, 100, false, false), /tidak valid/);
});

test("all four diagrams and the eight-slide spec satisfy actual generator limits", () => {
  assert.equal(Object.keys(diagrams).length, 4);
  for (const [key, diagram] of Object.entries(diagrams)) validateDiagram(diagram, key);
  validateSpec(spec, diagrams);
  assert.equal(spec.slides.filter(slide => slide.kind === "diagram").length, 2);
  assert.equal(spec.slides[1].metrics[1].value, `${complaintStats(csv).ackPercent}%`);
});

test("incident timeline uses its own chronology and separates impact from response duration", () => {
  const timeline = JSON.parse(read("starter/input/incident-timeline-layout.json"))["incident-timeline"];
  validateDiagram(timeline, "incident-timeline");
  const times = Object.fromEntries(timeline.nodes.filter(node => node.lines[0].includes("WIB"))
    .map(node => [node.id, Date.parse(`2026-10-21T${node.lines[0].slice(0, 5)}:00+07:00`)]));
  assert.equal((times.resolved - times.symptom) / 60000, 45);
  assert.equal((times.resolved - times.alert) / 60000, 40);
  assert.equal((times.alert - times.symptom) / 60000, 5);
  assert.equal(timeline.source, "input/incident-chronology.md");
  const report = read("examples/incident-postmortem.md");
  assert.match(report, /120 dari 2\.400 = 5%/);
  assert.match(report, /18 pengguna sintetis unik/);
});

test("minutes retain all four assigned owners and dates, without turning implementation into an approval", () => {
  const minutes = read("examples/meeting-minutes.md");
  for (const [owner, due] of [["Raka", "2026-10-22"], ["Mira", "2026-10-21"], ["Danu", "2026-10-22"], ["Ika", "2026-10-23"]]) {
    assert.ok(minutes.split(/\r?\n/).some(line => line.includes(`| ${owner} | ${due} |`)), `${owner} due date missing`);
  }
  assert.match(minutes, /tidak menyetujui\s+implementasi/);
  assert.match(minutes, /09:00-09:30 WIB \/ 02:00-02:30 UTC/);
});

test("diagram validation rejects overlap, invalid references, and out-of-bounds labels", () => {
  const overlap = structuredClone(diagrams["business-process"]);
  overlap.nodes[1].x = overlap.nodes[0].x;
  assert.throws(() => validateDiagram(overlap, "overlap"), /Overlapping/);
  const badEdge = structuredClone(diagrams["business-process"]);
  badEdge.edges[0].to = "nonexistent";
  assert.throws(() => validateDiagram(badEdge, "edge"), /unknown node/);
  const badLabel = structuredClone(diagrams["business-process"]);
  badLabel.edges[1].labelX = -1;
  assert.throws(() => validateDiagram(badLabel, "label"), /within the canvas/);
});

test("deck spec cannot omit synthetic status, diagrams, notes, or usable content limits", () => {
  const real = structuredClone(spec);
  real.synthetic = false;
  assert.throws(() => validateSpec(real, diagrams), /synthetic/);
  const long = structuredClone(spec);
  long.slides[0].title = "x".repeat(79);
  assert.throws(() => validateSpec(long, diagrams), /78/);
  const notes = structuredClone(spec);
  notes.slides[0].notes = "";
  assert.throws(() => validateSpec(notes, diagrams), /notes/);
  const noDiagram = structuredClone(spec);
  noDiagram.slides[2] = { ...noDiagram.slides[2], kind: "bullets", bullets: ["No diagram"] };
  assert.throws(() => validateSpec(noDiagram, diagrams), /two native diagram/);
});

test("PPTX generator produces an actual eight-slide package with native diagrams and notes", async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "banking-workshop-test-"));
  try {
    const output = path.join(temp, "generated.pptx");
    const result = await buildDeck(path.join(root, "starter", "input", "deck-spec.json"), output);
    assert.equal(result.slides, 8);
    assert.ok(fs.statSync(output).size > 10000);
    const check = spawnSync("python", [path.join(__dirname, "validate_artifacts.py"), "--pptx", output], { encoding: "utf8" });
    assert.equal(check.status, 0, check.stdout + check.stderr);
    await assert.rejects(() => buildDeck(path.join(root, "starter", "input", "deck-spec.json"), output), /already exists/);
    assert.ok(fs.statSync(output).size > 10000);
  } finally {
    fs.rmSync(temp, { recursive: true });
  }
});

test("SVG renderer writes a real 2400px PNG and refuses overwrites or remote resources", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "banking-diagram-test-"));
  try {
    const output = path.join(temp, "flow.png");
    renderDiagram(path.join(root, "examples", "diagrams", "business-process.svg"), output);
    const png = fs.readFileSync(output);
    assert.equal(png.subarray(1, 4).toString("ascii"), "PNG");
    assert.equal(png.readUInt32BE(16), 2400);
    assert.throws(() => renderDiagram(path.join(root, "examples", "diagrams", "business-process.svg"), output), /already exists/);
    const external = path.join(temp, "external.svg");
    fs.writeFileSync(external, '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://example.invalid/a.png"/></svg>');
    assert.throws(() => renderDiagram(external, path.join(temp, "external.png")), /self-contained/);
  } finally {
    fs.rmSync(temp, { recursive: true });
  }
});
