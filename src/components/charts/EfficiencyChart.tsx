// src/components/charts/EfficiencyChart.tsx - Working Chart Component
import React, { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { gsap } from 'gsap';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface EfficiencyChartProps {
  data: any;
}

export function EfficiencyChart({ data }: EfficiencyChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chartRef.current) {
      gsap.from(chartRef.current, {
        scale: 0.8,
        opacity: 0,
        duration: 1,
        ease: "back.out(1.7)",
      });
    }
  }, [data]);

  if (!data || !data.operators || data.operators.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p>No efficiency data available</p>
        </div>
      </div>
    );
  }

  // Process data for chart
  const operators = data.operators.slice(0, 10); // Show top 10 operators
  const labels = operators.map((op: any) => op.emp_name || `Emp ${op.emp_code}`);
  const efficiencyData = operators.map((op: any) => op.efficiency);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Efficiency %',
        data: efficiencyData,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: efficiencyData.map((eff: number) => 
          eff >= 100 ? '#10b981' : 
          eff >= 85 ? '#f59e0b' : '#ef4444'
        ),
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
      },
      {
        label: 'Target (85%)',
        data: Array(labels.length).fill(85),
        borderColor: 'rgba(245, 158, 11, 0.8)',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius: 0,
        tension: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#e5e7eb',
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        titleColor: '#f9fafb',
        bodyColor: '#d1d5db',
        borderColor: '#374151',
        borderWidth: 1,
        callbacks: {
          label: function(context: any) {
            const value = context.parsed.y;
            const status = value >= 100 ? '🟢 Excellent' : 
                          value >= 85 ? '🟡 Good' : '🔴 Needs Attention';
            return `${context.dataset.label}: ${value}% ${status}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(75, 85, 99, 0.3)',
        },
        ticks: {
          color: '#9ca3af',
          maxRotation: 45,
          font: {
            size: 11,
          },
        },
      },
      y: {
        beginAtZero: true,
        max: Math.max(120, Math.max(...efficiencyData) * 1.1),
        grid: {
          color: 'rgba(75, 85, 99, 0.3)',
        },
        ticks: {
          color: '#9ca3af',
          callback: function(value: any) {
            return value + '%';
          },
        },
      },
    },
    animation: {
      duration: 2000,
      easing: 'easeInOutQuart' as const,
    },
  };

  return (
    <div ref={chartRef} className="h-64 w-full">
      <Line data={chartData} options={options} />
    </div>
  );
}
