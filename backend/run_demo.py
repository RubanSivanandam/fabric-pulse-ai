#!/usr/bin/env python3
"""
Production Monitoring Demo Script
Quick demo to show the system working
"""

import asyncio
import time
import logging
from main import ProductionMonitor
from whatsapp_service import create_whatsapp_service
from data_generator import ProductionDataGenerator

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ProductionDemo:
    def __init__(self):
        self.monitor = ProductionMonitor()
        self.whatsapp_service = create_whatsapp_service("twilio")
        self.data_generator = ProductionDataGenerator()
    
    def run_complete_demo(self):
        """Run complete demonstration of the system"""
        print("\n" + "="*60)
        print("🏭 PRODUCTION MONITORING AI - LIVE DEMO")
        print("="*60)
        
        # Step 1: Initialize system
        print("\n📊 Step 1: Initializing System...")
        self.monitor.init_database()
        print("✅ Database initialized")
        
        # Step 2: Generate demo data
        print("\n📈 Step 2: Generating Production Data...")
        self.data_generator.generate_initial_data()
        print("✅ Production data generated")
        
        # Step 3: Show current status
        print("\n📋 Step 3: Current Production Status...")
        summary = self.data_generator.get_production_summary()
        self.display_production_summary(summary)
        
        # Step 4: Simulate production issues
        print("\n⚠️ Step 4: Simulating Production Issues...")
        self.data_generator.simulate_production_issues()
        print("✅ Issues simulated (low efficiency, absenteeism)")
        
        # Step 5: Run AI analysis
        print("\n🤖 Step 5: Running AI Analysis...")
        alerts = self.monitor.analyze_production_efficiency()
        self.display_alerts(alerts)
        
        # Step 6: Send WhatsApp alerts
        print("\n📱 Step 6: Sending WhatsApp Alerts...")
        self.send_demo_alerts(alerts)
        
        # Step 7: Show system capabilities
        print("\n🎯 Step 7: System Capabilities Demo...")
        self.demonstrate_capabilities()
        
        print("\n" + "="*60)
        print("✨ DEMO COMPLETED SUCCESSFULLY!")
        print("="*60)
        print("\n🚀 The system is now ready for production use!")
        print("📊 Dashboard: http://localhost:3000")
        print("🔧 API: http://localhost:8000")
        print("\n💡 Next steps:")
        print("   1. Configure WhatsApp credentials in .env")
        print("   2. Start scheduler: python scheduler.py")
        print("   3. Access live dashboard in browser")
    
    def display_production_summary(self, summary):
        """Display production summary in formatted way"""
        print(f"   • Active Units: {summary.get('active_units', 0)}")
        print(f"   • Active Lines: {summary.get('active_lines', 0)}")
        print(f"   • Active Operations: {summary.get('active_operations', 0)}")
        print(f"   • Average Efficiency: {summary.get('avg_efficiency', 0):.1f}%")
        print(f"   • Total Target: {summary.get('total_target', 0)} pcs")
        print(f"   • Total Actual: {summary.get('total_actual', 0)} pcs")
    
    def display_alerts(self, alerts):
        """Display alerts in formatted way"""
        if not alerts:
            print("   ✅ No alerts - all production within targets!")
            return
        
        print(f"   🚨 Generated {len(alerts)} alerts:")
        
        for i, alert in enumerate(alerts, 1):
            severity_emoji = {
                "CRITICAL": "🔴",
                "HIGH": "🟡", 
                "MEDIUM": "🟠"
            }
            emoji = severity_emoji.get(alert.get('severity', 'MEDIUM'), '🟠')
            
            print(f"\n   {emoji} Alert {i}:")
            print(f"      Unit: {alert.get('unit_id')}")
            print(f"      Line: {alert.get('line_id')}")
            print(f"      Operation: {alert.get('operation_id')}")
            print(f"      Efficiency: {alert.get('efficiency', 0):.1f}%")
            print(f"      Type: {alert.get('alert_type')}")
            print(f"      Severity: {alert.get('severity')}")
    
    def send_demo_alerts(self, alerts):
        """Send demo WhatsApp alerts"""
        if not alerts:
            print("   ✅ No alerts to send")
            return
        
        # Send only first alert for demo
        test_alert = alerts[0]
        
        try:
            # Create demo message
            demo_message = f"""
🚨 DEMO ALERT 🚨

This is a demonstration of the Production Monitoring AI System.

Unit: {test_alert.get('unit_id')}
Line: {test_alert.get('line_id')}
Efficiency: {test_alert.get('efficiency', 0):.1f}%
Status: {test_alert.get('alert_type')}

In production, this would be sent to management WhatsApp numbers.

System Status: ✅ OPERATIONAL
            """.strip()
            
            print(f"   📱 Demo WhatsApp Message:")
            print("   " + "-" * 40)
            for line in demo_message.split('\n'):
                print(f"   {line}")
            print("   " + "-" * 40)
            
            # In production, uncomment this to send actual WhatsApp
            # success = self.whatsapp_service.send_alert(test_alert)
            # print(f"   {'✅' if success else '❌'} WhatsApp Status: {'Sent' if success else 'Failed'}")
            
            print("   ℹ️ Note: Configure Twilio credentials to send real WhatsApp messages")
            
        except Exception as e:
            logger.error(f"Demo alert failed: {e}")
            print(f"   ❌ Demo alert error: {e}")
    
    def demonstrate_capabilities(self):
        """Demonstrate key system capabilities"""
        capabilities = [
            "✅ Real-time production monitoring (every 10 minutes)",
            "✅ AI-powered efficiency analysis",
            "✅ Automatic alert generation (< 85% threshold)",
            "✅ WhatsApp integration for instant notifications",
            "✅ Exception detection (absenteeism, low performance)",
            "✅ Multi-level monitoring (Unit → Line → Operation → Style)",
            "✅ Historical data tracking and trends",
            "✅ Daily production summaries",
            "✅ Web dashboard with real-time charts",
            "✅ REST API for system integration",
            "✅ SQLite database (production-ready)",
            "✅ Scalable architecture (FastAPI + React)"
        ]
        
        print("   🎯 System Capabilities:")
        for capability in capabilities:
            print(f"   {capability}")
            time.sleep(0.1)  # Small delay for visual effect
    
    def quick_test(self):
        """Quick test for system validation"""
        print("\n🔧 Running Quick System Test...")
        
        try:
            # Test database
            self.monitor.init_database()
            print("   ✅ Database: OK")
            
            # Test data generation
            self.data_generator.generate_batch_data()
            print("   ✅ Data Generation: OK")
            
            # Test analysis
            alerts = self.monitor.analyze_production_efficiency()
            print(f"   ✅ AI Analysis: OK ({len(alerts)} alerts)")
            
            # Test WhatsApp service (without sending)
            whatsapp = create_whatsapp_service("twilio")
            print("   ✅ WhatsApp Service: OK")
            
            print("\n✅ All systems operational!")
            return True
            
        except Exception as e:
            print(f"\n❌ System test failed: {e}")
            return False

def main():
    """Main demo function"""
    demo = ProductionDemo()
    
    # Check if user wants quick test or full demo
    choice = input("\nSelect demo type:\n1. Quick Test\n2. Full Demo\nEnter choice (1 or 2): ").strip()
    
    if choice == "1":
        demo.quick_test()
    else:
        demo.run_complete_demo()

if __name__ == "__main__":
    main()