import React, { useEffect, useRef } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { OperatorData } from "../../types";

interface OperatorEfficiencyVisualizationProps {
  data: OperatorData[];
  loading?: boolean;
  className?: string;
}

const COLORS = ["#10B981", "#F59E0B", "#EF4444", "#6B7280"];
const STATUS_COLORS = {
  excellent: "#10B981",
  good: "#3B82F6",
  needs_improvement: "#F59E0B",
  critical: "#EF4444",
};

export const OperatorEfficiencyVisualization: React.FC<
  OperatorEfficiencyVisualizationProps
> = ({ data, loading = false, className = "" }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // GSAP animation on mount (graceful fallback if GSAP not available)
    try {
      // @ts-ignore
      if (typeof gsap !== "undefined" && containerRef.current) {
        // @ts-ignore
        gsap.from(containerRef.current, {
          duration: 0.6,
          opacity: 0,
          y: 20,
          ease: "power2.out",
        });
      }
    } catch (error) {
      // GSAP not available, continue without animation
      console.log("GSAP not available, skipping animation");
    }
  }, [data]);

  if (loading) {
    return (
      <div className={`efficiency-visualization loading ${className}`}>
        <div className="loading-spinner">Loading chart data...</div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={`efficiency-visualization empty ${className}`}>
        <div className="empty-state">
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <h3>No Data Available</h3>
          <p>Apply filters to view efficiency data</p>
        </div>
      </div>
    );
  }

  // Prepare data for bar chart
  const chartData = data.slice(0, 20).map((operator, index) => ({
    name: `${operator.empName.split(" ")[0]} (${operator.empCode})`,
    efficiency: Number(operator.efficiency.toFixed(1)),
    production: operator.production,
    target: operator.target,
    status: operator.status,
    isTopPerformer: operator.isTopPerformer,
    fullName: operator.empName,
    operation: operator.newOperSeq,
  }));

  // Prepare data for status distribution pie chart
  const statusData = [
    {
      name: "Excellent (100%+)",
      value: data.filter((op) => op.status === "excellent").length,
      color: STATUS_COLORS.excellent,
    },
    {
      name: "Good (85-99%)",
      value: data.filter((op) => op.status === "good").length,
      color: STATUS_COLORS.good,
    },
    {
      name: "Needs Improvement (70-84%)",
      value: data.filter((op) => op.status === "needs_improvement").length,
      color: STATUS_COLORS.needs_improvement,
    },
    {
      name: "Critical (<70%)",
      value: data.filter((op) => op.status === "critical").length,
      color: STATUS_COLORS.critical,
    },
  ].filter((item) => item.value > 0);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{data.fullName}</p>
          <p className="tooltip-operation">Operation: {data.operation}</p>
          <p className="tooltip-efficiency">
            Efficiency:{" "}
            <span className="tooltip-value">{data.efficiency}%</span>
          </p>
          <p className="tooltip-production">
            Production:{" "}
            <span className="tooltip-value">
              {data.production}/{data.target}
            </span>
          </p>
          {data.isTopPerformer && (
            <p className="tooltip-badge">🏆 Top Performer</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div ref={containerRef} className={`efficiency-visualization ${className}`}>
      <div className="visualization-header">
        <h3>Operator Efficiency Analysis</h3>
        <p className="data-summary">
          Showing {Math.min(data.length, 20)} of {data.length} operators
          {data.length > 20 && " (top 20 displayed)"}
        </p>
      </div>

      <div className="charts-grid">
        <div className="chart-container">
          <h4>Efficiency by Operator</h4>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={100}
                fontSize={12}
                stroke="#6B7280"
              />
              <YAxis
                domain={[
                  0,
                  Math.max(
                    110,
                    Math.max(...chartData.map((d) => d.efficiency)) + 10
                  ),
                ]}
                fontSize={12}
                stroke="#6B7280"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar
                dataKey="efficiency"
                name="Efficiency %"
                fill="#8884d8"
                radius={[2, 2, 0, 0]}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.isTopPerformer
                        ? "#10B981"
                        : entry.efficiency >= 100
                        ? "#10B981"
                        : entry.efficiency >= 85
                        ? "#3B82F6"
                        : entry.efficiency >= 70
                        ? "#F59E0B"
                        : "#EF4444"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {statusData.length > 0 && (
          <div className="chart-container">
            <h4>Performance Status Distribution</h4>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) =>
                    `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Top Performers Section */}
      {data.some((op) => op.isTopPerformer) && (
        <div className="top-performers">
          <h4>🏆 Top Performers</h4>
          <div className="performers-grid">
            {data
              .filter((op) => op.isTopPerformer)
              .slice(0, 6)
              .map((performer, index) => (
                <div
                  key={`${performer.empCode}-${performer.newOperSeq}-${index}`}
                  className="performer-card"
                >
                  <div className="performer-name">{performer.empName}</div>
                  <div className="performer-code">({performer.empCode})</div>
                  <div className="performer-efficiency">
                    {performer.efficiency.toFixed(1)}%
                  </div>
                  <div className="performer-operation">
                    {performer.newOperSeq}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
