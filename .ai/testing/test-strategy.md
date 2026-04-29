# Test Strategy Foundations

Date: 2026-04-29
Scope: deterministic v1 engine and pre-build product validation.
Goal: create a testing strategy that can survive stack changes and still map cleanly into code later.

## 1. Test layers

### Layer A: Rule-table tests
Purpose:
- verify policy tables and assumptions data.
Examples:
- tax bands load correctly,
- Personal Allowance taper rules are represented correctly,
- State Pension defaults are versioned and addressable.

### Layer B: Domain validation tests
Purpose:
- verify that invalid inputs are rejected before simulation.
Examples:
- retirement age before current age,
- State Pension age before minimum plausible policy age,
- negative contribution amounts where not allowed.

### Layer C: Engine micro-tests
Purpose:
- verify individual calculation behaviors in isolation.
Examples:
- one-year asset growth,
- inflation application,
- taxable-income aggregation,
- ISA withdrawal tax exclusion.

### Layer D: End-to-end deterministic projection tests
Purpose:
- verify full plan simulations over the entire horizon.
Examples:
- benchmark personas,
- scenario comparisons,
- stress preset behavior.

### Layer E: Recommendation and trigger tests
Purpose:
- verify product behavior derived from engine outputs.
Examples:
- later-retirement recommendation appears when shortfall exists,
- stress-testing prompt appears near the pass/fail boundary,
- mixed-wrapper drawdown complexity prompt appears for bridge years.

### Layer F: Snapshot or golden tests
Purpose:
- detect unintended engine changes.
Examples:
- annual row snapshots,
- output summary snapshots,
- recommendation ranking snapshots.

## 2. What to test before code exists
1. Personas
2. Golden case definitions
3. Invariants
4. Assumption catalogs
5. Stress preset definitions
6. Scenario override semantics
7. UI screen flow expectations

## 3. Minimal deterministic test contract
The first engine implementation should support enough inspection to test:
- normalized input payload,
- resolved assumptions,
- yearly rows,
- summary outputs,
- warnings,
- recommendations,
- advanced triggers.

If the first implementation cannot expose these artifacts, testing will become unnecessarily difficult.

## 4. Required invariants
1. The engine is deterministic for identical inputs.
2. Scenario overrides do not mutate the base plan.
3. Balances do not silently go negative.
4. Every output can be traced to an assumption set and policy version.
5. Tax calculations depend only on declared taxable inputs and region rules.
6. Recommendation rules are explainable and stable under identical outputs.

## 5. Regression priorities
Prioritize regression coverage in this order:
1. timeline and age logic,
2. wrapper-specific tax treatment,
3. retirement shortfall detection,
4. scenario comparison correctness,
5. recommendation ranking,
6. advanced-feature triggers,
7. stress preset integrity.

## 6. Suggested acceptance gate for first buildable engine
Do not treat the engine as ready for UI integration until:
1. all benchmark personas run successfully,
2. golden cases are frozen,
3. core invariants are enforced,
4. at least one scenario comparison case passes,
5. stress presets behave as transparent assumption overrides.

## 7. Test data governance
1. Version all assumption sets used by tests.
2. Never silently edit golden fixtures.
3. Add new fixtures when policy changes would invalidate older snapshots.
4. Keep benchmark personas readable to non-engineers so product review remains possible.

## 8. UI-prototype validation linkage
The UI prototypes should also be testable against product behavior.
Examples:
- the results screen must have a place for top recommendations,
- scenario compare must surface the metrics frozen by golden cases,
- advanced-analysis prompts must correspond to trigger rules.

## 9. Practical first move after stack selection
Create a single test harness that can:
1. load a persona fixture,
2. apply a scenario override,
3. run the engine,
4. dump summary outputs and yearly rows,
5. compare them to a golden snapshot.

That one harness becomes the backbone for model verification regardless of framework choice.
