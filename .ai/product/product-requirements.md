# Product Requirements Document

Date: 2026-04-29
Product: UK consumer retirement modeling app
Positioning: Simple by default, advanced when needed.

## 1. Product goal
Help a UK consumer answer three questions quickly and confidently:
1. Can I retire when I want?
2. How much can I safely spend in retirement?
3. What changes improve my plan the most?

## 2. Target user
A UK resident consumer planning their own retirement, likely comfortable with spreadsheets and calculators but wanting a clearer, more interactive planning experience.

The system can remain single user-centric while still supporting a partner as part of the same household plan, including partner income streams, partner-owned accounts, and combined household spending.

## 3. Primary jobs to be done
1. Estimate whether current assets and contributions are enough.
2. Compare retirement dates, contribution rates, and spending plans.
3. Understand the effect of pensions, ISAs, tax, and inflation.
4. Explore advanced risk analysis only when it becomes useful.

## 4. Core product principles
1. Fast first value: onboarding should produce a first plan in under 5 minutes.
2. Progressive disclosure: advanced controls are hidden until relevant.
3. UK realism: model State Pension, tax basics, ISA/SIPP wrappers, and retirement income rules.
4. Explainability: outputs should be understandable without financial-adviser jargon.
5. In partner mode, tax must be computed per person first and only then rolled up to the household view.

## 5. Tier A functional requirements
1. Profile setup
- Capture current age, target retirement age, partner toggle, target spending, current savings, annual contributions, pension balances, ISA balances, other assets, and expected retirement age.
- If partner mode is enabled, capture partner retirement timing, partner income streams, and partner-owned pension / ISA balances within the same household plan.

2. Projection engine
- Produce annual projections from current age through longevity horizon.
- Model contributions before retirement and withdrawals after retirement.
- Apply inflation to spending targets and nominal growth assumptions to assets.
- Support multiple retirement-income phases, including bridge years between retirement date, defined benefit pension start, and State Pension start.
- In partner mode, calculate taxable income, allowances, and estimated tax separately for the primary user and partner.

3. Income sources
- Support State Pension as a configurable income stream with start age and forecast amount.
- Support defined benefit pensions as configurable income streams with their own start age, amount, and inflation behavior.
- Support partner-owned income streams, including partner State Pension, partner defined benefit income, and other partner retirement income, within a single shared plan.
- Support workplace / personal pension balances.
- Support ISA balances as tax-advantaged drawdown accounts.
- Support optional other income lines.

4. Outputs
- Show projected net worth over time.
- Show annual cash inflow, outflow, surplus, or shortfall.
- Show earliest sustainable retirement age estimate.
- Show safe spending estimate under deterministic assumptions.
- Show results at household level while retaining enough structure to explain which income streams belong to the primary user, the partner, or both.
- Show household totals without hiding separate personal tax allowances, taxable income, and estimated tax by person.

5. Scenario planning
- Allow cloning a plan into scenarios.
- Allow edits to retirement age, spending, growth assumptions, and contributions.
- Show side-by-side comparison of key outputs.

6. Recommendations
- Generate top 3 to 5 actionable suggestions based on modeled shortfalls or inefficiencies.
- Example recommendations: increase annual pension contribution, reduce target spending, retire later, increase ISA bridge savings.

7. Stress-test presets
- Provide a small number of curated presets such as high inflation, weak returns in first 10 years, and longer lifespan.
- Keep these preset-based rather than free-form in v1.

## 5.1 Bridge-year behavior required in v1
The v1 planner should be able to model a retirement path where:
1. a defined benefit pension starts at one age,
2. State Pension starts later,
3. SIPP and ISA withdrawals cover some or all of the funding gap between those income phases.

This does not require full withdrawal-order optimization in v1, but it does require correct time-based activation of income streams and correct tax treatment of each withdrawal source.

## 5.2 Drawdown recommendation baseline and advanced behavior
The planner should distinguish between:
1. baseline v1 drawdown modeling, and
2. advanced tax-efficient drawdown recommendations.

Baseline v1 requirements:
1. model taxable SIPP drawdown,
2. model ISA tax-free withdrawals,
3. model the existence of the SIPP 25% tax-free element,
4. show year-by-year taxable income and estimated tax.
5. in partner mode, maintain separate taxable-income and tax-estimate outputs for each person.

Advanced drawdown recommendation requirements:
1. recommend tax-efficient bridge strategies across defined benefit income, SIPP, and ISA,
2. recommend when and how much of the SIPP 25% tax-free element to use,
3. compare drawdown patterns that reduce unnecessary higher-rate tax exposure,
4. explain trade-offs between preserving ISA assets and using tax-free pension cash.

## 6. Tier B advanced modules
1. Monte Carlo simulation
- Run stochastic simulations using configurable expected return, volatility, and inflation assumptions.
- Return plan success probability and percentile outcome bands.

2. Sequence risk visualization
- Surface vulnerability to poor early retirement returns.

3. Advanced drawdown module
- Support withdrawal-order choices across pension, ISA, and taxable assets.
- Support tax-free lump-sum handling assumptions.
- Recommend the most tax-efficient way to fund retirement and bridge years using defined benefit income, SIPP taxable drawdown, ISA withdrawals, and the SIPP 25% tax-free element.
- Compare alternative drawdown strategies and show tax impact by year.

4. Goal trade-off module
- Split spending into essentials, lifestyle, and aspirational goals.
- Allow users to protect essentials while flexing discretionary spending.

## 7. Triggers for revealing Tier B controls
Reveal advanced features only when at least one trigger fires.

### Trigger group A: plan risk triggers
1. Deterministic plan shows a funding shortfall in any retirement year.
2. Retirement assets fall below threshold before longevity horizon.
3. User selects an unusually early retirement age.

### Trigger group B: complexity triggers
1. User has both pension and ISA assets and asks how to draw them down.
2. User changes assumptions repeatedly across scenarios.
3. User asks for probability, downside, or worst-case insight.

### Trigger group C: confidence triggers
1. User opens stress testing more than once.
2. User compares multiple scenarios and still has close outcomes.
3. User has a plan near the pass/fail boundary under deterministic assumptions.

## 8. Non-functional requirements
1. Results should update quickly enough to feel interactive.
2. Assumptions must be versioned and auditable.
3. UK rules should be table-driven, not hard-coded into UI logic.
4. The model should support adding Scotland tax treatment later without redesign.

## 9. Explicit v1 exclusions
1. Advisor portal or CRM workflows
2. Open banking connections
3. Full inheritance / estate planning
4. Free-form tax optimization engine
5. AI assistant as a core dependency

## 10. Success criteria
1. A user can build a first plan in under 5 minutes.
2. A user can compare at least 3 scenarios without confusion.
3. A user can identify the top actions to improve their retirement outcome.
4. Advanced users can reach deeper analysis without cluttering the default UX.
