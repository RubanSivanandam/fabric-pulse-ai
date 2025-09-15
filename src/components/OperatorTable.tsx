import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Operator } from '@/types/rtms';
import { rtmsService } from '@/services/RTMSService';

interface OperatorTableProps {
  operators: Operator[];
  title?: string;
}

export const OperatorTable: React.FC<OperatorTableProps> = ({ 
  operators, 
  title = "Production Performance" 
}) => {
  if (!operators || operators.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            No operator data available
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Floor</TableHead>
                <TableHead>Line</TableHead>
                <TableHead>Operation</TableHead>
                <TableHead>Production</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Efficiency</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {operators.map((operator, index) => (
                <TableRow key={`${operator.emp_code}-${operator.new_oper_seq}-${index}`}>
                  <TableCell className="font-medium">
                    {operator.emp_name}
                    {operator.is_top_performer && (
                      <Badge className="ml-2 bg-yellow-100 text-yellow-800">
                        Top Performer
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{operator.emp_code}</TableCell>
                  <TableCell>{operator.unit_code}</TableCell>
                  <TableCell>{operator.floor_name}</TableCell>
                  <TableCell>{operator.line_name}</TableCell>
                  <TableCell>{operator.new_oper_seq}</TableCell>
                  <TableCell>{operator.production}</TableCell>
                  <TableCell>{operator.target}</TableCell>
                  <TableCell>
                    <span className={rtmsService.getEfficiencyColor(operator.efficiency)}>
                      {operator.efficiency.toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge className={rtmsService.getEfficiencyBadgeColor(operator.status)}>
                      {rtmsService.formatEfficiencyStatus(operator.status)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};