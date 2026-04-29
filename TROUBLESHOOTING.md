# Troubleshooting

## Vite Module Resolution Errors ("Failed to resolve import")

If you see errors like:
```
Failed to resolve import "../../components/ui/button" from "src/pages/index.tsx". Does the file exist?
```

This typically occurs when the Vite dev server's module cache becomes out of sync with the file system, especially after new directories or files are created.

### Solution

1. **Stop the dev server** (Ctrl+C)
2. **Clean all caches:**
   ```bash
   rm -rf node_modules .vite dist build
   ```
3. **Reinstall dependencies:**
   ```bash
   bun install
   ```
4. **Restart the dev server:**
   ```bash
   bun run start
   ```

### What's happening

- When new files or directories are created while the dev server is running, Vite's module watcher and cache may not pick them up immediately
- The `node_modules` folder can contain stale version metadata that prevents proper resolution
- A clean reinstall ensures all module metadata is fresh and Vite can properly discover all files

### Prevention

- Before starting the dev server, ensure all code changes are complete
- Or restart the dev server after adding new files/directories

---

## Chromium DevTools Protocol Warnings

When running `bun run start` in development, you may see harmless warnings in the console:

```
[ERROR:CONSOLE:1] "Request Autofill.enable failed. {"code":-32601,"message":"'Autofill.enable' wasn't found"}"
[ERROR:CONSOLE:1] "Request Autofill.setAddresses failed. {"code":-32601,"message":"'Autofill.setAddresses' wasn't found"}"
```

### What's happening

These are **internal Chromium DevTools protocol warnings** that occur because:
- Electron bundles a specific version of Chromium
- The DevTools in that version attempts to enable Autofill protocol features
- Those features aren't available in the bundled Chromium version

### Impact

**None.** These are purely cosmetic warnings that:
- Do not affect app functionality
- Do not prevent the app from running
- Do not impact user experience
- Are expected and normal in Electron development

### Why they can't be easily suppressed

Suppressing these warnings requires either:
- Patching Chromium itself
- Using undocumented internal APIs
- Complex workarounds that may cause other issues

It's considered acceptable practice in the Electron community to leave these as-is.

### How to minimize them

- These only appear in dev mode when DevTools is open
- Production builds (`bun run build`) will not show these warnings
- You can disable DevTools by setting `isDev = false` in `public/electron.js`, but that prevents debugging
