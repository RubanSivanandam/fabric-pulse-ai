// src/contexts/AIContext.tsx - COMPLETE AI INTEGRATION
import React, { createContext, useContext, useReducer, useEffect } from 'react';

interface AIInsight {
  id: string;
  type: 'efficiency' | 'prediction' | 'recommendation' | 'alert';
  title: string;
  description: string;
  confidence: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  data?: any;
}

interface AIState {
  insights: AIInsight[];
  predictions: {
    efficiency: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    confidence: number;
    timeframe: string;
  };
  recommendations: string[];
  isAnalyzing: boolean;
  lastAnalysis: string | null;
  aiStatus: 'active' | 'inactive' | 'error';
}

type AIAction = 
  | { type: 'SET_INSIGHTS'; payload: AIInsight[] }
  | { type: 'ADD_INSIGHT'; payload: AIInsight }
  | { type: 'SET_PREDICTIONS'; payload: AIState['predictions'] }
  | { type: 'SET_RECOMMENDATIONS'; payload: string[] }
  | { type: 'SET_ANALYZING'; payload: boolean }
  | { type: 'SET_AI_STATUS'; payload: AIState['aiStatus'] }
  | { type: 'SET_LAST_ANALYSIS'; payload: string };

const initialState: AIState = {
  insights: [],
  predictions: {
    efficiency: 0,
    trend: 'stable',
    confidence: 0,
    timeframe: '1 hour',
  },
  recommendations: [],
  isAnalyzing: false,
  lastAnalysis: null,
  aiStatus: 'inactive',
};

function aiReducer(state: AIState, action: AIAction): AIState {
  switch (action.type) {
    case 'SET_INSIGHTS':
      return { ...state, insights: action.payload };
    case 'ADD_INSIGHT':
      return { ...state, insights: [action.payload, ...state.insights.slice(0, 49)] }; // Keep last 50
    case 'SET_PREDICTIONS':
      return { ...state, predictions: action.payload };
    case 'SET_RECOMMENDATIONS':
      return { ...state, recommendations: action.payload };
    case 'SET_ANALYZING':
      return { ...state, isAnalyzing: action.payload };
    case 'SET_AI_STATUS':
      return { ...state, aiStatus: action.payload };
    case 'SET_LAST_ANALYSIS':
      return { ...state, lastAnalysis: action.payload };
    default:
      return state;
  }
}

const AIContext = createContext<{
  state: AIState;
  dispatch: React.Dispatch<AIAction>;
  analyzeProduction: (data: any) => Promise<void>;
  generateInsights: (data: any) => Promise<void>;
  askAI: (question: string) => Promise<string>;
  summarizeData: (data: any, length?: 'short' | 'medium' | 'long') => Promise<string>;
} | null>(null);

export function AIContextProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(aiReducer, initialState);

  const analyzeProduction = async (data: any) => {
    dispatch({ type: 'SET_ANALYZING', payload: true });
    dispatch({ type: 'SET_AI_STATUS', payload: 'active' });

    try {
      // Generate AI insights
      const insights = await generateProductionInsights(data);
      dispatch({ type: 'SET_INSIGHTS', payload: insights });

      // Generate predictions
      const predictions = await generatePredictions(data);
      dispatch({ type: 'SET_PREDICTIONS', payload: predictions });

      // Generate recommendations
      const recommendations = await generateRecommendations(data);
      dispatch({ type: 'SET_RECOMMENDATIONS', payload: recommendations });

      dispatch({ type: 'SET_LAST_ANALYSIS', payload: new Date().toISOString() });
    } catch (error) {
      console.error('AI analysis failed:', error);
      dispatch({ type: 'SET_AI_STATUS', payload: 'error' });
    } finally {
      dispatch({ type: 'SET_ANALYZING', payload: false });
    }
  };

  const generateInsights = async (data: any) => {
    try {
      const response = await fetch('/api/ai/suggest_ops', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-AI-Client': 'fabric-pulse-ai-2025',
        },
        body: JSON.stringify({
          context: JSON.stringify(data),
          query: 'Generate production efficiency insights',
        }),
      });

      const result = await response.json();
      
      if (result.suggestions) {
        const insights: AIInsight[] = result.suggestions.map((suggestion: any, index: number) => ({
          id: `insight-${Date.now()}-${index}`,
          type: 'efficiency',
          title: suggestion.label,
          description: `AI-generated insight with ${(suggestion.confidence * 100).toFixed(1)}% confidence`,
          confidence: suggestion.confidence,
          priority: suggestion.confidence > 0.8 ? 'high' : suggestion.confidence > 0.6 ? 'medium' : 'low',
          timestamp: new Date().toISOString(),
          data: suggestion,
        }));

        dispatch({ type: 'SET_INSIGHTS', payload: insights });
      }
    } catch (error) {
      console.error('Failed to generate insights:', error);
    }
  };

  const askAI = async (question: string): Promise<string> => {
    try {
      const response = await fetch('/api/ai/completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-AI-Client': 'fabric-pulse-ai-2025',
        },
        body: JSON.stringify({
          prompt: `As a production efficiency expert, answer this question about garment manufacturing: ${question}`,
          maxTokens: 200,
          temperature: 0.7,
        }),
      });

      const result = await response.json();
      return result.text || 'Sorry, I could not generate a response at this time.';
    } catch (error) {
      console.error('AI question failed:', error);
      return 'Sorry, I am currently unavailable. Please try again later.';
    }
  };

  const summarizeData = async (data: any, length: 'short' | 'medium' | 'long' = 'medium'): Promise<string> => {
    try {
      const response = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-AI-Client': 'fabric-pulse-ai-2025',
        },
        body: JSON.stringify({
          text: JSON.stringify(data),
          length,
        }),
      });

      const result = await response.json();
      return result.summary || 'No summary available.';
    } catch (error) {
      console.error('AI summarization failed:', error);
      return 'Summary unavailable at this time.';
    }
  };

  return (
    <AIContext.Provider
      value={{
        state,
        dispatch,
        analyzeProduction,
        generateInsights,
        askAI,
        summarizeData,
      }}
    >
      {children}
    </AIContext.Provider>
  );
}

// Helper functions
async function generateProductionInsights(data: any): Promise<AIInsight[]> {
  const insights: AIInsight[] = [];
  
  if (data.operators && data.operators.length > 0) {
    const avgEfficiency = data.operators.reduce((sum: number, op: any) => sum + op.efficiency, 0) / data.operators.length;
    const lowPerformers = data.operators.filter((op: any) => op.efficiency < 70).length;
    const highPerformers = data.operators.filter((op: any) => op.efficiency >= 100).length;

    insights.push({
      id: `insight-${Date.now()}-1`,
      type: 'efficiency',
      title: 'Production Efficiency Analysis',
      description: `Average efficiency is ${avgEfficiency.toFixed(1)}%. ${highPerformers} high performers, ${lowPerformers} need attention.`,
      confidence: 0.95,
      priority: avgEfficiency < 80 ? 'high' : 'medium',
      timestamp: new Date().toISOString(),
      data: { avgEfficiency, lowPerformers, highPerformers },
    });

    if (lowPerformers > 0) {
      insights.push({
        id: `insight-${Date.now()}-2`,
        type: 'alert',
        title: 'Underperformance Alert',
        description: `${lowPerformers} operators are performing below 70% efficiency. Immediate intervention required.`,
        confidence: 1.0,
        priority: 'critical',
        timestamp: new Date().toISOString(),
        data: { count: lowPerformers },
      });
    }
  }

  return insights;
}

async function generatePredictions(data: any): Promise<AIState['predictions']> {
  if (!data.operators || data.operators.length === 0) {
    return {
      efficiency: 0,
      trend: 'stable',
      confidence: 0,
      timeframe: '1 hour',
    };
  }

  const avgEfficiency = data.operators.reduce((sum: number, op: any) => sum + op.efficiency, 0) / data.operators.length;
  const trend = avgEfficiency > 85 ? 'increasing' : avgEfficiency < 70 ? 'decreasing' : 'stable';
  
  return {
    efficiency: Math.min(100, avgEfficiency + (trend === 'increasing' ? 5 : trend === 'decreasing' ? -5 : 0)),
    trend,
    confidence: 0.85,
    timeframe: '1 hour',
  };
}

async function generateRecommendations(data: any): Promise<string[]> {
  const recommendations: string[] = [];
  
  if (data.operators && data.operators.length > 0) {
    const lowPerformers = data.operators.filter((op: any) => op.efficiency < 70);
    const avgEfficiency = data.operators.reduce((sum: number, op: any) => sum + op.efficiency, 0) / data.operators.length;

    if (lowPerformers.length > 0) {
      recommendations.push(`Provide additional training for ${lowPerformers.length} underperforming operators`);
      recommendations.push('Review work allocation and machine maintenance schedules');
    }

    if (avgEfficiency < 80) {
      recommendations.push('Consider workflow optimization to improve overall efficiency');
      recommendations.push('Implement performance incentive programs');
    }

    if (data.underperformers && data.underperformers.length > 0) {
      recommendations.push('Schedule immediate supervisor intervention for critical cases');
    }
  }

  return recommendations;
}

export function useAI() {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within an AIContextProvider');
  }
  return context;
}
