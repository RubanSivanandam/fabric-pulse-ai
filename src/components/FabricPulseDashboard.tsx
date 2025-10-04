// src/components/FabricPulseDashboard.tsx
// Updated to:
// 1) Restore card shadow animation + card content colors (Total Production, Target, Efficiency, Underperformers)
// 2) Use /api/rtms/flagged to build the "Employee Efficiency under 85%" bar chart (red bars for <85%)
// 3) Recent Alerts & Notifications now include full mapping: UNIT → FLOOR → LINE → PARTNAME, Production(ProdnPcs/Target) and Operation
// Based on your old file visuals and the LATEST structure. (See original files for reference)

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useLayoutEffect,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertTriangle,
  Target,
  TrendingUp,
  Users,
  Cpu,
  Database,
  MessageSquare,
  BarChart3,
} from "lucide-react";
import { motion } from "framer-motion";
import gsap from "gsap";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  Title as ChartTitle,
  Tooltip,
  Legend,
  BarElement,
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import RTMSBot from "./RTMSBot";

ChartJS.register(
  CategoryScale,
  LinearScale,
  ChartTitle,
  Tooltip,
  Legend,
  BarElement,
  zoomPlugin
);

const API_BASE = "http://localhost:8000";

// ---------- Types ----------
type EfficiencySummary = {
  total_production: number;
  total_target: number;
  efficiency: number;
  underperformers_count: number;
};

type RawFlaggedRow = Record<string, any>;

type FlaggedEmployeeRaw = {
  emp_code?: string;
  emp_name?: string;
  line_name?: string;
  unit_code?: string;
  floor_name?: string;
  part_name?: string;
  new_oper_seq?: string;
  operation?: string;
  production?: number; // ProdnPcs
  target?: number; // Eff100
  efficiency?: number;
  phone_number?: string | null;
  is_red_flag?: number;
  supervisor_name?: string | null;
  supervisor_code?: string | null;
};

type FlaggedPartGroup = {
  part_name: string;
  employee_count: number;
  employees: FlaggedEmployeeRaw[];
};

type FlaggedResponse =
  | { data: { parts: FlaggedPartGroup[] } }
  | { data: RawFlaggedRow[] };

// ---------- Fetch helpers ----------
const fetchJSON = async <T,>(url: string): Promise<T> => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.json();
};

const fetchUnits = () =>
  fetchJSON<{ data: string[] }>(`${API_BASE}/api/rtms/filters/units`).then(
    (j) => j?.data ?? []
  );

const fetchFloors = (unit: string) =>
  fetchJSON<{ data: string[] }>(
    `${API_BASE}/api/rtms/filters/floors?unit_code=${encodeURIComponent(unit)}`
  ).then((j) => j?.data ?? []);

const fetchLines = (unit: string, floor: string) =>
  fetchJSON<{ data: string[] }>(
    `${API_BASE}/api/rtms/filters/lines?unit_code=${encodeURIComponent(
      unit
    )}&floor_name=${encodeURIComponent(floor)}`
  ).then((j) => j?.data ?? []);

const fetchParts = (unit: string, floor: string, line: string) =>
  fetchJSON<{ data: string[] }>(
    `${API_BASE}/api/rtms/filters/parts?unit_code=${encodeURIComponent(
      unit
    )}&floor_name=${encodeURIComponent(floor)}&line_name=${encodeURIComponent(
      line
    )}`
  ).then((j) => j?.data ?? []);

const fetchEfficiency = (
  unit: string,
  floor: string,
  line: string,
  part: string
) =>
  fetchJSON<{ success: boolean; data: EfficiencySummary }>(
    `${API_BASE}/api/rtms/efficiency?unit_code=${encodeURIComponent(
      unit
    )}&floor_name=${encodeURIComponent(floor)}&line_name=${encodeURIComponent(
      line
    )}&part_name=${encodeURIComponent(part)}`
  ).then((j) => j.data);

const fetchFlagged = (
  unit: string,
  floor: string,
  line: string,
  part: string
) =>
  fetchJSON<FlaggedResponse>(
    `${API_BASE}/api/rtms/flagged?unit_code=${encodeURIComponent(
      unit
    )}&floor_name=${encodeURIComponent(floor)}&line_name=${encodeURIComponent(
      line
    )}&part_name=${encodeURIComponent(part)}`
  );

// Add next to other fetch helpers
const fetchOperationWiseEmployees = (
  unit: string,
  floor: string,
  line: string,
  part: string
) =>
  fetch(
    `${API_BASE}/api/rtms/operationWiseEmployees?unit_code=${encodeURIComponent(
      unit
    )}&floor_name=${encodeURIComponent(floor)}&line_name=${encodeURIComponent(
      line
    )}&part_name=${encodeURIComponent(part)}`
  ).then(async (r) => {
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  });

// ---------- Component ----------
export default function FabricPulseDashboard() {
  // refs for GSAP
  const headerRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<HTMLDivElement[]>([]);
  const chartWrapRef = useRef<HTMLDivElement | null>(null);
  const recentWrapRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (headerRef.current) {
      gsap.fromTo(
        headerRef.current,
        { opacity: 0, y: -24 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }
      );
    }
    if (gridRef.current) {
      gsap.fromTo(
        gridRef.current,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.5, delay: 0.05 }
      );
    }
  }, []);

  // filters
  const [unit, setUnit] = useState("");
  const [floor, setFloor] = useState("");
  const [line, setLine] = useState("");
  const [part, setPart] = useState("");

  const unitsQ = useQuery({
    queryKey: ["units"],
    queryFn: fetchUnits,
    staleTime: 5 * 60_000,
  });
  const floorsQ = useQuery({
    queryKey: ["floors", unit],
    queryFn: () => fetchFloors(unit),
    enabled: !!unit,
  });
  const linesQ = useQuery({
    queryKey: ["lines", unit, floor],
    queryFn: () => fetchLines(unit, floor),
    enabled: !!unit && !!floor,
  });
  const partsQ = useQuery({
    queryKey: ["parts", unit, floor, line],
    queryFn: () => fetchParts(unit, floor, line),
    enabled: !!unit && !!floor && !!line,
  });

  const filtersReady = Boolean(unit && floor && line && part);

  const efficiencyQ = useQuery({
    queryKey: ["eff", unit, floor, line, part],
    queryFn: () => fetchEfficiency(unit, floor, line, part),
    enabled: filtersReady,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });

  const flaggedQ = useQuery({
    queryKey: ["flagged", unit, floor, line, part],
    queryFn: () => fetchFlagged(unit, floor, line, part),
    enabled: filtersReady,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });

  // Add where other useQuery hooks are declared
  const operationEmpQ = useQuery({
    queryKey: ["operationEmp", unit, floor, line, part],
    queryFn: () => fetchOperationWiseEmployees(unit, floor, line, part),
    enabled: Boolean(unit && floor && line && part),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });

  // helper to set card refs for GSAP
  const setCardRef = (el: HTMLDivElement | null) => {
    if (!el) return;
    cardRefs.current.push(el);
  };

  useEffect(() => {
    if (!filtersReady || !efficiencyQ.data) return;
    if (!cardRefs.current.length) return;
    gsap.fromTo(
      cardRefs.current,
      { opacity: 0, y: 18, scale: 0.98 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        stagger: 0.08,
        duration: 0.55,
        ease: "back.out(1.6)",
      }
    );
  }, [filtersReady, efficiencyQ.data]);

  useEffect(() => {
    if (filtersReady && flaggedQ.data && chartWrapRef.current) {
      gsap.fromTo(
        chartWrapRef.current,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
      );
    }
  }, [filtersReady, flaggedQ.data]);

  useEffect(() => {
    if (filtersReady && flaggedQ.data && recentWrapRef.current) {
      gsap.fromTo(
        recentWrapRef.current,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.55, ease: "power2.out", delay: 0.05 }
      );
    }
  }, [filtersReady, flaggedQ.data]);

  // Alerts state (local ui)
  const [alerts, setAlerts] = useState<any[]>([]);

  // Normalizer: flatten flagged response into consistent employee objects
  const normalizeFlaggedEmployees = (
    payload: FlaggedResponse
  ): FlaggedEmployeeRaw[] => {
    if (!payload) return [];
    const seenEmpCodes = new Set<string>();
    const result: FlaggedEmployeeRaw[] = [];

    const fallbackUnit = unit || undefined;
    const fallbackFloor = floor || undefined;
    const fallbackLine = line || undefined;
    const fallbackPart = part || undefined;

    if (
      (payload as any).data?.parts &&
      Array.isArray((payload as any).data.parts)
    ) {
      const parts: FlaggedPartGroup[] = (payload as any).data.parts;
      parts.forEach((pg) => {
        (pg.employees || []).forEach((e) => {
          const empCode = e.emp_code ?? e.EmpCode ?? e.Emp_Code ?? e.EmpID;
          if (!empCode || seenEmpCodes.has(empCode)) return;
          seenEmpCodes.add(empCode);
          result.push({
            emp_code: empCode,
            emp_name: e.emp_name ?? e.EmpName ?? e.Emp_Name,
            unit_code:
              e.unit_code ?? e.UnitCode ?? e.Unit ?? fallbackUnit ?? undefined,
            floor_name:
              e.floor_name ??
              e.FloorName ??
              e.Floor ??
              fallbackFloor ??
              undefined,
            line_name:
              e.line_name ?? e.LineName ?? e.Line ?? fallbackLine ?? undefined,
            part_name:
              pg.part_name ?? e.part_name ?? e.PartName ?? fallbackPart,
            new_oper_seq:
              e.new_oper_seq ??
              e.NewOperSeq ??
              e.NewOperSeq?.toString() ??
              e.operation,
            operation: e.operation ?? e.Operation,
            production:
              e.production ?? e.ProdnPcs ?? Number(e.ProdnPcs ?? 0) ?? 0,
            target: e.target ?? e.Eff100 ?? Number(e.Eff100 ?? 0) ?? 0,
            efficiency: e.efficiency ?? e.EffPer ?? Number(e.EffPer ?? 0) ?? 0,
            phone_number: e.phone_number ?? e.PhoneNumber ?? null,
            is_red_flag: e.IsRedFlag ?? e.is_red_flag ?? 0,
            supervisor_name: e.supervisor_name ?? e.SupervisorName ?? null,
            supervisor_code: e.supervisor_code ?? e.SupervisorCode ?? null,
            __raw: e,
          });
        });
      });
    } else {
      const rows: RawFlaggedRow[] = (payload as any).data ?? [];
      rows.forEach((r) => {
        const empCode = r.EmpCode ?? r.emp_code ?? r.Emp_Code ?? r.EmpID;
        if (!empCode || seenEmpCodes.has(empCode)) return;
        seenEmpCodes.add(empCode);
        result.push({
          emp_code: empCode,
          emp_name: r.EmpName ?? r.emp_name ?? r.Emp_Name,
          unit_code: r.UnitCode ?? r.unit_code ?? fallbackUnit,
          floor_name: r.FloorName ?? r.floor_name ?? fallbackFloor,
          line_name: r.LineName ?? r.line_name ?? fallbackLine,
          part_name: r.PartName ?? r.part_name ?? fallbackPart,
          new_oper_seq: r.NewOperSeq ?? r.new_oper_seq,
          operation: r.Operation ?? r.operation,
          production: r.ProdnPcs ?? r.production ?? Number(r.ProdnPcs ?? 0),
          target: r.Eff100 ?? r.target ?? Number(r.Eff100 ?? 0),
          efficiency: r.EffPer ?? r.efficiency ?? Number(r.EffPer ?? 0),
          phone_number: r.phone_number ?? r.PhoneNumber ?? null,
          is_red_flag: r.IsRedFlag ?? r.is_red_flag ?? 0,
          supervisor_name: r.supervisor_name ?? r.SupervisorName,
          supervisor_code: r.supervisor_code ?? r.SupervisorCode,
          __raw: r,
        });
      });
    }

    return result;
  };

  // Create employee list from flaggedQ
  const flaggedEmployees = useMemo(() => {
    if (!flaggedQ.data) return [];
    try {
      return normalizeFlaggedEmployees(flaggedQ.data as FlaggedResponse);
    } catch (e) {
      return [];
    }
  }, [flaggedQ.data]);
  // Normalize API response to consistent employee objects
  const normalizeOperationEmployees = (payload: any) => {
    if (!payload) return [];
    const rows = Array.isArray(payload.data) ? payload.data : payload;
    if (!Array.isArray(rows)) return [];
    return rows.map((r: any) => ({
      emp_code: r.EmpCode ?? r.emp_code,
      emp_name: r.EmpName ?? r.emp_name,
      unit_code: r.UnitCode ?? r.unit_code,
      floor_name: r.FloorName ?? r.floor_name,
      line_name: r.LineName ?? r.line_name,
      part_name: r.PartName ?? r.part_name,
      operation:
        r.Operation ?? r.OperationName ?? r.NewOperSeq ?? r.new_oper_seq,
      production: Number(r.ProdnPcs ?? r.production ?? 0),
      target: Number(r.Eff100 ?? r.target ?? 0),
      efficiency: Number(
        typeof r.EffPer !== "undefined" ? r.EffPer : r.efficiency ?? 0
      ),
      is_red_flag: Number(r.IsRedFlag ?? r.is_red_flag ?? 0),
      __raw: r,
    }));
  };

  // ---------------- Employee Efficiency bar data (from /api/rtms/flagged)
  const getEmployeeEfficiencyBarData = () => {
    if (!flaggedEmployees || !flaggedEmployees.length) return null;

    // Option: use flagged employees in current filter scope
    const filtered = flaggedEmployees.filter((e) => e.emp_code && e.emp_name);

    if (!filtered.length) return null;

    // Choose top performer (highest efficiency)
    const top = filtered.reduce(
      (p, c) => (Number(p.efficiency ?? 0) > Number(c.efficiency ?? 0) ? p : c),
      filtered[0]
    );
    const maxEff = Number(top.efficiency ?? 0) || 100;

    // Normalize and sort descending; limit to 30
    const normalized = filtered
      .map((e) => ({
        ...e,
        normalized:
          maxEff > 0
            ? (Number(e.efficiency ?? 0) / maxEff) * 100
            : Number(e.efficiency ?? 0),
        effRaw: Number(e.efficiency ?? 0),
      }))
      .sort((a, b) => b.normalized - a.normalized)
      .slice(0, 30);

    const labels = normalized.map(
      (e) => `${e.emp_name} (${e.line_name ?? "—"})`
    );
    const data = normalized.map((e) => Number(e.normalized.toFixed(2)));

    const backgroundColors = normalized.map((e) => {
      if (e.emp_code === top.emp_code) return "hsl(120,60%,50%)"; // green
      return Number(e.effRaw) >= 85 ? "hsl(60,70%,50%)" : "hsl(0,84%,60%)";
    });

    const borderColors = normalized.map((e) => {
      if (e.emp_code === top.emp_code) return "hsl(120,60%,60%)";
      return Number(e.effRaw) >= 85 ? "hsl(60,70%,60%)" : "hsl(0,84%,64%)";
    });

    return {
      labels,
      datasets: [
        {
          label: "Employee Efficiency (normalized to top performer)",
          data,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 1,
        },
      ],
    };
  };

  const employeeEfficiencyChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const idx = ctx.dataIndex;
            const emp = flaggedEmployees[idx];
            if (!emp) return "";
            return `${emp.emp_name} — ${emp.efficiency ?? "N/A"}% (Prod: ${
              emp.production ?? 0
            }/${emp.target ?? 0})`;
          },
        },
      },
      zoom: {
        zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: "x" },
      },
    },
    scales: {
      x: { ticks: { autoSkip: true, maxRotation: 0 } },
      y: { beginAtZero: true, title: { display: true, text: "Normalized %" } },
    },
    animation: { duration: 600, easing: "easeOutQuart" },
  };

  // Chart for flagged parts (existing dataset)
  // const flaggedPartsChartData = useMemo(() => {
  //   const payload: any = flaggedQ.data;
  //   if (!payload) {
  //     return {
  //       labels: [],
  //       datasets: [
  //         {
  //           label: "Employee Details By Part Wise",
  //           data: [],
  //           backgroundColor: "rgba(54, 162, 235, 0.7)", // Blue fill
  //           borderColor: "rgba(54, 162, 235, 1)", // Blue border
  //           borderWidth: 1,
  //         },
  //       ],
  //     };
  //   }

  //   if (payload?.data?.parts && Array.isArray(payload.data.parts)) {
  //     const parts: FlaggedPartGroup[] = payload.data.parts;
  //     return {
  //       labels: parts.map((p) => p.part_name),
  //       datasets: [
  //         {
  //           label: "Flagged employees by part",
  //           data: parts.map((p) => p.employee_count),
  //           backgroundColor: parts.map(() => "rgba(54, 162, 235, 0.7)"), // force all bars blue
  //           borderColor: parts.map(() => "rgba(54, 162, 235, 1)"),
  //           borderWidth: 1,
  //         },
  //       ],
  //     };
  //   }

  //   const rows = (payload as any).data ?? [];
  //   const tally = new Map<string, number>();
  //   rows.forEach((r: any) => {
  //     const key = r.PartName ?? "Unknown";
  //     tally.set(key, (tally.get(key) ?? 0) + 1);
  //   });

  //   return {
  //     labels: Array.from(tally.keys()),
  //     datasets: [
  //       {
  //         label: "Flagged employees by part",
  //         data: Array.from(tally.values()),
  //         backgroundColor: Array.from(tally.keys()).map(
  //           () => "rgba(54, 162, 235, 0.7)"
  //         ),
  //         borderColor: Array.from(tally.keys()).map(
  //           () => "rgba(54, 162, 235, 1)"
  //         ),
  //         borderWidth: 1,
  //       },
  //     ],
  //   };
  // }, [flaggedQ.data]);
  // Build chart data + tooltip handler for Employee Details By Part Wise
  const opEmployees = useMemo(() => {
    if (!operationEmpQ.data) return [];
    try {
      return normalizeOperationEmployees(operationEmpQ.data);
    } catch {
      return [];
    }
  }, [operationEmpQ.data]);

 const employeeDetailsChart = useMemo(() => {
  if (!opEmployees || opEmployees.length === 0) return null;

  // Overall top performer
  const top = opEmployees.reduce((a, b) => (a.efficiency > b.efficiency ? a : b), opEmployees[0]);
  const topEff = Number(top.efficiency ?? 0);
  const safeThreshold = topEff * 0.85;

  const labels = opEmployees.map((e) => String(e.operation ?? "—"));
  const data = opEmployees.map((e) => Number(e.efficiency ?? 0));

  const backgroundColor = opEmployees.map((e) => {
    if (e.emp_code && top.emp_code && e.emp_code === top.emp_code) return "rgba(56,161,105,0.95)"; // green
    if (topEff > 0 && Number(e.efficiency ?? 0) >= safeThreshold) return "rgba(245,158,11,0.95)"; // yellow/amber
    return "rgba(239,68,68,0.95)"; // red
  });

  const borderColor = backgroundColor.map((c) => c.replace("0.95", "1"));

  // Suggest max = either 110 or 10% above top performer to avoid clipping / strange scale
  const suggestedMax = Math.max(110, Math.ceil(topEff * 1.1));

  return {
    labels,
    datasets: [
      {
        label: "Efficiency %",
        data,
        backgroundColor,
        borderColor,
        borderWidth: 1,
      },
    ],
    meta: { employees: opEmployees, top, topEff, safeThreshold, suggestedMax },
  } as ChartData<"bar", number[], string> & { meta?: any };
}, [opEmployees]);


  // Tooltip container helper
  const getOrCreateTooltip = (chart: any) => {
    const id = "employee-details-tooltip";
    let el = document.getElementById(id) as HTMLDivElement | null;
    if (!el) {
      el = document.createElement("div");
      el.id = id;
      el.style.pointerEvents = "none";
      el.style.position = "absolute";
      el.style.transform = "translate(-50%, 0)";
      el.style.transition = "all .08s ease";
      el.style.zIndex = "9999";
      el.style.minWidth = "180px";
      el.style.maxWidth = "320px";
      el.style.padding = "10px";
      el.style.borderRadius = "8px";
      el.style.boxShadow = "0 6px 18px rgba(0,0,0,0.12)";
      el.style.background = "rgba(15,23,42,0.96)";
      el.style.color = "#fff";
      el.style.fontSize = "13px";
      document.body.appendChild(el);
    }
    return el;
  };

 const externalTooltipHandler = (context: any) => {
  const { chart, tooltip } = context;
  const tooltipEl = getOrCreateTooltip(chart);

  // hide fast if no tooltip
  if (!tooltip || tooltip.opacity === 0) {
    tooltipEl.style.opacity = "0";
    return;
  }

  // safe extract datapoint info
  const dp = tooltip.dataPoints && tooltip.dataPoints[0];
  const dataIndex = dp?.dataIndex ?? -1;
  const datasetIndex = dp?.datasetIndex ?? 0;

  // fallback if no index
  if (dataIndex < 0) {
    tooltipEl.style.opacity = "0";
    return;
  }

  // employees stored in chart.data.meta.employees (set earlier)
  const chartDataAny: any = chart.data;
  const meta = chartDataAny?.meta ?? {};
  const employees = meta.employees ?? [];

  // get employee object robustly (try several fallbacks)
  let emp = employees[dataIndex];
  if (!emp) {
    // fallback to reading from raw dataset (if meta missing)
    const ds = chart.data.datasets?.[datasetIndex];
    const rawVal = ds?.data?.[dataIndex];
    emp = {
      emp_name: String(chart.data.labels?.[dataIndex] ?? "Unknown"),
      efficiency: rawVal ?? 0,
      production: (ds && ds.__production && ds.__production[dataIndex]) || 0,
      target: (ds && ds.__target && ds.__target[dataIndex]) || 0,
      operation: String(chart.data.labels?.[dataIndex] ?? "—"),
    };
  }

  const eff = Number(emp?.efficiency ?? 0);
  const prod = Number(emp?.production ?? 0);
  const targ = Number(emp?.target ?? 0);

  const topEmp = meta.top;
  const safeThreshold = meta.safeThreshold ?? 0;
  const badgeColor =
    emp?.emp_code && topEmp?.emp_code && emp.emp_code === topEmp.emp_code
      ? "#16a34a"
      : eff >= safeThreshold
      ? "#f59e0b"
      : "#ef4444";

  // Build HTML (always show something)
  tooltipEl.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px">
      <div style="font-weight:700;font-size:14px">${emp?.emp_name ?? emp?.EmpName ?? "—"}</div>
      <div style="font-size:12px;padding:4px 8px;border-radius:999px;background:${badgeColor};color:#fff;font-weight:700">
        ${isNaN(eff) ? "N/A" : eff.toFixed(1)}%
      </div>
    </div>
    <div style="font-size:13px;color:rgba(255,255,255,0.85);margin-bottom:6px">
      <div><strong>Operation:</strong> ${emp?.operation ?? emp?.Operation ?? "—"}</div>
    </div>
    <div style="font-size:13px;color:rgba(255,255,255,0.85)">
      <div><strong>Production:</strong> ${prod} / ${targ}</div>
    </div>
  `;

  // compute position - prefer element coords, fallback to caretX/caretY
  const canvasRect = chart.canvas.getBoundingClientRect();
  const element = dp?.element ?? dp?.element ?? chart.getDatasetMeta(datasetIndex)?.data?.[dataIndex];
  const localX = (element && element.x) ?? (tooltip.caretX ?? 0);
  const localY = (element && element.y) ?? (tooltip.caretY ?? 0);

  // position above the bar, but if that pushes tooltip off-screen, show below
  const topAbove = canvasRect.top + localY - tooltipEl.offsetHeight - 8;
  const topBelow = canvasRect.top + localY + 8;
  let finalTop = topAbove;
  if (finalTop < 8) finalTop = topBelow; // not enough room above

  // horizontal: center over the bar, but avoid overflow at edges
  let finalLeft = canvasRect.left + localX;
  const pageWidth = document.documentElement.clientWidth || window.innerWidth;
  const tooltipWidth = Math.min(320, tooltipEl.offsetWidth || 220);
  if (finalLeft + tooltipWidth / 2 > pageWidth - 8) finalLeft = pageWidth - tooltipWidth / 2 - 8;
  if (finalLeft - tooltipWidth / 2 < 8) finalLeft = tooltipWidth / 2 + 8;

  tooltipEl.style.left = `${finalLeft}px`;
  tooltipEl.style.top = `${finalTop}px`;
  tooltipEl.style.opacity = "1";
  tooltipEl.style.pointerEvents = "none";
};


  // Chart options using external tooltip
const employeeChartOptions: ChartOptions<"bar"> = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: "nearest",
    intersect: true,
  },
  plugins: {
    legend: { display: false },
    tooltip: { enabled: false, external: externalTooltipHandler },
    zoom: {
      zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: "x" },
    },
  },
  scales: {
    x: {
      title: { display: true, text: "Operation" },
      ticks: {
        autoSkip: false,
        maxRotation: 40,
        minRotation: 0,
        callback: function (val: any, index: number) {
          const v = this.getLabelForValue(index as any) as string;
          if (v && v.length > 22) return v.slice(0, 20) + "…";
          return v;
        },
      },
    },
    y: {
      beginAtZero: true,
      title: { display: true, text: "Efficiency (%)" },
      // default fallback; Chart will be re-rendered when `employeeDetailsChart.meta.suggestedMax` changes
      suggestedMax: 110,
      ticks: {
        stepSize: 10,
      },
    },
  },
  animation: { duration: 400, easing: "easeOutQuart" },
};


  // cleanup tooltip on unmount
  useEffect(() => {
    return () => {
      const el = document.getElementById("employee-details-tooltip");
      if (el) el.remove();
    };
  }, []);

  // Recent activity grouped by supervisor — but include full location & operation and production
  const recentActivityBySupervisor = useMemo(() => {
    const groups: Record<string, FlaggedEmployeeRaw[]> = {};
    flaggedEmployees.forEach((emp) => {
      const sup = emp.supervisor_name ?? "Unknown Supervisor";
      if (!groups[sup]) groups[sup] = [];
      groups[sup].push(emp);
    });
    return groups;
  }, [flaggedEmployees]);

  // send per-employee alert action (UI-only here)
  const sendIndividualAlert = (emp: FlaggedEmployeeRaw) => {
    const severity =
      (emp.efficiency ?? 0) < 70
        ? "high"
        : (emp.efficiency ?? 0) < 85
        ? "medium"
        : "low";
    const alert = {
      type: "individual_whatsapp",
      severity,
      employee: emp,
      message: `🚨 WhatsApp alert queued for ${
        emp.emp_name ?? emp.emp_code
      } — ${emp.efficiency ?? "N/A"}%`,
      timestamp: new Date().toISOString(),
    };
    setAlerts((p) => [alert, ...p].slice(0, 10));
  };

  // UI: spinner while initial lookups happen
  if (unitsQ.isLoading || floorsQ.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto" />
          <p className="text-xl text-primary mt-4">
            Loading Fabric Pulse AI...
          </p>
        </div>
      </div>
    );
  }

  // ---------- Render ----------
  return (
    <div className="space-y-6 max-w-[2200px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
      {/* Header */}
      <motion.div
        ref={headerRef}
        className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 shadow-lg"
      >
        <div className="flex items-center gap-3 sm:gap-4">
          <motion.div
            animate={{ rotate: 360, scale: [1, 1.06, 1] }}
            transition={{
              rotate: { duration: 20, repeat: Infinity, ease: "linear" },
              scale: { duration: 3, repeat: Infinity },
            }}
          >
            <div className="relative">
              <Cpu className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            </div>
          </motion.div>
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent tracking-tight">
              RTMS System
            </h1>
            <p className="text-xs sm:text-sm lg:text-base text-muted-foreground flex items-center gap-2">
              <Database className="h-4 w-4" /> Powered By Llama 3.2b AI
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <motion.div
            className="text-left sm:text-right bg-card/60 backdrop-blur-sm rounded-xl p-3 border border-primary/20"
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <p className="text-xs text-muted-foreground">System Time</p>
            <p className="text-lg sm:text-xl font-mono font-semibold text-primary">
              {new Date().toLocaleString()}
            </p>
            <p className="text-xs text-green-500">● Live Monitoring</p>
          </motion.div>
        </div>
      </motion.div>

      {/* Filters */}
      <Card
        ref={gridRef}
        className="rounded-2xl shadow-md bg-card/70 backdrop-blur-md border border-primary/20"
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            Filters{" "}
            <Badge variant="secondary">Unit → Floor → Line → Part</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <Select
            value={unit}
            onValueChange={(v) => {
              setUnit(v);
              setFloor("");
              setLine("");
              setPart("");
            }}
          >
            <SelectTrigger className="h-10">
              <SelectValue
                placeholder={
                  unitsQ.isLoading ? "Loading units..." : "Select Unit"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {(unitsQ.data ?? []).map((u) => (
                <SelectItem key={u} value={u}>
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={floor}
            onValueChange={(v) => {
              setFloor(v);
              setLine("");
              setPart("");
            }}
            disabled={!unit || floorsQ.isLoading}
          >
            <SelectTrigger className="h-10">
              <SelectValue
                placeholder={
                  !unit
                    ? "Select Unit first"
                    : floorsQ.isLoading
                    ? "Loading floors..."
                    : "Select Floor"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {(floorsQ.data ?? []).map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={line}
            onValueChange={(v) => {
              setLine(v);
              setPart("");
            }}
            disabled={!unit || !floor || linesQ.isLoading}
          >
            <SelectTrigger className="h-10">
              <SelectValue
                placeholder={
                  !floor
                    ? "Select Floor first"
                    : linesQ.isLoading
                    ? "Loading lines..."
                    : "Select Line"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {(linesQ.data ?? []).map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={part}
            onValueChange={setPart}
            disabled={!unit || !floor || !line || partsQ.isLoading}
          >
            <SelectTrigger className="h-10">
              <SelectValue
                placeholder={
                  !line
                    ? "Select Line first"
                    : partsQ.isLoading
                    ? "Loading parts..."
                    : "Select Part"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {(partsQ.data ?? []).map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      {filtersReady && efficiencyQ.data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Production (restored shadow + color classes to match old visuals) */}
          <Card
            ref={setCardRef}
            className="shadow-card glass-card border-primary/20 hover:shadow-glow transition-all duration-300 rounded-2xl"
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm sm:text-base">
                <TrendingUp className="h-4 w-4 text-primary" /> Total Production
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl sm:text-3xl font-semibold flex items-center gap-2 text-primary">
              {efficiencyQ.data.total_production?.toLocaleString() ?? 0}
            </CardContent>
          </Card>

          {/* Target */}
          <Card
            ref={setCardRef}
            className="shadow-card glass-card border-warning/20 hover:shadow-glow transition-all duration-300 rounded-2xl"
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm sm:text-base">
                <Target className="h-4 w-4 text-warning" /> Target
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl sm:text-3xl font-semibold flex items-center gap-2 text-warning">
              {efficiencyQ.data.total_target?.toLocaleString() ?? 0}
            </CardContent>
          </Card>

          {/* Efficiency */}
          <Card
            ref={setCardRef}
            className={`shadow-card glass-card hover:shadow-glow transition-all duration-300 rounded-2xl ${
              efficiencyQ.data && efficiencyQ.data.efficiency >= 90
                ? "border-success/20"
                : efficiencyQ.data && efficiencyQ.data.efficiency >= 85
                ? "border-warning/20"
                : "border-destructive/20"
            }`}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm sm:text-base">
                <TrendingUp className="h-4 w-4" /> Efficiency
              </CardTitle>
            </CardHeader>
            <CardContent
              className={`text-2xl sm:text-3xl font-semibold ${
                efficiencyQ.data && efficiencyQ.data.efficiency >= 90
                  ? "text-success"
                  : efficiencyQ.data && efficiencyQ.data.efficiency >= 85
                  ? "text-warning"
                  : "text-destructive"
              }`}
            >
              {efficiencyQ.data.efficiency?.toFixed(1) ?? 0}%
            </CardContent>
          </Card>

          {/* Underperformers */}
          <Card
            ref={setCardRef}
            className="shadow-card glass-card border-info/20 hover:shadow-glow transition-all duration-300 rounded-2xl"
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm sm:text-base">
                <Users className="h-4 w-4 text-info" /> Underperformers
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl sm:text-3xl font-semibold text-destructive">
              {efficiencyQ.data.underperformers_count ?? 0}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===== Charts area ===== */}
      {filtersReady && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Employee Efficiency under 85% - now from flagged data */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="shadow-card glass-card border-info/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <BarChart3 className="h-5 w-5" /> Employee Efficiency under
                  85% from the Top Performer
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Red bars indicate below 85% efficiency threshold
                </p>
              </CardHeader>
              <CardContent ref={chartWrapRef}>
                <div className="h-80">
                  {getEmployeeEfficiencyBarData() ? (
                    <Bar
                      data={getEmployeeEfficiencyBarData()!}
                      options={employeeEfficiencyChartOptions}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No efficiency data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Flagged / Part distribution (kept) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.45 }}
          >
            <Card className="shadow-card glass-card border-success/20">
              {/* <CardHeader>
                <CardTitle className="flex items-center gap-2 text-success">
                  <BarChart3 className="h-5 w-5" /> Flagged by Part
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {part ? `Part: ${part}` : "Flagged distribution"}
                </p>
              </CardHeader> */}
              <CardContent>
                {/* Employee Details By Part Wise */}
                <div className="card">
                  <div className="card-header">
                    <h3>Employee Details By Part Wise</h3>
                    <div className="muted small">
                      X: Operation — Y: Efficiency (%)
                    </div>
                  </div>
                  <div className="card-body" style={{ height: 320 }}>
                    {employeeDetailsChart ? (
                      <Bar
                        data={employeeDetailsChart}
                        options={employeeChartOptions}
                      />
                    ) : (
                      <div className="muted">
                        No employee data for selected filters
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Recent Activity — grouped by supervisor but now showing full mapping and Production/Operation */}
      {filtersReady && flaggedQ.data && (
        <Card
          ref={recentWrapRef}
          className="rounded-2xl shadow-md bg-card/70 backdrop-blur-md border border-primary/20"
        >
          <CardHeader>
            <CardTitle className="text-primary flex items-center gap-2">
              <MessageSquare className="h-5 w-5" /> Recent Alerts &
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-2">
              {Object.keys(recentActivityBySupervisor).length === 0 ? (
                <div className="text-muted-foreground text-center py-4">
                  ✅ No flagged employees
                </div>
              ) : (
                Object.entries(recentActivityBySupervisor).map(
                  ([sup, emps], sidx) => (
                    <motion.div
                      key={sup}
                      className="p-3 border border-primary/20 rounded-xl bg-card/60"
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{ delay: 0.03 * sidx }}
                    >
                      <h3 className="font-semibold text-primary mb-2">
                        Supervisor Name: {sup}
                      </h3>
                      <ul className="space-y-2 text-sm">
                        {emps.map((emp, idx) => (
                          <li
                            key={`${emp.emp_code ?? emp.emp_name}-${idx}`}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-md bg-card/40 border border-border"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="destructive"
                                  className="font-mono"
                                >
                                  {emp.emp_code ?? "—"}
                                </Badge>
                                <span className="font-medium truncate">
                                  {emp.emp_name ?? "—"}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {emp.efficiency ?? "N/A"}% efficiency
                                </Badge>
                              </div>

                              <div className="text-xs text-muted-foreground mt-1 space-y-1">
                                <div>
                                  <strong>Location:</strong> {emp.unit_code} →{" "}
                                  {emp.floor_name} → {emp.line_name ?? "—"} →{" "}
                                  {emp.part_name ?? "—"}
                                </div>
                                <div>
                                  <strong>Operation:</strong>{" "}
                                  {emp.operation ?? emp.new_oper_seq ?? "—"}
                                </div>
                                <div>
                                  <strong>Production:</strong>{" "}
                                  {emp.production ?? 0}/{emp.target ?? 0} pieces
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {emp.phone_number ? (
                                <Badge variant="secondary">
                                  {emp.phone_number}
                                </Badge>
                              ) : null}
                              {/* <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => sendIndividualAlert(emp)}
                              >
                                <MessageSquare className="h-4 w-4 mr-2" /> Send
                                Alert
                              </Button> */}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )
                )
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* assistant */}
      <RTMSBot />

      {/* manual reload */}
      <div className="flex justify-end">
        <Button variant="secondary" onClick={() => window.location.reload()}>
          Reload
        </Button>
      </div>
    </div>
  );
}
