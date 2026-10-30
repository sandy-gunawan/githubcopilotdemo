"use strict";

const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { createRequire } = require("node:module");
const root = path.resolve(__dirname, "..");
const starterRequire = createRequire(path.join(root, "starter", "package.json"));
const { Resvg } = starterRequire("@resvg/resvg-js");
const { buildDeck, validateDiagram } = require(path.join(root, "starter", ".github", "skills", "banking-executive-deck", "scripts", "build-deck.cjs"));
const diagrams = {
  ...JSON.parse(fs.readFileSync(path.join(root, "starter", "input", "diagram-layouts.json"), "utf8")),
  ...JSON.parse(fs.readFileSync(path.join(root, "starter", "input", "incident-timeline-layout.json"), "utf8")),
};
const output = path.join(root, "examples", "diagrams");
const colors = { navy: "#142d3a", teal: "#126b60", mint: "#e6f3e9", amber: "#fff0d6", neutral: "#f1f4f4" };
const escape = value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char]);

function svgFor(diagram, key) {
  const edges = diagram.edges.map(edge => {
    const points = edge.points.map(point => point.join(",")).join(" ");
    const labelWidth = edge.label ? edge.label.length * 8.7 + 12 : 0;
    return `<polyline points="${points}" fill="none" stroke="#607780" stroke-width="2"${edge.dashed ? ' stroke-dasharray="7 6"' : ""}${edge.arrow === false ? "" : ' marker-end="url(#arrow)"'}/>` +
      (edge.label ? `<rect x="${edge.labelX - labelWidth / 2}" y="${edge.labelY - 12}" width="${labelWidth}" height="22" rx="4" fill="white"/><text x="${edge.labelX}" y="${edge.labelY + 4}" text-anchor="middle" fill="#435e68" font-size="16">${escape(edge.label)}</text>` : "");
  }).join("\n");
  const nodes = diagram.nodes.map(node => {
    const fill = colors[node.tone || "mint"];
    const dark = ["teal", "navy"].includes(node.tone);
    const shape = node.shape === "decision" ?
      `<polygon points="${node.x + node.w / 2},${node.y} ${node.x + node.w},${node.y + node.h / 2} ${node.x + node.w / 2},${node.y + node.h} ${node.x},${node.y + node.h / 2}" fill="${fill}" stroke="#c6d6d5"/>` :
      `<rect x="${node.x}" y="${node.y}" width="${node.w}" height="${node.h}" rx="12" fill="${fill}" stroke="${dark ? fill : "#c6d6d5"}"/>`;
    const font = node.shape === "decision" ? 17 : 19;
    const lineHeight = 24;
    const firstY = node.y + node.h / 2 - (node.lines.length - 1) * lineHeight / 2 + 6;
    const lines = node.lines.map((line, i) => `<tspan x="${node.x + node.w / 2}" y="${firstY + i * lineHeight}">${escape(line)}</tspan>`).join("");
    return `${shape}<text fill="${dark ? "#ffffff" : "#203c47"}" text-anchor="middle" font-size="${font}" font-weight="600">${lines}</text>`;
  }).join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1240" height="590" viewBox="0 0 1240 590" role="img" aria-labelledby="${key}-title ${key}-desc">
<title id="${key}-title">${escape(diagram.title)}</title><desc id="${key}-desc">${escape(diagram.description)}</desc>
<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L8,4 L0,8 Z" fill="#607780"/></marker></defs>
<rect width="1240" height="590" rx="16" fill="white"/>
<g font-family="Arial, sans-serif"><text x="40" y="38" fill="#142d3a" font-size="23" font-weight="700">${escape(diagram.title)}</text>
<g transform="translate(20,65)">${edges}${nodes}</g>
<text x="40" y="570" fill="#536b74" font-size="14">SINTETIS / BUKAN PRODUKSI - Bank Nusa Demo - sumber: ${escape(diagram.source || "input latihan versi 1.0")}</text></g></svg>\n`;
}

function drawioFor(diagram) {
  const nodes = diagram.nodes.map(node => {
    const dark = ["teal", "navy"].includes(node.tone);
    const style = `${node.shape === "decision" ? "rhombus;" : "rounded=1;"}whiteSpace=wrap;html=0;fillColor=${colors[node.tone || "mint"]};strokeColor=#c6d6d5;fontFamily=Arial;fontSize=18;fontColor=${dark ? "#ffffff" : "#203c47"};`;
    return `<mxCell id="${escape(node.id)}" value="${escape(node.lines.join("\n")).replace(/\n/g, "&#xa;")}" style="${style}" vertex="1" parent="1"><mxGeometry x="${node.x + 20}" y="${node.y + 65}" width="${node.w}" height="${node.h}" as="geometry"/></mxCell>`;
  }).join("\n");
  const edges = diagram.edges.map((edge, index) => {
    const start = edge.points[0];
    const end = edge.points[edge.points.length - 1];
    const from = diagram.nodes.find(node => node.id === edge.from);
    const to = diagram.nodes.find(node => node.id === edge.to);
    const anchor = (node, point, prefix) => node ? `${prefix}X=${(point[0] - node.x) / node.w};${prefix}Y=${(point[1] - node.y) / node.h};${prefix}Perimeter=0;` : "";
    const style = `edgeStyle=none;rounded=0;html=0;strokeColor=#607780;fontSize=16;labelBackgroundColor=#ffffff;endArrow=${edge.arrow === false ? "none" : "block"};${edge.dashed ? "dashed=1;" : ""}${anchor(from, start, "exit")}${anchor(to, end, "entry")}`;
    const middle = edge.points.slice(1, -1).map(point => `<mxPoint x="${point[0] + 20}" y="${point[1] + 65}"/>`).join("");
    return `<mxCell id="edge-${index}" value="${escape(edge.label || "")}" style="${style}" edge="1" parent="1"${from ? ` source="${escape(from.id)}"` : ""}${to ? ` target="${escape(to.id)}"` : ""}><mxGeometry relative="1" as="geometry"><mxPoint x="${start[0] + 20}" y="${start[1] + 65}" as="sourcePoint"/><mxPoint x="${end[0] + 20}" y="${end[1] + 65}" as="targetPoint"/><Array as="points">${middle}</Array></mxGeometry></mxCell>`;
  }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="Banking Skills Lab" modified="2026-10-28T00:00:00Z"><diagram id="banking-demo" name="SINTETIS"><mxGraphModel dx="1240" dy="590" grid="1" gridSize="10" page="1" pageWidth="1240" pageHeight="590"><root><mxCell id="0"/><mxCell id="1" parent="0"/>
<mxCell id="diagram-title" value="${escape(diagram.title)}" style="text;html=0;fontFamily=Arial;fontSize=23;fontStyle=1;align=left;" vertex="1" parent="1"><mxGeometry x="40" y="10" width="1160" height="40" as="geometry"/></mxCell>
${nodes}${edges}
<mxCell id="diagram-footer" value="SINTETIS / BUKAN PRODUKSI - Bank Nusa Demo" style="text;html=0;fontFamily=Arial;fontSize=14;align=left;" vertex="1" parent="1"><mxGeometry x="40" y="545" width="1160" height="30" as="geometry"/></mxCell>
</root></mxGraphModel></diagram></mxfile>\n`;
}

async function main() {
  fs.mkdirSync(output, { recursive: true });
  for (const [key, diagram] of Object.entries(diagrams)) {
    validateDiagram(diagram, key);
    const svg = svgFor(diagram, key);
    fs.writeFileSync(path.join(output, `${key}.svg`), svg);
    fs.writeFileSync(path.join(output, `${key}.drawio`), drawioFor(diagram));
    const renderer = new Resvg(svg, { fitTo: { mode: "width", value: 2480 }, font: { defaultFontFamily: "Arial", loadSystemFonts: true } });
    fs.writeFileSync(path.join(output, `${key}.png`), renderer.render().asPng());
  }
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "banking-deck-"));
  try {
    const deck = path.join(temp, "reference.pptx");
    await buildDeck(path.join(root, "starter", "input", "deck-spec.json"), deck);
    fs.copyFileSync(deck, path.join(root, "examples", "executive-brief.pptx"));
  } finally {
    fs.rmSync(temp, { recursive: true });
  }
  console.log(`Rebuilt ${Object.keys(diagrams).length} reference diagrams (SVG/PNG/drawio) and the reference PPTX.`);
}

if (require.main === module) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}

module.exports = { svgFor, drawioFor };
