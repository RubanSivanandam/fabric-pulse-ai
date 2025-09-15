// Backend API types (snake_case)
export interface RTMSProductionDataAPI {
  LineName: string;
  EmpCode: string;
  EmpName: string;
  DeviceID: string;
  StyleNo: string;
  OrderNo: string;
  Operation: string;
  SAM: number;
  Eff100: number;
  Eff75?: number;
  ProdnPcs: number;
  EffPer: number;
  OperSeq: number;
  UsedMin: number;
  TranDate: string;
  UnitCode: string;
  PartName: string;
  FloorName: string;
  ReptType: string;
  PartSeq: number;
  EffPer100: number;
  EffPer75: number;
  NewOperSeq: string;
  BuyerCode: string;
  ISFinPart: string;
  ISFinOper: string;
  IsRedFlag: number;
}

// Frontend UI types (camelCase)
export interface OperatorData {
  empName: string;
  empCode: string;
  lineName: string;
  unitCode: string;
  floorName: string;
  operation: string;
  newOperSeq: string;
  deviceId: string;
  efficiency: number;
  production: number;
  target: number;
  status: 'excellent' | 'good' | 'needs_improvement' | 'critical';
  isTopPerformer: boolean;
  relativeEfficiency?: number;
}

// Legacy/compatibility aliases
export type Operator = OperatorData;

export interface AIInsights {
  summary: string;
  performanceAnalysis: {
    bestPerformingLine: [string, number] | null;
    worstPerformingLine: [string, number] | null;
    bestPerformingOperation: [string, number] | null;
    worstPerformingOperation: [string, number] | null;
  };
  recommendations: string[];
  predictions: {
    trend: string;
    confidence: number;
    forecast: string;
  };
}

export interface AnalysisResponse {
  status: string;
  data: {
    overallEfficiency: number;
    totalProduction: number;
    totalTarget: number;
    operators: OperatorData[];
    underperformers: OperatorData[];
    aiInsights: AIInsights;
    whatsappAlertsNeeded: boolean;
    whatsappDisabled: boolean;
    analysisTimestamp: string;
    recordsAnalyzed: number;
    dataDate: string;
  };
  filtersApplied?: {
    unitCode?: string;
    floorName?: string;
    lineName?: string;
    operation?: string;
  };
}

// Alias for repository return type
export type APIResponse = AnalysisResponse;

export interface FilterOptions {
  units: string[];
  floors: string[];
  lines: string[];
  operations: string[];
}

export interface AIRequest {
  text?: string;
  length?: 'short' | 'medium' | 'long';
  context?: string;
  query?: string;
  prompt?: string;
  maxTokens?: number;
  stream?: boolean;
}

export interface AIResponse {
  summary?: string;
  suggestions?: Array<{
    id: string;
    label: string;
    confidence: number;
  }>;
  text?: string;
  processingTime?: number;
}

export interface FilterState {
  unitCode: string | null;
  floorName: string | null;
  lineName: string | null;
  operation: string | null;
}

// Add missing types for repository
export interface ServiceStatus {
  status: string;
  timestamp: string;
}

export interface OperationsResponse {
  operations: string[];
}

export interface Alert {
  id: string;
  type: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  timestamp: string;
  confidence?: number;
  location?: string;
  operation?: string;
  efficiency?: number;
  target?: number;
  status: 'active' | 'resolved' | 'acknowledged';
}

export interface ProductionAnalysis {
  overallEfficiency: number;
  totalProduction: number;
  totalTarget: number;
  operators: OperatorData[];
  underperformers: OperatorData[];
  aiInsights: AIInsights;
  whatsappAlertsNeeded: boolean;
  whatsappDisabled: boolean;
  analysisTimestamp: string;
  recordsAnalyzed: number;
  dataDate: string;
}

