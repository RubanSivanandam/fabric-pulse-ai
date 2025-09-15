// src/App.tsx - FIXED: Better context wrapping and error handling
import React from "react";
import { Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme-provider";

// Pages
import { MainDashboard } from "./dashboard/MainDashboard";
import { HierarchyPage } from "./pages/HierarchyPage";
import { DocumentationPage } from "./pages/DocumentationPage";
import { AIInsightsPanel } from "./components/AIInsightsPanel";
import { AlertsPanel } from "./components/AlertsPanel";

// Components
import { Navigation } from "@/components/Navigation";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AIContextProvider } from "./contexts/AIContext";
import { FilterContextProvider } from "./contexts/FilterContext";

// Create query client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false, // Prevent excessive refetching
    },
  },
});

// Context-aware wrapper for routes that need FilterContext
const DashboardWithContext = () => (
  <ErrorBoundary>
    <MainDashboard />
  </ErrorBoundary>
);

const AIAnalyticsWithContext = () => (
  <ErrorBoundary>
    <AIInsightsPanel insights={[]} />
  </ErrorBoundary>
);

const AlertsWithContext = () => (
  <ErrorBoundary>
    <AlertsPanel data={[]} />
  </ErrorBoundary>
);

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="dark" storageKey="fabric-pulse-theme">
          <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
            <Navigation />
            <main className="pt-16">
              {/* Wrap ALL routes that need FilterContext */}
              <FilterContextProvider>
                <AIContextProvider>
                  <Routes>
                    <Route path="/" element={<DashboardWithContext />} />
                    <Route path="/dashboard" element={<DashboardWithContext />} />
                    <Route path="/hierarchy" element={<HierarchyPage />} />
                    <Route path="/documentation" element={<DocumentationPage />} />
                    <Route path="/ai-analytics" element={<AIAnalyticsWithContext />} />
                    <Route path="/alerts" element={<AlertsWithContext />} />
                  </Routes>
                </AIContextProvider>
              </FilterContextProvider>
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
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;