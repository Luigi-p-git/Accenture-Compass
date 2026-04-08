'use client';

import { motion } from 'framer-motion';

interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  showLabels?: boolean;
  animate?: boolean;
  maxBars?: number;
}

export default function BarChart({
  data,
  height = 160,
  showLabels = true,
  animate = true,
  maxBars = 8,
}: BarChartProps) {
  const sliced = data.slice(0, maxBars);
  const max = Math.max(...sliced.map((d) => d.value));

  return (
    <div className="w-full">
      <div className="flex items-end gap-2" style={{ height }}>
        {sliced.map((d, i) => {
          const h = max > 0 ? (d.value / max) * 100 : 0;
          return (
            <div
              key={d.label}
              className="flex-1 flex flex-col items-center justify-end group"
              style={{ height: '100%' }}
            >
              <motion.div
                className="w-full rounded-t-lg relative overflow-hidden"
                initial={animate ? { height: 0 } : { height: `${h}%` }}
                animate={{ height: `${h}%` }}
                transition={{
                  duration: 0.8,
                  delay: i * 0.08,
                  ease: [0.4, 0, 0.2, 1],
                }}
                style={{
                  background: d.color || 'linear-gradient(180deg, #a600ff 0%, #8300ca 100%)',
                  minHeight: h > 0 ? 4 : 0,
                }}
              >
                {/* Shimmer on hover */}
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all duration-300" />
              </motion.div>
            </div>
          );
        })}
      </div>
      {showLabels && (
        <div className="flex gap-2 mt-3">
          {sliced.map((d) => (
            <div
              key={d.label}
              className="flex-1 text-center text-[9px] font-bold tracking-wider uppercase text-white/30 truncate"
            >
              {d.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function MiniSparkline({
  data,
  color = '#a600ff',
  width = 80,
  height = 24,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      {data.length > 0 && (
        <circle
          cx={width}
          cy={height - ((data[data.length - 1] - min) / range) * height}
          r={2.5}
          fill={color}
        />
      )}
    </svg>
  );
}
