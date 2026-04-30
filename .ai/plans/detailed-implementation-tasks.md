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
2. Confirm baseline folders exist: public/ipc, src/services/db, src/hooks, src/types, src/tests/integration, src/tests/unit.
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
1. Define tables in src/services/db/schema.ts:
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
1. Implement src/services/db/index.ts setup function.
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
- src/services/engine/types.ts: Complete domain model with UK 2026 tax assumptions
  - PersonContext, AccountContext, IncomeStreamContext types
  - PersonYearState, HouseholdYearState annual state tracking
  - AssumptionSet with progressive UK tax bands (PA £12,570, basic £50,270, higher £125,140)
  - WithdrawalStrategy configuration
- src/services/engine/index.ts: Core simulation with 8 exported functions
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
- src/services/engine/phased-income.ts: Sophisticated income phase handling (350+ lines)
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
- src/services/engine/withdrawal-strategy.ts: Tax-efficient withdrawal handling (250+ lines)
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
Status: Completed (2026-04-30)

Objective:
- Compute tax by person, then aggregate household result.

Implementation:
- calculatePersonTaxResult(): classifies income by source (trading/investment/pension/SIPP
  withdrawals), applies tax-trap-aware personal allowance taper, returns PersonTaxResult with
  full band breakdown (basicRateTax, higherRateTax, additionalRateTax, effectiveTaxRate)
- calculateEffectivePersonalAllowance(): standalone helper for £100k taper logic reused
  by both calculatePersonalTax() and calculatePersonTaxResult()
- calculateHouseholdTaxResult(): aggregates PersonTaxResult per person into HouseholdTaxResult
  with combined totalTax and effectiveRate — never pools income before tax
- PersonYearState and HouseholdYearState types updated to carry taxBreakdown field
- runProjection() wired to populate taxBreakdown on every year state
- Tests: partner-mode separation verified against pooled-income comparison; household
  aggregation from Map<personId, PersonYearState> verified

Definition of done: ✅
- Partner mode never pools taxable income before tax computation
- All checks passing

Dependencies:
- P3-T2, P3-T3

### P3-T5: Implement recommendation rule engine v1
Status: Completed (2026-04-30)

Objective:
- Produce explainable top actions based on deterministic outputs.

Implementation:
- src/services/engine/recommendations.ts: generateRecommendations(projectionRunId, years)
  - Rule 1 (high): first year spending is unsustainable
  - Rule 2 (high): asset depletion — only fires when assets hit zero AND plan cannot sustain
    spending (income-only plans do not trigger spurious depletion warnings)
  - Rule 3 (medium): personal allowance taper exposure (PA > 0 and < £12,570 for any person)
  - Rule 4 (medium): taxable withdrawals present — review drawdown sequencing
  - All recommendations carry id, projectionRunId, priority, category, title, description,
    rationale, yearTriggered
- src/services/engine/runtime.ts: bundle entry re-exporting engine + recommendations for Vite CJS build
- vite.main.config.ts: engine entry point added, output as public/engine.js
- public/ipc/projections.js: projections:runForPlan handler — queries DB, maps schema rows to
  engine types, calls runProjection() + generateRecommendations(), returns ProjectionResult
- public/electron.js: projections handler registered
- public/preload.js: runProjectionForPlan() exposed via contextBridge
- src/types/electron.d.ts: ProjectionResult type added with full year + recommendation shape
- Tests: 5 unit tests in recommendations.test.ts; depletion fix verified

Definition of done: ✅
- Recommendation outputs are deterministic and explainable
- All checks passing

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
Status: Completed (2026-04-30)

Objective:
- Display scenario health and recommendation details.

Implementation:
- useProjection() hook in src/hooks/use-projection.ts; staleTime 30s, retry disabled
- query-keys.ts: projection.forPlan(planId) key added
- badge.tsx: Badge component with high/medium/low/success/muted variants
- PlanDetailPage rewritten with per-file component extraction:
  - ProjectionSummary: sustainability status, end assets, total tax, total drawdown
  - IncomePhaseChart: stacked area visualisation of annual income by stream (recharts)
  - RecommendationPanel: priority-sorted recommendation cards with Badge and rationale
  - ProjectionTable: scrollable year-by-year table (income/tax/eff-rate/drawdown/assets/status)
  - ProjectionError: error state with retry button
  - utils.ts: fmt() and pct() formatting helpers
- Loading, error (with retry), and empty states handled
- All plan/[id]/ components extracted to individual files (one-component-per-file)

Definition of done: ✅
- Scenario detail reflects projection and recommendation outputs accurately.
- Recommendation rationale text visible to user.

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

### P5-T1b: Add projections IPC integration tests
Status: Completed (2026-04-30)

Objective:
- Verify end-to-end projection + recommendation path through IPC and real schema.

Implementation:
- src/tests/integration/projections.test.ts: 15 integration tests across 6 groups
  - Structure: envelope shape, required year fields, missing-DOB error
  - Income & tax: age-gated activation, PA boundary, 20% basic rate, determinism
  - Withdrawals: asset decay under spending pressure, zero tax from ISA-only drawdown
  - Scenarios: custom assumption set via scenario, plan-level fallback
  - Partner mode: per-person tax lower than pooled-income equivalent
  - Recommendations: no false positives, depletion and withdrawal recs triggered correctly
- helpers/ipc.ts: projections handler registered in registerPlannerHandlers()
- vitest.config.ts: test discovery widened to include src/services/**/*.test.ts
  (colocated engine tests now discovered alongside integration suite)

Definition of done: ✅
- 103 total tests passing (88 unit + 15 integration)

Dependencies:
- P3-T5, P5-T1

### P5-T2: Add golden projection test cases
Status: Completed (2026-04-30)

Objective:
- Lock expected outcomes for benchmark personas to catch engine regressions.

Implementation:
- Added fixture module at `src/services/engine/fixtures/golden-projections.ts` with 4
  benchmark personas:
  1) single early retiree bridge years
  2) partner-mode couple with DB + state pension timing offsets
  3) high earner in personal allowance taper bracket
  4) SIPP-heavy drawdown case
- Each fixture includes full person/account/income-stream inputs plus expected annual rows.
- Added `src/services/engine/golden-projections.test.ts` asserting exact equality for
  `totalHouseholdIncome`, `totalHouseholdTax`, and `totalHouseholdAssets` by year.
- Suite includes explicit coverage check that benchmark count is within 3-5 and that at
  least one bridge-year and one partner-tax scenario are present.

Definition of done: ✅
- Engine changes show clear pass/fail against golden outputs.
- At least one bridge-year scenario and one partner-tax scenario included.

Dependencies:
- P3-T4, P5-T1b

### P5-T3: Add recommendation invariants tests
Status: Completed (2026-04-30)

Objective:
- Ensure recommendation quality does not regress.

Implementation:
- Updated `generateRecommendations()` depletion logic to only trigger when assets were
  previously positive and later hit zero in an unsustainable year.
- Added invariant tests in `src/services/engine/recommendations.test.ts` covering:
  - baseline healthy scenario (no contradictory recommendations)
  - stressed scenario (stable high->medium priority ordering and non-empty rationale)
  - income-only scenario (no false depletion recommendation)
  - depletion gating (must have prior positive assets)

Definition of done: ✅
- Recommendation suite catches ranking and explanation regressions.

Dependencies:
- P3-T5, P5-T1b

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

---

## Current status — 2026-04-30

### Completed phases

| Phase | Tasks | Status |
|-------|-------|--------|
| P0 | Foundation and repository readiness | ✅ P0-T1 done; P0-T2 (tsconfig split) and P0-T3 (CI) deferred |
| P1 | Database and domain schema | ✅ P1-T1, P1-T2, P1-T3 done |
| P2 | IPC and preload surface | ✅ P2-T1, P2-T2, P2-T3 done |
| P3 | Calculation engine v1 | ✅ P3-T1 to P3-T5 done |
| P4 | Renderer app and query integration | ✅ P4-T1, P4-T2, P4-T3, P4-T4 done |
| P5 | Testing and quality gates | ✅ P5-T1, P5-T1b, P5-T2, P5-T3 done |
| P6 | Packaging and release readiness | ⬜ Not started |

### Test count
- Last full baseline run: 103 tests (88 unit + 15 integration)
- P5-T2 adds 5 golden regression tests in `src/services/engine/golden-projections.test.ts`
- P5-T3 adds 4 recommendation invariant tests in `src/services/engine/recommendations.test.ts`

### Source layout (current)

```
src/
  components/       shadcn/ui primitives (button.tsx, badge.tsx)
  hooks/            TanStack Query hooks (use-plans, use-people, use-accounts,
                    use-income-streams, use-projection, query-keys)
  lib/              utils.ts, electron-api.ts
  pages/
    index.tsx       HomePage
    onboarding/     5-step wizard (index.tsx + steps/ + types.ts + constants.ts)
    plan/[id]/      PlanDetailPage + ProjectionSummary, IncomePhaseChart,
            RecommendationPanel, ProjectionTable, ProjectionError, utils.ts
  router.tsx
  main.tsx
  index.css
  services/
    db/             schema.ts, index.ts, migrations/
    engine/         index.ts, types.ts, phased-income.ts, withdrawal-strategy.ts,
                    recommendations.ts, runtime.ts + colocated *.test.ts files
  tests/
    integration/    plans, accounts, income-streams, projections tests
  types/            electron.d.ts
public/
  electron.js       main process
  preload.js        contextBridge
  db.js             bundled DB module (built from src/services/db/)
  engine.js         bundled engine module (built from src/services/engine/)
  ipc/              plans.js, people.js, accounts.js, income-streams.js,
                    projections.js, assumption-sets.js, scenarios.js,
                    expense-profiles.js
```

### Next priorities

1. **P0-T2** — Add strict TypeScript project references and enforce renderer/main import boundaries
2. **P0-T3** — Add baseline CI workflow for lint, typecheck, and tests on pull requests
3. **P6-T1** — Verify electron-builder packaging with updated `src/services/db/migrations` path
4. **UI depth** — Edit flows for people, accounts, and income streams within plan detail
5. **Packaging** - Add icon and setup CI release workflow