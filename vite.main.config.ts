import { builtinModules } from "node:module";
import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  publicDir: false,
  build: {
    lib: {
      entry: {
        db: resolve(__dirname, "src/main/db/index.ts"),
        engine: resolve(__dirname, "src/main/engine/runtime.ts")
      },
      formats: ["cjs"],
      fileName: (_, entryName) => `${entryName}.js`
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