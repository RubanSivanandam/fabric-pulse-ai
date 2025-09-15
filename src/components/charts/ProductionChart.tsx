// src/components/charts/ProductionChart.tsx - Production Chart
import React, { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { gsap } from 'gsap';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface ProductionChartProps {
  data: any;
}

export function ProductionChart({ data }: ProductionChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chartRef.current) {
      gsap.from(chartRef.current, {
        y: 50,
        opacity: 0,
        duration: 1,
        ease: "power2.out",
        delay: 0.2,
      });
    }
  }, [data]);

  if (!data || !data.operators || data.operators.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mx-auto mb-4"></div>
          <p>No production data available</p>
        </div>
      </div>
    );
  }

  // Group by line for production overview
  const lineData = data.operators.reduce((acc: any, op: any) => {
    const line = op.line_name || 'Unknown';
    if (!acc[line]) {
      acc[line] = { production: 0, target: 0, operators: 0 };
    }
    acc[line].production += op.production || 0;
    acc[line].target += op.target || 0;
    acc[line].operators += 1;
    return acc;
  }, {});

  const lines = Object.keys(lineData).slice(0, 8); // Show top 8 lines
  const productions = lines.map(line => lineData[line].production);
  const targets = lines.map(line => lineData[line].target);

  const chartData = {
    labels: lines,
    datasets: [
      {
        label: 'Actual Production',
        data: productions,
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: 'Target Production',
        data: targets,
        backgroundColor: 'rgba(239, 68, 68, 0.3)',
        borderColor: 'rgba(239, 68, 68, 0.8)',
        borderWidth: 2,
        borderDash: [3, 3],
        borderRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
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
          afterBody: function(context: any) {
            const lineInfo = lineData[context[0].label];
            return `Operators: ${lineInfo.operators}\nEfficiency: ${((lineInfo.production / lineInfo.target) * 100).toFixed(1)}%`;
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
        grid: {
          color: 'rgba(75, 85, 99, 0.3)',
        },
        ticks: {
          color: '#9ca3af',
          callback: function(value: any) {
            return value.toLocaleString();
          },
        },
      },
    },
    animation: {
      duration: 1500,
      easing: 'easeInOutCubic' as const,
    },
  };

  return (
    <div ref={chartRef} className="h-64 w-full">
      <Bar data={chartData} options={options} />
    </div>
  );
}
