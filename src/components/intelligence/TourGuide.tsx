'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCompassStore } from '@/lib/store';

const ease = [0.4, 0, 0.2, 1] as const;

export interface TourAction {
  type: 'openTrend' | 'openCompany' | 'closeAll' | 'setTrend';
  index?: number;
}

interface TourStep {
  target: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  accent: string;
  action?: TourAction;      // fires when step becomes active
  cleanAction?: TourAction;  // fires when leaving this step
}

const STEPS: TourStep[] = [
  {
    target: 'header',
    title: 'Command Center',
    subtitle: 'Your navigation starts here',
    description: 'Use the cascading selectors to switch Region → Country → Industry. The section links in the nav jump to any part of the magazine.',
    icon: 'navigation', accent: '#A100FF',
  },
  {
    target: '#sec-0',
    title: 'Emerging Trends',
    subtitle: 'Hover to preview, click to deep-dive',
    description: 'Master-detail layout: hover a trend title on the left to see its full analysis on the right. Click a trend to open the detail panel with description, source links, and company chips.',
    icon: 'trending_up', accent: '#A100FF',
    action: { type: 'setTrend', index: 0 },
  },
  {
    target: '[data-tour="detail-panel"]',
    title: 'The Detail Panel',
    subtitle: 'Click any trend to see this',
    description: 'Slides in showing the full analysis, source org, and company chips. Each chip shows impact — click one to jump to that company\'s dossier.',
    icon: 'open_in_new', accent: '#A100FF',
    action: { type: 'openTrend', index: 0 },
    cleanAction: { type: 'closeAll' },
  },
  {
    target: '#sec-1',
    title: 'Broker Analysis',
    subtitle: 'What the analysts are saying',
    description: 'Paginated analyst reports with page-turn controls. Each article shows the source organization and analyst quotes when available.',
    icon: 'analytics', accent: '#60a5fa',
  },
  {
    target: '#sec-2',
    title: 'Strategic Opportunities',
    subtitle: 'Where to place your bets',
    description: 'Scroll horizontally to browse opportunities. Click any card for the full breakdown — timeline, potential, and which companies are best positioned.',
    icon: 'lightbulb', accent: '#34d399',
  },
  {
    target: '#sec-3',
    title: 'Data Visualizations',
    subtitle: 'Interactive charts from the data',
    description: 'Click company bars to open dossiers. The heatmap shows company-to-finding connections — hover for titles, click for full detail with descriptions and source links.',
    icon: 'insert_chart', accent: '#fbbf24',
  },
  {
    target: '#sec-4',
    title: 'Key Challenges',
    subtitle: 'Risks sorted by severity',
    description: 'Same master-detail as Trends. Auto-sorted from Critical to Low based on how many companies each challenge affects. More exposure = higher severity.',
    icon: 'warning', accent: '#f87171',
  },
  {
    target: '#sec-5',
    title: 'Companies Intelligence',
    subtitle: 'Click any row to open',
    description: 'Each company row shows linked finding counts. Click to open the full dossier panel.',
    icon: 'domain', accent: '#60a5fa',
  },
  {
    target: '[data-tour="company-panel"]',
    title: 'Company Dossier',
    subtitle: 'The full intelligence file',
    description: 'Revenue, investments, impact bar (hover for details), and every linked finding — all clickable and cross-referenced.',
    icon: 'badge', accent: '#60a5fa',
    action: { type: 'openCompany', index: 0 },
    cleanAction: { type: 'closeAll' },
  },
  {
    target: '[data-tour="robin"]',
    title: 'Robin AI',
    subtitle: 'Ask anything about the data',
    description: 'Click the blue button to chat. Use the small red target above it to point at any element and ask Robin about it. "?" buttons throughout the magazine pre-load Robin with that specific context.',
    icon: 'smart_toy', accent: '#3b82f6',
  },
];

function clampRect(r: DOMRect, maxH: number): { top: number; left: number; width: number; height: number } {
  return { top: r.top, left: r.left, width: r.width, height: Math.min(r.height, maxH) };
}

interface Props {
  onClose: () => void;
  scrollContainer: React.RefObject<HTMLDivElement | null>;
  onAction?: (action: TourAction) => void;
}

export default function TourGuide({ onClose, scrollContainer, onAction }: Props) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const light = useCompassStore(s => s.theme) === 'light';
  const a = (o: number) => `rgb(var(--ink) / ${o})`;
  const rafRef = useRef<number>(0);
  const prevStep = useRef(-1);
  const onActionRef = useRef(onAction);
  onActionRef.current = onAction;
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  // Measure target
  const measure = useCallback(() => {
    const el = document.querySelector(STEPS[step].target) as HTMLElement | null;
    if (el) {
      const r = el.getBoundingClientRect();
      const isFixed = getComputedStyle(el).position === 'fixed';
      const isPanel = STEPS[step].target.includes('data-tour');
      const maxH = (isFixed || isPanel) ? Math.min(r.height, window.innerHeight - 80) : step === 0 ? 200 : 260;
      setRect(clampRect(r, maxH));
    }
  }, [step]);

  // Main step orchestrator: clean up prev → fire action → scroll → measure
  // Only depends on `step` — uses refs for callbacks to avoid loops
  useEffect(() => {
    setReady(false);

    // Clean up previous step
    if (prevStep.current >= 0 && prevStep.current !== step) {
      const prev = STEPS[prevStep.current];
      if (prev.cleanAction) onActionRef.current?.(prev.cleanAction);
    }
    prevStep.current = step;

    const cur = STEPS[step];
    const hasAction = !!cur.action;
    const isPanel = cur.target.includes('data-tour');

    // Fire action (opens panel)
    if (hasAction) onActionRef.current?.(cur.action!);

    // Retry until target element appears (panels animate in)
    let retries = 0;
    let cancelled = false;

    const tryMeasure = () => {
      if (cancelled) return;
      const el = document.querySelector(cur.target) as HTMLElement | null;
      if (!el && retries < 10) {
        retries++;
        setTimeout(tryMeasure, 150);
        return;
      }
      if (!el || cancelled) return;

      const container = scrollContainer.current;
      const isFixed = getComputedStyle(el).position === 'fixed' || isPanel;

      if (isFixed) {
        measure();
        if (!cancelled) setReady(true);
        return;
      }

      // Scroll into view, then detect scroll-end to measure
      if (container) {
        const containerRect = container.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const elTopRelative = elRect.top - containerRect.top + container.scrollTop;
        const target = Math.max(0, elTopRelative - container.clientHeight * 0.2);
        container.scrollTo({ top: target, behavior: 'smooth' });

        // Wait for scroll to fully settle by watching for idle
        let scrollTimer: ReturnType<typeof setTimeout>;
        const onScroll = () => {
          clearTimeout(scrollTimer);
          scrollTimer = setTimeout(() => {
            container.removeEventListener('scroll', onScroll);
            if (!cancelled) { measure(); setReady(true); }
          }, 80); // 80ms idle = scroll done
        };
        container.addEventListener('scroll', onScroll, { passive: true });
        // Fallback if scroll is tiny / already at position
        scrollTimer = setTimeout(() => {
          container.removeEventListener('scroll', onScroll);
          if (!cancelled) { measure(); setReady(true); }
        }, 800);
      }
    };

    const timer = setTimeout(tryMeasure, hasAction ? 400 : 50);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [step, measure, scrollContainer]); // eslint-disable-line react-hooks/exhaustive-deps

  // Resize
  useEffect(() => {
    const recalc = () => { cancelAnimationFrame(rafRef.current); rafRef.current = requestAnimationFrame(measure); };
    window.addEventListener('resize', recalc);
    return () => { window.removeEventListener('resize', recalc); cancelAnimationFrame(rafRef.current); };
  }, [measure]);

  // Entrance
  useEffect(() => { const t = setTimeout(() => setVisible(true), 80); return () => clearTimeout(t); }, []);

  // Keyboard
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') completeTour();
      else if (e.key === 'ArrowRight' || e.key === 'Enter') { if (!isLast) setStep(s => s + 1); else completeTour(); }
      else if (e.key === 'ArrowLeft') { if (step > 0) setStep(s => s - 1); }
    };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  });

  const completeTour = () => {
    if (current.cleanAction) onActionRef.current?.(current.cleanAction);
    localStorage.setItem('compass_tour_complete', 'true');
    setVisible(false);
    setTimeout(onClose, 200);
  };

  const pad = 10;

  // Smart position: pick the side with more space, never overlap the spotlight
  const getTooltipStyle = (): React.CSSProperties => {
    if (!rect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    const tipW = 300;
    const tipH = 260;
    const gap = 14;

    const spaceBelow = window.innerHeight - (rect.top + rect.height + pad + gap);
    const spaceAbove = rect.top - pad - gap;
    const spaceRight = window.innerWidth - (rect.left + rect.width + pad + gap);

    let top: number;
    let left: number;

    if (spaceBelow >= tipH) {
      top = rect.top + rect.height + pad + gap;
      left = Math.max(16, Math.min(rect.left, window.innerWidth - tipW - 16));
    } else if (spaceAbove >= tipH) {
      top = rect.top - pad - gap - tipH;
      left = Math.max(16, Math.min(rect.left, window.innerWidth - tipW - 16));
    } else if (spaceRight >= tipW + 20) {
      top = Math.max(16, Math.min(rect.top, window.innerHeight - tipH - 16));
      left = rect.left + rect.width + pad + gap;
    } else {
      top = Math.max(16, Math.min(rect.top, window.innerHeight - tipH - 16));
      left = Math.max(16, rect.left - tipW - pad - gap);
    }

    return { position: 'fixed' as const, top, left, width: tipW };
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: visible ? 1 : 0 }} transition={{ duration: .3 }}
      style={{ position: 'fixed', inset: 0, zIndex: 400 }}
    >
      {/* SVG backdrop */}
      <svg style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 400 }}>
        <defs>
          <mask id="tour-spot">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {rect && (
              <motion.rect
                animate={{ x: rect.left - pad, y: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }}
                transition={{ duration: .4, ease: [0.22, 1, 0.36, 1] }}
                rx="5" fill="black"
              />
            )}
          </mask>
          <filter id="t-glow"><feGaussianBlur stdDeviation="5" result="b" /><feComposite in="SourceGraphic" in2="b" operator="over" /></filter>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill={light ? 'rgba(0,0,0,.5)' : 'rgba(0,0,0,.6)'} mask="url(#tour-spot)" />
        {rect && (
          <>
            <motion.rect
              animate={{ x: rect.left - pad - 1, y: rect.top - pad - 1, width: rect.width + pad * 2 + 2, height: rect.height + pad * 2 + 2 }}
              transition={{ duration: .4, ease: [0.22, 1, 0.36, 1] }}
              rx="6" fill="none" stroke={current.accent} strokeWidth="1.5" strokeOpacity=".45" filter="url(#t-glow)"
            />
            <motion.rect
              animate={{
                x: rect.left - pad - 4, y: rect.top - pad - 4,
                width: rect.width + pad * 2 + 8, height: rect.height + pad * 2 + 8,
                strokeOpacity: [.08, .25, .08],
              }}
              transition={{
                x: { duration: .4, ease: [0.22, 1, 0.36, 1] }, y: { duration: .4, ease: [0.22, 1, 0.36, 1] },
                width: { duration: .4, ease: [0.22, 1, 0.36, 1] }, height: { duration: .4, ease: [0.22, 1, 0.36, 1] },
                strokeOpacity: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' },
              }}
              rx="8" fill="none" stroke={current.accent} strokeWidth="1"
            />
          </>
        )}
      </svg>

      {/* Click blocker */}
      <div onClick={completeTour} style={{ position: 'fixed', inset: 0, zIndex: 401 }} />

      {/* Compact tooltip */}
      <AnimatePresence mode="wait">
        {rect && ready && (
          <motion.div
            key={step}
            initial={{ opacity: 0, y: -8, scale: .97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: .98 }}
            transition={{ duration: .25, ease }}
            style={{ ...getTooltipStyle(), fontFamily: "'Inter',system-ui,sans-serif", pointerEvents: 'auto', zIndex: 402 }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              background: light ? 'rgba(255,255,255,.93)' : 'rgba(8,8,10,.9)',
              backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
              borderLeft: `2px solid ${current.accent}`,
              boxShadow: `0 16px 40px rgba(0,0,0,.4), 0 0 0 1px ${a(.05)}`,
              overflow: 'hidden', position: 'relative',
            }}>
              {/* Top line */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, ${current.accent}80, transparent)` }} />

              {/* Watermark */}
              <div style={{ position: 'absolute', top: -4, right: 10, fontSize: 56, fontWeight: 900, lineHeight: .85, color: a(.018), pointerEvents: 'none' }}>
                {String(step + 1).padStart(2, '0')}
              </div>

              <div style={{ padding: '14px 18px 12px', position: 'relative' }}>
                {/* Icon + step */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <div style={{ width: 22, height: 22, background: `${current.accent}12`, border: `1px solid ${current.accent}20`, borderRadius: 4, display: 'grid', placeItems: 'center' }}>
                    <span className="ms" style={{ fontSize: 12, color: current.accent }}>{current.icon}</span>
                  </div>
                  <span style={{ fontSize: 6, fontWeight: 900, letterSpacing: '.15em', color: current.accent, textTransform: 'uppercase' }}>Step {step + 1} / {STEPS.length}</span>
                </div>

                <h3 style={{ fontSize: 14, fontWeight: 900, letterSpacing: '-.02em', lineHeight: 1.1, margin: '0 0 2px', color: a(.88) }}>{current.title}</h3>
                <div style={{ fontSize: 7, fontWeight: 700, color: current.accent, opacity: .6, marginBottom: 6 }}>{current.subtitle}</div>
                <p style={{ fontSize: 9, lineHeight: 1.65, color: a(.38), margin: '0 0 10px' }}>{current.description}</p>

                {/* Progress */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ flex: 1, height: 1.5, background: a(.04), overflow: 'hidden', borderRadius: 1 }}>
                    <motion.div
                      animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
                      transition={{ duration: .4, ease: [0.22, 1, 0.36, 1] }}
                      style={{ height: '100%', background: current.accent, borderRadius: 1 }}
                    />
                  </div>
                  <span style={{ fontSize: 7, fontWeight: 800, color: a(.15), fontVariantNumeric: 'tabular-nums' }}>{step + 1}/{STEPS.length}</span>
                </div>

                {/* Nav */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {step > 0 && (
                    <button onClick={() => setStep(s => s - 1)} style={{
                      padding: '5px 10px', border: `1px solid ${a(.08)}`, background: 'transparent',
                      color: a(.35), fontSize: 8, fontWeight: 800, cursor: 'pointer', transition: 'all .15s',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = a(.2); e.currentTarget.style.color = a(.6); }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = a(.08); e.currentTarget.style.color = a(.35); }}
                    >←</button>
                  )}
                  <div style={{ flex: 1 }} />
                  <button onClick={completeTour} style={{ padding: '5px 10px', border: 'none', background: 'transparent', color: a(.15), fontSize: 7, fontWeight: 700, cursor: 'pointer' }}>Skip</button>
                  <button onClick={isLast ? completeTour : () => setStep(s => s + 1)} style={{
                    padding: '5px 14px', border: 'none', background: current.accent, color: '#fff',
                    fontSize: 8, fontWeight: 800, cursor: 'pointer', boxShadow: `0 2px 8px ${current.accent}30`,
                  }}>
                    {isLast ? 'Done' : 'Next →'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
