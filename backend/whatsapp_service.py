#!/usr/bin/env python3
"""
WhatsApp Alert Service for Production Monitoring
Uses Twilio API for WhatsApp messaging (free tier available)
"""

import requests
import logging
from typing import List, Dict
from dataclasses import dataclass
import os
from datetime import datetime

logger = logging.getLogger(__name__)

@dataclass
class WhatsAppConfig:
    account_sid: str
    auth_token: str
    whatsapp_number: str  # Twilio sandbox number
    
class WhatsAppService:
    def __init__(self):
        # Configuration - set these as environment variables
        self.config = WhatsAppConfig(
            account_sid=os.getenv('TWILIO_ACCOUNT_SID', 'your_account_sid'),
            auth_token=os.getenv('TWILIO_AUTH_TOKEN', 'your_auth_token'),
            whatsapp_number=os.getenv('TWILIO_WHATSAPP_NUMBER', 'whatsapp:+14155238886')  # Twilio sandbox
        )
        
        # Management WhatsApp numbers (replace with actual numbers)
        self.management_numbers = [
            'whatsapp:+919876543210',  # Production Manager
            'whatsapp:+919876543211',  # Plant Manager
            'whatsapp:+919876543212',  # Quality Manager
        ]
    
    def send_alert(self, alert: Dict, recipients: List[str] = None) -> bool:
        """Send WhatsApp alert to management"""
        try:
            if recipients is None:
                recipients = self.management_numbers
            
            message = self.format_alert_message(alert)
            
            success_count = 0
            for recipient in recipients:
                if self.send_message(recipient, message):
                    success_count += 1
                    logger.info(f"Alert sent to {recipient}")
                else:
                    logger.error(f"Failed to send alert to {recipient}")
            
            return success_count > 0
            
        except Exception as e:
            logger.error(f"WhatsApp alert failed: {e}")
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
    
    def format_alert_message(self, alert: Dict) -> str:
        """Format alert as WhatsApp message"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        severity_emoji = {
            "CRITICAL": "🚨",
            "HIGH": "⚠️",
            "MEDIUM": "📢"
        }
        
        emoji = severity_emoji.get(alert.get('severity', 'MEDIUM'), '📢')
        
        message = f"""
{emoji} *PRODUCTION ALERT* {emoji}

📊 *Unit*: {alert.get('unit_id', 'Unknown')}
🏭 *Line*: {alert.get('line_id', 'Unknown')}
⚙️ *Operation*: {alert.get('operation_id', 'Unknown')}
👕 *Style*: {alert.get('style', 'Unknown')}

📉 *Efficiency*: {alert.get('efficiency', 0):.1f}%
🎯 *Target*: 85%+

⚡ *Alert Type*: {alert.get('alert_type', 'Unknown')}

💬 *Details*: {alert.get('message', 'No details available')}

🕐 *Time*: {timestamp}

_Production Monitoring AI System_
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

# Factory function to create appropriate service
def create_whatsapp_service(service_type: str = "twilio"):
    """Factory function to create WhatsApp service"""
    if service_type == "twilio":
        return WhatsAppService()
    elif service_type == "opensource":
        return OpenSourceWhatsAppService()
    else:
        raise ValueError(f"Unknown service type: {service_type}")