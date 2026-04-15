'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const REGION_COUNTRIES: Record<string, string[]> = {
  'World': [],
  'Americas': ['Canada', 'United States', 'Brazil', 'Mexico', 'Argentina', 'Colombia', 'Chile'],
  'EMEA': ['United Kingdom', 'Germany', 'France', 'Italy', 'Spain', 'Netherlands', 'Switzerland', 'South Africa', 'UAE', 'Saudi Arabia'],
  'APAC': ['China', 'Japan', 'South Korea', 'India', 'Australia', 'Singapore', 'Indonesia', 'Thailand'],
};

const REGIONS = Object.keys(REGION_COUNTRIES);

const INDUSTRIES = [
  'All Industries', 'Banking & Capital Markets', 'CG&S, Retail, Travel', 'Chemicals & Natural Resources',
  'Communications & Media', 'Energy', 'Health', 'High Tech', 'Industrials',
  'Insurance', 'Life Sciences', 'Public Service', 'Software & Platforms', 'Utilities',
];

const ITEM_H = 28;
const VIS = 7;
const HALF = Math.floor(VIS / 2);

/* ═══════════════════════════════════════
   MAIN EXPORT — 3 cascading chips
   ═══════════════════════════════════════ */
export default function HeaderSelector({ region, country, industry, onRegionChange, onCountryChange, onIndustryChange }: {
  region: string; country: string; industry: string;
  onRegionChange: (r: string) => void;
  onCountryChange: (c: string) => void;
  onIndustryChange: (i: string) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const toggle = (id: string) => setOpenId(prev => prev === id ? null : id);
  const close = useCallback(() => setOpenId(null), []);

  const countries = region === 'World'
    ? Object.values(REGION_COUNTRIES).flat()
    : REGION_COUNTRIES[region] ?? [];

  const countryOpts = countries.length > 0 ? ['All Countries', ...countries] : ['All Countries'];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      <Chip id="region" label="Region" value={region} openId={openId} toggle={toggle} close={close}
        options={REGIONS} onSelect={onRegionChange} />
      <span style={{ color: 'rgb(var(--ink) / .15)', fontSize: 11 }}>›</span>
      <Chip id="country" label="Country" value={country} openId={openId} toggle={toggle} close={close}
        options={countryOpts} onSelect={onCountryChange} />
      <span style={{ color: 'rgb(var(--ink) / .15)', fontSize: 11 }}>›</span>
      <Chip id="industry" label="Industry" value={industry} openId={openId} toggle={toggle} close={close}
        options={INDUSTRIES} onSelect={onIndustryChange} />
    </div>
  );
}

/* ═══════════════════════════════════════
   CHIP — label + value + spinner
   ═══════════════════════════════════════ */
function Chip({ id, label, value, openId, toggle, close, options, onSelect }: {
  id: string; label: string; value: string;
  openId: string | null; toggle: (id: string) => void; close: () => void;
  options: string[]; onSelect: (v: string) => void;
}) {
  const isOpen = openId === id;
  const chipRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside this chip
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (chipRef.current && !chipRef.current.contains(e.target as Node)) close();
    };
    // Small delay so the toggle click doesn't immediately close
    const t = setTimeout(() => window.addEventListener('click', handler, true), 50);
    return () => { clearTimeout(t); window.removeEventListener('click', handler, true); };
  }, [isOpen, close]);

  return (
    <div ref={chipRef} style={{ position: 'relative' }}>
      <button
        onClick={() => toggle(id)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px',
          background: isOpen ? 'rgba(161,0,255,.08)' : 'transparent',
          border: 'none', cursor: 'pointer', transition: 'all .2s',
          borderBottom: isOpen ? '2px solid #A100FF' : '2px solid transparent',
        }}
      >
        <span style={{ fontSize: 7, fontWeight: 800, letterSpacing: '.1em', color: 'rgb(var(--ink) / .35)', textTransform: 'uppercase' }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 900, color: isOpen ? '#A100FF' : 'var(--t1)', letterSpacing: '-.01em', transition: 'color .15s' }}>{value}</span>
        <span style={{ fontSize: 6, color: isOpen ? '#A100FF' : 'rgb(var(--ink) / .15)', transition: 'transform .2s', transform: isOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <Spinner options={options} current={value} onPick={(v) => { onSelect(v); close(); }} />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════
   SPINNER — slot machine reel
   ═══════════════════════════════════════ */
function Spinner({ options, current, onPick }: {
  options: string[]; current: string; onPick: (v: string) => void;
}) {
  const startIdx = Math.max(0, options.findIndex(o => o === current));
  const [idx, setIdx] = useState(startIdx);
  const elRef = useRef<HTMLDivElement>(null);

  const clamp = useCallback((v: number) => Math.max(0, Math.min(options.length - 1, v)), [options.length]);

  // Wheel handler — must use native event to call preventDefault
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIdx(prev => {
        const next = prev + (e.deltaY > 0 ? 1 : -1);
        return Math.max(0, Math.min(options.length - 1, next));
      });
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [options.length]);

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') { e.preventDefault(); setIdx(i => clamp(i - 1)); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => clamp(i + 1)); }
      else if (e.key === 'Enter') onPick(options[idx]);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [idx, options, onPick, clamp]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: .12 }}
      ref={elRef}
      style={{
        position: 'absolute', top: 'calc(100% + 2px)', left: 0, zIndex: 200,
        width: 220, height: ITEM_H * VIS,
        background: 'var(--panel)', backdropFilter: 'blur(12px)', boxShadow: '0 8px 32px rgb(var(--ink) / .15)',
        borderLeft: '2px solid #A100FF',
        overflow: 'hidden',
      }}
    >
      {/* Fade masks */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: ITEM_H * 1.5, background: 'linear-gradient(to bottom, var(--panel), transparent)', pointerEvents: 'none', zIndex: 3 }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: ITEM_H * 1.5, background: 'linear-gradient(to top, var(--panel), transparent)', pointerEvents: 'none', zIndex: 3 }} />

      {/* Center band */}
      <div style={{ position: 'absolute', top: ITEM_H * HALF, left: 0, right: 0, height: ITEM_H, borderTop: '1px solid rgba(161,0,255,.15)', borderBottom: '1px solid rgba(161,0,255,.15)', background: 'rgba(161,0,255,.04)', pointerEvents: 'none', zIndex: 1 }} />

      {/* Reel */}
      <div style={{ transform: `translateY(${(HALF - idx) * ITEM_H}px)`, transition: 'transform .3s cubic-bezier(.16,1,.3,1)' }}>
        {options.map((opt, i) => {
          const dist = i - idx;
          const ad = Math.abs(dist);
          const isCenter = ad === 0;

          return (
            <div key={opt}
              onClick={(e) => {
                e.stopPropagation();
                if (isCenter) { onPick(opt); }
                else { setIdx(i); }
              }}
              style={{
                height: ITEM_H,
                display: 'flex', alignItems: 'center', padding: '0 14px',
                cursor: 'pointer',
                opacity: isCenter ? 1 : ad === 1 ? .4 : ad === 2 ? .12 : .04,
                transform: `scale(${isCenter ? 1 : ad === 1 ? .88 : .75}) rotateX(${dist * -5}deg)`,
                transition: 'all .3s cubic-bezier(.16,1,.3,1)',
                transformOrigin: 'left center',
              }}
            >
              <span style={{
                fontSize: isCenter ? 12 : 10,
                fontWeight: isCenter ? 900 : 500,
                color: isCenter ? '#A100FF' : 'rgb(var(--ink) / .4)',
                letterSpacing: isCenter ? '-.01em' : '0',
                whiteSpace: 'nowrap',
              }}>{opt}</span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
