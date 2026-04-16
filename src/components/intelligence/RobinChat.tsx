'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TrendsData } from '@/types';

interface Message {
  role: 'user' | 'robin';
  text: string;
}

export interface RobinFocus {
  type: 'company' | 'trend' | 'opportunity' | 'challenge' | 'general' | 'element';
  label: string;
  detail?: string;
  selector?: string;
  sectionContext?: string;
}

function RobinMask({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.55} viewBox="0 0 48 26" fill="none">
      <path d="M1 14C1 8 5.5 3 12.5 3C17 3 20.5 5.5 23 9L24 11L25 9C27.5 5.5 31 3 35.5 3C42.5 3 47 8 47 14C47 19 43 23 38 23C34 23 30 20 27 16L24 12L21 16C18 20 14 23 10 23C5 23 1 19 1 14Z" fill="#60a5fa" />
      <ellipse cx="13" cy="13.5" rx="5.5" ry="5" fill="#0a0a0a" />
      <ellipse cx="35" cy="13.5" rx="5.5" ry="5" fill="#0a0a0a" />
      <path d="M20 11.5C21.5 9 22.5 8.5 24 8.5C25.5 8.5 26.5 9 28 11.5" stroke="#4a8fe7" strokeWidth="1" fill="none" />
      <ellipse cx="11.5" cy="12" rx="1.5" ry="1.2" fill="rgba(255,255,255,.15)" />
      <ellipse cx="33.5" cy="12" rx="1.5" ry="1.2" fill="rgba(255,255,255,.15)" />
    </svg>
  );
}

/** Rich text renderer — bold, links, bullets, numbers, sections, data highlights */
function RichText({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div style={{ fontSize: 10, lineHeight: 1.7, color: 'rgba(255,255,255,.75)' }}>
      {lines.map((line, li) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={li} style={{ height: 6 }} />;
        if (/^[A-Z][A-Z\s&]{4,}:?$/.test(trimmed) || /^#{1,3}\s/.test(trimmed)) {
          const clean = trimmed.replace(/^#+\s*/, '').replace(/:$/, '');
          return <div key={li} style={{ fontSize: 8, fontWeight: 900, letterSpacing: '.08em', color: '#60a5fa', textTransform: 'uppercase', marginTop: li > 0 ? 8 : 0, marginBottom: 3 }}>{clean}</div>;
        }
        if (/^[-•*]\s/.test(trimmed)) {
          return (
            <div key={li} style={{ display: 'flex', gap: 8, marginLeft: 4, marginTop: 2 }}>
              <span style={{ color: '#A100FF', fontSize: 8, marginTop: 2, flexShrink: 0 }}>▸</span>
              <span>{renderInline(trimmed.replace(/^[-•*]\s+/, ''))}</span>
            </div>
          );
        }
        if (/^\d+[.)]\s/.test(trimmed)) {
          const num = trimmed.match(/^(\d+)[.)]/)?.[1];
          return (
            <div key={li} style={{ display: 'flex', gap: 8, marginLeft: 4, marginTop: 2 }}>
              <span style={{ color: '#A100FF', fontSize: 9, fontWeight: 900, width: 14, textAlign: 'right', flexShrink: 0 }}>{num}.</span>
              <span>{renderInline(trimmed.replace(/^\d+[.)]\s*/, ''))}</span>
            </div>
          );
        }
        return <div key={li} style={{ marginTop: li > 0 ? 2 : 0 }}>{renderInline(trimmed)}</div>;
      })}
    </div>
  );
}

function renderInline(text: string): React.ReactNode[] {
  // Split on **bold**, [link](url), and plain text
  const tokens = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);
  return tokens.map((tok, i) => {
    // Bold
    if (tok.startsWith('**') && tok.endsWith('**')) {
      return <strong key={i} style={{ color: '#fff', fontWeight: 800 }}>{tok.slice(2, -2)}</strong>;
    }
    // Markdown link [text](url)
    const linkMatch = tok.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return <a key={i} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', textDecoration: 'none', borderBottom: '1px solid rgba(96,165,250,.3)', fontWeight: 700, transition: 'border-color .2s' }}
        onMouseEnter={e => { e.currentTarget.style.borderBottomColor = '#60a5fa'; }}
        onMouseLeave={e => { e.currentTarget.style.borderBottomColor = 'rgba(96,165,250,.3)'; }}
      >{linkMatch[1]}</a>;
    }
    // Plain text with data highlighting
    return <span key={i} dangerouslySetInnerHTML={{
      __html: tok
        .replace(/(\$[\d,.]+[BKMTG]?(?:\s*(?:billion|million))?)/gi, '<span style="color:#34d399;font-weight:800">$1</span>')
        .replace(/((?:\+|-)\d+(?:\.\d+)?%)/g, '<span style="color:#34d399;font-weight:800">$1</span>')
        // Bare URLs
        .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:#60a5fa;text-decoration:none;border-bottom:1px solid rgba(96,165,250,.3);font-weight:600">$1</a>')
    }} />;
  });
}

function buildContext(data: TrendsData | null, focus: RobinFocus | null): string {
  if (!data) return 'No data loaded.';
  const parts: string[] = [];
  parts.push(`Subject: ${data.source?.subject || 'Unknown'}`);
  if (focus) {
    parts.push(`\nUSER IS FOCUSED ON: ${focus.type.toUpperCase()} — "${focus.label}"`);
    if (focus.type === 'company') {
      const co = data.top_companies?.find(c => c.name === focus.label);
      if (co) {
        parts.push(`Company: ${co.name} (${co.ticker || 'private'}), Sector: ${co.sector}, HQ: ${co.hq}, Revenue: ${co.revenue}`);
        parts.push(`Initiatives: ${co.key_initiatives.join('; ')}`);
        const lt = co.linked_findings.trends.map(i => data.trends?.[i]?.t).filter(Boolean);
        const lo = co.linked_findings.opportunities.map(i => data.opportunities?.[i]?.t).filter(Boolean);
        const lc = co.linked_findings.challenges.map(i => data.challenges?.[i]?.t).filter(Boolean);
        if (lt.length) parts.push(`Linked trends: ${lt.join(', ')}`);
        if (lo.length) parts.push(`Linked opportunities: ${lo.join(', ')}`);
        if (lc.length) parts.push(`Linked challenges: ${lc.join(', ')}`);
      }
    } else if (focus.type === 'trend') {
      const t = data.trends?.find(tr => tr.t === focus.label);
      if (t) parts.push(`Detail: ${t.d}`);
    } else if (focus.type === 'challenge') {
      const c = data.challenges?.find(ch => ch.t === focus.label);
      if (c) parts.push(`Detail [${c.severity}]: ${c.d}`);
    } else if (focus.type === 'opportunity') {
      const o = data.opportunities?.find(op => op.t === focus.label);
      if (o) parts.push(`Detail [${o.timeline}]: ${o.d}`);
    } else if (focus.type === 'element') {
      parts.push(`Targeted element: "${focus.label}"`);
      if (focus.sectionContext) parts.push(`Section: ${focus.sectionContext}`);
      if (focus.detail) parts.push(`Content: ${focus.detail}`);
      if (focus.selector) parts.push(`DOM: ${focus.selector}`);
    }
  }
  parts.push(`\nTotal findings: ${data.source?.total_findings || 0}`);
  if (data.trends?.length) parts.push(`\nTRENDS (${data.trends.length}):\n` + data.trends.map((t, i) => `${i + 1}. ${t.t}: ${t.d.substring(0, 150)}`).join('\n'));
  if (data.opportunities?.length) parts.push(`\nOPPORTUNITIES (${data.opportunities.length}):\n` + data.opportunities.map((o, i) => `${i + 1}. ${o.t}: ${o.d.substring(0, 150)}`).join('\n'));
  if (data.challenges?.length) parts.push(`\nCHALLENGES (${data.challenges.length}):\n` + data.challenges.map((c, i) => `${i + 1}. ${c.t} [${c.severity}]: ${c.d.substring(0, 150)}`).join('\n'));
  if (data.top_companies?.length) parts.push(`\nTOP COMPANIES:\n` + data.top_companies.map(c => `- ${c.name} (${c.ticker || 'private'}) — ${c.sector}, Rev: ${c.revenue}`).join('\n'));
  if (data.synthesis) parts.push(`\nSYNTHESIS: ${data.synthesis}`);
  return parts.join('\n');
}

function buildSuggestions(data: TrendsData | null, focus: RobinFocus | null): string[] {
  if (focus) {
    switch (focus.type) {
      case 'company': return [`What are ${focus.label}'s key initiatives?`, `How is ${focus.label} affected by challenges?`, `What opportunities for ${focus.label}?`, `Compare ${focus.label} to competitors`];
      case 'trend': return [`Explain this trend in detail`, `Which companies benefit most?`, `Investment implications?`, `How does this connect to challenges?`];
      case 'opportunity': return [`Break down the market size`, `Which companies are positioned?`, `What are the risks?`, `Timeline and investment needed?`];
      case 'challenge': return [`How severe is this really?`, `Which companies are most at risk?`, `What mitigation strategies exist?`, `Impact on investment decisions?`];
      case 'element': return [`What does this show?`, `Explain this in detail`, `How is this connected to other findings?`, `What actions should I take?`];
    }
  }
  if (!data) return ['What data is available?'];
  const s: string[] = [];
  if (data.trends?.length) s.push('Most impactful trend?');
  if (data.opportunities?.length) s.push('Highest priority opportunity?');
  if (data.challenges?.length) s.push('Summarize critical risks');
  if (data.top_companies?.length) s.push('Most exposed company?');
  if (data.synthesis) s.push('Executive summary');
  return s.slice(0, 4);
}

function buildSelector(el: HTMLElement): string {
  let s = el.tagName?.toLowerCase() || '';
  if (el.id) s += '#' + el.id;
  else if (el.className && typeof el.className === 'string') {
    const cls = el.className.trim().split(/\s+/).filter(c => !c.startsWith('__') && c.length < 30).slice(0, 2).join('.');
    if (cls) s += '.' + cls;
  }
  return s;
}

interface Conversation {
  id: number;
  label: string;
  messages: Message[];
  focus: RobinFocus | null;
}

export default function RobinChat({ data, focus, autoMessage }: { data: TrendsData | null; focus?: RobinFocus | null; autoMessage?: string | null }) {
  const [open, setOpen] = useState(false);
  const [convos, setConvos] = useState<Conversation[]>([{ id: 1, label: 'Chat 1', messages: [], focus: null }]);
  const [activeConvo, setActiveConvo] = useState(1);
  const currentConvo = convos.find(c => c.id === activeConvo) || convos[0];
  const messages = currentConvo.messages;
  const setMessages = (fn: (prev: Message[]) => Message[]) => {
    setConvos(prev => prev.map(c => c.id === activeConvo ? { ...c, messages: fn(c.messages) } : c));
  };
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastFocus, setLastFocus] = useState<RobinFocus | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const ignoreNextFocus = useRef(false);
  const lastAutoMsg = useRef<string | null>(null);

  // ── Targeting mode (element inspection) ──
  const [targeting, setTargeting] = useState(false);
  const [targetHover, setTargetHover] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const onTargetMove = useCallback((e: MouseEvent) => {
    if (overlayRef.current) overlayRef.current.style.display = 'none';
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    if (overlayRef.current) overlayRef.current.style.display = '';
    if (!el || el.closest('[data-robin-target]')) { setTargetHover(null); return; }
    const r = el.getBoundingClientRect();
    setTargetHover({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, []);

  const onTargetClick = useCallback((e: MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (overlayRef.current) overlayRef.current.style.display = 'none';
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    if (overlayRef.current) overlayRef.current.style.display = '';
    if (!el || el.closest('[data-robin-target]')) return;

    const text = (el.textContent || '').trim().slice(0, 300);
    const section = el.closest('section');
    const sectionLabel = section?.querySelector('[style*="letterSpacing"]')?.textContent
      || section?.querySelector('h2,h3')?.textContent || '';
    const selector = buildSelector(el);

    setLastFocus({
      type: 'element',
      label: text.slice(0, 60) || 'Selected Element',
      detail: text,
      selector,
      sectionContext: sectionLabel,
    });
    setTargeting(false);
    setTargetHover(null);
    setOpen(true);
  }, []);

  useEffect(() => {
    if (targeting) {
      document.addEventListener('mousemove', onTargetMove, true);
      document.addEventListener('click', onTargetClick, true);
      const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { setTargeting(false); setTargetHover(null); } };
      document.addEventListener('keydown', esc);
      return () => {
        document.removeEventListener('mousemove', onTargetMove, true);
        document.removeEventListener('click', onTargetClick, true);
        document.removeEventListener('keydown', esc);
      };
    }
  }, [targeting, onTargetMove, onTargetClick]);

  // Focus from outside — open Robin with context
  useEffect(() => {
    if (focus && !ignoreNextFocus.current && focus.label !== lastFocus?.label) {
      setLastFocus(focus);
      setOpen(true);
    }
    ignoreNextFocus.current = false;
  }, [focus]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-send message when autoMessage changes
  useEffect(() => {
    if (autoMessage && autoMessage !== lastAutoMsg.current && !loading) {
      lastAutoMsg.current = autoMessage;
      setOpen(true);
      // Small delay to let the panel open first
      const cleanMsg = autoMessage.replace(/\s*\[\d+\]$/, '');
      setTimeout(() => sendRef.current?.(cleanMsg), 100);
    }
  }, [autoMessage]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeFocus = focus || lastFocus;
  const suggestions = buildSuggestions(data, open ? activeFocus : null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const sendRef = useRef<((text: string) => void) | null>(null);
  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text }]);
    // Auto-label the tab from first message
    setConvos(prev => prev.map(c => c.id === activeConvo && c.messages.length === 0 ? { ...c, label: text.slice(0, 20) + (text.length > 20 ? '…' : '') } : c));
    setLoading(true);
    try {
      const res = await fetch('/api/robin-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, context: buildContext(data, activeFocus) }),
      });
      const d = await res.json();
      setMessages(prev => [...prev, { role: 'robin', text: d.response || d.error || 'No response' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'robin', text: 'Connection failed.' }]);
    } finally {
      setLoading(false);
    }
  }, [data, loading, activeFocus]);
  sendRef.current = send;

  const handleClose = () => {
    setOpen(false);
    setLastFocus(null);
    ignoreNextFocus.current = true;
  };

  const accentFocus = activeFocus?.type === 'trend' ? '#A100FF' : activeFocus?.type === 'opportunity' ? '#34d399' : activeFocus?.type === 'challenge' ? '#f87171' : (activeFocus?.type === 'company' || activeFocus?.type === 'element') ? '#60a5fa' : null;

  return (
    <>
      {/* Targeting cursor + hover highlight */}
      {targeting && <style>{`* { cursor: crosshair !important; }`}</style>}
      {targeting && targetHover && (
        <div ref={overlayRef} data-robin-target style={{
          position: 'fixed', zIndex: 99998, pointerEvents: 'none',
          border: '2px solid #ef4444', background: 'rgba(239,68,68,.06)', borderRadius: 3,
          transition: 'all .08s ease-out',
          top: targetHover.top, left: targetHover.left,
          width: targetHover.width, height: targetHover.height,
        }} />
      )}

      {/* Target button — tucked into top-left of Robin */}
      <motion.button
        data-robin-target
        onClick={() => { setTargeting(!targeting); if (open) setOpen(false); }}
        whileHover={{ scale: 1.12 }}
        whileTap={{ scale: 0.9 }}
        title={targeting ? 'Cancel targeting (Esc)' : 'Target an element to ask Robin about it'}
        style={{
          position: 'fixed', bottom: 138, right: 68, zIndex: 301,
          width: 20, height: 20, borderRadius: '50%',
          background: targeting ? '#ef4444' : 'rgba(239,68,68,.12)',
          border: targeting ? '1.5px solid #ef4444' : '1px solid rgba(239,68,68,.25)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: targeting ? '0 2px 8px rgba(239,68,68,.4)' : 'none',
          transition: 'all .2s',
        }}
      >
        <span className="ms" style={{ fontSize: 11, color: targeting ? '#fff' : '#ef4444' }}>my_location</span>
      </motion.button>

      {/* Floating Robin button */}
      <motion.button
        data-robin-target data-tour="robin"
        onClick={() => { if (targeting) { setTargeting(false); setTargetHover(null); } if (open) handleClose(); else setOpen(true); }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        style={{
          position: 'fixed', bottom: 90, right: 28, zIndex: 300,
          width: 56, height: 56, borderRadius: '50%',
          background: open ? 'rgba(59,130,246,.3)' : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: open ? 'none' : '0 4px 24px rgba(59,130,246,.4), 0 0 0 3px rgba(59,130,246,.15)',
        }}
      >
        {open ? (
          <span style={{ fontSize: 18, color: '#fff', fontWeight: 900, lineHeight: 1 }}>✕</span>
        ) : (
          <RobinMask size={30} />
        )}
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed', bottom: 158, right: 28, zIndex: 300,
              width: 400, height: 520,
              background: 'rgba(6,6,6,.75)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,.08)',
              overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
              fontFamily: "'Inter',system-ui,sans-serif",
              boxShadow: '0 20px 60px rgba(0,0,0,.6)',
            }}
          >
            {/* Header */}
            <div style={{ padding: '8px 16px 0', background: 'rgba(255,255,255,.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <RobinMask size={18} />
                  <span style={{ fontSize: 11, fontWeight: 900, color: '#fff', letterSpacing: '-.01em' }}>ROBIN</span>
                  <span style={{ fontSize: 6, fontWeight: 700, color: 'rgba(96,165,250,.4)', letterSpacing: '.1em' }}>INTELLIGENCE</span>
                </div>
                {activeFocus && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 5, height: 5, background: accentFocus || '#60a5fa' }} />
                    <span style={{ fontSize: 7, fontWeight: 800, color: accentFocus || '#60a5fa', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeFocus.label}</span>
                    <button onClick={() => setLastFocus(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.15)', fontSize: 9, padding: 0 }}>✕</button>
                  </div>
                )}
              </div>
              {/* Conversation tabs */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 2, borderBottom: '1px solid rgba(255,255,255,.06)', marginLeft: -16, marginRight: -16, paddingLeft: 16, paddingRight: 8 }}>
                {convos.map(c => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                    <button
                      onClick={() => setActiveConvo(c.id)}
                      style={{
                        padding: '5px 10px', background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 7, fontWeight: c.id === activeConvo ? 900 : 600,
                        color: c.id === activeConvo ? '#60a5fa' : 'rgba(255,255,255,.25)',
                        transition: 'color .15s',
                        borderBottom: c.id === activeConvo ? '2px solid #60a5fa' : '2px solid transparent',
                        marginBottom: -1,
                      }}
                    >{c.messages.length > 0 ? c.label : 'New'}</button>
                    {convos.length > 1 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setConvos(prev => prev.filter(x => x.id !== c.id)); if (activeConvo === c.id) setActiveConvo(convos.find(x => x.id !== c.id)?.id || 1); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.1)', fontSize: 7, padding: '0 2px', transition: 'color .15s' }}
                        onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,.4)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,.1)'; }}
                      >✕</button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => {
                    const newId = Math.max(...convos.map(c => c.id)) + 1;
                    setConvos(prev => [...prev, { id: newId, label: `Chat ${newId}`, messages: [], focus: null }]);
                    setActiveConvo(newId);
                  }}
                  style={{
                    width: 18, height: 18, borderRadius: 3, background: 'none',
                    border: '1px solid rgba(255,255,255,.08)', cursor: 'pointer',
                    display: 'grid', placeItems: 'center', marginLeft: 4,
                    color: 'rgba(255,255,255,.2)', fontSize: 11, fontWeight: 700,
                    transition: 'all .15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(96,165,250,.3)'; e.currentTarget.style.color = '#60a5fa'; e.currentTarget.style.background = 'rgba(96,165,250,.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)'; e.currentTarget.style.color = 'rgba(255,255,255,.2)'; e.currentTarget.style.background = 'none'; }}
                  title="New conversation"
                >+</button>
              </div>
            </div>

            {/* Verify badge — clickable, triggers auto-query */}
            {activeFocus && (
              <button
                onClick={() => {
                  const verifyPrompt = activeFocus.type === 'element'
                    ? `Verify and explain this: "${activeFocus.label}". What does it mean in context? Is the data accurate? What should I know?`
                    : activeFocus.type === 'company'
                    ? `Verify intelligence on ${activeFocus.label}. Cross-check their linked findings, impact assessment, and key investments. Any concerns?`
                    : `Verify this ${activeFocus.type}: "${activeFocus.label}". Is the analysis sound? What are the key implications and any gaps?`;
                  send(verifyPrompt);
                }}
                style={{ width: '100%', padding: '6px 16px', borderBottom: '1px solid rgba(255,255,255,.04)', display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(96,165,250,.03)', border: 'none', borderBlockEnd: '1px solid rgba(255,255,255,.04)', cursor: 'pointer', transition: 'background .15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(96,165,250,.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(96,165,250,.03)'; }}
              >
                <span style={{ fontSize: 10, color: '#60a5fa' }}>&#10003;</span>
                <span style={{ fontSize: 7, fontWeight: 700, color: 'rgba(96,165,250,.6)' }}>Verify intelligence on this {activeFocus.type}</span>
                <span style={{ marginLeft: 'auto', fontSize: 7, fontWeight: 800, color: '#60a5fa', opacity: .6 }}>Click to verify →</span>
              </button>
            )}

            {/* Messages */}
            <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12, scrollbarWidth: 'thin' }}>
              {messages.length === 0 && (
                <div style={{ padding: '12px 0' }}>
                  <div style={{ fontSize: 7, fontWeight: 900, letterSpacing: '.2em', color: 'rgba(255,255,255,.12)', textTransform: 'uppercase', marginBottom: 6 }}>
                    {activeFocus ? `Focused · ${activeFocus.type}` : 'Suggestions'}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#fff', letterSpacing: '-.01em', lineHeight: 1.3, marginBottom: 12 }}>
                    {activeFocus ? `Ask about ${activeFocus.label}` : 'What can I help with?'}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {suggestions.map((s, i) => (
                      <button key={i} onClick={() => send(s)} style={{
                        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px',
                        background: 'transparent', border: 'none', borderLeft: `2px solid ${accentFocus || '#A100FF'}20`,
                        cursor: 'pointer', textAlign: 'left', transition: 'all .15s',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.borderLeftColor = accentFocus || '#A100FF'; e.currentTarget.style.background = 'rgba(255,255,255,.02)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderLeftColor = `${accentFocus || '#A100FF'}20`; e.currentTarget.style.background = 'transparent'; }}
                      >
                        <span style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,.4)' }}>{s}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i}>
                  {msg.role === 'user' ? (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <div style={{ maxWidth: '80%', padding: '7px 12px', background: 'rgba(161,0,255,.06)', borderLeft: '2px solid rgba(161,0,255,.3)' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#fff', lineHeight: 1.5 }}>{msg.text}</div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                        <RobinMask size={10} />
                        <span style={{ fontSize: 6, fontWeight: 900, letterSpacing: '.12em', color: 'rgba(96,165,250,.5)' }}>ROBIN</span>
                        <div style={{ flex: 1, height: 1, background: 'rgba(96,165,250,.06)' }} />
                      </div>
                      <div style={{ paddingLeft: 2 }}>
                        <RichText text={msg.text} />
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                    <RobinMask size={10} />
                    <span style={{ fontSize: 6, fontWeight: 900, letterSpacing: '.12em', color: 'rgba(96,165,250,.5)' }}>ROBIN</span>
                    <div style={{ flex: 1, height: 1, background: 'rgba(96,165,250,.06)' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 3, paddingLeft: 2, paddingTop: 2 }}>
                    {[0, 1, 2].map(i => (
                      <motion.div key={i} animate={{ opacity: [.15, .8, .15] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * .2 }}
                        style={{ width: 4, height: 4, background: '#60a5fa' }} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div style={{ padding: '8px 16px 10px', borderTop: '1px solid rgba(255,255,255,.04)', display: 'flex', gap: 6 }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') send(input); }}
                placeholder={activeFocus ? `Ask about ${activeFocus.label}...` : 'Ask Robin...'}
                style={{
                  flex: 1, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)',
                  padding: '8px 10px', color: '#fff', fontSize: 10,
                  fontFamily: "'Inter',sans-serif", outline: 'none',
                }}
              />
              <button
                onClick={() => send(input)}
                disabled={loading || !input.trim()}
                style={{
                  width: 32, height: 32, border: 'none',
                  background: input.trim() ? '#A100FF' : 'rgba(255,255,255,.03)',
                  color: '#fff', cursor: input.trim() ? 'pointer' : 'default',
                  display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 900,
                  transition: 'background .15s',
                }}
              >↑</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
