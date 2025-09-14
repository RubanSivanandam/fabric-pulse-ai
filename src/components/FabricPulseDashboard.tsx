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
  MessageSquare, Factory, Filter, Cpu, BarChart3, Database, Loader2 
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

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement
);

// API Configuration
const API_BASE_URL = 'http://localhost:8000';

// Types for API responses
interface UnderperformerData {
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
  performance_gap?: number;
  alert_priority?: string;
}

interface AIInsights {
  summary: string;
  performance_analysis: {
    best_performing_line?: [string, number];
    worst_performing_line?: [string, number];
    best_performing_operation?: [string, number];
    worst_performing_operation?: [string, number];
    line_averages: Record<string, number>;
    operation_averages: Record<string, number>;
  };
  recommendations: string[];
  ai_model_status: string;
}

interface AIAnalysis {
  status: string;
  overall_efficiency: number;
  total_production: number;
  total_target: number;
  efficiency_data: any[];
  underperformers: UnderperformerData[];
  overperformers: any[];
  performance_categories: Record<string, any[]>;
  ai_insights: AIInsights;
  whatsapp_alerts_needed: boolean;
  analysis_timestamp: string;
  records_analyzed: number;
}

interface HierarchyUnit {
  name: string;
  floors: Record<string, HierarchyFloor>;
  total_production: number;
  total_target: number;
  efficiency: number;
  employee_count: number;
  underperformer_count: number;
}

interface HierarchyFloor {
  name: string;
  lines: Record<string, HierarchyLine>;
  total_production: number;
  total_target: number;
  efficiency: number;
  employee_count: number;
  underperformer_count: number;
}

interface HierarchyLine {
  name: string;
  styles: Record<string, any>;
  total_production: number;
  total_target: number;
  efficiency: number;
  employee_count: number;
  underperformer_count: number;
}

interface AlertData {
  id: string;
  employee: string;
  employee_code: string;
  unit: string;
  floor: string;
  line: string;
  operation: string;
  current_efficiency: number;
  target_efficiency: number;
  gap: number;
  priority: string;
  production: number;
  target: number;
  message: string;
  timestamp: string;
}

const FabricPulseDashboard = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [hierarchyData, setHierarchyData] = useState<Record<string, HierarchyUnit>>({});
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states for hierarchy navigation
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [selectedFloor, setSelectedFloor] = useState<string>('');
  const [selectedLine, setSelectedLine] = useState<string>('');
  
  const headerRef = useRef<HTMLDivElement>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);

  // GSAP Animation setup
  useEffect(() => {
    if (headerRef.current && dashboardRef.current && aiAnalysis) {
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
  }, [aiAnalysis]);

  // API Functions
  const fetchAnalysisData = async (): Promise<{ aiAnalysis: AIAnalysis; hierarchy: Record<string, HierarchyUnit> } | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/rtms/analyze`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      if (data.status === 'success') {
        return {
          aiAnalysis: data.data.ai_analysis,
          hierarchy: data.data.hierarchy
        };
      } else {
        throw new Error(data.message || 'Failed to fetch analysis data');
      }
    } catch (error) {
      console.error('Error fetching analysis data:', error);
      throw error;
    }
  };

  const fetchAlertsData = async (): Promise<AlertData[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/rtms/alerts`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.alerts || [];
    } catch (error) {
      console.error('Error fetching alerts data:', error);
      return [];
    }
  };

  // Main data fetching function
  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching data from backend...');
      
      // Fetch analysis data
      const analysisResult = await fetchAnalysisData();
      if (analysisResult) {
        setAiAnalysis(analysisResult.aiAnalysis);
        setHierarchyData(analysisResult.hierarchy);
        console.log('Analysis data loaded:', analysisResult.aiAnalysis);
      }

      // Fetch alerts data
      const alertsData = await fetchAlertsData();
      setAlerts(alertsData);
      console.log('Alerts data loaded:', alertsData);

    } catch (error) {
      console.error('Failed to fetch data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch data from backend');
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch and periodic updates
  useEffect(() => {
    // Initial fetch
    fetchAllData();
    
    // Set up periodic updates every 10 minutes
    const timer = setInterval(fetchAllData, 10 * 60 * 1000);
    
    // Update time display every second
    const timeTimer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      clearInterval(timer);
      clearInterval(timeTimer);
    };
  }, []);

  // Generate bar chart data for employee efficiency
  const getEmployeeEfficiencyBarData = () => {
    if (!aiAnalysis?.underperformers || aiAnalysis.underperformers.length === 0) {
      return null;
    }
    
    const employees = aiAnalysis.underperformers.slice(0, 10);
    const labels = employees.map(emp => emp.emp_name);
    const efficiencyData = employees.map(emp => emp.efficiency);
    
    const backgroundColors = efficiencyData.map(eff => 
      eff < 85 ? 'hsl(0, 84%, 60%)' : 'hsl(142, 71%, 45%)'
    );
    
    const borderColors = efficiencyData.map(eff => 
      eff < 85 ? 'hsl(0, 84%, 70%)' : 'hsl(142, 71%, 55%)'
    );
    
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
        }
      ]
    };
  };

  // Generate production distribution bar chart
  const getProductionBarData = () => {
    if (!hierarchyData || !selectedUnit) return null;
    
    const unit = hierarchyData[selectedUnit];
    if (!unit) return null;
    
    if (!selectedFloor) {
      // Show floor distribution
      const floors = Object.values(unit.floors);
      return {
        labels: floors.map(floor => floor.name),
        datasets: [{
          label: 'Production (Pieces)',
          data: floors.map(floor => floor.total_production),
          backgroundColor: floors.map(floor => 
            floor.efficiency < 85 ? 'hsl(0, 84%, 60%)' : 'hsl(142, 71%, 45%)'
          ),
          borderColor: floors.map(floor => 
            floor.efficiency < 85 ? 'hsl(0, 84%, 70%)' : 'hsl(142, 71%, 55%)'
          ),
          borderWidth: 2,
          borderRadius: 6,
          borderSkipped: false,
        }]
      };
    }
    
    const floor = unit.floors[selectedFloor];
    if (!floor || !selectedLine) {
      // Show line distribution
      const lines = Object.values(floor.lines);
      return {
        labels: lines.map(line => line.name),
        datasets: [{
          label: 'Production (Pieces)',
          data: lines.map(line => line.total_production),
          backgroundColor: lines.map(line => 
            line.efficiency < 85 ? 'hsl(0, 84%, 60%)' : 'hsl(142, 71%, 45%)'
          ),
          borderColor: lines.map(line => 
            line.efficiency < 85 ? 'hsl(0, 84%, 70%)' : 'hsl(142, 71%, 55%)'
          ),
          borderWidth: 2,
          borderRadius: 6,
          borderSkipped: false,
        }]
      };
    }
    
    return null;
  };

  const sendWhatsAppAlert = async () => {
    // Simulate WhatsApp notification for underperformers
    const newAlert = {
      id: Date.now().toString(),
      type: 'whatsapp',
      severity: 'medium',
      employee: null,
      message: 'WhatsApp alerts sent to supervisors for all underperforming employees',
      timestamp: new Date().toISOString()
    };
    setRecentNotifications(prev => [newAlert, ...prev.slice(0, 4)]);
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 2000,
      easing: 'easeInOutQuart' as const,
      delay: (context: any) => {
        return context.type === 'data' && context.mode === 'default'
          ? context.dataIndex * 100
          : 0;
      },
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: 'hsl(213, 27%, 84%)',
          padding: 20,
          font: {
            size: 12,
            weight: 500
          },
          usePointStyle: true,
          pointStyle: 'rectRounded',
        }
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
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'hsl(220, 30%, 18%)',
          lineWidth: 1,
        },
        ticks: {
          color: 'hsl(0, 0%, 70%)',
          font: {
            size: 11,
            weight: 400
          },
          maxRotation: 45,
        },
        border: {
          color: 'hsl(220, 30%, 18%)'
        }
      },
      y: {
        grid: {
          color: 'hsl(220, 30%, 18%)',
          lineWidth: 1,
        },
        ticks: {
          color: 'hsl(0, 0%, 70%)',
          font: {
            size: 12,
            weight: 400
          }
        },
        border: {
          color: 'hsl(220, 30%, 18%)'
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index' as const
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
          </div>
          <p className="text-xl text-primary">Loading Fabric Pulse AI...</p>
          <p className="text-sm text-muted-foreground">Connecting to RTMS database</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Connection Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={fetchAllData} className="w-full">
              <Database className="h-4 w-4 mr-2" />
              Retry Connection
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No data state
  if (!aiAnalysis) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-muted-foreground" />
              No Data Available
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              No production data available from the database. Please check if the backend service is running and data exists.
            </p>
            <Button onClick={fetchAllData} className="w-full">
              <Database className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
          </CardContent>
        </Card>
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
              Real-Time Monitoring System • Live Data
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
            <p className="text-xs text-success">● Live Data</p>
          </motion.div>
          <Button 
            onClick={fetchAllData}
            variant="outline"
            size="sm"
            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
          >
            <Database className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </div>
      </motion.div>

      {/* AI Insights Alert */}
      {aiAnalysis?.ai_insights && (
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
                <p className="text-sm">{aiAnalysis.ai_insights.summary}</p>
                {aiAnalysis.ai_insights.recommendations.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    <strong>Recommendations:</strong> {aiAnalysis.ai_insights.recommendations.slice(0, 2).join(', ')}
                  </div>
                )}
              </div>
              {(alerts.length > 0 || aiAnalysis.underperformers.length > 0) && (
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
          <label className="text-sm font-medium">Data Status</label>
          <div className="bg-background/80 rounded-md p-2 text-sm">
            <div className="text-success">● {aiAnalysis.records_analyzed} records</div>
            <div className="text-xs text-muted-foreground">
              {new Date(aiAnalysis.analysis_timestamp).toLocaleTimeString()}
            </div>
          </div>
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
                  {aiAnalysis.total_production?.toLocaleString() || '0'}
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
                  {aiAnalysis.total_target?.toLocaleString() || '0'}
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
            <Card className={`shadow-card glass-card border-${aiAnalysis.overall_efficiency >= 90 ? 'success' : aiAnalysis.overall_efficiency >= 85 ? 'warning' : 'destructive'}/20 hover:shadow-glow transition-all duration-300`}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  {aiAnalysis.overall_efficiency >= 85 ? (
                    <TrendingUp className="h-4 w-4 text-success" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-destructive" />
                  )}
                  AI Efficiency
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${aiAnalysis.overall_efficiency >= 90 ? 'text-success' : aiAnalysis.overall_efficiency >= 85 ? 'text-warning' : 'text-destructive'}`}>
                  {aiAnalysis.overall_efficiency?.toFixed(1) || '0'}%
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
                  {aiAnalysis.underperformers?.length || '0'}
                </div>
                <p className="text-xs text-muted-foreground">below 85% efficiency</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
          {/* Employee Efficiency Bar Chart */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="shadow-card glass-card border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <BarChart3 className="h-5 w-5" />
                  Employee Efficiency (Real-time)
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Red bars indicate below 85% efficiency threshold
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {getEmployeeEfficiencyBarData() ? (
                    <Bar data={getEmployeeEfficiencyBarData()!} options={chartOptions} />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No efficiency data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Production Distribution Bar Chart */}
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
                  {getProductionBarData() ? (
                    <Bar data={getProductionBarData()!} options={chartOptions} />
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
        {aiAnalysis && aiAnalysis.underperformers && aiAnalysis.underperformers.length > 0 && (
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
                  {aiAnalysis.underperformers.map((emp, index) => (
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
                          {emp.alert_priority && (
                            <Badge variant={emp.alert_priority === 'HIGH' ? 'destructive' : 'secondary'} className="text-xs">
                              {emp.alert_priority}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p><strong>Location:</strong> {emp.unit_code} → {emp.floor_name} → {emp.line_name}</p>
                          <p><strong>Operation:</strong> {emp.operation} ({emp.new_oper_seq})</p>
                          <p><strong>Production:</strong> {emp.production}/{emp.target} pieces</p>
                          {emp.performance_gap && (
                            <p><strong>Performance Gap:</strong> {emp.performance_gap.toFixed(1)}% below target</p>
                          )}
                        </div>
                      </div>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        className="shrink-0"
                        onClick={() => {
                          const alert = {
                            id: Date.now().toString(),
                            type: 'individual_whatsapp',
                            severity: 'high',
                            employee: emp,
                            message: `WhatsApp alert sent for ${emp.emp_name} (${emp.efficiency}% efficiency)`,
                            timestamp: new Date().toISOString()
                          };
                          setRecentNotifications(prev => [alert, ...prev.slice(0, 4)]);
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
                {(recentNotifications.length === 0 && alerts.length === 0) ? (
                  <motion.div 
                    className="text-center py-8 space-y-2"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <div className="text-4xl">✅</div>
                    <p className="text-muted-foreground">All systems operational - No alerts</p>
                  </motion.div>
                ) : (
                  [...recentNotifications, ...alerts.slice(0, 5)].map((alert, index) => (
                    <motion.div 
                      key={`${alert.timestamp}-${index}`}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-lg bg-card/50 backdrop-blur-sm gap-2"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1 + (index * 0.1) }}
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <Badge 
                          variant={alert.priority === 'HIGH' || alert.severity === 'high' ? 'destructive' : alert.priority === 'MEDIUM' || alert.severity === 'medium' ? 'secondary' : 'default'}
                          className="shrink-0 mt-0.5"
                        >
                          {alert.type || 'alert'}
                        </Badge>
                        <div className="space-y-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {alert.message || `${alert.employee} - ${alert.current_efficiency}% efficiency`}
                          </p>
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