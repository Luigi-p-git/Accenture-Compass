'use client';

import { motion } from 'framer-motion';

interface DonutChartProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  sublabel?: string;
}

export default function DonutChart({
  value,
  size = 120,
  strokeWidth = 8,
  color = '#a600ff',
  label,
  sublabel,
}: DonutChartProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeWidth}
          />
          {/* Value */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
            style={{
              filter: `drop-shadow(0 0 8px ${color}40)`,
            }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-2xl font-black tracking-tighter text-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            {value}%
          </motion.span>
        </div>
      </div>
      {label && (
        <span className="mt-3 text-[10px] font-bold tracking-[0.15em] uppercase text-white/40">
          {label}
        </span>
      )}
      {sublabel && (
        <span className="text-xs text-white/60 mt-0.5">{sublabel}</span>
      )}
    </div>
  );
}

export function ProgressRing({
  items,
}: {
  items: { label: string; value: number; color: string }[];
}) {
  const size = 180;
  const strokeWidth = 12;
  const gap = 6;
  const totalItems = items.length;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {items.map((item, i) => {
          const r = (size - strokeWidth) / 2 - i * (strokeWidth + gap);
          const circ = 2 * Math.PI * r;
          const off = circ - (item.value / 100) * circ;

          return (
            <g key={item.label}>
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke="rgba(255,255,255,0.04)"
                strokeWidth={strokeWidth}
              />
              <motion.circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={item.color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circ}
                initial={{ strokeDashoffset: circ }}
                animate={{ strokeDashoffset: off }}
                transition={{
                  duration: 1.2,
                  delay: i * 0.15,
                  ease: [0.4, 0, 0.2, 1],
                }}
              />
            </g>
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-black text-white">{totalItems}</span>
        <span className="text-[9px] font-bold tracking-widest uppercase text-white/30">
          metrics
        </span>
      </div>
    </div>
  );
}
