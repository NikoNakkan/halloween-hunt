// Dev-only tool that renders the "cursed tape" video. Not part of the deployed app.
//   node node_modules/vite/bin/vite.js --config tape/vite.config.ts
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";

const outDir = resolve(import.meta.dirname, "out");

/** POST /__save?name=<file> writes the request body into tape/out/. */
function saveEndpoint(): Plugin {
  return {
    name: "tape-save",
    configureServer(server) {
      server.middlewares.use("/__save", (req, res) => {
        const name = new URL(req.url ?? "", "http://x").searchParams.get("name") ?? "out.bin";
        const safe = name.replace(/[^\w.-]/g, "_");
        const chunks: Buffer[] = [];
        req.on("data", (c: Buffer) => chunks.push(c));
        req.on("end", () => {
          mkdirSync(outDir, { recursive: true });
          writeFileSync(resolve(outDir, safe), Buffer.concat(chunks));
          res.end(`saved ${safe}`);
        });
      });
    },
  };
}

export default defineConfig({
  root: import.meta.dirname,
  publicDir: resolve(import.meta.dirname, "../public"),
  server: { port: 5198, strictPort: true, fs: { allow: [resolve(import.meta.dirname, "..")] } },
  plugins: [saveEndpoint()],
});
