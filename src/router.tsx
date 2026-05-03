import { PlanLayout } from "@/components/layout/PlanLayout";
import { HomePage } from "@/pages";
import {
  Outlet,
  RouterProvider,
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import { Suspense, lazy } from "react";

// Lazy-loaded route components keep the initial bundle small. Each route is
// its own chunk; a Suspense boundary in RootLayout shows a thin loader while
// the chunk arrives.
const OnboardingPage = lazy(() =>
  import("@/pages/onboarding").then((m) => ({ default: m.OnboardingPage }))
);
const OverviewPage = lazy(() =>
  import("@/pages/plan/[id]/overview/page").then((m) => ({ default: m.OverviewPage }))
);
const AssetsPage = lazy(() =>
  import("@/pages/plan/[id]/assets/page").then((m) => ({ default: m.AssetsPage }))
);
const ExpensesPage = lazy(() =>
  import("@/pages/plan/[id]/expenses/page").then((m) => ({ default: m.ExpensesPage }))
);
const StrategyPage = lazy(() =>
  import("@/pages/plan/[id]/strategy/page").then((m) => ({ default: m.StrategyPage }))
);
const SettingsPage = lazy(() =>
  import("@/pages/plan/[id]/settings/page").then((m) => ({ default: m.SettingsPage }))
);

function RouteFallback() {
  return (
    <div className="mx-auto max-w-screen-2xl p-6">
      <p className="animate-pulse text-sm text-muted-foreground">Loading…</p>
    </div>
  );
}

function RootLayout() {
  // Suspense fallback only fires for the very first chunk. Subsequent route
  // changes are wrapped in startTransition + the View Transitions API (see
  // router options below) so they cross-fade in place instead of unmounting
  // to a loading state.
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Suspense fallback={<RouteFallback />}>
        <Outlet />
      </Suspense>
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

// Hash history is required for Electron's file:// URLs. Browser history reads
// window.location.pathname, which in production is the full filesystem path
// (e.g. /Applications/Planner.app/.../index.html) — no route matches it.
// Hash history uses the fragment (#/path) so routing works correctly.
export const router = createRouter({
  routeTree,
  history: createHashHistory(),
  defaultViewTransition: true,
  defaultPreload: "intent",
  defaultPreloadDelay: 50,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function AppRouterProvider() {
  return <RouterProvider router={router} />;
}
