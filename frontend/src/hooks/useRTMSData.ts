import { useState, useEffect, useCallback } from 'react';
import { RTMSService } from '../services/RTMSService';
import { OperatorEfficiency, FilterState, AIInsights } from '../types';

export const useRTMSData = () => {
  const [operators, setOperators] = useState<OperatorEfficiency[]>([]);
  const [aiInsights, setAIInsights] = useState<AIInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    unitCode: '',
    floorName: '',
    lineName: '',
    operation: ''
  });

  const rtmsService = new RTMSService();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [operatorData, insights] = await Promise.all([
        rtmsService.getOperatorEfficiencies(filters),
        rtmsService.getAIInsights()
      ]);

      setOperators(operatorData);
      setAIInsights(insights);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 10 minutes
  useEffect(() => {
    const interval = setInterval(fetchData, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const updateFilters = useCallback((newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  return {
    operators,
    aiInsights,
    loading,
    error,
    filters,
    updateFilters,
    refetch: fetchData
  };
};