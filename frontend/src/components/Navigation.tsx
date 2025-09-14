import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Monitor, FileText, Factory, Building2 } from 'lucide-react';
import ProductionDashboard from './ProductionDashboard';
import ProjectDocumentation from './ProjectDocumentation';
import HierarchicalMonitor from './HierarchicalMonitor';

const Navigation = () => {
  const [currentView, setCurrentView] = useState<'dashboard' | 'documentation' | 'hierarchical'>('dashboard');

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <Card className="rounded-none border-x-0 border-t-0 shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3">
              <Factory className="h-6 w-6 text-primary" />
              Production AI Monitor System
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant={currentView === 'dashboard' ? 'default' : 'outline'}
                onClick={() => setCurrentView('dashboard')}
                className="flex items-center gap-2"
              >
                <Monitor className="h-4 w-4" />
                Live Dashboard
              </Button>
              <Button
                variant={currentView === 'hierarchical' ? 'default' : 'outline'}
                onClick={() => setCurrentView('hierarchical')}
                className="flex items-center gap-2"
              >
                <Building2 className="h-4 w-4" />
                Hierarchical Monitor
              </Button>
              <Button
                variant={currentView === 'documentation' ? 'default' : 'outline'}
                onClick={() => setCurrentView('documentation')}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Documentation
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Content */}
      <div className="w-full">
        {currentView === 'dashboard' ? (
          <ProductionDashboard />
        ) : currentView === 'hierarchical' ? (
          <HierarchicalMonitor />
        ) : (
          <ProjectDocumentation />
        )}
      </div>
    </div>
  );
};

export default Navigation;