import { APIResponse, ServiceStatus, OperationsResponse, Alert } from '@/types/rtms';

class RTMSRepository {
  private baseUrl = 'http://localhost:8000';

  async getServiceStatus(): Promise<ServiceStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch service status:', error);
      throw new Error('Failed to fetch service status');
    }
  }

  async getProductionData(filters?: {
    unit_code?: string;
    floor_name?: string;
    line_name?: string;
    operation?: string;
  }): Promise<APIResponse> {
    try {
      const params = new URLSearchParams();
      if (filters?.unit_code) params.append('unit_code', filters.unit_code);
      if (filters?.floor_name) params.append('floor_name', filters.floor_name);
      if (filters?.line_name) params.append('line_name', filters.line_name);
      if (filters?.operation) params.append('operation', filters.operation);

      const url = `${this.baseUrl}/api/rtms/analyze${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch production data:', error);
      throw new Error('Failed to fetch production data');
    }
  }

  async getOperations(): Promise<OperationsResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/rtms/operations`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch operations:', error);
      throw new Error('Failed to fetch operations');
    }
  }

  async getAlerts(): Promise<{ alerts: Alert[]; count: number; whatsapp_disabled: boolean; data_date: string; timestamp: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/rtms/alerts`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
      throw new Error('Failed to fetch alerts');
    }
  }

  async testWhatsApp(): Promise<{ status: string; message: string; timestamp: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/rtms/test-whatsapp`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to test WhatsApp:', error);
      throw new Error('Failed to test WhatsApp');
    }
  }

  async getSystemStatus(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/rtms/status`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch system status:', error);
      throw new Error('Failed to fetch system status');
    }
  }
}

export const rtmsRepository = new RTMSRepository();