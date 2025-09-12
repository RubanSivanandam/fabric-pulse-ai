import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { gsap } from 'gsap';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface AnimatedBarChartProps {
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor?: string;
      borderColor?: string;
      borderWidth?: number;
    }[];
  };
  options?: Partial<ChartOptions<'bar'>>;
  title?: string;
  height?: number;
  className?: string;
}

const AnimatedBarChart: React.FC<AnimatedBarChartProps> = ({
  data,
  options = {},
  title,
  height = 400,
  className = '',
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (chartRef.current && titleRef.current) {
      // GSAP entrance animations
      gsap.fromTo(
        chartRef.current,
        { 
          opacity: 0, 
          y: 50, 
          scale: 0.9 
        },
        { 
          opacity: 1, 
          y: 0, 
          scale: 1,
          duration: 0.8,
          ease: "back.out(1.7)",
          delay: 0.2
        }
      );

      gsap.fromTo(
        titleRef.current,
        { 
          opacity: 0, 
          x: -30 
        },
        { 
          opacity: 1, 
          x: 0,
          duration: 0.6,
          ease: "power2.out"
        }
      );
    }
  }, []);

  const defaultOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: 'hsl(0, 0%, 95%)',
          font: {
            size: 14,
            weight: 500
          },
          usePointStyle: true,
          pointStyle: 'rectRounded',
        }
      },
      tooltip: {
        backgroundColor: 'hsl(220, 30%, 8%)',
        titleColor: 'hsl(214, 100%, 65%)',
        bodyColor: 'hsl(0, 0%, 95%)',
        borderColor: 'hsl(214, 100%, 65%)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          title: (context) => {
            return `${context[0].label}`;
          },
          label: (context) => {
            return `${context.dataset.label}: ${context.formattedValue}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'hsl(220, 30%, 18%)',
          lineWidth: 1,
        },
        ticks: {
          color: 'hsl(0, 0%, 70%)',
          font: {
            size: 12,
            weight: 400
          }
        },
        border: {
          color: 'hsl(220, 30%, 18%)'
        }
      },
      y: {
        grid: {
          color: 'hsl(220, 30%, 18%)',
          lineWidth: 1,
        },
        ticks: {
          color: 'hsl(0, 0%, 70%)',
          font: {
            size: 12,
            weight: 400
          }
        },
        border: {
          color: 'hsl(220, 30%, 18%)'
        }
      }
    },
    animation: {
      duration: 2000,
      easing: 'easeInOutQuart',
      delay: (context) => {
        return context.type === 'data' && context.mode === 'default'
          ? context.dataIndex * 100
          : 0;
      },
    },
    interaction: {
      intersect: false,
      mode: 'index'
    }
  };

  const enhancedData = {
    ...data,
    datasets: data.datasets.map((dataset, index) => ({
      ...dataset,
      backgroundColor: dataset.backgroundColor || [
        'hsla(214, 100%, 65%, 0.8)',
        'hsla(120, 100%, 45%, 0.8)',
        'hsla(45, 100%, 60%, 0.8)',
        'hsla(0, 100%, 65%, 0.8)',
        'hsla(280, 70%, 50%, 0.8)',
      ][index % 5],
      borderColor: dataset.borderColor || [
        'hsl(214, 100%, 65%)',
        'hsl(120, 100%, 45%)',
        'hsl(45, 100%, 60%)',
        'hsl(0, 100%, 65%)',
        'hsl(280, 70%, 50%)',
      ][index % 5],
      borderWidth: dataset.borderWidth || 2,
      borderRadius: 6,
      borderSkipped: false,
      hoverBackgroundColor: dataset.backgroundColor || [
        'hsla(214, 100%, 75%, 0.9)',
        'hsla(120, 100%, 55%, 0.9)',
        'hsla(45, 100%, 70%, 0.9)',
        'hsla(0, 100%, 75%, 0.9)',
        'hsla(280, 70%, 60%, 0.9)',
      ][index % 5],
      hoverBorderColor: [
        'hsl(214, 100%, 75%)',
        'hsl(120, 100%, 55%)',
        'hsl(45, 100%, 70%)',
        'hsl(0, 100%, 75%)',
        'hsl(280, 70%, 60%)',
      ][index % 5],
    }))
  };

  const mergedOptions = { ...defaultOptions, ...options };

  return (
    <motion.div 
      className={`bg-card/50 backdrop-blur-md border border-border rounded-lg p-4 sm:p-6 glass-card ${className}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      whileHover={{ 
        scale: 1.02, 
        boxShadow: "0 8px 32px hsl(214, 100%, 65%, 0.3)" 
      }}
    >
      {title && (
        <motion.h3 
          ref={titleRef}
          className="text-lg sm:text-xl lg:text-2xl font-bold text-primary mb-4 sm:mb-6"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          {title}
        </motion.h3>
      )}
      <div 
        ref={chartRef}
        className="w-full"
        style={{ height: `${height}px` }}
      >
        <Bar 
          data={enhancedData} 
          options={mergedOptions}
        />
      </div>
    </motion.div>
  );
};

export default AnimatedBarChart;