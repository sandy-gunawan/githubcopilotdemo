import { readFileSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { seedSchema, type SeedBundle } from "../shared/schemas.js";
import { seedManifestSchema } from "./seed.js";

export function loadSeedDirectory(directory: string): SeedBundle {
  const root = realpathSync(directory);
  const manifest = seedManifestSchema.parse(
    JSON.parse(readFileSync(resolve(root, "network.json"), "utf8")),
  );
  const documents = manifest.documents.map((item) => {
    const filename = realpathSync(resolve(root, item.sourcePath));
    const path = relative(root, filename);
    if (path === ".." || path.startsWith(`..${sep}`) || isAbsolute(path)) {
      throw new Error(`Path dokumen di luar folder seed: ${item.id}`);
    }
    if (statSync(filename).size > 400_000) throw new Error(`Dokumen terlalu besar: ${item.id}`);
    return { ...item, content: readFileSync(filename, "utf8") };
  });
  return seedSchema.parse({ ...manifest, documents });
}
