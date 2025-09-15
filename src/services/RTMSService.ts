import { rtmsRepository } from '@/repositories/RTMSRepository';
import { Operator, ProductionAnalysis, ServiceStatus, Alert } from '@/types/rtms';

class RTMSService {
  async getOperatorEfficiencies(filters?: {
    unit_code?: string;
    floor_name?: string;
    line_name?: string;
    operation?: string;
  }): Promise<ProductionAnalysis> {
    try {
      const response = await rtmsRepository.getProductionData(filters);
      return response.data;
    } catch (error) {
      console.error('Error in RTMSService.getOperatorEfficiencies:', error);
      throw error;
    }
  }

  async getServiceStatus(): Promise<ServiceStatus> {
    try {
      return await rtmsRepository.getServiceStatus();
    } catch (error) {
      console.error('Error in RTMSService.getServiceStatus:', error);
      throw error;
    }
  }

  async getOperations(): Promise<string[]> {
    try {
      const response = await rtmsRepository.getOperations();
      return response.data;
    } catch (error) {
      console.error('Error in RTMSService.getOperations:', error);
      throw error;
    }
  }

  async getAlerts(): Promise<Alert[]> {
    try {
      const response = await rtmsRepository.getAlerts();
      return response.alerts;
    } catch (error) {
      console.error('Error in RTMSService.getAlerts:', error);
      throw error;
    }
  }

  async testWhatsApp(): Promise<{ status: string; message: string }> {
    try {
      return await rtmsRepository.testWhatsApp();
    } catch (error) {
      console.error('Error in RTMSService.testWhatsApp:', error);
      throw error;
    }
  }

  async getSystemStatus(): Promise<any> {
    try {
      return await rtmsRepository.getSystemStatus();
    } catch (error) {
      console.error('Error in RTMSService.getSystemStatus:', error);
      throw error;
    }
  }

  getEfficiencyColor(efficiency: number): string {
    if (efficiency >= 100) return 'text-green-600';
    if (efficiency >= 85) return 'text-blue-600';
    if (efficiency >= 70) return 'text-orange-600';
    return 'text-red-600';
  }

  getEfficiencyBadgeColor(status: string): string {
    switch (status) {
      case 'excellent':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'good':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'needs_improvement':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  }

  formatEfficiencyStatus(status: string): string {
    switch (status) {
      case 'excellent':
        return 'Excellent';
      case 'good':
        return 'Good';
      case 'needs_improvement':
        return 'Needs Improvement';
      case 'critical':
        return 'Critical';
      default:
        return 'Unknown';
    }
  }
}

export const rtmsService = new RTMSService();