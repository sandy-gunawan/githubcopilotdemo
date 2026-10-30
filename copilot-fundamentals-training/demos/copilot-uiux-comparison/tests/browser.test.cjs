"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { createHash } = require("node:crypto");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");
const root = path.resolve(__dirname, "..");
const url = pathToFileURL(path.join(root, "index.html")).href;
const prompt = fs.readFileSync(path.join(root, "materials", "prompt.md"), "utf8");
const cPrompt = key => fs.readFileSync(path.join(root, "workspaces", key, "C", "prompt.md"), "utf8");

test("every C prompt differs from A/B and explicitly selects its design skills", () => {
  for (const [key, skills] of Object.entries({
    dashboard: ["ui-ux-pro-max", "nusa-operations-design"],
    landing: ["frontend-design", "nusa-landing-design"],
  })) {
    const text = cPrompt(key);
    assert.notEqual(text, prompt, `${key}/C must not copy the base A/B prompt`);
    for (const skill of skills) assert.ok(text.includes(skill), `${key}/C must explicitly select ${skill}`);
  }
});

test("the self-contained UI skill guide supports both A/B comparisons and optional C workflows", async t => {
  const browser = await chromium.launch({ headless: true, ...(process.platform === "win32" ? { channel: "msedge" } : {}) });
  const screenshots = process.env.UIUX_SCREENSHOTS || fs.mkdtempSync(path.join(os.tmpdir(), "uiux-skill-guide-"));
  fs.mkdirSync(screenshots, { recursive: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async value => { window.__copiedText = value; } },
    });
  });
  const page = await context.newPage();
  const errors = [], remote = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error" && message.location().url === url) errors.push(message.text());
  });
  page.on("request", request => { if (/^https?:/.test(request.url())) remote.push(request.url()); });
  const screenshot = async name => {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(screenshots, name), fullPage: true });
  };
  try {
    await page.goto(url);
    await t.test("the default guide starts with Open Folder and paste, not ZIP, uploads or scoring", async () => {
      for (const id of ["setup-options", "c-options", "case-materials", "preview-options", "score-options", "source-options"]) {
        assert.equal(await page.locator(`#${id}`).evaluate(element => element.open), false, `${id} must be optional`);
      }
      assert.equal(await page.locator('a[href="uiux-comparison-kit.zip"]').isVisible(), false);
      assert.match(await page.locator("#ready-note").textContent(), /abaikan ZIP/);
      assert.match(await page.locator("#scenario").textContent(), /File.*Open Folder/);
      assert.equal(await page.locator(".hero-art .mini-result").count(), 2);
      assert.equal(await page.locator("#folder-a").textContent(), "workspaces\\dashboard\\A");
      for (const condition of ["A", "B"]) {
        await page.locator(`[data-copy-prompt="${condition}"]`).click();
        assert.equal(await page.evaluate(() => window.__copiedText), prompt);
      }
      assert.equal(await page.locator("#include-c").isChecked(), false);
      await page.locator("#c-options > summary").click();
      await page.locator('[data-copy-prompt="C"]').click();
      assert.equal(await page.evaluate(() => window.__copiedText), cPrompt("dashboard"));
      assert.notEqual(await page.evaluate(() => window.__copiedText), prompt);
      assert.match(await page.locator("#c-direction").textContent(), /Triage-first/);
      assert.equal(await page.locator("#c-checks li").count(), 4);
      await page.locator("#c-options > summary").click();
    });
    await t.test("A/B keep their prompt while C copies the exact prompt for the selected workspace", async () => {
      for (const key of ["dashboard", "landing", "dashboard"]) {
        await page.locator(`[data-case="${key}"]`).click();
        await page.locator("#copy-prompt").click();
        assert.equal(await page.evaluate(() => window.__copiedText), prompt);
        await page.locator("#c-options").evaluate(element => { element.open = true; });
        for (const selector of ['[data-copy-prompt="C"]', "#copy-c-prompt"]) {
          await page.locator(selector).click();
          assert.equal(await page.evaluate(() => window.__copiedText), cPrompt(key));
        }
        assert.equal(await page.locator("#c-prompt-text").textContent(), cPrompt(key));
        assert.match(await page.locator("#c-prompt-mode").textContent(), /skill \+ prompt terarah/);
        assert.notEqual(cPrompt(key), prompt);
        await page.locator("#c-options").evaluate(element => { element.open = false; });
        for (const condition of ["A", "B", "C"]) {
          assert.equal(await page.locator(`#command-${condition.toLowerCase()}`).textContent(), `code --new-window .\\workspaces\\${key}\\${condition}`);
          assert.equal(await page.locator(`#folder-${condition.toLowerCase()}`).textContent(), `workspaces\\${key}\\${condition}`);
        }
        assert.equal(await page.locator("#c-skill-name").textContent(), key === "dashboard" ? "nusa-operations-design" : "nusa-landing-design");
      }
      assert.match(await page.locator("#case-baseline").textContent(), /12 kasus, 9 aktif, 4 perlu eskalasi/);
      assert.equal(await page.locator("#frame-a").isVisible(), false);
      assert.equal(await page.locator("#frame-b").isVisible(), false);
      assert.equal(await page.locator("#frame-c").isVisible(), false);
      assert.equal(await page.locator("#allow-scripts").isChecked(), false);
      await screenshot("desktop-guide.png");
    });
    await t.test("downloads contain actual prompt and current-use-case data", async () => {
      await page.locator('[data-case="landing"]').click();
      await page.locator("#case-materials > summary").click();
      await page.locator("#shared-prompt-details > summary").click();
      await page.locator("#c-prompt-details > summary").click();
      for (const [selector, name, source] of [
        ["#download-prompt", "prompt.md", path.join(root, "materials", "prompt.md")],
        ["#download-c-prompt", "prompt-C-landing.md", path.join(root, "workspaces", "landing", "C", "prompt.md")],
        ["#download-brief", "brief.md", path.join(root, "materials", "landing", "brief.md")],
        ["#download-data", "data.js", path.join(root, "materials", "landing", "data.js")],
      ]) {
        const event = page.waitForEvent("download");
        await page.locator(selector).click();
        const download = await event;
        assert.equal(download.suggestedFilename(), name);
        assert.equal(fs.readFileSync(await download.path()).equals(fs.readFileSync(source)), true);
      }
    });
    await t.test("clipboard denial shows complete manual-copy text", async () => {
      await page.evaluate(() => { navigator.clipboard.writeText = async () => { throw new DOMException("Test denied", "NotAllowedError"); }; });
      await page.locator("#copy-prompt").click();
      assert.equal(await page.locator("#copy-dialog").isVisible(), true);
      assert.equal(await page.locator("#manual-copy").inputValue(), prompt.replace(/\r\n/g, "\n"));
      await page.keyboard.press("Escape");
      assert.equal(await page.locator("#copy-dialog").isVisible(), false);
      await page.locator("#copy-c-prompt").click();
      assert.equal(await page.locator("#manual-copy").inputValue(), cPrompt("landing").replace(/\r\n/g, "\n"));
      await page.keyboard.press("Escape");
      assert.equal(await page.locator("#copy-dialog").isVisible(), false);
    });
    await t.test("local HTML results are isolated, do not persist across cases, and only run scripts after opt-in", async () => {
      await page.locator('[data-case="dashboard"]').click();
      await page.locator("#include-c").check();
      await page.locator("#preview-options > summary").click();
      const sample = '<!doctype html><html lang="id"><head><title>Test dummy</title></head><body><h1>Hasil dummy</h1><button id="increment">Tambah</button><output id="count">0</output><script>window.count=0;document.getElementById("increment").onclick=()=>document.getElementById("count").textContent=String(++window.count);</script></body></html>';
      for (const condition of ["a", "b", "c"]) {
        await page.locator(`#file-${condition}`).setInputFiles({ name: `hasil-${condition}.html`, mimeType: "text/html", buffer: Buffer.from(sample) });
        await page.locator(`#frame-${condition}`).waitFor({ state: "visible" });
        assert.equal(await page.locator(`#frame-${condition}`).getAttribute("sandbox"), "");
      }
      await page.locator("#allow-scripts").check();
      assert.equal(await page.locator("#frame-a").getAttribute("sandbox"), "allow-scripts");
      await page.frameLocator("#frame-a").locator("#increment").click();
      assert.equal(await page.frameLocator("#frame-a").locator("#count").textContent(), "1");
      assert.equal(await page.frameLocator("#frame-b").locator("#count").textContent(), "0");
      assert.equal(await page.frameLocator("#frame-c").locator("#count").textContent(), "0");
      await page.frameLocator("#frame-c").locator("#increment").click();
      assert.equal(await page.frameLocator("#frame-c").locator("#count").textContent(), "1");
      await page.locator("#include-c").uncheck();
      assert.equal(await page.locator("#frame-c").isVisible(), false);
      assert.equal(await page.locator("#frame-c").getAttribute("srcdoc"), null);
      assert.equal(await page.locator("#frame-c").getAttribute("sandbox"), "");
      await page.locator("#include-c").check();
      assert.equal(await page.frameLocator("#frame-c").locator("#count").textContent(), "0");
      await page.locator("#viewport").selectOption("1440");
      assert.equal(await page.locator("#frame-a").evaluate(frame => frame.style.width), "1440px");
      assert.equal(await page.locator("#frame-b").evaluate(frame => frame.style.width), "1440px");
      assert.equal(await page.locator("#frame-c").evaluate(frame => frame.style.width), "1440px");
      await page.locator('[data-case="landing"]').click();
      assert.equal(await page.locator("#frame-a").isVisible(), false);
      assert.equal(await page.locator("#include-c").isChecked(), false);
      assert.equal(await page.locator("#frame-c").isVisible(), false);
      await page.locator('[data-case="dashboard"]').click();
      assert.match(await page.locator("#name-a").textContent(), /hasil-a.html/);
      assert.match(await page.locator("#name-c").textContent(), /hasil-c.html/);
      assert.equal(await page.locator("#include-c").isChecked(), true);
      assert.equal(await page.locator("#allow-scripts").isChecked(), false);
      await page.locator('[data-clear="A"]').click();
      assert.equal(await page.locator("#frame-a").isVisible(), false);
      await page.locator('[data-clear="B"]').click();
      assert.equal(await page.locator("#frame-b").isVisible(), false);
      await page.locator('[data-clear="C"]').click();
      assert.equal(await page.locator("#frame-c").isVisible(), false);
      await page.locator("#include-c").uncheck();
    });
    await t.test("ratings start blank, require evidence controls, remain separate by use case and export no HTML", async () => {
      await page.locator("#score-options > summary").click();
      assert.match(await page.locator("#score-total").textContent(), /Belum/);
      const selects = page.locator("#score-rows select");
      assert.equal(await selects.count(), 10);
      for (const select of await selects.all()) {
        const condition = await select.getAttribute("data-condition");
        await select.selectOption(condition === "A" ? "2" : "3");
      }
      assert.match(await page.locator("#score-total").textContent(), /A: 10\/20.*B: 15\/20/);
      assert.match(await page.locator("#score-note").textContent(), /belum dikonfirmasi/);
      for (const name of ["same", "clean", "observed"]) await page.locator(`[data-control="${name}"]`).check();
      assert.match(await page.locator("#score-note").textContent(), /penilaian Anda/);
      await page.locator("#model-name").fill("Model demo");
      await page.locator("#evidence-notes").fill("B lebih mudah dipindai; A tetap berfungsi.");
      const event = page.waitForEvent("download");
      await page.locator("#export-review").click();
      const download = await event;
      const review = JSON.parse(fs.readFileSync(await download.path(), "utf8"));
      assert.equal(review.review.model, "Model demo");
      assert.equal(review.review.scores.A.hierarchy, 2);
      assert.equal(review.format, "uiux-skill-abc-review-v2");
      assert.deepEqual(review.conditions, ["A", "B"]);
      assert.equal(review.loadedFiles.C, null);
      assert.equal(JSON.stringify(review).includes("<!doctype"), false);
      await page.locator('[data-case="landing"]').click();
      assert.match(await page.locator("#score-total").textContent(), /Belum/);
      await page.locator('[data-case="dashboard"]').click();
      assert.match(await page.locator("#score-total").textContent(), /A: 10\/20/);
      await page.reload();
      await page.locator("#score-options > summary").click();
      assert.match(await page.locator("#score-total").textContent(), /A: 10\/20/);
      assert.equal(await page.locator("#frame-b").isVisible(), false);
      await page.locator("#reset-review").click();
      await page.locator("#reset-dialog [data-close]").last().click();
      assert.match(await page.locator("#score-total").textContent(), /A: 10\/20/);
      await page.locator("#reset-review").click();
      await page.locator("#confirm-reset").click();
      assert.match(await page.locator("#score-total").textContent(), /Belum/);
    });
    await t.test("optional C has blank scores, separate invocation evidence, persistent choices and versioned exports", async () => {
      await page.locator("#include-c").check();
      const selects = page.locator("#score-rows select");
      assert.equal(await selects.count(), 15);
      for (const select of await page.locator('#score-rows select[data-condition="C"]').all()) {
        assert.equal(await select.inputValue(), "");
      }
      for (const select of await selects.all()) {
        const condition = await select.getAttribute("data-condition");
        await select.selectOption({ A: "2", B: "3", C: "4" }[condition]);
      }
      assert.match(await page.locator("#score-total").textContent(), /A: 10\/20.*B: 15\/20.*C: 20\/20.*C-B: \+5/);
      for (const name of ["same", "clean", "observed"]) await page.locator(`[data-control="${name}"]`).check();
      assert.match(await page.locator("#score-note").textContent(), /belum dikonfirmasi/);
      await page.locator('[data-control="observedC"]').check();
      assert.match(await page.locator("#score-note").textContent(), /penilaian Anda/);
      await page.locator("#include-c").uncheck();
      assert.equal(await page.locator("#score-rows select").count(), 10);
      assert.doesNotMatch(await page.locator("#score-total").textContent(), /C:/);
      await page.locator("#include-c").check();
      assert.match(await page.locator("#score-total").textContent(), /C: 20\/20/);
      await page.locator("#model-name").fill("Model C demo");
      const event = page.waitForEvent("download");
      await page.locator("#export-review").click();
      const review = JSON.parse(fs.readFileSync(await (await event).path(), "utf8"));
      assert.deepEqual(review.conditions, ["A", "B", "C"]);
      assert.equal(review.review.includeC, true);
      assert.equal(review.review.scores.C.hierarchy, 4);
      assert.equal(review.review.controls.observedC, true);
      assert.equal(review.optimizedWorkflow.name, "nusa-operations-design");
      const workflow = fs.readFileSync(path.join(root, "materials", "skills", review.optimizedWorkflow.name, "SKILL.md"));
      assert.equal(review.optimizedWorkflow.sha256, createHash("sha256").update(workflow).digest("hex"));
      assert.deepEqual(review.promptSha256ByCondition, {
        A: createHash("sha256").update(prompt).digest("hex"),
        B: createHash("sha256").update(prompt).digest("hex"),
        C: createHash("sha256").update(cPrompt("dashboard")).digest("hex"),
      });
      assert.equal(JSON.stringify(review).includes("<!doctype"), false);
      await page.locator('[data-case="landing"]').click();
      assert.equal(await page.locator("#include-c").isChecked(), false);
      assert.match(await page.locator("#c-direction").textContent(), /Planner-first/);
      await page.locator('[data-case="dashboard"]').click();
      assert.equal(await page.locator("#include-c").isChecked(), true);
      await page.reload();
      await page.locator("#score-options > summary").click();
      assert.equal(await page.locator("#include-c").isChecked(), true);
      assert.match(await page.locator("#score-total").textContent(), /C: 20\/20/);
      assert.equal(await page.locator("#frame-c").isVisible(), false);
      await page.locator("#reset-review").click();
      await page.locator("#confirm-reset").click();
      assert.equal(await page.locator("#include-c").isChecked(), true);
      assert.match(await page.locator("#score-total").textContent(), /Belum/);
      assert.equal(await page.locator("#score-rows select").count(), 15);
    });
    await t.test("legacy A/B reviews survive migration and invalid saved data reports an error", async () => {
      const scores = value => Object.fromEntries(["hierarchy", "consistency", "workflow", "responsive", "accessibility"].map(key => [key, value]));
      const legacyReview = () => ({ scores: { A: scores(2), B: scores(3) }, controls: { same: true, clean: true, observed: true }, model: "Legacy model", run: "A/B run", notes: "Existing evidence" });
      const legacy = { dashboard: legacyReview(), landing: legacyReview() };
      await page.evaluate(saved => localStorage.setItem("uiux-skill-lab:v1", JSON.stringify(saved)), legacy);
      await page.reload();
      await page.locator("#score-options > summary").click();
      assert.equal(await page.locator("#include-c").isChecked(), false);
      assert.equal(await page.locator("#score-rows select").count(), 10);
      assert.match(await page.locator("#score-total").textContent(), /A: 10\/20.*B: 15\/20/);
      assert.equal(await page.locator("#model-name").inputValue(), "Legacy model");
      assert.equal(await page.locator("#evidence-notes").inputValue(), "Existing evidence");
      await page.locator("#include-c").check();
      assert.match(await page.locator("#score-note").textContent(), /10 dari 15/);
      assert.equal(await page.locator('[data-control="observedC"]').isChecked(), false);
      for (const select of await page.locator('#score-rows select[data-condition="C"]').all()) assert.equal(await select.inputValue(), "");
      for (const field of ["includeC", "scores"]) {
        const invalid = { dashboard: legacyReview(), landing: legacyReview() };
        invalid.dashboard[field] = "invalid";
        await page.evaluate(saved => localStorage.setItem("uiux-skill-lab:v1", JSON.stringify(saved)), invalid);
        await page.reload();
        assert.equal(await page.locator("#storage-error").isVisible(), true);
        assert.match(await page.locator("#storage-error").textContent(), /tidak bisa dimuat/);
        assert.equal(await page.locator("#include-c").isChecked(), false);
      }
      await page.evaluate(() => localStorage.removeItem("uiux-skill-lab:v1"));
      await page.reload();
    });
    await t.test("ZIP help explains moving the demo and deep links reveal optional setup", async () => {
      await page.locator('nav a[href="#zip-help"]').click();
      assert.match(await page.locator("#zip-help").textContent(), /Extract All/);
      assert.match(await page.locator("#zip-help").textContent(), /Bukan aplikasi/);
      await page.locator("#zip-options > summary").click();
      assert.equal(await page.locator('a[href="uiux-comparison-kit.zip"]').isVisible(), true);
      await page.locator('#zip-help a[href="#setup"]').click();
      assert.equal(await page.locator("#setup-options").evaluate(element => element.open), true);
      assert.equal(await page.locator("#verify-command").isVisible(), true);
      await page.locator('nav a[href="#c-options"]').click();
      assert.equal(await page.locator("#c-options").evaluate(element => element.open), true);
      await page.waitForFunction(() => document.querySelector("#c-options > summary").getBoundingClientRect().top >= document.querySelector("nav").getBoundingClientRect().bottom);
      assert.equal(await page.locator('[data-copy-prompt="C"]').isVisible(), true);
    });
    await t.test("guide and both case views fit desktop and mobile with no network calls", async () => {
      await page.evaluate(() => document.querySelectorAll("details").forEach(element => { element.open = false; }));
      await page.locator("#c-options").evaluate(element => { element.open = true; });
      await page.locator("#preview-options").evaluate(element => { element.open = true; });
      await page.locator("#score-options").evaluate(element => { element.open = true; });
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        for (const key of ["dashboard", "landing"]) {
          await page.locator(`[data-case="${key}"]`).click();
          for (const includeC of [false, true]) {
            await page.locator("#include-c").setChecked(includeC);
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), false, `${key} overflow at ${width}, C=${includeC}`);
          }
        }
      }
      await screenshot("mobile-guide.png");
      assert.deepEqual(errors, []);
      assert.deepEqual(remote, []);
    });
    console.log(`Guide screenshots: ${screenshots}`);
  } finally {
    await context.close();
    await browser.close();
    if (!process.env.UIUX_SCREENSHOTS) fs.rmSync(screenshots, { recursive: true });
  }
});
