"""
Production-Ready Twilio WhatsApp Service for RTMS
UPDATED: Temporarily disabled WhatsApp notifications
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import asyncio
import json

from twilio.rest import Client
from twilio.base.exceptions import TwilioException

from config import config

logger = logging.getLogger(__name__)

@dataclass
class AlertMessage:
    """Structure for alert messages"""
    employee_name: str
    employee_code: str
    unit_code: str
    floor_name: str
    line_name: str
    operation: str
    current_efficiency: float
    target_efficiency: float = 85.0
    production: int = 0
    target_production: int = 0
    priority: str = "MEDIUM"

class ProductionReadyWhatsAppService:
    """
    Production-ready WhatsApp service with Twilio integration
    UPDATED: Temporarily disabled for testing
    """
    
    def __init__(self):
        self.config = config.twilio
        
        # TEMPORARILY DISABLED FLAG
        self.temporarily_disabled = True
        logger.info("🚫 WhatsApp service temporarily DISABLED")
        
        # Only initialize if not disabled
        if not self.temporarily_disabled:
            # Validate configuration
            if not self.config.is_configured():
                logger.error("❌ Twilio configuration incomplete!")
                raise ValueError("Twilio configuration is incomplete. Check your .env file.")
            
            # Initialize Twilio client
            try:
                self.client = Client(self.config.account_sid, self.config.auth_token)
                logger.info("✅ Twilio client initialized successfully")
                
                # Test connection
                self._test_connection()
                
            except Exception as e:
                logger.error(f"❌ Failed to initialize Twilio client: {e}")
                raise
        else:
            self.client = None
            logger.info("🚫 Twilio client initialization skipped - service disabled")
        
        # Rate limiting
        self.last_alert_times: Dict[str, datetime] = {}
        self.daily_alert_count: Dict[str, int] = {}
        self.max_alerts_per_day = 50
        self.min_alert_interval = timedelta(minutes=5)
    
    def _test_connection(self):
        """Test Twilio connection"""
        if self.temporarily_disabled:
            logger.info("🚫 Twilio connection test skipped - service disabled")
            return
            
        try:
            # Get account info to test connection
            account = self.client.api.accounts(self.config.account_sid).fetch()
            logger.info(f"✅ Twilio connection test successful. Account: {account.friendly_name}")
            
        except TwilioException as e:
            logger.error(f"❌ Twilio connection test failed: {e}")
            raise
        except Exception as e:
            logger.error(f"❌ Unexpected error in connection test: {e}")
            raise
    
    async def send_efficiency_alert(self, alert_data: AlertMessage) -> bool:
        """
        Send efficiency alert via WhatsApp
        DISABLED: Returns False immediately
        """
        if self.temporarily_disabled:
            logger.info(f"🚫 WhatsApp alert DISABLED for {alert_data.employee_name} ({alert_data.current_efficiency:.1f}%)")
            return False
            
        try:
            # Generate unique alert key for rate limiting
            alert_key = f"{alert_data.employee_code}_{alert_data.operation}"
            
            # Check rate limiting
            if not self._can_send_alert(alert_key):
                logger.info(f"⏰ Alert suppressed due to rate limiting: {alert_key}")
                return False
            
            # Format message
            message_variables = {
                "1": f"{alert_data.employee_name} ({alert_data.employee_code})",
                "2": f"{alert_data.current_efficiency:.1f}%",
                "3": f"{alert_data.unit_code}",
                "4": f"{alert_data.line_name}",
                "5": f"{alert_data.operation}",
                "6": f"{alert_data.production}/{alert_data.target_production}",
                "7": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
            
            # Send message using Twilio
            message = self.client.messages.create(
                from_=self.config.whatsapp_number,
                content_sid=self.config.content_sid,
                content_variables=json.dumps(message_variables),
                to=self.config.alert_phone_number
            )
            
            # Record successful alert
            self._record_alert_sent(alert_key)
            
            logger.info(f"✅ WhatsApp alert sent successfully! Message SID: {message.sid}")
            logger.info(f"📱 Alert sent to: {self.config.alert_phone_number}")
            logger.info(f"👤 Employee: {alert_data.employee_name} ({alert_data.current_efficiency:.1f}%)")
            
            return True
            
        except TwilioException as e:
            logger.error(f"❌ Twilio error sending alert: {e}")
            logger.error(f"Error code: {e.code}, Error message: {e.msg}")
            return False
            
        except Exception as e:
            logger.error(f"❌ Unexpected error sending WhatsApp alert: {e}")
            return False
    
    def send_test_message(self) -> bool:
        """
        Send test message to verify WhatsApp integration
        DISABLED: Returns False immediately
        """
        if self.temporarily_disabled:
            logger.info("🚫 WhatsApp test message DISABLED")
            return False
            
        try:
            test_variables = {
                "1": "Test Employee (TEST001)",
                "2": "78.5%",
                "3": "TEST-UNIT",
                "4": "TEST-LINE",
                "5": "TEST-OPERATION", 
                "6": "150/200",
                "7": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
            
            message = self.client.messages.create(
                from_=self.config.whatsapp_number,
                content_sid=self.config.content_sid,
                content_variables=json.dumps(test_variables),
                to=self.config.alert_phone_number
            )
            
            logger.info(f"✅ Test message sent successfully! Message SID: {message.sid}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Test message failed: {e}")
            return False
    
    async def send_daily_summary(self, summary_data: Dict[str, Any]) -> bool:
        """Send daily production summary - DISABLED"""
        if self.temporarily_disabled:
            logger.info("🚫 Daily summary WhatsApp message DISABLED")
            return False
            
        try:
            # Create a simple text message for daily summary
            summary_text = self._format_daily_summary(summary_data)
            
            message = self.client.messages.create(
                from_=self.config.whatsapp_number,
                body=summary_text,
                to=self.config.alert_phone_number
            )
            
            logger.info(f"✅ Daily summary sent! Message SID: {message.sid}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to send daily summary: {e}")
            return False
    
    def _format_daily_summary(self, summary_data: Dict[str, Any]) -> str:
        """Format daily summary message"""
        date = datetime.now().strftime("%Y-%m-%d")
        
        return f"""📊 RTMS BOT - Daily Summary 📊
📅 Date: {date}

🏭 Overall Performance:
• Total Operators: {summary_data.get('total_operators', 0)}
• Avg Efficiency: {summary_data.get('avg_efficiency', 0):.1f}%
• Alerts Generated: {summary_data.get('total_alerts', 0)}

📈 Performance Status:
• Excellent (100%+): {summary_data.get('excellent_count', 0)}
• Good (85-99%): {summary_data.get('good_count', 0)}
• Needs Attention (<85%): {summary_data.get('attention_count', 0)}

🎯 Production Targets:
• Lines Meeting Target: {summary_data.get('lines_on_target', 0)}
• Total Production: {summary_data.get('total_production', 0)}

⚡ RTMS AI Monitoring System
"""
    
    def _can_send_alert(self, alert_key: str) -> bool:
        """Check if alert can be sent based on rate limiting"""
        if self.temporarily_disabled:
            return False
            
        now = datetime.now()
        today = now.date().isoformat()
        
        # Check daily limit
        if self.daily_alert_count.get(today, 0) >= self.max_alerts_per_day:
            logger.warning(f"⚠️ Daily alert limit reached ({self.max_alerts_per_day})")
            return False
        
        # Check minimum interval
        if alert_key in self.last_alert_times:
            time_since_last = now - self.last_alert_times[alert_key]
            if time_since_last < self.min_alert_interval:
                return False
        
        return True
    
    def _record_alert_sent(self, alert_key: str):
        """Record that an alert was sent for rate limiting"""
        now = datetime.now()
        today = now.date().isoformat()
        
        self.last_alert_times[alert_key] = now
        self.daily_alert_count[today] = self.daily_alert_count.get(today, 0) + 1
        
        logger.info(f"📊 Daily alert count: {self.daily_alert_count[today]}/{self.max_alerts_per_day}")
    
    def get_status(self) -> Dict[str, Any]:
        """Get service status"""
        return {
            "service": "Twilio WhatsApp Service",
            "status": "disabled" if self.temporarily_disabled else ("active" if self.config.is_configured() else "inactive"),
            "temporarily_disabled": self.temporarily_disabled,
            "bot_name": self.config.bot_name,
            "phone_number": self.config.alert_phone_number if not self.temporarily_disabled else "DISABLED",
            "daily_alerts": self.daily_alert_count.get(datetime.now().date().isoformat(), 0),
            "max_daily_alerts": self.max_alerts_per_day,
            "configuration_valid": self.config.is_configured() if not self.temporarily_disabled else "DISABLED"
        }

# Global service instance
whatsapp_service = ProductionReadyWhatsAppService()

