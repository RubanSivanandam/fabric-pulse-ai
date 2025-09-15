// src/components/dashboard/AIInsightsDashboard.tsx
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AIInsights } from '../types';
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  Lightbulb, 
  Target,
  Zap,
  BarChart3
} from 'lucide-react';

interface AIInsightsDashboardProps {
  insights: AIInsights;
  className?: string;
}

export const AIInsightsDashboard: React.FC<AIInsightsDashboardProps> = ({
  insights,
  className = ""
}) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* AI Header */}
      <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Brain className="h-8 w-8" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">AI Production Intelligence</CardTitle>
              <p className="text-blue-100">Real-time insights powered by advanced AI analytics</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* AI Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            AI Analysis Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-lg font-medium bg-gray-50 p-4 rounded-lg border-l-4 border-blue-500">
            {insights.summary}
          </div>
        </CardContent>
      </Card>

      {/* Performance Analysis */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <TrendingUp className="h-5 w-5" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.performanceAnalysis.bestPerformingLine && (
              <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                <span className="font-medium">Best Line</span>
                <Badge className="bg-green-500">
                  {insights.performanceAnalysis.bestPerformingLine[0]} 
                  ({insights.performanceAnalysis.bestPerformingLine[1].toFixed(1)}%)
                </Badge>
              </div>
            )}
            {insights.performanceAnalysis.bestPerformingOperation && (
              <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                <span className="font-medium">Best Operation</span>
                <Badge className="bg-green-500">
                  {insights.performanceAnalysis.bestPerformingOperation[0]}
                  ({insights.performanceAnalysis.bestPerformingOperation[1].toFixed(1)}%)
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Needs Attention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.performanceAnalysis.worstPerformingLine && (
              <div className="flex justify-between items-center p-3 bg-red-50 rounded">
                <span className="font-medium">Focus Line</span>
                <Badge className="bg-red-500">
                  {insights.performanceAnalysis.worstPerformingLine[0]}
                  ({insights.performanceAnalysis.worstPerformingLine[1].toFixed(1)}%)
                </Badge>
              </div>
            )}
            {insights.performanceAnalysis.worstPerformingOperation && (
              <div className="flex justify-between items-center p-3 bg-red-50 rounded">
                <span className="font-medium">Focus Operation</span>
                <Badge className="bg-red-500">
                  {insights.performanceAnalysis.worstPerformingOperation[0]}
                  ({insights.performanceAnalysis.worstPerformingOperation[1].toFixed(1)}%)
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            AI-Powered Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {insights.recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                <Target className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{recommendation}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Predictions (if available) */}
      {insights.predictions && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-500" />
              AI Forecasting
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">Trend Prediction</span>
                <Badge className={`${
                  insights.predictions.trend === 'increasing' ? 'bg-green-500' :
                  insights.predictions.trend === 'decreasing' ? 'bg-red-500' : 'bg-gray-500'
                }`}>
                  {insights.predictions.trend}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                Confidence: {(insights.predictions.confidence * 100).toFixed(1)}%
              </p>
              <p className="text-sm">{insights.predictions.forecast}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
