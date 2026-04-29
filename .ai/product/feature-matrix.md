# Feature Matrix and Recommended v1 Cut

Date: 2026-04-29
Scoring model:
- User value: 1 (low) to 5 (critical)
- Complexity: 1 (low) to 5 (high)
- V1 fit: qualitative recommendation based on high user value, low-to-moderate complexity, and dependency ordering

## Matrix

| Feature | User value | Complexity | Why it matters | Recommended cut |
|---|---:|---:|---|---|
| Guided onboarding | 5 | 2 | Reduces friction and makes the planner usable in minutes | Must-have v1 |
| Deterministic yearly projection engine | 5 | 3 | Core model behind all retirement outputs | Must-have v1 |
| Retirement readiness summary | 5 | 2 | Answers the main user question immediately | Must-have v1 |
| Scenario compare (duplicate/edit plan) | 5 | 3 | High leverage feature for decision making | Must-have v1 |
| UK State Pension inputs and forecast handling | 5 | 3 | Essential UK baseline income source | Must-have v1 |
| ISA / SIPP account modeling | 5 | 3 | Core UK wrapper logic for retirement planning | Must-have v1 |
| Baseline income tax estimate | 4 | 3 | Needed for realistic retirement-income outputs | Must-have v1 |
| Action dashboard (top 3 to 5 moves) | 4 | 2 | Converts analysis into user action | Must-have v1 |
| Spending goal split (essential vs discretionary) | 4 | 2 | Supports realistic trade-off planning | Should-have v1 if time allows |
| Manual pension drawdown modeling | 4 | 4 | Important for decumulation realism | Narrow v1.1 or limited v1 |
| Monte Carlo simulation | 4 | 4 | Strong trust and risk communication feature | v1.1 |
| Stress testing presets | 4 | 3 | Easier than Monte Carlo and very useful | Can be limited v1 or v1.1 |
| Sequence risk visualization | 3 | 4 | Useful but depends on stochastic engine | v1.1 |
| Goal prioritization (needs / wants / wishes) | 3 | 2 | Improves planning quality without major engine complexity | v1.1 |
| Advanced tax drawdown optimization | 5 | 5 | Key differentiator for bridge years and retirement income sequencing | v1.1 or v2 depending on ambition |
| Open banking / account aggregation | 3 | 5 | Nice onboarding improvement but not core to first release | v2 |
| AI copilot / natural language edits | 3 | 4 | Attractive but not core to first planning value | v2 |
| Estate / inheritance planning | 2 | 5 | Lower importance for initial retirement MVP | v2 |
| Advisor workflows / multi-client mode | 1 | 5 | Out of scope for consumer-first launch | Exclude |

## Exact recommended v1 cut

### Include in v1
1. Guided onboarding
2. Deterministic yearly projection engine
3. Retirement readiness summary
4. Scenario comparison
5. UK State Pension modeling inputs
6. ISA and SIPP account types
7. Baseline income-tax estimate for England, Wales, and Northern Ireland
8. Action dashboard
9. Spending split between essential and discretionary spending
10. Limited stress-test presets

### Defer to v1.1
1. Monte Carlo simulation
2. Sequence-of-returns risk charts
3. Goal prioritization tools
4. Richer pension drawdown controls
5. Tax-efficient bridge and drawdown recommendations using the SIPP 25% tax-free element

### Defer to v2
1. Full advanced tax optimization if not pulled into v1.1
2. Open banking aggregation
3. AI copilot
4. Estate / inheritance planning

## Why this v1 cut is the right boundary
- It answers the most important user questions without requiring heavy stochastic or optimization infrastructure.
- It is UK-specific enough to feel credible instead of generic.
- It preserves a simple onboarding and mental model.
- It keeps room for advanced features to unlock later without rebuilding the core engine.

## Proposed launch principle
Launch with deterministic planning plus a small number of curated stress scenarios before adding Monte Carlo. This provides useful risk awareness without introducing a hard dependency on historical market datasets or a heavier computational layer on day one.
