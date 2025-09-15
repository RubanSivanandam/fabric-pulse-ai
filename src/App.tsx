// src/App.tsx - FIXED: No nested BrowserRouter, all routes intact
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
// import { ReportsPage } from "@/pages/ReportsPage";
// import { SettingsPage } from "@/pages/SettingsPage";

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
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="dark" storageKey="fabric-pulse-theme">
          <AIContextProvider>
            <FilterContextProvider>
              <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
                <Navigation />
                <main className="pt-16">
                  <Routes>
                    <Route path="/" element={<MainDashboard />} />
                    <Route path="/dashboard" element={<MainDashboard />} />
                    <Route path="/hierarchy" element={<HierarchyPage />} />
                    <Route path="/documentation" element={<DocumentationPage />} />
                    <Route path="/ai-analytics" element={<AIInsightsPanel />} />
                    <Route path="/alerts" element={<AlertsPanel data={[]} />} />
                    {/* <Route path="/reports" element={<ReportsPage />} /> */}
                    {/* <Route path="/settings" element={<SettingsPage />} /> */}
                  </Routes>
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
            </FilterContextProvider>
          </AIContextProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
