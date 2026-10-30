"use strict";

const express = require("express");
const multer = require("multer");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { openStore } = require("./lib/store.cjs");

const STATUS = ["Baru", "Diproses", "Selesai"];
const CATEGORIES = ["Transfer", "Kartu", "Aplikasi", "Informasi"];
const CHANNELS = ["Mobile", "Cabang", "Contact Center"];
const PRIORITIES = ["Rendah", "Sedang", "Tinggi"];
const TYPES = { ".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".txt": "text/plain" };
const MAX_FILE = 2 * 1024 * 1024;
class ApiError extends Error {
  constructor(status, message, fields) { super(message); this.status = status; this.fields = fields; }
}
function findCase(data, id) {
  const item = data.find(record => record.id === id);
  if (!item) throw new ApiError(404, "Keluhan tidak ditemukan.");
  return item;
}
function validateComplaint(body) {
  const fields = {};
  const result = {};
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new ApiError(400, "Isi form tidak valid.");
  for (const [key, min, max] of [["customerLabel", 2, 60], ["title", 5, 120], ["description", 10, 1500]]) {
    const value = typeof body[key] === "string" ? body[key].trim() : "";
    if (value.length < min || value.length > max) fields[key] = `Isi ${min}-${max} karakter.`;
    result[key] = value;
  }
  for (const [key, choices] of [["category", CATEGORIES], ["channel", CHANNELS], ["priority", PRIORITIES]]) {
    if (!choices.includes(body[key])) fields[key] = "Pilih salah satu nilai yang tersedia.";
    result[key] = body[key];
  }
  if (Object.keys(body).some(key => !Object.hasOwn(result, key))) fields.form = "Ada kolom yang tidak dikenal.";
  if (Object.keys(fields).length) throw new ApiError(400, "Periksa kembali form keluhan.", fields);
  return result;
}
function checkSignature(file, extension) {
  const bytes = file.buffer;
  if (!bytes.length) throw new ApiError(400, "File kosong tidak dapat diunggah.");
  let valid = false;
  if (extension === ".pdf") valid = bytes.subarray(0, 5).toString("ascii") === "%PDF-";
  if (extension === ".png") valid = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (extension === ".jpg" || extension === ".jpeg") valid = bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (extension === ".txt") {
    try { new TextDecoder("utf-8", { fatal: true }).decode(bytes); valid = !bytes.includes(0); }
    catch (error) { if (!(error instanceof TypeError)) throw error; }
  }
  if (!valid) throw new ApiError(400, "Isi file tidak cocok dengan jenis file yang diizinkan.");
}

async function createApp({ dataDir = path.join(__dirname, "data"), logging = true } = {}) {
  const store = await openStore(path.resolve(dataDir), path.join(__dirname, "fixtures", "complaints.json"));
  const app = express();
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    res.set({
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
    });
    if (logging) {
      const start = Date.now();
      res.on("finish", () => console.log(JSON.stringify({ method: req.method, path: req.path, status: res.statusCode, ms: Date.now() - start })));
    }
    next();
  });
  app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      const site = req.get("Sec-Fetch-Site");
      const origin = req.get("Origin");
      const expected = `${req.protocol}://${req.get("Host")}`;
      if (site === "cross-site" || (origin && origin !== expected)) {
        return next(new ApiError(403, "Permintaan lintas situs ditolak pada demo lokal ini."));
      }
    }
    next();
  });
  app.use(express.json({ limit: "64kb" }));
  app.get("/health", (req, res) => res.json({ status: "ok", synthetic: true, storage: "local-json", authentication: "none-local-demo-only" }));
  app.get("/api/complaints", (req, res) => res.json({ complaints: store.snapshot() }));
  app.get("/api/complaints/:id", (req, res) => res.json({ complaint: findCase(store.snapshot(), req.params.id) }));
  app.post("/api/complaints", async (req, res) => {
    const values = validateComplaint(req.body);
    const now = new Date().toISOString();
    const complaint = { id: "DEMO-" + randomUUID().slice(0, 8).toUpperCase(), ...values, status: "Baru", createdAt: now, updatedAt: now, attachments: [] };
    const saved = await store.update(data => { data.unshift(complaint); return complaint; });
    res.status(201).json({ complaint: saved });
  });
  app.patch("/api/complaints/:id/status", async (req, res) => {
    if (!req.body || !STATUS.includes(req.body.status) || Object.keys(req.body).some(key => key !== "status")) {
      throw new ApiError(400, "Pilih status Baru, Diproses, atau Selesai.");
    }
    const saved = await store.update(data => {
      const item = findCase(data, req.params.id);
      item.status = req.body.status;
      item.updatedAt = new Date().toISOString();
      return item;
    });
    res.json({ complaint: saved });
  });
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE, files: 1, fields: 0, parts: 1 },
    fileFilter(req, file, done) {
      const extension = path.extname(file.originalname).toLowerCase();
      if (!TYPES[extension] || TYPES[extension] !== file.mimetype) return done(new ApiError(400, "Pilih PDF, PNG, JPG, atau TXT yang sesuai, maksimal 2 MB."));
      done(null, true);
    },
  });
  app.post("/api/complaints/:id/attachments", (req, res, next) => {
    try { findCase(store.snapshot(), req.params.id); next(); }
    catch (error) { next(error); }
  }, upload.single("file"), async (req, res) => {
    if (!req.file) throw new ApiError(400, "Pilih file dummy terlebih dahulu.");
    const extension = path.extname(req.file.originalname).toLowerCase();
    checkSignature(req.file, extension);
    const id = randomUUID();
    const storedName = id + extension;
    const destination = path.join(store.directory, "uploads", storedName);
    const name = path.basename(req.file.originalname.replace(/\\/g, "/")).replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 120);
    const attachment = { id, storedName, name: name || "lampiran" + extension, type: TYPES[extension], size: req.file.size, uploadedAt: new Date().toISOString() };
    await fsp.writeFile(destination, req.file.buffer, { flag: "wx" });
    let saved;
    try {
      saved = await store.update(data => {
        const item = findCase(data, req.params.id);
        item.attachments.push(attachment);
        item.updatedAt = new Date().toISOString();
        return item;
      });
    } catch (error) {
      try { await fsp.rm(destination); }
      catch (cleanupError) { console.error("Attachment cleanup failed:", cleanupError); }
      throw error;
    }
    res.status(201).json({ complaint: saved });
  });
  app.get("/api/complaints/:id/attachments/:attachmentId", (req, res, next) => {
    const item = findCase(store.snapshot(), req.params.id);
    const attachment = item.attachments.find(file => file.id === req.params.attachmentId);
    if (!attachment) throw new ApiError(404, "Lampiran tidak ditemukan.");
    res.download(path.join(store.directory, "uploads", attachment.storedName), attachment.name, {
      headers: { "Content-Type": attachment.type },
    }, error => {
      if (error) next(error.code === "ENOENT" ? new ApiError(404, "File lampiran tidak tersedia di penyimpanan lokal.") : error);
    });
  });
  app.use("/api", (req, res, next) => next(new ApiError(404, "Endpoint API tidak ditemukan.")));
  app.use(express.static(path.join(__dirname, "public"), { dotfiles: "deny", index: "index.html" }));
  app.use((req, res) => res.status(404).type("text").send("Halaman tidak ditemukan."));
  app.use((error, req, res, next) => {
    console.error(JSON.stringify({ event: "request-error", path: req.path, error: error.message }));
    if (res.headersSent) return next(error);
    let status = error instanceof ApiError ? error.status : 500;
    let message = error instanceof ApiError ? error.message : "Operasi gagal. Periksa terminal server; hasil tidak disimpan sebagai sukses.";
    if (error instanceof multer.MulterError) {
      status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
      message = error.code === "LIMIT_FILE_SIZE" ? "File terlalu besar. Batas lampiran 2 MB." : "Unggah satu file saja, pada kolom file, tanpa kolom tambahan.";
    }
    if (error.type === "entity.parse.failed") { status = 400; message = "JSON permintaan tidak valid."; }
    if (error.type === "entity.too.large") { status = 413; message = "Isi permintaan terlalu besar."; }
    res.status(status).json({ error: { message, ...(error.fields ? { fields: error.fields } : {}) } });
  });
  return app;
}

if (require.main === module) {
  const env = path.join(__dirname, ".env");
  if (fs.existsSync(env)) process.loadEnvFile(env);
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || "127.0.0.1";
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT harus berupa angka 1-65535.");
  createApp({ dataDir: process.env.DEMO_DATA_DIR || path.join(__dirname, "data") }).then(app => {
    const server = app.listen(port, host, () => console.log(`Portal Keluhan Mini: http://${host}:${port} - SINTETIS, lokal saja, tanpa autentikasi.`));
    server.on("error", error => { console.error("Server tidak dapat dimulai:", error); process.exitCode = 1; });
    for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close(() => process.exit(0)));
  }).catch(error => { console.error("Startup gagal:", error); process.exitCode = 1; });
}

module.exports = { createApp };
