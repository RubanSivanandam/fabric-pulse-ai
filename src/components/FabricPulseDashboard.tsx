import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, AlertTriangle, Users, Target, TrendingUp, TrendingDown, 
  MessageSquare, Factory, Filter, Cpu, BarChart3, Database 
} from 'lucide-react';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// Types for RTMS data structure
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

interface RTMSAlert {
  type: string;
  severity: string;
  employee: any;
  message: string;
  timestamp: string;
}

const FabricPulseDashboard = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [rtmsData, setRtmsData] = useState<RTMSAnalysis | null>(null);
  const [hierarchyData, setHierarchyData] = useState<RTMSHierarchy>({});
  const [alerts, setAlerts] = useState<RTMSAlert[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states for hierarchy navigation
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [selectedFloor, setSelectedFloor] = useState<string>('');
  const [selectedLine, setSelectedLine] = useState<string>('');
  const [selectedStyle, setSelectedStyle] = useState<string>('');
  
  const headerRef = useRef<HTMLDivElement>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);

  // GSAP Animation setup
  useEffect(() => {
    if (headerRef.current && dashboardRef.current) {
      gsap.fromTo(
        headerRef.current,
        { opacity: 0, y: -50 },
        { opacity: 1, y: 0, duration: 1, ease: "power3.out" }
      );

      gsap.fromTo(
        dashboardRef.current.children,
        { opacity: 0, y: 30, scale: 0.95 },
        { 
          opacity: 1, 
          y: 0, 
          scale: 1,
          duration: 0.8, 
          stagger: 0.1,
          ease: "back.out(1.7)",
          delay: 0.3
        }
      );
    }
  }, [rtmsData]);

  // Fetch RTMS data every 10 minutes
  useEffect(() => {
    const fetchRTMSData = async () => {
      try {
        setLoading(true);
        
        // Fetch production analysis
        const analysisResponse = await fetch('http://localhost:8000/api/rtms/analyze');
        const analysisData = await analysisResponse.json();
        
        if (analysisData.status === 'success') {
          setRtmsData(analysisData.data.ai_analysis);
          setHierarchyData(analysisData.data.hierarchy);
        }
        
        // Fetch alerts
        const alertsResponse = await fetch('http://localhost:8000/api/rtms/alerts');
        const alertsData = await alertsResponse.json();
        
        if (alertsData.status === 'success') {
          setAlerts(alertsData.alerts);
        }
        
      } catch (error) {
        console.error('Failed to fetch RTMS data:', error);
        // Use mock data for development
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
              target: 453
            }
          ],
          ai_insights: '📈 Good performance overall with 3 operators requiring attention for efficiency improvement.',
          timestamp: new Date().toISOString()
        });
        
        // Mock hierarchy data
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
                    efficiency: 89.3
                  },
                  'S2-1': {
                    name: 'S2-1',
                    styles: {},
                    total_production: 906,
                    total_target: 1000,
                    efficiency: 90.6
                  }
                },
                total_production: 2156,
                total_target: 2400,
                efficiency: 89.8
              }
            },
            total_production: 2156,
            total_target: 2400,
            efficiency: 89.8
          }
        });
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchRTMSData();
    
    // Set up timer for real-time updates every 10 minutes
    const timer = setInterval(fetchRTMSData, 10 * 60 * 1000);
    
    // Update time display every second
    const timeTimer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      clearInterval(timer);
      clearInterval(timeTimer);
    };
  }, []);

  // Get filtered data based on current selection
  const getFilteredData = () => {
    if (!selectedUnit || !hierarchyData[selectedUnit]) return null;
    
    const unit = hierarchyData[selectedUnit];
    if (!selectedFloor || !unit.floors[selectedFloor]) return unit;
    
    const floor = unit.floors[selectedFloor];
    if (!selectedLine || !floor.lines[selectedLine]) return floor;
    
    return floor.lines[selectedLine];
  };

  // Generate pie chart data for efficiency distribution
  const getEfficiencyPieData = () => {
    if (!rtmsData) return null;
    
    const filteredData = getFilteredData();
    if (!filteredData) return null;
    
    // Calculate efficiency ranges
    const excellent = filteredData.efficiency >= 95 ? 1 : 0;
    const good = filteredData.efficiency >= 85 && filteredData.efficiency < 95 ? 1 : 0;
    const needs_improvement = filteredData.efficiency < 85 ? 1 : 0;
    
    return {
      labels: ['Excellent (95%+)', 'Good (85-94%)', 'Needs Improvement (<85%)'],
      datasets: [
        {
          data: [excellent, good, needs_improvement],
          backgroundColor: [
            'hsl(142, 71%, 45%)', // Success green
            'hsl(45, 93%, 47%)',   // Warning yellow  
            'hsl(0, 84%, 60%)'     // Destructive red
          ],
          borderColor: [
            'hsl(142, 71%, 55%)',
            'hsl(45, 93%, 57%)',
            'hsl(0, 84%, 70%)'
          ],
          borderWidth: 2,
          hoverOffset: 8
        }
      ]
    };
  };

  // Generate production distribution pie chart
  const getProductionPieData = () => {
    if (!hierarchyData || !selectedUnit) return null;
    
    const unit = hierarchyData[selectedUnit];
    if (!selectedFloor) {
      // Show floor distribution
      const floors = Object.values(unit.floors);
      return {
        labels: floors.map(floor => floor.name),
        datasets: [{
          data: floors.map(floor => floor.total_production),
          backgroundColor: floors.map((_, i) => `hsl(${210 + i * 30}, 70%, 55%)`),
          borderColor: floors.map((_, i) => `hsl(${210 + i * 30}, 70%, 65%)`),
          borderWidth: 2,
          hoverOffset: 8
        }]
      };
    }
    
    const floor = unit.floors[selectedFloor];
    if (!selectedLine) {
      // Show line distribution
      const lines = Object.values(floor.lines);
      return {
        labels: lines.map(line => line.name),
        datasets: [{
          data: lines.map(line => line.total_production),
          backgroundColor: lines.map((_, i) => `hsl(${210 + i * 40}, 70%, 55%)`),
          borderColor: lines.map((_, i) => `hsl(${210 + i * 40}, 70%, 65%)`),
          borderWidth: 2,
          hoverOffset: 8
        }]
      };
    }
    
    return null;
  };

  const sendWhatsAppAlert = () => {
    // Simulate WhatsApp notification for underperformers
    const newAlert: RTMSAlert = {
      type: 'whatsapp',
      severity: 'medium',
      employee: null,
      message: 'WhatsApp alerts sent to supervisors for all underperforming employees',
      timestamp: new Date().toISOString()
    };
    setAlerts(prev => [newAlert, ...prev.slice(0, 4)]);
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: 'hsl(213, 27%, 84%)',
          padding: 20,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'hsl(215, 28%, 17%)',
        titleColor: 'hsl(213, 27%, 94%)',
        bodyColor: 'hsl(213, 27%, 84%)',
        borderColor: 'hsl(211, 96%, 48%)',
        borderWidth: 1
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
          <p className="text-xl text-primary">Loading Fabric Pulse AI...</p>
          <p className="text-sm text-muted-foreground">Connecting to RTMS database</p>
        </div>
      </div>
    );
  }

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
            animate={{ 
              rotate: 360,
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              rotate: { duration: 20, repeat: Infinity, ease: "linear" },
              scale: { duration: 2, repeat: Infinity }
            }}
          >
            <div className="relative">
              <Cpu className="h-8 w-8 text-primary" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-success rounded-full animate-pulse"></div>
            </div>
          </motion.div>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Fabric Pulse AI
            </h1>
            <p className="text-xs sm:text-sm lg:text-base text-muted-foreground flex items-center gap-2">
              <Database className="h-4 w-4" />
              Real-Time Monitoring System • Llama 3.2b AI
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
            <p className="text-lg font-mono font-semibold text-primary">
              {currentTime.toLocaleTimeString()}
            </p>
            <p className="text-xs text-success">● Live Monitoring</p>
          </motion.div>
        </div>
      </motion.div>

      {/* AI Insights Alert */}
      {rtmsData?.ai_insights && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Alert className="border-primary bg-primary/10 shadow-glow">
            <Cpu className="h-4 w-4" />
            <AlertDescription className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-2">
              <div className="space-y-1">
                <p className="font-semibold text-primary">AI Analysis Insights</p>
                <p className="text-sm">{rtmsData.ai_insights}</p>
              </div>
              {alerts.filter(a => a.type !== 'whatsapp').length > 0 && (
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

      {/* Hierarchy Filters */}
      <motion.div
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-card/50 backdrop-blur-sm rounded-lg border border-border"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
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
              {Object.keys(hierarchyData).map(unit => (
                <SelectItem key={unit} value={unit}>{unit}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Floor Name</label>
          <Select 
            value={selectedFloor} 
            onValueChange={setSelectedFloor}
            disabled={!selectedUnit}
          >
            <SelectTrigger className="bg-background/80">
              <SelectValue placeholder="Select Floor" />
            </SelectTrigger>
            <SelectContent>
              {selectedUnit && hierarchyData[selectedUnit] && 
                Object.keys(hierarchyData[selectedUnit].floors).map(floor => (
                  <SelectItem key={floor} value={floor}>{floor}</SelectItem>
                ))
              }
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Line Name</label>
          <Select 
            value={selectedLine} 
            onValueChange={setSelectedLine}
            disabled={!selectedFloor}
          >
            <SelectTrigger className="bg-background/80">
              <SelectValue placeholder="Select Line" />
            </SelectTrigger>
            <SelectContent>
              {selectedUnit && selectedFloor && hierarchyData[selectedUnit]?.floors[selectedFloor] &&
                Object.keys(hierarchyData[selectedUnit].floors[selectedFloor].lines).map(line => (
                  <SelectItem key={line} value={line}>{line}</SelectItem>
                ))
              }
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Style No</label>
          <Select 
            value={selectedStyle} 
            onValueChange={setSelectedStyle}
            disabled={!selectedLine}
          >
            <SelectTrigger className="bg-background/80">
              <SelectValue placeholder="Select Style" />
            </SelectTrigger>
            <SelectContent>
              {selectedUnit && selectedFloor && selectedLine && 
                hierarchyData[selectedUnit]?.floors[selectedFloor]?.lines[selectedLine] &&
                Object.keys(hierarchyData[selectedUnit].floors[selectedFloor].lines[selectedLine].styles).map(style => (
                  <SelectItem key={style} value={style}>{style}</SelectItem>
                ))
              }
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      <div ref={dashboardRef} className="space-y-4 lg:space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="shadow-card glass-card border-primary/20 hover:shadow-glow transition-all duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Activity className="h-4 w-4 text-primary" />
                  Total Production
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {rtmsData?.total_production?.toLocaleString() || '0'}
                </div>
                <p className="text-xs text-muted-foreground">pieces produced today</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="shadow-card glass-card border-warning/20 hover:shadow-glow transition-all duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Target className="h-4 w-4 text-warning" />
                  Target
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-warning">
                  {rtmsData?.total_target?.toLocaleString() || '0'}
                </div>
                <p className="text-xs text-muted-foreground">daily target pieces</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className={`shadow-card glass-card border-${rtmsData && rtmsData.overall_efficiency >= 90 ? 'success' : rtmsData && rtmsData.overall_efficiency >= 85 ? 'warning' : 'destructive'}/20 hover:shadow-glow transition-all duration-300`}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  {rtmsData && rtmsData.overall_efficiency >= 85 ? (
                    <TrendingUp className="h-4 w-4 text-success" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-destructive" />
                  )}
                  AI Efficiency
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${rtmsData && rtmsData.overall_efficiency >= 90 ? 'text-success' : rtmsData && rtmsData.overall_efficiency >= 85 ? 'text-warning' : 'text-destructive'}`}>
                  {rtmsData?.overall_efficiency?.toFixed(1) || '0'}%
                </div>
                <p className="text-xs text-muted-foreground">overall efficiency</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="shadow-card glass-card border-info/20 hover:shadow-glow transition-all duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-info" />
                  Underperformers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {rtmsData?.underperformers?.length || '0'}
                </div>
                <p className="text-xs text-muted-foreground">below 85% efficiency</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
          {/* Efficiency Distribution Pie Chart */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="shadow-card glass-card border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <BarChart3 className="h-5 w-5" />
                  Efficiency Distribution (Real-time)
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {selectedUnit ? `${selectedUnit}${selectedFloor ? ` > ${selectedFloor}` : ''}${selectedLine ? ` > ${selectedLine}` : ''}` : 'All Units'}
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {getEfficiencyPieData() ? (
                    <Pie data={getEfficiencyPieData()!} options={chartOptions} />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      Select unit and filters to view efficiency distribution
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Production Distribution Pie Chart */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="shadow-card glass-card border-success/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-success">
                  <BarChart3 className="h-5 w-5" />
                  Production Distribution
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {selectedFloor ? `Lines in ${selectedFloor}` : selectedUnit ? `Floors in ${selectedUnit}` : 'No selection'}
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {getProductionPieData() ? (
                    <Pie data={getProductionPieData()!} options={chartOptions} />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      Select unit to view production distribution
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Underperformers List */}
        {rtmsData && rtmsData.underperformers && rtmsData.underperformers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Card className="shadow-card glass-card border-destructive/20">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Efficiency Alerts - Immediate Action Required
                </CardTitle>
                <p className="text-sm text-muted-foreground">Employees below 85% efficiency threshold</p>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {rtmsData.underperformers.map((emp, index) => (
                    <motion.div
                      key={`${emp.emp_code}-${index}`}
                      className="flex flex-col lg:flex-row items-start lg:items-center justify-between p-4 border border-destructive/20 rounded-lg bg-destructive/5 backdrop-blur-sm gap-4"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + (index * 0.1) }}
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="destructive" className="font-mono">
                            {emp.emp_code}
                          </Badge>
                          <span className="font-semibold text-foreground">{emp.emp_name}</span>
                          <Badge variant="outline" className="text-xs">
                            {emp.efficiency}% efficiency
                          </Badge>
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
                          // Individual WhatsApp alert
                          const alert: RTMSAlert = {
                            type: 'individual_whatsapp',
                            severity: 'high',
                            employee: emp,
                            message: `WhatsApp alert sent for ${emp.emp_name} (${emp.efficiency}% efficiency)`,
                            timestamp: new Date().toISOString()
                          };
                          setAlerts(prev => [alert, ...prev.slice(0, 4)]);
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <Card className="shadow-card glass-card">
            <CardHeader>
              <CardTitle className="text-primary flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Recent Alerts & Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {alerts.length === 0 ? (
                  <motion.div 
                    className="text-center py-8 space-y-2"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <div className="text-4xl">✅</div>
                    <p className="text-muted-foreground">All systems operational - No alerts</p>
                  </motion.div>
                ) : (
                  alerts.map((alert, index) => (
                    <motion.div 
                      key={`${alert.timestamp}-${index}`}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-lg bg-card/50 backdrop-blur-sm gap-2"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1 + (index * 0.1) }}
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <Badge 
                          variant={alert.severity === 'high' ? 'destructive' : alert.severity === 'medium' ? 'secondary' : 'default'}
                          className="shrink-0 mt-0.5"
                        >
                          {alert.type}
                        </Badge>
                        <div className="space-y-1 min-w-0">
                          <p className="text-sm font-medium truncate">{alert.message}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(alert.timestamp).toLocaleString()}
                          </p>
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