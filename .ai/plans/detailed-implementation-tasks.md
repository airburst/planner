# Detailed Implementation Tasks

Date: 2026-04-29
Goal: provide an execution-ready engineering backlog for Planner on Electron + SQLite + TanStack Start + React + TanStack Query + shadcn + Tailwind.

## Working conventions

- Task ID format: P<phase>-T<task>
- Status defaults to Not started
- Every task includes definition of done and explicit dependencies
- No task is done until lint and type checks pass
- Database rule: all schema work starts in Drizzle ORM definitions and must flow through generated migrations before SQLite changes are committed

## Phase 0: Foundation and repository readiness

### P0-T1: Finalize baseline project scripts and structure
Status: Completed (2026-04-29)

Objective:
- Ensure all expected scripts and folder conventions exist and are stable.

Implementation tasks:
1. Confirm scripts in package manifest for start, build, lint, check-types, test, db:migrate, changeset.
2. Confirm baseline folders exist: public/ipc, src/main/db, src/renderer, src/types, src/tests/integration, src/tests/unit.
3. Add placeholder readme files in empty critical folders if needed.

Definition of done:
- Scripts run and fail only for real code issues.
- Core folders exist and are discoverable by new contributors.

Dependencies:
- None

### P0-T2: Add strict TypeScript project references for renderer and main/db
Objective:
- Keep desktop shell code and renderer code type-safe with clear boundaries.

Implementation tasks:
1. Add tsconfig split files if needed (base, renderer, main).
2. Configure include/exclude to prevent accidental cross-imports.
3. Add path aliases for internal imports.

Definition of done:
- check-types passes.
- Renderer cannot import Node-only main modules.

Dependencies:
- P0-T1

### P0-T3: Add baseline CI workflow
Objective:
- Run lint, typecheck, and tests on pull requests.

Implementation tasks:
1. Add CI workflow for Bun setup.
2. Run lint, check-types, test in CI.
3. Cache dependencies for stable build times.

Definition of done:
- CI reports green on main branch.
- PRs show required checks.

Dependencies:
- P0-T1

## Phase 1: Database and domain schema

### P1-T1: Create Planner v1 schema
Status: Completed (2026-04-29)

Objective:
- Implement first-pass schema matching Planner core entities.

Implementation tasks:
1. Define tables in src/main/db/schema.ts:
- household_plans
- people
- accounts
- income_streams
- expense_profiles
- assumption_sets
- scenarios
- scenario_overrides
- projection_runs
- projection_year_rows
- recommendations
2. Add created_at and updated_at conventions using SQL defaults.
3. Add foreign keys and indexes for projection lookup speed.

Definition of done:
- Schema compiles.
- Entity relationships match PRD and domain model.

Dependencies:
- P0-T1, P0-T2

### P1-T2: Generate initial migration and verify safety
Status: Completed (2026-04-29)

Objective:
- Produce migration SQL and ensure no destructive operations.

Implementation tasks:
1. Run db:migrate.
2. Review migration output for no drop statements.
3. Add manual edits only if generator output needs correction.
4. Confirm migration was generated from Drizzle schema updates, not hand-authored SQLite schema edits.

Definition of done:
- Migration files are committed.
- Migration is additive and reversible in practice.

Dependencies:
- P1-T1

### P1-T3: Build DB entrypoint and connection lifecycle
Status: In progress (2026-04-29)

Objective:
- Provide stable SQLite initialization for app and tests.

Implementation tasks:
1. Implement src/main/db/index.ts setup function.
2. Enable WAL and pragmatic defaults.
3. Add helper for in-memory DB in tests.

Definition of done:
- App can open DB cleanly.
- Integration tests can create isolated DB instances.

Dependencies:
- P1-T1

## Phase 2: IPC and preload surface

### P2-T1: Implement plan and people IPC handlers
Status: Completed (2026-04-29)

Objective:
- Enable CRUD for foundational planning entities.

Implementation tasks:
1. Add public/ipc/plans.js handlers:
- plans:getAll
- plans:getById
- plans:create
- plans:update
- plans:delete
2. Add public/ipc/people.js handlers with plan-scoped queries.
3. Register handlers in public/electron.js.

Definition of done:
- Handlers return typed, validated payloads.
- Error paths return actionable messages.

Dependencies:
- P1-T1, P1-T3

### P2-T2: Implement accounts and income streams IPC handlers
Status: Completed (2026-04-29)

Objective:
- Enable key retirement inputs for balances and phased income.

Implementation tasks:
1. Add public/ipc/accounts.js CRUD and plan-scoped queries.
2. Add public/ipc/income-streams.js CRUD and person assignment.
3. Support stream activation age fields and status filtering.

Definition of done:
- Handlers support DB-at-60 and State-Pension-at-67 style inputs.

Dependencies:
- P2-T1

### P2-T3: Expose preload API and types for all phase-2 handlers
Status: Completed (2026-04-29)

Objective:
- Provide typed renderer access to IPC channels.

Implementation tasks:
1. Expose APIs in public/preload.js.
2. Define types in src/types/electron.d.ts.
3. Ensure names map exactly to IPC channel behavior.

Definition of done:
- Renderer calls are type-safe.
- No direct ipcRenderer usage in renderer code.

Dependencies:
- P2-T1, P2-T2

## Phase 3: Calculation engine v1

### P3-T1: Implement deterministic yearly simulation core
Objective:
- Build projection loop with transparent year-by-year state.

Implementation tasks:
1. Add projection engine module in src/main/engine.
2. Define annual event order:
- opening balances
- contributions/income
- withdrawals
- tax
- growth/inflation adjustment
- closing balances
3. Persist projection_run and projection_year_rows outputs.

Definition of done:
- Deterministic output for identical inputs.
- Year rows are persisted and queryable.

Dependencies:
- P1-T1, P2-T3

### P3-T2: Implement phased income activation logic
Objective:
- Handle overlapping income phases by person and stream type.

Implementation tasks:
1. Activate streams by age per year.
2. Support concurrent streams for one person.
3. Aggregate per person then household.

Definition of done:
- Cases with DB at 60 and State Pension at 67 compute correctly.

Dependencies:
- P3-T1

### P3-T3: Implement bridge-year withdrawal logic (SIPP and ISA)
Objective:
- Cover pre-State-Pension funding years with explicit source ordering.

Implementation tasks:
1. Add configurable withdrawal order strategy.
2. Track ISA tax-free withdrawals.
3. Track SIPP taxable and tax-free components.

Definition of done:
- Bridge years have no unexplained funding gaps.
- Year rows show withdrawal source and amounts.

Dependencies:
- P3-T1, P3-T2

### P3-T4: Implement per-person tax pipeline
Objective:
- Compute tax by person, then aggregate household result.

Implementation tasks:
1. Build tax function with per-person inputs.
2. Apply personal allowance and banded rates from assumptions.
3. Return person tax details plus household sum.

Definition of done:
- Partner mode never pools taxable income before tax computation.

Dependencies:
- P3-T2, P3-T3

### P3-T5: Implement recommendation rule engine v1
Objective:
- Produce explainable top actions based on deterministic outputs.

Implementation tasks:
1. Define recommendation triggers and priorities.
2. Generate recommendation records with rationale fields.
3. Link recommendations to projection run id.

Definition of done:
- Recommendation outputs are deterministic and explainable.

Dependencies:
- P3-T1, P3-T4

## Phase 4: Renderer app and query integration

### P4-T1: Create route structure and shell layout
Objective:
- Establish navigable app skeleton for onboarding and scenarios.

Implementation tasks:
1. Set up TanStack Start routing baseline.
2. Add pages:
- onboarding
- dashboard
- scenarios
- scenario detail
- assumptions
3. Add app shell with responsive navigation.

Definition of done:
- Navigation works in desktop window sizes and small widths.

Dependencies:
- P0-T2

### P4-T2: Add query hooks and mutation hooks for core entities
Objective:
- Standardize renderer data access via TanStack Query.

Implementation tasks:
1. Add hooks for plans, people, accounts, income streams.
2. Add optimistic updates where low-risk.
3. Add query key conventions in one module.

Definition of done:
- Forms and tables load and mutate using hooks only.

Dependencies:
- P2-T3, P4-T1

### P4-T3: Implement onboarding flow screens
Objective:
- Capture minimum viable inputs to run first projection.

Implementation tasks:
1. Build step sequence:
- household setup
- retirement timing
- assets
- income phases
- spending target
2. Add validation and progress state.
3. Save draft plan as user advances.

Definition of done:
- New user can complete onboarding and run first projection.

Dependencies:
- P4-T2

### P4-T4: Implement scenario detail states
Objective:
- Display scenario health and recommendation details.

Implementation tasks:
1. Build scenario summary cards and timeline views.
2. Add projection table/graph views.
3. Add recommendation panel with rationale text.

Definition of done:
- Scenario detail reflects projection and recommendation outputs accurately.

Dependencies:
- P3-T5, P4-T2

## Phase 5: Testing and quality gates

### P5-T1: Build integration test harness for IPC + DB
Objective:
- Test handlers against in-memory SQLite and real schema.

Implementation tasks:
1. Add src/tests/integration/helpers/db.ts.
2. Add src/tests/integration/helpers/ipc.ts.
3. Add first integration tests for plans and income streams.

Definition of done:
- Integration suite can run repeatably in CI.

Dependencies:
- P1-T3, P2-T3

### P5-T2: Add golden projection test cases
Objective:
- Lock expected outcomes for benchmark personas.

Implementation tasks:
1. Implement fixtures for benchmark personas P1 to P7.
2. Add tests for bridge years and partner tax behavior.
3. Store expected annual outputs for regression checks.

Definition of done:
- Engine changes show clear pass/fail against golden outputs.

Dependencies:
- P3-T4

### P5-T3: Add recommendation invariants tests
Objective:
- Ensure recommendation quality does not regress.

Implementation tasks:
1. Define invariants:
- no contradictory recommendations
- stable priority under unchanged inputs
- rationale populated
2. Add tests covering baseline and stressed scenarios.

Definition of done:
- Recommendation suite catches ranking and explanation regressions.

Dependencies:
- P3-T5

## Phase 6: Packaging and release readiness

### P6-T1: Configure electron-builder output and publish metadata
Objective:
- Prepare distributable desktop builds.

Implementation tasks:
1. Verify build block and platform targets.
2. Confirm files list includes migrations and ipc handlers.
3. Validate artifact output paths.

Definition of done:
- Build command creates installable artifacts locally.

Dependencies:
- P4-T4

### P6-T2: Add release checklist and changeset discipline
Objective:
- Make release process repeatable and auditable.

Implementation tasks:
1. Create release checklist doc in docs.
2. Enforce changeset requirement for user-facing changes.
3. Add versioning notes for maintainers.

Definition of done:
- Team can run release flow without hidden steps.

Dependencies:
- P6-T1

## Suggested implementation sequence

1. P0-T1 to P0-T3
2. P1-T1 to P1-T3
3. P2-T1 to P2-T3
4. P3-T1 to P3-T4
5. P4-T1 to P4-T3
6. P5-T1 to P5-T3
7. P3-T5 and P4-T4
8. P6-T1 to P6-T2

## Ready-to-start first sprint

Sprint objective:
- Deliver end-to-end vertical slice from onboarding inputs to deterministic projection output.

Sprint tasks:
1. P1-T1
2. P1-T3
3. P2-T1
4. P2-T3
5. P3-T1
6. P3-T2
7. P4-T1
8. P4-T3
9. P5-T1

Sprint exit criteria:
- User can create a basic plan and run a deterministic projection.
- Projection year rows are persisted.
- One integration test suite covers plan creation and projection run.
- lint and check-types pass.
