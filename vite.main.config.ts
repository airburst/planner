import { builtinModules } from "node:module";
import { resolve } from "node:path";
import { defineConfig } from "vite";

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
      external: (id) =>
        id === "electron" ||
        id === "better-sqlite3" ||
        id.startsWith("drizzle-orm") ||
        builtinModules.includes(id) ||
        builtinModules.includes(id.replace("node:", ""))
    }
  }
});