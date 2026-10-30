"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const tones = new Set(["navy", "teal", "mint", "amber", "neutral"]);

function text(value, label, max) {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new Error(`${label} must be a non-empty string of at most ${max} characters.`);
  }
}

function validateDiagram(diagram, key) {
  if (!diagram || diagram.width !== 1200 || diagram.height !== 470 ||
      !Array.isArray(diagram.nodes) || !diagram.nodes.length || diagram.nodes.length > 14 ||
      !Array.isArray(diagram.edges)) {
    throw new Error(`Diagram ${key}: expected a 1200x470 canvas, 1-14 nodes, and edges.`);
  }
  text(diagram.title, `Diagram ${key} title`, 100);
  text(diagram.description, `Diagram ${key} description`, 600);
  const ids = new Set();
  for (const node of diagram.nodes) {
    text(node.id, "Node ID", 50);
    if (ids.has(node.id)) throw new Error(`Duplicate diagram node: ${node.id}`);
    ids.add(node.id);
    if (![node.x, node.y, node.w, node.h].every(Number.isFinite) ||
        node.x < 0 || node.y < 0 || node.w <= 0 || node.h <= 0 ||
        node.x + node.w > 1200 || node.y + node.h > 470) {
      throw new Error(`Node ${node.id} is outside the diagram canvas.`);
    }
    if (!Array.isArray(node.lines) || !node.lines.length || node.lines.length > 4) {
      throw new Error(`Node ${node.id} needs 1-4 label lines.`);
    }
    node.lines.forEach(line => text(line, `Node ${node.id} line`, 27));
    if (node.tone && !tones.has(node.tone)) throw new Error(`Unknown node tone: ${node.tone}`);
    if (node.shape && !["rect", "decision"].includes(node.shape)) throw new Error(`Unknown shape: ${node.shape}`);
  }
  for (let i = 0; i < diagram.nodes.length; i++) {
    for (const other of diagram.nodes.slice(i + 1)) {
      const node = diagram.nodes[i];
      if (node.x < other.x + other.w && node.x + node.w > other.x &&
          node.y < other.y + other.h && node.y + node.h > other.y) {
        throw new Error(`Overlapping diagram nodes: ${node.id}, ${other.id}`);
      }
    }
  }
  for (const edge of diagram.edges) {
    if (!Array.isArray(edge.points) || edge.points.length < 2 || edge.points.length > 8 ||
        !edge.points.every(p => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite) &&
          p[0] >= 0 && p[0] <= 1200 && p[1] >= 0 && p[1] <= 470)) {
      throw new Error(`Diagram ${key} contains invalid edge points.`);
    }
    if ((edge.from && !ids.has(edge.from)) || (edge.to && !ids.has(edge.to))) {
      throw new Error(`Diagram ${key} contains an edge to an unknown node.`);
    }
    if (edge.label) {
      text(edge.label, "Edge label", 45);
      if (![edge.labelX, edge.labelY].every(Number.isFinite) ||
          edge.labelX < 0 || edge.labelX > 1200 || edge.labelY < 0 || edge.labelY > 470) {
        throw new Error("Edge labels need labelX and labelY within the canvas.");
      }
    }
  }
}

function validateSpec(spec, diagrams) {
  if (!spec || spec.synthetic !== true || !Array.isArray(spec.slides) || spec.slides.length !== 8) {
    throw new Error("Expected synthetic: true and exactly eight slides.");
  }
  text(spec.title, "Deck title", 100);
  for (const [index, slide] of spec.slides.entries()) {
    const label = `Slide ${index + 1}`;
    text(slide.title, `${label} title`, 78);
    text(slide.notes, `${label} notes`, 3000);
    if (!Array.isArray(slide.sources) || !slide.sources.length || slide.sources.length > 4) {
      throw new Error(`${label} needs 1-4 sources.`);
    }
    slide.sources.forEach(source => text(source, `${label} source`, 85));
    if (slide.sources.join(" | ").length > 180) throw new Error(`${label} sources are too long for the footer.`);
    switch (slide.kind) {
      case "title":
        text(slide.subtitle, `${label} subtitle`, 220);
        break;
      case "bullets":
        if (!Array.isArray(slide.bullets) || !slide.bullets.length || slide.bullets.length > 5) throw new Error(`${label} needs 1-5 bullets.`);
        slide.bullets.forEach(item => text(item, `${label} bullet`, 155));
        break;
      case "metrics":
        if (!Array.isArray(slide.metrics) || slide.metrics.length !== 3) throw new Error(`${label} needs three metrics.`);
        for (const metric of slide.metrics) {
          text(metric.value, "Metric value", 16);
          text(metric.label, "Metric label", 48);
          text(metric.detail, "Metric detail", 100);
        }
        break;
      case "diagram":
        text(slide.diagramKey, `${label} diagram key`, 50);
        validateDiagram(diagrams[slide.diagramKey], slide.diagramKey);
        break;
      case "table":
        if (!Array.isArray(slide.headers) || slide.headers.length < 2 || slide.headers.length > 4 ||
            !Array.isArray(slide.rows) || !slide.rows.length || slide.rows.length > 5) throw new Error(`${label} needs 2-4 columns and 1-5 rows.`);
        slide.headers.forEach(cell => text(cell, `${label} header`, 45));
        for (const row of slide.rows) {
          if (!Array.isArray(row) || row.length !== slide.headers.length) throw new Error(`${label} has an invalid table row.`);
          row.forEach(cell => text(cell, `${label} table cell`, 130));
        }
        break;
      default:
        throw new Error(`Unsupported slide kind: ${slide.kind}`);
    }
  }
  if (spec.slides.filter(slide => slide.kind === "diagram").length < 2) throw new Error("Include at least two native diagram slides: business process and architecture.");
}

async function buildDeck(specPath, outputPath) {
  if (!specPath || !outputPath || !/\.json$/i.test(specPath) || !/\.pptx$/i.test(outputPath)) {
    throw new Error("Usage: build-deck.cjs --spec path.json --out path.pptx");
  }
  if (fs.existsSync(outputPath)) throw new Error(`Output already exists: ${outputPath}. Choose a new filename.`);
  const spec = JSON.parse(fs.readFileSync(specPath, "utf8"));
  text(spec.diagramFile, "diagramFile", 260);
  if (/^[a-z]+:\/\//i.test(spec.diagramFile)) throw new Error("diagramFile must be local.");
  const diagrams = JSON.parse(fs.readFileSync(path.resolve(path.dirname(specPath), spec.diagramFile), "utf8"));
  validateSpec(spec, diagrams);
  const starter = path.resolve(__dirname, "..", "..", "..", "..");
  const python = process.platform === "win32" ?
    path.join(starter, ".venv", "Scripts", "python.exe") : path.join(starter, ".venv", "bin", "python");
  if (!fs.existsSync(python)) {
    throw new Error("Python environment missing. In starter, run python -m venv .venv, then install requirements.txt with that environment's Python.");
  }
  const result = spawnSync(python, [
    path.join(__dirname, "build_deck.py"), "--spec", path.resolve(specPath), "--out", path.resolve(outputPath),
  ], { encoding: "utf8", windowsHide: true, timeout: 120000 });
  if (result.error) throw new Error(`PowerPoint renderer could not run: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`PowerPoint renderer failed:\n${result.stderr || result.stdout}`);
  if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) throw new Error("PowerPoint renderer did not create an output file.");
  return { outputPath, slides: spec.slides.length };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length !== 4 || args[0] !== "--spec" || args[2] !== "--out") {
    console.error("Usage: build-deck.cjs --spec path.json --out path.pptx");
    process.exitCode = 1;
  } else {
    buildDeck(args[1], args[3]).then(result => {
      console.log(`PPTX created: ${result.outputPath} (${result.slides} slides). Visual review still required.`);
    }).catch(error => { console.error(error.message); process.exitCode = 1; });
  }
}

module.exports = { buildDeck, validateSpec, validateDiagram };
