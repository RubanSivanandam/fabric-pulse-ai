import React, { useEffect, useRef, useState, useCallback } from "react";
import { gsap } from "gsap";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  Users,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

// Components
import { HierarchicalFilter } from "@/components/HierarchicalFilter";
import { EfficiencyChart } from "../components/charts/EfficiencyChart";
import { ProductionChart } from "../components/charts/ProductionChart";
import { AIInsightsPanel } from "../components/AIInsightsPanel";
import { AlertsPanel } from "../components/AlertsPanel";

// Contexts
import { useAI } from "@/contexts/AIContext";
import { useFilters } from "@/contexts/FilterContext";

interface FilterState {
  unitCode: string | null;
  floorName: string | null;
  lineName: string | null;
  operation: string | null;
}

export function MainDashboard() {
  const dashboardRef = useRef<HTMLDivElement>(null);

  const [currentFilters, setCurrentFilters] = useState<FilterState>({
    unitCode: null,
    floorName: null,
    lineName: null,
    operation: null,
  });

  const { state: aiState, analyzeProduction } = useAI();
  const { state: filterState } = useFilters();

  const lastAnalyzedSignatureRef = useRef<string | null>(null);

  const buildQueryString = useCallback((filters: FilterState) => {
    const params = new URLSearchParams();
    if (filters.unitCode) params.append("unit_code", filters.unitCode);
    if (filters.floorName) params.append("floor_name", filters.floorName);
    if (filters.lineName) params.append("line_name", filters.lineName);
    if (filters.operation) params.append("operation", filters.operation);
    return params.toString();
  }, []);

  const {
    data: productionData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: [
      "production-data",
      currentFilters.unitCode,
      currentFilters.floorName,
      currentFilters.lineName,
      currentFilters.operation,
    ],
    queryFn: async () => {
      const qs = buildQueryString(currentFilters);
      const url = `/api/rtms/analyze${qs ? `?${qs}` : ""}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch production data");
      }
      return response.json();
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });

  // ✅ Normalize backend response
  const normalizedData: any[] = Array.isArray(productionData?.data)
    ? productionData?.data
    : productionData?.results || [];

  // Animations
  useEffect(() => {
    const tl = gsap.timeline();
    tl.from(".dashboard-header", {
      y: -100,
      opacity: 0,
      duration: 0.8,
      ease: "back.out(1.7)",
    })
      .from(
        ".dashboard-card",
        {
          y: 50,
          opacity: 0,
          duration: 0.6,
          stagger: 0.1,
          ease: "power2.out",
        },
        "-=0.4"
      )
      .from(
        ".chart-container",
        {
          scale: 0.9,
          opacity: 0,
          duration: 0.8,
          stagger: 0.2,
          ease: "back.out(1.7)",
        },
        "-=0.3"
      );
  }, []);

  // AI Analysis
  useEffect(() => {
    if (!normalizedData || normalizedData.length === 0) return;
    const signature =
      JSON.stringify(currentFilters) + "|" + normalizedData.length;
    if (lastAnalyzedSignatureRef.current !== signature) {
      analyzeProduction(normalizedData);
      lastAnalyzedSignatureRef.current = signature;
    }
  }, [normalizedData, currentFilters, analyzeProduction]);

  if (isError) {
    return <div className="text-red-500">Failed to load production data.</div>;
  }

  return (
    <div ref={dashboardRef} className="p-6 space-y-6">
      {/* Header */}
      <div className="dashboard-header flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">
          Fabric Pulse Dashboard
        </h1>
        <Button
          onClick={() => refetch()}
          variant="secondary"
          className="flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {/* Filters */}
      <HierarchicalFilter
        filters={currentFilters}
        setFilters={setCurrentFilters}
        availableOptions={filterState}
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle>Total Production</CardTitle>
            <CardDescription>Daily piece count</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-6 h-6 text-green-400" />
              <span className="text-2xl font-bold text-white">
                {normalizedData.reduce(
                  (sum: number, d: any) => sum + (d.ProdnPcs || 0),
                  0
                )}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle>Overall Efficiency</CardTitle>
            <CardDescription>AI-calculated efficiency</CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={aiState.efficiency} className="w-full" />
            <span className="text-white">
              {aiState.efficiency?.toFixed(1)}%
            </span>
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle>Underperformers</CardTitle>
            <CardDescription>Below 85% efficiency</CardDescription>
          </CardHeader>
          <CardContent>
            <Users className="w-6 h-6 text-yellow-400" />
            <span className="text-2xl font-bold text-white">
              {aiState.underperformers}
            </span>
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle>Alerts</CardTitle>
            <CardDescription>Active notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <span className="text-2xl font-bold text-white">
              {aiState.alerts}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 chart-container">
        <EfficiencyChart data={normalizedData} />
        <ProductionChart data={normalizedData} />
      </div>

      {/* AI Insights */}
      <AIInsightsPanel insights={aiState.insights} />

      {/* Alerts */}
      <AlertsPanel data={normalizedData} />
    </div>
  );
}
