import React, { useEffect, useRef, useState, useMemo } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import {
  AlertTriangle,
  User,
  MapPin,
  Wrench,
  Clock,
  Bell,
  CheckCircle,
  XCircle,
  Filter,
  Search,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@radix-ui/react-select";
import { Progress } from "@/components/ui/progress";
import { useAI } from "@/contexts/AIContext";

// Mock alert data type
interface Alert {
  id: string;
  employee: string;
  employee_code: string;
  line: string;
  operation: string;
  efficiency: number;
  target_efficiency: number;
  priority: "HIGH" | "MEDIUM" | "LOW";
  timestamp: string;
  status: "unread" | "read" | "resolved";
  unit?: string;
  floor?: string;
  production?: number;
  target?: number;
}

interface AlertsPanelProps {
  data?: any;
}

// Mock data generator
const generateMockAlerts = (): Alert[] => [
  {
    id: "1",
    employee: "John Doe",
    employee_code: "EMP001",
    line: "Line A",
    operation: "Sewing",
    efficiency: 72.5,
    target_efficiency: 85,
    priority: "HIGH",
    timestamp: new Date().toISOString(),
    status: "unread",
    unit: "Unit 1",
    floor: "Floor 2",
    production: 145,
    target: 200,
  },
  {
    id: "2",
    employee: "Jane Smith",
    employee_code: "EMP002",
    line: "Line B",
    operation: "Cutting",
    efficiency: 78.2,
    target_efficiency: 85,
    priority: "MEDIUM",
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    status: "unread",
    unit: "Unit 1",
    floor: "Floor 1",
    production: 156,
    target: 200,
  },
  {
    id: "3",
    employee: "Mike Johnson",
    employee_code: "EMP003",
    line: "Line C",
    operation: "Quality Check",
    efficiency: 68.9,
    target_efficiency: 85,
    priority: "HIGH",
    timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    status: "read",
    unit: "Unit 2",
    floor: "Floor 1",
    production: 138,
    target: 200,
  },
];

export function AlertsPanel({ data }: AlertsPanelProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [alerts, setAlerts] = useState<Alert[]>(generateMockAlerts());
  
  const { state: aiState } = useAI();

  // GSAP Animation with proper cleanup
  useGSAP(() => {
    if (!panelRef.current) return;

    // Animate panel entrance
    gsap.from(panelRef.current, {
      y: 50,
      opacity: 0,
      duration: 0.8,
      ease: "back.out(1.7)",
    });

    // Animate alert items
    const alertItems = panelRef.current.querySelectorAll(".alert-item");
    if (alertItems.length > 0) {
      gsap.from(alertItems, {
        x: -30,
        opacity: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: "power2.out",
        delay: 0.3,
      });
    }
  }, { scope: panelRef, dependencies: [alerts] });

  // Filter alerts based on search and filters
  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      const matchesSearch = 
        alert.employee.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.employee_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.line.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.operation.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesPriority = priorityFilter === "all" || alert.priority === priorityFilter;
      const matchesStatus = statusFilter === "all" || alert.status === statusFilter;

      return matchesSearch && matchesPriority && matchesStatus;
    });
  }, [alerts, searchTerm, priorityFilter, statusFilter]);

  // Alert actions
  const markAsRead = (alertId: string) => {
    setAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId ? { ...alert, status: "read" as const } : alert
      )
    );
  };

  const markAsResolved = (alertId: string) => {
    setAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId ? { ...alert, status: "resolved" as const } : alert
      )
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return "destructive";
      case "MEDIUM":
        return "secondary";
      case "LOW":
        return "outline";
      default:
        return "outline";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "unread":
        return <Bell className="h-4 w-4" />;
      case "read":
        return <Eye className="h-4 w-4" />;
      case "resolved":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const unreadCount = alerts.filter(alert => alert.status === "unread").length;
  const highPriorityCount = alerts.filter(alert => alert.priority === "HIGH").length;

  return (
    <div ref={panelRef} className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Production Alerts</h1>
          <p className="text-muted-foreground">
            Monitor and manage production efficiency alerts
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {highPriorityCount} High Priority
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Bell className="h-3 w-3" />
              {unreadCount} Unread
            </Badge>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alerts.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{unreadCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{highPriorityCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {alerts.filter(a => a.status === "resolved").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filter Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employees, codes, lines, operations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue>Status</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Active Alerts ({filteredAlerts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {filteredAlerts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No alerts match your current filters.</p>
              </div>
            ) : (
              filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`alert-item p-4 border rounded-lg space-y-3 transition-all hover:shadow-md ${
                    alert.status === "unread" ? "bg-muted/50 border-primary/20" : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={getPriorityColor(alert.priority)}>
                          {alert.priority}
                        </Badge>
                        <Badge variant="outline" className="flex items-center gap-1">
                          {getStatusIcon(alert.status)}
                          {alert.status}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{alert.employee}</span>
                          <span className="text-muted-foreground">({alert.employee_code})</span>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {alert.unit} - {alert.floor} - {alert.line}
                          </div>
                          <div className="flex items-center gap-1">
                            <Wrench className="h-3 w-3" />
                            {alert.operation}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTimestamp(alert.timestamp)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Efficiency: {alert.efficiency}%</span>
                          <span>Target: {alert.target_efficiency}%</span>
                        </div>
                        <Progress 
                          value={alert.efficiency} 
                          className={`h-2 ${
                            alert.efficiency < 70 ? "bg-destructive" : 
                            alert.efficiency < 85 ? "bg-yellow-500" : 
                            "bg-green-500"
                          }`}
                        />
                        <div className="text-xs text-muted-foreground">
                          Production: {alert.production}/{alert.target} units 
                          ({((alert.production / alert.target) * 100).toFixed(1)}%)
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 ml-4">
                      {alert.status === "unread" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => markAsRead(alert.id)}
                          className="w-24"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Read
                        </Button>
                      )}
                      {alert.status !== "resolved" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => markAsResolved(alert.id)}
                          className="w-24"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Resolve
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AlertsPanel;
