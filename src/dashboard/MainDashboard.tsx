import React from 'react';
import { useRTMSData } from '../hooks/useRTMSData';
import { OperationFilter } from '../components/filters/OperationFilter';
import { OperatorEfficiencyVisualization } from '../components/efficiency/OperatorEfficiencyVisualization';
import { AIInsightsDashboard } from './AIInsightsDashboard';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { RefreshCw, Users, TrendingUp, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { OperatorEfficiency } from "@/types";


export const MainDashboard: React.FC = () => {
  const {
    operators = [],
    aiInsights,
    loading,
    error,
    filters,
    updateFilters,
    refetch,
  } = useRTMSData();

  const stats = React.useMemo(() => {
    const totalOperators = operators.length;
    const excellentOperators = operators.filter(op => op.status === 'excellent').length;
    const criticalOperators = operators.filter(op => op.status === 'critical').length;
    const avgEfficiency =
      operators.length > 0
        ? operators.reduce((sum, op) => sum + (op.efficiency ?? 0), 0) / operators.length
        : 0;

    return {
      totalOperators,
      excellentOperators,
      criticalOperators,
      avgEfficiency,
    };
  }, [operators]);

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-700">Error Loading Data</h3>
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={refetch} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">RTMS Dashboard</h1>
          <p className="text-gray-600">AI-Powered Real-Time Production Monitoring</p>
        </div>
        <Button
          onClick={refetch}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Operators</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOperators}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Excellent Performers</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.excellentOperators}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Need Attention</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.criticalOperators}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Efficiency</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.avgEfficiency.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      {aiInsights && <AIInsightsDashboard insights={aiInsights} />}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <OperationFilter
              selectedOperation={filters.operation}
              onOperationChange={(operation) => updateFilters({ operation })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Operator Efficiency Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Operator Efficiency Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
              <span className="ml-2">Loading efficiency data...</span>
            </div>
          ) : (
            <OperatorEfficiencyVisualization
              operators={operators.map(op => ({
                empName: op.emp_name,
                empCode: op.emp_code,
                lineName: op.line_name,
                unitCode: op.unit_code,
                floorName: op.floor_name,
                operation: op.new_oper_seq,
                efficiency: op.efficiency,
                production: op.production,
                target: op.target,
                status: op.status ?? "unknown",
                isTopPerformer: op.is_top_performer ?? false,
              })) as OperatorEfficiency[]}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};
