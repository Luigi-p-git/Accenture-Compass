'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

const DT_KEY = 'devtoolkit_flags';
const TYPES = ['Bug', 'Enhancement', 'Request', 'Issue'];
const TYPE_COLORS = { Bug: '#f87171', Enhancement: '#A100FF', Request: '#60a5fa', Issue: '#fbbf24' };

function sel(el) {
  if (!el) return '';
  let s = el.tagName?.toLowerCase() || '';
  if (el.id) s += '#' + el.id;
  if (el.className && typeof el.className === 'string')
    s += '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.');
  return s;
}

function chain(el, depth = 3) {
  const parts = [];
  let cur = el;
  for (let i = 0; i < depth && cur && cur !== document.body; i++) {
    parts.unshift(sel(cur));
    cur = cur.parentElement;
  }
  return parts.join(' > ');
}

export default function DevToolkit() {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') return null;

  const [open, setOpen] = useState(false);
  const [inspecting, setInspecting] = useState(false);
  const [flags, setFlags] = useState([]);
  const [hoverBox, setHoverBox] = useState(null);
  const [captured, setCaptured] = useState(null);
  const [form, setForm] = useState({ type: 'Bug', note: '' });
  const [copied, setCopied] = useState(false);
  const overlayRef = useRef(null);

  useEffect(() => {
    try { const s = localStorage.getItem(DT_KEY); if (s) setFlags(JSON.parse(s)); } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem(DT_KEY, JSON.stringify(flags)); } catch {}
  }, [flags]);

  const startInspect = () => { setInspecting(true); setOpen(false); };

  const onMouseMove = useCallback((e) => {
    if (!inspecting) return;
    // Temporarily hide highlight so elementFromPoint doesn't hit it
    if (overlayRef.current) overlayRef.current.style.display = 'none';
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (overlayRef.current) overlayRef.current.style.display = '';
    if (!el || el.closest('[data-devtoolkit]')) { setHoverBox(null); return; }
    const r = el.getBoundingClientRect();
    setHoverBox({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [inspecting]);

  const onClick = useCallback((e) => {
    if (!inspecting) return;
    e.preventDefault(); e.stopPropagation();
    // Hide highlight so elementFromPoint gets the real element
    if (overlayRef.current) overlayRef.current.style.display = 'none';
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (overlayRef.current) overlayRef.current.style.display = '';
    if (!el || el.closest('[data-devtoolkit]')) return;
    const r = el.getBoundingClientRect();
    setCaptured({
      selector: sel(el),
      chain: chain(el),
      xPct: Math.round((r.left + r.width / 2) / window.innerWidth * 100),
      yPct: Math.round((r.top + r.height / 2) / window.innerHeight * 100),
      text: (el.textContent || '').trim().slice(0, 80),
      route: window.location.pathname,
      timestamp: new Date().toLocaleTimeString(),
    });
    setInspecting(false); setHoverBox(null);
    setForm({ type: 'Bug', note: '' });
  }, [inspecting]);

  useEffect(() => {
    if (inspecting) {
      document.addEventListener('mousemove', onMouseMove, true);
      document.addEventListener('click', onClick, true);
      const esc = (e) => { if (e.key === 'Escape') { setInspecting(false); setHoverBox(null); } };
      document.addEventListener('keydown', esc);
      return () => { document.removeEventListener('mousemove', onMouseMove, true); document.removeEventListener('click', onClick, true); document.removeEventListener('keydown', esc); };
    }
  }, [inspecting, onMouseMove, onClick]);

  const saveFlag = () => {
    if (!captured) return;
    setFlags(prev => [...prev, { ...captured, type: form.type, note: form.note, id: Date.now() }]);
    setCaptured(null);
  };

  const copyReport = () => {
    const lines = [`=== DevToolkit Report ===`, `URL:   ${window.location.href}`, `Date:  ${new Date().toLocaleString()}`, `Flags: ${flags.length}`, ''];
    flags.forEach((f, i) => {
      lines.push(`[${i + 1}] ${f.type.toUpperCase()} — ${f.note || '(no note)'}`);
      lines.push(`    Selector : ${f.selector}`);
      lines.push(`    Chain    : ${f.chain}`);
      lines.push(`    Position : ${f.xPct}% left, ${f.yPct}% top (viewport %)`);
      lines.push(`    Content  : "${f.text}"`);
      lines.push(`    Route    : ${f.route}`);
      lines.push(`    Time     : ${f.timestamp}`);
      lines.push('');
    });
    navigator.clipboard.writeText(lines.join('\n')).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const S = {
    toggle: { position: 'fixed', bottom: 20, right: 20, zIndex: 99999, width: 44, height: 44, borderRadius: 10, border: 'none', background: '#A100FF', color: '#fff', fontSize: 20, cursor: 'pointer', display: 'grid', placeItems: 'center', boxShadow: '0 4px 20px rgba(161,0,255,.4)', transition: 'transform .15s' },
    panel: { position: 'fixed', bottom: 72, right: 20, zIndex: 99999, width: 360, maxHeight: '70vh', overflow: 'auto', background: '#111', border: '1px solid rgba(255,255,255,.1)', borderRadius: 14, padding: 16, fontFamily: "'Inter',system-ui,sans-serif", color: '#fff', fontSize: 12 },
    btn: { padding: '8px 14px', borderRadius: 6, border: 'none', fontWeight: 700, fontSize: 10, cursor: 'pointer', letterSpacing: '.03em' },
    hoverBox: { position: 'fixed', zIndex: 99998, pointerEvents: 'none', border: '2px solid #A100FF', background: 'rgba(161,0,255,.08)', borderRadius: 4, transition: 'all .1s' },
    modal: { position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    modalInner: { width: 400, background: '#111', border: '1px solid rgba(255,255,255,.1)', borderRadius: 14, padding: 24, fontFamily: "'Inter',system-ui,sans-serif", color: '#fff' },
  };

  return (
    <div data-devtoolkit>
      {/* Inspect cursor — pointerEvents none so clicks pass through */}
      {inspecting && <style>{`* { cursor: crosshair !important; }`}</style>}

      {/* Hover highlight */}
      {hoverBox && <div ref={overlayRef} style={{ ...S.hoverBox, top: hoverBox.top, left: hoverBox.left, width: hoverBox.width, height: hoverBox.height }} />}

      {/* Toggle */}
      <button style={S.toggle} onClick={() => setOpen(!open)} title="DevToolkit">
        🛠️
      </button>

      {/* Panel */}
      {open && (
        <div style={S.panel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontWeight: 800, fontSize: 13 }}>DevToolkit</span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,.3)' }}>{flags.length} flags</span>
          </div>
          <button style={{ ...S.btn, background: '#A100FF', color: '#fff', width: '100%', marginBottom: 8 }} onClick={startInspect}>
            🎯 Inspect Element
          </button>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            <button style={{ ...S.btn, background: copied ? '#34d399' : 'rgba(255,255,255,.06)', color: copied ? '#000' : '#fff', flex: 1 }} onClick={copyReport}>
              {copied ? '✓ Copied' : '📋 Copy Report'}
            </button>
            <button style={{ ...S.btn, background: 'rgba(255,255,255,.06)', color: '#f87171', flex: 1 }} onClick={() => setFlags([])}>
              🗑 Clear All
            </button>
          </div>
          {flags.length === 0 && <div style={{ textAlign: 'center', color: 'rgba(255,255,255,.2)', padding: 16, fontSize: 11 }}>No flags yet. Click Inspect to start.</div>}
          {flags.map((f, i) => (
            <div key={f.id} style={{ padding: '10px 0', borderTop: '1px solid rgba(255,255,255,.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 3, background: TYPE_COLORS[f.type] + '22', color: TYPE_COLORS[f.type], textTransform: 'uppercase', letterSpacing: '.1em' }}>{f.type}</span>
                <span style={{ fontSize: 11, fontWeight: 600, flex: 1 }}>{f.note || '(no note)'}</span>
                <button style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.2)', cursor: 'pointer', fontSize: 14 }} onClick={() => setFlags(prev => prev.filter((_, j) => j !== i))}>×</button>
              </div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,.25)', fontFamily: 'monospace' }}>{f.selector}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,.2)' }}>{f.xPct}% left, {f.yPct}% top · {f.route} · {f.timestamp}</div>
            </div>
          ))}
        </div>
      )}

      {/* Capture Modal */}
      {captured && (
        <div style={S.modal} onClick={(e) => { if (e.target === e.currentTarget) setCaptured(null); }}>
          <div style={S.modalInner}>
            <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 16 }}>Flag Element</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', marginBottom: 4, fontFamily: 'monospace' }}>{captured.selector}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.25)', marginBottom: 12 }}>"{captured.text}"</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {TYPES.map(t => (
                <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))} style={{ ...S.btn, flex: 1, background: form.type === t ? TYPE_COLORS[t] : 'rgba(255,255,255,.06)', color: form.type === t ? '#fff' : 'rgba(255,255,255,.4)' }}>{t}</button>
              ))}
            </div>
            <textarea
              value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              placeholder="Describe the issue..."
              style={{ width: '100%', height: 80, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 8, color: '#fff', padding: 10, fontSize: 12, fontFamily: "'Inter',sans-serif", resize: 'none', outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button style={{ ...S.btn, flex: 1, background: '#A100FF', color: '#fff' }} onClick={saveFlag}>Save Flag</button>
              <button style={{ ...S.btn, flex: 1, background: 'rgba(255,255,255,.06)', color: '#fff' }} onClick={() => setCaptured(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
