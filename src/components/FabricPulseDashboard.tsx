import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  AlertTriangle, 
  Users, 
  Target, 
  TrendingUp, 
  TrendingDown, 
  MessageSquare, 
  Factory,
  Monitor,
  FileText,
  Building2,
  RefreshCw,
  Settings
} from 'lucide-react';
import AnimatedBarChart from './AnimatedBarChart';
import AnimatedMetricCard from './AnimatedMetricCard';
import ProductionDashboard from './ProductionDashboard';
import ProjectDocumentation from './ProjectDocumentation';
import HierarchicalMonitor from './HierarchicalMonitor';
import RTMSBot from './RTMSBot';

const FabricPulseDashboard = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const headerRef = useRef(null);

  // GSAP Animation setup
  useEffect(() => {
    if (headerRef.current) {
      gsap.fromTo(
        headerRef.current,
        { opacity: 0, y: -50 },
        { opacity: 1, y: 0, duration: 1, ease: "power3.out" }
      );
    }
  }, []);

  // Auto-refresh data every 10 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 600000); // 10 minutes

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setIsLoading(true);
    // Simulate data refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLastUpdate(new Date());
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <motion.div
        ref={headerRef}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Card className="rounded-none border-x-0 border-t-0 shadow-card">
          <CardHeader>
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                >
                  <Factory className="h-6 w-6 sm:h-8 sm:w-8 text-primary glow-effect" />
                </motion.div>
                <div>
                  <CardTitle className="text-xl sm:text-2xl lg:text-3xl bg-gradient-primary bg-clip-text text-transparent">
                    Fabric Pulse AI - Production Monitor
                  </CardTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Real-time garment production monitoring with AI analytics
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex gap-2">
                  <Button
                    variant={currentView === 'dashboard' ? 'default' : 'outline'}
                    onClick={() => setCurrentView('dashboard')}
                    className="flex items-center gap-2"
                    size="sm"
                  >
                    <Monitor className="h-4 w-4" />
                    <span className="hidden sm:inline">Live Dashboard</span>
                    <span className="sm:hidden">Dashboard</span>
                  </Button>
                  <Button
                    variant={currentView === 'hierarchical' ? 'default' : 'outline'}
                    onClick={() => setCurrentView('hierarchical')}
                    className="flex items-center gap-2"
                    size="sm"
                  >
                    <Building2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Hierarchical</span>
                    <span className="sm:hidden">Hierarchy</span>
                  </Button>
                  <Button
                    variant={currentView === 'documentation' ? 'default' : 'outline'}
                    onClick={() => setCurrentView('documentation')}
                    className="flex items-center gap-2"
                    size="sm"
                  >
                    <FileText className="h-4 w-4" />
                    <span className="hidden sm:inline">Documentation</span>
                    <span className="sm:hidden">Docs</span>
                  </Button>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
                
                <div className="text-xs text-muted-foreground">
                  Last update: {lastUpdate.toLocaleTimeString()}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>
      </motion.div>

      {/* Content */}
      <div className="w-full">
        <motion.div
          key={currentView}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {currentView === 'dashboard' ? (
            <ProductionDashboard />
          ) : currentView === 'hierarchical' ? (
            <HierarchicalMonitor />
          ) : (
            <ProjectDocumentation />
          )}
        </motion.div>
      </div>

      {/* RTMS AI Bot */}
      <RTMSBot />
    </div>
  );
};

export default FabricPulseDashboard;