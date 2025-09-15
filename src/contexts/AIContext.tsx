import React, { createContext, useContext, useState } from "react";

export interface AIInsight {
  id: string;
  text: string;
}

export interface AIState {
  efficiency: number;
  underperformers: number;
  alerts: number;
  insights: AIInsight[];
}

interface AIContextType {
  state: AIState;
  analyzeProduction: (data: any[]) => void;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export function AIContextProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AIState>({
    efficiency: 0,
    underperformers: 0,
    alerts: 0,
    insights: [],
  });

  const analyzeProduction = (data: any[]) => {
    if (!data || data.length === 0) {
      setState((prev) => ({ ...prev, efficiency: 0, underperformers: 0, alerts: 0, insights: [] }));
      return;
    }

    // Example placeholder logic (replace with real AI later)
    const totalEff = data.reduce((sum, row) => sum + (row.EffPer || 0), 0);
    const avgEff = totalEff / data.length;
    const underperf = data.filter((row) => row.EffPer < 85).length;

    setState({
      efficiency: avgEff,
      underperformers: underperf,
      alerts: underperf, // treat underperformers as alerts
      insights: [
        { id: "1", text: `Average efficiency is ${avgEff.toFixed(1)}%.` },
        { id: "2", text: `${underperf} workers are underperforming (<85%).` },
      ],
    });
  };

  return (
    <AIContext.Provider value={{ state, analyzeProduction }}>
      {children}
    </AIContext.Provider>
  );
}

export function useAI() {
  const ctx = useContext(AIContext);
  if (!ctx) throw new Error("useAI must be used within an AIContextProvider");
  return ctx;
}
