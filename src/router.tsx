import { PlanLayout } from "@/components/layout/PlanLayout";
import { HomePage } from "@/pages";
import { OnboardingPage } from "@/pages/onboarding";
import { AssetsPage } from "@/pages/plan/[id]/AssetsPage";
import { ExpensesPage } from "@/pages/plan/[id]/ExpensesPage";
import { OverviewPage } from "@/pages/plan/[id]/OverviewPage";
import { SettingsPage } from "@/pages/plan/[id]/SettingsPage";
import { StrategyPage } from "@/pages/plan/[id]/StrategyPage";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";

function RootLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Outlet />
    </div>
  );
}

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

const onboardingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/onboarding",
  component: OnboardingPage,
});

const planRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/plan/$planId",
  component: PlanLayout,
});

// /plan/$planId on its own → redirect to overview tab.
const planIndexRoute = createRoute({
  getParentRoute: () => planRoute,
  path: "/",
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/plan/$planId/overview",
      params,
    });
  },
});

const overviewRoute = createRoute({
  getParentRoute: () => planRoute,
  path: "overview",
  component: OverviewPage,
});

const assetsRoute = createRoute({
  getParentRoute: () => planRoute,
  path: "assets",
  component: AssetsPage,
});

const expensesRoute = createRoute({
  getParentRoute: () => planRoute,
  path: "expenses",
  component: ExpensesPage,
});

const strategyRoute = createRoute({
  getParentRoute: () => planRoute,
  path: "strategy",
  component: StrategyPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => planRoute,
  path: "settings",
  component: SettingsPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  onboardingRoute,
  planRoute.addChildren([
    planIndexRoute,
    overviewRoute,
    assetsRoute,
    expensesRoute,
    strategyRoute,
    settingsRoute,
  ]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function AppRouterProvider() {
  return <RouterProvider router={router} />;
}
