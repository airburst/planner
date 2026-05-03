import { Button } from "@/components/ui/button";
import {
  useAssumptionSetByPlan,
  useCreateAssumptionSet,
  useUpdateAssumptionSet,
} from "@/hooks/use-assumption-sets";

interface Props {
  planId: number;
}

type Strategy = "ufpls" | "pcls-upfront";

const PRESETS: { key: Strategy; label: string; blurb: string }[] = [
  {
    key: "ufpls",
    label: "Phased (UFPLS)",
    blurb: "25% / 75% on every withdrawal — keeps the tax-free entitlement alive on growth.",
  },
  {
    key: "pcls-upfront",
    label: "PCLS upfront",
    blurb: "Crystallise the SIPP at retirement, take 25% tax-free on day one, the rest fully taxable.",
  },
];

function parseStrategy(taxPolicyJson: string | null): Strategy {
  if (!taxPolicyJson) return "ufpls";
  try {
    const parsed = JSON.parse(taxPolicyJson);
    return parsed.sippDrawdownStrategy === "pcls-upfront" ? "pcls-upfront" : "ufpls";
  } catch {
    return "ufpls";
  }
}

export function StrategyPresetToggle({ planId }: Props) {
  const query = useAssumptionSetByPlan(planId);
  const createAssumptionSet = useCreateAssumptionSet();
  const updateAssumptionSet = useUpdateAssumptionSet();

  const existing = query.data ?? null;
  const current = parseStrategy(existing?.taxPolicyJson ?? null);

  const apply = async (strategy: Strategy) => {
    const taxPolicy = existing?.taxPolicyJson ? JSON.parse(existing.taxPolicyJson) : {};
    taxPolicy.sippDrawdownStrategy = strategy;
    const taxPolicyJson = JSON.stringify(taxPolicy);
    if (existing) {
      await updateAssumptionSet.mutateAsync({
        id: existing.id,
        planId,
        data: { taxPolicyJson },
      });
    } else {
      await createAssumptionSet.mutateAsync({
        planId,
        name: "2025/26",
        inflationRate: 0.025,
        nominalGrowthRate: 0.05,
        taxPolicyJson,
      });
    }
  };

  const isPending = createAssumptionSet.isPending || updateAssumptionSet.isPending;

  return (
    <section className="rounded-lg border bg-card p-5 text-card-foreground">
      <h3 className="text-base font-semibold">SIPP drawdown strategy</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose how to take the 25% tax-free cash from your pensions.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {PRESETS.map((p) => {
          const isActive = current === p.key;
          return (
            <Button
              key={p.key}
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => apply(p.key)}
              disabled={isPending}
              className="h-auto justify-start py-3 text-left whitespace-normal"
            >
              <div className="flex flex-col items-start gap-0.5">
                <span className="text-sm font-medium">{p.label}</span>
                <span
                  className={
                    isActive
                      ? "text-[11px] text-primary-foreground/90"
                      : "text-[11px] text-muted-foreground"
                  }
                >
                  {p.blurb}
                </span>
              </div>
            </Button>
          );
        })}
      </div>
    </section>
  );
}
