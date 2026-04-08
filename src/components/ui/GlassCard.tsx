'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  delay?: number;
  onClick?: () => void;
  padding?: string;
}

export default function GlassCard({
  children,
  className = '',
  hover = true,
  delay = 0,
  onClick,
  padding = 'p-6',
}: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.4, 0, 0.2, 1] }}
      onClick={onClick}
      className={`${padding} rounded-2xl ${hover ? 'card-hover cursor-pointer' : ''} ${className}`}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
      whileHover={hover ? { scale: 1.01, borderColor: 'rgba(131,0,202,0.15)' } : undefined}
    >
      {children}
    </motion.div>
  );
}

export function GlassCardStrong({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay, ease: [0.4, 0, 0.2, 1] }}
      className={`p-8 rounded-3xl ${className}`}
      style={{
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      {children}
    </motion.div>
  );
}
