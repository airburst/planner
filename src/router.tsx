import { HomePage } from "@/pages";
import { OnboardingPage } from "@/pages/onboarding";
import { PlanDetailPage } from "@/pages/plan/[id]";
import {
  Link,
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter
} from "@tanstack/react-router";

function RootLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card/50">
        <div className="mx-auto flex items-center gap-4 px-6 py-3">
          <p className="font-semibold">Planner</p>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            Plans
          </Link>
        </div>
      </header>
      <Outlet />
    </div>
  );
}

const rootRoute = createRootRoute({
  component: RootLayout
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage
});

const planRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/plan/$planId",
  component: PlanDetailPage
});

const onboardingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/onboarding",
  component: OnboardingPage
});

const routeTree = rootRoute.addChildren([indexRoute, onboardingRoute, planRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function AppRouterProvider() {
  return <RouterProvider router={router} />;
}
