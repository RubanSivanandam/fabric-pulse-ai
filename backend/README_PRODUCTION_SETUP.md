# Fabric Pulse AI - Production Backend Setup

## 🚀 Enhanced Production-Ready Backend

This is the refactored, production-ready backend for Fabric Pulse AI with enhanced AI integration, real-time SQL Server connectivity, and Windows Service deployment.

## 🏗️ Architecture Overview

```
Fabric Pulse AI Backend
├── main.py                         # Main FastAPI application (Enhanced)
├── config.py                       # Centralized configuration management
├── whatsapp_service.py            # Enhanced WhatsApp alert service
├── windows_service_fabric_pulse.py # Enhanced Windows service wrapper
├── setup_windows_services.bat     # Automated installation script
└── requirements.txt               # Production dependencies
```

## ✨ Key Features

### 🤖 Enhanced AI Integration
- **Llama 3.2b Model**: Advanced production efficiency analysis
- **Multi-model Support**: Fallback to lightweight models if needed
- **Real-time Insights**: Pattern recognition and performance predictions
- **Automated Recommendations**: Actionable insights for production improvement

### 📊 Real-time Database Connectivity
- **SQL Server Integration**: Direct connection to `172.16.9.240/ITR_PRO_IND`
- **Read-Only Operations**: Only GET operations (no INSERT/UPDATE/DELETE)
- **Hierarchical Data**: UnitCode → FloorName → LineName → StyleNo → PartName → NewOperSeq → DeviceId → EmpName
- **Efficiency Calculation**: `(ProdnPcs / Eff100) * 100%`

### 🚨 Intelligent Alert System
- **Threshold-based Alerts**: Below 85% efficiency triggers alerts
- **Relative Efficiency**: Top performer in each operation = 100% benchmark
- **Rate Limiting**: Prevents alert spam
- **WhatsApp Integration**: Automated supervisor notifications

### 🔧 Windows Service Ready
- **Production Deployment**: Run as Windows Service using pywin32
- **Auto-restart**: Enhanced error handling and process monitoring
- **Health Checks**: Continuous monitoring with logging
- **Development Mode**: `python main.py` for testing

## 🛠️ Setup Instructions

### Prerequisites
- Windows Server/Desktop
- Python 3.8+ with pip
- SQL Server access to `172.16.9.240/ITR_PRO_IND`
- ODBC Driver 17 for SQL Server

### 1. Quick Development Setup
```bash
# Install dependencies
pip install -r requirements.txt

# Run in development mode
python main.py
```

### 2. Production Windows Service Setup
```bash
# Run as Administrator
backend/setup_windows_services.bat
```

## 🔐 Configuration

### Environment Variables (Optional)
```env
# Database Configuration
DB_SERVER=172.16.9.240
DB_DATABASE=ITR_PRO_IND  
DB_USERNAME=sa
DB_PASSWORD=Passw0rd

# Service Configuration
SERVICE_HOST=0.0.0.0
SERVICE_PORT=8000
EFFICIENCY_THRESHOLD=85.0

# WhatsApp Configuration (Twilio)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

## 📊 API Endpoints

### Core Endpoints
- `GET /` - Service status and information
- `GET /api/rtms/analyze` - Complete AI analysis with real-time data
- `GET /api/rtms/hierarchy/{level}` - Hierarchical data filtering
- `GET /api/rtms/alerts` - Current efficiency alerts
- `GET /api/rtms/status` - System health status

### Example Response - AI Analysis
```json
{
  "status": "success",
  "data": {
    "ai_analysis": {
      "overall_efficiency": 87.3,
      "underperformers": [...],
      "overperformers": [...],
      "relative_efficiency": {...},
      "ai_insights": {
        "summary": "Good production performance with 3 employees needing attention",
        "recommendations": [...],
        "predictions": {...}
      }
    },
    "hierarchy": {...}
  }
}
```

## 🤖 AI Analysis Features

### Efficiency Analysis
- **Overall Efficiency**: System-wide performance metrics
- **Underperformer Detection**: Employees below 85% threshold
- **Top Performer Identification**: Benchmarking within operations
- **Relative Efficiency**: Performance relative to operation's best performer

### AI Insights Generation
- **Performance Categorization**: Excellent (95%+), Good (85-94%), Needs Improvement (70-84%), Critical (<70%)
- **Pattern Recognition**: Line-wise and operation-wise performance analysis
- **Predictive Analytics**: Efficiency forecasting and trend analysis
- **Automated Recommendations**: Data-driven improvement suggestions

### WhatsApp Alert Logic
```
For each employee with efficiency < 85%:
1. Group by NewOperSeq (operation)
2. Find highest ProdnPcs in that operation = 100% benchmark
3. Calculate relative efficiency
4. If relative efficiency < 85%: Send WhatsApp alert
5. Rate limit: Max 1 alert per employee per 5 minutes
```

## 🔄 Background Monitoring

The system automatically:
1. **Fetches data every 10 minutes** from SQL Server
2. **Performs AI analysis** on latest production data
3. **Sends WhatsApp alerts** for underperformers
4. **Logs all activities** for monitoring

## 📱 WhatsApp Alert Format
```
🚨 FABRIC PULSE AI - LOW PERFORMANCE ALERT 🚨

👤 Employee: John Doe
🏢 Unit: Unit-A | Floor: Floor-1 | Line: Line-3
⚙️ Operation: OP-001

📉 Current Efficiency: 78.5%
🎯 Target: 85%+
📊 Performance Gap: -6.5%

🔴 Status: Employee below 85% efficiency threshold
⚡ Action Required: Fix this to increase production efficiency

📅 Time: 2025-01-15 14:30:25
```

## 🔧 Windows Service Management

### Installation
```bash
python windows_service_fabric_pulse.py install
```

### Control Commands
```bash
# Start service
python windows_service_fabric_pulse.py start

# Stop service  
python windows_service_fabric_pulse.py stop

# Restart service
python windows_service_fabric_pulse.py restart

# Check status
python windows_service_fabric_pulse.py status

# Uninstall service
python windows_service_fabric_pulse.py remove
```

### Service Monitoring
- **Logs Location**: `C:/FabricPulseAI/logs/`
- **Auto-restart**: Up to 10 attempts with exponential backoff
- **Health Checks**: Every 30 seconds with detailed logging
- **Service Name**: "Fabric Pulse AI - Enhanced RTMS Service"

## 📈 Performance Optimization

### Database Optimization
- **Connection Pooling**: Reuse database connections
- **Query Optimization**: Indexed queries with filters
- **Data Caching**: In-memory caching for frequent queries

### AI Model Optimization
- **GPU Acceleration**: CUDA support for faster inference
- **Model Caching**: Pre-loaded models for instant analysis
- **Batch Processing**: Efficient data processing

## 🛡️ Security Features

- **Read-Only Database Access**: No data modification capabilities
- **Rate Limiting**: Prevent alert spam and API abuse  
- **Input Validation**: Secure data processing
- **Error Handling**: Comprehensive exception management
- **Audit Logging**: Complete activity tracking

## 📋 Monitoring & Logging

### Log Files
- `fabric_pulse_ai.log` - Application logs
- `fabric_pulse_ai_service.log` - Windows service logs  
- `fabric_pulse_ai_debug.log` - Detailed debugging information

### Key Metrics Tracked
- Database connection status
- AI analysis performance
- WhatsApp delivery status  
- System resource usage
- Error rates and recovery

## 🚨 Troubleshooting

### Common Issues

**Service won't start:**
```bash
# Check logs
type C:\FabricPulseAI\logs\fabric_pulse_ai_service.log

# Verify dependencies
pip install -r requirements.txt

# Test database connection
python -c "from main import rtms_engine; print('DB:', len(rtms_engine.connect_and_fetch_data()))"
```

**Database connection issues:**
- Verify SQL Server is accessible from the machine
- Check ODBC Driver 17 for SQL Server is installed
- Validate credentials and network connectivity

**WhatsApp alerts not sending:**
- Configure Twilio credentials in environment variables
- Check rate limiting logs
- Verify recipient phone numbers format

## 📞 Production Support

### Health Check Endpoint
`GET /api/rtms/status` provides comprehensive system health information.

### Performance Monitoring
The system tracks and reports:
- Database query response times
- AI analysis processing time  
- WhatsApp delivery rates
- System resource utilization

---

## 🎯 Production Checklist

- [ ] SQL Server connectivity verified
- [ ] ODBC Driver 17 installed
- [ ] Python dependencies installed
- [ ] Windows Service installed and running
- [ ] WhatsApp credentials configured
- [ ] Log monitoring setup
- [ ] Health check endpoints responding
- [ ] AI models loaded successfully

**Status**: ✅ Production Ready - Enhanced Backend with AI Integration