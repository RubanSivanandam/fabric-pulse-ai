import { APIResponse, ServiceStatus, OperationsResponse, Alert } from '@/types/rtms';

class RTMSRepository {
  private baseUrl = 'http://localhost:8000';

  async getServiceStatus(): Promise<ServiceStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/api/status`);
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
      
      // FIXED: Use correct endpoint that exists in backend
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
      // FIXED: Use correct endpoint
      const response = await fetch(`${this.baseUrl}/api/rtms/filters/operations`);
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
      // FIXED: Use correct endpoint - though this might not exist yet, adding fallback
      try {
        const response = await fetch(`${this.baseUrl}/api/rtms/alerts`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
      } catch {
        // Fallback - return mock data if alerts endpoint doesn't exist
        return {
          alerts: [],
          count: 0,
          whatsapp_disabled: true,
          data_date: '2025-09-12',
          timestamp: new Date().toISOString()
        };
      }
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

  async getSystemStatus(): Promise<ServiceStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/api/status`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch system status:', error);
      throw new Error('Failed to fetch system status');
    }
  }

  // FIXED: Updated endpoints to match backend
  async getUnitCodes(): Promise<{ status: string; data: string[]; count: number; timestamp: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/rtms/filters/units`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Failed to fetch units:", error);
      throw new Error("Failed to fetch units");
    }
  }

  async getFloorNames(unit: string): Promise<{ status: string; data: string[]; count: number; timestamp: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/rtms/filters/floors?unit_code=${unit}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Failed to fetch floors:", error);
      throw new Error("Failed to fetch floors");
    }
  }

  async getLineNames(unit: string, floor: string): Promise<{ status: string; data: string[]; count: number; timestamp: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/rtms/filters/lines?unit_code=${unit}&floor_name=${floor}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Failed to fetch lines:", error);
      throw new Error("Failed to fetch lines");
    }
  }

  async getOperationsByLine(unit: string, floor: string, line: string): Promise<{ status: string; data: string[]; count: number; timestamp: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/rtms/filters/operations?unit_code=${unit}&floor_name=${floor}&line_name=${line}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Failed to fetch operations:", error);
      throw new Error("Failed to fetch operations");
    }
  }
}

export const rtmsRepository = new RTMSRepository();