import React, { Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme-provider";

// Context Providers
import { AIContextProvider } from "./contexts/AIContext";
import { FilterContextProvider } from "./contexts/FilterContext";

// Components
import { Navigation } from "@/components/Navigation";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LoadingSpinner } from "../src/components/ui/LoadingSpinner";

// Lazy load pages for better performance
const MainDashboard = React.lazy(() => import("./dashboard/MainDashboard").then(m => ({ default: m.MainDashboard })));
const HierarchyPage = React.lazy(() => import("./pages/HierarchyPage").then(m => ({ default: m.HierarchyPage })));
const DocumentationPage = React.lazy(() => import("./pages/DocumentationPage").then(m => ({ default: m.DocumentationPage })));
const AIInsightsPanel = React.lazy(() => import("./components/AIInsightsPanel").then(m => ({ default: m.AIInsightsPanel })));
const AlertsPanel = React.lazy(() => import("./components/AlertsPanel").then(m => ({ default: m.AlertsPanel })));

// Create query client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Loading fallback component
const PageLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <LoadingSpinner className="w-12 h-12" />
  </div>
);

// Context-aware route wrappers
const DashboardRoute = () => (
  <Suspense fallback={<PageLoadingFallback />}>
    <MainDashboard />
  </Suspense>
);

const AIAnalyticsRoute = () => (
  <Suspense fallback={<PageLoadingFallback />}>
    <AIInsightsPanel insights={[]} />
  </Suspense>
);

const AlertsRoute = () => (
  <Suspense fallback={<PageLoadingFallback />}>
    <AlertsPanel data={[]} />
  </Suspense>
);

const HierarchyRoute = () => (
  <Suspense fallback={<PageLoadingFallback />}>
    <HierarchyPage />
  </Suspense>
);

const DocumentationRoute = () => (
  <Suspense fallback={<PageLoadingFallback />}>
    <DocumentationPage />
  </Suspense>
);

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="dark" storageKey="fabric-pulse-theme">
          <FilterContextProvider>
            <AIContextProvider>
              <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
                <Navigation />
                <main className="pt-16">
                  <ErrorBoundary>
                    <Routes>
                      <Route path="/" element={<DashboardRoute />} />
                      <Route path="/dashboard" element={<DashboardRoute />} />
                      <Route path="/hierarchy" element={<HierarchyRoute />} />
                      <Route path="/documentation" element={<DocumentationRoute />} />
                      <Route path="/ai-analytics" element={<AIAnalyticsRoute />} />
                      <Route path="/alerts" element={<AlertsRoute />} />
                    </Routes>
                  </ErrorBoundary>
                </main>
                <Toaster
                  position="top-right"
                  toastOptions={{
                    duration: 4000,
                    style: {
                      background: "rgba(30, 41, 59, 0.95)",
                      border: "1px solid rgba(148, 163, 184, 0.2)",
                      color: "#f8fafc",
                    },
                  }}
                />
              </div>
            </AIContextProvider>
          </FilterContextProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;