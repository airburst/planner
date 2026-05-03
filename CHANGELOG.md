# planner

## 0.4.0

### Minor Changes

- Add build publishing anf version toast

## 0.3.0

### Minor Changes

- Improved UX by splitting screens. Added dark mode

### Fixed

- Drawdown calculations are clamped to the age of primary earner

## 0.2.0

### Minor Changes

#### Engine

- Year-by-year deterministic projection engine with household-level drawdown and per-person UK tax (PA, basic/higher/additional
  bands, Marriage Allowance).
- Accumulation phase: personal + employer SIPP contributions, growth, retirement-year pro-rata by birth month.
- SIPP drawdown strategies: UFPLS (25%/75% per draw) and PCLS-upfront (full crystallisation at retirement).
- Time-banded spending periods (go-go / slow-go / no-go), inflation-linked, with the earliest period auto-extending back to the
  household's last retirement.
- One-off incomes and expenses; unused windfalls credited to savings.
- Stress test presets: high inflation, lower returns, early death, market crash.
- Monte Carlo simulation with sequence-of-returns risk and p10/p50/p90 outcomes.
- Scenarios: per-scenario assumption sets, expense profiles, and field-level overrides (e.g. retirementAge).

#### Recommendations

- Quantified spending-cut recommendation tied to the safe annual spend.
- Asset depletion warning with 10% spending-cut runway delta.
- Defer-retirement recommendation finds the smallest deferral that makes the plan sustainable.
- Personal allowance taper (60% effective rate) flag.
- PCLS vs UFPLS comparison: surfaces the lump sum and lifetime tax saving; switches direction based on which strategy wins.
- Gap-to-target additional contribution recommendation.

#### UI

- Plan detail page: setup panels (people, spending, accounts, income streams, one-offs, assumptions), projection summary, cash-flow
  chart, projection table, recommendations, scenario selector.
- Onboarding flow: people, income phases, retirement timing, spending target, assets, partner income.
- Cash-flow chart: stacked income/drawdown bars with one-off-income band, gradient fills, rounded top segment, toggleable
  spending-target line.
- Scenario comparison: side-by-side base vs scenario metrics.
- Stress test card with vs-base deltas.
- Monte Carlo card with iteration/volatility controls and probability of success.
- Spending card combines baseline (essential + discretionary) with life-stage overrides.
- Assumptions panel: tax thresholds, rates, SIPP min age, drawdown strategy.

#### Platform

- Electron + Vite + React + TanStack Router/Query.
- Local SQLite via better-sqlite3 + Drizzle ORM with migrations.
- Custom app icon, design system tokens.
- Pre-commit hook: lint + 172 tests + typecheck.
