import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createSeed } from "../server/seed.js";

const root = resolve("data", "seed");
const seed = createSeed();
mkdirSync(root, { recursive: true });
const documents = seed.documents.map(({ content, ...metadata }) => {
  const filename = resolve(root, metadata.sourcePath!);
  mkdirSync(dirname(filename), { recursive: true });
  writeFileSync(filename, content, "utf8");
  return metadata;
});
writeFileSync(resolve(root, "network.json"), `${JSON.stringify({ ...seed, documents }, null, 2)}\n`, "utf8");
console.log(`Generated ${seed.devices.length} devices, ${seed.metrics.length} metrics, ${documents.length} documents in ${root}`);
