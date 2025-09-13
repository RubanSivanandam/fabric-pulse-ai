"""
Windows Service Configuration for Fabric Pulse AI
Runs the RTMS backend as a Windows Service
"""
import os
import sys
import time
import logging
import subprocess
from pathlib import Path

try:
    import win32service
    import win32serviceutil
    import win32event
    import servicemanager
except ImportError:
    print("⚠️ pywin32 not installed. Install with: pip install pywin32")
    print("After installation, run: python Scripts/pywin32_postinstall.py -install")
    sys.exit(1)

class FabricPulseAIService(win32serviceutil.ServiceFramework):
    """Windows Service for Fabric Pulse AI Backend"""
    
    _svc_name_ = "FabricPulseAI"
    _svc_display_name_ = "Fabric Pulse AI - RTMS Service"
    _svc_description_ = "Real-Time Monitoring System for Garment Production with AI Analytics"
    
    def __init__(self, args):
        win32serviceutil.ServiceFramework.__init__(self, args)
        self.hWaitStop = win32event.CreateEvent(None, 0, 0, None)
        self.is_running = True
        
        # Setup logging
        self.setup_logging()
        
    def setup_logging(self):
        """Setup service logging"""
        log_path = Path(__file__).parent / "logs"
        log_path.mkdir(exist_ok=True)
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_path / "fabric_pulse_service.log"),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger("FabricPulseAI")
    
    def SvcStop(self):
        """Stop the service"""
        self.logger.info("Fabric Pulse AI Service stopping...")
        self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
        win32event.SetEvent(self.hWaitStop)
        self.is_running = False
        
    def SvcDoRun(self):
        """Main service execution"""
        try:
            self.logger.info("Fabric Pulse AI Service starting...")
            servicemanager.LogMsg(
                servicemanager.EVENTLOG_INFORMATION_TYPE,
                servicemanager.PYS_SERVICE_STARTED,
                (self._svc_name_, '')
            )
            
            # Start the main service loop
            self.main_service()
            
        except Exception as e:
            self.logger.error(f"Service error: {e}")
            servicemanager.LogErrorMsg(f"Fabric Pulse AI Service error: {e}")
    
    def main_service(self):
        """Main service logic"""
        self.logger.info("Starting Fabric Pulse AI backend server...")
        
        # Path to the main application
        app_path = Path(__file__).parent / "fabric_pulse_ai_main.py"
        
        # Start FastAPI server as subprocess
        try:
            cmd = [
                sys.executable, 
                str(app_path),
                "--host", "0.0.0.0",
                "--port", "8000",
                "--workers", "1"
            ]
            
            self.logger.info(f"Starting server with command: {' '.join(cmd)}")
            
            # Start the process
            self.process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                cwd=str(app_path.parent)
            )
            
            self.logger.info(f"Server started with PID: {self.process.pid}")
            
            # Service monitoring loop
            while self.is_running:
                # Check if process is still running
                if self.process.poll() is not None:
                    self.logger.error("Server process died, restarting...")
                    self.restart_server()
                
                # Wait for stop signal or timeout
                rc = win32event.WaitForSingleObject(self.hWaitStop, 30000)  # 30 second timeout
                if rc == win32event.WAIT_OBJECT_0:
                    # Stop signal received
                    break
            
            # Clean shutdown
            if hasattr(self, 'process') and self.process.poll() is None:
                self.logger.info("Terminating server process...")
                self.process.terminate()
                self.process.wait(timeout=10)
                
        except Exception as e:
            self.logger.error(f"Failed to start server: {e}")
    
    def restart_server(self):
        """Restart the server process"""
        try:
            if hasattr(self, 'process'):
                self.process.terminate()
                
            app_path = Path(__file__).parent / "fabric_pulse_ai_main.py"
            cmd = [sys.executable, str(app_path)]
            
            self.process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                cwd=str(app_path.parent)
            )
            
            self.logger.info(f"Server restarted with PID: {self.process.pid}")
            
        except Exception as e:
            self.logger.error(f"Failed to restart server: {e}")

def install_service():
    """Install the Windows service"""
    try:
        win32serviceutil.InstallService(
            FabricPulseAIService._svc_reg_class_,
            FabricPulseAIService._svc_name_,
            FabricPulseAIService._svc_display_name_,
            description=FabricPulseAIService._svc_description_
        )
        print(f"✅ Service '{FabricPulseAIService._svc_display_name_}' installed successfully!")
        print("To start the service, run: python windows_service_fabric_pulse.py start")
        
    except Exception as e:
        print(f"❌ Failed to install service: {e}")

def uninstall_service():
    """Uninstall the Windows service"""
    try:
        win32serviceutil.RemoveService(FabricPulseAIService._svc_name_)
        print(f"✅ Service '{FabricPulseAIService._svc_display_name_}' uninstalled successfully!")
        
    except Exception as e:
        print(f"❌ Failed to uninstall service: {e}")

def main():
    """Main entry point for service management"""
    if len(sys.argv) == 1:
        # Run as service
        servicemanager.Initialize()
        servicemanager.PrepareToHostSingle(FabricPulseAIService)
        servicemanager.StartServiceCtrlDispatcher()
        
    else:
        command = sys.argv[1].lower()
        
        if command == 'install':
            install_service()
            
        elif command == 'uninstall' or command == 'remove':
            uninstall_service()
            
        elif command == 'start':
            try:
                win32serviceutil.StartService(FabricPulseAIService._svc_name_)
                print(f"✅ Service '{FabricPulseAIService._svc_display_name_}' started!")
            except Exception as e:
                print(f"❌ Failed to start service: {e}")
                
        elif command == 'stop':
            try:
                win32serviceutil.StopService(FabricPulseAIService._svc_name_)
                print(f"✅ Service '{FabricPulseAIService._svc_display_name_}' stopped!")
            except Exception as e:
                print(f"❌ Failed to stop service: {e}")
                
        elif command == 'restart':
            try:
                win32serviceutil.RestartService(FabricPulseAIService._svc_name_)
                print(f"✅ Service '{FabricPulseAIService._svc_display_name_}' restarted!")
            except Exception as e:
                print(f"❌ Failed to restart service: {e}")
                
        elif command == 'status':
            try:
                status = win32serviceutil.QueryServiceStatus(FabricPulseAIService._svc_name_)[1]
                status_text = {
                    1: "STOPPED",
                    2: "START_PENDING", 
                    3: "STOP_PENDING",
                    4: "RUNNING",
                    5: "CONTINUE_PENDING",
                    6: "PAUSE_PENDING",
                    7: "PAUSED"
                }.get(status, "UNKNOWN")
                print(f"Service Status: {status_text}")
            except Exception as e:
                print(f"❌ Failed to get service status: {e}")
                
        else:
            print("Usage: python windows_service_fabric_pulse.py [install|uninstall|start|stop|restart|status]")
            print("\nCommands:")
            print("  install   - Install the service")
            print("  uninstall - Remove the service")  
            print("  start     - Start the service")
            print("  stop      - Stop the service")
            print("  restart   - Restart the service")
            print("  status    - Check service status")

if __name__ == "__main__":
    main()