import { useState, useEffect, useCallback } from 'react';
import { debounce } from 'lodash';
import {
  FilterOptions,
  FilterState,
  AnalysisResponse,
  AIRequest,
  AIResponse,
} from '../types';

const API_BASE = 'http://localhost:8000/api/rtms';
const AI_API_BASE = 'http://localhost:8000/api/ai';

interface UseRTMSDataReturn {
  // Filter data
  filterOptions: FilterOptions;
  filterState: FilterState;
  setFilterState: (state: Partial<FilterState>) => void;
  
  // Analysis data
  analysisData: AnalysisResponse | null;
  loading: boolean;
  error: string | null;
  
  // AI functions
  explainInsights: (text: string) => Promise<string>;
  askAI: (prompt: string) => Promise<string>;
  
  // Refresh function
  refreshData: () => Promise<void>;
}

export const useRTMSData = (): UseRTMSDataReturn => {
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    units: [],
    floors: [],
    lines: [],
    operations: [],
  });

  const [filterState, setFilterStateInternal] = useState<FilterState>({
    unitCode: null,
    floorName: null,
    lineName: null,
    operation: null,
  });

  const [analysisData, setAnalysisData] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced API calls
  const debouncedFetchFloors = useCallback(
    debounce(async (unitCode: string) => {
      try {
        const response = await fetch(`${API_BASE}/filters/floors?unit_code=${encodeURIComponent(unitCode)}`);
        if (!response.ok) throw new Error('Failed to fetch floors');
        const data = await response.json();
        setFilterOptions(prev => ({ ...prev, floors: data.data || [] }));
      } catch (err) {
        console.error('Error fetching floors:', err);
        setFilterOptions(prev => ({ ...prev, floors: [] }));
      }
    }, 300),
    []
  );

  const debouncedFetchLines = useCallback(
    debounce(async (unitCode: string, floorName: string) => {
      try {
        const response = await fetch(
          `${API_BASE}/filters/lines?unit_code=${encodeURIComponent(unitCode)}&floor_name=${encodeURIComponent(floorName)}`
        );
        if (!response.ok) throw new Error('Failed to fetch lines');
        const data = await response.json();
        setFilterOptions(prev => ({ ...prev, lines: data.data || [] }));
      } catch (err) {
        console.error('Error fetching lines:', err);
        setFilterOptions(prev => ({ ...prev, lines: [] }));
      }
    }, 300),
    []
  );

  const debouncedFetchOperations = useCallback(
    debounce(async (unitCode?: string, floorName?: string, lineName?: string) => {
      try {
        const params = new URLSearchParams();
        if (unitCode) params.append('unit_code', unitCode);
        if (floorName) params.append('floor_name', floorName);
        if (lineName) params.append('line_name', lineName);

        const response = await fetch(`${API_BASE}/filters/operations?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch operations');
        const data = await response.json();
        setFilterOptions(prev => ({ ...prev, operations: data.data || [] }));
      } catch (err) {
        console.error('Error fetching operations:', err);
        setFilterOptions(prev => ({ ...prev, operations: [] }));
      }
    }, 300),
    []
  );

  // Fetch units on mount
  useEffect(() => {
    const fetchUnits = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE}/filters/units`);
        if (!response.ok) throw new Error('Failed to fetch units');
        const data = await response.json();
        setFilterOptions(prev => ({ ...prev, units: data.data || [] }));
      } catch (err) {
        console.error('Error fetching units:', err);
        setError('Failed to load filter options');
      } finally {
        setLoading(false);
      }
    };

    fetchUnits();
  }, []);

  // Handle filter cascading
  useEffect(() => {
    if (filterState.unitCode) {
      debouncedFetchFloors(filterState.unitCode);
      // Reset dependent filters
      if (filterState.floorName || filterState.lineName || filterState.operation) {
        setFilterStateInternal(prev => ({
          ...prev,
          floorName: null,
          lineName: null,
          operation: null,
        }));
        setFilterOptions(prev => ({ ...prev, floors: [], lines: [], operations: [] }));
      }
    } else {
      setFilterOptions(prev => ({ ...prev, floors: [], lines: [], operations: [] }));
    }
  }, [filterState.unitCode, debouncedFetchFloors]);

  useEffect(() => {
    if (filterState.unitCode && filterState.floorName) {
      debouncedFetchLines(filterState.unitCode, filterState.floorName);
      // Reset dependent filters
      if (filterState.lineName || filterState.operation) {
        setFilterStateInternal(prev => ({
          ...prev,
          lineName: null,
          operation: null,
        }));
        setFilterOptions(prev => ({ ...prev, lines: [], operations: [] }));
      }
    } else {
      setFilterOptions(prev => ({ ...prev, lines: [], operations: [] }));
    }
  }, [filterState.unitCode, filterState.floorName, debouncedFetchLines]);

  useEffect(() => {
    if (filterState.unitCode && filterState.floorName && filterState.lineName) {
      debouncedFetchOperations(filterState.unitCode, filterState.floorName, filterState.lineName);
      // Reset operation filter
      if (filterState.operation) {
        setFilterStateInternal(prev => ({ ...prev, operation: null }));
      }
    } else if (filterState.unitCode || filterState.floorName) {
      // Fetch all operations if we have some filters but not line-specific
      debouncedFetchOperations(filterState.unitCode || undefined, filterState.floorName || undefined);
    } else {
      setFilterOptions(prev => ({ ...prev, operations: [] }));
    }
  }, [filterState.unitCode, filterState.floorName, filterState.lineName, debouncedFetchOperations]);

  // Fetch analysis data when filters change
  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (filterState.unitCode) params.append('unit_code', filterState.unitCode);
        if (filterState.floorName) params.append('floor_name', filterState.floorName);
        if (filterState.lineName) params.append('line_name', filterState.lineName);
        if (filterState.operation) params.append('operation', filterState.operation);

        const response = await fetch(`${API_BASE}/efficiency?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch analysis data');
        const data = await response.json();
        setAnalysisData(data);
      } catch (err) {
        console.error('Error fetching analysis:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [filterState]);

  const setFilterState = useCallback((newState: Partial<FilterState>) => {
    setFilterStateInternal(prev => ({ ...prev, ...newState }));
  }, []);

  const explainInsights = useCallback(async (text: string): Promise<string> => {
    try {
      const request: AIRequest = {
        text: text.substring(0, 10000), // Limit to 10k chars
        length: 'medium',
      };

      const response = await fetch(`${AI_API_BASE}/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) throw new Error('AI service unavailable');
      const data: AIResponse = await response.json();
      return data.summary || 'Unable to generate explanation';
    } catch (err) {
      console.error('Error explaining insights:', err);
      return 'AI explanation service is currently unavailable';
    }
  }, []);

  const askAI = useCallback(async (prompt: string): Promise<string> => {
    try {
      const request: AIRequest = {
        prompt: prompt.substring(0, 8000), // Limit prompt
        maxTokens: 200,
        stream: false,
      };

      const response = await fetch(`${AI_API_BASE}/completion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) throw new Error('AI service unavailable');
      const data: AIResponse = await response.json();
      return data.text || 'Unable to generate response';
    } catch (err) {
      console.error('Error asking AI:', err);
      return 'AI service is currently unavailable';
    }
  }, []);

  const refreshData = useCallback(async () => {
    // Trigger re-fetch of current data
    const params = new URLSearchParams();
    if (filterState.unitCode) params.append('unit_code', filterState.unitCode);
    if (filterState.floorName) params.append('floor_name', filterState.floorName);
    if (filterState.lineName) params.append('line_name', filterState.lineName);
    if (filterState.operation) params.append('operation', filterState.operation);

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE}/efficiency?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to refresh data');
      const data = await response.json();
      setAnalysisData(data);
    } catch (err) {
      console.error('Error refreshing data:', err);
      setError('Failed to refresh data');
    } finally {
      setLoading(false);
    }
  }, [filterState]);

  return {
    filterOptions,
    filterState,
    setFilterState,
    analysisData,
    loading,
    error,
    explainInsights,
    askAI,
    refreshData,
  };
};
