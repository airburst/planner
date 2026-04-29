# Planner — Agent Instructions

## Purpose

Planner is a local-first retirement and long-term financial planning desktop app.

The domain is different from Budgie. Reuse the technical stack and build patterns, but do not
copy Budgie entities or features as-is. Planner centers on household planning, phased income,
scenarios, and tax-aware drawdown.

---

## Core Stack

- Electron (desktop shell)
- SQLite (local persistence)
- TanStack Start + React (renderer app)
- TanStack Query (query/mutation state via IPC bridge)
- shadcn/ui + Tailwind CSS (UI layer)

Build and release tooling:

- Vite
- Bun
- Husky hooks
- Changesets
- GitHub publishing via electron-builder

---

## Done Criteria

After every code change, run both checks and fix all issues before marking work complete:

```
bun run lint
bun run check-types
```

Also run tests when behavior or schema changes:

```
bun run test
```

If `better-sqlite3` fails locally, run:

```
npm rebuild better-sqlite3
```

---

## Architecture Guardrails

1. Keep renderer Node-free. All DB and filesystem operations go through IPC.
2. Use `contextIsolation: true` and expose a minimal typed API in preload.
3. One IPC handler file per entity/use-case area in `public/ipc/`.
4. Channel naming remains `<entity>:<verb>`.
5. TanStack Query in renderer is the source of server-state truth.
6. Keep domain/calculation logic testable outside Electron wherever possible.

---

## Database & Migration Rules

Planner is Drizzle-first for schema management. All schema changes must be authored in Drizzle
schema files and turned into migrations before they are considered part of the SQLite model.

When adding or changing tables:

1. Update schema in `src/main/db/schema.ts`
2. Generate migration:

```
bun run db:migrate
```

3. Rebuild DB bundle:

```
bun run vite build --config vite.main.config.ts
```

4. Wire schema changes through IPC/preload/types.

### Safety rules

- Do not make direct SQLite schema edits outside the Drizzle schema + migration flow.
- Never apply destructive migrations that drop financial data.
- Prefer additive migrations (`ALTER TABLE ... ADD COLUMN`) and explicit backfills.
- Use SQL defaults for created timestamps, not JS runtime defaults.

---

## Planner Domain Rules

Planner requires household-aware modeling with per-person tax behavior:

1. Single user-centric UX may include optional partner profile.
2. Tax allowances and bands are per person, not pooled household tax.
3. Household summaries must be derived from per-person computations.
4. Income phases can overlap and start at different ages (e.g. DB at 60, State Pension at 67).
5. Drawdown recommendations must be explainable, including use of SIPP 25% tax-free cash.

---

## IPC Wiring Checklist (for any new entity)

1. Create handler in `public/ipc/<entity>.js`
2. Register in `public/electron.js`
3. Expose API in `public/preload.js`
4. Extend typings in `src/types/electron.d.ts`
5. Add tests in `src/tests/`

---

## Testing Guidance

Keep tests in `src/tests/` with clear separation:

- `integration/` — IPC + DB behavior
- `unit/` — pure calculation/domain functions

Critical planner tests should cover:

1. scenario comparison determinism
2. phased income activation by age/year
3. per-person tax computation in partner mode
4. SIPP/ISA drawdown tax treatment
5. recommendation explainability and invariants

---

## UI Component Policy

Use shadcn component registry primitives (Base UI variants preferred where available).

- Add missing primitives via `bunx shadcn@latest add <component-name>`
- Do not hand-roll existing primitives (dialog/select/popover/tooltip/etc.)
- Use Tailwind CSS utility classes via `className` for styling React elements.
- Do not use inline `style` props for UI styling.
- Respect base light/dark theme tokens when composing UI.

---

## Changesets

Any user-facing change requires a changeset.

Example:

```md
---
"planner": patch
---

Short description of the change.
```

Do not run `bun run version` unless explicitly requested for release workflow.
