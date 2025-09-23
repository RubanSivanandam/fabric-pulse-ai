import logging
import json
import io
import asyncio
import time
import schedule
import threading
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from pathlib import Path
import pandas as pd
from sqlalchemy import text, inspect

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

try:
    from twilio.rest import Client
    from twilio.base.exceptions import TwilioException
except Exception:
    Client = None
    TwilioException = Exception

# local config
from config import config

logger = logging.getLogger(__name__)

# Default test numbers
DEFAULT_TEST_NUMBERS = ["+919943625493", "+918939990949"]

@dataclass
class SupervisorRow:
    supervisor_name: str
    phone_number: str
    unit_code: str
    floor_name: str
    line_name: str
    part_name: str
    prodn_pcs: int
    eff100: int
    eff_per: float

class ProductionReadyWhatsAppService:
    """
    WhatsApp service that:
      - Fetches part-level aggregated production for final operations (ISFinOper='Y')
      - Joins with RTMS_SupervisorsDetl to get actual supervisor names
      - Sends WhatsApp if efficiency < threshold (config.alerts.efficiency_threshold)
      - test_mode forces sending to DEFAULT_TEST_NUMBERS if no supervisor phone
      - Saves messages as .txt for verification
      - Transforms PartName 'Assembly tops' to 'Assembly'
    """

    def __init__(self):
        self.config = config
        self.reports_dir = Path("reports")
        self.reports_dir.mkdir(exist_ok=True)
        self.mock_dir = self.reports_dir / "mock_messages"
        self.mock_dir.mkdir(exist_ok=True)
        self.temporarily_disabled = False
        self.test_numbers = DEFAULT_TEST_NUMBERS.copy()
        self.threshold = float(getattr(self.config.alerts, "efficiency_threshold", 85.0))
        self.twilio_client = None
        try:
            if Client and self.config and hasattr(self.config, "twilio") and self.config.twilio.is_configured():
                self.twilio_client = Client(self.config.twilio.account_sid, self.config.twilio.auth_token)
                logger.info("Twilio client initialized")
            else:
                logger.info("Twilio not configured or client not available - using mock send")
        except Exception as e:
            logger.warning(f"Failed to init Twilio client: {e}")
            self.twilio_client = None

    def start_hourly_scheduler(self):
        """Start background scheduler to send hourly reports"""
        def job():
            try:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                loop.run_until_complete(self.generate_and_send_reports(test_mode=False))
            except Exception as e:
                logger.error(f"Scheduler job failed: {e}")

        schedule.every().hour.at(":00").do(job)

        def run_schedule():
            while True:
                schedule.run_pending()
                time.sleep(30)

        t = threading.Thread(target=run_schedule, daemon=True)
        t.start()
        logger.info("✅ WhatsApp hourly scheduler started")

    async def fetch_flagged_employees(self) -> List[Dict[str, Any]]:
        """Legacy helper: fetch rows where IsRedFlag=1"""
        try:
            from fabric_pulse_ai_main import rtms_engine
            if not rtms_engine or not rtms_engine.engine:
                logger.error("Database engine not available")
                return []
            query = """
                SELECT EmpName, EmpCode, UnitCode, FloorName, LineName, StyleNo,
                       PartName, Operation, NewOperSeq, ProdnPcs, Eff100, EffPer, IsRedFlag
                FROM [ITR_PRO_IND].[dbo].[RTMS_SessionWiseProduction]
                WHERE CAST(TranDate AS DATE) = CAST(GETDATE() AS DATE)
                  AND IsRedFlag = 1
                  AND EmpName IS NOT NULL
                  AND LineName IS NOT NULL
                ORDER BY LineName, StyleNo, EmpName
            """
            with rtms_engine.engine.connect() as conn:
                df = pd.read_sql(query, conn)
            return df.to_dict(orient="records")
        except Exception as e:
            logger.error(f"fetch_flagged_employees failed: {e}")
            return []

    async def fetch_supervisors(self) -> Dict[str, List[str]]:
        """Fetch supervisors and phone numbers from RTMS_SupervisorsDetl (kept for compatibility)"""
        try:
            from fabric_pulse_ai_main import rtms_engine
            if not rtms_engine or not rtms_engine.engine:
                logger.error("Database engine not available for supervisors")
                return []
            query = """
                SELECT UnitCode, FloorName, LineName, PartName, SupervisorName, PhoneNumber
                FROM [ITR_PRO_IND].[dbo].[RTMS_SupervisorsDetl]
                WHERE PhoneNumber IS NOT NULL AND PhoneNumber != ''
            """
            with rtms_engine.engine.connect() as conn:
                df = pd.read_sql(query, conn)
            supervisors = {}
            for _, r in df.iterrows():
                unit = str(r.get("UnitCode") or "").strip()
                floor = str(r.get("FloorName") or "").strip()
                line = str(r.get("LineName") or "").strip()
                part = str(r.get("PartName") or "").strip()
                phone = str(r.get("PhoneNumber") or "").strip()
                supname = str(r.get("SupervisorName") or "").strip()
                if not phone:
                    continue
                if not phone.startswith("+"):
                    phone = f"+91{phone}"
                key = (unit, floor, line, part)
                supervisors.setdefault(key, []).append({"phone": phone, "name": supname})
            logger.info(f"Fetched supervisors for {len(supervisors)} part mappings")
            return supervisors
        except Exception as e:
            logger.error(f"fetch_supervisors failed: {e}")
            return []

    async def _query_part_efficiencies(self, unit_code: Optional[str] = None) -> List[SupervisorRow]:
        """Query DB to aggregate production and fetch supervisor details"""
        try:
            from fabric_pulse_ai_main import rtms_engine
            if not rtms_engine or not rtms_engine.engine:
                logger.error("Database engine not available for production query")
                return []
            query = """
                SELECT
                    A.UnitCode,
                    A.FloorName,
                    A.LineName,
                    A.PartName,
                    SUM(ISNULL(A.ProdnPcs, 0)) AS ProdnPcs,
                    SUM(ISNULL(A.Eff100, 0)) AS Eff100,
                    B.SupervisorName,
                    B.PhoneNumber
                FROM [ITR_PRO_IND].[dbo].[RTMS_SessionWiseProduction] A
                LEFT JOIN [ITR_PRO_IND].[dbo].[RTMS_SupervisorsDetl] B
                    ON A.LineName = B.LineName
                    AND A.PartName = B.PartName
                    AND A.FloorName = B.FloorName
                WHERE CAST(A.TranDate AS DATE) = CAST(GETDATE() AS DATE)
                AND A.ISFinOper = :is_fin_oper
            """
            params = {"is_fin_oper": "Y"}
            if unit_code:
                query += " AND A.UnitCode = :unit_code"
                params["unit_code"] = unit_code
            query += """
                GROUP BY A.UnitCode, A.FloorName, A.LineName, A.PartName, B.SupervisorName, B.PhoneNumber
                ORDER BY A.UnitCode, A.FloorName, A.LineName, A.PartName
            """
            with rtms_engine.engine.connect() as conn:
                try:
                    df = pd.read_sql(text(query), conn, params=params)
                except Exception as e:
                    logger.error(f"Query failed: {e}")
                    inspector = inspect(rtms_engine.engine)
                    prod_columns = inspector.get_columns("RTMS_SessionWiseProduction", schema="dbo")
                    sup_columns = inspector.get_columns("RTMS_SupervisorsDetl", schema="dbo")
                    logger.error(f"RTMS_SessionWiseProduction columns: {prod_columns}")
                    logger.error(f"RTMS_SupervisorsDetl columns: {sup_columns}")
                    return []

            rows: List[SupervisorRow] = []
            for _, r in df.iterrows():
                eff100 = int(r["Eff100"]) if pd.notnull(r["Eff100"]) else 0
                prodn = int(r["ProdnPcs"]) if pd.notnull(r["ProdnPcs"]) else 0
                eff = (prodn * 100.0 / eff100) if eff100 > 0 else 0.0
                phone = str(r["PhoneNumber"] or "").strip()
                if phone and not phone.startswith("+"):
                    phone = f"+91{phone}"
                supervisor_name = str(r["SupervisorName"] or "Unknown Supervisor")
                if supervisor_name == "Unknown Supervisor":
                    logger.warning(f"No supervisor matched for UnitCode={r['UnitCode']}, FloorName={r['FloorName']}, LineName={r['LineName']}, PartName={r['PartName']}")
                rows.append(
                    SupervisorRow(
                        supervisor_name=supervisor_name,
                        phone_number=phone,
                        unit_code=str(r["UnitCode"] or ""),
                        floor_name=str(r["FloorName"] or ""),
                        line_name=str(r["LineName"] or ""),
                        part_name=str(r["PartName"] or ""),
                        prodn_pcs=prodn,
                        eff100=eff100,
                        eff_per=round(eff, 2),
                    )
                )
            logger.info(f"Aggregated {len(rows)} part-level rows (ISFinOper='Y') with supervisor details")
            return rows
        except Exception as e:
            logger.error(f"_query_part_efficiencies failed: {e}", exc_info=True)
            return []

    def _format_supervisor_message(self, sup_name: str, unit: str, floor: str, line: str, part: str, prodn: int, eff100: int, eff_per: float) -> str:
        """Custom template for supervisor message, transforms PartName if 'Assembly tops'"""
        display_part = "Assembly" if "assembly tops" in part.lower() else part
        message = (
            f"Supervisor: {sup_name}\n"
            f"Part: {display_part} | Location: {unit} → {floor} → {line}\n\n"
            f"Produced: {prodn} pcs / Target: {eff100} pcs\n"
            f"Efficiency: {eff_per:.1f}%\n\n"
            "Keep up the effort! 💪 Let’s encourage the team and try to achieve the target!"
        )
        return message

    async def send_whatsapp_report(self, phone_number: str, message: str, pdf_path: Optional[str] = None, csv_path: Optional[str] = None) -> Dict[str, Any]:
        """Sends WhatsApp message and saves as .txt for verification"""
        try:
            if not phone_number.startswith("+"):
                phone_number = f"+91{phone_number}"
            mock_txt_file = self.mock_dir / f"mock_message_{phone_number.replace('+','')}_{int(time.time())}.txt"
            with open(mock_txt_file, "w", encoding="utf-8") as f:
                f.write(f"To: {phone_number}\n\n{message}")
            logger.info(f"[MOCK TXT SAVED] Message saved to {mock_txt_file} for verification")
            if self.temporarily_disabled or self.twilio_client is None or not (hasattr(self.config, "twilio") and self.config.twilio.is_configured()):
                payload = {
                    "to": phone_number,
                    "body": message,
                    "pdf": pdf_path,
                    "csv": csv_path,
                    "sent_at": datetime.now().isoformat()
                }
                mock_json_file = self.mock_dir / f"mock_{phone_number.replace('+','')}_{int(time.time())}.json"
                with open(mock_json_file, "w", encoding="utf-8") as f:
                    json.dump(payload, f, indent=2, ensure_ascii=False)
                logger.info(f"[MOCK SEND] logged to {mock_json_file}")
                return {"status": "mocked", "file": str(mock_txt_file)}
            else:
                from_whatsapp = self.config.twilio.whatsapp_number if hasattr(self.config, "twilio") else None
                if not from_whatsapp:
                    logger.error("Twilio FROM (whatsapp number) not configured")
                    return {"status": "error", "reason": "twilio_from_not_configured"}
                to_addr = f"whatsapp:{phone_number}"
                from_addr = from_whatsapp if from_whatsapp.startswith("whatsapp:") else f"whatsapp:{from_whatsapp}"
                msg = self.twilio_client.messages.create(
                    body=message,
                    from_=from_addr,
                    to=to_addr,
                )
                logger.info(f"WhatsApp sent SID={getattr(msg, 'sid', None)} to {phone_number}")
                return {"status": "sent", "sid": getattr(msg, 'sid', None), "mock_file": str(mock_txt_file)}
        except TwilioException as te:
            logger.error(f"TwilioException sending to {phone_number}: {te}")
            return {"status": "error", "reason": str(te)}
        except Exception as e:
            logger.error(f"send_whatsapp_report failed: {e}", exc_info=True)
            return {"status": "error", "reason": str(e)}

    def generate_pdf_report(self, line_data: List[SupervisorRow], timestamp: datetime) -> bytes:
        """Simple PDF summarizing rows"""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        styles = getSampleStyleSheet()
        story = []
        title = Paragraph("Hourly Production - Part Summary", styles["Heading2"])
        story.append(title)
        story.append(Spacer(1, 8))
        table_data = [["Unit", "Floor", "Line", "Part", "Supervisor", "Produced", "Target", "Eff%"]]
        for r in line_data:
            display_part = "Assembly" if "assembly tops" in r.part_name.lower() else r.part_name
            table_data.append([r.unit_code, r.floor_name, r.line_name, display_part, r.supervisor_name, str(r.prodn_pcs), str(r.eff100), f"{r.eff_per:.1f}%"])
        table = Table(table_data, colWidths=[50, 50, 50, 100, 100, 50, 50, 50])
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2D6A9F")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
        ]))
        story.append(table)
        doc.build(story)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes

    def generate_csv_report(self, line_data: List[SupervisorRow], timestamp: datetime) -> Optional[str]:
        """Generate CSV and return path"""
        try:
            csv_path = self.reports_dir / f"hourly_parts_{timestamp.strftime('%Y%m%d_%H%M')}.csv"
            rows = []
            for r in line_data:
                display_part = "Assembly" if "assembly tops" in r.part_name.lower() else r.part_name
                rows.append({
                    "Unit": r.unit_code,
                    "Floor": r.floor_name,
                    "Line": r.line_name,
                    "Part": display_part,
                    "Supervisor": r.supervisor_name,
                    "Produced": r.prodn_pcs,
                    "Target": r.eff100,
                    "Eff%": f"{r.eff_per:.1f}"
                })
            if rows:
                df = pd.DataFrame(rows)
                df.to_csv(csv_path, index=False)
                return str(csv_path)
            return None
        except Exception as e:
            logger.error(f"generate_csv_report failed: {e}")
            return None

    async def generate_and_send_reports(self, test_mode: bool = False) -> Dict[str, Any]:
        """Main method to generate and send reports"""
        timestamp = datetime.now()
        try:
            # Try with UnitCode='D15-2' first, then without if it fails
            part_rows = await self._query_part_efficiencies(unit_code="D15-2")
            if not part_rows:
                logger.info("No final-operation part rows for UnitCode='D15-2', trying without filter")
                part_rows = await self._query_part_efficiencies()
            if not part_rows:
                logger.info("No final-operation part rows for today")
                return {"status": "success", "message": "No final-operation production rows found", "timestamp": timestamp.isoformat()}

            deliveries = []
            for r in part_rows:
                if r.eff_per >= self.threshold:
                    logger.debug(f"Skipping part ({r.unit_code}, {r.floor_name}, {r.line_name}, {r.part_name}) as efficiency {r.eff_per:.1f}% >= threshold {self.threshold}")
                    continue
                if r.supervisor_name == "Unknown Supervisor" and not r.phone_number:
                    if test_mode:
                        for t in self.test_numbers:
                            deliveries.append({"phone": t, "name": "TEST_SUPERVISOR", "part_row": r})
                    else:
                        fallback = getattr(self.config.twilio, "alert_phone_number", None) if hasattr(self.config, "twilio") else None
                        if fallback:
                            deliveries.append({"phone": fallback.replace("whatsapp:", "").replace(" ", ""), "name": "FALLBACK", "part_row": r})
                        else:
                            logger.warning(f"No supervisor mapped for ({r.unit_code}, {r.floor_name}, {r.line_name}, {r.part_name}); skipping")
                else:
                    deliveries.append({"phone": r.phone_number, "name": r.supervisor_name, "part_row": r})

            if not deliveries:
                logger.info("No deliveries (all parts >= threshold or no supervisors found)")
                return {"status": "success", "message": "No alerts to send (all parts ok or no supervisors found)", "timestamp": timestamp.isoformat()}

            pdf_bytes = self.generate_pdf_report(part_rows, timestamp)
            pdf_path = self.reports_dir / f"hourly_report_{timestamp.strftime('%Y%m%d_%H%M')}.pdf"
            with open(pdf_path, "wb") as f:
                f.write(pdf_bytes)
            csv_path = self.generate_csv_report(part_rows, timestamp)

            results = []
            for d in deliveries:
                phone = d["phone"]
                name = d["name"]
                row = d["part_row"]
                message = self._format_supervisor_message(
                    sup_name=name,
                    unit=row.unit_code,
                    floor=row.floor_name,
                    line=row.line_name,
                    part=row.part_name,
                    prodn=row.prodn_pcs,
                    eff100=row.eff100,
                    eff_per=row.eff_per
                )
                recipients = self.test_numbers if test_mode and (row.supervisor_name == "Unknown Supervisor" or not row.phone_number) else [phone]
                for rec in recipients:
                    res = await self.send_whatsapp_report(rec, message, pdf_path=str(pdf_path), csv_path=csv_path)
                    results.append({"to": rec, "result": res})

            logger.info(f"Completed sends: {len(results)} items")
            return {
                "status": "success",
                "timestamp": timestamp.isoformat(),
                "attempted_sends": len(results),
                "send_results": results,
                "pdf": str(pdf_path),
                "csv": csv_path
            }
        except Exception as e:
            logger.error(f"Report generation failed: {e}", exc_info=True)
            return {"status": "error", "message": str(e), "timestamp": timestamp.isoformat()}

# Export instance
whatsapp_service = ProductionReadyWhatsAppService()
whatsapp_service.start_hourly_scheduler()