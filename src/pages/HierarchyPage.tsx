// src/pages/HierarchyPage.tsx - Complete Hierarchy View
import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { 
  Building2, 
  MapPin, 
  Wrench, 
  Users, 
  BarChart3,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export function HierarchyPage() {
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.from(pageRef.current, {
      opacity: 0,
      y: 50,
      duration: 0.8,
      ease: "power2.out",
    });

    gsap.from('.hierarchy-item', {
      x: -50,
      opacity: 0,
      duration: 0.6,
      stagger: 0.1,
      ease: "power2.out",
      delay: 0.3,
    });
  }, []);

  // Fetch hierarchy data
  const { data: hierarchyData, isLoading } = useQuery({
    queryKey: ['hierarchy-data'],
    queryFn: async () => {
      const [unitsRes, floorsRes, linesRes] = await Promise.all([
        fetch('/api/rtms/filters/units'),
        fetch('/api/rtms/efficiency'),
        fetch('/api/rtms/filters/operations')
      ]);
      
      const units = await unitsRes.json();
      const efficiency = await floorsRes.json();
      const operations = await linesRes.json();
      
      return { units, efficiency, operations };
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const buildHierarchy = () => {
    if (!hierarchyData?.efficiency?.data?.operators) return {};
    
    const hierarchy: any = {};
    hierarchyData.efficiency.data.operators.forEach((op: any) => {
      const unit = op.unit_code || 'Unknown';
      const floor = op.floor_name || 'Unknown';
      const line = op.line_name || 'Unknown';
      
      if (!hierarchy[unit]) hierarchy[unit] = {};
      if (!hierarchy[unit][floor]) hierarchy[unit][floor] = {};
      if (!hierarchy[unit][floor][line]) hierarchy[unit][floor][line] = [];
      
      hierarchy[unit][floor][line].push(op);
    });
    
    return hierarchy;
  };

  const hierarchy = buildHierarchy();

  return (
    <div ref={pageRef} className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Production Hierarchy
          </h1>
          <p className="text-gray-400 text-lg">Organizational structure and performance overview</p>
        </div>

        {/* Hierarchy Tree */}
        <div className="space-y-6">
          {Object.entries(hierarchy).map(([unit, floors]) => (
            <Card key={unit} className="hierarchy-item bg-gradient-to-br from-gray-900/50 to-gray-800/50 border-gray-700/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Building2 className="h-6 w-6 text-blue-400" />
                  <span>Unit: {unit}</span>
                  <Badge variant="secondary" className="ml-2">
                    {Object.keys(floors as any).length} floors
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(floors as any).map(([floor, lines]) => (
                  <Card key={`${unit}-${floor}`} className="bg-gray-800/30 border-gray-600/30">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-white flex items-center space-x-2">
                        <MapPin className="h-5 w-5 text-green-400" />
                        <span>Floor: {floor}</span>
                        <Badge variant="outline" className="ml-2">
                          {Object.keys(lines).length} lines
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {Object.entries(lines).map(([line, operators]) => {
                        const ops = operators as any[];
                        const avgEfficiency = ops.reduce((sum, op) => sum + op.efficiency, 0) / ops.length;
                        const totalProduction = ops.reduce((sum, op) => sum + op.production, 0);
                        
                        return (
                          <Card key={`${unit}-${floor}-${line}`} className="bg-gray-700/30 border-gray-500/30">
                            <CardHeader className="pb-2">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-base text-white flex items-center space-x-2">
                                  <Wrench className="h-4 w-4 text-yellow-400" />
                                  <span>Line: {line}</span>
                                </CardTitle>
                                <div className="flex items-center space-x-2">
                                  <Badge className={avgEfficiency >= 85 ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}>
                                    {avgEfficiency.toFixed(1)}%
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {ops.length} operators
                                  </Badge>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div className="text-center">
                                  <div className="text-white font-semibold">{ops.length}</div>
                                  <div className="text-gray-400">Operators</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-white font-semibold">{totalProduction}</div>
                                  <div className="text-gray-400">Production</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-white font-semibold">{avgEfficiency.toFixed(1)}%</div>
                                  <div className="text-gray-400">Efficiency</div>
                                </div>
                              </div>
                              <Progress value={avgEfficiency} className="h-2" />
                              
                              {/* Top and Bottom Performers */}
                              <div className="grid grid-cols-2 gap-4 text-xs">
                                <div>
                                  <div className="text-green-400 font-medium mb-1">Top Performer</div>
                                  {(() => {
                                    const top = ops.reduce((prev, current) => 
                                      prev.efficiency > current.efficiency ? prev : current
                                    );
                                    return (
                                      <div className="text-gray-300">
                                        {top.emp_name} ({top.efficiency.toFixed(1)}%)
                                      </div>
                                    );
                                  })()}
                                </div>
                                <div>
                                  <div className="text-red-400 font-medium mb-1">Needs Attention</div>
                                  {(() => {
                                    const low = ops.filter(op => op.efficiency < 85).length;
                                    return (
                                      <div className="text-gray-300">
                                        {low} operators below target
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
