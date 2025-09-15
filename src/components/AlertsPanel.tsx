// src/components/AlertsPanel.tsx - Complete Alerts Management
import React, { useEffect, useRef, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useAI } from "@/contexts/AIContext";

interface AlertsPanelProps {
  data: any;
}

export function AlertsPanel({ data }: AlertsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { state: aiState } = useAI();

  useEffect(() => {
    gsap.from(panelRef.current, {
      y: 50,
      opacity: 0,
      duration: 0.8,
      ease: "back.out(1.7)",
    });

    gsap.from(".alert-item", {
      x: -30,
      opacity: 0,
      duration: 0.5,
      stagger: 0.1,
      ease: "power2.out",
      delay: 0.3,
    });
  }, []);

  const getAlerts = () => {
    const alerts: any[] = [];

    // Add production alerts from data
    if (data?.underperformers) {
      data.underperformers.forEach((emp: any, index: number) => {
        alerts.push({
          id: `prod-${index}`,
          type: "efficiency",
          priority: emp.efficiency < 70 ? "critical" : "high",
          title: `Low Efficiency Alert - ${emp.emp_name}`,
          description: `Employee ${emp.emp_name} (${emp.emp_code}) is performing at ${emp.efficiency}% efficiency in ${emp.line_name} - ${emp.new_oper_seq}`,
          timestamp: new Date().toISOString(),
          location: `${emp.unit_code} > ${emp.floor_name} > ${emp.line_name}`,
          operation: emp.new_oper_seq,
          efficiency: emp.efficiency,
          target: 85,
          status: "active",
        });
      });
    }

    // Add AI insights as alerts
    aiState.insights.forEach((insight) => {
      if (insight.type === "alert") {
        alerts.push({
          id: insight.id,
          type: "ai_alert",
          priority: insight.priority,
          title: insight.title,
          description: insight.description,
          timestamp: insight.timestamp,
          confidence: insight.confidence,
          status: "active",
        });
      }
    });

    return alerts;
  };

  const alerts = getAlerts();

  const filteredAlerts = alerts.filter((alert) => {
    if (priorityFilter !== "all" && alert.priority !== priorityFilter)
      return false;
    if (statusFilter !== "all" && alert.status !== statusFilter) return false;
    return true;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "text-red-400 bg-red-500/20";
      case "high":
        return "text-orange-400 bg-orange-500/20";
      case "medium":
        return "text-yellow-400 bg-yellow-500/20";
      case "low":
        return "text-green-400 bg-green-500/20";
      default:
        return "text-gray-400 bg-gray-500/20";
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "critical":
        return <XCircle className="h-5 w-5" />;
      case "high":
        return <AlertTriangle className="h-5 w-5" />;
      case "medium":
        return <Clock className="h-5 w-5" />;
      case "low":
        return <Bell className="h-5 w-5" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };

  const getAlertStats = () => {
    const stats = {
      total: alerts.length,
      critical: alerts.filter((a) => a.priority === "critical").length,
      high: alerts.filter((a) => a.priority === "high").length,
      medium: alerts.filter((a) => a.priority === "medium").length,
      low: alerts.filter((a) => a.priority === "low").length,
    };
    return stats;
  };

  const stats = getAlertStats();

  return (
    <div ref={panelRef} className="space-y-6">
      {/* Alert Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 border-gray-700/50">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-xs text-gray-400">Total Alerts</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-900/50 to-red-800/50 border-red-500/20">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-400">
              {stats.critical}
            </div>
            <div className="text-xs text-red-300">Critical</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-900/50 to-orange-800/50 border-orange-500/20">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-400">
              {stats.high}
            </div>
            <div className="text-xs text-orange-300">High</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-900/50 to-yellow-800/50 border-yellow-500/20">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-400">
              {stats.medium}
            </div>
            <div className="text-xs text-yellow-300">Medium</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-900/50 to-green-800/50 border-green-500/20">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-400">{stats.low}</div>
            <div className="text-xs text-green-300">Low</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-gradient-to-r from-gray-900/50 to-gray-800/50 border-gray-700/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Filter className="h-5 w-5 text-blue-400" />
            <span>Filter Alerts</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex space-x-4">
          <div className="flex-1">
           <select
        value={priorityFilter}
        onChange={(e) => setPriorityFilter(e.target.value)}
        className="w-full bg-gray-800 border border-gray-600 text-white p-2 rounded-md"
      >
        <option value="all">All Priorities</option>
        <option value="critical">Critical</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>          </div>
          <div className="flex-1">
           <select
  value={statusFilter}
  onChange={(e) => setStatusFilter(e.target.value)}
  className="w-full bg-gray-800 border border-gray-600 text-white p-2 rounded-md"
>
  <option value="all">All Status</option>
  <option value="active">Active</option>
  <option value="resolved">Resolved</option>
  <option value="acknowledged">Acknowledged</option>
</select>
          </div>
        </CardContent>
      </Card>

      {/* Alert List */}
      <Card className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 border-gray-700/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <span>Active Alerts</span>
            </div>
            <Badge variant="destructive" className="animate-pulse">
              {filteredAlerts.length} alerts
            </Badge>
          </CardTitle>
          <CardDescription>
            Real-time production alerts and notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No alerts matching current filters.</p>
              <p className="text-sm">Production is running smoothly!</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`alert-item p-4 rounded-lg border ${
                    alert.priority === "critical"
                      ? "border-red-500/50 bg-red-500/10"
                      : alert.priority === "high"
                      ? "border-orange-500/50 bg-orange-500/10"
                      : alert.priority === "medium"
                      ? "border-yellow-500/50 bg-yellow-500/10"
                      : "border-green-500/50 bg-green-500/10"
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div
                      className={`p-2 rounded-full ${getPriorityColor(
                        alert.priority
                      )}`}
                    >
                      {getPriorityIcon(alert.priority)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-white truncate">
                          {alert.title}
                        </h4>
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <Badge
                            className={`text-xs ${getPriorityColor(
                              alert.priority
                            )}`}
                          >
                            {alert.priority.toUpperCase()}
                          </Badge>
                          <span className="text-xs text-gray-400">
                            {new Date(alert.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-300 mb-3">
                        {alert.description}
                      </p>

                      {/* Alert Details */}
                      <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                        {alert.location && (
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-3 w-3" />
                            <span>{alert.location}</span>
                          </div>
                        )}
                        {alert.operation && (
                          <div className="flex items-center space-x-1">
                            <Wrench className="h-3 w-3" />
                            <span>{alert.operation}</span>
                          </div>
                        )}
                        {alert.efficiency !== undefined && (
                          <div className="flex items-center space-x-1">
                            <span>
                              Efficiency: {alert.efficiency}% / {alert.target}%
                            </span>
                          </div>
                        )}
                        {alert.confidence && (
                          <div className="flex items-center space-x-1">
                            <span>
                              AI Confidence:{" "}
                              {(alert.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Efficiency Progress Bar */}
                      {alert.efficiency !== undefined && (
                        <div className="mt-3">
                          <Progress value={alert.efficiency} className="h-2" />
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex space-x-2 mt-3">
                        <Button size="sm" variant="outline" className="text-xs">
                          Acknowledge
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs">
                          View Details
                        </Button>
                        {alert.type === "efficiency" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                          >
                            Send Notification
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
