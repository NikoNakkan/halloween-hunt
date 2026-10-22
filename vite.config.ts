import { resolve } from "node:path";
import { defineConfig } from "vite";

// Relative base so the build works on GitHub Pages under /<repo>/.
export default defineConfig({
  base: "./",
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        admin: resolve(import.meta.dirname, "grimoire.html"),
        quiz: resolve(import.meta.dirname, "granddaughter/index.html"),
        quizAdmin: resolve(import.meta.dirname, "granddaughter/crypt.html"),
      },
    },
  },
});
