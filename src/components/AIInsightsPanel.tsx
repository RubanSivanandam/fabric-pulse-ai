// src/components/AIInsightsPanel.tsx - Complete AI Insights
import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  Lightbulb, 
  Target,
  Clock,
  Zap,
  MessageCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { useAI } from '@/contexts/AIContext';
import { useState } from 'react';

export function AIInsightsPanel() {
  const { state: aiState, askAI } = useAI();
  const panelRef = useRef<HTMLDivElement>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isAsking, setIsAsking] = useState(false);

  useEffect(() => {
    gsap.from(panelRef.current, {
      y: 50,
      opacity: 0,
      duration: 0.8,
      ease: "back.out(1.7)",
    });

    gsap.from('.insight-card', {
      x: -50,
      opacity: 0,
      duration: 0.6,
      stagger: 0.1,
      ease: "power2.out",
      delay: 0.3,
    });
  }, []);

  const handleAskAI = async () => {
    if (!question.trim()) return;
    
    setIsAsking(true);
    try {
      const response = await askAI(question);
      setAnswer(response);
    } catch (error) {
      setAnswer('Sorry, I encountered an error. Please try again.');
    } finally {
      setIsAsking(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500/20 border-red-500/50 text-red-300';
      case 'high': return 'bg-orange-500/20 border-orange-500/50 text-orange-300';
      case 'medium': return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300';
      case 'low': return 'bg-green-500/20 border-green-500/50 text-green-300';
      default: return 'bg-gray-500/20 border-gray-500/50 text-gray-300';
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'efficiency': return TrendingUp;
      case 'prediction': return Target;
      case 'recommendation': return Lightbulb;
      case 'alert': return AlertTriangle;
      default: return Brain;
    }
  };

  return (
    <div ref={panelRef} className="space-y-6">
      
      {/* AI Status and Predictions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 border-blue-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Brain className="h-5 w-5 text-blue-400" />
              <span>AI Analysis Status</span>
            </CardTitle>
            <CardDescription>Current AI processing state</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Status</span>
              <Badge className={aiState.aiStatus === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'}>
                {aiState.aiStatus === 'active' ? 'Active' : 'Standby'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Insights Generated</span>
              <span className="text-white font-semibold">{aiState.insights.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Last Analysis</span>
              <span className="text-gray-400 text-sm">
                {aiState.lastAnalysis ? new Date(aiState.lastAnalysis).toLocaleTimeString() : 'Never'}
              </span>
            </div>
            {aiState.isAnalyzing && (
              <div className="space-y-2">
                <div className="text-sm text-blue-300">Analyzing production data...</div>
                <Progress value={undefined} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-900/50 to-blue-900/50 border-green-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Target className="h-5 w-5 text-green-400" />
              <span>AI Predictions</span>
            </CardTitle>
            <CardDescription>Next hour efficiency forecast</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">
                {aiState.predictions.efficiency.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-400">Predicted Efficiency</div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Trend</span>
              <Badge className={
                aiState.predictions.trend === 'increasing' ? 'bg-green-500/20 text-green-300' :
                aiState.predictions.trend === 'decreasing' ? 'bg-red-500/20 text-red-300' :
                'bg-yellow-500/20 text-yellow-300'
              }>
                {aiState.predictions.trend}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Confidence</span>
              <span className="text-white">{(aiState.predictions.confidence * 100).toFixed(0)}%</span>
            </div>
            <Progress value={aiState.predictions.confidence * 100} className="h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Ask AI Section */}
      <Card className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <MessageCircle className="h-5 w-5 text-purple-400" />
            <span>Ask AI Assistant</span>
          </CardTitle>
          <CardDescription>Get intelligent answers about production efficiency</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Input
              placeholder="Ask about production efficiency, performance issues, or improvements..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAskAI()}
              className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
            />
            <Button 
              onClick={handleAskAI}
              disabled={isAsking || !question.trim()}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isAsking ? <Clock className="h-4 w-4 animate-spin" /> : 'Ask'}
            </Button>
          </div>
          {answer && (
            <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
              <div className="text-sm text-gray-300 mb-2">AI Response:</div>
              <div className="text-white">{answer}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Insights */}
      <Card className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 border-gray-700/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Zap className="h-5 w-5 text-yellow-400" />
            <span>AI Insights</span>
            <Badge variant="secondary" className="ml-auto">
              {aiState.insights.length} insights
            </Badge>
          </CardTitle>
          <CardDescription>AI-generated production insights and recommendations</CardDescription>
        </CardHeader>
        <CardContent>
          {aiState.insights.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No AI insights available yet.</p>
              <p className="text-sm">Start production monitoring to generate insights.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {aiState.insights.map((insight, index) => {
                const IconComponent = getInsightIcon(insight.type);
                return (
                  <div
                    key={insight.id}
                    className={`insight-card p-4 rounded-lg border ${getPriorityColor(insight.priority)}`}
                  >
                    <div className="flex items-start space-x-3">
                      <IconComponent className="h-5 w-5 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-white truncate">{insight.title}</h4>
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            <Badge variant="outline" className="text-xs">
                              {(insight.confidence * 100).toFixed(0)}%
                            </Badge>
                            <span className="text-xs text-gray-400">
                              {new Date(insight.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm opacity-90">{insight.description}</p>
                        {insight.data && (
                          <div className="mt-2 text-xs opacity-75">
                            <pre className="whitespace-pre-wrap">
                              {JSON.stringify(insight.data, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Recommendations */}
      {aiState.recommendations.length > 0 && (
        <Card className="bg-gradient-to-br from-yellow-900/50 to-orange-900/50 border-yellow-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Lightbulb className="h-5 w-5 text-yellow-400" />
              <span>AI Recommendations</span>
            </CardTitle>
            <CardDescription>Actionable insights to improve production efficiency</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {aiState.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                  <div className="text-yellow-400 mt-0.5">
                    <span className="text-sm font-bold">#{index + 1}</span>
                  </div>
                  <p className="text-yellow-100 text-sm">{recommendation}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
