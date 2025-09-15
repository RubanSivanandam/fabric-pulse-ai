import { useState, useEffect, useCallback } from "react";
import { rtmsService } from "../services/RTMSService";
import { Operator, ProductionAnalysis } from "@/types/rtms";

interface Filters {
  unit_code?: string;
  floor_name?: string;
  line_name?: string;
  operation?: string;
}

export function useRTMSData() {
  const [operators, setOperators] = useState<Operator[]>([]); // ✅ always array
  const [aiInsights, setAIInsights] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data: ProductionAnalysis = await rtmsService.getOperatorEfficiencies(filters);
      setOperators(data.operators ?? []); // ✅ safe fallback
      setAIInsights(data.ai_insights ?? null);
    } catch (err: any) {
      console.error("Failed to fetch RTMS data:", err);
      setError(err?.message ?? "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateFilters = (newFilters: Partial<Filters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  return {
    operators,
    aiInsights,
    loading,
    error,
    filters,
    updateFilters,
    refetch: fetchData,
  };
}
