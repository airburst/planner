# Budgie Reference Choices for Planner

Date: 2026-04-29
Purpose: record implementation choices reviewed in ../budgie and how they apply to Planner.

## Adopted now

1. Drizzle-first migration config
- Added drizzle.config.ts with schema and migration output paths.
- Updated db:migrate script to use explicit config.

2. Native module reliability for better-sqlite3
- Added postinstall electron-rebuild script.
- Updated build to run electron-rebuild before packaging.
- Updated test to rebuild better-sqlite3 before running vitest.

3. Main DB bundle externalization pattern
- Updated vite.main.config.ts to externalize:
  - electron
  - better-sqlite3
  - drizzle-orm family
  - Node built-ins

4. Electron window/dev setup baseline
- createWindow in public/electron.js follows Budgie baseline:
  - desktop-oriented dimensions
  - platform titlebar behavior
  - detached devtools in development

## Keep, but adapted for Planner

1. Domain and IPC surface
- Budgie entity handlers are not reused directly.
- Planner uses the same one-file-per-entity handler pattern with Planner-specific entities.

2. Renderer architecture
- Budgie uses React + React Router patterns.
- Planner remains committed to TanStack Start + React and TanStack Query over IPC.

## Evaluate next

1. ESLint profile parity
- Consider adopting Budgie's stricter TypeScript lint rules and targeted test globals setup.

2. Vitest multi-project split
- Consider Budgie's unit/integration split config once integration harness lands.

3. CSP and session hardening
- Port Budgie-style CSP setup in main process when renderer routes and external links are finalized.
