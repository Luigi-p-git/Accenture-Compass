'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCompassStore } from '@/lib/store';

const ease = [0.4, 0, 0.2, 1] as const;

interface FAQItem {
  q: string;
  a: string[];  // paragraphs
  icon: string;
  accent: string;
  tag: string;
}

const FAQS: FAQItem[] = [
  {
    q: 'What is Accenture Compass?',
    a: [
      'A strategic intelligence platform that transforms analyst research into interactive, actionable insights.',
      'It combines a world-map dashboard for regional analysis with AccSense Magazine — an editorial intelligence report. Data flows from AlphaSense through an AI pipeline that cross-references findings with companies and surfaces patterns automatically.',
    ],
    icon: 'explore', accent: '#A100FF', tag: 'Platform',
  },
  {
    q: 'What is AccSense Magazine?',
    a: [
      'An editorial-format intelligence report with seven interactive sections, each serving a distinct analytical purpose.',
      'Trends → directional shifts. Broker Analysis → analyst perspectives. Opportunities → actionable items. Data Viz → quantified landscape. Challenges → severity-ranked risks. Companies → interconnected player intelligence.',
    ],
    icon: 'auto_stories', accent: '#60a5fa', tag: 'Product',
  },
  {
    q: 'How does the cross-reference system work?',
    a: [
      'Every finding is automatically linked to the companies it mentions using fuzzy name matching. Each link carries an impact tag: positive, negative, or neutral.',
      'The Impact Summary bar in each company panel aggregates these. Hover over a segment to see exactly which findings drive each classification. Click any company chip on a finding to jump to that company\'s full dossier.',
    ],
    icon: 'hub', accent: '#fbbf24', tag: 'System',
  },
  {
    q: 'How does Robin AI work?',
    a: [
      'Robin is a context-aware assistant powered by Claude. It receives the full intelligence context for whatever you\'re looking at.',
      'Use "Ask Robin" buttons (?) on companies, trends, and charts to pre-load context. Or use the red target button to point at any element and ask about it. Robin gives specific, data-backed answers — not generic responses.',
    ],
    icon: 'smart_toy', accent: '#3b82f6', tag: 'AI',
  },
  {
    q: 'How is data sourced?',
    a: [
      'Intelligence flows through five stages: AlphaSense research gathering → structured prompt extraction → tri-mode parsing → cross-linking → PDF citation matching.',
      'The result: every finding has linked companies, source URLs, and analyst quotes. No manual data entry — the pipeline handles structure, relationships, and verification.',
    ],
    icon: 'database', accent: '#34d399', tag: 'Pipeline',
  },
  {
    q: 'What do severity levels mean?',
    a: [
      'Severity is computed from company exposure count. Critical (4+ companies) = sector-wide disruption. High (3) = significant multi-company risk. Medium (2) = contained threat. Low (0-1) = emerging concern.',
      'Same logic applies to opportunity priority — more linked companies means higher strategic importance.',
    ],
    icon: 'warning', accent: '#f87171', tag: 'Methodology',
  },
];

export default function FAQModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [active, setActive] = useState<number | null>(null);
  const light = useCompassStore(s => s.theme) === 'light';
  const a = (o: number) => `rgb(var(--ink) / ${o})`;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: .2 }}
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 250,
            background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            overflowY: 'auto', padding: '48px 20px',
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: .3, ease }}
            onClick={e => e.stopPropagation()}
            style={{
              width: 520, fontFamily: "'Inter',system-ui,sans-serif",
              background: light ? 'rgba(255,255,255,.95)' : 'rgba(10,10,12,.92)',
              backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              boxShadow: `0 24px 64px rgba(0,0,0,.4), 0 0 0 1px ${a(.05)}`,
              position: 'relative', overflow: 'hidden',
            }}
          >
            {/* Top accent */}
            <div style={{ height: 2, background: `linear-gradient(90deg, #A100FF, #60a5fa, #34d399, transparent)` }} />

            {/* Header — compact */}
            <div style={{ padding: '20px 24px 16px', position: 'relative' }}>
              <button onClick={onClose} style={{
                position: 'absolute', top: 12, right: 12,
                width: 24, height: 24, borderRadius: 4,
                background: a(.03), border: 'none', color: a(.25),
                cursor: 'pointer', display: 'grid', placeItems: 'center',
                fontSize: 11, transition: 'all .15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = a(.06); e.currentTarget.style.color = a(.5); }}
                onMouseLeave={e => { e.currentTarget.style.background = a(.03); e.currentTarget.style.color = a(.25); }}
              >✕</button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span className="ms" style={{ fontSize: 16, color: '#A100FF' }}>help</span>
                <span style={{ fontSize: 6, fontWeight: 900, letterSpacing: '.2em', color: '#A100FF', textTransform: 'uppercase' }}>Intelligence Guide</span>
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-.03em', color: a(.88), margin: 0 }}>FAQ</h2>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: a(.06), margin: '0 24px' }} />

            {/* Questions */}
            <div style={{ padding: '8px 0' }}>
              {FAQS.map((item, i) => {
                const isOpen = active === i;
                return (
                  <div key={i}>
                    <button
                      onClick={() => setActive(isOpen ? null : i)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '12px 24px', background: 'transparent', border: 'none',
                        textAlign: 'left', cursor: 'pointer', transition: 'background .15s',
                        color: a(.8),
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = a(.015); }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span className="ms" style={{
                        fontSize: 14, color: item.accent, flexShrink: 0,
                        opacity: isOpen ? 1 : .3, transition: 'opacity .2s',
                      }}>{item.icon}</span>
                      <span style={{ flex: 1, fontSize: 11, fontWeight: 800, letterSpacing: '-.01em', lineHeight: 1.3 }}>{item.q}</span>
                      <span style={{
                        fontSize: 6, fontWeight: 800, letterSpacing: '.08em',
                        color: item.accent, opacity: .4, textTransform: 'uppercase', flexShrink: 0,
                      }}>{item.tag}</span>
                      <motion.span
                        animate={{ rotate: isOpen ? 45 : 0 }}
                        transition={{ duration: .15 }}
                        style={{ fontSize: 12, color: a(.15), flexShrink: 0 }}
                      >+</motion.span>
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: .2, ease }}
                          style={{ overflow: 'hidden' }}
                        >
                          <div style={{ padding: '2px 24px 14px 48px' }}>
                            {item.a.map((para, pi) => (
                              <p key={pi} style={{
                                fontSize: 9, lineHeight: 1.7, color: a(.4),
                                margin: pi === 0 ? 0 : '6px 0 0',
                                borderLeft: pi === 0 ? `2px solid ${item.accent}40` : 'none',
                                paddingLeft: pi === 0 ? 10 : 0,
                              }}>{para}</p>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {i < FAQS.length - 1 && <div style={{ height: 1, background: a(.03), margin: '0 24px 0 48px' }} />}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div style={{ padding: '12px 24px', borderTop: `1px solid ${a(.04)}` }}>
              <div style={{ fontSize: 7, color: a(.15), textAlign: 'center' }}>
                Use the <span style={{ color: '#A100FF', fontWeight: 800 }}>tour</span> button for an interactive walkthrough
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
