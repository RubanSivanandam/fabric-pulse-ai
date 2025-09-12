import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Activity, AlertTriangle, Users, Target, TrendingUp, TrendingDown, MessageSquare, Factory } from 'lucide-react';
import AnimatedBarChart from './AnimatedBarChart';
import AnimatedMetricCard from './AnimatedMetricCard';

interface ProductionData {
  time: string;
  actual: number;
  target: number;
  efficiency: number;
}

interface OperatorData {
  id: string;
  name: string;
  production: number;
  target: number;
  efficiency: number;
  status: 'active' | 'absent' | 'underperforming';
}

interface LineData {
  line: string;
  unit: string;
  operation: string;
  current: number;
  target: number;
  efficiency: number;
  operators: OperatorData[];
}

const ProductionDashboard = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [productionData, setProductionData] = useState<ProductionData[]>([]);
  const [alerts, setAlerts] = useState<Array<{id: string, type: string, message: string, time: string}>>([]);
  const [linesData, setLinesData] = useState<LineData[]>([]);
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
  }, [linesData]);

  // Simulate real-time data updates
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      
      // Generate realistic production data
      const newDataPoint = {
        time: new Date().toLocaleTimeString(),
        actual: Math.floor(Math.random() * 100) + 650, // 650-750 pieces
        target: 800,
        efficiency: Math.floor(Math.random() * 30) + 70 // 70-100% efficiency
      };

      setProductionData(prev => [...prev.slice(-9), newDataPoint]);

      // Check for alerts (below 85% target)
      if (newDataPoint.efficiency < 85) {
        const alertId = Date.now().toString();
        const newAlert = {
          id: alertId,
          type: 'performance',
          message: `Line A-1 production below 85% target (${newDataPoint.efficiency}%)`,
          time: new Date().toLocaleTimeString()
        };
        setAlerts(prev => [newAlert, ...prev.slice(0, 4)]);
      }
    }, 10000); // Update every 10 seconds for demo

    // Initialize with some data
    const initialData = Array.from({ length: 10 }, (_, i) => ({
      time: new Date(Date.now() - (9 - i) * 600000).toLocaleTimeString(),
      actual: Math.floor(Math.random() * 100) + 650,
      target: 800,
      efficiency: Math.floor(Math.random() * 30) + 70
    }));
    setProductionData(initialData);

    // Initialize lines data
    setLinesData([
      {
        line: 'A-1',
        unit: 'Unit-1',
        operation: 'Cutting',
        current: 742,
        target: 800,
        efficiency: 92.8,
        operators: [
          { id: '001', name: 'Rajesh Kumar', production: 95, target: 100, efficiency: 95, status: 'active' },
          { id: '002', name: 'Priya Singh', production: 88, target: 100, efficiency: 88, status: 'active' },
          { id: '003', name: 'Amit Sharma', production: 0, target: 100, efficiency: 0, status: 'absent' },
        ]
      },
      {
        line: 'A-2',
        unit: 'Unit-1', 
        operation: 'Sewing',
        current: 623,
        target: 750,
        efficiency: 83.1,
        operators: [
          { id: '004', name: 'Sunita Devi', production: 76, target: 100, efficiency: 76, status: 'underperforming' },
          { id: '005', name: 'Ravi Patel', production: 92, target: 100, efficiency: 92, status: 'active' },
        ]
      },
      {
        line: 'B-1',
        unit: 'Unit-2',
        operation: 'Finishing',
        current: 891,
        target: 850,
        efficiency: 104.8,
        operators: [
          { id: '006', name: 'Meera Joshi', production: 105, target: 100, efficiency: 105, status: 'active' },
          { id: '007', name: 'Kiran Reddy', production: 98, target: 100, efficiency: 98, status: 'active' },
        ]
      }
    ]);

    return () => clearInterval(timer);
  }, []);

  const totalProduction = linesData.reduce((sum, line) => sum + line.current, 0);
  const totalTarget = linesData.reduce((sum, line) => sum + line.target, 0);
  const overallEfficiency = Math.round((totalProduction / totalTarget) * 100);

  // Prepare data for animated bar chart
  const chartData = {
    labels: linesData.map(line => `Line ${line.line}`),
    datasets: [
      {
        label: 'Current Production',
        data: linesData.map(line => line.current),
        backgroundColor: 'hsla(214, 100%, 65%, 0.8)',
        borderColor: 'hsl(214, 100%, 65%)',
        borderWidth: 2,
      },
      {
        label: 'Target Production',
        data: linesData.map(line => line.target),
        backgroundColor: 'hsla(45, 100%, 60%, 0.8)',
        borderColor: 'hsl(45, 100%, 60%)',
        borderWidth: 2,
      }
    ]
  };

  const efficiencyChartData = {
    labels: linesData.map(line => `Line ${line.line}`),
    datasets: [
      {
        label: 'Efficiency %',
        data: linesData.map(line => line.efficiency),
        backgroundColor: 'hsla(214, 100%, 65%, 0.8)',
        borderColor: 'hsl(214, 100%, 65%)',
        borderWidth: 2,
      }
    ]
  };

  const sendWhatsAppAlert = () => {
    // Simulate WhatsApp notification
    const alert = {
      id: Date.now().toString(),
      type: 'whatsapp',
      message: 'WhatsApp alert sent to management team',
      time: new Date().toLocaleTimeString()
    };
    setAlerts(prev => [alert, ...prev.slice(0, 4)]);
  };

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4 lg:p-6 space-y-4 lg:space-y-6 overflow-x-hidden">
      {/* Header */}
      <motion.div 
        ref={headerRef}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center gap-3 sm:gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <Factory className="h-6 w-6 sm:h-8 sm:w-8 text-primary glow-effect" />
          </motion.div>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Production AI Monitor
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Real-time garment production tracking & alerts</p>
          </div>
        </div>
        <motion.div 
          className="text-left sm:text-right"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <p className="text-xs sm:text-sm text-muted-foreground">Current Time</p>
          <p className="text-lg sm:text-xl font-semibold text-primary">{currentTime.toLocaleTimeString()}</p>
        </motion.div>
      </motion.div>

      {/* Alert Section */}
      {alerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Alert className="border-destructive bg-destructive/10 shadow-alert">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <span className="text-sm">{alerts[0].message}</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={sendWhatsAppAlert}
                className="shrink-0 animate-pulse-glow"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Send WhatsApp Alert</span>
                <span className="sm:hidden">Alert</span>
              </Button>
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      <div ref={dashboardRef} className="space-y-4 lg:space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <AnimatedMetricCard
            title="Total Production"
            value={totalProduction.toLocaleString()}
            subtitle="pieces produced today"
            icon={Activity}
            color="primary"
            trend={totalProduction > totalTarget ? "up" : "down"}
            trendValue={`${Math.abs(((totalProduction - totalTarget) / totalTarget * 100)).toFixed(1)}%`}
            delay={0.1}
          />
          <AnimatedMetricCard
            title="Target"
            value={totalTarget.toLocaleString()}
            subtitle="daily target pieces"
            icon={Target}
            color="warning"
            delay={0.2}
          />
          <AnimatedMetricCard
            title="Efficiency"
            value={`${overallEfficiency}%`}
            subtitle="overall efficiency"
            icon={overallEfficiency >= 85 ? TrendingUp : TrendingDown}
            color={overallEfficiency >= 90 ? "success" : overallEfficiency >= 85 ? "warning" : "danger"}
            trend={overallEfficiency >= 85 ? "up" : "down"}
            trendValue={`${Math.abs(overallEfficiency - 85)}%`}
            delay={0.3}
          />
          <AnimatedMetricCard
            title="Active Lines"
            value={linesData.length}
            subtitle="production lines active"
            icon={Users}
            color="info"
            delay={0.4}
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
          {/* Production Comparison */}
          <AnimatedBarChart
            data={chartData}
            title="Production vs Target (Real-time)"
            height={350}
            className="animate-fade-in-up"
            options={{
              plugins: {
                legend: {
                  position: 'top',
                },
              },
              scales: {
                y: {
                  beginAtZero: true,
                  title: {
                    display: true,
                    text: 'Pieces',
                    color: 'hsl(0, 0%, 70%)'
                  }
                }
              }
            }}
          />

          {/* Efficiency Chart */}
          <AnimatedBarChart
            data={efficiencyChartData}
            title="Line Efficiency Performance"
            height={350}
            className="animate-fade-in-up"
            options={{
              plugins: {
                legend: {
                  display: false,
                },
              },
              scales: {
                y: {
                  beginAtZero: true,
                  max: 110,
                  title: {
                    display: true,
                    text: 'Efficiency %',
                    color: 'hsl(0, 0%, 70%)'
                  }
                }
              }
            }}
          />
        </div>

        {/* Production Lines Detail */}
        <div className="space-y-4">
          <motion.h2 
            className="text-lg sm:text-xl lg:text-2xl font-semibold text-primary"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            Production Lines Status
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
            {linesData.map((line, index) => (
              <motion.div
                key={line.line}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.6 + (index * 0.1), duration: 0.5 }}
                whileHover={{ 
                  scale: 1.02,
                  transition: { duration: 0.2 }
                }}
              >
                <Card className="shadow-card glass-card border-2 hover:shadow-glow transition-all duration-300">
                  <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                        <span className="text-primary font-bold">Line {line.line}</span>
                        <Badge 
                          variant={line.efficiency >= 90 ? "default" : line.efficiency >= 85 ? "secondary" : "destructive"}
                          className="animate-pulse-glow"
                        >
                          {line.efficiency.toFixed(1)}%
                        </Badge>
                      </CardTitle>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {line.unit} • {line.operation}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium">Current: <span className="text-primary">{line.current}</span></span>
                      <span className="text-muted-foreground">Target: <span className="text-warning">{line.target}</span></span>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Operators</h4>
                      <div className="space-y-1.5 max-h-32 overflow-y-auto">
                        {line.operators.map((operator, opIndex) => (
                          <motion.div 
                            key={operator.id} 
                            className="flex items-center justify-between text-xs sm:text-sm p-2 rounded bg-background/50"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.8 + (index * 0.1) + (opIndex * 0.05) }}
                          >
                            <span className="font-medium truncate max-w-[120px]">{operator.name}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs">{operator.production}/{operator.target}</span>
                              <Badge 
                                variant={
                                  operator.status === 'active' ? 'default' : 
                                  operator.status === 'absent' ? 'destructive' : 'secondary'
                                }
                                className="text-[10px] sm:text-xs"
                              >
                                {operator.status}
                              </Badge>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Recent Alerts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.6 }}
        >
          <Card className="shadow-card glass-card">
            <CardHeader>
              <CardTitle className="text-primary">Recent Alerts & Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {alerts.length === 0 ? (
                  <motion.p 
                    className="text-muted-foreground text-center py-8"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    No recent alerts - All systems operational ✅
                  </motion.p>
                ) : (
                  alerts.map((alert, index) => (
                    <motion.div 
                      key={alert.id} 
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-lg bg-card/50 backdrop-blur-sm gap-2"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1 + (index * 0.1), duration: 0.4 }}
                      whileHover={{ scale: 1.02, backgroundColor: "hsl(var(--card))" }}
                    >
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="h-4 w-4 text-destructive animate-pulse" />
                        <span className="text-sm">{alert.message}</span>
                      </div>
                      <span className="text-xs sm:text-sm text-muted-foreground shrink-0">{alert.time}</span>
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

export default ProductionDashboard;