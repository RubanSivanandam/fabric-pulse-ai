// API Response Types
export interface Operator {
  emp_name: string;
  emp_code: string;
  line_name: string;
  unit_code: string;
  floor_name: string;
  operation: string;
  new_oper_seq: string;
  device_id: string;
  efficiency: number;
  production: number;
  target: number;
  status: 'excellent' | 'good' | 'needs_improvement' | 'critical';
  is_top_performer: boolean;
}

export interface AIInsights {
  summary: string;
  performance_analysis: {
    best_performing_line: [string, number] | null;
    worst_performing_line: [string, number] | null;
    best_performing_operation: [string, number] | null;
    worst_performing_operation: [string, number] | null;
  };
  recommendations: string[];
  predictions: {
    trend: string;
    confidence: number;
    forecast: string;
  };
}

export interface ProductionAnalysis {
  status: string;
  overall_efficiency: number;
  total_production: number;
  total_target: number;
  operators: Operator[];
  underperformers: Operator[];
  ai_insights: AIInsights;
  whatsapp_alerts_needed: boolean;
  whatsapp_disabled: boolean;
  analysis_timestamp: string;
  records_analyzed: number;
  data_date: string;
}

export interface APIResponse {
  status: string;
  data: ProductionAnalysis;
  filters_applied?: {
    unit_code?: string;
    floor_name?: string;
    line_name?: string;
    operation?: string;
  };
}

export interface ServiceStatus {
  service: string;
  version: string;
  status: string;
  ai_enabled: boolean;
  whatsapp_enabled: boolean;
  whatsapp_disabled: boolean;
  database_connected: boolean;
  bot_name: string;
  data_date: string;
  features: string[];
  last_fetch: string | null;
  timestamp: string;
}

export interface OperationsResponse {
  status: string;
  data: string[];
  count: number;
  data_date: string;
  timestamp: string;
}

export interface Alert {
  id: string;
  employee: string;
  employee_code: string;
  unit: string;
  floor: string;
  line: string;
  operation: string;
  current_efficiency: number;
  target_efficiency: number;
  gap: number;
  priority: 'HIGH' | 'MEDIUM';
  production: number;
  target: number;
  timestamp: string;
}

// ✅ New interface for visualization layer
export interface OperatorEfficiency {
  empName: string;
  empCode: string;
  lineName: string;
  unitCode: string;
  floorName: string;
  operation: string;
  efficiency: number;
  production: number;
  target: number;
  status: 'excellent' | 'good' | 'needs_improvement' | 'critical' | 'unknown';
  isTopPerformer: boolean;

  // extra fields visualization may use
  newOperSeq?: string;
  deviceId?: string;
  relativeEfficiency?: number;
}
