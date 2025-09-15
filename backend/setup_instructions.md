# Production Monitoring AI Service - Setup Instructions

## 🚀 Complete Setup Guide (Step-by-Step)

### Prerequisites
- Python 3.8 or higher
- pip (Python package manager)
- Git (optional, for cloning)

### Step 1: Environment Setup

```bash
# Create project directory
mkdir production-monitoring-ai
cd production-monitoring-ai

# Create Python virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Verify Python version
python --version
```

### Step 2: Install Dependencies

```bash
# Install all required packages
pip install -r requirements.txt

# Verify installation
pip list
```

### Step 3: Configuration

#### Environment Variables Setup
Create a `.env` file in the backend directory:

```bash
# Create .env file
cat > .env << EOL
# Twilio Configuration (Free Tier)
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Management WhatsApp Numbers (Replace with actual numbers)
MANAGEMENT_NUMBERS=whatsapp:+919876543210,whatsapp:+919876543211

# Database Configuration
DB_PATH=production.db

# Monitoring Configuration
EFFICIENCY_THRESHOLD=85.0
MONITORING_INTERVAL=600  # 10 minutes in seconds

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
EOL
```

#### Twilio WhatsApp Setup (Free Option)
1. Sign up for Twilio account (free tier includes WhatsApp sandbox)
2. Get Account SID and Auth Token from Twilio Console
3. Join WhatsApp Sandbox: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
4. Send "join <sandbox-name>" to +1 415 523 8886
5. Update `.env` with your credentials

### Step 4: Database Setup

```bash
# Initialize database
python -c "
from main import ProductionMonitor
monitor = ProductionMonitor()
print('Database initialized successfully!')
"

# Generate demo data
python data_generator.py
```

### Step 5: Testing the System

#### Test API Server
```bash
# Start API server
python main.py

# Test in another terminal
curl http://localhost:8000/
curl http://localhost:8000/api/status
curl http://localhost:8000/api/analyze
```

#### Test WhatsApp Service
```bash
# Test WhatsApp (replace with your number)
python -c "
from whatsapp_service import create_whatsapp_service
from data_generator import ProductionDataGenerator

# Generate test alert
generator = ProductionDataGenerator()
whatsapp = create_whatsapp_service('twilio')

test_alert = {
    'unit_id': 'Unit-A',
    'line_id': 'Line-1', 
    'operation_id': 'Sewing',
    'style': 'Style-001',
    'efficiency': 65.5,
    'alert_type': 'LOW_EFFICIENCY',
    'message': 'Test alert from Production AI',
    'severity': 'HIGH'
}

success = whatsapp.send_alert(test_alert)
print(f'WhatsApp test: {\"Success\" if success else \"Failed\"}')
"
```

### Step 6: Start Full Monitoring System

```bash
# Start the complete monitoring system
python scheduler.py
```

The system will:
- ✅ Analyze production data every 10 minutes
- ✅ Send WhatsApp alerts for efficiency < 85%
- ✅ Detect operator absenteeism
- ✅ Monitor all units/lines/operations
- ✅ Generate daily summaries

### Step 7: API Endpoints

Once running, access these endpoints:

- **API Status**: http://localhost:8000/api/status
- **Run Analysis**: http://localhost:8000/api/analyze
- **System Health**: http://localhost:8000/

### Directory Structure

```
production-monitoring-ai/
├── backend/
│   ├── main.py              # FastAPI server & AI logic
│   ├── scheduler.py         # 10-minute monitoring scheduler
│   ├── whatsapp_service.py  # WhatsApp alert system
│   ├── data_generator.py    # Demo data generation
│   ├── requirements.txt     # Python dependencies
│   ├── .env                 # Configuration file
│   └── production.db        # SQLite database (auto-created)
├── frontend/               # React dashboard (separate)
└── docs/                  # Documentation
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Virtual Environment Issues
```bash
# If activation fails, try:
python -m pip install --user virtualenv
virtualenv venv
```

#### 2. Package Installation Errors
```bash
# Upgrade pip first
python -m pip install --upgrade pip
pip install -r requirements.txt
```

#### 3. Database Permission Issues
```bash
# Ensure write permissions
chmod 755 .
chmod 666 production.db  # If exists
```

#### 4. WhatsApp Connection Issues
- Verify Twilio credentials in `.env`
- Ensure phone number format: `whatsapp:+919876543210`
- Check WhatsApp sandbox activation
- Test with Twilio Console first

#### 5. Port Already in Use
```bash
# Check what's using port 8000
lsof -i :8000

# Use different port
uvicorn main:app --host 0.0.0.0 --port 8080
```

### Production Deployment

#### For Production Environment:
1. Use proper WhatsApp Business API (not sandbox)
2. Set up SSL certificates
3. Use production-grade database (PostgreSQL/MySQL)
4. Configure monitoring and logging
5. Set up backup systems

#### Docker Deployment (Optional):
```dockerfile
# Dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["python", "scheduler.py"]
```

## 📊 System Monitoring

### Log Files
The system generates logs for:
- Production analysis results
- WhatsApp alert status
- Database operations
- System health checks

### Performance Metrics
Monitor these key metrics:
- Alert response time
- Database query performance
- WhatsApp delivery rates
- System uptime

## 🎯 Next Steps

1. **Customize Alerts**: Modify alert thresholds in `main.py`
2. **Add More Metrics**: Extend database schema for additional KPIs
3. **Integration**: Connect to existing ERP/MES systems
4. **Mobile App**: Build mobile dashboard for managers
5. **Advanced AI**: Add machine learning for predictive analytics

## 🆘 Support

If you encounter issues:
1. Check logs in terminal output
2. Verify all dependencies are installed
3. Ensure database permissions are correct
4. Test WhatsApp service separately
5. Contact technical support if needed

**The system is now ready for production monitoring!** 🎉