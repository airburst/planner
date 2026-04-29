# Screen Inventory and Prototype Brief

Date: 2026-04-29
Purpose: define the expanded UI screen set to prototype before technical stack selection.
Positioning: calm, analytical, consumer-friendly, and trustworthy rather than brokerage-like or gamified.

## Design goals
1. Reduce anxiety around retirement planning.
2. Surface the main answer quickly: on track, borderline, or shortfall.
3. Keep advanced controls out of the way until relevant.
4. Make scenario comparison and recommendations feel tangible.

## Expanded prototype screen set

### Screen 1: Onboarding step 1 - household and retirement timing
Purpose:
- capture the minimum identity and timeline inputs.
Key elements:
- step rail showing 4-step journey,
- current age, retirement age, State Pension age, planning horizon,
- reassurance that assumptions can be refined later.

### Screen 2: Onboarding step 2 - assets and contributions
Purpose:
- capture balances and annual savings in pension/SIPP and ISA wrappers.
Key elements:
- current balances,
- annual contributions,
- optional other assets placeholders.

### Screen 3: Onboarding step 3 - spending and income
Purpose:
- set retirement spending shape and income assumptions.
Key elements:
- essential vs discretionary spending,
- salary and State Pension forecast,
- tax region input.

### Screen 4: Onboarding step 4 - review and run
Purpose:
- provide confidence checkpoint before first projection run.
Key elements:
- pre-run summary,
- included vs deferred model features,
- run action.

### Screen 5: Retirement outlook dashboard
Purpose:
- show core answer immediately after setup.
Key elements:
- readiness status,
- projected shortfall or surplus,
- safe spending estimate,
- timeline chart,
- top actions.

### Screen 6: Scenario detail state A - compare overview
Purpose:
- compare base and alternative scenarios side by side.
Key elements:
- key outcomes table,
- delta indicators,
- quick decision context.

### Screen 7: Scenario detail state B - scenario builder open
Purpose:
- allow guided parameter edits with live impact preview.
Key elements:
- scenario controls drawer,
- immediate impact metrics,
- warning cues for sensitivity.

### Screen 8: Scenario detail state C - event timeline and rationale
Purpose:
- explain why scenarios diverge in plain language.
Key elements:
- event timeline,
- reasoning cards,
- explicit trade-off summary.

### Screen 9: Assumptions and stress testing
Purpose:
- provide controlled access to deeper analysis without overwhelming default users.
Key elements:
- base assumptions panel,
- named stress presets,
- advanced reveal reasons tied to triggers.

### Screen 10: Retirement income path
Purpose:
- explain where retirement income comes from over time.
Key elements:
- phase-by-phase income composition,
- State Pension start marker,
- wrapper/tax notes.

### Screen 11: Tax-efficient bridge recommendation
Purpose:
- compare bridge strategies and explain when using the SIPP 25% tax-free element improves outcomes.
Key elements:
- side-by-side bridge strategy cards,
- estimated tax impact by strategy,
- recommendation rationale and trade-off notes.

## Progressive-disclosure rules reflected in the prototype
1. Default screens show only essential inputs and outcomes.
2. Advanced analysis appears as contextual prompts, not as mandatory setup.
3. Drawdown complexity is introduced only when the user has mixed wrappers or bridge years.
4. Stress testing is framed as confidence building, not fear marketing.

## State coverage added in this expanded version
1. Four explicit onboarding steps with a visible progress rail.
2. Four scenario-detail states beyond a single comparison screen.
3. Distinct pre-run and post-run states to validate first-use clarity.
4. A dedicated tax-efficient bridge recommendation state.

## Prototype review checklist
1. Can a first-time user understand the main outcome in under 30 seconds?
2. Can a user identify the top 3 actions without reading help text?
3. Is scenario comparison more prominent than raw assumptions editing?
4. Is advanced analysis discoverable without cluttering the main flow?
5. Do the screens reinforce trust and clarity rather than performance-chasing?
