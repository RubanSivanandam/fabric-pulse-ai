// src/pages/MainDashboard.tsx - COMPLETE AI-POWERED DASHBOARD
import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { useQuery } from '@tanstack/react-query';
import { 
  TrendingUp, 
  Users, 
  AlertTriangle, 
  Brain,
  RefreshCw,
  Zap,
  Target,
  BarChart3
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Components
import { HierarchicalFilter } from '@/components/HierarchicalFilter';
import { EfficiencyChart } from '../components/charts/EfficiencyChart';
import { ProductionChart } from '../components/charts/ProductionChart';
// import { OperatorPerformanceChart } from '@/components/charts/OperatorPerformanceChart';
import { AIInsightsPanel } from '../components/AIInsightsPanel';
import { AlertsPanel } from '../components/AlertsPanel';
// import { LoadingSpinner } from '../components/ui/loading-spinner';

// Contexts
import { useAI } from '@/contexts/AIContext';
import { useFilters } from '@/contexts/FilterContext';

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
  const { state: filterState } = useFilters(); // ✅ get unitCodes, floorNames, etc. from context

  // Production data query with filters
  const { data: productionData, isLoading, isError, refetch } = useQuery({
    queryKey: ['production-data', currentFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (currentFilters.unitCode) params.append('unit_code', currentFilters.unitCode);
      if (currentFilters.floorName) params.append('floor_name', currentFilters.floorName);
      if (currentFilters.lineName) params.append('line_name', currentFilters.lineName);
      if (currentFilters.operation) params.append('operation', currentFilters.operation);
      
      const response = await fetch(`/api/rtms/efficiency?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch production data');
      }
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // GSAP Animations
  useEffect(() => {
    const tl = gsap.timeline();
    
    tl.from('.dashboard-header', {
      y: -100,
      opacity: 0,
      duration: 0.8,
      ease: "back.out(1.7)",
    })
    .from('.dashboard-card', {
      y: 50,
      opacity: 0,
      duration: 0.6,
      stagger: 0.1,
      ease: "power2.out",
    }, "-=0.4")
    .from('.chart-container', {
      scale: 0.9,
      opacity: 0,
      duration: 0.8,
      stagger: 0.2,
      ease: "back.out(1.7)",
    }, "-=0.3");

    gsap.to('.ai-pulse', {
      scale: 1.1,
      opacity: 0.7,
      duration: 2,
      yoyo: true,
      repeat: -1,
      ease: "power2.inOut",
    });

  }, []);

  // AI Analysis when data changes
  useEffect(() => {
    if (productionData?.data) {
      analyzeProduction(productionData.data);
    }
  }, [productionData, analyzeProduction]);

  // Handle filter changes
  const handleFilterChange = (filters: FilterState) => {
    setCurrentFilters(filters);
  };

  // Calculate metrics
  const getMetrics = () => {
    if (!productionData?.data) {
      return {
        totalOperators: 0,
        averageEfficiency: 0,
        totalProduction: 0,
        alertCount: 0,
        topPerformers: 0,
        underperformers: 0,
      };
    }

    const data = productionData.data;
    const operators = data.operators || [];
    
    return {
      totalOperators: operators.length,
      averageEfficiency: data.overall_efficiency || 0,
      totalProduction: data.total_production || 0,
      alertCount: data.underperformers?.length || 0,
      topPerformers: operators.filter((op: any) => op.efficiency >= 100).length,
      underperformers: data.underperformers?.length || 0,
    };
  };

  const metrics = getMetrics();

  return (
    <div ref={dashboardRef} className="min-h-screen p-6 space-y-6">
      
      {/* Dashboard Header */}
      <div className="dashboard-header flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Production Intelligence Dashboard
          </h1>
          <p className="text-gray-400 text-lg mt-2">Real-time AI-powered manufacturing insights</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* AI Status */}
          <div className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-full border border-green-400/30">
            <Brain className={`h-5 w-5 ai-pulse ${aiState.aiStatus === 'active' ? 'text-green-400' : 'text-gray-400'}`} />
            <span className="text-green-300 font-medium">
              AI {aiState.aiStatus === 'active' ? 'Analyzing' : 'Ready'}
            </span>
          </div>
          
          {/* Refresh Button */}
          <Button 
            onClick={() => refetch()} 
            variant="outline" 
            size="sm"
            className="border-blue-400/30 text-blue-300 hover:bg-blue-500/20"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Hierarchical Filters */}
      <div className="dashboard-card">
        <HierarchicalFilter
          unitCodes={filterState.unitCodes}
          floorNames={filterState.floorNames}
          lineNames={filterState.lineNames}
          operations={filterState.operations}
          loading={filterState.loading}
          onChange={handleFilterChange}
        />
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="dashboard-card bg-gradient-to-br from-blue-900/50 to-blue-800/50 border-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-200">Total Operators</CardTitle>
            <Users className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{metrics.totalOperators}</div>
            <p className="text-xs text-blue-300 mt-1">
              {metrics.topPerformers} high performers
            </p>
          </CardContent>
        </Card>

        <Card className="dashboard-card bg-gradient-to-br from-green-900/50 to-green-800/50 border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-200">Average Efficiency</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{metrics.averageEfficiency.toFixed(1)}%</div>
            <Progress value={metrics.averageEfficiency} className="mt-2" />
          </CardContent>
        </Card>

        <Card className="dashboard-card bg-gradient-to-br from-purple-900/50 to-purple-800/50 border-purple-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-200">Total Production</CardTitle>
            <Target className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{metrics.totalProduction.toLocaleString()}</div>
            <p className="text-xs text-purple-300 mt-1">
              pieces produced today
            </p>
          </CardContent>
        </Card>

        <Card className="dashboard-card bg-gradient-to-br from-red-900/50 to-red-800/50 border-red-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-200">Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{metrics.alertCount}</div>
            <p className="text-xs text-red-300 mt-1">
              {metrics.underperformers} need attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="analytics" className="dashboard-card">
        <TabsList className="grid w-full grid-cols-3 bg-gray-800/50">
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="ai-insights" className="flex items-center space-x-2">
            <Brain className="h-4 w-4" />
            <span>AI Insights</span>
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4" />
            <span>Alerts</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-6 mt-6">
          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="chart-container bg-gradient-to-br from-gray-900/50 to-gray-800/50 border-gray-700/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-blue-400" />
                  <span>Efficiency Trends</span>
                </CardTitle>
                <CardDescription>Real-time efficiency monitoring</CardDescription>
              </CardHeader>
              <CardContent>
                <EfficiencyChart data={productionData?.data} />
              </CardContent>
            </Card>

            <Card className="chart-container bg-gradient-to-br from-gray-900/50 to-gray-800/50 border-gray-700/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Target className="h-5 w-5 text-green-400" />
                  <span>Production Overview</span>
                </CardTitle>
                <CardDescription>Production vs targets</CardDescription>
              </CardHeader>
              <CardContent>
                <ProductionChart data={productionData?.data} />
              </CardContent>
            </Card>
          </div>

          {/* Operator Performance Chart */}
          <Card className="chart-container bg-gradient-to-br from-gray-900/50 to-gray-800/50 border-gray-700/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <Users className="h-5 w-5 text-purple-400" />
                <span>Operator Performance</span>
              </CardTitle>
              <CardDescription>Individual operator efficiency analysis</CardDescription>
            </CardHeader>
            {/* <CardContent>
              <OperatorPerformanceChart data={productionData?.data} />
            </CardContent> */}
          </Card>
        </TabsContent>

        <TabsContent value="ai-insights" className="mt-6">
          <AIInsightsPanel />
        </TabsContent>

        <TabsContent value="alerts" className="mt-6">
          <AlertsPanel data={productionData?.data} />
        </TabsContent>
      </Tabs>

      {/* AI Status Footer */}
      {aiState.lastAnalysis && (
        <div className="dashboard-card">
          <Card className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-blue-500/20">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center space-x-3">
                <Zap className="h-5 w-5 text-yellow-400" />
                <span className="text-gray-300">
                  Last AI Analysis: {new Date(aiState.lastAnalysis).toLocaleTimeString()}
                </span>
              </div>
              <Badge 
                variant={aiState.aiStatus === 'active' ? 'default' : 'secondary'} 
                className="animate-pulse"
              >
                {aiState.isAnalyzing ? 'Processing...' : 'Ready'}
              </Badge>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
