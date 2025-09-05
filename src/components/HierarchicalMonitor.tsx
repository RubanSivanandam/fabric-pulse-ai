import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Building2, 
  Factory, 
  Settings, 
  Shirt, 
  User, 
  ChevronDown, 
  ChevronRight,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target
} from 'lucide-react';

interface OperatorDetail {
  id: string;
  name: string;
  shift: string;
  production: number;
  target: number;
  efficiency: number;
  status: 'active' | 'absent' | 'underperforming' | 'overperforming';
  hoursWorked: number;
  pieceRate: number;
}

interface StyleData {
  styleCode: string;
  styleName: string;
  complexity: 'Simple' | 'Medium' | 'Complex';
  targetPerHour: number;
  operators: OperatorDetail[];
  totalProduction: number;
  totalTarget: number;
  averageEfficiency: number;
}

interface OperationData {
  operationName: string;
  operationCode: string;
  machineType: string;
  styles: StyleData[];
  totalOperators: number;
  totalProduction: number;
  totalTarget: number;
  averageEfficiency: number;
}

interface LineData {
  lineCode: string;
  lineName: string;
  supervisor: string;
  operations: OperationData[];
  totalOperators: number;
  totalProduction: number;
  totalTarget: number;
  averageEfficiency: number;
  status: 'running' | 'stopped' | 'maintenance';
}

interface UnitData {
  unitCode: string;
  unitName: string;
  manager: string;
  lines: LineData[];
  totalOperators: number;
  totalProduction: number;
  totalTarget: number;
  averageEfficiency: number;
}

const HierarchicalMonitor = () => {
  const [units, setUnits] = useState<UnitData[]>([]);
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());
  const [expandedLines, setExpandedLines] = useState<Set<string>>(new Set());
  const [expandedOperations, setExpandedOperations] = useState<Set<string>>(new Set());
  const [expandedStyles, setExpandedStyles] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Generate realistic hierarchical production data
    const generateUnitsData = (): UnitData[] => {
      return [
        {
          unitCode: 'UNIT-001',
          unitName: 'Cutting & Preparation Unit',
          manager: 'Rajesh Kumar',
          totalOperators: 0,
          totalProduction: 0,
          totalTarget: 0,
          averageEfficiency: 0,
          lines: [
            {
              lineCode: 'LINE-A1',
              lineName: 'Cutting Line A1',
              supervisor: 'Priya Singh',
              status: 'running',
              totalOperators: 0,
              totalProduction: 0,
              totalTarget: 0,
              averageEfficiency: 0,
              operations: [
                {
                  operationName: 'Fabric Cutting',
                  operationCode: 'OP-001',
                  machineType: 'Auto Cutter',
                  totalOperators: 0,
                  totalProduction: 0,
                  totalTarget: 0,
                  averageEfficiency: 0,
                  styles: [
                    {
                      styleCode: 'ST-2024-001',
                      styleName: 'Mens Polo Shirt',
                      complexity: 'Simple',
                      targetPerHour: 25,
                      totalProduction: 0,
                      totalTarget: 0,
                      averageEfficiency: 0,
                      operators: [
                        {
                          id: 'OP-001-001',
                          name: 'Amit Sharma',
                          shift: 'Day',
                          production: 195,
                          target: 200,
                          efficiency: 97.5,
                          status: 'active',
                          hoursWorked: 8,
                          pieceRate: 2.5
                        },
                        {
                          id: 'OP-001-002',
                          name: 'Sunita Devi',
                          shift: 'Day',
                          production: 168,
                          target: 200,
                          efficiency: 84,
                          status: 'underperforming',
                          hoursWorked: 8,
                          pieceRate: 2.5
                        }
                      ]
                    },
                    {
                      styleCode: 'ST-2024-002',
                      styleName: 'Ladies Kurti',
                      complexity: 'Medium',
                      targetPerHour: 18,
                      totalProduction: 0,
                      totalTarget: 0,
                      averageEfficiency: 0,
                      operators: [
                        {
                          id: 'OP-001-003',
                          name: 'Ravi Patel',
                          shift: 'Day',
                          production: 142,
                          target: 144,
                          efficiency: 98.6,
                          status: 'active',
                          hoursWorked: 8,
                          pieceRate: 3.2
                        }
                      ]
                    }
                  ]
                }
              ]
            },
            {
              lineCode: 'LINE-A2',
              lineName: 'Pattern Line A2',
              supervisor: 'Meera Joshi',
              status: 'running',
              totalOperators: 0,
              totalProduction: 0,
              totalTarget: 0,
              averageEfficiency: 0,
              operations: [
                {
                  operationName: 'Pattern Making',
                  operationCode: 'OP-002',
                  machineType: 'CAD System',
                  totalOperators: 0,
                  totalProduction: 0,
                  totalTarget: 0,
                  averageEfficiency: 0,
                  styles: [
                    {
                      styleCode: 'ST-2024-003',
                      styleName: 'Kids T-Shirt',
                      complexity: 'Simple',
                      targetPerHour: 30,
                      totalProduction: 0,
                      totalTarget: 0,
                      averageEfficiency: 0,
                      operators: [
                        {
                          id: 'OP-002-001',
                          name: 'Kiran Reddy',
                          shift: 'Day',
                          production: 245,
                          target: 240,
                          efficiency: 102.1,
                          status: 'overperforming',
                          hoursWorked: 8,
                          pieceRate: 2.0
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          unitCode: 'UNIT-002',
          unitName: 'Sewing & Assembly Unit',
          manager: 'Deepak Gupta',
          totalOperators: 0,
          totalProduction: 0,
          totalTarget: 0,
          averageEfficiency: 0,
          lines: [
            {
              lineCode: 'LINE-B1',
              lineName: 'Main Sewing Line B1',
              supervisor: 'Anjali Verma',
              status: 'running',
              totalOperators: 0,
              totalProduction: 0,
              totalTarget: 0,
              averageEfficiency: 0,
              operations: [
                {
                  operationName: 'Basic Sewing',
                  operationCode: 'OP-101',
                  machineType: 'Lock Stitch',
                  totalOperators: 0,
                  totalProduction: 0,
                  totalTarget: 0,
                  averageEfficiency: 0,
                  styles: [
                    {
                      styleCode: 'ST-2024-001',
                      styleName: 'Mens Polo Shirt',
                      complexity: 'Simple',
                      targetPerHour: 15,
                      totalProduction: 0,
                      totalTarget: 0,
                      averageEfficiency: 0,
                      operators: [
                        {
                          id: 'OP-101-001',
                          name: 'Pooja Kumari',
                          shift: 'Day',
                          production: 116,
                          target: 120,
                          efficiency: 96.7,
                          status: 'active',
                          hoursWorked: 8,
                          pieceRate: 4.5
                        },
                        {
                          id: 'OP-101-002',
                          name: 'Vikash Singh',
                          shift: 'Day',
                          production: 0,
                          target: 120,
                          efficiency: 0,
                          status: 'absent',
                          hoursWorked: 0,
                          pieceRate: 4.5
                        },
                        {
                          id: 'OP-101-003',
                          name: 'Neha Tiwari',
                          shift: 'Day',
                          production: 98,
                          target: 120,
                          efficiency: 81.7,
                          status: 'underperforming',
                          hoursWorked: 8,
                          pieceRate: 4.5
                        }
                      ]
                    }
                  ]
                },
                {
                  operationName: 'Collar Attachment',
                  operationCode: 'OP-102',
                  machineType: 'Over Lock',
                  totalOperators: 0,
                  totalProduction: 0,
                  totalTarget: 0,
                  averageEfficiency: 0,
                  styles: [
                    {
                      styleCode: 'ST-2024-002',
                      styleName: 'Ladies Kurti',
                      complexity: 'Medium',
                      targetPerHour: 12,
                      totalProduction: 0,
                      totalTarget: 0,
                      averageEfficiency: 0,
                      operators: [
                        {
                          id: 'OP-102-001',
                          name: 'Sushma Rani',
                          shift: 'Day',
                          production: 89,
                          target: 96,
                          efficiency: 92.7,
                          status: 'active',
                          hoursWorked: 8,
                          pieceRate: 5.2
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ];
    };

    // Calculate aggregated data
    const calculateAggregates = (units: UnitData[]) => {
      units.forEach(unit => {
        unit.lines.forEach(line => {
          line.operations.forEach(operation => {
            operation.styles.forEach(style => {
              style.totalProduction = style.operators.reduce((sum, op) => sum + op.production, 0);
              style.totalTarget = style.operators.reduce((sum, op) => sum + op.target, 0);
              style.averageEfficiency = style.totalTarget > 0 ? 
                Math.round((style.totalProduction / style.totalTarget) * 100) : 0;
            });
            
            operation.totalOperators = operation.styles.reduce((sum, style) => sum + style.operators.length, 0);
            operation.totalProduction = operation.styles.reduce((sum, style) => sum + style.totalProduction, 0);
            operation.totalTarget = operation.styles.reduce((sum, style) => sum + style.totalTarget, 0);
            operation.averageEfficiency = operation.totalTarget > 0 ? 
              Math.round((operation.totalProduction / operation.totalTarget) * 100) : 0;
          });
          
          line.totalOperators = line.operations.reduce((sum, op) => sum + op.totalOperators, 0);
          line.totalProduction = line.operations.reduce((sum, op) => sum + op.totalProduction, 0);
          line.totalTarget = line.operations.reduce((sum, op) => sum + op.totalTarget, 0);
          line.averageEfficiency = line.totalTarget > 0 ? 
            Math.round((line.totalProduction / line.totalTarget) * 100) : 0;
        });
        
        unit.totalOperators = unit.lines.reduce((sum, line) => sum + line.totalOperators, 0);
        unit.totalProduction = unit.lines.reduce((sum, line) => sum + line.totalProduction, 0);
        unit.totalTarget = unit.lines.reduce((sum, line) => sum + line.totalTarget, 0);
        unit.averageEfficiency = unit.totalTarget > 0 ? 
          Math.round((unit.totalProduction / unit.totalTarget) * 100) : 0;
      });
      
      return units;
    };

    const initialData = calculateAggregates(generateUnitsData());
    setUnits(initialData);
  }, []);

  const toggleExpanded = (type: string, id: string) => {
    const setters = {
      unit: setExpandedUnits,
      line: setExpandedLines,
      operation: setExpandedOperations,
      style: setExpandedStyles
    };
    
    const setter = setters[type as keyof typeof setters];
    setter(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 100) return 'text-success';
    if (efficiency >= 85) return 'text-primary';
    if (efficiency >= 70) return 'text-warning';
    return 'text-destructive';
  };

  const getStatusBadge = (status: string, efficiency: number) => {
    const variants: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
      'active': 'default',
      'absent': 'destructive',
      'underperforming': 'secondary',
      'overperforming': 'default',
      'running': 'default',
      'stopped': 'destructive',
      'maintenance': 'secondary'
    };
    
    return (
      <Badge variant={variants[status] || 'default'}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Building2 className="h-8 w-8 text-primary" />
        <div>
          <h2 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Hierarchical Production Monitor
          </h2>
          <p className="text-muted-foreground">Unit → Line → Operation → Style → Operator Efficiency Tracking</p>
        </div>
      </div>

      {units.map((unit) => (
        <Card key={unit.unitCode} className="shadow-elegant">
          <Collapsible 
            open={expandedUnits.has(unit.unitCode)}
            onOpenChange={() => toggleExpanded('unit', unit.unitCode)}
          >
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {expandedUnits.has(unit.unitCode) ? 
                      <ChevronDown className="h-5 w-5" /> : 
                      <ChevronRight className="h-5 w-5" />
                    }
                    <Building2 className="h-6 w-6 text-primary" />
                    <div>
                      <CardTitle className="text-xl">{unit.unitName}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Manager: {unit.manager} • {unit.totalOperators} operators
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-2xl font-bold">{unit.totalProduction}</div>
                      <div className="text-xs text-muted-foreground">/ {unit.totalTarget}</div>
                    </div>
                    <div className={`text-2xl font-bold ${getEfficiencyColor(unit.averageEfficiency)}`}>
                      {unit.averageEfficiency}%
                    </div>
                  </div>
                </div>
                <Progress value={unit.averageEfficiency} className="mt-2" />
              </CardHeader>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <CardContent className="pl-8 space-y-4">
                {unit.lines.map((line) => (
                  <Card key={line.lineCode} className="border-l-4 border-l-primary/30">
                    <Collapsible
                      open={expandedLines.has(line.lineCode)}
                      onOpenChange={() => toggleExpanded('line', line.lineCode)}
                    >
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-accent/30 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {expandedLines.has(line.lineCode) ? 
                                <ChevronDown className="h-4 w-4" /> : 
                                <ChevronRight className="h-4 w-4" />
                              }
                              <Factory className="h-5 w-5 text-accent" />
                              <div>
                                <CardTitle className="text-lg">{line.lineName}</CardTitle>
                                <p className="text-xs text-muted-foreground">
                                  Supervisor: {line.supervisor} • {line.totalOperators} operators
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              {getStatusBadge(line.status, line.averageEfficiency)}
                              <div className="text-right">
                                <div className="font-bold">{line.totalProduction}/{line.totalTarget}</div>
                                <div className={`text-sm ${getEfficiencyColor(line.averageEfficiency)}`}>
                                  {line.averageEfficiency}%
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <CardContent className="pl-6 space-y-3">
                          {line.operations.map((operation) => (
                            <Card key={operation.operationCode} className="border-l-4 border-l-accent/30">
                              <Collapsible
                                open={expandedOperations.has(operation.operationCode)}
                                onOpenChange={() => toggleExpanded('operation', operation.operationCode)}
                              >
                                <CollapsibleTrigger asChild>
                                  <CardHeader className="cursor-pointer hover:bg-accent/20 transition-colors py-3">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        {expandedOperations.has(operation.operationCode) ? 
                                          <ChevronDown className="h-4 w-4" /> : 
                                          <ChevronRight className="h-4 w-4" />
                                        }
                                        <Settings className="h-4 w-4 text-warning" />
                                        <div>
                                          <CardTitle className="text-base">{operation.operationName}</CardTitle>
                                          <p className="text-xs text-muted-foreground">
                                            {operation.machineType} • {operation.totalOperators} operators
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <div className="text-sm">
                                          <span className="font-medium">{operation.totalProduction}</span>
                                          <span className="text-muted-foreground">/{operation.totalTarget}</span>
                                        </div>
                                        <div className={`text-sm font-bold ${getEfficiencyColor(operation.averageEfficiency)}`}>
                                          {operation.averageEfficiency}%
                                        </div>
                                      </div>
                                    </div>
                                  </CardHeader>
                                </CollapsibleTrigger>

                                <CollapsibleContent>
                                  <CardContent className="pl-4 space-y-2">
                                    {operation.styles.map((style) => (
                                      <Card key={style.styleCode} className="border-l-4 border-l-warning/30">
                                        <Collapsible
                                          open={expandedStyles.has(style.styleCode)}
                                          onOpenChange={() => toggleExpanded('style', style.styleCode)}
                                        >
                                          <CollapsibleTrigger asChild>
                                            <CardHeader className="cursor-pointer hover:bg-accent/10 transition-colors py-2">
                                              <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                  {expandedStyles.has(style.styleCode) ? 
                                                    <ChevronDown className="h-3 w-3" /> : 
                                                    <ChevronRight className="h-3 w-3" />
                                                  }
                                                  <Shirt className="h-4 w-4 text-success" />
                                                  <div>
                                                    <CardTitle className="text-sm">{style.styleName}</CardTitle>
                                                    <p className="text-xs text-muted-foreground">
                                                      {style.styleCode} • {style.complexity} • {style.operators.length} operators
                                                    </p>
                                                  </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                  <Badge variant="outline">{style.targetPerHour}/hr</Badge>
                                                  <div className="text-xs text-right">
                                                    <div className="font-medium">{style.totalProduction}/{style.totalTarget}</div>
                                                    <div className={getEfficiencyColor(style.averageEfficiency)}>
                                                      {style.averageEfficiency}%
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            </CardHeader>
                                          </CollapsibleTrigger>

                                          <CollapsibleContent>
                                            <CardContent className="pl-2 space-y-2">
                                              {style.operators.map((operator) => (
                                                <Card key={operator.id} className="border-l-4 border-l-success/30">
                                                  <CardContent className="p-3">
                                                    <div className="flex items-center justify-between">
                                                      <div className="flex items-center gap-3">
                                                        <User className="h-4 w-4 text-muted-foreground" />
                                                        <div>
                                                          <div className="font-medium text-sm">{operator.name}</div>
                                                          <div className="text-xs text-muted-foreground">
                                                            {operator.shift} Shift • {operator.hoursWorked}hrs • ₹{operator.pieceRate}/pc
                                                          </div>
                                                        </div>
                                                      </div>
                                                      <div className="flex items-center gap-4">
                                                        <div className="text-right text-xs">
                                                          <div className="font-medium">{operator.production}/{operator.target}</div>
                                                          <div className="text-muted-foreground">
                                                            ₹{(operator.production * operator.pieceRate).toFixed(0)}
                                                          </div>
                                                        </div>
                                                        <div className={`font-bold text-sm ${getEfficiencyColor(operator.efficiency)}`}>
                                                          {operator.efficiency}%
                                                        </div>
                                                        {getStatusBadge(operator.status, operator.efficiency)}
                                                        {operator.efficiency < 85 && (
                                                          <AlertTriangle className="h-4 w-4 text-destructive" />
                                                        )}
                                                      </div>
                                                    </div>
                                                    {operator.efficiency !== 0 && (
                                                      <Progress value={operator.efficiency} className="mt-2 h-1" />
                                                    )}
                                                  </CardContent>
                                                </Card>
                                              ))}
                                            </CardContent>
                                          </CollapsibleContent>
                                        </Collapsible>
                                      </Card>
                                    ))}
                                  </CardContent>
                                </CollapsibleContent>
                              </Collapsible>
                            </Card>
                          ))}
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                ))}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      ))}
    </div>
  );
};

export default HierarchicalMonitor;