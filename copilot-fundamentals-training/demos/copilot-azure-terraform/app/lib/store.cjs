"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

function validateData(data) {
  if (!Array.isArray(data)) throw new Error("Data keluhan harus berupa array.");
  const ids = new Set();
  for (const item of data) {
    if (!item || typeof item.id !== "string" || ids.has(item.id) ||
        !["Baru", "Diproses", "Selesai"].includes(item.status) ||
        !["customerLabel", "title", "category", "channel", "priority", "description", "createdAt", "updatedAt"].every(key => typeof item[key] === "string") ||
        !Array.isArray(item.attachments)) throw new Error("Struktur data keluhan tidak valid.");
    ids.add(item.id);
    for (const file of item.attachments) {
      if (!file || !/^[0-9a-f-]{36}$/.test(file.id) || !/^[0-9a-f-]{36}\.(pdf|png|jpg|jpeg|txt)$/.test(file.storedName) ||
          typeof file.name !== "string" || typeof file.type !== "string" || !Number.isInteger(file.size) || file.size < 0 ||
          typeof file.uploadedAt !== "string") throw new Error("Metadata lampiran tidak valid.");
    }
  }
}

async function openStore(directory, seedFile) {
  const file = path.join(directory, "complaints.json");
  await fs.mkdir(path.join(directory, "uploads"), { recursive: true });
  let data;
  try {
    data = JSON.parse(await fs.readFile(file, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw new Error("Data demo tidak bisa dibaca. File lama tidak di-reset.", { cause: error });
    data = JSON.parse(await fs.readFile(seedFile, "utf8"));
    validateData(data);
    await fs.writeFile(file, JSON.stringify(data, null, 2), { flag: "wx" });
  }
  validateData(data);
  let tail = Promise.resolve();
  return {
    directory,
    snapshot() { return structuredClone(data); },
    async update(change) {
      const previous = tail;
      let release;
      tail = new Promise(resolve => { release = resolve; });
      await previous;
      const temporary = file + "." + randomUUID() + ".tmp";
      try {
        const draft = structuredClone(data);
        const result = await change(draft);
        validateData(draft);
        await fs.writeFile(temporary, JSON.stringify(draft, null, 2), { flag: "wx" });
        await fs.rename(temporary, file);
        data = draft;
        return structuredClone(result);
      } catch (error) {
        try { await fs.rm(temporary, { force: true }); }
        catch (cleanupError) { console.error("Temporary-file cleanup failed:", cleanupError); }
        throw error;
      } finally {
        release();
      }
    },
  };
}

module.exports = { openStore };
