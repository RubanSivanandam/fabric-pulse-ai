import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { OperatorEfficiency } from '../../types';
import { TrendingUp, TrendingDown, Minus, Award, AlertTriangle } from 'lucide-react';

interface OperatorEfficiencyVisualizationProps {
  operators: OperatorEfficiency[];
  className?: string;
}

export const OperatorEfficiencyVisualization: React.FC<OperatorEfficiencyVisualizationProps> = ({
  operators,
  className = ""
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'bg-green-500 text-white';
      case 'good': return 'bg-yellow-500 text-black';
      case 'needs_improvement': return 'bg-orange-500 text-white';
      case 'critical': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent': return <Award className="h-4 w-4" />;
      case 'good': return <TrendingUp className="h-4 w-4" />;
      case 'needs_improvement': return <Minus className="h-4 w-4" />;
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      default: return <TrendingDown className="h-4 w-4" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'excellent': return 'Excellent';
      case 'good': return 'Good';
      case 'needs_improvement': return 'Needs Improvement';
      case 'critical': return 'Critical';
      default: return 'Unknown';
    }
  };

  const sortedOperators = operators.sort((a, b) => b.efficiency - a.efficiency);

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sortedOperators.map((operator, index) => (
          <Card 
            key={`${operator.empCode}-${operator.newOperSeq}`}
            className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg ${
              operator.isTopPerformer ? 'ring-2 ring-green-400' : ''
            }`}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold truncate">
                  {operator.empName}
                </CardTitle>
                {operator.isTopPerformer && (
                  <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                    <Award className="h-3 w-3" />
                    Top
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {operator.empCode} • {operator.lineName}
              </p>
            </CardHeader>
            
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Efficiency</span>
                  <span className="text-lg font-bold">
                    {operator.efficiency.toFixed(1)}%
                  </span>
                </div>
                <Progress 
                  value={Math.min(operator.efficiency, 100)} 
                  className="h-2"
                />
              </div>

              <div className="flex justify-between text-sm">
                <span>Production: {operator.production}</span>
                <span>Target: {operator.target}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  {operator.operation}
                </span>
                <Badge className={`${getStatusColor(operator.status)} flex items-center gap-1`}>
                  {getStatusIcon(operator.status)}
                  {getStatusLabel(operator.status)}
                </Badge>
              </div>

              {operator.relativeEfficiency < 85 && (
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                  Below target: {(85 - operator.efficiency).toFixed(1)}% gap
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};