import { Button } from "@/components/ui/button";
import { useCreateScenario, useSetScenarioOverrides } from "@/hooks/use-scenarios";
import { useState } from "react";

interface ScenarioModalProps {
  planId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (scenarioId: number) => void;
}

export function ScenarioModal({
  planId,
  open,
  onOpenChange,
  onSuccess,
}: ScenarioModalProps) {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [retirementAge, setRetirementAge] = useState("");
  const [spendingTarget, setSpendingTarget] = useState("");
  const [growthRate, setGrowthRate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createScenario = useCreateScenario();
  const setOverrides = useSetScenarioOverrides();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const newScenario = await createScenario.mutateAsync({
        planId,
        name: name || `Scenario ${new Date().toLocaleDateString()}`,
        notes: notes || null,
        baseScenarioId: null,
        assumptionSetId: null,
        expenseProfileId: null,
      });

      if (newScenario?.id) {
        // Create overrides if any were specified
        const overrides: NewScenarioOverride[] = [];

        if (retirementAge) {
          overrides.push({
            scenarioId: newScenario.id,
            fieldPath: "people.0.retirementAge",
            valueJson: JSON.stringify(parseInt(retirementAge)),
          });
        }

        if (spendingTarget) {
          overrides.push({
            scenarioId: newScenario.id,
            fieldPath: "spending.annualSpendingTarget",
            valueJson: JSON.stringify(parseFloat(spendingTarget)),
          });
        }

        if (growthRate) {
          overrides.push({
            scenarioId: newScenario.id,
            fieldPath: "assumptions.investmentReturn",
            valueJson: JSON.stringify(parseFloat(growthRate)),
          });
        }

        // Set overrides if any exist
        if (overrides.length > 0) {
          await setOverrides.mutateAsync({
            scenarioId: newScenario.id,
            planId,
            overrides,
          });
        }

        onSuccess?.(newScenario.id);
        setName("");
        setNotes("");
        setRetirementAge("");
        setSpendingTarget("");
        setGrowthRate("");
        onOpenChange(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-card border border-border rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-lg font-semibold text-card-foreground mb-4">
          Create a scenario
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-card-foreground">
              Scenario name
            </label>
            <input
              type="text"
              placeholder="e.g. Retire at 63"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-card-foreground">
              Notes (optional)
            </label>
            <textarea
              placeholder="What's different in this scenario?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="rounded-lg bg-muted/50 p-3 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground">
              Optional overrides
            </p>

            <div className="space-y-1">
              <label className="text-xs font-medium text-card-foreground">
                Retirement age (primary person)
              </label>
              <input
                type="number"
                placeholder="Leave blank for no change"
                value={retirementAge}
                onChange={(e) => setRetirementAge(e.target.value)}
                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-card-foreground">
                Annual spending (£)
              </label>
              <input
                type="number"
                placeholder="Leave blank for no change"
                value={spendingTarget}
                onChange={(e) => setSpendingTarget(e.target.value)}
                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-card-foreground">
                Investment return (e.g. 0.03 = 3% real return)
              </label>
              <input
                type="number"
                placeholder="Leave blank for no change"
                step="0.01"
                value={growthRate}
                onChange={(e) => setGrowthRate(e.target.value)}
                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating…" : "Create scenario"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
