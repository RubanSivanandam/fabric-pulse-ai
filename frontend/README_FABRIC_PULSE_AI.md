# Fabric Pulse AI - Real Time Monitoring System (RTMS)

## 🚀 Project Overview

Fabric Pulse AI is an advanced Real-Time Monitoring System (RTMS) designed for garment manufacturing facilities. It integrates AI-powered analytics using Llama 3.2b to monitor production efficiency, detect anomalies, and send automated WhatsApp alerts for underperforming operations.

### Key Features

- **🤖 AI-Powered Analytics**: Llama 3.2b integration for intelligent production insights
- **📊 Real-Time Monitoring**: Live production data from SQL Server database
- **📱 WhatsApp Alerts**: Automated notifications for efficiency issues
- **🎯 Hierarchical Filtering**: UnitCode→FloorName→LineName→StyleNo→PartName→NewOperSeq→DeviceId→EmpName
- **📈 Interactive Pie Charts**: Apache Superset-inspired dashboard design
- **🖥️ Windows Service**: Both frontend and backend run as Windows services
- **📱 Responsive Design**: Optimized for TV, Desktop, Tablet, and Mobile devices

## 🏗️ Architecture

### Backend (Python FastAPI)
- **SQL Server Integration**: Direct connection to production database
- **AI Analytics Engine**: Llama 3.2b for production insights
- **WhatsApp Service**: Automated alert system
- **Windows Service**: Runs as background service

### Frontend (React + TypeScript)
- **Apache Superset Theme**: Professional data visualization
- **Real-time Updates**: 10-minute data refresh cycles
- **Hierarchical Navigation**: Multi-level filtering system
- **Responsive Charts**: Pie charts optimized for all devices

## 🔧 Installation & Setup

### Prerequisites
- Python 3.8+
- Node.js 16+
- SQL Server access
- Windows OS (for service installation)

### 1. Backend Setup

```bash
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Install as Windows Service (Run as Administrator)
setup_windows_services.bat
```

### 2. Frontend Setup

```bash
# Install Node dependencies
npm install

# Start development server
npm run dev
```

### 3. Database Configuration

Update the database connection in `backend/fabric_pulse_ai_main.py`:

```python
self.db_config = {
    'server': '172.16.9.240',
    'database': 'ITR_PRO_IND', 
    'username': 'sa',
    'password': 'your_password'
}
```

## 📊 Data Structure

The system processes data from `RTMS_SessionWiseProduction` table with the following hierarchy:

```
UnitCode (D15-2)
└── FloorName (FLOOR-2)
    └── LineName (S1-1, S2-1)
        └── StyleNo (828656-D47665 HO25)
            └── PartName (Finishing, Collar Preparation)
                └── NewOperSeq (A10001-Operation Name)
                    └── DeviceID (RT000610)
                        └── EmpName (Employee Details)
```

## 🧮 Efficiency Calculation

### Actual Efficiency Formula:
```
Efficiency = (ProdnPcs / Eff100) * 100%
```

### Performance Categories:
- **Excellent**: 95%+ efficiency
- **Good**: 85-94% efficiency  
- **Needs Improvement**: <85% efficiency (triggers WhatsApp alerts)

## 📱 WhatsApp Alert System

### Alert Triggers:
- Employee efficiency falls below 85%
- Line efficiency drops significantly
- Device malfunctions detected
- Absenteeism impacts production

### Alert Format:
```
🚨 EFFICIENCY ALERT
Employee: [Name] ([Code])
Unit: [UnitCode] | Floor: [FloorName]  
Line: [LineName] | Operation: [Operation]
Current Efficiency: [X]% (Target: 85%+)
Production: [Current]/[Target]
Action Required: Immediate intervention to boost efficiency
```

## 🔧 Windows Service Management

### Backend Service Commands:
```bash
# Install service
python windows_service_fabric_pulse.py install

# Start service  
python windows_service_fabric_pulse.py start

# Stop service
python windows_service_fabric_pulse.py stop

# Check status
python windows_service_fabric_pulse.py status

# Uninstall service
python windows_service_fabric_pulse.py uninstall
```

### Service Details:
- **Service Name**: FabricPulseAI
- **Display Name**: Fabric Pulse AI - RTMS Service
- **Port**: 8000
- **Auto-restart**: Yes
- **Log Location**: `backend/logs/fabric_pulse_service.log`

## 🎨 UI Theme - Apache Superset Inspired

### Color Scheme:
- **Primary**: Superset Blue (#1890FF)  
- **Background**: Dark Navy (#0D1B2A)
- **Success**: Green (#52C41A)
- **Warning**: Orange (#FA8C16)
- **Error**: Red (#FF4D4F)

### Chart Configuration:
- **Primary Charts**: Pie charts for efficiency and production distribution
- **Responsive Design**: Adapts to TV (2560px), Desktop (1920px), Tablet (768px), Mobile (320px)
- **Animations**: GSAP-powered transitions and hover effects

## 🔍 AI Integration Details

### Llama 3.2b Features:
- **Production Analysis**: Identifies efficiency patterns
- **Anomaly Detection**: Flags unusual production behavior  
- **Predictive Insights**: Suggests optimization strategies
- **Natural Language Reports**: Human-readable analysis summaries

### AI Insights Examples:
- "📈 Good performance overall with 3 operators requiring attention for efficiency improvement."
- "⚠️ Performance below target - immediate intervention needed."
- "🎯 Excellent performance! All lines operating above optimal efficiency."

## 🔄 Real-Time Data Flow

1. **Data Collection**: Every 10 minutes from SQL Server
2. **AI Processing**: Llama analysis of efficiency metrics
3. **Alert Generation**: WhatsApp notifications for underperformers
4. **Dashboard Update**: Real-time UI refresh with new insights
5. **Hierarchy Filtering**: Interactive drill-down capability

## 📈 Performance Monitoring

### Key Metrics Tracked:
- **Total Production**: Daily piece count
- **Target Achievement**: Production vs. target percentage
- **Overall Efficiency**: AI-calculated system efficiency
- **Underperformer Count**: Employees below 85% efficiency
- **Line Performance**: Individual line efficiency tracking
- **Device Utilization**: Equipment performance monitoring

## 🛠️ Troubleshooting

### Common Issues:

**Service Won't Start:**
```bash
# Check logs
type backend\logs\fabric_pulse_service.log

# Restart service
python windows_service_fabric_pulse.py restart
```

**Database Connection Failed:**
```bash
# Test connection
python -c "import pyodbc; print('ODBC drivers:', [x for x in pyodbc.drivers()])"

# Verify SQL Server connectivity
ping 172.16.9.240
```

**Frontend Not Loading:**
```bash
# Clear cache and restart
rm -rf node_modules
npm install
npm run dev
```

## 📞 Support & Maintenance

### Log Locations:
- **Service Logs**: `backend/logs/fabric_pulse_service.log`
- **Application Logs**: Console output in development mode
- **Windows Event Log**: Search for "Fabric Pulse AI" events

### Performance Optimization:
- **Database Indexing**: Ensure proper indexes on TranDate, LineName, EmpCode
- **Memory Management**: Monitor AI model memory usage
- **Network Optimization**: Use connection pooling for database access

## 🔒 Security Considerations

- **Database Access**: Use dedicated service account with minimal permissions
- **API Security**: Implement rate limiting and authentication
- **Service Security**: Run service with least privilege principle
- **Data Privacy**: Ensure employee data protection compliance

## 📋 Deployment Checklist

- [ ] SQL Server connectivity verified
- [ ] Python dependencies installed
- [ ] Windows service installed and running
- [ ] Frontend accessible via browser
- [ ] WhatsApp service configured
- [ ] AI model loaded successfully
- [ ] Real-time data updates working
- [ ] Hierarchical filtering functional
- [ ] Alert system tested
- [ ] Performance monitoring active

---

**Fabric Pulse AI v2.0** - Transforming garment manufacturing through intelligent real-time monitoring.