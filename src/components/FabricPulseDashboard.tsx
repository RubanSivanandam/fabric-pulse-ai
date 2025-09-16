import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Activity,
  AlertTriangle,
  Users,
  Target,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Factory,
  Filter,
  Cpu,
  BarChart3,
  Database,
} from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
} from 'chart.js';
import { toast } from '@/components/ui/use-toast';
import { isEqual } from 'lodash';

// Chart.js register
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, BarElement);

// Types
interface RTMSEmployee {
  name: string;
  code: string;
  production: number;
  target: number;
  efficiency: number;
  operation: string;
  used_min: number;
  is_underperformer: boolean;
}

interface RTMSDevice {
  name: string;
  employees: Record<string, RTMSEmployee>;
  total_production: number;
  total_target: number;
  efficiency: number;
}

interface RTMSOperation {
  name: string;
  devices: Record<string, RTMSDevice>;
  total_production: number;
  total_target: number;
  efficiency: number;
}

interface RTMSPart {
  name: string;
  operations: Record<string, RTMSOperation>;
  total_production: number;
  total_target: number;
  efficiency: number;
}

interface RTMSStyle {
  name: string;
  parts: Record<string, RTMSPart>;
  total_production: number;
  total_target: number;
  efficiency: number;
}

interface RTMSLine {
  name: string;
  styles: Record<string, RTMSStyle>;
  total_production: number;
  total_target: number;
  efficiency: number;
}

interface RTMSFloor {
  name: string;
  lines: Record<string, RTMSLine>;
  total_production: number;
  total_target: number;
  efficiency: number;
}

interface RTMSUnit {
  name: string;
  floors: Record<string, RTMSFloor>;
  total_production: number;
  total_target: number;
  efficiency: number;
}

interface RTMSHierarchy {
  [unitCode: string]: RTMSUnit;
}

interface RTMSAnalysis {
  status: string;
  overall_efficiency: number;
  total_production: number;
  total_target: number;
  underperformers: Array<{
    emp_name: string;
    emp_code: string;
    line_name: string;
    unit_code: string;
    floor_name: string;
    operation: string;
    new_oper_seq: string;
    efficiency: number;
    production: number;
    target: number;
  }>;
  ai_insights: string;
  timestamp: string;
}

type Severity = 'high' | 'medium' | 'low';

interface RTMSAlert {
  type: string;
  severity: Severity;
  employee: any;
  message: string;
  timestamp: string;
}

interface OperatorData {
  emp_name: string;
  emp_code: string;
  line_name: string;
  unit_code: string;
  floor_name: string;
  operation: string;
  new_oper_seq: string;
  device_id: string;
  efficiency: number;
  production: number;
  target: number;
  status: string;
  is_top_performer: boolean;
}

interface LineData {
  line_name: string;
  unit_code: string;
  total_production: number;
  target: number;
  avg_efficiency: number;
  operator_count: number;
}

interface ProductionOverview {
  total_operators: number;
  avg_efficiency: number;
  total_production: number;
  lines_on_target: number;
  alerts_generated: number;
  units: string[];
}

// API helpers
const API_BASE = 'http://localhost:8000';

const fetchProductionOverview = async (): Promise<ProductionOverview> => {
  const response = await fetch(`${API_BASE}/api/rtms/filters/units`);
  if (!response.ok) throw new Error('Failed to fetch production overview');
  const result = await response.json();
  console.log('fetchProductionOverview result:', result);
  const units = Array.isArray(result.data) ? result.data.filter((unit: any) => unit && typeof unit === 'string' && unit.trim() !== '') : [];
  return {
    total_operators: 0,
    avg_efficiency: 0,
    total_production: 0,
    lines_on_target: 0,
    alerts_generated: 0,
    units,
  };
};

const fetchOperatorData = async (): Promise<OperatorData[]> => {
  const response = await fetch(`${API_BASE}/api/rtms/efficiency`);
  if (!response.ok) throw new Error('Failed to fetch operator data');
  const result = await response.json();
  console.log('fetchOperatorData result:', result);
  const operators = Array.isArray(result.data?.operators) ? result.data.operators : [];
  console.log('Raw operator data:', operators.map((op: any, i: number) => ({
    index: i,
    unit_code: op.unit_code,
    floor_name: op.floor_name,
    line_name: op.line_name,
    new_oper_seq: op.new_oper_seq,
    isValid: {
      unit_code: op.unit_code && typeof op.unit_code === 'string' && op.unit_code.trim() !== '',
      floor_name: op.floor_name && typeof op.floor_name === 'string' && op.floor_name.trim() !== '',
      line_name: op.line_name && typeof op.line_name === 'string' && op.line_name.trim() !== '',
      new_oper_seq: op.new_oper_seq && typeof op.new_oper_seq === 'string' && op.new_oper_seq.trim() !== '',
    },
  })));
  return operators.filter((op: any) => 
    op.unit_code && typeof op.unit_code === 'string' && op.unit_code.trim() !== '' &&
    op.floor_name && typeof op.floor_name === 'string' && op.floor_name.trim() !== '' &&
    op.line_name && typeof op.line_name === 'string' && op.line_name.trim() !== ''
  );
};

const fetchFloorsApi = async (unitCode: string): Promise<string[]> => {
  if (!unitCode || unitCode.trim() === '') return [];
  const response = await fetch(`${API_BASE}/api/rtms/filters/floors?unit_code=${encodeURIComponent(unitCode)}`);
  if (!response.ok) throw new Error('Failed to fetch floors from API');
  const result = await response.json();
  console.log('fetchFloorsApi result:', result);
  const floors = Array.isArray(result.data) ? result.data.filter((floor: any) => floor && typeof floor === 'string' && floor.trim() !== '') : [];
  return floors;
};

const fetchLinesApi = async (unitCode: string, floorName: string): Promise<LineData[]> => {
  if (!unitCode || unitCode.trim() === '' || !floorName || floorName.trim() === '') return [];
  const response = await fetch(
    `${API_BASE}/api/rtms/filters/lines?unit_code=${encodeURIComponent(unitCode)}&floor_name=${encodeURIComponent(floorName)}`
  );
  if (!response.ok) throw new Error('Failed to fetch lines from API');
  const result = await response.json();
  console.log('fetchLinesApi result:', result);
  const lines = Array.isArray(result.data) ? result.data.filter((line: any) => line.line_name && typeof line.line_name === 'string' && line.line_name.trim() !== '') : [];
  return lines;
};

// Utility helpers
const uniq = <T, K extends keyof T>(arr: T[], key: (item: T) => K | string) => {
  const set = new Set<string>();
  const out: T[] = [];
  for (const a of arr) {
    const k = String(key(a));
    if (k && k.trim() !== '') {
      if (!set.has(k)) {
        set.add(k);
        out.push(a);
      }
    }
  }
  return out;
};

const getSeverity = (eff: number): Severity => {
  if (eff < 70) return 'high';
  if (eff < 85) return 'medium';
  return 'low';
};

// Component
const FabricPulseDashboard = () => {
  // Core states
  const [currentTime, setCurrentTime] = useState(new Date());
  const [rtmsData, setRtmsData] = useState<RTMSAnalysis | null>(null);
  const [hierarchyData, setHierarchyData] = useState<RTMSHierarchy>({});
  const [alerts, setAlerts] = useState<RTMSAlert[]>([]);

  // Filter states
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [selectedFloor, setSelectedFloor] = useState<string>('');
  const [selectedLine, setSelectedLine] = useState<string>('');
  const [selectedNewOperSeq, setSelectedNewOperSeq] = useState<string>('');

  // Helper store for operator list
  const [operatorsCache, setOperatorsCache] = useState<OperatorData[]>([]);

  // Refs for animations
  const headerRef = useRef<HTMLDivElement | null>(null);
  const dashboardRef = useRef<HTMLDivElement | null>(null);

  // React-query fetches
  const { data: overview, isLoading: overviewLoading, error: overviewError } = useQuery<ProductionOverview, Error>({
    queryKey: ['productionOverview'],
    queryFn: fetchProductionOverview,
    refetchInterval: 10 * 60 * 1000,
  });

  const { data: operators = [], isLoading: operatorsLoading, error: operatorsError } = useQuery<OperatorData[], Error>({
    queryKey: ['operatorData'],
    queryFn: fetchOperatorData,
    refetchInterval: 10 * 60 * 1000,
  });

  const { data: floorsFromApi = [], isLoading: floorsLoading, error: floorsError } = useQuery<string[], Error>({
    queryKey: ['floors', selectedUnit],
    queryFn: () => fetchFloorsApi(selectedUnit),
    enabled: !!selectedUnit && selectedUnit.trim() !== '',
    retry: 1,
  });

  const { data: linesFromApi = [], isLoading: linesLoading, error: linesError } = useQuery<LineData[], Error>({
    queryKey: ['lines', selectedUnit, selectedFloor],
    queryFn: () => fetchLinesApi(selectedUnit, selectedFloor),
    enabled: !!selectedUnit && selectedUnit.trim() !== '' && !!selectedFloor && selectedFloor.trim() !== '',
    retry: 1,
  });

  // Memoize dependencies to stabilize references
  const memoizedOverview = useMemo<ProductionOverview>(() => {
    if (overview) return overview;
    return {
      total_operators: 0,
      avg_efficiency: 0,
      total_production: 0,
      lines_on_target: 0,
      alerts_generated: 0,
      units: [],
    };
  }, [overview]);

  const memoizedOperators = useMemo(() => Array.isArray(operators) ? operators : [], [operators]);
  const memoizedLinesFromApi = useMemo(() => Array.isArray(linesFromApi) ? linesFromApi : [], [linesFromApi]);

  // Update operatorsCache
  useEffect(() => {
    if (memoizedOperators.length) {
      setOperatorsCache(memoizedOperators);
    }
  }, [memoizedOperators]);

  // Derived lists (units/floors/lines) with strict validation
  const derivedUnits = useMemo(() => {
    const units = memoizedOverview.units.length 
      ? memoizedOverview.units 
      : Array.from(new Set(memoizedOperators.map(op => op.unit_code).filter(Boolean)));
    const validUnits = units
      .filter(unit => unit && typeof unit === 'string' && unit.trim() !== '')
      .map(unit => unit.trim());
    console.log('derivedUnits:', validUnits);
    return validUnits.length > 0 ? validUnits : ['UNIT-DEFAULT'];
  }, [memoizedOverview, memoizedOperators]);

  const derivedFloors = useMemo(() => {
    if (selectedUnit && selectedUnit.trim() !== '' && floorsFromApi.length) {
      const validFloors = floorsFromApi
        .filter(floor => floor && typeof floor === 'string' && floor.trim() !== '')
        .map(floor => floor.trim());
      console.log('derivedFloors (API):', validFloors);
      return validFloors.length > 0 ? validFloors : ['FLOOR-DEFAULT'];
    }
    if (!selectedUnit || selectedUnit.trim() === '') return [];
    const floors = Array.from(new Set(memoizedOperators
      .filter(op => op.unit_code === selectedUnit)
      .map(op => op.floor_name)
      .filter(Boolean)));
    const validFloors = floors
      .filter(floor => floor && typeof floor === 'string' && floor.trim() !== '')
      .map(floor => floor.trim());
    console.log('derivedFloors (fallback):', validFloors);
    return validFloors.length > 0 ? validFloors : ['FLOOR-DEFAULT'];
  }, [selectedUnit, floorsFromApi, memoizedOperators]);

  const derivedLines = useMemo(() => {
    if (selectedUnit && selectedUnit.trim() !== '' && selectedFloor && selectedFloor.trim() !== '' && memoizedLinesFromApi.length) {
      const validLines = memoizedLinesFromApi
        .filter(line => line.line_name && typeof line.line_name === 'string' && line.line_name.trim() !== '')
        .map(line => ({ ...line, line_name: line.line_name.trim() }));
      console.log('derivedLines (API):', validLines);
      return validLines.length > 0 ? validLines : [{ line_name: 'LINE-DEFAULT', unit_code: selectedUnit, total_production: 0, target: 0, avg_efficiency: 0, operator_count: 0 }];
    }
    if (!selectedUnit || selectedUnit.trim() === '' || !selectedFloor || selectedFloor.trim() === '') return [];
    const linesMap = new Map<string, LineData>();
    memoizedOperators.forEach(op => {
      if (
        op.unit_code === selectedUnit && 
        op.floor_name === selectedFloor && 
        op.line_name && 
        typeof op.line_name === 'string' && 
        op.line_name.trim() !== ''
      ) {
        const lineName = op.line_name.trim();
        const existing = linesMap.get(lineName);
        if (!existing) {
          linesMap.set(lineName, {
            line_name: lineName,
            unit_code: op.unit_code,
            total_production: op.production || 0,
            target: op.target || 0,
            avg_efficiency: op.efficiency || 0,
            operator_count: 1,
          });
        } else {
          existing.total_production += op.production || 0;
          existing.target += op.target || 0;
          existing.avg_efficiency = (existing.avg_efficiency * existing.operator_count + op.efficiency) / (existing.operator_count + 1);
          existing.operator_count += 1;
        }
      }
    });
    const validLines = Array.from(linesMap.values()).sort((a, b) => a.line_name.localeCompare(b.line_name));
    console.log('derivedLines (fallback):', validLines);
    return validLines.length > 0 ? validLines : [{ line_name: 'LINE-DEFAULT', unit_code: selectedUnit, total_production: 0, target: 0, avg_efficiency: 0, operator_count: 0 }];
  }, [selectedUnit, selectedFloor, memoizedLinesFromApi, memoizedOperators]);

  const newOperSeqOptions = useMemo(() => {
    const rawSeqs = [
      ...(rtmsData?.underperformers ?? []).map(op => op.new_oper_seq),
      ...(operatorsCache ?? []).map(op => op.new_oper_seq),
    ];
    console.log('Raw new_oper_seq values:', rawSeqs.map((seq, i) => ({
      index: i,
      value: seq,
      isValid: seq && typeof seq === 'string' && seq.trim() !== '',
    })));
    const validSeqs = Array.from(
      new Set(
        rawSeqs.filter(seq => seq && typeof seq === 'string' && seq.trim() !== '').map(seq => seq.trim())
      )
    ).sort();
    console.log('newOperSeqOptions:', validSeqs);
    return validSeqs.length > 0 ? validSeqs : ['OPERATION-DEFAULT'];
  }, [rtmsData, operatorsCache]);

  // Effects: cascade resets
  useEffect(() => {
    setSelectedFloor('');
    setSelectedLine('');
    setSelectedNewOperSeq('');
  }, [selectedUnit]);

  useEffect(() => {
    setSelectedLine('');
    setSelectedNewOperSeq('');
  }, [selectedFloor]);

  useEffect(() => {
    setSelectedNewOperSeq('');
  }, [selectedLine]);

  // Transform API data into hierarchy & rtmsData
  const computedData = useMemo(() => {
    try {
      const hierarchy: RTMSHierarchy = {};

      if (Array.isArray(memoizedOperators)) {
        memoizedOperators.forEach(op => {
          const unitCode = op.unit_code && typeof op.unit_code === 'string' && op.unit_code.trim() !== '' ? op.unit_code.trim() : 'UNIT-DEFAULT';
          const floorName = op.floor_name && typeof op.floor_name === 'string' && op.floor_name.trim() !== '' ? op.floor_name.trim() : 'FLOOR-DEFAULT';
          const lineName = op.line_name && typeof op.line_name === 'string' && op.line_name.trim() !== '' ? op.line_name.trim() : 'LINE-DEFAULT';

          if (!hierarchy[unitCode]) {
            hierarchy[unitCode] = {
              name: unitCode,
              floors: {},
              total_production: 0,
              total_target: 0,
              efficiency: 0,
            };
          }

          if (!hierarchy[unitCode].floors[floorName]) {
            hierarchy[unitCode].floors[floorName] = {
              name: floorName,
              lines: {},
              total_production: 0,
              total_target: 0,
              efficiency: 0,
            };
          }

          const lineObj = hierarchy[unitCode].floors[floorName].lines[lineName] || {
            name: lineName,
            styles: {},
            total_production: 0,
            total_target: 0,
            efficiency: 0,
          };

          lineObj.total_production += op.production || 0;
          lineObj.total_target += op.target || 0;
          hierarchy[unitCode].floors[floorName].lines[lineName] = lineObj;

          hierarchy[unitCode].floors[floorName].total_production += op.production || 0;
          hierarchy[unitCode].floors[floorName].total_target += op.target || 0;
          hierarchy[unitCode].total_production += op.production || 0;
          hierarchy[unitCode].total_target += op.target || 0;
        });
      }

      if (selectedUnit && selectedUnit.trim() !== '' && selectedFloor && selectedFloor.trim() !== '' && memoizedLinesFromApi.length) {
        if (!hierarchy[selectedUnit]) {
          hierarchy[selectedUnit] = {
            name: selectedUnit,
            floors: {},
            total_production: 0,
            total_target: 0,
            efficiency: 0,
          };
        }
        const floorLinesObj: Record<string, RTMSLine> = {};
        let floorProd = 0;
        let floorTarget = 0;
        memoizedLinesFromApi.forEach(l => {
          if (l.line_name && typeof l.line_name === 'string' && l.line_name.trim() !== '') {
            floorLinesObj[l.line_name.trim()] = {
              name: l.line_name.trim(),
              styles: {},
              total_production: l.total_production,
              total_target: l.target,
              efficiency: l.avg_efficiency,
            };
            floorProd += l.total_production;
            floorTarget += l.target;
          }
        });

        hierarchy[selectedUnit].floors[selectedFloor] = {
          name: selectedFloor,
          lines: floorLinesObj,
          total_production: floorProd,
          total_target: floorTarget,
          efficiency: floorTarget > 0 ? (floorProd / floorTarget) * 100 : 0,
        };

        const unitFloors = hierarchy[selectedUnit].floors;
        let unitProd = 0;
        let unitTarget = 0;
        Object.values(unitFloors).forEach(f => {
          unitProd += f.total_production;
          unitTarget += f.total_target;
        });
        hierarchy[selectedUnit].total_production = unitProd;
        hierarchy[selectedUnit].total_target = unitTarget;
        hierarchy[selectedUnit].efficiency = unitTarget > 0 ? (unitProd / unitTarget) * 100 : 0;
      } else {
        Object.keys(hierarchy).forEach(unitCode => {
          const unit = hierarchy[unitCode];
          Object.keys(unit.floors).forEach(floorName => {
            const floor = unit.floors[floorName];
            floor.efficiency = floor.total_target > 0 ? (floor.total_production / floor.total_target) * 100 : 0;
            Object.keys(floor.lines).forEach(lineName => {
              const line = floor.lines[lineName] as RTMSLine;
              line.efficiency = line.total_target > 0 ? (line.total_production / line.total_target) * 100 : 0;
            });
          });
          unit.efficiency = unit.total_target > 0 ? (unit.total_production / unit.total_target) * 100 : 0;
        });
      }

      const underperformers = (Array.isArray(memoizedOperators) ? memoizedOperators : [])
        .filter(op => op.efficiency < 85)
        .map(op => ({
          emp_name: op.emp_name && typeof op.emp_name === 'string' && op.emp_name.trim() !== '' ? op.emp_name.trim() : 'UNKNOWN',
          emp_code: op.emp_code && typeof op.emp_code === 'string' && op.emp_code.trim() !== '' ? op.emp_code.trim() : 'UNKNOWN',
          line_name: op.line_name && typeof op.line_name === 'string' && op.line_name.trim() !== '' ? op.line_name.trim() : 'LINE-DEFAULT',
          unit_code: op.unit_code && typeof op.unit_code === 'string' && op.unit_code.trim() !== '' ? op.unit_code.trim() : 'UNIT-DEFAULT',
          floor_name: op.floor_name && typeof op.floor_name === 'string' && op.floor_name.trim() !== '' ? op.floor_name.trim() : 'FLOOR-DEFAULT',
          operation: op.operation && typeof op.operation === 'string' && op.operation.trim() !== '' ? op.operation.trim() : 'UNKNOWN',
          new_oper_seq: op.new_oper_seq && typeof op.new_oper_seq === 'string' && op.new_oper_seq.trim() !== '' ? op.new_oper_seq.trim() : 'OPERATION-DEFAULT',
          efficiency: op.efficiency,
          production: op.production,
          target: op.target,
        }));

      const totalOperators = memoizedOperators.length;
      const totalProduction = memoizedOperators.reduce((sum, op) => sum + (op.production || 0), 0);
      const totalTarget = memoizedOperators.reduce((sum, op) => sum + (op.target || 0), 0);
      const avgEfficiency = totalOperators > 0 ? memoizedOperators.reduce((sum, op) => sum + (op.efficiency || 0), 0) / totalOperators : 0;

      const ai_insights = underperformers.length > 0
        ? `📈 ${underperformers.length} operators below 85% efficiency require attention.`
        : '📈 All operators performing above efficiency threshold.';

      return {
        hierarchy,
        rtmsData: {
          status: 'success',
          overall_efficiency: memoizedOverview.avg_efficiency || avgEfficiency,
          total_production: memoizedOverview.total_production || totalProduction,
          total_target: memoizedOverview.total_operators ? memoizedOverview.total_operators * 100 : totalTarget,
          underperformers,
          ai_insights,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (err) {
      console.error('Error building hierarchy/rtmsData', err);
      return {
        hierarchy: {},
        rtmsData: null,
      };
    }
  }, [memoizedOverview, memoizedOperators, selectedUnit, selectedFloor, memoizedLinesFromApi]);

  useEffect(() => {
    if (!isEqual(computedData.hierarchy, hierarchyData)) {
      setHierarchyData(computedData.hierarchy);
    }
    if (!isEqual(computedData.rtmsData, rtmsData)) {
      setRtmsData(computedData.rtmsData);
    }
  }, [computedData, hierarchyData, rtmsData]);

  // Time updater
  useEffect(() => {
    const timeTimer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timeTimer);
  }, []);

  // GSAP animations
  useEffect(() => {
    if (headerRef.current && dashboardRef.current) {
      try {
        gsap.fromTo(
          headerRef.current,
          { opacity: 0, y: -50 },
          { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }
        );

        const children = dashboardRef.current.children;
        if (children && children.length) {
          gsap.fromTo(
            children,
            { opacity: 0, y: 30, scale: 0.95 },
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 0.8,
              stagger: 0.08,
              ease: 'back.out(1.7)',
              delay: 0.2,
            }
          );
        }
      } catch (e) {
        console.warn('gsap animation error', e);
      }
    }
  }, []);

  // Error handling fallback
  useEffect(() => {
    if (overviewError || operatorsError || linesError || floorsError) {
      toast({
        title: 'Error',
        description: 'Failed to load some production data. Showing fallback/partial data.',
        variant: 'destructive',
      });

      if (!rtmsData) {
        setRtmsData({
          status: 'success',
          overall_efficiency: 87.5,
          total_production: 2156,
          total_target: 2400,
          underperformers: [
            {
              emp_name: 'Mamma',
              emp_code: '042747',
              line_name: 'S1-1',
              unit_code: 'D15-2',
              floor_name: 'FLOOR-2',
              operation: 'Inside Checking',
              new_oper_seq: 'A10001',
              efficiency: 67.8,
              production: 307,
              target: 453,
            },
          ],
          ai_insights: '📈 Good performance overall with some operators requiring attention.',
          timestamp: new Date().toISOString(),
        });

        setHierarchyData({
          'D15-2': {
            name: 'D15-2',
            floors: {
              'FLOOR-2': {
                name: 'FLOOR-2',
                lines: {
                  'S1-1': {
                    name: 'S1-1',
                    styles: {},
                    total_production: 1250,
                    total_target: 1400,
                    efficiency: 89.3,
                  },
                  'S2-1': {
                    name: 'S2-1',
                    styles: {},
                    total_production: 906,
                    total_target: 1000,
                    efficiency: 90.6,
                  },
                },
                total_production: 2156,
                total_target: 2400,
                efficiency: 89.8,
              },
            },
            total_production: 2156,
            total_target: 2400,
            efficiency: 89.8,
          },
        });
      }
    }
  }, [overviewError, operatorsError, linesError, floorsError, rtmsData]);

  // Helpers: filters & derived data
  const getFilteredData = () => {
    if (!selectedUnit || selectedUnit.trim() === '' || !hierarchyData[selectedUnit]) return null;
    const unit = hierarchyData[selectedUnit];
    if (!selectedFloor || selectedFloor.trim() === '' || !unit.floors[selectedFloor]) return unit;
    const floor = unit.floors[selectedFloor];
    if (!selectedLine || selectedLine.trim() === '' || !floor.lines[selectedLine]) return floor;
    return floor.lines[selectedLine];
  };

  const filteredUnderperformers =
    rtmsData?.underperformers?.filter(emp => !selectedNewOperSeq || emp.new_oper_seq === selectedNewOperSeq) ?? [];

  // Chart data builders
  const getEmployeeEfficiencyBarData = () => {
    if (!rtmsData || !filteredUnderperformers.length) return null;

    const employees = filteredUnderperformers.slice(0, 10);
    const maxProduction = Math.max(...employees.map(emp => emp.production || 0), 0);

    const labels = employees.map(emp => emp.emp_name);
    const efficiencyData = employees.map(emp => {
      const normalizedEff = maxProduction > 0 ? (emp.production / maxProduction) * 100 : emp.efficiency;
      return Math.min(normalizedEff, emp.efficiency);
    });

    const backgroundColors = efficiencyData.map(eff => (eff < 85 ? 'hsl(0, 84%, 60%)' : 'hsl(142, 71%, 45%)'));
    const borderColors = efficiencyData.map(eff => (eff < 85 ? 'hsl(0, 84%, 70%)' : 'hsl(142, 71%, 55%)'));

    return {
      labels,
      datasets: [
        {
          label: 'Efficiency %',
          data: efficiencyData,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 2,
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    };
  };

  const getProductionBarData = () => {
    if (!hierarchyData || !selectedUnit || selectedUnit.trim() === '') return null;
    const unit = hierarchyData[selectedUnit];
    if (!unit) return null;

    if (!selectedFloor || selectedFloor.trim() === '') {
      const floors = Object.values(unit.floors).filter((floor): floor is RTMSFloor => !!floor && floor.name && floor.name.trim() !== '');
      return {
        labels: floors.map(floor => floor.name || 'FLOOR-DEFAULT'),
        datasets: [
          {
            label: 'Production (Pieces)',
            data: floors.map(floor => floor.total_production || 0),
            backgroundColor: floors.map(floor => (floor.efficiency < 85 ? 'hsl(0,84%,60%)' : 'hsl(142,71%,45%)')),
            borderColor: floors.map(floor => (floor.efficiency < 85 ? 'hsl(0,84%,70%)' : 'hsl(142,71%,55%)')),
            borderWidth: 2,
            borderRadius: 6,
            borderSkipped: false,
          },
        ],
      };
    }

    const floor = unit.floors[selectedFloor];
    if (!floor) return null;

    if (!selectedLine || selectedLine.trim() === '') {
      const linesArr = Object.values(floor.lines).filter((line): line is RTMSLine => !!line && line.name && line.name.trim() !== '');
      return {
        labels: linesArr.map(line => line.name || 'LINE-DEFAULT'),
        datasets: [
          {
            label: 'Production (Pieces)',
            data: linesArr.map(line => line.total_production || 0),
            backgroundColor: linesArr.map(line => (line.efficiency < 85 ? 'hsl(0,84%,60%)' : 'hsl(142,71%,45%)')),
            borderColor: linesArr.map(line => (line.efficiency < 85 ? 'hsl(0,84%,70%)' : 'hsl(142,71%,55%)')),
            borderWidth: 2,
            borderRadius: 6,
            borderSkipped: false,
          },
        ],
      };
    }

    return null;
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1200,
      easing: 'easeInOutQuart' as const,
      delay: (context: any) => (context.type === 'data' && context.mode === 'default' ? context.dataIndex * 80 : 0),
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: 'hsl(213, 27%, 84%)',
          padding: 12,
          font: { size: 12, weight: 500 },
        },
      },
      tooltip: {
        backgroundColor: 'hsl(215, 28%, 17%)',
        titleColor: 'hsl(213, 27%, 94%)',
        bodyColor: 'hsl(213, 27%, 84%)',
        borderColor: 'hsl(211, 96%, 48%)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: (context: any) => {
            const value = context.formattedValue;
            const label = context.dataset.label;
            return `${label}: ${value}${label.includes('Efficiency') ? '%' : ' pieces'}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'hsl(220, 30%, 18%)', lineWidth: 1 },
        ticks: { color: 'hsl(0,0%,70%)', font: { size: 11, weight: 400 } },
        border: { color: 'hsl(220,30%,18%)' },
      },
      y: {
        grid: { color: 'hsl(220, 30%, 18%)', lineWidth: 1 },
        ticks: { color: 'hsl(0,0%,70%)', font: { size: 12, weight: 400 } },
        border: { color: 'hsl(220,30%,18%)' },
      },
    },
    interaction: { intersect: false, mode: 'index' as const },
  };

  // Alerts behavior
  const sendWhatsAppAlert = () => {
    const stamp = new Date().toISOString();
    const newAlert: RTMSAlert = {
      type: 'whatsapp',
      severity: 'medium',
      employee: null,
      message: `📲 WhatsApp alerts sent to supervisors for ${filteredUnderperformers.length} underperformers`,
      timestamp: stamp,
    };

    const perEmpAlerts = filteredUnderperformers.slice(0, 5).map(emp => ({
      type: 'individual_whatsapp',
      severity: getSeverity(emp.efficiency),
      employee: emp,
      message: `📲 WhatsApp alert sent for ${emp.emp_name} (${emp.efficiency}%)`,
      timestamp: new Date().toISOString(),
    })) as RTMSAlert[];

    setAlerts(prev => [newAlert, ...perEmpAlerts, ...prev].slice(0, 6));
  };

  // Render loading
  if (overviewLoading || operatorsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto" />
          <p className="text-xl text-primary">Loading Fabric Pulse AI...</p>
          <p className="text-sm text-muted-foreground">Connecting to RTMS data sources</p>
        </div>
      </div>
    );
  }

  // Render main UI
  return (
    <div className="min-h-screen bg-background p-2 sm:p-4 lg:p-6 space-y-4 lg:space-y-6 overflow-x-hidden">
      {/* Header */}
      <motion.div
        ref={headerRef}
        className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-4 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center gap-3 sm:gap-4">
          <motion.div
            animate={{ rotate: 360, scale: [1, 1.06, 1] }}
            transition={{ rotate: { duration: 20, repeat: Infinity, ease: 'linear' }, scale: { duration: 3, repeat: Infinity } }}
          >
            <div className="relative">
              <Cpu className="h-8 w-8 text-primary" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-success rounded-full animate-pulse" />
            </div>
          </motion.div>

          <div>
            <h1 className="text-xl sm:text-2xl lg:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              RTMS Monitoring System
            </h1>
            <p className="text-xs sm:text-sm lg:text-base text-muted-foreground flex items-center gap-2">
              <Database className="h-4 w-4" />
               Powered By Llama 3.2b AI
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <motion.div
            className="text-left sm:text-right bg-card/50 backdrop-blur-sm rounded-lg p-3 border border-primary/20"
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <p className="text-xs text-muted-foreground">System Time</p>
            <p className="text-lg font-mono font-semibold text-primary">{currentTime.toLocaleTimeString()}</p>
            <p className="text-xs text-success">● Live Monitoring</p>
          </motion.div>
        </div>
      </motion.div>

      {/* AI Insights Alert */}
      {rtmsData?.ai_insights && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
          <Alert className="border-primary bg-primary/10 shadow-glow">
            <Cpu className="h-4 w-4" />
            <AlertDescription className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-2">
              <div className="space-y-1">
                <p className="font-semibold text-primary">AI Analysis Insights</p>
                <p className="text-sm">{rtmsData.ai_insights}</p>
              </div>

              {filteredUnderperformers.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={sendWhatsAppAlert}
                  className="shrink-0 animate-pulse-glow border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Send WhatsApp Alerts</span>
                  <span className="sm:hidden">Alert</span>
                </Button>
              )}
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      {/* Filters */}
      <motion.div
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-card/50 backdrop-blur-sm rounded-lg border border-border"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {/* Unit */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" />
            Unit Code
          </label>
          <Select value={selectedUnit} onValueChange={setSelectedUnit}>
            <SelectTrigger className="bg-background/80">
              <SelectValue placeholder="Select Unit" />
            </SelectTrigger>
            <SelectContent>
              {derivedUnits.map(u => (
                <SelectItem key={u} value={u}>
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Floor */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Floor Name</label>
          <Select value={selectedFloor} onValueChange={setSelectedFloor} disabled={!selectedUnit || !derivedFloors.length}>
            <SelectTrigger className="bg-background/80">
              <SelectValue placeholder="Select Floor" />
            </SelectTrigger>
            <SelectContent>
              {derivedFloors.map(f => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Line */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Line Name</label>
          <Select value={selectedLine} onValueChange={setSelectedLine} disabled={!selectedFloor || !derivedLines.length}>
            <SelectTrigger className="bg-background/80">
              <SelectValue placeholder="Select Line" />
            </SelectTrigger>
            <SelectContent>
              {derivedLines.map(l => (
                <SelectItem key={l.line_name} value={l.line_name}>
                  {l.line_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* NewOperSeq */}
        <div className="space-y-2">
          <label className="text-sm font-medium">NewOperSeq</label>
          <Select value={selectedNewOperSeq} onValueChange={setSelectedNewOperSeq} disabled={!selectedLine || !newOperSeqOptions.length}>
            <SelectTrigger className="bg-background/80">
              <SelectValue placeholder="Select NewOperSeq" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL-OPERATIONS">All Operations</SelectItem>
              {newOperSeqOptions.map(seq => (
                <SelectItem key={seq} value={seq}>
                  {seq}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* Dashboard area */}
      <div ref={dashboardRef} className="space-y-4 lg:space-y-6">
        {/* Key metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="shadow-card glass-card border-primary/20 hover:shadow-glow transition-all duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm"><Activity className="h-4 w-4 text-primary" />Total Production</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{rtmsData?.total_production?.toLocaleString() ?? '0'}</div>
                <p className="text-xs text-muted-foreground">pieces produced today</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="shadow-card glass-card border-warning/20 hover:shadow-glow transition-all duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm"><Target className="h-4 w-4 text-warning" />Target</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-warning">{rtmsData?.total_target?.toLocaleString() ?? '0'}</div>
                <p className="text-xs text-muted-foreground">daily target pieces</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className={`shadow-card glass-card hover:shadow-glow transition-all duration-300 ${rtmsData && rtmsData.overall_efficiency >= 90 ? 'border-success/20' : rtmsData && rtmsData.overall_efficiency >= 85 ? 'border-warning/20' : 'border-destructive/20'}`}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  {rtmsData && rtmsData.overall_efficiency >= 85 ? <TrendingUp className="h-4 w-4 text-success" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
                  AI Efficiency
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${rtmsData && rtmsData.overall_efficiency >= 90 ? 'text-success' : rtmsData && rtmsData.overall_efficiency >= 85 ? 'text-warning' : 'text-destructive'}`}>
                  {rtmsData?.overall_efficiency?.toFixed(1) ?? '0'}%
                </div>
                <p className="text-xs text-muted-foreground">overall efficiency</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="shadow-card glass-card border-info/20 hover:shadow-glow transition-all duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm"><Users className="h-4 w-4 text-info" />Underperformers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{filteredUnderperformers.length ?? 0}</div>
                <p className="text-xs text-muted-foreground">below 85% efficiency</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}>
            <Card className="shadow-card glass-card border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary"><BarChart3 className="h-5 w-5" />Employee Efficiency (Real-time)</CardTitle>
                <p className="text-sm text-muted-foreground">Red bars indicate below 85% efficiency threshold</p>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {getEmployeeEfficiencyBarData() ? <Bar data={getEmployeeEfficiencyBarData()!} options={chartOptions} /> : <div className="flex items-center justify-center h-full text-muted-foreground">No efficiency data available</div>}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 }}>
            <Card className="shadow-card glass-card border-success/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-success"><BarChart3 className="h-5 w-5" />Production Distribution</CardTitle>
                <p className="text-sm text-muted-foreground">{selectedFloor ? `Lines in ${selectedFloor}` : selectedUnit ? `Floors in ${selectedUnit}` : 'No selection'}</p>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {getProductionBarData() ? <Bar data={getProductionBarData()!} options={chartOptions} /> : <div className="flex items-center justify-center h-full text-muted-foreground">Select unit to view production distribution</div>}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Underperformers list */}
        {filteredUnderperformers.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
            <Card className="shadow-card glass-card border-destructive/20">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2"><AlertTriangle className="h-5 w-5" />Efficiency Alerts - Immediate Action Required</CardTitle>
                <p className="text-sm text-muted-foreground">Employees below 85% efficiency threshold</p>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {filteredUnderperformers.map((emp, index) => (
                    <motion.div
                      key={`${emp.emp_code}-${index}`}
                      className="flex flex-col lg:flex-row items-start lg:items-center justify-between p-4 border border-destructive/20 rounded-lg bg-destructive/5 backdrop-blur-sm gap-4"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + index * 0.05 }}
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="destructive" className="font-mono">{emp.emp_code}</Badge>
                          <span className="font-semibold text-foreground">{emp.emp_name}</span>
                          <Badge variant="outline" className="text-xs">{emp.efficiency}% efficiency</Badge>
                        </div>

                        <div className="text-sm text-muted-foreground space-y-1">
                          <p><strong>Location:</strong> {emp.unit_code} → {emp.floor_name} → {emp.line_name}</p>
                          <p><strong>Operation:</strong> {emp.operation} ({emp.new_oper_seq})</p>
                          <p><strong>Production:</strong> {emp.production}/{emp.target} pieces</p>
                        </div>
                      </div>

                      <Button
                        variant="destructive"
                        size="sm"
                        className="shrink-0"
                        onClick={() => {
                          const severity = getSeverity(emp.efficiency);
                          const alert: RTMSAlert = {
                            type: 'individual_whatsapp',
                            severity,
                            employee: emp,
                            message: `🚨 WhatsApp alert sent for ${emp.emp_name} (${emp.efficiency}% efficiency) — severity: ${severity}`,
                            timestamp: new Date().toISOString(),
                          };
                          setAlerts(prev => [alert, ...prev].slice(0, 6));
                        }}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Send Alert
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Recent Alerts */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
          <Card className="shadow-card glass-card">
            <CardHeader>
              <CardTitle className="text-primary flex items-center gap-2"><MessageSquare className="h-5 w-5" />Recent Alerts & Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {alerts.length === 0 ? (
                  <motion.div className="text-center py-8 space-y-2" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}>
                    <div className="text-4xl">✅</div>
                    <p className="text-muted-foreground">All systems operational - No alerts</p>
                  </motion.div>
                ) : (
                  alerts.map((alert, idx) => (
                    <motion.div
                      key={`${alert.timestamp}-${idx}`}
                      className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-lg bg-card/50 backdrop-blur-sm gap-2 ${
                        alert.severity === 'high' ? 'border-red-200' : alert.severity === 'medium' ? 'border-yellow-200' : 'border-green-200'
                      }`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1 + idx * 0.05 }}
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <Badge variant={alert.severity === 'high' ? 'destructive' : alert.severity === 'medium' ? 'secondary' : 'default'} className="shrink-0 mt-0.5">
                          {alert.severity.toUpperCase()}
                        </Badge>
                        <div className="space-y-1 min-w-0">
                          <p className="text-sm font-medium truncate">{alert.message}</p>
                          <p className="text-xs text-muted-foreground">{new Date(alert.timestamp).toLocaleString()}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default FabricPulseDashboard;