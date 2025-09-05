import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { Activity, AlertTriangle, Users, Target, TrendingUp, TrendingDown, MessageSquare, Factory } from 'lucide-react';

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

  const pieData = linesData.map(line => ({
    name: line.line,
    value: line.current,
    efficiency: line.efficiency
  }));

  const COLORS = ['hsl(214, 85%, 58%)', 'hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)', 'hsl(0, 84%, 60%)'];

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
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Factory className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Production AI Monitor
            </h1>
            <p className="text-muted-foreground">Real-time garment production tracking & alerts</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Current Time</p>
          <p className="text-xl font-semibold">{currentTime.toLocaleTimeString()}</p>
        </div>
      </div>

      {/* Alert Section */}
      {alerts.length > 0 && (
        <Alert className="border-destructive bg-destructive/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{alerts[0].message}</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={sendWhatsAppAlert}
              className="ml-4"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Send WhatsApp Alert
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Production</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProduction.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">pieces produced today</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Target</CardTitle>
            <Target className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTarget.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">daily target pieces</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Efficiency</CardTitle>
            {overallEfficiency >= 85 ? 
              <TrendingUp className="h-4 w-4 text-success" /> : 
              <TrendingDown className="h-4 w-4 text-destructive" />
            }
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <span className={overallEfficiency >= 85 ? 'text-success' : 'text-destructive'}>
                {overallEfficiency}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground">overall efficiency</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Lines</CardTitle>
            <Users className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{linesData.length}</div>
            <p className="text-xs text-muted-foreground">production lines active</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Production Trend */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Production Trend (Real-time)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={productionData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="time" />
                <YAxis />
                <Area 
                  type="monotone" 
                  dataKey="actual" 
                  stroke="hsl(214, 85%, 58%)" 
                  fill="hsl(214, 85%, 58%)" 
                  fillOpacity={0.3}
                />
                <Line 
                  type="monotone" 
                  dataKey="target" 
                  stroke="hsl(38, 92%, 50%)" 
                  strokeDasharray="5 5"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Line Production Distribution */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Production by Line</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, efficiency }) => `${name} (${efficiency}%)`}
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Production Lines Detail */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Production Lines Status</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {linesData.map((line) => (
            <Card key={line.line} className="shadow-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    Line {line.line}
                    <Badge variant={line.efficiency >= 85 ? "default" : "destructive"}>
                      {line.efficiency}%
                    </Badge>
                  </CardTitle>
                </div>
                <p className="text-sm text-muted-foreground">
                  {line.unit} • {line.operation}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Current: {line.current}</span>
                  <span className="text-muted-foreground">Target: {line.target}</span>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">Operators</h4>
                  {line.operators.map((operator) => (
                    <div key={operator.id} className="flex items-center justify-between text-sm">
                      <span>{operator.name}</span>
                      <div className="flex items-center gap-2">
                        <span>{operator.production}/{operator.target}</span>
                        <Badge 
                          variant={
                            operator.status === 'active' ? 'default' : 
                            operator.status === 'absent' ? 'destructive' : 'secondary'
                          }
                        >
                          {operator.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Alerts */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Recent Alerts & Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {alerts.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No recent alerts</p>
            ) : (
              alerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span>{alert.message}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{alert.time}</span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductionDashboard;