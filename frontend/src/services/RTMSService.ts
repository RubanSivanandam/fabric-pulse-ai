import { RTMSRepository } from '../repositories/RTMSRepository';
import { OperatorEfficiency, FilterState, AIInsights } from '../types';

export class RTMSService {
  private rtmsRepository: RTMSRepository;

  constructor() {
    this.rtmsRepository = new RTMSRepository();
  }

  async getOperatorEfficiencies(filters?: FilterState): Promise<OperatorEfficiency[]> {
    try {
      const data = await this.rtmsRepository.getProductionData(filters);
      return this.processOperatorEfficiencies(data);
    } catch (error) {
      console.error('Error in RTMSService.getOperatorEfficiencies:', error);
      return [];
    }
  }

  private processOperatorEfficiencies(data: any): OperatorEfficiency[] {
    const operators: OperatorEfficiency[] = [];
    
    // Process hierarchical data to extract operators
    Object.values(data).forEach((unit: any) => {
      Object.values(unit.floors || {}).forEach((floor: any) => {
        Object.values(floor.lines || {}).forEach((line: any) => {
          Object.values(line.styles || {}).forEach((style: any) => {
            Object.values(style.parts || {}).forEach((part: any) => {
              Object.values(part.operations || {}).forEach((operation: any) => {
                Object.values(operation.devices || {}).forEach((device: any) => {
                  Object.values(device.employees || {}).forEach((emp: any) => {
                    operators.push({
                      empName: emp.name,
                      empCode: emp.code,
                      lineName: line.name,
                      unitCode: unit.name,
                      floorName: floor.name,
                      operation: emp.operation,
                      newOperSeq: operation.name,
                      deviceId: device.name,
                      efficiency: emp.efficiency,
                      production: emp.production,
                      target: emp.target,
                      status: this.getEfficiencyStatus(emp.efficiency),
                      isTopPerformer: emp.efficiency >= 100,
                      relativeEfficiency: this.calculateRelativeEfficiency(emp.efficiency, operation.employees)
                    });
                  });
                });
              });
            });
          });
        });
      });
    });

    return operators;
  }

  private getEfficiencyStatus(efficiency: number): 'excellent' | 'good' | 'needs_improvement' | 'critical' {
    if (efficiency >= 100) return 'excellent';
    if (efficiency >= 85) return 'good';
    if (efficiency >= 70) return 'needs_improvement';
    return 'critical';
  }

  private calculateRelativeEfficiency(efficiency: number, operationEmployees: any): number {
    const efficiencies = Object.values(operationEmployees).map((emp: any) => emp.efficiency);
    const maxEfficiency = Math.max(...efficiencies);
    return maxEfficiency > 0 ? (efficiency / maxEfficiency) * 100 : 0;
  }

  async getAIInsights(): Promise<AIInsights> {
    try {
      return await this.rtmsRepository.getAIAnalysis();
    } catch (error) {
      console.error('Error fetching AI insights:', error);
      return {
        summary: "AI analysis unavailable",
        performance_analysis: {
          best_performing_line: null,
          worst_performing_line: null,
          best_performing_operation: null,
          worst_performing_operation: null
        },
        recommendations: []
      };
    }
  }

  async getOperations(): Promise<string[]> {
    return this.rtmsRepository.getOperations();
  }
}