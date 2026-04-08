'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  change?: string;
  direction?: 'up' | 'down' | 'stable';
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg';
  delay?: number;
}

export default function StatCard({
  label,
  value,
  change,
  direction = 'up',
  subtitle,
  size = 'md',
  delay = 0,
}: StatCardProps) {
  const sizeStyles = {
    sm: { value: 'text-xl', label: 'text-[9px]', pad: 'p-4' },
    md: { value: 'text-3xl', label: 'text-[10px]', pad: 'p-6' },
    lg: { value: 'text-5xl', label: 'text-[11px]', pad: 'p-8' },
  };

  const s = sizeStyles[size];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.4, 0, 0.2, 1] }}
      className={`${s.pad} rounded-2xl card-hover`}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <span
        className={`${s.label} font-bold tracking-[0.15em] uppercase block mb-2`}
        style={{ color: 'rgba(255,255,255,0.4)' }}
      >
        {label}
      </span>
      <div className="flex items-end gap-3">
        <span className={`${s.value} font-black tracking-tighter text-white`}>
          {value}
        </span>
        {change && (
          <span
            className={`flex items-center gap-1 text-xs font-bold mb-1 ${
              direction === 'up'
                ? 'text-emerald-400'
                : direction === 'down'
                ? 'text-red-400'
                : 'text-white/40'
            }`}
          >
            {direction === 'up' && <TrendingUp size={12} />}
            {direction === 'down' && <TrendingDown size={12} />}
            {direction === 'stable' && <Minus size={12} />}
            {change}
          </span>
        )}
      </div>
      {subtitle && (
        <span className="text-xs text-white/30 mt-2 block">{subtitle}</span>
      )}
    </motion.div>
  );
}
