import { lazy, Suspense, type ComponentType } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { PageLoader } from "../components/PageLoader";
import { useFinanceStore } from "../lib/storage";

function lazyNamed<T extends Record<string, ComponentType<unknown>>>(
  loader: () => Promise<T>,
  name: keyof T,
) {
  return lazy(() =>
    loader().then((module) => ({ default: module[name] as ComponentType })),
  );
}

const OnboardingPage = lazyNamed(
  () => import("../features/onboarding/OnboardingPage"),
  "OnboardingPage",
);
const DashboardPage = lazyNamed(
  () => import("../features/dashboard/DashboardPage"),
  "DashboardPage",
);
const ImportPage = lazyNamed(
  () => import("../features/import/ImportPage"),
  "ImportPage",
);
const TransactionsPage = lazyNamed(
  () => import("../features/transactions/TransactionsPage"),
  "TransactionsPage",
);
const AssetsPage = lazyNamed(
  () => import("../features/assets/AssetsPage"),
  "AssetsPage",
);
const LiabilitiesPage = lazyNamed(
  () => import("../features/liabilities/LiabilitiesPage"),
  "LiabilitiesPage",
);
const GoalsPage = lazyNamed(
  () => import("../features/goals/GoalsPage"),
  "GoalsPage",
);
const NetWorthPage = lazyNamed(
  () => import("../features/net-worth/NetWorthPage"),
  "NetWorthPage",
);
const SettingsPage = lazyNamed(
  () => import("../features/settings/SettingsPage"),
  "SettingsPage",
);

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const onboardingComplete = useFinanceStore((s) => s.settings.onboardingComplete);
  if (!onboardingComplete) {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}

function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/onboarding"
        element={
          <LazyPage>
            <OnboardingPage />
          </LazyPage>
        }
      />
      <Route
        path="/*"
        element={
          <OnboardingGuard>
            <Layout>
              <Routes>
                <Route
                  index
                  element={
                    <LazyPage>
                      <DashboardPage />
                    </LazyPage>
                  }
                />
                <Route
                  path="import"
                  element={
                    <LazyPage>
                      <ImportPage />
                    </LazyPage>
                  }
                />
                <Route
                  path="transactions"
                  element={
                    <LazyPage>
                      <TransactionsPage />
                    </LazyPage>
                  }
                />
                <Route
                  path="assets"
                  element={
                    <LazyPage>
                      <AssetsPage />
                    </LazyPage>
                  }
                />
                <Route
                  path="liabilities"
                  element={
                    <LazyPage>
                      <LiabilitiesPage />
                    </LazyPage>
                  }
                />
                <Route
                  path="goals"
                  element={
                    <LazyPage>
                      <GoalsPage />
                    </LazyPage>
                  }
                />
                <Route
                  path="net-worth"
                  element={
                    <LazyPage>
                      <NetWorthPage />
                    </LazyPage>
                  }
                />
                <Route
                  path="settings"
                  element={
                    <LazyPage>
                      <SettingsPage />
                    </LazyPage>
                  }
                />
              </Routes>
            </Layout>
          </OnboardingGuard>
        }
      />
    </Routes>
  );
}
