export interface RTMSProductionData {
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
actualEfficiency?: number;
}

export interface OperatorEfficiency {
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
relativeEfficiency: number;
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
predictions?: {
trend: 'increasing' | 'decreasing' | 'stable';
confidence: number;
forecast: string;
};
}

export interface FilterState {
unitCode: string;
floorName: string;
lineName: string;
operation: string; // Maps to NewOperSeq
startDate?: string;
endDate?: string;
}