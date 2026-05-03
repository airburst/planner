import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/contexts/ThemeContext";
import { usePlans } from "@/hooks/use-plans";
import { useScenariosByPlan } from "@/hooks/use-scenarios";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ChevronDown, Moon, Plus, Sun } from "lucide-react";

interface AppHeaderProps {
  planId: number | null;
  selectedScenarioId: number | null;
  onScenarioSelect: (id: number | null) => void;
  onScenarioCreate: () => void;
}

type PlanTabPath =
  | "/plan/$planId/overview"
  | "/plan/$planId/assets"
  | "/plan/$planId/expenses"
  | "/plan/$planId/strategy"
  | "/plan/$planId/settings";

interface PrimaryNavItem {
  label: string;
  to: PlanTabPath;
  segment: string;
}

const PRIMARY_NAV: PrimaryNavItem[] = [
  { label: "Overview", to: "/plan/$planId/overview", segment: "/overview" },
  { label: "Assets", to: "/plan/$planId/assets", segment: "/assets" },
  { label: "Expenses", to: "/plan/$planId/expenses", segment: "/expenses" },
  { label: "Strategy", to: "/plan/$planId/strategy", segment: "/strategy" },
  { label: "Settings", to: "/plan/$planId/settings", segment: "/settings" },
];

export function AppHeader({
  planId,
  selectedScenarioId,
  onScenarioSelect,
  onScenarioCreate,
}: AppHeaderProps) {
  const navigate = useNavigate();
  const plansQuery = usePlans();
  const scenariosQuery = useScenariosByPlan(planId ?? 0);
  const routerState = useRouterState();
  const { theme, toggle: toggleTheme } = useTheme();

  const plans = plansQuery.data ?? [];
  const scenarios = scenariosQuery.data ?? [];
  const activePlan = planId ? plans.find((p) => p.id === planId) ?? null : null;
  const activeScenario = scenarios.find((s) => s.id === selectedScenarioId) ?? null;

  // Identify which top-tab is active. Match the path *after* /plan/:id.
  const currentPath = routerState.location.pathname;
  const activeSegment =
    PRIMARY_NAV.find((item) => currentPath.endsWith(item.segment))?.segment ?? "/overview";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between gap-4 px-6">
        {/* Brand + nav */}
        <div className="flex items-center gap-8">
          <Link
            to="/"
            className="text-base font-semibold tracking-tight text-foreground"
          >
            Planner
          </Link>
          {planId && (
            <nav className="hidden md:flex items-center gap-6">
              {PRIMARY_NAV.map((item) => {
                const isActive = activeSegment === item.segment;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    params={{ planId: String(planId) }}
                    className={
                      isActive
                        ? "text-sm font-medium text-primary border-b-2 border-primary -mb-[15px] pb-3"
                        : "text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    }
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        {/* Right side: scenario switcher, plan switcher, notifications, profile */}
        <div className="flex items-center gap-2">
          {planId && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <span className="text-xs text-muted-foreground">Scenario:</span>
                  <span className="font-medium">{activeScenario?.name ?? "Base"}</span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Scenarios</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => onScenarioSelect(null)}
                  className={selectedScenarioId === null ? "bg-muted" : ""}
                >
                  Base plan
                </DropdownMenuItem>
                {scenarios.map((s) => (
                  <DropdownMenuItem
                    key={s.id}
                    onSelect={() => onScenarioSelect(s.id)}
                    className={selectedScenarioId === s.id ? "bg-muted" : ""}
                  >
                    {s.name}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={onScenarioCreate}>
                  <Plus className="h-4 w-4" /> New scenario
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {plans.length > 1 && activePlan && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <span className="font-medium">{activePlan.name}</span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Plans</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {plans.map((p) => (
                  <DropdownMenuItem
                    key={p.id}
                    onSelect={() =>
                      navigate({
                        to: "/plan/$planId/overview",
                        params: { planId: String(p.id) },
                      })
                    }
                    className={p.id === planId ? "bg-muted" : ""}
                  >
                    {p.name}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => navigate({ to: "/onboarding" })}
                >
                  <Plus className="h-4 w-4" /> New plan
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            onClick={toggleTheme}
            className="text-muted-foreground"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </header>
  );
}
