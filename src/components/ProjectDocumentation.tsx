import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, Database, Brain, MessageSquare, BarChart3, Users, Factory, AlertTriangle, TrendingUp } from 'lucide-react';

const ProjectDocumentation = () => {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Production AI Monitor - Project Documentation
        </h1>
        <p className="text-xl text-muted-foreground">
          Comprehensive documentation for garment industry production monitoring system
        </p>
      </div>

      {/* Project Overview */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5 text-primary" />
            Project Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Objective</h3>
              <p className="text-muted-foreground">
                Develop an AI-powered production monitoring system that automatically alerts management 
                when production falls below 85% of daily targets via WhatsApp notifications.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Key Features</h3>
              <ul className="text-muted-foreground space-y-1">
                <li>• Real-time production tracking</li>
                <li>• Automated alert system (sub-85% performance)</li>
                <li>• Exception tracking (absenteeism, underperformance)</li>
                <li>• WhatsApp notifications</li>
                <li>• Visual dashboards for management</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technology Stack */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Technology Stack (Open Source)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-semibold mb-3">Frontend Dashboard</h3>
              <div className="space-y-2">
                <Badge variant="outline">React + TypeScript</Badge>
                <Badge variant="outline">Recharts (Visualizations)</Badge>
                <Badge variant="outline">Tailwind CSS</Badge>
                <Badge variant="outline">Shadcn/ui Components</Badge>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Backend (Recommended)</h3>
              <div className="space-y-2">
                <Badge variant="outline">Python + FastAPI</Badge>
                <Badge variant="outline">SQLite Database</Badge>
                <Badge variant="outline">Pandas (Data Processing)</Badge>
                <Badge variant="outline">APScheduler (Cron Jobs)</Badge>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-3">AI & Alerts</h3>
              <div className="space-y-2">
                <Badge variant="outline">Scikit-learn (ML)</Badge>
                <Badge variant="outline">WhatsApp API</Badge>
                <Badge variant="outline">Twilio WhatsApp</Badge>
                <Badge variant="outline">SMS Backup Option</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Architecture Flow */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            System Architecture & Data Flow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Flow Diagram */}
            <div className="bg-muted/30 p-6 rounded-lg">
              <h3 className="font-semibold mb-4 text-center">Production Monitoring Flow</h3>
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                
                <div className="flex flex-col items-center space-y-2">
                  <Database className="h-8 w-8 text-primary" />
                  <span className="text-sm font-medium">SQLite DB</span>
                  <span className="text-xs text-muted-foreground text-center">
                    Real-time data<br/>every 10 mins
                  </span>
                </div>

                <div className="hidden md:block">→</div>

                <div className="flex flex-col items-center space-y-2">
                  <Brain className="h-8 w-8 text-primary" />
                  <span className="text-sm font-medium">AI Processing</span>
                  <span className="text-xs text-muted-foreground text-center">
                    Performance<br/>analysis
                  </span>
                </div>

                <div className="hidden md:block">→</div>

                <div className="flex flex-col items-center space-y-2">
                  <AlertTriangle className="h-8 w-8 text-warning" />
                  <span className="text-sm font-medium">Alert System</span>
                  <span className="text-xs text-muted-foreground text-center">
                    Below 85%<br/>trigger
                  </span>
                </div>

                <div className="hidden md:block">→</div>

                <div className="flex flex-col items-center space-y-2">
                  <MessageSquare className="h-8 w-8 text-success" />
                  <span className="text-sm font-medium">WhatsApp</span>
                  <span className="text-xs text-muted-foreground text-center">
                    Management<br/>notification
                  </span>
                </div>

                <div className="hidden md:block">→</div>

                <div className="flex flex-col items-center space-y-2">
                  <Users className="h-8 w-8 text-accent" />
                  <span className="text-sm font-medium">Dashboard</span>
                  <span className="text-xs text-muted-foreground text-center">
                    Real-time<br/>monitoring
                  </span>
                </div>

              </div>
            </div>

            <Separator />

            {/* Detailed Steps */}
            <div>
              <h3 className="font-semibold mb-4">Process Steps</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-success mt-0.5" />
                    <div>
                      <p className="font-medium">Data Collection</p>
                      <p className="text-sm text-muted-foreground">
                        Production data updated every 10 minutes from units/lines/operations
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-success mt-0.5" />
                    <div>
                      <p className="font-medium">Performance Analysis</p>
                      <p className="text-sm text-muted-foreground">
                        AI calculates efficiency vs targets and identifies exceptions
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-success mt-0.5" />
                    <div>
                      <p className="font-medium">Exception Detection</p>
                      <p className="text-sm text-muted-foreground">
                        Identifies absenteeism, underperformance, equipment issues
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-success mt-0.5" />
                    <div>
                      <p className="font-medium">Alert Triggering</p>
                      <p className="text-sm text-muted-foreground">
                        Automatic alerts when production drops below 85% target
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-success mt-0.5" />
                    <div>
                      <p className="font-medium">WhatsApp Notifications</p>
                      <p className="text-sm text-muted-foreground">
                        Instant management alerts with production details
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-success mt-0.5" />
                    <div>
                      <p className="font-medium">Dashboard Updates</p>
                      <p className="text-sm text-muted-foreground">
                        Real-time visual updates for monitoring teams
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Implementation Steps */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Implementation Roadmap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3">Phase 1: Setup & Development</h3>
                <ol className="space-y-2 text-sm">
                  <li>1. Setup Python environment (VS Code recommended)</li>
                  <li>2. Install dependencies: FastAPI, SQLite, Pandas</li>
                  <li>3. Create database schema for production data</li>
                  <li>4. Develop data ingestion API endpoints</li>
                  <li>5. Implement AI performance analysis</li>
                </ol>
              </div>
              <div>
                <h3 className="font-semibold mb-3">Phase 2: Integration & Testing</h3>
                <ol className="space-y-2 text-sm">
                  <li>1. Setup WhatsApp API (Twilio integration)</li>
                  <li>2. Configure alert thresholds and rules</li>
                  <li>3. Test with sample production data</li>
                  <li>4. Deploy dashboard for real-time monitoring</li>
                  <li>5. User acceptance testing with management</li>
                </ol>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-3">Development Environment Setup</h3>
              <div className="bg-muted/50 p-4 rounded-lg">
                <code className="text-sm">
                  # Recommended IDE: Visual Studio Code<br/>
                  # Python 3.8+ required<br/>
                  pip install fastapi uvicorn sqlite3 pandas scikit-learn twilio<br/>
                  # Install WhatsApp Business API or Twilio WhatsApp<br/>
                  # Setup scheduled tasks for data processing
                </code>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Benefits */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Key Benefits & ROI</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-success/10 p-4 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                <TrendingUp className="h-8 w-8 text-success" />
              </div>
              <h3 className="font-semibold mb-2">Increased Efficiency</h3>
              <p className="text-sm text-muted-foreground">
                Early detection and intervention can improve overall production efficiency by 10-15%
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-primary/10 p-4 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Reduced Downtime</h3>
              <p className="text-sm text-muted-foreground">
                Proactive alerts help identify and resolve issues before they cause significant delays
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-warning/10 p-4 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                <Users className="h-8 w-8 text-warning" />
              </div>
              <h3 className="font-semibold mb-2">Better Management</h3>
              <p className="text-sm text-muted-foreground">
                Real-time insights enable data-driven decisions and improved resource allocation
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectDocumentation;