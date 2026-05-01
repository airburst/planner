import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDeleteScenario, useScenariosByPlan } from "@/hooks/use-scenarios";
import { ChevronDown, Trash2 } from "lucide-react";
import { useState } from "react";

interface ScenarioSelectorProps {
  planId: number;
  selectedScenarioId: number | null;
  onScenarioSelect: (scenarioId: number | null) => void;
  onCreateClick: () => void;
}

export function ScenarioSelector({
  planId,
  selectedScenarioId,
  onScenarioSelect,
  onCreateClick,
}: ScenarioSelectorProps) {
  const scenariosQuery = useScenariosByPlan(planId);
  const deleteScenario = useDeleteScenario();
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const scenarios = scenariosQuery.data ?? [];
  const selectedScenario = scenarios.find((s) => s.id === selectedScenarioId);

  const handleDelete = async (scenarioId: number) => {
    if (deleteConfirm === scenarioId) {
      await deleteScenario.mutateAsync({
        id: scenarioId,
        planId,
      });
      if (selectedScenarioId === scenarioId) {
        onScenarioSelect(null);
      }
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(scenarioId);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <p className="text-xs font-semibold text-muted-foreground">Scenario</p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span className="truncate">
                {selectedScenario?.name || "Base plan"}
              </span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Scenarios</DropdownMenuLabel>
            <DropdownMenuSeparator />

            {/* Base plan option */}
            <DropdownMenuItem
              onClick={() => onScenarioSelect(null)}
              className={selectedScenarioId === null ? "bg-muted" : ""}
            >
              Base plan
            </DropdownMenuItem>

            {/* Scenario options */}
            {scenarios.length > 0 && (
              <>
                <DropdownMenuSeparator />
                {scenarios.map((scenario) => (
                  <div
                    key={scenario.id}
                    className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-muted rounded"
                  >
                    <button
                      onClick={() => onScenarioSelect(scenario.id)}
                      className={`flex-1 text-left hover:text-foreground ${selectedScenarioId === scenario.id
                          ? "font-semibold text-foreground"
                          : "text-muted-foreground"
                        }`}
                    >
                      {scenario.name}
                      {scenario.notes && (
                        <p className="text-xs text-muted-foreground truncate">
                          {scenario.notes}
                        </p>
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(scenario.id)}
                      className="p-1 hover:bg-destructive/10 rounded"
                      title={
                        deleteConfirm === scenario.id
                          ? "Click again to confirm delete"
                          : "Delete scenario"
                      }
                    >
                      <Trash2
                        className={`h-3.5 w-3.5 ${deleteConfirm === scenario.id
                            ? "text-destructive"
                            : "text-muted-foreground"
                          }`}
                      />
                    </button>
                  </div>
                ))}
              </>
            )}

            {scenarios.length === 0 && (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                No scenarios yet
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={onCreateClick}
        className="mt-4"
      >
        + New
      </Button>
    </div>
  );
}
