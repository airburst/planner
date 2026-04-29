# Detailed Implementation Tasks

Date: 2026-04-29
Goal: provide an execution-ready engineering backlog for Planner on Electron + SQLite + TanStack Start + React + TanStack Query + shadcn + Tailwind.

## Working conventions

- Task ID format: P<phase>-T<task>
- Status defaults to Not started
- Every task includes definition of done and explicit dependencies
- No task is done until lint and type checks pass
- Database rule: all schema work starts in Drizzle ORM definitions and must flow through generated migrations before SQLite changes are committed
- UI rule: use Tailwind utility classes via className and shadcn theme tokens; do not use inline style props

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
Status: Completed (2026-04-29)

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
Status: Completed (2026-04-29)

Objective:
- Build projection loop with transparent year-by-year state.

Implementation:
- src/main/engine/types.ts: Complete domain model with UK 2026 tax assumptions
  - PersonContext, AccountContext, IncomeStreamContext types
  - PersonYearState, HouseholdYearState annual state tracking
  - AssumptionSet with progressive UK tax bands (PA £12,570, basic £50,270, higher £125,140)
  - WithdrawalStrategy configuration
- src/main/engine/index.ts: Core simulation with 8 exported functions
  - calculateAgeInYear(), isIncomeStreamActive(), calculateIncomeForStream()
  - calculateGrowth(), calculatePersonalTax()
  - projectPersonYear() - single-year projection with withdrawal strategy
  - runProjection() - multi-year household projection
  - All functions deterministic with comprehensive unit tests
- src/tests/unit/engine.test.ts: 30+ unit tests
  - Tax computation accuracy (progressive bands, HMRC approximations)
  - Age-based income activation
  - Inflation-indexed income handling
  - Growth calculations with real/nominal returns
  - Withdrawal strategy ordering and tax treatment
  - Determinism verification (identical inputs → identical outputs)
  - Multi-person household aggregation

Definition of done: ✅
- Deterministic output for identical inputs verified
- Year-by-year state calculation complete
- All checks passing (lint, type, tests)

Dependencies:
- P1-T1, P2-T3

### P3-T2: Implement phased income activation logic
Status: Completed (2026-04-29)

Objective:
- Handle overlapping income phases by person and stream type.

Implementation:
- src/main/engine/phased-income.ts: Sophisticated income phase handling (350+ lines)
  - getActiveIncomeStreamsForYear(): Age-based stream activation with inflation indexing
  - calculatePersonIncomePhase(): Single-year income composition and aggregation
  - generatePersonIncomeReport(): Multi-year income trajectory analysis
  - analyzeIncomePhases(): Pattern detection (e.g., DB @60, State Pension @67)
  - projectHouseholdIncomePhases(): Multi-person household aggregation by year
  - detectIncomeTransitions(): Identify critical income change years
  - arePhaseSequencesEquivalent(): Deterministic phase comparison
- src/tests/unit/phased-income.test.ts: 25+ unit tests
  - Age-based stream activation before/at/after thresholds
  - Multi-stream concurrent income scenarios
  - Inflation-indexed vs fixed income handling
  - Income phase pattern recognition
  - Household aggregation verification
  - Income transition detection
  - First active age detection and transition year tracking

Definition of done: ✅
- DB at 60 + State Pension at 67 scenario computes correctly
- Multi-stream household income aggregation verified
- Pattern analysis identifies all income transitions
- All checks passing

Dependencies:
- P3-T1

### P3-T3: Implement bridge-year withdrawal logic (SIPP and ISA)
Status: Completed (2026-04-29)

Objective:
- Cover pre-State-Pension funding years with explicit source ordering.

Implementation:
- src/main/engine/withdrawal-strategy.ts: Tax-efficient withdrawal handling (250+ lines)
  - getDefaultWithdrawalStrategy(): UK-optimized priority (cash → ISA → SIPP → other)
  - calculateBridgeYears(): Identify gap between retirement and State Pension age
  - calculateWithdrawal(): Tax implications per account type
    - ISA: 100% tax-free
    - SIPP: 25% tax-free lump sum + taxable portion
    - Cash: Fully taxable
  - executeWithdrawalSequence(): Priority-ordered multi-source withdrawal execution
  - analyzeBridgeYear(): Determine if year requires bridge withdrawals and sources
  - generateBridgeYearPlan(): Multi-year bridge planning with ISA capacity tracking
  - WithdrawalResult: Tax-aware withdrawal output with explanation
- src/tests/unit/withdrawal-strategy.test.ts: 15+ unit tests
  - Bridge-year period identification and gap calculation
  - Account priority ordering by tax efficiency
  - ISA tax-free component verification
  - SIPP 25% tax-free allowance + taxable portion handling
  - Multi-source withdrawal sequencing
  - Multi-year bridge planning with capacity management
  - Funding gap verification

Definition of done: ✅
- Bridge years have explicit funding strategy with no unexplained gaps
- Withdrawal sources tracked with tax implications
- ISA and SIPP tax treatment implemented correctly
- All checks passing

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
Status: Completed (2026-04-29)

Objective:
- Establish navigable app skeleton for onboarding and scenarios.

Implementation notes:
- TanStack Router configured with root layout (RootLayout component)
- Pages folder structure established at src/pages/ with nested route subfolders
- HomePage (index route) lists plans with create plan action
- PlanDetailPage ([id] route) displays plan-scoped data (people, accounts, income streams)
- Query hooks integrated for data fetching
- Tailwind + shadcn Button component system active

Implementation tasks:
1. Set up TanStack Router routing (COMPLETED).
2. Add core pages:
- index route (HomePage, lists plans) — COMPLETED
- plan/[id] route (PlanDetailPage, plan detail) — COMPLETED
- onboarding (pending)
- scenarios (pending)
- assumptions (pending)
3. Add app shell with responsive navigation (root layout established, navbar component structure in place).

Definition of done:
- Navigation works in desktop window sizes and small widths.
- Baseline routes render correctly with query hook integration.

Dependencies:
- P0-T2

### P4-T2: Add query hooks and mutation hooks for core entities
Status: Completed (2026-04-29)

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
Status: Completed (2026-04-29)

Objective:
- Capture minimum viable inputs to run first projection.

Implementation notes:
- 5-step wizard with multi-step form state management
- Progress bar showing current step and total steps
- Step components:
  1. Household Setup: primary/partner names, household configuration
  2. Retirement Timing: retirement ages via sliders (50-85 age range)
  3. Current Assets: savings amount (£0-£1M range), account type selection
  4. Retirement Income: DB pension and State Pension configuration with activation ages
  5. Spending Target: annual spending goal (£10k-£200k range) with monthly equivalent
- Real-time summaries for user confirmation at each step
- Form validation (requires primary person name to complete)
- Automatic plan creation on completion with name based on primary person
- Redirects to plan detail page after creation
- Prominent "Create New Plan" button on HomePage
- Added /onboarding route to TanStack Router

Implementation tasks:
1. ✓ Build 5-step sequence with form components
2. ✓ Add state management and progress tracking
3. ✓ Implement form validation and user confirmations

Definition of done:
- ✓ New user can walk through onboarding flow
- ✓ Plan is created with captured data
- ✓ All steps use @ alias imports and shadcn components
- ✓ TypeScript types and lint checks passing

Dependencies:
- P4-T2 (Completed)

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
Status: Completed (2026-04-29)

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
