#!/usr/bin/env python3
"""
Enhanced WhatsApp Alert Service for Fabric Pulse AI
Integrated with RTMS for automated production monitoring alerts
Uses Twilio API with enhanced error handling and rate limiting
"""

import requests
import logging
import time
from typing import List, Dict, Optional
from dataclasses import dataclass
import os
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

@dataclass
class WhatsAppConfig:
    account_sid: str
    auth_token: str
    whatsapp_number: str  # Twilio sandbox number
    
class EnhancedWhatsAppService:
    """Enhanced WhatsApp Service with rate limiting and better error handling"""
    
    def __init__(self):
        # Enhanced configuration with environment variables
        self.config = WhatsAppConfig(
            account_sid=os.getenv('TWILIO_ACCOUNT_SID', 'your_account_sid'),
            auth_token=os.getenv('TWILIO_AUTH_TOKEN', 'your_auth_token'),
            whatsapp_number=os.getenv('TWILIO_WHATSAPP_NUMBER', 'whatsapp:+14155238886')
        )
        
        # Management WhatsApp numbers (as per requirement - send to you for now)
        self.management_numbers = [
            'whatsapp:+919876543210',  # Default number as per requirements
        ]
        
        # Rate limiting
        self.last_alert_times = {}
        self.min_alert_interval = timedelta(minutes=5)  # Minimum 5 minutes between alerts
        self.daily_alert_count = {}
        self.max_alerts_per_day = 50
    
    def send_alert(self, alert: Dict, recipients: List[str] = None) -> bool:
        """Send WhatsApp alert with rate limiting and enhanced error handling"""
        try:
            # Generate alert key for rate limiting
            alert_key = f"{alert.get('unit_id', '')}_{alert.get('line_id', '')}_{alert.get('employee', alert.get('operation_id', ''))}"
            
            # Check rate limiting
            if not self.can_send_alert(alert_key):
                logger.info(f"Alert suppressed due to rate limiting: {alert_key}")
                return False
            
            if recipients is None:
                recipients = self.management_numbers
            
            message = self.format_alert_message(alert)
            
            success_count = 0
            for recipient in recipients:
                try:
                    if self.send_message(recipient, message):
                        success_count += 1
                        logger.info(f"✅ Alert sent successfully to {recipient}")
                    else:
                        logger.error(f"❌ Failed to send alert to {recipient}")
                except Exception as recipient_error:
                    logger.error(f"❌ Error sending to {recipient}: {recipient_error}")
                    continue
            
            # Record successful alert
            if success_count > 0:
                self.record_alert_sent(alert_key)
                logger.info(f"📱 WhatsApp alert sent successfully (recipients: {success_count}/{len(recipients)})")
            
            return success_count > 0
            
        except Exception as e:
            logger.error(f"❌ WhatsApp alert service failed: {e}")
            return False
    
    def send_message(self, to_number: str, message: str) -> bool:
        """Send individual WhatsApp message via Twilio"""
        try:
            # Twilio WhatsApp API endpoint
            url = f"https://api.twilio.com/2010-04-01/Accounts/{self.config.account_sid}/Messages.json"
            
            # Message data
            data = {
                'From': self.config.whatsapp_number,
                'To': to_number,
                'Body': message
            }
            
            # Send request
            response = requests.post(
                url,
                data=data,
                auth=(self.config.account_sid, self.config.auth_token)
            )
            
            if response.status_code == 201:
                logger.info(f"Message sent successfully to {to_number}")
                return True
            else:
                logger.error(f"Failed to send message: {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Message sending failed: {e}")
            return False
    
    def can_send_alert(self, alert_key: str) -> bool:
        """Check if alert can be sent based on rate limiting"""
        now = datetime.now()
        today = now.date()
        
        # Check daily limit
        if today not in self.daily_alert_count:
            self.daily_alert_count = {today: 0}  # Reset for new day
        
        if self.daily_alert_count[today] >= self.max_alerts_per_day:
            logger.warning(f"Daily alert limit reached ({self.max_alerts_per_day})")
            return False
        
        # Check minimum interval
        if alert_key in self.last_alert_times:
            time_since_last = now - self.last_alert_times[alert_key]
            if time_since_last < self.min_alert_interval:
                logger.info(f"Alert suppressed due to rate limit: {alert_key}")
                return False
        
        return True
    
    def record_alert_sent(self, alert_key: str):
        """Record that an alert was sent for rate limiting"""
        now = datetime.now()
        today = now.date()
        
        self.last_alert_times[alert_key] = now
        if today in self.daily_alert_count:
            self.daily_alert_count[today] += 1
        else:
            self.daily_alert_count[today] = 1
    
    def format_underperformer_alert(self, alert: Dict) -> str:
        """Format underperformer alert message as per requirement (Point 5)"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        message = f"""
🚨 *FABRIC PULSE AI - LOW PERFORMANCE ALERT* 🚨

👤 *Employee*: {alert.get('employee', 'Unknown')}
🏢 *Unit*: {alert.get('unit_id', 'Unknown')}
🏢 *Floor*: {alert.get('floor', 'Unknown')} 
🏭 *Line*: {alert.get('line_id', 'Unknown')}
⚙️ *Operation*: {alert.get('operation_id', 'Unknown')}

📉 *Current Efficiency*: {alert.get('efficiency', 0):.1f}%
🎯 *Target*: 85%+
📊 *Performance Gap*: -{(85 - alert.get('efficiency', 0)):.1f}%

🔴 *Status*: Employee below 85% efficiency threshold
⚡ *Action Required*: Fix this to increase production efficiency

📅 *Time*: {timestamp}

_Fabric Pulse AI - Real Time Monitoring System_
        """.strip()
        
        return message
        
    def format_alert_message(self, alert: Dict) -> str:
        """Format general alert as WhatsApp message"""
        # Check if this is an underperformer alert
        if alert.get('employee'):
            return self.format_underperformer_alert(alert)
            
        # General alert format
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        severity_emoji = {
            "CRITICAL": "🚨",
            "HIGH": "⚠️",
            "MEDIUM": "📢"
        }
        
        emoji = severity_emoji.get(alert.get('severity', 'MEDIUM'), '📢')
        
        message = f"""
{emoji} *FABRIC PULSE AI - PRODUCTION ALERT* {emoji}

📊 *Unit*: {alert.get('unit_id', 'Unknown')}
🏭 *Line*: {alert.get('line_id', 'Unknown')}
⚙️ *Operation*: {alert.get('operation_id', 'Unknown')}

📉 *Efficiency*: {alert.get('efficiency', 0):.1f}%
🎯 *Target*: 85%+

⚡ *Issue*: {alert.get('message', 'Production efficiency below target')}

🕐 *Time*: {timestamp}

_Fabric Pulse AI - RTMS_
        """.strip()
        
        return message
    
    def send_daily_summary(self, summary: Dict) -> bool:
        """Send daily production summary to management"""
        try:
            message = self.format_summary_message(summary)
            
            success_count = 0
            for recipient in self.management_numbers:
                if self.send_message(recipient, message):
                    success_count += 1
            
            return success_count > 0
            
        except Exception as e:
            logger.error(f"Daily summary failed: {e}")
            return False
    
    def format_summary_message(self, summary: Dict) -> str:
        """Format daily summary as WhatsApp message"""
        date = datetime.now().strftime("%Y-%m-%d")
        
        message = f"""
📊 *DAILY PRODUCTION SUMMARY* 📊

📅 *Date*: {date}

🏭 *Overall Performance*:
• Avg Efficiency: {summary.get('avg_efficiency', 0):.1f}%
• Total Alerts: {summary.get('total_alerts', 0)}
• Critical Issues: {summary.get('critical_alerts', 0)}

📈 *Top Performing Units*:
{summary.get('top_units', 'No data available')}

📉 *Units Needing Attention*:
{summary.get('attention_units', 'No issues detected')}

🎯 *Targets Met*: {summary.get('targets_met', 0)}/{summary.get('total_targets', 0)}

_Production Monitoring AI System_
        """.strip()
        
        return message

# Alternative: Open Source WhatsApp Service using WhatsApp Business API
class OpenSourceWhatsAppService:
    """
    Alternative implementation using open-source WhatsApp solutions
    Requires WhatsApp Business API setup
    """
    
    def __init__(self, webhook_url: str = None):
        self.webhook_url = webhook_url or "http://localhost:3000/webhook"
        self.base_url = "http://localhost:3001"  # Local WhatsApp service
    
    def send_alert_via_webhook(self, alert: Dict) -> bool:
        """Send alert via webhook to WhatsApp service"""
        try:
            message_data = {
                "type": "alert",
                "recipients": ["+919876543210", "+919876543211"],  # Management numbers
                "message": self.format_alert_message_simple(alert),
                "timestamp": datetime.now().isoformat()
            }
            
            response = requests.post(
                f"{self.base_url}/send-message",
                json=message_data,
                timeout=10
            )
            
            return response.status_code == 200
            
        except Exception as e:
            logger.error(f"Webhook WhatsApp failed: {e}")
            return False
    
    def format_alert_message_simple(self, alert: Dict) -> str:
        """Simple alert message format"""
        return f"""
🚨 Production Alert 🚨

Unit: {alert.get('unit_id')} | Line: {alert.get('line_id')}
Efficiency: {alert.get('efficiency', 0):.1f}% (Target: 85%+)

{alert.get('message', 'Production issue detected')}

Time: {datetime.now().strftime('%H:%M:%S')}
        """.strip()

# Enhanced factory function
def create_whatsapp_service(service_type: str = "enhanced") -> 'EnhancedWhatsAppService':
    """Factory function to create enhanced WhatsApp service"""
    if service_type == "enhanced":
        return EnhancedWhatsAppService()
    elif service_type == "twilio":
        return EnhancedWhatsAppService()  # Use enhanced version
    elif service_type == "opensource":
        return OpenSourceWhatsAppService()
    else:
        raise ValueError(f"Unknown service type: {service_type}")

# For backward compatibility
WhatsAppService = EnhancedWhatsAppService