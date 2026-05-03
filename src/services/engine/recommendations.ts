import { HouseholdYearState, Recommendation } from "./types";

interface RecommendationContext {
  /** The user's target annual spending (un-inflated). Used for impact figures. */
  targetSpending?: number;
  /** Result of findSafeAnnualSpend. Used to quantify the shortfall delta. */
  safeAnnualSpend?: number;
  /**
   * Years of additional runway gained from a 10% spending cut. Computed by
   * comparing baseline depletion year vs the depletion year of a re-run with
   * spending × 0.9. `null` if either run is sustainable or the helper bailed.
   */
  depletionRunwayDelta?: { yearsExtended: number; reducedDepletionYear: number | null } | null;
  /**
   * Smallest deferral in years that makes the plan sustainable, or null if
   * the helper couldn't find one within its search bound.
   */
  retirementDeferralYears?: number | null;
  /**
   * Result of findOptimalCrystallisationStrategy — UFPLS vs PCLS-upfront tax
   * comparison plus the would-be PCLS lump sum. When PCLS-upfront materially
   * beats UFPLS, the recommendation surfaces the opportunity.
   */
  crystallisationComparison?: {
    recommended: "ufpls" | "pcls-upfront";
    ufplsLifetimeTax: number;
    pclsLifetimeTax: number;
    taxSaving: number;
    pclsLumpSum: number;
  };
}

function hasTaxTrapExposure(year: HouseholdYearState): boolean {
  for (const person of year.taxBreakdown.people.values()) {
    if (person.personalAllowance > 0 && person.personalAllowance < 12570) {
      return true;
    }
  }
  return false;
}

function hasTaxableWithdrawals(year: HouseholdYearState): boolean {
  for (const person of year.people.values()) {
    for (const withdrawal of person.withdrawalDetails) {
      if (withdrawal.taxableComponent > 0) {
        return true;
      }
    }
  }
  return false;
}

export function generateRecommendations(
  projectionRunId: number,
  years: HouseholdYearState[],
  context: RecommendationContext = {}
): Recommendation[] {
  const recommendations: Recommendation[] = [];
  let nextId = 1;

  const firstUnsustainableYear = years.find((year) => !year.canSustainSpending);
  if (firstUnsustainableYear) {
    let impactScore: number | undefined;
    let impactLabel: string | undefined;
    let rationale = `Spending is no longer covered in ${firstUnsustainableYear.year}, creating a deficit or exhausting household assets.`;
    if (
      typeof context.targetSpending === "number" &&
      typeof context.safeAnnualSpend === "number" &&
      context.safeAnnualSpend < context.targetSpending
    ) {
      const reduction = context.targetSpending - context.safeAnnualSpend;
      impactScore = reduction;
      impactLabel = "/yr reduction needed";
      rationale = `Reducing spending by £${reduction.toLocaleString("en-GB")} per year (down to about £${context.safeAnnualSpend.toLocaleString("en-GB")}/yr) would keep the plan sustainable through your longevity target.`;
    }
    recommendations.push({
      id: nextId++,
      projectionRunId,
      priority: "high",
      category: "spending",
      title: "Reduce planned spending or add guaranteed income",
      description: "The projection becomes unsustainable in this year under current assumptions.",
      rationale,
      yearTriggered: firstUnsustainableYear.year,
      impactScore,
      impactLabel,
    });
  }

  // Only flag depletion when assets were previously positive, then drop to zero,
  // and the plan can no longer sustain spending.
  let hadPositiveAssetsBefore = false;
  let assetDepletionYear: HouseholdYearState | undefined;
  for (const year of years) {
    if (year.totalHouseholdAssets > 0) {
      hadPositiveAssetsBefore = true;
      continue;
    }

    if (hadPositiveAssetsBefore && year.totalHouseholdAssets === 0 && !year.canSustainSpending) {
      assetDepletionYear = year;
      break;
    }
  }

  if (assetDepletionYear) {
    let rationale = `Household assets fall to zero in ${assetDepletionYear.year}, so the plan cannot fund later years without changes.`;
    let impactScore: number | undefined;
    let impactLabel: string | undefined;
    let impactFormat: "currency" | "count" | undefined;
    if (context.depletionRunwayDelta && context.depletionRunwayDelta.yearsExtended > 0) {
      const { yearsExtended, reducedDepletionYear } = context.depletionRunwayDelta;
      impactScore = yearsExtended;
      impactFormat = "count";
      impactLabel = " years of extra runway from a 10% cut";
      rationale = reducedDepletionYear === null
        ? `Household assets fall to zero in ${assetDepletionYear.year}. A 10% spending cut would keep the plan sustainable through your longevity target.`
        : `Household assets fall to zero in ${assetDepletionYear.year}. A 10% spending cut would push depletion to ${reducedDepletionYear} (+${yearsExtended} years).`;
    }
    recommendations.push({
      id: nextId++,
      projectionRunId,
      priority: "high",
      category: "withdrawal",
      title: "Address asset depletion risk",
      description: "Projected assets are fully depleted in this year.",
      rationale,
      yearTriggered: assetDepletionYear.year,
      impactScore,
      impactLabel,
      impactFormat,
    });
  }

  // New rule: defer-retirement. Only fires when the plan is unsustainable AND
  // we found a deferral that fixes it. Suppress the "0 years" trivially-OK case.
  if (firstUnsustainableYear && typeof context.retirementDeferralYears === "number" && context.retirementDeferralYears > 0) {
    const n = context.retirementDeferralYears;
    recommendations.push({
      id: nextId++,
      projectionRunId,
      priority: "medium",
      category: "income",
      title: `Retire ${n} year${n === 1 ? "" : "s"} later`,
      description: "Working longer leaves more time to accumulate and shortens drawdown.",
      rationale: `Pushing every still-accumulating retirement age out by ${n} year${n === 1 ? "" : "s"} would make the plan sustainable through your longevity target.`,
      yearTriggered: firstUnsustainableYear.year,
      impactScore: n,
      impactLabel: ` year${n === 1 ? "" : "s"} deferral`,
      impactFormat: "count",
    });
  }

  const firstTaxTrapYear = years.find(hasTaxTrapExposure);
  if (firstTaxTrapYear) {
    recommendations.push({
      id: nextId++,
      projectionRunId,
      priority: "medium",
      category: "tax",
      title: "Manage income through the personal allowance taper",
      description: "A person enters the £100k-£125,140 adjusted net income band where the allowance is withdrawn.",
      rationale: `At least one person loses part of their personal allowance in ${firstTaxTrapYear.year}, creating an effective 60% marginal rate in that band.`,
      yearTriggered: firstTaxTrapYear.year,
    });
  }

  // SIPP crystallisation strategy. Only fires when there's a meaningful
  // saving from switching strategies (≥£500 lifetime), so we don't badger
  // users when the two paths are roughly equivalent.
  const comparison = context.crystallisationComparison;
  const firstTaxableWithdrawalYear = years.find(hasTaxableWithdrawals);
  if (comparison && comparison.taxSaving >= 500 && firstTaxableWithdrawalYear) {
    if (comparison.recommended === "pcls-upfront" && comparison.pclsLumpSum > 0) {
      recommendations.push({
        id: nextId++,
        projectionRunId,
        priority: "medium",
        category: "tax",
        title: `Take £${comparison.pclsLumpSum.toLocaleString("en-GB")} tax-free upfront`,
        description: "Crystallising your SIPP at retirement and taking the 25% PCLS now is more tax-efficient than UFPLS.",
        rationale: `Switching from UFPLS to a one-off Pension Commencement Lump Sum saves about £${Math.round(comparison.taxSaving).toLocaleString("en-GB")} in total tax across the projection. The remaining 75% stays invested in flexi-access drawdown.`,
        yearTriggered: firstTaxableWithdrawalYear.year,
        impactScore: comparison.taxSaving,
        impactLabel: " in lifetime tax saved",
      });
    } else if (comparison.recommended === "ufpls") {
      recommendations.push({
        id: nextId++,
        projectionRunId,
        priority: "low",
        category: "tax",
        title: "Stick with phased SIPP withdrawals (UFPLS)",
        description: "Keeping the 25% tax-free entitlement alive on future growth is more tax-efficient than crystallising upfront.",
        rationale: `UFPLS saves about £${Math.round(comparison.taxSaving).toLocaleString("en-GB")} in total tax versus taking a £${comparison.pclsLumpSum.toLocaleString("en-GB")} PCLS upfront, because the tax-free 25% applies to the SIPP's future growth too.`,
        yearTriggered: firstTaxableWithdrawalYear.year,
        impactScore: comparison.taxSaving,
        impactLabel: " in lifetime tax saved",
      });
    }
  }

  return recommendations;
}