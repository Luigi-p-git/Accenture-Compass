'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import {
  Landmark, ShoppingBag, FlaskConical, Radio, Zap,
  HeartPulse, Cpu, Factory, ShieldCheck, Dna,
  Building2, Layers, PlugZap, Globe,
  ChevronUp, ChevronDown,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface IndustryOption {
  key: string;
  label: string;
  Icon: LucideIcon;
}

const OPTIONS: IndustryOption[] = [
  { key: 'all', label: 'All Industries', Icon: Globe },
  { key: 'banking-capital-markets', label: 'Banking & Cap Mkts', Icon: Landmark },
  { key: 'cgs-retail-travel', label: 'CG&S, Retail, Travel', Icon: ShoppingBag },
  { key: 'chemicals-natural-resources', label: 'Chem & Nat Resources', Icon: FlaskConical },
  { key: 'communications-media', label: 'Comms & Media', Icon: Radio },
  { key: 'energy', label: 'Energy', Icon: Zap },
  { key: 'health', label: 'Health', Icon: HeartPulse },
  { key: 'high-tech', label: 'High Tech', Icon: Cpu },
  { key: 'industrials', label: 'Industrials', Icon: Factory },
  { key: 'insurance', label: 'Insurance', Icon: ShieldCheck },
  { key: 'life-sciences', label: 'Life Sciences', Icon: Dna },
  { key: 'public-service', label: 'Public Service', Icon: Building2 },
  { key: 'software-platforms', label: 'Software & Platforms', Icon: Layers },
  { key: 'utilities', label: 'Utilities', Icon: PlugZap },
];

const ITEM_H = 36;
const VISIBLE = 5;
const HALF = Math.floor(VISIBLE / 2);

export default function DrumPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(() => Math.max(0, OPTIONS.findIndex(o => o.key === value)));
  const drumRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartIdx = useRef(0);
  const velocity = useRef(0);
  const lastY = useRef(0);
  const lastTime = useRef(0);
  const rafRef = useRef<number>(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedOption = OPTIONS[idx];

  const clamp = (v: number) => Math.max(0, Math.min(OPTIONS.length - 1, v));

  const snapTo = useCallback((target: number) => {
    const clamped = clamp(target);
    setIdx(clamped);
    onChange(OPTIONS[clamped].key);
  }, [onChange]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Keyboard nav
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') { e.preventDefault(); snapTo(idx - 1); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); snapTo(idx + 1); }
      else if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); setOpen(false); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, idx, snapTo]);

  // Drag handlers for the drum
  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    dragStartY.current = e.clientY;
    dragStartIdx.current = idx;
    velocity.current = 0;
    lastY.current = e.clientY;
    lastTime.current = Date.now();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    cancelAnimationFrame(rafRef.current);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const now = Date.now();
    const dt = now - lastTime.current;
    if (dt > 0) {
      velocity.current = (lastY.current - e.clientY) / dt;
    }
    lastY.current = e.clientY;
    lastTime.current = now;

    const delta = dragStartY.current - e.clientY;
    const idxDelta = Math.round(delta / ITEM_H);
    const newIdx = clamp(dragStartIdx.current + idxDelta);
    if (newIdx !== idx) {
      setIdx(newIdx);
      onChange(OPTIONS[newIdx].key);
    }
  };

  const onPointerUp = () => {
    if (!dragging.current) return;
    dragging.current = false;

    // Momentum flick
    const v = velocity.current;
    if (Math.abs(v) > 0.3) {
      const flick = Math.round(v * 150 / ITEM_H);
      snapTo(idx + clamp(idx + flick) - idx);
      // Animate momentum
      let currentIdx = idx;
      const target = clamp(idx + flick);
      const step = () => {
        const diff = target - currentIdx;
        if (Math.abs(diff) < 0.5) {
          snapTo(target);
          return;
        }
        currentIdx += diff * 0.2;
        snapTo(Math.round(currentIdx));
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    }
  };

  // Wheel scroll
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const dir = e.deltaY > 0 ? 1 : -1;
    snapTo(idx + dir);
  };

  const SelectedIcon = selectedOption.Icon;

  return (
    <div ref={wrapperRef} style={{ position: 'relative', userSelect: 'none' }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 12px', borderRadius: 8,
          border: '1px solid',
          borderColor: open ? 'rgba(161,0,255,.3)' : 'var(--s2)',
          background: open ? 'rgba(161,0,255,.08)' : 'var(--s1)',
          color: '#fff', cursor: 'pointer',
          transition: 'all .25s cubic-bezier(.16,1,.3,1)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <SelectedIcon size={14} strokeWidth={1.5} style={{ color: 'var(--p)', opacity: .8 }} />
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.01em', minWidth: 148, textAlign: 'left' }}>
          {selectedOption.label}
        </span>
        <ChevronDown
          size={12}
          strokeWidth={2}
          style={{
            color: 'var(--t3)', marginLeft: 2,
            transform: open ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform .25s',
          }}
        />
      </button>

      {/* Drum overlay */}
      {open && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            width: 240,
            background: 'rgba(12,12,12,.96)',
            border: '1px solid rgba(161,0,255,.15)',
            borderRadius: 14,
            backdropFilter: 'blur(24px)',
            overflow: 'hidden',
            animation: 'drumOpen .25s cubic-bezier(.16,1,.3,1)',
          }}
        >
          {/* Up arrow */}
          <button
            onClick={() => snapTo(idx - 1)}
            style={{
              width: '100%', padding: '6px 0', border: 'none', background: 'transparent',
              cursor: idx > 0 ? 'pointer' : 'default', display: 'grid', placeItems: 'center',
              opacity: idx > 0 ? .4 : .1, transition: 'opacity .2s',
            }}
          >
            <ChevronUp size={14} color="#fff" />
          </button>

          {/* Drum viewport */}
          <div
            ref={drumRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onWheel={onWheel}
            style={{
              height: ITEM_H * VISIBLE,
              position: 'relative',
              cursor: 'grab',
              overflow: 'hidden',
              touchAction: 'none',
            }}
          >
            {/* Selection highlight band */}
            <div style={{
              position: 'absolute',
              top: ITEM_H * HALF,
              left: 8, right: 8,
              height: ITEM_H,
              background: 'rgba(161,0,255,.1)',
              border: '1px solid rgba(161,0,255,.2)',
              borderRadius: 8,
              pointerEvents: 'none',
              zIndex: 1,
            }} />

            {/* Top/bottom fade masks */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: ITEM_H * 1.5,
              background: 'linear-gradient(to bottom, rgba(12,12,12,.95), transparent)',
              pointerEvents: 'none', zIndex: 2,
            }} />
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: ITEM_H * 1.5,
              background: 'linear-gradient(to top, rgba(12,12,12,.95), transparent)',
              pointerEvents: 'none', zIndex: 2,
            }} />

            {/* Items */}
            <div style={{
              transform: `translateY(${(HALF - idx) * ITEM_H}px)`,
              transition: dragging.current ? 'none' : 'transform .35s cubic-bezier(.16,1,.3,1)',
            }}>
              {OPTIONS.map((opt, i) => {
                const dist = i - idx;
                const absDist = Math.abs(dist);
                const scale = absDist === 0 ? 1 : absDist === 1 ? 0.88 : 0.76;
                const opacity = absDist === 0 ? 1 : absDist === 1 ? 0.5 : 0.2;
                const Icon = opt.Icon;

                return (
                  <div
                    key={opt.key}
                    onClick={() => { snapTo(i); setOpen(false); }}
                    style={{
                      height: ITEM_H,
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '0 16px',
                      transform: `scale(${scale}) rotateX(${dist * -8}deg)`,
                      opacity,
                      transition: dragging.current ? 'none' : 'all .35s cubic-bezier(.16,1,.3,1)',
                      cursor: 'pointer',
                      transformOrigin: 'center',
                      perspective: 400,
                    }}
                  >
                    <Icon
                      size={15}
                      strokeWidth={1.5}
                      style={{
                        color: absDist === 0 ? 'var(--p)' : 'var(--t3)',
                        transition: 'color .3s',
                        flexShrink: 0,
                      }}
                    />
                    <span style={{
                      fontSize: absDist === 0 ? 12 : 11,
                      fontWeight: absDist === 0 ? 800 : 500,
                      color: absDist === 0 ? '#fff' : 'var(--t3)',
                      transition: 'all .3s',
                      letterSpacing: absDist === 0 ? '.02em' : '.01em',
                    }}>
                      {opt.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Down arrow */}
          <button
            onClick={() => snapTo(idx + 1)}
            style={{
              width: '100%', padding: '6px 0', border: 'none', background: 'transparent',
              cursor: idx < OPTIONS.length - 1 ? 'pointer' : 'default', display: 'grid', placeItems: 'center',
              opacity: idx < OPTIONS.length - 1 ? .4 : .1, transition: 'opacity .2s',
            }}
          >
            <ChevronDown size={14} color="#fff" />
          </button>
        </div>
      )}
    </div>
  );
}
