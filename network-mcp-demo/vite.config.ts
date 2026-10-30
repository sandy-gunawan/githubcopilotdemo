import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: "127.0.0.1",
    allowedHosts: ["localhost"],
    fs: { strict: true },
  },
  build: {
    outDir: "dist/client",
    emptyOutDir: true,
  },
});
