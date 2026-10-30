"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const { pathToFileURL } = require("node:url");
const testTools = createRequire(path.resolve(__dirname, "..", "..", "copilot-uiux-comparison", "package.json"));
const { chromium } = testTools("playwright");
const pagePath = path.resolve(__dirname, "..", "index.html");

test("Azure article guide is self-contained and keeps generation separate from deployment", () => {
  const html = fs.readFileSync(pagePath, "utf8");
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(/<(?:script|img)\b[^>]*\bsrc=/i.test(html), false);
  assert.equal(/<link\b[^>]*rel="stylesheet"/i.test(html), false);
  for (const match of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(match[1]), `Missing anchor ${match[1]}`);
  assert.match(html, /belum diuji end-to-end/);
  assert.match(html, /1\.0\.244/);
  assert.match(html, /Ctrl\+C/);
  assert.match(html, /Menutup tab browser/);
  assert.match(html, /tidak akan mematikannya/);
});

test("the three prompts copy in full and the page works on desktop and mobile", async () => {
  const browser = await chromium.launch({ headless: true, ...(process.platform === "win32" ? { channel: "msedge" } : {}) });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async value => { window.__copiedPrompt = value; } },
    });
  });
  const page = await context.newPage();
  const errors = [], remote = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => { if (/^https?:/.test(request.url())) remote.push(request.url()); });
  try {
    await page.goto(pathToFileURL(pagePath).href);
    assert.equal(await page.locator(".prompt-card").count(), 3);
    assert.equal(await page.locator(".prompt-card details[open]").count(), 0);
    assert.equal(await page.locator(".how-step").count(), 4);
    assert.equal(await page.locator("#review-options").evaluate(element => element.open), false);
    assert.equal(await page.locator("#context-options").evaluate(element => element.open), false);
    const folder = await page.locator("#app-folder").textContent();
    assert.equal(folder, path.join(path.dirname(pagePath), "app"));
    await page.locator('[data-copy="app-folder"]').click();
    assert.equal(await page.evaluate(() => window.__copiedPrompt), folder);
    assert.match(await page.locator("#toast").textContent(), /Open Folder/);
    await page.locator('[data-copy="start-command"]').click();
    assert.equal(await page.evaluate(() => window.__copiedPrompt), "npm start");
    assert.match(await page.locator("#toast").textContent(), /terminal/);
    await page.locator("#stop-local details > summary").click();
    await page.locator('[data-copy="stop-request"]').click();
    assert.match(await page.evaluate(() => window.__copiedPrompt), /Jangan hentikan proses lain/);
    assert.match(await page.locator("#toast").textContent(), /Copilot Chat/);
    await page.locator("#start-agent-options > summary").click();
    for (const id of ["prompt-article", "prompt-app", "prompt-recommend", "prompt-terraform"]) {
      await page.locator(`[data-copy="${id}"]`).click();
      assert.equal(await page.evaluate(() => window.__copiedPrompt), await page.locator(`#${id}`).textContent());
    }
    assert.equal(await page.locator("#prompt-article").textContent(), "@azure what Azure services should I deploy my app to?");
    const app = await page.locator("#prompt-app").textContent();
    assert.match(app, /8 kasus contoh tanpa data pribadi/);
    assert.match(app, /Jangan buat IaC, login Azure/);
    const recommendation = await page.locator("#prompt-recommend").textContent();
    assert.match(recommendation, /hanya rencana/);
    assert.match(recommendation, /Terraform CLI langsung/);
    const terraform = await page.locator("#prompt-terraform").textContent();
    assert.match(terraform, /terraform init -backend=false/);
    assert.match(terraform, /Jangan menjalankan terraform plan, apply, import, destroy, azd up/);
    await page.evaluate(() => { navigator.clipboard.writeText = async () => { throw new DOMException("Test denied", "NotAllowedError"); }; });
    await page.locator('[data-copy="prompt-app"]').click();
    assert.equal(await page.locator("#copy-dialog").isVisible(), true);
    assert.equal(await page.locator("#manual-copy").inputValue(), app);
    await page.keyboard.press("Escape");
    await page.goto(pathToFileURL(pagePath).href + "#workspace");
    await page.locator("#workspace").waitFor({ state: "visible" });
    assert.equal(await page.locator("#context-options").evaluate(element => element.open), true);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), false);
      await page.locator("#step-terraform summary").click();
      assert.equal(await page.locator("#prompt-terraform").isVisible(), true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), false);
      await page.locator("#step-terraform summary").click();
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(remote, []);
  } finally {
    await context.close();
    await browser.close();
  }
});
