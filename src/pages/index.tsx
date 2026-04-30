import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useDeletePlan, usePlans, useUpdatePlan } from "@/hooks/use-plans";
import { useNavigate } from "@tanstack/react-router";
import { Ellipsis, FolderOpen, Pencil, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function HomePage() {
  const navigate = useNavigate();
  const plansQuery = usePlans();
  const updatePlan = useUpdatePlan();
  const deletePlan = useDeletePlan();
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [draftPlanName, setDraftPlanName] = useState("");
  const renameInputRef = useRef<HTMLInputElement | null>(null);

  const plans = plansQuery.data ?? [];

  const startRename = (id: number, currentName: string) => {
    setEditingPlanId(id);
    setDraftPlanName(currentName);
  };

  const cancelRename = () => {
    setEditingPlanId(null);
    setDraftPlanName("");
  };

  const saveRename = async (id: number, currentName: string) => {
    const nextName = draftPlanName.trim();
    if (!nextName || nextName === currentName) {
      cancelRename();
      return;
    }

    await updatePlan.mutateAsync({
      id,
      data: { name: nextName }
    });

    cancelRename();
  };

  const removePlan = async (id: number, name: string) => {
    const confirmed = window.confirm(
      `Delete "${name}"? This will remove related people, accounts, income streams, scenarios, and projections.`
    );
    if (!confirmed) {
      return;
    }

    await deletePlan.mutateAsync(id);
  };

  const openPlan = (planId: number) => {
    navigate({ to: "/plan/$planId", params: { planId: String(planId) } });
  };

  const isInteractiveTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    return Boolean(
      target.closest(
        "input, textarea, button, a, [role='menu'], [role='menuitem'], [data-no-card-nav='true']"
      )
    );
  };

  useEffect(() => {
    if (editingPlanId === null) {
      return;
    }

    requestAnimationFrame(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    });
  }, [editingPlanId]);

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-3xl font-semibold tracking-tight">Planner</h1>
      <p className="text-muted-foreground">
        Long-term retirement and financial planning
      </p>

      {/* Create new plan section */}
      <section className="rounded-lg border bg-primary/5 p-6 text-card-foreground">
        <h2 className="mb-3 text-lg font-semibold">Get Started</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Create a new plan and walk through our guided setup process.
        </p>
        <Button onClick={() => navigate({ to: "/onboarding" })}>
          Create New Plan
        </Button>
      </section>

      {/* Existing plans section */}
      <section className="rounded-lg border bg-card p-4 text-card-foreground">
        <h2 className="mb-3 text-lg font-semibold">Your Plans</h2>

        {plans.length === 0 ? (
          <p className="text-sm text-muted-foreground">No plans yet. Start with the guided setup above.</p>
        ) : (
          <ul className="space-y-2">
            {plans.map((plan) => (
              <li
                key={plan.id}
                className="flex items-center justify-between rounded-md border p-3 transition-colors hover:bg-muted/40 cursor-pointer"
                role="button"
                tabIndex={0}
                onClick={(event) => {
                  if (isInteractiveTarget(event.target)) {
                    return;
                  }

                  openPlan(plan.id);
                }}
                onKeyDown={(event) => {
                  if (isInteractiveTarget(event.target)) {
                    return;
                  }

                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openPlan(plan.id);
                  }
                }}
              >
                <div className="flex w-full items-center justify-between gap-3">
                  <div>
                    {editingPlanId === plan.id ? (
                      <div className="flex items-center gap-2" data-no-card-nav="true">
                        <input
                          ref={renameInputRef}
                          value={draftPlanName}
                          onChange={(event) => setDraftPlanName(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              void saveRename(plan.id, plan.name);
                            }

                            if (event.key === "Escape") {
                              event.preventDefault();
                              cancelRename();
                            }
                          }}
                          className="h-8 rounded-md border border-border bg-background px-2 text-sm"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          onClick={() => saveRename(plan.id, plan.name)}
                          disabled={updatePlan.isPending}
                        >
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelRename}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <p className="font-medium">{plan.name}</p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Actions for ${plan.name}`}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Ellipsis className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-44"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <DropdownMenuItem
                        onSelect={() => openPlan(plan.id)}
                      >
                        <FolderOpen className="h-4 w-4" />
                        Open
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => startRename(plan.id, plan.name)}
                        disabled={updatePlan.isPending}
                      >
                        <Pencil className="h-4 w-4" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => removePlan(plan.id, plan.name)}
                        disabled={deletePlan.isPending}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
