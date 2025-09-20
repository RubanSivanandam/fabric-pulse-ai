"""
Enhanced WhatsApp Service for Professional Hourly Reports
Replaces existing WhatsApp logic with professional PDF/CSV reporting
"""

import logging
import asyncio
import json
import schedule
import threading
import time
import io
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from pathlib import Path
import pandas as pd

# PDF Generation imports
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

from twilio.rest import Client
from twilio.base.exceptions import TwilioException

try:
    from config import config
except ImportError:
    logging.error("Configuration module not found. Please ensure config.py exists.")
    config = None

logger = logging.getLogger(__name__)

@dataclass
class AlertMessage:
    """Placeholder for legacy AlertMessage class"""
    message: str
    phone_number: str
    # Add any other fields as needed

@dataclass
class FlaggedEmployee:
    """Data structure for flagged employees"""
    emp_name: str
    emp_code: str
    unit_code: str
    floor_name: str
    line_name: str
    style_no: str
    part_name: str
    operation: str
    new_oper_seq: str
    production_pcs: int
    eff100: int
    efficiency_per: float
    is_red_flag: int

@dataclass
class LineReport:
    """Report data structure for a line"""
    line_name: str
    unit_code: str
    style_groups: Dict[str, List[FlaggedEmployee]]
    total_flagged: int

class ProductionReadyWhatsAppService:
    """
    Enhanced WhatsApp service for professional hourly reporting
    Replaces the old alert-based system with structured reports
    """
    
    def __init__(self):
        self.config = config
        self.reports_dir = Path("reports")
        self.reports_dir.mkdir(exist_ok=True)
        self.company_name = "Ambattur Clothing Company"
        self.temporarily_disabled = False  # Enable for production use
        
        # Test numbers for development
        self.test_numbers = ["+919943625493", "+918939990949"]
        
        # Scheduler state
        self.scheduler_thread = None
        self.is_running = False
        self.last_report_time = None
        
        # Initialize Twilio client
        if not self.temporarily_disabled and self.config and self._is_config_valid():
            try:
                self.client = Client(self.config.account_sid, self.config.auth_token)
                logger.info("✅ Enhanced WhatsApp service initialized successfully")
                self._test_connection()
            except Exception as e:
                logger.error(f"❌ Failed to initialize Twilio client: {e}")
                self.client = None
        else:
            self.client = None
            logger.info("🚫 WhatsApp service initialized in test mode")
    
    def _is_config_valid(self) -> bool:
        """Check if required Twilio configuration attributes are present"""
        if not self.config:
            return False
        required_attrs = ['account_sid', 'auth_token', 'whatsapp_number']
        return all(hasattr(self.config, attr) and getattr(self.config, attr) for attr in required_attrs)
    
    def _test_connection(self):
        """Test Twilio connection"""
        if self.temporarily_disabled or not self.client:
            logger.info("🚫 Twilio connection test skipped - service disabled or client unavailable")
            return
        
        try:
            account = self.client.api.accounts(self.config.account_sid).fetch()
            logger.info(f"✅ Twilio connection test successful. Account: {account.friendly_name}")
        except TwilioException as e:
            logger.error(f"❌ Twilio connection test failed: {e}")
            raise
        except Exception as e:
            logger.error(f"❌ Unexpected error in connection test: {e}")
            raise
    
    async def fetch_flagged_employees(self) -> List[FlaggedEmployee]:
        """Fetch employees with IsRedFlag = 1"""
        try:
            # Import here to avoid circular imports
            from fabric_pulse_ai_main import rtms_engine
            
            if not rtms_engine or not rtms_engine.engine:
                logger.error("❌ Database engine not available")
                return []
            
            query = """
            SELECT 
                EmpName, EmpCode, UnitCode, FloorName, LineName, StyleNo,
                PartName, Operation, NewOperSeq, ProdnPcs, Eff100, EffPer, IsRedFlag
            FROM [ITR_PRO_IND].[dbo].[RTMS_SessionWiseProduction]
            WHERE CAST(TranDate AS DATE) = CAST(GETDATE() AS DATE)
                AND IsRedFlag = 1
                AND EmpName IS NOT NULL
                AND LineName IS NOT NULL
            ORDER BY LineName, StyleNo, EmpName
            """
            
            with rtms_engine.engine.connect() as connection:
                df = pd.read_sql(query, connection)
            
            flagged_employees = []
            for _, row in df.iterrows():
                employee = FlaggedEmployee(
                    emp_name=str(row['EmpName']) if row['EmpName'] else "Unknown",
                    emp_code=str(row['EmpCode']) if row['EmpCode'] else "Unknown",
                    unit_code=str(row['UnitCode']) if row['UnitCode'] else "Unknown",
                    floor_name=str(row['FloorName']) if row['FloorName'] else "Unknown",
                    line_name=str(row['LineName']) if row['LineName'] else "Unknown",
                    style_no=str(row['StyleNo']) if row['StyleNo'] else "Unknown",
                    part_name=str(row['PartName']) if row['PartName'] else "Unknown",
                    operation=str(row['Operation']) if row['Operation'] else "Unknown",
                    new_oper_seq=str(row['NewOperSeq']) if row['NewOperSeq'] else "Unknown",
                    production_pcs=int(row['ProdnPcs']) if pd.notnull(row['ProdnPcs']) else 0,
                    eff100=int(row['Eff100']) if pd.notnull(row['Eff100']) else 0,
                    efficiency_per=float(row['EffPer']) if pd.notnull(row['EffPer']) else 0.0,
                    is_red_flag=int(row['IsRedFlag']) if pd.notnull(row['IsRedFlag']) else 0
                )
                flagged_employees.append(employee)
            
            logger.info(f"📊 Fetched {len(flagged_employees)} flagged employees")
            return flagged_employees
            
        except Exception as e:
            logger.error(f"❌ Failed to fetch flagged employees: {e}")
            return []
    
    def group_employees_by_line_and_style(self, employees: List[FlaggedEmployee]) -> Dict[str, LineReport]:
        """Group employees by line and then by style"""
        line_reports = {}
        
        for emp in employees:
            line_key = f"{emp.unit_code}_{emp.line_name}"
            
            if line_key not in line_reports:
                line_reports[line_key] = LineReport(
                    line_name=emp.line_name,
                    unit_code=emp.unit_code,
                    style_groups={},
                    total_flagged=0
                )
            
            line_report = line_reports[line_key]
            
            if emp.style_no not in line_report.style_groups:
                line_report.style_groups[emp.style_no] = []
            
            line_report.style_groups[emp.style_no].append(emp)
            line_report.total_flagged += 1
        
        return line_reports
    
    def generate_pdf_report(self, line_reports: Dict[str, LineReport], timestamp: datetime) -> bytes:
        """Generate professional branded PDF report"""
        buffer = io.BytesIO()
        try:
            doc = SimpleDocTemplate(
                buffer, 
                pagesize=A4, 
                topMargin=0.5*inch,
                bottomMargin=0.5*inch,
                leftMargin=0.5*inch,
                rightMargin=0.5*inch
            )
            styles = getSampleStyleSheet()
            story = []

            # Normal style for wrapping inside table cells
            cell_style = styles["Normal"]
            cell_style.fontSize = 8
            cell_style.leading = 10  # line height

            # Custom styles for professional branding
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=20,
                spaceAfter=10,
                alignment=1,
                textColor=colors.darkblue,
                fontName='Helvetica-Bold'
            )
            subtitle_style = ParagraphStyle(
                'CustomSubtitle',
                parent=styles['Heading2'],
                fontSize=14,
                spaceAfter=20,
                alignment=1,
                textColor=colors.darkblue,
                fontName='Helvetica-Bold'
            )
            timestamp_style = ParagraphStyle(
                'TimestampStyle',
                parent=styles['Normal'],
                fontSize=12,
                alignment=1,
                textColor=colors.darkgrey
            )

            # HEADER Section
            story.append(Paragraph(self.company_name, title_style))
            story.append(Paragraph("Hourly Production Report", subtitle_style))
            story.append(Paragraph(f"Generated at: {timestamp.strftime('%Y-%m-%d %H:%M:%S')}", timestamp_style))
            story.append(Spacer(1, 30))

            if not line_reports:
                # No flagged employees
                no_issues_style = ParagraphStyle(
                    'NoIssuesStyle',
                    parent=styles['Normal'],
                    fontSize=14,
                    alignment=1,
                    textColor=colors.darkgreen,
                    spaceAfter=20
                )
                story.append(Paragraph("🎉 Excellent News! No flagged employees found for this hour.", no_issues_style))
                story.append(Paragraph("All production lines are performing above target efficiency.", no_issues_style))
            else:
                line_header_style = ParagraphStyle(
                    'LineHeaderStyle',
                    parent=styles['Heading2'],
                    fontSize=16,
                    textColor=colors.darkblue,
                    spaceAfter=10,
                    fontName='Helvetica-Bold'
                )
                style_header_style = ParagraphStyle(
                    'StyleHeaderStyle',
                    parent=styles['Heading3'],
                    fontSize=12,
                    textColor=colors.darkred,
                    spaceAfter=8,
                    fontName='Helvetica-Bold'
                )

                for line_key, line_report in line_reports.items():
                    # Line header
                    line_title = f"Line: {line_report.line_name} (Unit: {line_report.unit_code})"
                    story.append(Paragraph(line_title, line_header_style))
                    story.append(Spacer(1, 10))

                    # Style groups within line
                    for style_no, employees in line_report.style_groups.items():
                        style_title = f"Style Number: {style_no}"
                        story.append(Paragraph(style_title, style_header_style))

                        # Table data
                        table_data = [
                            ['Employee Name', 'Location (Unit → Floor → Line)', 'Part Name', 'Operation', 'Production (pcs)', 'Efficiency %']
                        ]

                        for emp in employees:
                            location = f"{emp.unit_code} → {emp.floor_name} → {emp.line_name}"
                            production = f"{emp.production_pcs} / {emp.eff100}"

                            table_data.append([
                                Paragraph(emp.emp_name, cell_style),
                                Paragraph(location, cell_style),
                                Paragraph(emp.part_name, cell_style),
                                Paragraph(emp.operation, cell_style),
                                Paragraph(production, cell_style),
                                Paragraph(f"{emp.efficiency_per:.1f}%", cell_style),
                            ])

                        # Wider columns for part & operation to avoid overlap
                        col_widths = [1.2*inch, 1.8*inch, 2.0*inch, 2.0*inch, 1.2*inch, 0.8*inch]
                        table = Table(table_data, colWidths=col_widths)

                        table.setStyle(TableStyle([
                            ('BACKGROUND', (0, 0), (-1, 0), colors.darkblue),
                            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
                            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                            ('FONTSIZE', (0, 0), (-1, 0), 9),
                            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                            ('TOPPADDING', (0, 0), (-1, 0), 8),
                            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                            ('ALIGN', (0, 1), (-1, -1), 'CENTER'),
                            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                            ('FONTSIZE', (0, 1), (-1, -1), 8),
                            ('TOPPADDING', (0, 1), (-1, -1), 6),
                            ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
                            ('ALIGN', (4, 1), (5, -1), 'RIGHT'),
                            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
                            ('GRID', (0, 0), (-1, -1), 1, colors.black),
                            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                        ]))

                        story.append(table)
                        story.append(Spacer(1, 20))

                    story.append(Spacer(1, 15))

            # FOOTER Section
            story.append(Spacer(1, 30))
            footer_motivational_style = ParagraphStyle(
                'FooterMotivationalStyle',
                parent=styles['Normal'],
                fontSize=11,
                textColor=colors.darkgreen,
                alignment=1,
                spaceAfter=15,
                fontName='Helvetica-Bold'
            )
            footer_disclaimer_style = ParagraphStyle(
                'FooterDisclaimerStyle',
                parent=styles['Normal'],
                fontSize=9,
                textColor=colors.darkgrey,
                alignment=1,
                spaceAfter=10
            )
            story.append(Paragraph(
                "Some team members are performing slightly below target this hour. With guidance and encouragement, the team can improve and achieve higher productivity 🚀", 
                footer_motivational_style
            ))
            story.append(Paragraph(
                "This report is intended only for Ambattur Clothing Company supervisors.",
                footer_disclaimer_style
            ))

            # Build PDF
            doc.build(story)
            return buffer.getvalue()

        finally:
            buffer.close()

    def generate_csv_report(self, line_reports: Dict[str, LineReport], timestamp: datetime) -> Optional[str]:
        """Generate CSV report as alternative format"""
        try:
            csv_data = []
            
            for line_key, line_report in line_reports.items():
                for style_no, employees in line_report.style_groups.items():
                    for emp in employees:
                        csv_data.append({
                            'Employee Name': emp.emp_name,
                            'Employee Code': emp.emp_code,
                            'Unit Code': emp.unit_code,
                            'Floor Name': emp.floor_name,
                            'Line Name': emp.line_name,
                            'Style No': emp.style_no,
                            'Part Name': emp.part_name,
                            'Operation': emp.new_oper_seq,
                            'Production Pcs': emp.production_pcs,
                            'Target (Eff100)': emp.eff100,
                            'Efficiency %': f"{emp.efficiency_per:.1f}%",
                            'Report Time': timestamp.strftime('%Y-%m-%d %H:%M:%S')
                        })
            
            if csv_data:
                df = pd.DataFrame(csv_data)
                csv_filename = f"flagged_employees_{timestamp.strftime('%Y%m%d_%H%M')}.csv"
                csv_path = self.reports_dir / csv_filename
                df.to_csv(csv_path, index=False)
                return str(csv_path)
            
            return None
            
        except Exception as e:
            logger.error(f"❌ Failed to generate CSV report: {e}")
            return None
    
    async def generate_motivational_message(self, line_reports: Dict[str, LineReport]) -> str:
        """Generate AI-powered motivational WhatsApp message"""
        try:
            if not line_reports:
                return """🎉 Excellent news! All production lines are performing above target efficiency this hour. 

The team's dedication and hard work are clearly paying off. Keep up the outstanding performance! 🚀

No action needed - continue with current operations."""
            
            total_flagged = sum(report.total_flagged for report in line_reports.values())
            line_count = len(line_reports)
            
            messages = [
                f"Hello Supervisor! 📊\n\nPlease find the attached hourly production report for your line(s).\n\n{total_flagged} team members across {line_count} lines are performing slightly below target this hour, but with a little encouragement and guidance, the team can quickly catch up and exceed expectations! 🚀\n\nYour leadership makes all the difference in helping the team reach their full potential.",
                
                f"Good day Supervisor! 📈\n\nAttached is the hourly report showing {total_flagged} employees across {line_count} production lines needing some support.\n\nThis is a great opportunity to provide coaching and motivation. With your guidance, these team members can bounce back and achieve excellent results! 💪\n\nTogether we can turn this around and make it a successful hour ahead!",
                
                f"Dear Supervisor 👋\n\nHourly performance report attached for your review. {total_flagged} employees across {line_count} lines are slightly below target.\n\nEvery challenge is an opportunity for improvement! Your supportive leadership can help these team members regain their momentum and excel. 🌟\n\nLet's work together to bring out the best in our team!"
            ]
            
            message_index = datetime.now().hour % len(messages)
            return messages[message_index]
            
        except Exception as e:
            logger.error(f"❌ Failed to generate motivational message: {e}")
            return "Please find the attached hourly production report. The team can improve with your guidance! 🚀"

    async def send_whatsapp_report(self, phone_number: str, message: str, csv_path: str, pdf_path: str):
        """Mock WhatsApp send in local mode"""
        if self.temporarily_disabled or self.client is None:
            # Local mock instead of Twilio send
            log_data = {
                "to": phone_number,
                "from": self.config.whatsapp_number if self.config else None,
                "body": message,
                "csv_file": str(csv_path),
                "pdf_file": str(pdf_path)
            }
            # Save to a log file
            Path("reports/mock_messages").mkdir(exist_ok=True)
            mock_file = Path("reports/mock_messages") / f"mock_{phone_number.replace('+','')}.json"
            with open(mock_file, "w", encoding="utf-8") as f:
                json.dump(log_data, f, indent=2)

            logger.info(f"[MOCK MODE] WhatsApp message logged to {mock_file}")
            return {"status": "mocked", "file": str(mock_file)}

        # --- real Twilio send (kept intact) ---
        message_obj = self.client.messages.create(
            from_=self.config.whatsapp_number,
            to=f"whatsapp:{phone_number}",
            body=message
            # media_url=[...]   # disabled for local
        )
        return message_obj.sid

    
    # async def send_whatsapp_report(self, pdf_path: Path, message: str, phone_number: str) -> bool:
    #     """Send WhatsApp report with PDF attachment"""
    #     try:
    #         if self.temporarily_disabled or not self.client:
    #             logger.info(f"📱 [TEST MODE] Would send WhatsApp report to {phone_number}")
    #             logger.info(f"📄 PDF: {pdf_path}")
    #             logger.info(f"💬 Message: {message}")
    #             return True
            
    #         message_obj = self.client.messages.create(
    #             from_=self.config.whatsapp_number,
    #             body=message,
    #             to=f"whatsapp:{phone_number}",
    #             # media_url=[str(pdf_path)]  # Uncomment for file attachment
    #         )
            
    #         logger.info(f"✅ WhatsApp report sent successfully! Message SID: {message_obj.sid}")
    #         logger.info(f"📱 Sent to: {phone_number}")
    #         return True
            
        # except TwilioException as e:
        #     logger.error(f"❌ Twilio error sending report: {e}")
        #     return False
        # except Exception as e:
        #     logger.error(f"❌ Failed to send WhatsApp report: {e}")
        #     return False
    
    async def generate_and_send_reports(self, test_mode: bool = False) -> Dict[str, Any]:
        """Generate and send hourly reports to supervisors"""
        timestamp = datetime.now()
        logger.info(f"🕐 Starting report generation at {timestamp}")
        
        try:
            # Fetch flagged employees
            flagged_employees = await self.fetch_flagged_employees()
            
            # Group by line and style
            line_reports = self.group_employees_by_line_and_style(flagged_employees)
            
            # Skip if no flagged employees and not test mode
            if not line_reports and not test_mode:
                logger.info("🎉 No flagged employees found - skipping report generation")
                return {
                    "status": "success",
                    "message": "No flagged employees found - no report generated",
                    "flagged_count": 0,
                    "lines_affected": 0,
                    "timestamp": timestamp.isoformat()
                }
            
            # Generate PDF report
            pdf_bytes = self.generate_pdf_report(line_reports, timestamp)
            
            # Save PDF file
            pdf_filename = f"{'test_' if test_mode else ''}hourly_report_{timestamp.strftime('%Y%m%d_%H%M')}.pdf"
            pdf_path = self.reports_dir / pdf_filename
            
            with open(pdf_path, 'wb') as f:
                f.write(pdf_bytes)
            
            # Generate CSV as backup
            csv_path = self.generate_csv_report(line_reports, timestamp)
            
            # Generate motivational message
            message = await self.generate_motivational_message(line_reports)
            
            # Send to appropriate recipients
            recipients = self.test_numbers if test_mode else self.test_numbers  # Use test numbers for now
            successful_sends = 0
            
            for phone_number in recipients:
                try:
                    success = await self.send_whatsapp_report(pdf_path, message, phone_number)
                    if success:
                        successful_sends += 1
                except Exception as e:
                    logger.error(f"❌ Failed to send report to {phone_number}: {e}")
            
            self.last_report_time = timestamp
            
            result = {
                "status": "success",
                "report_generated": True,
                "pdf_file": str(pdf_path),
                "csv_file": csv_path,
                "flagged_employees": len(flagged_employees),
                "lines_affected": len(line_reports),
                "message": message,
                "timestamp": timestamp.isoformat(),
                "test_mode": test_mode,
                "whatsapp_sent_to": recipients,
                "successful_sends": successful_sends
            }
            
            logger.info(f"✅ Report generation completed successfully: {len(flagged_employees)} flagged employees, {successful_sends} successful sends")
            return result
            
        except Exception as e:
            logger.error(f"❌ Report generation failed: {e}")
            return {
                "status": "error",
                "message": f"Report generation failed: {str(e)}",
                "flagged_count": 0,
                "lines_affected": 0,
                "timestamp": timestamp.isoformat()
            }
    
    def start_hourly_scheduler(self):
        """Start the hourly report scheduler"""
        if self.is_running:
            logger.info("Hourly scheduler already running")
            return
            
        self.is_running = True
        
        schedule.every().hour.at(":00").do(self._run_hourly_report)
        
        def run_scheduler():
            while self.is_running:
                schedule.run_pending()
                time.sleep(60)  # Check every minute
                
        self.scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
        self.scheduler_thread.start()
        
        logger.info("✅ Hourly report scheduler started - reports will be generated every hour at :00 minutes")
    
    def stop_hourly_scheduler(self):
        """Stop the hourly report scheduler"""
        self.is_running = False
        schedule.clear()
        logger.info("🛑 Hourly report scheduler stopped")
    
    def _run_hourly_report(self):
        """Run the hourly report generation (called by scheduler)"""
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(self.generate_and_send_reports(test_mode=False))
            loop.close()
        except Exception as e:
            logger.error(f"❌ Scheduled hourly report failed: {e}")
    
    def get_status(self) -> Dict[str, Any]:
        """Get service status"""
        return {
            "service": "Enhanced WhatsApp Reporting Service",
            "status": "active",
            "company": self.company_name,
            "scheduler_running": self.is_running,
            "last_report_time": self.last_report_time.isoformat() if self.last_report_time else None,
            "reports_directory": str(self.reports_dir),
            "test_numbers": self.test_numbers,
            "twilio_configured": self._is_config_valid(),
            "temporarily_disabled": self.temporarily_disabled,
            "next_scheduled_report": "Every hour at :00 minutes",
            "configuration_valid": self._is_config_valid()
        }

# Global service instance
whatsapp_service = ProductionReadyWhatsAppService()