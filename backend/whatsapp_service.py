"""
Whatsapp service (refactored)
Implements: hourly supervisor alerts for final-operation parts (ISFinOper='Y')
Sends only when part-efficiency < threshold (default 85%).
Keeps same public API used by fabric_pulse_ai_main.py:
    - fetch_flagged_employees
    - fetch_supervisors
    - generate_and_send_reports(test_mode: bool = False)
"""

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

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

try:
    from twilio.rest import Client
    from twilio.base.exceptions import TwilioException
except Exception:
    # Twilio optional for local testing
    Client = None
    TwilioException = Exception

# local config
from config import config

logger = logging.getLogger(__name__)

# Default test numbers (the ones you requested mapped for demo)
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
    New WhatsApp service that:
      - Fetches part-level aggregated production for final operations (ISFinOper='Y')
      - Finds mapped supervisors for the part (via RTMS_SupervisorsDetl)
      - Sends WhatsApp if efficiency < threshold (config.alerts.efficiency_threshold)
      - test_mode forces sending to DEFAULT_TEST_NUMBERS (useful for Twilio sandbox)
    """

    def __init__(self):
        self.config = config
        self.reports_dir = Path("reports")
        self.reports_dir.mkdir(exist_ok=True)
        self.mock_dir = self.reports_dir / "mock_messages"
        self.mock_dir.mkdir(exist_ok=True)
        self.temporarily_disabled = False  # set True to never call Twilio
        self.test_numbers = DEFAULT_TEST_NUMBERS.copy()
        self.threshold = float(getattr(self.config.alerts, "efficiency_threshold", 85.0))
        # Twilio client initialization using config.twilio
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

    # --------------------
    # DB fetch helpers
    # --------------------
    async def fetch_flagged_employees(self) -> List[Dict[str, Any]]:
        """
        Legacy helper kept for compatibility: fetch rows where IsRedFlag=1.
        Not required by the main flow but kept because other modules may call it.
        """
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
        """
        Fetch supervisors and phone numbers from RTMS_SupervisorsDetl (or Supv det table).
        Returns dict keyed by (UnitCode, FloorName, LineName, PartName) -> list of phone numbers.
        """
        try:
            from fabric_pulse_ai_main import rtms_engine
            if not rtms_engine or not rtms_engine.engine:
                logger.error("Database engine not available for supervisors")
                return {}
            # Try table name used in your code; adjust if your DB uses different name
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
                # Normalize phone: keep if leading + else assume Indian +91
                if not phone.startswith("+"):
                    phone = f"+91{phone}"
                key = (unit, floor, line, part)
                supervisors.setdefault(key, []).append({"phone": phone, "name": supname})
            logger.info(f"Fetched supervisors for {len(supervisors)} part mappings")
            return supervisors
        except Exception as e:
            logger.error(f"fetch_supervisors failed: {e}")
            return {}

    # --------------------
    # Core production fetch and aggregation
    # --------------------
    async def _query_part_efficiencies(self,
                                       unit_code: Optional[str] = None,
                                       floor_name: Optional[str] = None,
                                       line_name: Optional[str] = None,
                                       part_name: Optional[str] = None,
                                       isFinOper: str = "Y"
                                       ) -> List[SupervisorRow]:
        """
        Query DB to aggregate production per Unit->Floor->Line->Part (final operation rows only)
        Joins to Supervisors table is done later in Python so we can map multiple supervisors.
        Returns list of SupervisorRow-like records (without supervisor info).
        """
        try:
                from fabric_pulse_ai_main import rtms_engine
                if not rtms_engine or not rtms_engine.engine:
                    logger.error("Database engine not available for production query")
                    return []

                # Base query
                query = """
                    SELECT
                        A.UnitCode,
                        A.FloorName,
                        A.LineName,
                        A.PartName,
                        SUM(ISNULL(A.ProdnPcs, 0)) AS ProdnPcs,
                        SUM(ISNULL(A.Eff100, 0)) AS Eff100
                    FROM [ITR_PRO_IND].[dbo].[RTMS_SessionWiseProduction] A
                    WHERE CAST(A.TranDate AS DATE) = CAST(GETDATE() AS DATE)
                    AND A.ISFinOper = 'Y'
                """

                params: dict = {}

                # Apply optional filters dynamically
                if unit_code:
                    query += " AND A.UnitCode = :unit_code"
                    params["unit_code"] = unit_code
                if floor_name:
                    query += " AND A.FloorName = :floor_name"
                    params["floor_name"] = floor_name
                if line_name:
                    query += " AND A.LineName = :line_name"
                    params["line_name"] = line_name
                if part_name:
                    query += " AND A.PartName = :part_name"
                    params["part_name"] = part_name

                # Add GROUP BY and ORDER BY
                query += """
                    GROUP BY A.UnitCode, A.FloorName, A.LineName, A.PartName
                    ORDER BY A.UnitCode, A.FloorName, A.LineName, A.PartName
                """

                from sqlalchemy import text
                with rtms_engine.engine.connect() as conn:
                    df = pd.read_sql(text(query), conn, params=params)

                rows: List[SupervisorRow] = []
                for _, r in df.iterrows():
                    eff100 = int(r["Eff100"]) if pd.notnull(r["Eff100"]) else 0
                    prodn = int(r["ProdnPcs"]) if pd.notnull(r["ProdnPcs"]) else 0
                    eff = (prodn * 100.0 / eff100) if eff100 > 0 else 0.0

                    rows.append(
                        SupervisorRow(
                            supervisor_name="",
                            phone_number="",
                            unit_code=str(r["UnitCode"] or ""),
                            floor_name=str(r["FloorName"] or ""),
                            line_name=str(r["LineName"] or ""),
                            part_name=str(r["PartName"] or ""),
                            prodn_pcs=prodn,
                            eff100=eff100,
                            eff_per=round(eff, 2),
                        )
                    )

                logger.info(f"Aggregated {len(rows)} part-level rows (ISFinOper='Y')")
                return rows

        except Exception as e:
                logger.error(f"_query_part_efficiencies failed: {e}", exc_info=True)
                return []


    # --------------------
    # Message creation and send
    # --------------------
    def _format_supervisor_message(self, sup_name: str, unit: str, floor: str, line: str, part: str, prodn: int, eff100: int, eff_per: float) -> str:
        """Custom enhanced template"""
        header = f"{sup_name} ({unit} → {floor} → {line} → Part: {part})\n\n"
        body = (
            f"For this session, your part *{part}* on line *{line}* produced *{prodn}* pcs "
            f"against the target *{eff100}* pcs.\n\n"
            f"*Efficiency*: {eff_per:.1f}%.\n\n"
            "Please encourage the team and try to achieve the target. "
            "If you need support, consider quick operator coaching, workstation checks, or a short line-balancing intervention. "
            "Every small improvement helps — thank you for leading the team! 💪"
        )
        footer = "\n\n— RTMS Bot"
        return header + body + footer

    async def send_whatsapp_report(self, phone_number: str, message: str, pdf_path: Optional[str] = None, csv_path: Optional[str] = None) -> Dict[str, Any]:
        """
        Sends WhatsApp message + (optionally) attachments.
        If Twilio isn't configured (or temporarily_disabled=True) it will write a mock JSON file.
        Returns dict with status and details.
        """
        try:
            # Normalize phone
            if not phone_number.startswith("+"):
                phone_number = f"+91{phone_number}"

            if self.temporarily_disabled or self.twilio_client is None or not (hasattr(self.config, "twilio") and self.config.twilio.is_configured()):
                # mock send -> store in mock_dir
                payload = {
                    "to": phone_number,
                    "body": message,
                    "pdf": pdf_path,
                    "csv": csv_path,
                    "sent_at": datetime.now().isoformat()
                }
                mock_file = self.mock_dir / f"mock_{phone_number.replace('+','')}_{int(time.time())}.json"
                with open(mock_file, "w", encoding="utf-8") as f:
                    json.dump(payload, f, indent=2, ensure_ascii=False)
                logger.info(f"[MOCK SEND] logged to {mock_file}")
                return {"status": "mocked", "file": str(mock_file)}
            else:
                # real Twilio send
                from_whatsapp = self.config.twilio.whatsapp_number if hasattr(self.config, "twilio") else None
                if not from_whatsapp:
                    logger.error("Twilio FROM (whatsapp number) not configured")
                    return {"status": "error", "reason": "twilio_from_not_configured"}

                # Build message body
                to_addr = f"whatsapp:{phone_number}"
                from_addr = from_whatsapp if from_whatsapp.startswith("whatsapp:") else f"whatsapp:{from_whatsapp}"

                # Twilio message create (no media attachment for sandbox; could enable media_url when available)
                msg = self.twilio_client.messages.create(
                    body=message,
                    from_=from_addr,
                    to=to_addr,
                )
                logger.info(f"WhatsApp sent SID={getattr(msg, 'sid', None)} to {phone_number}")
                return {"status": "sent", "sid": getattr(msg, "sid", None)}
        except TwilioException as te:
            logger.error(f"TwilioException sending to {phone_number}: {te}")
            return {"status": "error", "reason": str(te)}
        except Exception as e:
            logger.error(f"send_whatsapp_report failed: {e}", exc_info=True)
            return {"status": "error", "reason": str(e)}

    # --------------------
    # Report generation helpers (PDF/CSV)
    # --------------------
    def generate_pdf_report(self, line_data: List[SupervisorRow], timestamp: datetime) -> bytes:
        """Simple PDF summarizing rows (kept lightweight)"""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        styles = getSampleStyleSheet()
        story = []

        title = Paragraph("Hourly Production - Part Summary", styles["Heading2"])
        story.append(title)
        story.append(Spacer(1, 8))

        table_data = [["Unit", "Floor", "Line", "Part", "Produced", "Target", "Eff%"]]
        for r in line_data:
            table_data.append([r.unit_code, r.floor_name, r.line_name, r.part_name, str(r.prodn_pcs), str(r.eff100), f"{r.eff_per:.1f}%"])
        table = Table(table_data, colWidths=[60, 60, 60, 120, 60, 60, 50])
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
                rows.append({
                    "Unit": r.unit_code,
                    "Floor": r.floor_name,
                    "Line": r.line_name,
                    "Part": r.part_name,
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

    # --------------------
    # MAIN: generate_and_send_reports (keep same name/signature)
    # --------------------
    async def generate_and_send_reports(self, test_mode: bool = False) -> Dict[str, Any]:
        """
        Main method called by API:
          - test_mode True -> sends to DEFAULT_TEST_NUMBERS (for Twilio sandbox / demo)
          - test_mode False -> attempts to send to mapped supervisors (but falls back to test numbers if none)
        """
        timestamp = datetime.now()
        try:
            # 1) Fetch aggregated final-operation part records
            part_rows = await self._query_part_efficiencies(isFinOper="Y")

            if not part_rows:
                logger.info("No final-operation part rows for today")
                return {"status": "success", "message": "No final-operation production rows found", "timestamp": timestamp.isoformat()}

            # 2) Fetch supervisors mapping
            supervisors_map = await self.fetch_supervisors()

            # 3) Build recipients list per aggregated part
            deliveries = []
            for r in part_rows:
                key = (r.unit_code, r.floor_name, r.line_name, r.part_name)
                eff_per = r.eff_per

                # If efficiency >= threshold, skip sending
                if eff_per >= self.threshold:
                    logger.debug(f"Skipping part {key} as efficiency {eff_per:.1f}% >= threshold {self.threshold}")
                    continue

                # Find supervisors mapped to this key
                sup_entries = supervisors_map.get(key, [])
                if not sup_entries and test_mode:
                    # in test_mode, still notify test numbers
                    for t in self.test_numbers:
                        deliveries.append({"phone": t, "name": "TEST_SUPERVISOR", "part_row": r})
                elif not sup_entries and not test_mode:
                    # fallback: no supervisors for this part -> skip or optionally send to configured alert number
                    fallback = getattr(self.config.twilio, "alert_phone_number", None) if hasattr(self.config, "twilio") else None
                    if fallback:
                        deliveries.append({"phone": fallback.replace("whatsapp:", "").replace(" ", ""), "name": "FALLBACK", "part_row": r})
                    else:
                        logger.warning(f"No supervisors mapped for {key}; skipping (no fallback configured)")
                else:
                    for s in sup_entries:
                        deliveries.append({"phone": s["phone"], "name": s.get("name") or "Supervisor", "part_row": r})

            if not deliveries:
                logger.info("No deliveries (all parts >= threshold or no supervisors found).")
                return {"status": "success", "message": "No alerts to send (all parts ok or no supervisors found)", "timestamp": timestamp.isoformat()}

            # 4) Build a PDF + CSV summary to attach (mock/log) once per run
            pdf_bytes = self.generate_pdf_report(part_rows, timestamp)
            pdf_path = self.reports_dir / f"hourly_report_{timestamp.strftime('%Y%m%d_%H%M')}.pdf"
            with open(pdf_path, "wb") as f:
                f.write(pdf_bytes)
            csv_path = self.generate_csv_report(part_rows, timestamp)

            # 5) Send messages (remember test_mode forces sending to test numbers)
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

                # If test_mode: override recipients to the test numbers provided (send same message)
                if test_mode:
                    recipients = self.test_numbers
                else:
                    recipients = [phone]

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


# Export an instance (keeps compatibility with existing imports)
whatsapp_service = ProductionReadyWhatsAppService()
whatsapp_service.start_hourly_scheduler()