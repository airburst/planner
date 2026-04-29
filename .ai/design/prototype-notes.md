# Prototype Notes

Date: 2026-04-29
Scope: stack-agnostic UI concept artifacts.

## Prototype format
The HTML prototype is a static multi-screen concept, not an implementation commitment. It is intended to help evaluate:
1. information hierarchy,
2. screen flow,
3. visual tone,
4. progressive disclosure,
5. placement of deterministic outputs, recommendations, scenario comparison, and advanced prompts.

The expanded set now includes:
1. 4 explicit onboarding steps,
2. 4 scenario-detail states,
3. 1 assumptions and stress state,
4. 1 retirement-income explanation state,
5. 1 post-run dashboard state.
6. 1 dedicated tax-efficient bridge recommendation state.

## Intended review questions
1. Does the onboarding feel light enough for first use?
2. Does the dashboard communicate the planning result quickly?
3. Is scenario comparison the most natural next action?
4. Does the assumptions screen feel optional rather than required?
5. Does the retirement-income view make drawdown easier to understand?
6. Do scenario-detail states explain trade-offs clearly enough to support a retirement-age decision?
7. Does the progress rail make onboarding feel finite rather than open-ended?
8. Does the tax-efficient bridge state explain when SIPP tax-free cash is useful without making the product feel like a tax-engine spreadsheet?

## What is intentionally deferred
1. final component system,
2. accessibility implementation details,
3. responsive breakpoints beyond the concept layout,
4. exact charting library choices,
5. production copy and microcopy.

## Added state-level intent
1. Onboarding steps should validate minimum data capture and pacing.
2. Scenario-detail states should validate editing, comparison, and rationale views separately.
3. The assumptions state should validate trigger-driven reveal behavior.
4. The income-path state should validate explanation quality for bridge years.
5. The tax-efficient bridge state should validate how advanced recommendations are explained and compared.

## Suggested prototype review flow
1. Review onboarding steps 1 to 4 and judge pacing, field order, and confidence cues.
2. Move to the dashboard and check whether key outcomes and actions are immediately clear.
3. Review scenario state A for quick comparison legibility.
4. Review scenario state B for control clarity and live impact readability.
5. Review scenario state C for explanatory quality and trade-off framing.
6. Review scenario state D for tax-efficient bridge recommendation clarity.
7. Open assumptions and stress testing to judge whether advanced controls remain contextual.
8. Review retirement-income path for bridge-year and tax-treatment clarity.
