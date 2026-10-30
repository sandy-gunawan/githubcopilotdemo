"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { once } = require("node:events");
const { chromium } = require("playwright");
const { createApp } = require("../server.js");

test("local portal supports search, creation, status changes, attachments and mobile use", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "portal-browser-"));
  const app = await createApp({ dataDir: directory, logging: false });
  const server = app.listen(0, "127.0.0.1"); await once(server, "listening");
  const url = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true, ...(process.platform === "win32" ? { channel: "msedge" } : {}) });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const page = await context.newPage();
  const errors = [], external = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => { if (!request.url().startsWith(url)) external.push(request.url()); });
  try {
    await page.goto(url);
    await page.waitForFunction(() => document.getElementById("metric-total").textContent === "8");
    await page.locator("#search").fill("demo-c001");
    assert.equal(await page.locator("#cases tr").count(), 1);
    await page.locator("#search").fill("nothing matches xyz");
    assert.equal(await page.locator("#empty").isVisible(), true);
    await page.locator("#empty-reset").click();
    assert.equal(await page.locator("#cases tr").count(), 8);
    await page.locator("#new-case").click();
    for (const [name, value] of [["customerLabel", "Nasabah Contoh Browser"], ["title", "Keluhan uji browser"], ["description", "Ini deskripsi rekaan untuk menguji form dan penyimpanan."]]) {
      await page.locator(`#create-form [name="${name}"]`).fill(value);
    }
    await page.locator('#create-form [type="submit"]').click();
    await page.waitForFunction(() => document.getElementById("metric-total").textContent === "9");
    const record = page.locator(".case-link").filter({ hasText: "Keluhan uji browser" });
    await record.click();
    await page.locator("#detail-status").selectOption("Selesai");
    await page.locator('#status-form [type="submit"]').click();
    await page.waitForFunction(() => document.getElementById("metric-done").textContent === "3");
    await page.locator("#attachment-file").setInputFiles({ name: "bukti-browser.txt", mimeType: "text/plain", buffer: Buffer.from("Lampiran sintetis untuk pengujian UI.") });
    await page.locator('#upload-form [type="submit"]').click();
    const attachment = page.locator("#attachment-list a");
    await attachment.waitFor({ state: "visible" });
    const downloadEvent = page.waitForEvent("download");
    await attachment.click();
    const download = await downloadEvent;
    assert.equal((await fs.readFile(await download.path())).toString(), "Lampiran sintetis untuk pengujian UI.");
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("#detail-dialog").isVisible(), false);
    await page.reload();
    await page.waitForFunction(() => document.getElementById("metric-total").textContent === "9");
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), false);
      await page.locator(".case-link").filter({ hasText: "Keluhan uji browser" }).click();
      await page.locator("#detail-dialog").waitFor({ state: "visible" });
      assert.equal(await page.locator("#detail-status").inputValue(), "Selesai");
      assert.equal(await page.locator("#attachment-list a").count(), 1);
      await page.keyboard.press("Escape");
    }
    if (process.env.PORTAL_SCREENSHOT) await page.screenshot({ path: process.env.PORTAL_SCREENSHOT, fullPage: true });
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
  } finally {
    await context.close(); await browser.close();
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    await fs.rm(directory, { recursive: true });
  }
});
