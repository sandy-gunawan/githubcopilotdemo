"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");
const root = path.resolve(__dirname, "..");
const url = pathToFileURL(path.join(root, "index.html")).href;

test("offline workshop works on desktop and mobile, without a web server", async t => {
  const browser = await chromium.launch({ headless: true, ...(process.platform === "win32" ? { channel: "msedge" } : {}) });
  const screenshots = process.env.WORKSHOP_SCREENSHOT_DIR || fs.mkdtempSync(path.join(os.tmpdir(), "banking-ui-"));
  fs.mkdirSync(screenshots, { recursive: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async value => { window.__copiedWorkshopText = value; } },
    });
  });
  const page = await context.newPage();
  const errors = [];
  const remoteRequests = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  page.on("request", request => { if (/^https?:/.test(request.url())) remoteRequests.push(request.url()); });
  const navigate = async id => { await page.goto(`${url}#${id}`); await page.locator(`#${id}`).waitFor({ state: "visible" }); };
  const screenshot = async name => {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForFunction(() => window.scrollY === 0);
    await page.waitForFunction(() => document.getAnimations().every(animation => animation.playState === "finished"));
    await page.screenshot({ path: path.join(screenshots, name), fullPage: true });
  };
  try {
    await t.test("all eleven pages navigate by hash and initial overview fits desktop", async () => {
      await navigate("overview");
      assert.equal(await page.locator(".page-section:visible").count(), 1);
      assert.match(await page.title(), /Mulai di sini/);
      await page.waitForFunction(() => window.scrollY === 0);
      await screenshot("desktop-overview.png");
      for (const id of ["setup", "case", "data", "business", "architecture", "powerpoint", "minutes", "incident", "review", "facilitator"]) {
        await page.locator(`[data-nav="${id}"]`).click();
        await page.locator(`#${id}`).waitFor({ state: "visible" });
        assert.equal(await page.locator(".page-section:visible").count(), 1);
        assert.equal(await page.locator(`[data-nav="${id}"]`).getAttribute("aria-current"), "page");
      }
      await page.goto(`${url}#unknown`);
      await page.locator("#overview").waitFor({ state: "visible" });
      assert.equal(await page.locator("#overview").isVisible(), true);
    });

    await t.test("setup code copies the complete PowerShell block", async () => {
      await navigate("setup");
      assert.match(await page.locator('[data-nav="setup"]').textContent(), /Cara install skill/);
      assert.match(page.url(), /index\.html#setup$/);
      assert.match(await page.locator("#setup-title").textContent(), /Cara install skill/);
      assert.equal(await page.locator("#setup .step-list > .setup-step").count(), 5);
      assert.match(await page.locator("#download-guide").textContent(), /Tujuh skill Awesome Copilot belum ikut di ZIP ini/);
      assert.equal(await page.locator('#setup a[href="https://cli.github.com/"]').count(), 1);
      await page.locator("#manual-skill-download summary").click();
      assert.equal(await page.locator("#download-awesome-zip").getAttribute("href"),
        "https://github.com/github/awesome-copilot/archive/0fe6545b950671641b2b14b44eb56678fea6c6b4.zip");
      assert.match(await page.locator("#manual-skill-download").textContent(), /langsung lanjut langkah 4/);
      await page.locator("#manual-skill-download summary").click();
      await page.locator("#single-skill-install summary").click();
      const singleSkill = page.locator("#single-skill-install");
      await singleSkill.locator("[data-copy-code]").click();
      assert.equal(await page.evaluate(() => window.__copiedWorkshopText), await singleSkill.locator("pre").textContent());
      await singleSkill.locator("summary").click();
      const button = page.locator(".code-card:visible [data-copy-code]").first();
      const expected = await page.locator(".code-card:visible pre").first().textContent();
      await button.click();
      assert.equal(await page.evaluate(() => window.__copiedWorkshopText), expected);
    });

    await t.test("each demo starts with one standalone prompt and hides manual commands", async () => {
      for (const [id, file] of [
        ["business", "demo-01-business.md"],
        ["architecture", "demo-02-architecture.md"],
        ["powerpoint", "demo-03-powerpoint.md"],
      ]) {
        await navigate(id);
        await page.locator(`#${id}-tab-steps`).click();
        const panel = page.locator(`#${id}-steps`);
        assert.equal(await panel.locator(".prompt-slot:visible").count(), 1);
        assert.equal(await panel.locator(".code-card:visible").count(), 0);
        const card = panel.locator(".prompt-card:visible");
        await card.locator(".copy-button").click();
        assert.equal(await page.evaluate(() => window.__copiedWorkshopText),
          fs.readFileSync(path.join(root, "starter", "prompts", file), "utf8"));
        assert.equal(await panel.locator(".demo-result").isVisible(), true);
      }
      await navigate("business");
      await page.locator("#business-tab-steps").click();
      await screenshot("desktop-quick-demo.png");
    });

    await t.test("lab tabs support keyboard arrows; full prompt and manual copy fallback work", async () => {
      await navigate("business");
      await page.locator("#business-tab-steps").focus();
      await page.keyboard.press("ArrowRight");
      assert.equal(await page.locator("#business-tab-prompts").getAttribute("aria-selected"), "true");
      assert.equal(await page.locator("#business-prompts").isVisible(), true);
      const card = page.locator('#business-prompts .prompt-card').first();
      await card.locator(".copy-button").click();
      const expected = fs.readFileSync(path.join(root, "starter", "prompts", "01-outline.md"), "utf8");
      assert.equal(await page.evaluate(() => window.__copiedWorkshopText), expected);
      await page.evaluate(() => {
        navigator.clipboard.writeText = async () => { throw new DOMException("Test clipboard denial", "NotAllowedError"); };
      });
      await card.locator(".copy-button").click();
      assert.equal(await page.locator("#copy-dialog").isVisible(), true);
      assert.equal(await page.locator("#manual-copy").inputValue(), expected.replace(/\r\n/g, "\n"));
      await page.keyboard.press("Escape");
      assert.equal(await page.locator("#copy-dialog").isVisible(), false);
      await card.locator(".prompt-foot button").click();
      assert.equal(await card.locator("pre").evaluate(element => element.classList.contains("expanded")), true);
    });

    await t.test("meeting minutes and incident report have dedicated prompts, raw inputs, and actual Word downloads", async () => {
      await page.evaluate(() => {
        navigator.clipboard.writeText = async value => { window.__copiedWorkshopText = value; };
      });
      for (const [id, file, example] of [
        ["minutes", "demo-04-minutes.md", "meeting-minutes.docx"],
        ["incident", "demo-05-incident.md", "incident-postmortem.docx"],
      ]) {
        await navigate(id);
        const section = page.locator(`#${id}`);
        const card = section.locator(".prompt-card").first();
        await card.locator(".copy-button").click();
        assert.equal(await page.evaluate(() => window.__copiedWorkshopText),
          fs.readFileSync(path.join(root, "starter", "prompts", file), "utf8"));
        assert.equal(await section.locator(".demo-result").isVisible(), true);
        const source = section.locator("details").filter({ has: page.locator(".resource-slot") });
        await source.locator("summary").click();
        assert.equal(await source.locator(".resource-slot pre").isVisible(), true);
        const event = page.waitForEvent("download");
        await section.locator(`a[href="examples/${example}"]`).click();
        const download = await event;
        assert.equal(fs.readFileSync(await download.path()).equals(fs.readFileSync(path.join(root, "examples", example))), true);
      }
      await page.locator("#incident [data-zoom]").click();
      assert.match(await page.locator("#large-diagram").getAttribute("src"), /incident-timeline\.svg/);
      await page.keyboard.press("Escape");
      await screenshot("desktop-incident.png");
    });

    await t.test("SLA simulator honors exact thresholds, closed state, and fraud", async () => {
      await navigate("business");
      await page.locator("#business-tab-steps").click();
      await page.locator("#business-extra > summary").click();
      const range = page.locator("#elapsed");
      const setElapsed = minutes => range.evaluate((input, value) => {
        input.value = String(value);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }, minutes);
      for (const [minutes, expected] of [[119, "Belum wajib"], [120, "Wajib eskalasi"], [121, "Wajib eskalasi"]]) {
        await setElapsed(minutes);
        assert.match(await page.locator("#sla-result").textContent(), new RegExp(expected));
      }
      await page.locator("#sla-version").selectOption("90");
      await setElapsed(90);
      assert.match(await page.locator("#sla-result").textContent(), />= 90/);
      await page.locator("#case-closed").check();
      assert.match(await page.locator("#sla-result").textContent(), /sudah closed/);
      await page.locator("#case-closed").uncheck();
      await setElapsed(1);
      await page.locator("#case-fraud").check();
      assert.match(await page.locator("#sla-result").textContent(), /Segera eskalasi/);
    });

    await t.test("data explorer computes table, filters empty results, and downloads exact input", async () => {
      await navigate("data");
      await page.locator('.file-button[data-path="starter/input/complaints.csv"]').click();
      assert.equal(await page.locator("#csv-preview tbody tr").count(), 12);
      assert.equal(await page.locator("#csv-preview .badge-warn").count(), 3);
      const event = page.waitForEvent("download");
      await page.locator("#download-file").click();
      const download = await event;
      assert.equal(download.suggestedFilename(), "complaints.csv");
      assert.equal(fs.readFileSync(await download.path(), "utf8"), fs.readFileSync(path.join(root, "starter", "input", "complaints.csv"), "utf8"));
      await page.locator("#file-search").fill("no-matching-fixture");
      assert.equal(await page.locator("#file-empty").isVisible(), true);
      await page.locator("#file-search").fill("arsitektur");
      assert.equal(await page.locator(".file-button").count(), 1);
    });

    await t.test("diagram selection and zoom load real local SVG assets", async () => {
      await navigate("architecture");
      await page.locator("#architecture-tab-result").click();
      await page.locator('[data-architecture-diagram="sequence"]').click();
      assert.match(await page.locator("#architecture-diagram").getAttribute("src"), /sequence\.svg/);
      await page.waitForFunction(() => {
        const image = document.getElementById("architecture-diagram");
        return image.complete && image.naturalWidth > 0;
      });
      await page.locator("#architecture-zoom").click();
      assert.equal(await page.locator("#diagram-dialog").isVisible(), true);
      assert.match(await page.locator("#large-diagram").getAttribute("src"), /sequence\.svg/);
      await page.keyboard.press("Escape");
      await screenshot("desktop-architecture.png");
    });

    await t.test("all eight preview slides and actual PPTX download are available", async () => {
      await navigate("powerpoint");
      await page.locator("#powerpoint-tab-result").click();
      assert.equal(await page.locator("#previous-slide").isDisabled(), true);
      for (let index = 1; index < 8; index++) {
        await page.locator("#next-slide").click();
        assert.equal(await page.locator("#slide-counter").textContent(), `${index + 1} / 8`);
      }
      assert.equal(await page.locator("#next-slide").isDisabled(), true);
      assert.match(await page.locator("#slide-preview").textContent(), /Keputusan yang diminta/);
      const event = page.waitForEvent("download");
      await page.locator('a[href="examples/executive-brief.pptx"]').click();
      const download = await event;
      assert.equal(fs.readFileSync(await download.path()).equals(fs.readFileSync(path.join(root, "examples", "executive-brief.pptx"))), true);
    });

    await t.test("eight checkpoints persist, completion is explicit, and reset requires confirmation", async () => {
      for (const id of ["setup", "data", "business", "architecture", "powerpoint", "minutes", "incident", "review"]) {
        await navigate(id);
        await page.locator(`[data-milestone="${id}"]`).check();
      }
      assert.equal(await page.locator("#progress-label").textContent(), "8 dari 8 checkpoint");
      assert.equal(await page.locator("#completion-card").isVisible(), true);
      await page.reload();
      assert.equal(await page.locator('[data-milestone="review"]').isChecked(), true);
      await page.locator("#reset-progress").click();
      await page.locator("#reset-dialog [data-close-dialog]").last().click();
      assert.equal(await page.locator("#progress-label").textContent(), "8 dari 8 checkpoint");
      await page.locator("#reset-progress").click();
      await page.locator("#confirm-reset").click();
      assert.equal(await page.locator("#progress-label").textContent(), "0 dari 8 checkpoint");
    });

    await t.test("facilitator state persists; timer starts and pauses", async () => {
      await navigate("business");
      assert.equal(await page.locator("#business .facilitator-note").isVisible(), false);
      await page.locator("#facilitator-toggle").click();
      assert.equal(await page.locator("#business .facilitator-note").isVisible(), true);
      await page.reload();
      assert.equal(await page.locator("#business .facilitator-note").isVisible(), true);
      const timer = page.locator("#business [data-timer]");
      await timer.click();
      assert.equal(await timer.getAttribute("aria-pressed"), "true");
      await page.waitForFunction(() => document.querySelector("#business [data-timer-label]").textContent !== "20:00");
      await timer.click();
      assert.equal(await timer.getAttribute("aria-pressed"), "false");
    });

    await t.test("mobile navigation, tabs and every section avoid viewport overflow", async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await navigate("overview");
      assert.equal(await page.locator("#sidebar").evaluate(element => element.inert), true);
      await page.locator("#menu-toggle").click();
      assert.equal(await page.locator("#menu-toggle").getAttribute("aria-expanded"), "true");
      await page.locator('[data-nav="business"]').click();
      await page.locator("#business").waitFor({ state: "visible" });
      assert.equal(await page.locator("#menu-toggle").getAttribute("aria-expanded"), "false");
      for (const id of ["overview", "setup", "case", "data", "business", "architecture", "powerpoint", "minutes", "incident", "review", "facilitator"]) {
        await navigate(id);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
        assert.equal(overflow, false, `Viewport overflow on ${id}`);
      }
      await navigate("overview");
      await screenshot("mobile-overview.png");
      await navigate("business");
      await page.locator("#business-tab-steps").click();
      await screenshot("mobile-prompts.png");
    });

    await t.test("one skills link opens all eight summaries, sources, and demo links on desktop and mobile", async () => {
      await navigate("overview");
      await page.locator("#menu-toggle").click();
      await page.locator('#sidebar a[href="skills.html"]').click();
      await page.getByRole("heading", { name: "Skill apa yang dipakai, dan buat apa?" }).waitFor({ state: "visible" });
      assert.equal(await page.locator("[data-skill]").count(), 8);
      assert.equal(await page.locator('[data-skill] a[href^="https://github.com/github/awesome-copilot/"]').count(), 7);
      assert.equal(await page.locator('[data-skill="banking-executive-deck"] .source-tag').textContent(), "Buatan workshop \u00b7 MIT");
      await page.getByRole("link", { name: "Cara install di workshop", exact: false }).click();
      await page.locator("#setup").waitFor({ state: "visible" });
      assert.match(page.url(), /index\.html#setup$/);
      assert.match(await page.locator("#setup").textContent(), /npm run check:demo/);
      await page.locator("#menu-toggle").click();
      await page.locator('#sidebar a[href="skills.html"]').click();
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), false);
      }
      await screenshot("skills-summary-mobile.png");
      await page.getByRole("link", { name: "Kembali ke workshop", exact: false }).click();
      await page.locator("#overview").waitFor({ state: "visible" });
    });

    await t.test("print includes all sections and no runtime errors or remote requests occurred", async () => {
      await page.emulateMedia({ media: "print" });
      assert.equal(await page.locator(".page-section:visible").count(), 11);
      await page.emulateMedia({ media: "screen" });
      assert.deepEqual(errors, []);
      assert.deepEqual(remoteRequests, []);
    });
    console.log(`UI screenshots: ${screenshots}`);
  } finally {
    await context.close();
    await browser.close();
    if (!process.env.WORKSHOP_SCREENSHOT_DIR) fs.rmSync(screenshots, { recursive: true });
  }
});
