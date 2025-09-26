import logging
import json
import io
import asyncio
import time
import schedule
import threading
import os
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from pathlib import Path
import pandas as pd
from sqlalchemy import text, create_engine
from urllib.parse import quote_plus

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

try:
    from twilio.rest import Client
    from twilio.base.exceptions import TwilioException
except Exception:
    Client = None
    TwilioException = Exception

# local config
from config import config

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
if not logger.handlers:
    ch = logging.StreamHandler()
    ch.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
    logger.addHandler(ch)

# Default test numbers
DEFAULT_TEST_NUMBERS = ["+919943625493", "+918939990949", "+919894070745"]

TEMPLATE_SID = "HX059c8f6500786c9f43eda250ef7178e1"  # Twilio template SID if using templated sends

@dataclass
class SupervisorRow:
    supervisor_name: str
    phone_number: str
    unit_code: str
    floor_name: str
    line_name: str
    part_name: str
    prodn_pcs: int
    target_pcs: int
    achv_percent: float


def _make_db2_engine_from_env() -> Optional[any]:
    try:
        db2_server = os.getenv("DB1_SERVER")
        db2_database = os.getenv("DB1_DATABASE")
        db2_username = os.getenv("DB1_USERNAME")
        db2_password = os.getenv("DB1_PASSWORD")
        driver = "ODBC Driver 17 for SQL Server"
        conn_str = (
            f"DRIVER={{{driver}}};SERVER={db2_server};DATABASE={db2_database};"
            f"UID={db2_username};PWD={db2_password};TrustServerCertificate=yes;"
        )
        eng = create_engine("mssql+pyodbc:///?odbc_connect=" + quote_plus(conn_str), pool_pre_ping=True)
        return eng
    except Exception as e:
        logger.error(f"Failed creating DB2 engine: {e}")
        return None


class ProductionReadyWhatsAppService:
    def __init__(self):
        self.config = config
        self.reports_dir = Path("reports")
        self.reports_dir.mkdir(exist_ok=True)
        self.mock_dir = self.reports_dir / "mock_messages"
        self.mock_dir.mkdir(exist_ok=True)
        self.temporarily_disabled = False
        self.test_numbers = DEFAULT_TEST_NUMBERS.copy()

        self.twilio_client = None
        try:
            if Client and hasattr(self.config, "twilio") and self.config.twilio.is_configured():
                self.twilio_client = Client(self.config.twilio.account_sid, self.config.twilio.auth_token)
                logger.info("Twilio client initialized")
            else:
                logger.info("Twilio not configured or client not available - using mock send")
        except Exception as e:
            logger.warning(f"Failed to init Twilio client: {e}")
            self.twilio_client = None

        self.db2_engine = _make_db2_engine_from_env()

    # ----------------------------------------------------------------------
    # Stored Procedure (DB1)
    # ----------------------------------------------------------------------
    def execute_stored_proc(self):
        try:
            from fabric_pulse_ai_main import rtms_engine
            if not rtms_engine or not rtms_engine.engine:
                logger.error("DB1 engine not available for stored procedure.")
                return
            with rtms_engine.engine.begin() as conn:
                conn.execute(text("EXEC dbo.usp_Sync_RTMS_SessionWiseProduction @TranDate = CAST(GETDATE() AS DATE)"))
            logger.info("Stored procedure executed successfully on DB1.")
        except Exception as e:
            logger.error(f"execute_stored_proc failed: {e}", exc_info=True)

    # ----------------------------------------------------------------------
    # Inline CTE Query (DB1)
    # ----------------------------------------------------------------------
    async def _query_part_efficiencies(self) -> List[SupervisorRow]:
        try:
            from fabric_pulse_ai_main import rtms_engine
            if not rtms_engine or not rtms_engine.engine:
                logger.error("DB1 engine not available for production query")
                return []
            sql = """
            ;WITH OperationDetails AS (
                SELECT
                    A.ReptType,
                    A.UnitCode,
                    A.TranDate,
                    A.FloorName,            
                    A.LineName,
                    B.SupervisorName,
                    B.SupervisorCode,
                    B.PhoneNumber,
                    A.PartName,
                    A.PartSeq,
                    SUM(A.PRODNPCS) AS ProdPcs,
                    COUNT(*) AS NoofOprs
                FROM RTMS_SessionWiseProduction A
                JOIN RTMS_SupervisorsDetl B
                    ON A.LineName = B.LineName
                AND A.PartName = B.PartName
                WHERE
                    A.UnitCode = 'D15-2'
                    AND A.TranDate = CAST(GETDATE() AS DATE)
                    AND A.ReptType = 'RTM$'
                    AND A.ISFinPart = 'Y'
                GROUP BY
                    A.ReptType,
                    A.UnitCode,
                    A.TranDate,
                    A.FloorName,            
                    A.LineName,
                    B.SupervisorName,
                    B.SupervisorCode,
                    B.PhoneNumber,
                    A.PartName,
                    A.PartSeq
            ),
            OperationSummary AS (
                SELECT
                    ReptType,
                    TranDate,
                    LineName,
                    PartSeq,
                    PartName,
                    Operation,
                    SUM(ProdnPcs) AS OperProd,
                    COUNT(DISTINCT EmpCode) AS NoofOperators,
                    ISFinPart
                FROM dbo.RTMS_SessionWiseProduction
                WHERE TranDate = CAST(GETDATE() AS DATE)
                AND ReptType = 'RTM$'
                GROUP BY ReptType, TranDate, LineName, PartSeq, PartName, Operation, ISFinPart
            ),
            MaxProdPerPart AS (
                SELECT
                    ReptType,
                    TranDate,
                    LineName,
                    PartSeq,
                    PartName,
                    ISFinPart,
                    MAX(OperProd) AS MaxProd
                FROM OperationSummary
                GROUP BY ReptType, TranDate, LineName, PartSeq, PartName, ISFinPart
            ),
            LowPerformers AS (
                SELECT
                    a.ReptType,
                    a.TranDate,
                    a.LineName,
                    a.PartSeq,
                    a.PartName,
                    a.Operation,
                    a.OperProd,
                    b.MaxProd,
                    a.NoofOperators,
                    ROUND(b.MaxProd * 0.85, 0) AS TargetPcs,
                    ROUND((a.OperProd * 100.0) / b.MaxProd, 2) AS AchvPercent,
                    a.ISFinPart
                FROM OperationSummary a
                JOIN MaxProdPerPart b
                    ON a.ReptType = b.ReptType
                AND a.TranDate = b.TranDate
                AND a.LineName = b.LineName
                AND a.PartSeq = b.PartSeq
                AND a.PartName = b.PartName
                WHERE a.OperProd < b.MaxProd * 0.85
                AND a.ISFinPart = 'Y'
            ),
            SummaryTable AS (
                SELECT
                    ReptType,
                    TranDate,
                    LineName,
                    PartSeq,
                    PartName,
                    MAX(TargetPcs) AS TargetPcs,
                    MAX(AchvPercent) AS AchvPercent
                FROM LowPerformers
                GROUP BY ReptType, TranDate, LineName, PartSeq, PartName
            )
            SELECT
                OD.*,
                ST.TargetPcs,
                ST.AchvPercent
            FROM OperationDetails OD
            JOIN SummaryTable ST
                ON OD.TranDate = ST.TranDate
            AND OD.LineName = ST.LineName
            AND OD.PartName = ST.PartName
            AND OD.ReptType = ST.ReptType
            ORDER BY OD.LineName, OD.PartSeq;

            """
            with rtms_engine.engine.connect() as conn:
                df = pd.read_sql(text(sql), conn)

            rows: List[SupervisorRow] = []
            for _, r in df.iterrows():
                phone = str(r["PhoneNumber"] or "").strip()
                if phone and not phone.startswith("+"):
                    phone = f"+91{phone}"
                rows.append(
                    SupervisorRow(
                        supervisor_name=str(r["SupervisorName"] or "Unknown Supervisor"),
                        phone_number=phone,
                        unit_code=str(r["UnitCode"] or ""),
                        floor_name=str(r["FloorName"] or ""),
                        line_name=str(r["LineName"] or ""),
                        part_name=str(r["PartName"] or ""),
                        prodn_pcs=int(r["ProdPcs"] or 0),
                        target_pcs=int(r["TargetPcs"] or 0),
                        achv_percent=float(r["AchvPercent"] or 0.0),
                    )
                )
            return rows
        except Exception as e:
            logger.error(f"_query_part_efficiencies failed: {e}", exc_info=True)
            return []

    # ----------------------------------------------------------------------
    # DB2 Helpers
    # ----------------------------------------------------------------------
    def _db2_query(self, sql: str) -> pd.DataFrame:
        if self.db2_engine is None:
            raise RuntimeError("DB2 engine not configured.")
        with self.db2_engine.connect() as conn:
            return pd.read_sql(text(sql), conn)

    def get_session_code(self) -> Optional[str]:
        try:
            q = """
            SELECT TOP (1) SessionCode
            FROM [ITR_CON].[dbo].[ITR_CON_SessionMasterNew]
            WHERE Unitcode = 'D15-2' AND LineCode = 'All'
              AND CAST((CONVERT(varchar(10), GETDATE(), 111) + ' ' + ToTime) AS datetime) <= GETDATE()
            ORDER BY CAST(ToTime AS time) DESC
            """
            df = self._db2_query(q)
            if df.empty:
                return None
            return str(df.iloc[0]["SessionCode"])
        except Exception as e:
            logger.error(f"get_session_code failed: {e}", exc_info=True)
            return None

    # ----------------------------------------------------------------------
    # Message formatting
    # ----------------------------------------------------------------------
    def _format_supervisor_message(self, r: SupervisorRow, session_code: Optional[str]) -> str:
        display_part = "Assembly" if "assembly tops" in r.part_name.lower() else r.part_name
        session_line = f"Upto the session {session_code}" if session_code else "Upto the session"
        return (
            "Actual:\n"
            f"Supervisor: {r.supervisor_name}\n"
            f"Part: {display_part} | Location: {r.unit_code} → {r.floor_name or 'FLOOR-?'} → {r.line_name}\n"
            f"Produced: {r.prodn_pcs} pcs / Target: {r.target_pcs} pcs\n"
            f"Efficiency: {round(r.achv_percent, 1)}%\n"
            f"{session_line}\n"
            "Please review the details above!"
        )

    # ----------------------------------------------------------------------
    # Send WhatsApp (mock + Twilio if configured)
    # ----------------------------------------------------------------------
    async def send_whatsapp_report(
        self,
        phone_number: str,
        message: str,
        pdf_path: Optional[str] = None,
        csv_path: Optional[str] = None,
        row: Optional[SupervisorRow] = None,
        save_artifacts: bool = False
    ) -> Dict[str, Any]:
        try:
            if not phone_number.startswith("+"):
                phone_number = f"+91{phone_number}"
            mock_txt_file = self.mock_dir / f"mock_message_{phone_number.replace('+','')}_{int(time.time())}.txt"
            with open(mock_txt_file, "w", encoding="utf-8") as f:
                f.write(f"To: {phone_number}\n\n{message}")

            # only save .json mock if save_artifacts=True
            if save_artifacts:
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

            if self.temporarily_disabled or self.twilio_client is None or not (
                hasattr(self.config, "twilio") and self.config.twilio.is_configured()
            ):
                return {"status": "mocked", "file": str(mock_txt_file)}

            from_whatsapp = (
                self.config.twilio.whatsapp_number
                if hasattr(self.config, "twilio")
                else None
            )
            to_addr = f"whatsapp:{phone_number}"
            from_addr = from_whatsapp if str(from_whatsapp).startswith("whatsapp:") else f"whatsapp:{from_whatsapp}"

            msg = self.twilio_client.messages.create(from_=from_addr, to=to_addr, body=message)
            return {"status": "sent", "sid": getattr(msg, 'sid', None), "mock_file": str(mock_txt_file)}
        except Exception as e:
            logger.error(f"send_whatsapp_report failed: {e}", exc_info=True)
            return {"status": "error", "reason": str(e)}

    # ----------------------------------------------------------------------
    # Main send cycle
    # ----------------------------------------------------------------------
    async def generate_and_send_reports(self, test_mode: bool = False, save_artifacts: bool = False) -> Dict[str, Any]:
        timestamp = datetime.now()
        try:
            part_rows = await self._query_part_efficiencies()
            if not part_rows:
                return {"status": "success", "message": "No data", "timestamp": timestamp.isoformat()}

            pdf_path, csv_path = None, None
            if save_artifacts:
                pdf_bytes = self.generate_pdf_report(part_rows, timestamp)
                pdf_path = self.reports_dir / f"hourly_report_{timestamp.strftime('%Y%m%d_%H%M')}.pdf"
                with open(pdf_path, "wb") as f:
                    f.write(pdf_bytes)
                csv_path = self.generate_csv_report(part_rows, timestamp)

            session_code = self.get_session_code()

            results = []
            first_msg, first_row = None, None

            if test_mode:
                r = part_rows[0]
                msg = self._format_supervisor_message(r, session_code)
                for phone in self.test_numbers:
                    res = await self.send_whatsapp_report(
                        phone, msg, pdf_path=str(pdf_path) if pdf_path else None,
                        csv_path=csv_path, row=r, save_artifacts=save_artifacts
                    )
                    results.append({"to": phone, "result": res})
            else:
                # ✅ Restrict automatic scheduler to only the first supervisor list (for testing)
                allowed_numbers = ["+919943625493", "+918939990949"]

                if part_rows:
                    r = part_rows[0]  # send only first supervisor row data
                    msg = self._format_supervisor_message(r, session_code)
                    for to in allowed_numbers:
                        res = await self.send_whatsapp_report(
                            to, msg, pdf_path=str(pdf_path) if pdf_path else None,
                            csv_path=csv_path, row=r, save_artifacts=save_artifacts
                        )
                        results.append({"to": to, "result": res})

                    if first_msg is None:
                        first_msg, first_row = msg, r

                if first_msg and first_row:
                    for t in self.test_numbers:
                        res_t = await self.send_whatsapp_report(
                            t, first_msg, pdf_path=str(pdf_path) if pdf_path else None,
                            csv_path=csv_path, row=first_row, save_artifacts=save_artifacts
                        )
                        results.append({"to": t, "result": res_t, "reason": "duplicate_for_test"})

            return {
                "status": "success",
                "timestamp": timestamp.isoformat(),
                "attempted_sends": len(results),
                "send_results": results,
                "pdf": str(pdf_path) if pdf_path else None,
                "csv": csv_path,
            }
        except Exception as e:
            logger.error(f"Report generation failed: {e}", exc_info=True)
            return {"status": "error", "message": str(e), "timestamp": timestamp.isoformat()}


    # ----------------------------------------------------------------------
    # PDF / CSV generation
    # ----------------------------------------------------------------------
    def generate_pdf_report(self, line_data: List[SupervisorRow], timestamp: datetime) -> bytes:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        styles = getSampleStyleSheet()
        story = []
        story.append(Paragraph("Hourly Production - Part Summary", styles["Heading2"]))
        story.append(Spacer(1, 8))
        table_data = [["Unit", "Line", "Part", "Supervisor", "Produced", "Target", "Eff%"]]
        for r in line_data:
            display_part = "Assembly" if "assembly tops" in r.part_name.lower() else r.part_name
            table_data.append([r.unit_code, r.line_name, display_part, r.supervisor_name,
                               str(r.prodn_pcs), str(r.target_pcs), f"{r.achv_percent:.1f}%"])
        table = Table(table_data, colWidths=[50, 80, 120, 120, 60, 60, 50])
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
        try:
            csv_path = self.reports_dir / f"hourly_parts_{timestamp.strftime('%Y%m%d_%H%M')}.csv"
            rows = []
            for r in line_data:
                display_part = "Assembly" if "assembly tops" in r.part_name.lower() else r.part_name
                rows.append({
                    "Unit": r.unit_code,
                    "Line": r.line_name,
                    "Part": display_part,
                    "Supervisor": r.supervisor_name,
                    "Produced": r.prodn_pcs,
                    "Target": r.target_pcs,
                    "Eff%": f"{r.achv_percent:.1f}"
                })
            if rows:
                df = pd.DataFrame(rows)
                df.to_csv(csv_path, index=False)
                return str(csv_path)
            return None
        except Exception as e:
            logger.error(f"generate_csv_report failed: {e}")
            return None

    # ----------------------------------------------------------------------
    # Scheduler and Watcher
    # ----------------------------------------------------------------------
    def start_hourly_scheduler(self):
        def job():
            try:
                now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                logger.info(f"[Scheduler] Triggered WhatsApp cycle at {now}")
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                loop.run_until_complete(
                    self.generate_and_send_reports(test_mode=False, save_artifacts=False)
                )
                loop.close()
            except Exception as e:
                logger.error(f"Scheduler job failed: {e}", exc_info=True)

    # ⏱️ Every 5 minutes
            schedule.every(5).minutes.do(job)

    def run_schedule():
        logger.info("✅ WhatsApp scheduler started (every 5 minutes)")
        while True:
            schedule.run_pending()
            time.sleep(1)

    t = threading.Thread(target=run_schedule, daemon=True)
    t.start()
    def start_scheduler(self):
        """Start background scheduler to send WhatsApp every 5 minutes"""
        def job():
            try:
                now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                logger.info(f"[Scheduler] Triggered WhatsApp cycle at {now}")
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                loop.run_until_complete(self.run_report_cycle())
                loop.close()
            except Exception as e:
                logger.error(f"Scheduler job failed: {e}", exc_info=True)

        # Run every 5 minutes
        schedule.every(5).minutes.do(job)

        def run_schedule():
            logger.info("✅ WhatsApp scheduler started (every 5 minutes)")
            while True:
                schedule.run_pending()
                time.sleep(1)

        threading.Thread(target=run_schedule, daemon=True).start()

    async def run_report_cycle(self):
        """Execute stored procedure and send WhatsApp report"""
        self.execute_stored_proc()
        rows = await self._query_part_efficiencies()
        session_code = self.get_session_code()

        for r in rows:
            msg = self._format_supervisor_message(r, session_code)
            await self.send_whatsapp_report(r.phone_number, msg)


# Export instance
whatsapp_service = ProductionReadyWhatsAppService()


# # DB2 watcher
# def _on_totime_change():
#     try:
#         loop = asyncio.new_event_loop()
#         asyncio.set_event_loop(loop)
#         loop.run_until_complete(whatsapp_service.generate_and_send_reports(test_mode=False))
#         loop.close()
#     except Exception as e:
#         logger.error(f"Watcher callback failed: {e}", exc_info=True)

# whatsapp_service.start_session_monitor(_on_totime_change)
