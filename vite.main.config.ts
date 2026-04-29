import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/main/db/index.ts"),
      formats: ["cjs"],
      fileName: () => "db.js"
    },
    outDir: "public",
    emptyOutDir: false,
    rollupOptions: {
      external: ["better-sqlite3", "drizzle-orm"]
    }
  }
});