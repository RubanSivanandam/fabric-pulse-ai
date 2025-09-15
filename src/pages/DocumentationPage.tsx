// src/pages/DocumentationPage.tsx - Complete Documentation
import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { 
  FileText, 
  Book, 
  Code, 
  Database,
  Brain,
  Zap,
  Settings,
  AlertTriangle,
  Users,
  BarChart3,
  ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function DocumentationPage() {
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.from(pageRef.current, {
      opacity: 0,
      y: 50,
      duration: 0.8,
      ease: "power2.out",
    });

    gsap.from('.doc-section', {
      y: 30,
      opacity: 0,
      duration: 0.6,
      stagger: 0.1,
      ease: "power2.out",
      delay: 0.3,
    });
  }, []);

  return (
    <div ref={pageRef} className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Documentation
          </h1>
          <p className="text-gray-400 text-lg">Complete guide to Fabric Pulse AI system</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-gray-800/50">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="api">API Guide</TabsTrigger>
            <TabsTrigger value="ai">AI System</TabsTrigger>
            <TabsTrigger value="setup">Setup</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card className="doc-section bg-gradient-to-br from-gray-900/50 to-gray-800/50 border-gray-700/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Book className="h-5 w-5 text-blue-400" />
                  <span>System Overview</span>
                </CardTitle>
                <CardDescription>Fabric Pulse AI - Production Intelligence Platform</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-gray-300">
                <p>
                  Fabric Pulse AI is an advanced production monitoring system designed specifically for 
                  the garment manufacturing industry. It combines real-time data collection, AI-powered 
                  analytics, and intelligent alerting to optimize production efficiency.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="text-white font-semibold">Key Capabilities</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Real-time production monitoring</li>
                      <li>• AI-powered efficiency analysis</li>
                      <li>• Automated WhatsApp alerts</li>
                      <li>• Hierarchical data filtering</li>
                      <li>• Predictive analytics</li>
                      <li>• Performance recommendations</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-white font-semibold">Technology Stack</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Frontend: React + TypeScript</li>
                      <li>• Backend: Python + FastAPI</li>
                      <li>• AI: Ollama + Local LLM</li>
                      <li>• Database: SQL Server</li>
                      <li>• Animations: GSAP</li>
                      <li>• Charts: Chart.js</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="doc-section bg-gradient-to-br from-purple-900/30 to-blue-900/30 border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-yellow-400" />
                  <span>Architecture</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-gray-300">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-gray-800/30 rounded-lg">
                    <Users className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                    <h5 className="text-white font-semibold">Frontend</h5>
                    <p className="text-sm">React-based dashboard with real-time updates and AI integration</p>
                  </div>
                  <div className="text-center p-4 bg-gray-800/30 rounded-lg">
                    <Database className="h-8 w-8 text-green-400 mx-auto mb-2" />
                    <h5 className="text-white font-semibold">Backend</h5>
                    <p className="text-sm">FastAPI server with SQL Server integration and AI processing</p>
                  </div>
                  <div className="text-center p-4 bg-gray-800/30 rounded-lg">
                    <Brain className="h-8 w-8 text-purple-400 mx-auto mb-2" />
                    <h5 className="text-white font-semibold">AI Engine</h5>
                    <p className="text-sm">Local LLM for insights, predictions, and recommendations</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="features" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              <Card className="doc-section bg-gradient-to-br from-blue-900/30 to-cyan-900/30 border-blue-500/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5 text-blue-400" />
                    <span>Analytics Dashboard</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-gray-300">
                  <Badge className="bg-blue-500/20 text-blue-300">Core Feature</Badge>
                  <ul className="text-sm space-y-1">
                    <li>• Real-time efficiency monitoring</li>
                    <li>• Interactive charts and graphs</li>
                    <li>• Operator performance tracking</li>
                    <li>• Production vs. target analysis</li>
                    <li>• Hierarchical filtering system</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="doc-section bg-gradient-to-br from-purple-900/30 to-pink-900/30 border-purple-500/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <Brain className="h-5 w-5 text-purple-400" />
                    <span>AI Intelligence</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-gray-300">
                  <Badge className="bg-purple-500/20 text-purple-300">AI Powered</Badge>
                  <ul className="text-sm space-y-1">
                    <li>• Automated efficiency analysis</li>
                    <li>• Predictive performance modeling</li>
                    <li>• Intelligent recommendations</li>
                    <li>• Pattern recognition</li>
                    <li>• Natural language insights</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="doc-section bg-gradient-to-br from-red-900/30 to-orange-900/30 border-red-500/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                    <span>Smart Alerts</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-gray-300">
                  <Badge className="bg-red-500/20 text-red-300">Automated</Badge>
                  <ul className="text-sm space-y-1">
                    <li>• WhatsApp notifications</li>
                    <li>• Efficiency threshold alerts</li>
                    <li>• Performance degradation detection</li>
                    <li>• Priority-based escalation</li>
                    <li>• Customizable alert rules</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="doc-section bg-gradient-to-br from-green-900/30 to-teal-900/30 border-green-500/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <Settings className="h-5 w-5 text-green-400" />
                    <span>System Integration</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-gray-300">
                  <Badge className="bg-green-500/20 text-green-300">Enterprise</Badge>
                  <ul className="text-sm space-y-1">
                    <li>• SQL Server connectivity</li>
                    <li>• Windows Service deployment</li>
                    <li>• REST API endpoints</li>
                    <li>• Real-time data synchronization</li>
                    <li>• Scalable architecture</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="api" className="space-y-6">
            <Card className="doc-section bg-gradient-to-br from-gray-900/50 to-gray-800/50 border-gray-700/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Code className="h-5 w-5 text-green-400" />
                  <span>API Endpoints</span>
                </CardTitle>
                <CardDescription>RESTful API documentation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                <div className="space-y-4">
                  <h4 className="text-white font-semibold">Production Data</h4>
                  <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-600/30">
                    <code className="text-green-400">GET /api/rtms/efficiency</code>
                    <p className="text-gray-300 text-sm mt-2">Retrieve production efficiency data with filtering options</p>
                    <div className="mt-2 text-xs text-gray-400">
                      Query Parameters: unit_code, floor_name, line_name, operation
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-white font-semibold">Hierarchical Filters</h4>
                  <div className="space-y-2">
                    <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-600/30">
                      <code className="text-blue-400">GET /api/rtms/filters/units</code>
                      <p className="text-gray-300 text-sm mt-1">Get list of available unit codes</p>
                    </div>
                    <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-600/30">
                      <code className="text-blue-400">GET /api/rtms/filters/floors?unit_code=UNIT</code>
                      <p className="text-gray-300 text-sm mt-1">Get floor names for specific unit</p>
                    </div>
                    <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-600/30">
                      <code className="text-blue-400">GET /api/rtms/filters/lines?unit_code=UNIT&floor_name=FLOOR</code>
                      <p className="text-gray-300 text-sm mt-1">Get line names for unit and floor</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-white font-semibold">AI Endpoints</h4>
                  <div className="space-y-2">
                    <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-600/30">
                      <code className="text-purple-400">POST /api/ai/summarize</code>
                      <p className="text-gray-300 text-sm mt-1">AI-powered text summarization</p>
                    </div>
                    <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-600/30">
                      <code className="text-purple-400">POST /api/ai/completion</code>
                      <p className="text-gray-300 text-sm mt-1">Generate AI text completions</p>
                    </div>
                    <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-600/30">
                      <code className="text-purple-400">POST /api/ai/suggest_ops</code>
                      <p className="text-gray-300 text-sm mt-1">Get operation suggestions based on context</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai" className="space-y-6">
            <Card className="doc-section bg-gradient-to-br from-purple-900/30 to-blue-900/30 border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Brain className="h-5 w-5 text-purple-400" />
                  <span>AI System Architecture</span>
                </CardTitle>
                <CardDescription>Local LLM integration with Ollama</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-gray-300">
                <p>
                  The AI system uses Ollama to run local LLM models for production analysis. 
                  This ensures data privacy while providing intelligent insights.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h5 className="text-white font-semibold mb-2">AI Capabilities</h5>
                    <ul className="text-sm space-y-1">
                      <li>• Efficiency trend analysis</li>
                      <li>• Performance prediction</li>
                      <li>• Anomaly detection</li>
                      <li>• Root cause analysis</li>
                      <li>• Optimization recommendations</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="text-white font-semibold mb-2">Model Information</h5>
                    <ul className="text-sm space-y-1">
                      <li>• Model: Llama 3.2 3B</li>
                      <li>• Local processing</li>
                      <li>• Real-time inference</li>
                      <li>• Context-aware responses</li>
                      <li>• Manufacturing domain knowledge</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="setup" className="space-y-6">
            <Card className="doc-section bg-gradient-to-br from-gray-900/50 to-gray-800/50 border-gray-700/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Settings className="h-5 w-5 text-green-400" />
                  <span>Installation & Setup</span>
                </CardTitle>
                <CardDescription>Complete setup guide for production deployment</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 text-gray-300">
                
                <div>
                  <h4 className="text-white font-semibold mb-3">Prerequisites</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Windows Server/Desktop</li>
                    <li>• Python 3.8+</li>
                    <li>• Node.js 18+</li>
                    <li>• SQL Server access</li>
                    <li>• Ollama installation</li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-white font-semibold mb-3">Backend Setup</h4>
                  <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-600/30">
                    <pre className="text-sm">
{`# Install dependencies
pip install -r requirements.txt

# Install as Windows Service
setup_windows_services.bat

# Start service
python windows_service_fabric_pulse.py start`}
                    </pre>
                  </div>
                </div>

                <div>
                  <h4 className="text-white font-semibold mb-3">Frontend Setup</h4>
                  <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-600/30">
                    <pre className="text-sm">
{`# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build`}
                    </pre>
                  </div>
                </div>

                <div>
                  <h4 className="text-white font-semibold mb-3">Configuration</h4>
                  <p className="text-sm mb-2">Edit the .env file in the backend directory:</p>
                  <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-600/30">
                    <pre className="text-sm">
{`DB_SERVER=172.16.9.240
DB_DATABASE=ITR_PRO_IND
DB_USERNAME=sa
DB_PASSWORD=YourPassword

TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
ALERT_PHONE_NUMBER=whatsapp:+1234567890`}
                    </pre>
                  </div>
                </div>

              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
