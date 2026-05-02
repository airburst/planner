import { Button } from "@/components/ui/button";
import { OnboardingState, OnboardingStepKey } from "../types";

interface Props {
  state: OnboardingState;
  onJumpTo: (step: OnboardingStepKey) => void;
}

const fmt = (v: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(v);

const fmtDate = (iso: string | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "long" }).format(d);
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function Section({
  title,
  step,
  onJumpTo,
  children,
}: {
  title: string;
  step: OnboardingStepKey;
  onJumpTo: (step: OnboardingStepKey) => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => onJumpTo(step)}>
          Edit
        </Button>
      </div>
      <div className="divide-y">{children}</div>
    </section>
  );
}

export function OnboardingReviewStep({ state, onJumpTo }: Props) {
  const wrapperLabel = { sipp: "SIPP", isa: "ISA", gia: "GIA", cash: "Cash" } as const;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-1 text-xl font-semibold">Review your plan</h2>
        <p className="text-sm text-muted-foreground">
          Confirm everything looks right before we create your plan.
        </p>
      </div>

      <Section title="Household" step="household" onJumpTo={onJumpTo}>
        <Row label="Your name" value={state.primaryPersonName || "—"} />
        <Row label="Your date of birth" value={fmtDate(state.primaryDateOfBirth)} />
        {state.hasPartner && (
          <>
            <Row label="Partner's name" value={state.partnerName || "—"} />
            <Row label="Partner's date of birth" value={fmtDate(state.partnerDateOfBirth)} />
          </>
        )}
      </Section>

      <Section title="Retirement timing" step="retirement-timing" onJumpTo={onJumpTo}>
        <Row label="Your retirement age" value={`${state.primaryRetirementAge}`} />
        {state.hasPartner && (
          <Row
            label="Partner's retirement age"
            value={`${state.partnerRetirementAge ?? state.primaryRetirementAge}`}
          />
        )}
      </Section>

      <Section title="Assets" step="assets" onJumpTo={onJumpTo}>
        {state.accounts.map((a, i) => (
          <Row
            key={i}
            label={wrapperLabel[a.wrapperType]}
            value={
              `${fmt(a.currentBalance)}` +
              (a.annualContribution > 0 ? ` · ${fmt(a.annualContribution)}/yr` : "") +
              (a.wrapperType === "sipp" && a.employerContribution > 0
                ? ` · ${fmt(a.employerContribution)}/yr employer`
                : "")
            }
          />
        ))}
      </Section>

      <Section title="Income" step="income-phases" onJumpTo={onJumpTo}>
        {state.hasSalary && state.salaryAnnual ? (
          <Row label="Your salary" value={`${fmt(state.salaryAnnual)}/yr until age ${state.primaryRetirementAge}`} />
        ) : (
          <Row label="Your salary" value="None entered" />
        )}
        {state.hasDbPension && state.dbPensionAnnualAmount ? (
          <Row
            label="Your DB pension"
            value={`${fmt(state.dbPensionAnnualAmount)}/yr from age ${state.dbPensionAge ?? 60}`}
          />
        ) : (
          <Row label="Your DB pension" value="None" />
        )}
        {state.hasStatePension ? (
          <Row
            label="Your State Pension"
            value={`${fmt(state.statePensionAnnualAmount ?? 11502)}/yr from age ${state.statePensionAge ?? 67}`}
          />
        ) : (
          <Row label="Your State Pension" value="None" />
        )}

        {state.hasPartner && state.partnerHasSalary && state.partnerSalaryAnnual ? (
          <Row
            label="Partner's salary"
            value={`${fmt(state.partnerSalaryAnnual)}/yr until age ${state.partnerRetirementAge ?? state.primaryRetirementAge}`}
          />
        ) : null}
        {state.hasPartner && state.partnerHasDbPension && state.partnerDbPensionAnnualAmount ? (
          <Row
            label="Partner's DB pension"
            value={`${fmt(state.partnerDbPensionAnnualAmount)}/yr from age ${state.partnerDbPensionAge ?? 60}`}
          />
        ) : null}
        {state.hasPartner && state.partnerHasStatePension ? (
          <Row
            label="Partner's State Pension"
            value={`${fmt(state.partnerStatePensionAnnualAmount ?? state.statePensionAnnualAmount ?? 11502)}/yr from age ${state.partnerStatePensionAge ?? state.statePensionAge ?? 67}`}
          />
        ) : null}
      </Section>

      <Section title="Spending" step="spending-target" onJumpTo={onJumpTo}>
        <Row label="Annual spending target" value={`${fmt(state.annualSpendingTarget)}/yr`} />
        <Row label="Of which essential" value={fmt(state.essentialAnnual)} />
        <Row label="Of which discretionary" value={fmt(state.annualSpendingTarget - state.essentialAnnual)} />
      </Section>
    </div>
  );
}
