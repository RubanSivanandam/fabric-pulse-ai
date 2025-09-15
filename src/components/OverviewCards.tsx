import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { ProductionAnalysis } from '@/types/rtms';
import { rtmsService } from '@/services/RTMSService';

interface OverviewCardsProps {
  data: ProductionAnalysis;
}

export const OverviewCards: React.FC<OverviewCardsProps> = ({ data }) => {
  const getEfficiencyIcon = (efficiency: number) => {
    if (efficiency >= 100) return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (efficiency >= 85) return <TrendingUp className="h-5 w-5 text-blue-600" />;
    if (efficiency >= 70) return <Clock className="h-5 w-5 text-orange-600" />;
    return <AlertTriangle className="h-5 w-5 text-red-600" />;
  };

  const getEfficiencyStatus = (efficiency: number) => {
    if (efficiency >= 100) return { status: 'Excellent', color: 'bg-green-100 text-green-800' };
    if (efficiency >= 85) return { status: 'Good', color: 'bg-blue-100 text-blue-800' };
    if (efficiency >= 70) return { status: 'Needs Attention', color: 'bg-orange-100 text-orange-800' };
    return { status: 'Critical', color: 'bg-red-100 text-red-800' };
  };

  const efficiencyStatus = getEfficiencyStatus(data.overallEfficiency);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Overall Efficiency</CardTitle>
          {getEfficiencyIcon(data.overallEfficiency)}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            {data.overallEfficiency.toFixed(1)}%
          </div>
          <Badge className={`mt-2 ${efficiencyStatus.color}`}>
            {efficiencyStatus.status}
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Production</CardTitle>
          <TrendingUp className="h-5 w-5 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {data.totalProduction.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            Target: {data.totalTarget.toLocaleString()}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Operators</CardTitle>
          <CheckCircle className="h-5 w-5 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            {data.operators.length}
          </div>
          <p className="text-xs text-muted-foreground">
            {data.recordsAnalyzed} records analyzed
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Alerts</CardTitle>
          <AlertTriangle className="h-5 w-5 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {data.underperformers.length}
          </div>
          <p className="text-xs text-muted-foreground">
            Underperforming operators
          </p>
        </CardContent>
      </Card>
    </div>
  );
};