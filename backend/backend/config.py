#!/usr/bin/env python3
"""
Fabric Pulse AI - Configuration Management
Centralized configuration for database, AI models, and service settings
"""

import os
from dataclasses import dataclass
from typing import Optional, Dict, Any
from pathlib import Path

@dataclass
class DatabaseConfig:
    """Database connection configuration"""
    server: str = '172.16.9.240'
    database: str = 'ITR_PRO_IND'
    username: str = 'sa'
    password: str = 'Passw0rd'
    driver: str = 'ODBC Driver 17 for SQL Server'
    timeout: int = 30
    
    def get_connection_string(self) -> str:
        """Build SQL Server connection string"""
        return (
            f"DRIVER={{{self.driver}}};"
            f"SERVER={self.server};"
            f"DATABASE={self.database};"
            f"UID={self.username};"
            f"PWD={self.password};"
            f"CONNECTION TIMEOUT={self.timeout};"
        )

@dataclass
class AIConfig:
    """AI model configuration"""
    primary_model: str = "microsoft/DialoGPT-medium"
    llama_model: str = "meta-llama/Llama-2-7b-chat-hf"
    use_gpu: bool = True
    max_length: int = 512
    temperature: float = 0.7
    cache_dir: Optional[str] = None

@dataclass
class AlertConfig:
    """Alert system configuration"""
    efficiency_threshold: float = 85.0
    critical_threshold: float = 70.0
    whatsapp_enabled: bool = True
    alert_interval_minutes: int = 10
    max_alerts_per_hour: int = 20

@dataclass
class ServiceConfig:
    """Service configuration"""
    host: str = "0.0.0.0"
    port: int = 8000
    log_level: str = "INFO"
    reload: bool = False
    workers: int = 1
    monitoring_interval: int = 10  # minutes
    max_restart_attempts: int = 10
    restart_delay: int = 45

class FabricPulseConfig:
    """Main configuration class"""
    
    def __init__(self):
        self.database = DatabaseConfig()
        self.ai = AIConfig()
        self.alerts = AlertConfig()
        self.service = ServiceConfig()
        
        # Load environment variables if available
        self._load_from_environment()
    
    def _load_from_environment(self):
        """Load configuration from environment variables"""
        # Database configuration
        if os.getenv('DB_SERVER'):
            self.database.server = os.getenv('DB_SERVER')
        if os.getenv('DB_DATABASE'):
            self.database.database = os.getenv('DB_DATABASE')
        if os.getenv('DB_USERNAME'):
            self.database.username = os.getenv('DB_USERNAME')
        if os.getenv('DB_PASSWORD'):
            self.database.password = os.getenv('DB_PASSWORD')
        
        # Service configuration
        if os.getenv('SERVICE_HOST'):
            self.service.host = os.getenv('SERVICE_HOST')
        if os.getenv('SERVICE_PORT'):
            try:
                self.service.port = int(os.getenv('SERVICE_PORT'))
            except ValueError:
                pass
        
        # Alert configuration
        if os.getenv('EFFICIENCY_THRESHOLD'):
            try:
                self.alerts.efficiency_threshold = float(os.getenv('EFFICIENCY_THRESHOLD'))
            except ValueError:
                pass
        
        # AI configuration
        if os.getenv('AI_CACHE_DIR'):
            self.ai.cache_dir = os.getenv('AI_CACHE_DIR')
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert configuration to dictionary"""
        return {
            "database": {
                "server": self.database.server,
                "database": self.database.database,
                "username": self.database.username,
                # Don't expose password
                "driver": self.database.driver,
                "timeout": self.database.timeout
            },
            "ai": {
                "primary_model": self.ai.primary_model,
                "llama_model": self.ai.llama_model,
                "use_gpu": self.ai.use_gpu,
                "max_length": self.ai.max_length,
                "temperature": self.ai.temperature
            },
            "alerts": {
                "efficiency_threshold": self.alerts.efficiency_threshold,
                "critical_threshold": self.alerts.critical_threshold,
                "whatsapp_enabled": self.alerts.whatsapp_enabled,
                "alert_interval_minutes": self.alerts.alert_interval_minutes
            },
            "service": {
                "host": self.service.host,
                "port": self.service.port,
                "log_level": self.service.log_level,
                "monitoring_interval": self.service.monitoring_interval
            }
        }

# Global configuration instance
config = FabricPulseConfig()