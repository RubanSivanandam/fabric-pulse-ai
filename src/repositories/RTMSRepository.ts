import { APIClient } from '../services/APIClient';
import { RTMSProductionData, FilterState } from '../types';

export class RTMSRepository {
  private apiClient: APIClient;

  constructor() {
    this.apiClient = new APIClient();
  }

  async getProductionData(filters?: FilterState): Promise<RTMSProductionData[]> {
    try {
      const queryParams = new URLSearchParams();
      
      if (filters?.unitCode) queryParams.append('unit_code', filters.unitCode);
      if (filters?.floorName) queryParams.append('floor_name', filters.floorName);
      if (filters?.lineName) queryParams.append('line_name', filters.lineName);
      if (filters?.operation) queryParams.append('operation', filters.operation);
      if (filters?.startDate) queryParams.append('start_date', filters.startDate);
      if (filters?.endDate) queryParams.append('end_date', filters.endDate);

      const response = await this.apiClient.get(`/api/rtms/analyze?${queryParams}`);
      return response.data.hierarchy || [];
    } catch (error) {
      console.error('Failed to fetch production data:', error);
      throw new Error('Failed to fetch production data');
    }
  }

  async getAIAnalysis(): Promise<any> {
    try {
      const response = await this.apiClient.get('/api/rtms/analyze');
      return response.data.ai_analysis;
    } catch (error) {
      console.error('Failed to fetch AI analysis:', error);
      throw new Error('Failed to fetch AI analysis');
    }
  }

  async getOperations(): Promise<string[]> {
    try {
      const response = await this.apiClient.get('/api/rtms/operations');
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch operations:', error);
      return [];
    }
  }

  async getEfficiencyAlerts(): Promise<any[]> {
    try {
      const response = await this.apiClient.get('/api/rtms/alerts');
      return response.data.alerts || [];
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
      return [];
    }
  }
}