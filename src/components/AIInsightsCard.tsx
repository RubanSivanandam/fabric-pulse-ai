import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AIInsights } from '@/types/rtms';
import { Lightbulb, TrendingUp, AlertCircle, Brain } from 'lucide-react';

interface AIInsightsCardProps {
  insights: AIInsights;
}

export const AIInsightsCard: React.FC<AIInsightsCardProps> = ({ insights }) => {
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'decreasing':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <TrendingUp className="h-4 w-4 text-blue-600" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return 'text-green-600';
      case 'decreasing':
        return 'text-red-600';
      default:
        return 'text-blue-600';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            AI Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {insights.summary}
          </p>
          
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {getTrendIcon(insights.predictions.trend)}
              <span className={`text-sm font-medium ${getTrendColor(insights.predictions.trend)}`}>
                Trend: {insights.predictions.trend}
              </span>
              <Badge variant="outline">
                {(insights.predictions.confidence * 100).toFixed(0)}% confidence
              </Badge>
            </div>
            
            <p className="text-xs text-muted-foreground">
              {insights.predictions.forecast}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-600" />
            Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {insights.recommendations.length > 0 ? (
            <ul className="space-y-2">
              {insights.recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>{recommendation}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No specific recommendations at this time. Overall performance is on track.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Performance Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-sm mb-2">Best Performing</h4>
              <div className="space-y-1">
                {insights.performance_analysis.best_performing_line && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Line:</span>{' '}
                    <span className="font-medium text-green-600">
                      {insights.performance_analysis.best_performing_line[0]} 
                      ({insights.performance_analysis.best_performing_line[1].toFixed(1)}%)
                    </span>
                  </div>
                )}
                {insights.performance_analysis.best_performing_operation && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Operation:</span>{' '}
                    <span className="font-medium text-green-600">
                      {insights.performance_analysis.best_performing_operation[0]}
                      ({insights.performance_analysis.best_performing_operation[1].toFixed(1)}%)
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-sm mb-2">Needs Attention</h4>
              <div className="space-y-1">
                {insights.performance_analysis.worst_performing_line && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Line:</span>{' '}
                    <span className="font-medium text-red-600">
                      {insights.performance_analysis.worst_performing_line[0]}
                      ({insights.performance_analysis.worst_performing_line[1].toFixed(1)}%)
                    </span>
                  </div>
                )}
                {insights.performance_analysis.worst_performing_operation && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Operation:</span>{' '}
                    <span className="font-medium text-red-600">
                      {insights.performance_analysis.worst_performing_operation[0]}
                      ({insights.performance_analysis.worst_performing_operation[1].toFixed(1)}%)
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};