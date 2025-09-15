import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter, X, Search } from 'lucide-react';

interface FiltersProps {
  operations: string[];
  filters: {
    unit_code?: string;
    floor_name?: string;
    line_name?: string;
    operation?: string;
  };
  onFiltersChange: (filters: any) => void;
  onClearFilters: () => void;
}

export const Filters: React.FC<FiltersProps> = ({
  operations,
  filters,
  onFiltersChange,
  onClearFilters
}) => {
  const handleFilterChange = (key: string, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => value);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filters
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="unit_code">Unit Code</Label>
            <Input
              id="unit_code"
              placeholder="e.g., D15-2"
              value={filters.unit_code || ''}
              onChange={(e) => handleFilterChange('unit_code', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="floor_name">Floor Name</Label>
            <Input
              id="floor_name"
              placeholder="e.g., FLOOR-2"
              value={filters.floor_name || ''}
              onChange={(e) => handleFilterChange('floor_name', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="line_name">Line Name</Label>
            <Input
              id="line_name"
              placeholder="e.g., S1-1"
              value={filters.line_name || ''}
              onChange={(e) => handleFilterChange('line_name', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="operation">Operation</Label>
            <Select
              value={filters.operation || ''}
              onValueChange={(value) => handleFilterChange('operation', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select operation" />
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
        </div>

        {hasActiveFilters && (
          <div className="mt-4 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={onClearFilters}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Clear Filters
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};