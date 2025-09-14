import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RTMSService } from '../../services/RTMSService';

interface OperationFilterProps {
  onOperationChange: (operation: string) => void;
  selectedOperation?: string;
}

export const OperationFilter: React.FC<OperationFilterProps> = ({
  onOperationChange,
  selectedOperation
}) => {
  const [operations, setOperations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const rtmsService = new RTMSService();

  useEffect(() => {
    const fetchOperations = async () => {
      try {
        const ops = await rtmsService.getOperations();
        setOperations(ops);
      } catch (error) {
        console.error('Failed to fetch operations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOperations();
  }, []);

  return (
    <div className="space-y-2">
      <Label htmlFor="operation-select" className="text-sm font-medium">
        Operation
      </Label>
      <Select
        value={selectedOperation || ""}
        onValueChange={onOperationChange}
        disabled={loading}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={loading ? "Loading operations..." : "Select Operation"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Operations</SelectItem>
          {operations.map((operation) => (
            <SelectItem key={operation} value={operation}>
              {operation}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};