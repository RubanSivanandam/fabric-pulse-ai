import React, { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { rtmsService } from "../../services/RTMSService";

interface OperationFilterProps {
  onOperationChange: (operation: string) => void;
  selectedOperation?: string;
}

export const OperationFilter: React.FC<OperationFilterProps> = ({ onOperationChange, selectedOperation }) => {
  const [operations, setOperations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOperations = async () => {
      try {
        const ops = await rtmsService.getOperations();
        setOperations(ops);
      } catch (error) {
        console.error("Failed to fetch operations:", error);
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
      <Select value={selectedOperation || ""} onValueChange={onOperationChange} disabled={loading}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={loading ? "Loading operations..." : "Select Operation"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all_operations__">All Operations</SelectItem>
          {Array.isArray(operations) &&
            operations.map((operation, idx) => {
              const label = operation ?? `Operation ${idx + 1}`;
              const value =
                typeof operation === "string"
                  ? operation.trim() || `op-${idx}`
                  : String((operation as any).code ?? (operation as any).id ?? `op-${idx}`);
              return (
                <SelectItem key={value} value={value} data-fallback-id={`op-${idx}`}>
                  {label}
                </SelectItem>
              );
            })}
        </SelectContent>
      </Select>
    </div>
  );
};
