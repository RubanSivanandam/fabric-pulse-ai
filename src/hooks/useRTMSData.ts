import { useState, useEffect, useCallback } from "react";
import { rtmsService } from "../services/RTMSService";
import { Operator, ProductionAnalysis } from "@/types/rtms";

interface Filters {
  unit_code?: string;
  floor_name?: string;
  line_name?: string;
  operation?: string;
}

export interface FilterOptions {
  unitCodes: string[];
  floorNames: string[];
  lineNames: string[];
  operations: string[];
}

export function useRTMSData() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [aiInsights, setAIInsights] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({});
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    unitCodes: [],
    floorNames: [],
    lineNames: [],
    operations: []
  });

  const fetchFilterOptions = useCallback(async () => {
    try {
      // Fetch all filter options based on current filter state
      const [unitCodes, floorNames, lineNames, operations] = await Promise.all([
        rtmsService.getUnitCodes(),
        filters.unit_code ? rtmsService.getFloorNames(filters.unit_code) : Promise.resolve([]),
        filters.floor_name ? rtmsService.getLineNames(filters.unit_code, filters.floor_name) : Promise.resolve([]),
        filters.line_name ? rtmsService.getOperationsByLine(filters.unit_code, filters.floor_name, filters.line_name) : rtmsService.getOperations()
      ]);

      setFilterOptions({
        unitCodes,
        floorNames,
        lineNames,
        operations
      });
    } catch (err) {
      console.error("Failed to fetch filter options:", err);
    }
  }, [filters.unit_code, filters.floor_name, filters.line_name]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data: ProductionAnalysis = await rtmsService.getOperatorEfficiencies(filters);
      setOperators(data.operators ?? []);
      setAIInsights(data.ai_insights ?? null);
    } catch (err: any) {
      console.error("Failed to fetch RTMS data:", err);
      setError(err?.message ?? "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateFilters = (newFilters: Partial<Filters>) => {
    setFilters((prev) => {
      const updated = { ...prev, ...newFilters };
      
      // Clear dependent filters when parent changes
      if (newFilters.unit_code !== undefined && newFilters.unit_code !== prev.unit_code) {
        delete updated.floor_name;
        delete updated.line_name;
        delete updated.operation;
      }
      if (newFilters.floor_name !== undefined && newFilters.floor_name !== prev.floor_name) {
        delete updated.line_name;
        delete updated.operation;
      }
      if (newFilters.line_name !== undefined && newFilters.line_name !== prev.line_name) {
        delete updated.operation;
      }
      
      return updated;
    });
  };

  const resetFilters = () => {
    setFilters({});
  };

  return {
    operators,
    aiInsights,
    loading,
    error,
    filters,
    filterOptions,
    updateFilters,
    resetFilters,
    refetch: fetchData,
  };
}