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
