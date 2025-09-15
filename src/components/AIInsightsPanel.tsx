import React from "react";
import { AIInsight } from "../contexts/AIContext";

export interface AIInsightsPanelProps {
  insights: AIInsight[];
}

export const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({ insights }) => {
  return (
    <div className="bg-gray-900 p-4 rounded-lg">
      <h3 className="text-lg font-semibold mb-2">AI Insights</h3>
      {insights.length === 0 ? (
        <p className="text-gray-400">No insights available</p>
      ) : (
        <ul className="list-disc list-inside text-gray-200">
          {insights.map((insight) => (
            <li key={insight.id}>{insight.text}</li>
          ))}
        </ul>
      )}
    </div>
  );
};
