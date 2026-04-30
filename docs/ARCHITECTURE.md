# Planner Architecture

Planner is a local-first desktop retirement planning application using Electron, SQLite,
TanStack Start + React, TanStack Query, and a preload IPC bridge.

## 1) High-Level Architecture

```
public/electron.js      Main process (Node)      -> app lifecycle, windows, IPC, DB access
public/preload.js       Preload bridge           -> typed, minimal API exposed to renderer
src/                    Renderer (TanStack Start)-> routes, UI, query hooks, view models
src/services/db/        Persistence layer        -> schema, migrations, query functions
src/services/engine/    Calculation engine       -> projection loop, tax, recommendations
```

Security model:

- `contextIsolation: true`
- no direct Node access from renderer
- all privileged operations via preload + IPC

## 2) Runtime Data Flow

1. Renderer triggers query or mutation via TanStack Query.
2. Query function calls preload API (`window.api.*`).
3. Preload invokes namespaced IPC channel.
4. Main process handler validates input and executes SQLite operations.
5. Result returns through preload to renderer.
6. TanStack Query cache updates and invalidates as required.

This keeps optimistic UI and query consistency in renderer while preserving DB safety in main.

## 3) IPC Design

Use one handler file per entity/use-case in `public/ipc/`.

Pattern for every new entity:

1. `public/ipc/<entity>.js`
2. register in `public/electron.js`
3. expose in `public/preload.js`
4. type in `src/types/electron.d.ts`

Channel naming:

- `<entity>:<verb>` (for example: `plans:getAll`, `income-streams:create`)

## 4) Domain-Oriented Data Model (Planner)

Core domain aggregates:

- `household_plans`
- `people` (primary + optional partner)
- `accounts` (SIPP/ISA/other wrappers)
- `income_streams` (employment, DB pension, State Pension, other)
- `expense_profiles`
- `assumption_sets`
- `scenarios` + `scenario_overrides`
- `projection_runs`
- `projection_year_rows`
- `recommendations`

Important domain rule:

- In partner mode, tax is computed per person (per tax unit), then aggregated for household
  output. Never pool household taxable income as one tax unit.

## 5) Persistence Layer

SQLite + WAL mode for local durability and responsiveness.
Drizzle ORM is the source of truth for schema definitions.

Recommended structure:

```
src/services/db/
  schema.ts
  index.ts
  migrations/
  queries/
```

Migration workflow:

1. update schema
2. `bun run db:migrate`
3. inspect generated SQL (no destructive drops for financial data)
4. rebuild DB bundle (`bun run vite build --config vite.main.config.ts`)

Rule:

- All schema evolution must start in Drizzle schema files and be materialized through generated
  migrations before committing SQLite changes.

## 6) Renderer Composition

TanStack Router + React renderer responsibilities:

- route-driven screens (onboarding, dashboard, scenarios, assumptions, income path)
- TanStack Query hooks for IPC-backed queries/mutations
- optimistic updates for UX responsiveness where safe
- shadcn + Tailwind UI primitives and layout system

**Source layout under `src/`:**

```
src/
  components/       shadcn/ui primitives (button, badge, etc.)
  hooks/            TanStack Query hooks (use-plans, use-people, etc.)
  lib/              shared utilities (utils.ts, electron-api.ts)
  pages/            page components, one folder per route
    index.tsx       HomePage (plan list)
    onboarding/     5-step onboarding wizard
    plan/[id]/      plan detail + projection UI
  router.tsx        TanStack Router route tree
  main.tsx          renderer entry point
  index.css         global styles
  services/         Node-side services (DB + engine)
    db/             Drizzle schema, migrations, index
    engine/         simulation core, tax, recommendations
  tests/            Vitest test suites
    integration/    IPC + SQLite behavior
    unit/           pure domain logic
  types/            electron.d.ts and shared TypeScript types
```

State model:

- server state in TanStack Query cache
- local transient UI state in component state/forms
- avoid duplicating server state in ad-hoc stores

## 7) Build and Toolchain

Primary tools:

- Bun (scripts/runtime)
- Vite (renderer and main/db bundles)
- electron-builder (desktop packaging and GitHub publishing)
- Husky (commit hooks)
- Changesets (versioning and release notes)

Typical script intents (from sibling baseline and adapted here):

- `bun run start` -> dev renderer + electron start
- `bun run build` -> rebuild native deps + renderer build + main/db build + package
- `bun run db:migrate` -> schema diff migration generation
- `bun run lint`, `bun run check-types`, `bun run test`

## 8) Testing Architecture

Vitest with two layers:

```
src/tests/
  integration/   IPC + SQLite behavior
  unit/          pure modeling and recommendation logic
```

Colocated engine tests also live alongside their source files in `src/services/engine/`.
The `vitest.config.ts` includes both `src/tests/**/*.test.ts` and `src/services/**/*.test.ts`.

Planner-critical test categories:

1. phased income activation (DB and State Pension at different ages)
2. bridge-year drawdown and tax treatment (SIPP/ISA)
3. per-person tax computations in partner mode
4. scenario determinism and comparison outputs
5. recommendation rule behavior and explainability

## 9) UX System

UI stack:

- shadcn component registry (Base UI variants where applicable)
- Tailwind CSS tokens and utility styling

Styling rules:

- React UI styling must use Tailwind utility classes via `className`.
- Avoid inline `style` props for component styling.
- Theme behavior should derive from shared light/dark design tokens.

Design requirements:

- progressive disclosure for advanced modeling
- decision-first layouts (actions and outcomes before advanced controls)
- clear explanation of tax and drawdown trade-offs

## 10) Reuse from ../budgie

Safe to reuse:

- build and packaging config foundations
- lint/type/test script patterns
- electron preload security posture
- migration and DB build pipeline skeleton

Must be redesigned for Planner:

- all domain entities and IPC handlers
- calculations and recommendation logic
- feature routes and UI workflows
- tests and fixtures for retirement modeling domain
