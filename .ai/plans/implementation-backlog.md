# Implementation Backlog

Date: 2026-04-29
Scope: UK consumer retirement-planning app, based on the agreed v1 cut.
Planning style: stack-agnostic epics and tickets, sequenced to reduce rework and keep the financial engine auditable.

Detailed engineering task breakdown:
- See .ai/plans/detailed-implementation-tasks.md for phase-by-phase implementation tickets with dependencies and definition of done.

## Delivery principles
1. Build the calculation core before UI sophistication.
2. Keep rules and assumptions table-driven.
3. Prefer transparent deterministic outputs before advanced optimization.
4. Validate with representative user scenarios at each milestone.

## Release framing
- Release 0: planning and model foundations
- Release 1: deterministic v1
- Release 1.1: stochastic and richer drawdown
- Release 2: platform and advanced planning

## Epic 1: Assumptions and policy foundation
Goal: create a reliable rules layer for UK modeling.

### Ticket 1.1: Assumption catalog
Description:
- Define the complete list of model assumptions used by v1.
- Separate user-entered assumptions from system defaults and policy tables.
Acceptance criteria:
- Every v1 output can be traced to named assumptions.
- Assumptions are grouped into user inputs, defaults, and policy rules.
- Each assumption has a versioning strategy.
Dependencies:
- None.

### Ticket 1.2: UK policy tables
Description:
- Define policy tables for tax bands, Personal Allowance logic, pension access constraints, and State Pension defaults.
Acceptance criteria:
- England/Wales/Northern Ireland tax bands are represented in data form.
- State Pension rule fields and pension access fields are represented in data form.
- Scotland is explicitly unsupported or separately flagged.
Dependencies:
- Ticket 1.1.

### Ticket 1.3: Assumption validation rules
Description:
- Define field-level validation and model sanity checks.
Acceptance criteria:
- Retirement age, State Pension age, contribution values, and spending values have validation rules.
- Invalid combinations are identified before running projections.
Dependencies:
- Tickets 1.1 and 1.2.

## Epic 2: Domain model and planning data structures
Goal: establish the core planning entities and their relationships.

### Ticket 2.1: Entity definitions
Description:
- Define domain entities for user profile, household, accounts, income streams, expenses, assumptions, scenarios, and outputs.
Acceptance criteria:
- Every Tier A feature maps to explicit entities.
- Entities distinguish editable inputs from derived outputs.
Dependencies:
- Epic 1.

### Ticket 2.2: Scenario model
Description:
- Define how scenarios inherit from a base plan and override selected fields.
Acceptance criteria:
- Base plan plus overrides can reconstruct any scenario.
- The model avoids full duplication for minor scenario edits.
Dependencies:
- Ticket 2.1.

### Ticket 2.3: Audit and provenance model
Description:
- Define how output records store the assumptions and inputs used to produce them.
Acceptance criteria:
- A projection result can be tied to the exact input snapshot and rules version.
Dependencies:
- Tickets 1.1 and 2.1.

## Epic 3: Deterministic projection engine
Goal: deliver the core calculation engine for v1.

### Ticket 3.1: Year-step simulation design
Description:
- Define the annual simulation timeline and event order.
Acceptance criteria:
- The engine order of operations is documented.
- Pre-retirement and post-retirement flows are both supported.
Dependencies:
- Epic 2.

### Ticket 3.2: Asset growth and contribution logic
Description:
- Implement or specify asset growth, annual contributions, and inflation adjustment logic.
Acceptance criteria:
- Contributions stop or change according to retirement events.
- Asset balances evolve correctly year by year.
Dependencies:
- Ticket 3.1.

### Ticket 3.3: Retirement withdrawal logic
Description:
- Define simplified v1 withdrawal behavior across pension and ISA accounts.
Acceptance criteria:
- Pension and ISA balances can fund retirement spending.
- Taxable and tax-free pension components are separated at a basic level.
Dependencies:
- Tickets 1.2 and 3.1.

### Ticket 3.4: Income and tax calculation
Description:
- Define annual taxable income aggregation and v1 income tax estimation.
Acceptance criteria:
- State Pension and taxable pension income feed annual tax estimation.
- ISA withdrawals do not feed taxable income.
Dependencies:
- Tickets 1.2 and 3.3.

### Ticket 3.5: Core outputs
Description:
- Define output measures used by the product.
Acceptance criteria:
- Net worth over time, annual surplus/shortfall, years-funded, earliest sustainable retirement age, and deterministic safe-spending outputs are all defined.
Dependencies:
- Tickets 3.2 to 3.4.

## Epic 4: Recommendation and insight layer
Goal: convert model outputs into actionable advice.

### Ticket 4.1: Recommendation rule set
Description:
- Define the heuristics that generate the top 3 to 5 actions.
Acceptance criteria:
- Each recommendation has a clear trigger condition.
- Recommendations are rankable by estimated impact.
Dependencies:
- Epic 3.

### Ticket 4.2: Explanation copy model
Description:
- Define the text templates and data points needed to explain outputs plainly.
Acceptance criteria:
- Core outputs and recommendations can be described without adviser jargon.
Dependencies:
- Ticket 4.1.

## Epic 5: Scenario planning and comparison
Goal: support side-by-side planning decisions.

### Ticket 5.1: Scenario creation workflow
Description:
- Define how users clone and modify scenarios from a base plan.
Acceptance criteria:
- Scenario creation requires minimal input.
- Changed fields are visible and auditable.
Dependencies:
- Ticket 2.2.

### Ticket 5.2: Scenario comparison metrics
Description:
- Define the set of metrics shown side by side.
Acceptance criteria:
- Comparison view includes retirement age, shortfall/surplus, end balance, safe spending, and recommendation differences.
Dependencies:
- Ticket 3.5.

## Epic 6: Progressive-disclosure UX rules
Goal: keep the product simple until more complexity is warranted.

### Ticket 6.1: Advanced trigger engine
Description:
- Convert PRD trigger groups into evaluable product rules.
Acceptance criteria:
- Trigger groups A, B, and C can be expressed against plan state and user behavior.
Dependencies:
- Product requirements artifact.

### Ticket 6.2: Assumptions panel strategy
Description:
- Define which assumptions are shown by default and which remain hidden.
Acceptance criteria:
- New users see only the minimum viable set of controls.
- Advanced controls are discoverable but not noisy.
Dependencies:
- Tickets 1.1 and 6.1.

## Epic 7: Stress-test presets
Goal: provide risk awareness without stochastic infrastructure.

### Ticket 7.1: Preset scenario library
Description:
- Define named stress scenarios for v1.
Acceptance criteria:
- At least three presets exist: high inflation, weak early returns, longer lifespan.
- Each preset is a transparent set of assumption overrides.
Dependencies:
- Tickets 1.1 and 2.2.

### Ticket 7.2: Stress-test result presentation
Description:
- Define how stress-test outcomes are compared to the base plan.
Acceptance criteria:
- Users can see impact on retirement age, shortfall, and end balance.
Dependencies:
- Tickets 5.2 and 7.1.

## Epic 8: Verification and benchmark scenarios
Goal: prove the model is internally consistent and product-useful.

### Ticket 8.1: Benchmark persona set
Description:
- Create representative UK personas for validation.
Acceptance criteria:
- Include at least: late starter, steady saver, early retiree, homeowner, and bridge-to-pension case.
Dependencies:
- Epic 3.

### Ticket 8.2: Golden scenario outputs
Description:
- Define expected outputs for benchmark personas under fixed assumptions.
Acceptance criteria:
- Changes to the engine can be checked against known outcomes.
Dependencies:
- Ticket 8.1.

### Ticket 8.3: Recommendation quality review
Description:
- Review whether generated actions are sensible for benchmark cases.
Acceptance criteria:
- Recommendation ranking is plausible and non-contradictory across personas.
Dependencies:
- Epic 4 and Ticket 8.1.

## Epic 9: Release 1.1 extensions
Goal: add more advanced risk and retirement-income logic after deterministic v1 is stable.

### Ticket 9.1: Monte Carlo assumption model
Description:
- Define return, volatility, inflation, and correlation inputs for stochastic simulation.
Acceptance criteria:
- Simulation assumptions are explicit and editable.
Dependencies:
- Epic 3 and stochastic-analysis-data research.

### Ticket 9.2: Sequence-risk visualizations
Description:
- Define outputs showing downside risk in early retirement years.
Acceptance criteria:
- Visualization requirements are tied to simulation outputs.
Dependencies:
- Ticket 9.1.

### Ticket 9.3: Richer drawdown controls
Description:
- Extend withdrawal logic to support alternative sequencing options.
Acceptance criteria:
- Users can compare at least two drawdown strategies.
Dependencies:
- Ticket 3.3.

## Suggested implementation order
1. Epic 1
2. Epic 2
3. Epic 3
4. Epic 8
5. Epic 5
6. Epic 4
7. Epic 6
8. Epic 7
9. Epic 9

## Suggested first milestone
A CLI, notebook, or internal prototype that can:
1. load a base plan,
2. run the deterministic yearly projection,
3. produce annual balances and shortfall outputs,
4. compare one scenario against the base case.

That milestone should exist before committing to UI architecture.
