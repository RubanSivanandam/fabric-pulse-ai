import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LucideIcon } from 'lucide-react';

interface AnimatedMetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
  delay?: number;
}

const AnimatedMetricCard: React.FC<AnimatedMetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  color = 'primary',
  className = '',
  delay = 0
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef<HTMLSpanElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cardRef.current && valueRef.current) {
      // Card entrance animation
      gsap.fromTo(
        cardRef.current,
        { 
          opacity: 0, 
          y: 30, 
          scale: 0.9 
        },
        { 
          opacity: 1, 
          y: 0, 
          scale: 1,
          duration: 0.6,
          ease: "back.out(1.7)",
          delay: delay
        }
      );

      // Value counter animation
      const finalValue = typeof value === 'number' ? value : parseFloat(value.toString().replace(/[^\d.-]/g, ''));
      if (!isNaN(finalValue)) {
        const obj = { value: 0 };
        gsap.to(obj, { 
          value: finalValue,
          duration: 1.5,
          ease: "power2.out",
          delay: delay + 0.3,
          onUpdate: function() {
            if (valueRef.current) {
              const currentValue = obj.value;
              const formattedValue = typeof value === 'string' && value.includes('%')
                ? `${Math.round(currentValue)}%`
                : typeof value === 'string' && value.includes('K')
                ? `${(currentValue / 1000).toFixed(1)}K`
                : Math.round(currentValue).toLocaleString();
              valueRef.current.textContent = formattedValue;
            }
          }
        });
      }

      // Icon animation
      if (iconRef.current) {
        gsap.fromTo(
          iconRef.current,
          { 
            scale: 0, 
            rotation: -180 
          },
          { 
            scale: 1, 
            rotation: 0,
            duration: 0.8,
            ease: "elastic.out(1, 0.3)",
            delay: delay + 0.2
          }
        );
      }
    }
  }, [value, delay]);

  const colorClasses = {
    primary: 'border-primary/20 bg-gradient-primary text-primary-foreground shadow-glow',
    success: 'border-success/20 bg-gradient-success text-success-foreground shadow-success',
    warning: 'border-warning/20 bg-gradient-warning text-warning-foreground',
    danger: 'border-destructive/20 bg-gradient-danger text-destructive-foreground shadow-alert',
    info: 'border-info/20 bg-gradient-cyber text-info-foreground'
  };

  const trendColors = {
    up: 'success',
    down: 'destructive',
    neutral: 'secondary'
  };

  return (
    <motion.div
      ref={cardRef}
      className={`relative overflow-hidden ${className}`}
      whileHover={{ 
        scale: 1.05,
        transition: { duration: 0.2 }
      }}
      whileTap={{ scale: 0.98 }}
    >
      <Card className={`relative glass-card ${colorClasses[color]} border-2 transition-all duration-300 hover:shadow-lg`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium opacity-90">
            {title}
          </CardTitle>
          {Icon && (
            <div ref={iconRef} className="p-1">
              <Icon className="h-4 w-4 sm:h-5 sm:w-5 opacity-80" />
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <span 
                ref={valueRef}
                className="text-xl sm:text-2xl lg:text-3xl font-bold"
              >
                {value}
              </span>
              {subtitle && (
                <motion.p 
                  className="text-xs opacity-70 mt-1"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 0.7, y: 0 }}
                  transition={{ delay: delay + 0.5, duration: 0.4 }}
                >
                  {subtitle}
                </motion.p>
              )}
            </div>
            {trend && trendValue && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: delay + 0.7, duration: 0.3 }}
              >
                <Badge 
                  variant={trendColors[trend] as any}
                  className="text-xs font-medium"
                >
                  {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'} {trendValue}
                </Badge>
              </motion.div>
            )}
          </div>
        </CardContent>
        
        {/* Animated background effect */}
        <motion.div
          className="absolute inset-0 opacity-10 bg-gradient-to-br from-transparent via-white to-transparent"
          initial={{ x: '-100%', skewX: -45 }}
          animate={{ x: '200%', skewX: -45 }}
          transition={{
            duration: 2,
            ease: "easeInOut",
            repeat: Infinity,
            repeatDelay: 3,
            delay: delay + 1
          }}
        />
      </Card>
    </motion.div>
  );
};

export default AnimatedMetricCard;