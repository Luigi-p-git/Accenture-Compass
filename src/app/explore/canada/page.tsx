'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

/* ═══════════════════════════════════════
   DATA
   ═══════════════════════════════════════ */
const TABS = ['Overview', 'Macroeconomics', 'Trends', 'Industries', 'Financials', 'Talent'];
const ICONS = ['dashboard', 'public', 'trending_up', 'domain', 'account_balance', 'groups'];

const CLIENTS = [
  { n: 'Shopify', s: 'Technology', r: '$68M', g: '+18%', gc: 1, init: 'SH', score: 94, ceo: 'Tobias Lütke', hq: 'Ottawa, ON', projects: [{ t: 'Cloud Migration III', s: 'Active', d: 'Enterprise AWS migration' }, { t: 'AI Recommendation Engine', s: 'Active', d: 'ML product recs' }], team: [{ n: 'Sarah Chen', r: 'MD', i: 'SC' }, { n: 'Marcus W.', r: 'Lead', i: 'MW' }] },
  { n: 'Royal Bank of Canada', s: 'Financial Services', r: '$68M', g: '+12%', gc: 1, init: 'RB', score: 92, ceo: 'Dave McKay', hq: 'Toronto, ON', projects: [{ t: 'Open Banking Platform', s: 'Active', d: 'API regulatory compliance' }], team: [{ n: 'James Park', r: 'MD', i: 'JP' }] },
  { n: 'Government of Canada', s: 'Public Services', r: '$62M', g: '+18%', gc: 1, init: 'GC', score: 88, ceo: 'Federal CIO', hq: 'Ottawa, ON', projects: [{ t: 'Cloud First Migration', s: 'Active', d: '14 department cloud migration' }], team: [{ n: 'Rachel Kim', r: 'MD', i: 'RK' }] },
  { n: 'TD Bank Group', s: 'Financial Services', r: '$54M', g: '+8%', gc: 1, init: 'TD', score: 86, ceo: 'Bharat Masrani', hq: 'Toronto, ON', projects: [{ t: 'Core Banking', s: 'Active', d: 'Legacy → cloud-native' }], team: [{ n: 'Michael T.', r: 'MD', i: 'MT' }] },
  { n: 'Suncor Energy', s: 'Energy & Resources', r: '$42M', g: '+6%', gc: 1, init: 'SE', score: 86, ceo: 'Rich Kruger', hq: 'Calgary, AB', projects: [{ t: 'Carbon Capture AI', s: 'Active', d: 'Emissions optimization' }, { t: 'Digital Twin', s: 'Planning', d: 'Oil sands simulation' }], team: [{ n: 'Olga P.', r: 'MD', i: 'OP' }] },
];

const SECTORS = [
  { n: 'Technology', v: 520, g: 14.2 }, { n: 'Financial Services', v: 410, g: 8.6 },
  { n: 'Energy & Resources', v: 320, g: 6.1 }, { n: 'Public Services', v: 280, g: 11.8 },
  { n: 'Health & Life Sciences', v: 170, g: 19.4 }, { n: 'Communications', v: 100, g: 5.3 },
];

/* ═══════════════════════════════════════
   MAIN
   ═══════════════════════════════════════ */
export default function CanadaDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState(0);
  const [modal, setModal] = useState<number | null>(null);
  const cntRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(e => e.forEach(x => { if (x.isIntersecting) x.target.classList.add('v'); }), { threshold: 0.08 });
    const t = setTimeout(() => cntRef.current?.querySelectorAll('.fu').forEach(el => obs.observe(el)), 60);
    return () => { clearTimeout(t); obs.disconnect(); };
  }, [tab]);

  const go = (i: number) => { setTab(i); if (cntRef.current) cntRef.current.scrollTop = 0; };

  return (
    <div className="app" style={{ animation: 'fadeIn .6s cubic-bezier(.4,0,.2,1)' }}>
      {/* Country silhouette watermark — entrance effect */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 40% 40%, rgba(161,0,255,.06), transparent 60%)',
        opacity: 1, animation: 'fadeIn .8s',
      }} />
      {/* ── Sidebar ── */}
      <aside className="side">
        <div className="side-brand">
          <span style={{ fontSize: 14, fontWeight: 900, letterSpacing: '-.02em', cursor: 'pointer' }} onClick={() => router.push('/')}>accenture</span>
          <div className="divider" />
          <span className="compass-text">Compass</span>
        </div>
        <nav>
          {TABS.map((t, i) => (
            <button key={t} className={`nb${i === tab ? ' on' : ''}`} onClick={() => go(i)}>
              <span className="ms">{ICONS[i]}</span>{t}
            </button>
          ))}
        </nav>
        <div className="side-foot">
          <button className="gen-btn">Generate Report</button>
        </div>
      </aside>

      {/* ── Content ── */}
      <div className="wrap">
        <header className="bar">
          <div className="bar-l">
            <h3>{TABS[tab]}</h3>
            <small>Canada · Q4 FY2025</small>
          </div>
          <div className="bar-r">
            <div className="si">
              <span className="ms" style={{ fontSize: 14, color: 'var(--t4)' }}>search</span>
              <input placeholder="Search..." />
            </div>
            <button className="ib" onClick={() => router.push('/admin')}><span className="ms">settings</span></button>
            <div className="av" style={{ background: 'var(--p)', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 800 }}>LP</div>
          </div>
        </header>

        {/* KPI Strip — always visible at top */}
        <div className="kpi-strip">
          <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', borderRight: '1px solid var(--s2)' }}>
            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.2em', color: 'var(--p)', textTransform: 'uppercase' }}>Canada</span>
          </div>
          {[{ l: 'Revenue', v: '$1.8B', d: '+9.4%' }, { l: 'Utilization', v: '87.2%', d: '+1.4pts' }, { l: 'Headcount', v: '12,500', d: '+8.2%' }, { l: 'Clients', v: '284', d: '+14' }].map(k => (
            <div className="kpi" key={k.l}>
              <div className="tag">{k.l}</div><div className="val" style={{ fontSize: 22 }}>{k.v}</div><div className="delta" style={{ color: 'var(--em)' }}>{k.d}</div>
            </div>
          ))}
        </div>

        <div className="cnt" ref={cntRef}>
          {tab === 0 && <TabOverview onNav={go} />}
          {tab === 1 && <TabMacro />}
          {tab === 2 && <TabTrends />}
          {tab === 3 && <TabIndustries openClient={setModal} />}
          {tab === 4 && <TabFinancials />}
          {tab === 5 && <TabTalent />}
        </div>
      </div>

      {/* ── Modal ── */}
      {modal !== null && <div className="modal-overlay show" onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
        <ClientModal c={CLIENTS[modal]} rank={modal} close={() => setModal(null)} />
      </div>}
    </div>
  );
}

/* ═══════════════════════════════════════
   TAB: OVERVIEW
   ═══════════════════════════════════════ */
function TabOverview({ onNav }: { onNav: (i: number) => void }) {
  const revD = [{ q: "Q1'24", r: 410 }, { q: "Q2'24", r: 430 }, { q: "Q3'24", r: 445 }, { q: "Q4'24", r: 460 }, { q: "Q1'25", r: 470 }, { q: "Q2'25", r: 480 }, { q: "Q3'25", r: 490 }, { q: "Q4'25", r: 495 }];
  const mx = Math.max(...revD.map(d => d.r));

  const navCards = [
    { label: 'Overview', sub: 'Strategic summary', tab: 0, grad: 'linear-gradient(135deg, #1a002b, #0d0d0d)', ic: 'dashboard' },
    { label: 'Talent', sub: 'Workforce analytics', tab: 5, grad: 'linear-gradient(135deg, #0d1b2a, #1b2838)', ic: 'groups' },
    { label: 'Industries', sub: 'Client intelligence', tab: 3, grad: 'linear-gradient(135deg, #1a0033, #110022)', ic: 'domain' },
    { label: 'Trends', sub: 'Research & analysis', tab: 2, grad: 'linear-gradient(135deg, #0a1628, #0d2137)', ic: 'trending_up' },
    { label: 'Financials', sub: 'Revenue dynamics', tab: 4, grad: 'linear-gradient(135deg, #1a0a2e, #0d0d1a)', ic: 'account_balance' },
    { label: 'Macro', sub: 'Economic pulse', tab: 1, grad: 'linear-gradient(135deg, #0d1f12, #0a1a0d)', ic: 'public' },
  ];

  return (<>
    {/* Accenture.com-style nav cards — horizontal scroll */}
    <div className="hscroll-section" style={{ paddingTop: 24, paddingBottom: 24 }}>
      <div className="hscroll-wrap">
        {navCards.map((card, i) => (
          <div key={card.label} className="fu hcard" style={{ transitionDelay: `${i * .06}s`, width: 200 }} onClick={() => onNav(card.tab)}>
            <div style={{ height: 100, background: card.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
              {/* Large faded icon */}
              <span className="ms" style={{ fontSize: 56, color: 'rgba(161,0,255,.12)' }}>{card.ic}</span>
              {/* Glow */}
              <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, background: 'radial-gradient(circle, rgba(161,0,255,.15), transparent 70%)' }} />
              <div style={{ position: 'absolute', top: 10, left: 12 }}>
                <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--p)', background: 'rgba(0,0,0,.5)', padding: '2px 8px', borderRadius: 3 }}>{card.label}</span>
              </div>
            </div>
            <div className="hcard-body" style={{ padding: 12 }}>
              <h4 style={{ fontSize: 12 }}>{card.label}</h4>
              <p>{card.sub}</p>
              <div className="hcard-meta" style={{ marginTop: 6 }}>
                <span className="ms" style={{ fontSize: 12 }}>arrow_forward</span>Explore
              </div>
            </div>
          </div>
        ))}
        <div style={{ width: 48, flexShrink: 0 }} /> {/* end spacer */}
      </div>
    </div>
    {/* 5-Year Revenue Trend + Growth Line (Canvas) */}
    <div className="sec">
      <div className="fu sec-head"><div className="tag">Financial Performance</div><div className="h2" style={{ marginTop: 4 }}>Revenue Trend — 5 Year</div><p className="sub" style={{ marginTop: 4 }}>Annual revenue (bars) with YoY growth rate (line) · CAD</p></div>
      <div className="fu" style={{ transitionDelay: '.1s' }}>
        <RevenueTrendChart />
      </div>
    </div>

    {/* Revenue by Client Group */}
    <div className="sec" style={{ paddingTop: 0 }}>
      <div className="fu sec-head"><div className="tag">Sector Intelligence</div><div className="h2" style={{ marginTop: 4 }}>Revenue by Client Group</div></div>
      {SECTORS.map((s, i) => (
        <div className="fu srow" key={s.n} style={{ transitionDelay: `${i * .05}s` }} onClick={() => onNav(3)}>
          <div className="srow-rk">0{i + 1}</div><div className="srow-n">{s.n}</div>
          <div className="srow-track"><div className="srow-fill" style={{ width: `${(s.v / 550) * 100}%` }} /></div>
          <div className="srow-v">${s.v}M</div><div className="srow-d" style={{ color: 'var(--em)' }}>+{s.g}%</div>
        </div>
      ))}
    </div>

    {/* Top 10 Clients */}
    <div className="sec" style={{ paddingTop: 0 }}>
      <div className="fu sec-head"><div className="tag">Client Intelligence</div><div className="h2" style={{ marginTop: 4 }}>Top 10 Clients — Canada</div></div>
      {[
        { n: 'Royal Bank of Canada', init: 'RBC', sector: 'Financial Services', rev: '$68M', g: '+12%' },
        { n: 'Shopify', init: 'SH', sector: 'Technology', rev: '$68M', g: '+18%' },
        { n: 'Government of Canada', init: 'GoC', sector: 'Public Services', rev: '$62M', g: '+18%' },
        { n: 'TD Bank Group', init: 'TD', sector: 'Financial Services', rev: '$54M', g: '+8%' },
        { n: 'Suncor Energy', init: 'SU', sector: 'Energy & Resources', rev: '$42M', g: '+6%' },
        { n: 'Bell Canada', init: 'BCE', sector: 'Communications', rev: '$38M', g: '+10%' },
        { n: 'Manulife Financial', init: 'MFC', sector: 'Financial Services', rev: '$35M', g: '+14%' },
        { n: 'Province of Ontario', init: 'ON', sector: 'Public Services', rev: '$32M', g: '+22%' },
        { n: 'Enbridge', init: 'ENB', sector: 'Energy & Resources', rev: '$30M', g: '+4%' },
        { n: 'OpenText', init: 'OT', sector: 'Technology', rev: '$28M', g: '+12%' },
      ].map((c, i) => {
        // Elegant monochrome purple gradient per rank
        const opacity = 1 - i * 0.07;
        return (
        <div className="fu cl-row" key={c.n} style={{ transitionDelay: `${i * .04}s` }}>
          <div className="cl-rk" style={{ fontSize: 14 }}>{String(i + 1).padStart(2, '0')}</div>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: `rgba(161,0,255,${0.08 + i * 0.02})`, border: '1px solid rgba(161,0,255,.15)', display: 'grid', placeItems: 'center', fontSize: 9, fontWeight: 900, color: `rgba(161,0,255,${opacity})`, flexShrink: 0, letterSpacing: '.02em' }}>{c.init}</div>
          <div className="cl-info"><div className="cl-n">{c.n}</div><div className="cl-s">{c.sector}</div></div>
          <div className="cl-spark">{[.3,.5,.4,.7,.8].map((h,j) => <i key={j} style={{ height: `${h*100}%`, background: j >= 3 ? `rgba(161,0,255,${0.6 * opacity})` : `rgba(161,0,255,${0.12 * opacity})` }} />)}</div>
          <div className="cl-v">{c.rev}</div>
          <div className="cl-g" style={{ color: 'var(--em)' }}>{c.g}</div>
        </div>
        );
      })}
    </div>

    {/* AI Insight */}
    <div className="sec" style={{ paddingTop: 0 }}>
      <div className="fu ai"><div className="ai-dot"><span className="ms">auto_awesome</span></div><div><div className="tag">Predictive AI</div><p>Q1 outlook: +12% digital transformation contracts. AI Corridor investment accelerating. Security service line growing fastest at +22.6%. Top client RBC expanding open banking mandate by $15M.</p></div></div>
    </div>
    <div style={{ height: 48 }} />
  </>);
}

/* ═══════════════════════════════════════
   TAB: MACRO
   ═══════════════════════════════════════ */
/* ═══════════════════════════════════════
   5-YEAR REVENUE TREND + GROWTH LINE
   ═══════════════════════════════════════ */
function RevenueTrendChart() {
  const cvRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const pr = cv.parentElement!.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    cv.width = pr.width * dpr; cv.height = pr.height * dpr;
    cv.style.width = pr.width + 'px'; cv.style.height = pr.height + 'px';
    const ctx = cv.getContext('2d')!; ctx.scale(dpr, dpr);
    const W = pr.width, H = pr.height;
    const p = { t: 28, r: 48, b: 36, l: 50 }, cW = W - p.l - p.r, cH = H - p.t - p.b;

    const years = [
      { yr: 'FY21', rev: 1120, growth: 0 },
      { yr: 'FY22', rev: 1280, growth: 14.3 },
      { yr: 'FY23', rev: 1420, growth: 10.9 },
      { yr: 'FY24', rev: 1580, growth: 11.3 },
      { yr: 'FY25', rev: 1800, growth: 13.9 },
    ];
    const maxRev = 2000;
    const maxGrowth = 20;
    const barW = cW / years.length * 0.55;
    const gap = cW / years.length;

    // Grid lines
    for (let i = 0; i <= 4; i++) {
      const y = p.t + cH * (1 - i / 4);
      ctx.strokeStyle = 'rgba(255,255,255,.04)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(p.l, y); ctx.lineTo(W - p.r, y); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.font = '600 9px Inter'; ctx.textAlign = 'right';
      ctx.fillText(`$${(maxRev / 4 * i / 1000).toFixed(1)}B`, p.l - 8, y + 3);
    }
    // Right axis labels (growth)
    for (let i = 0; i <= 4; i++) {
      const y = p.t + cH * (1 - i / 4);
      ctx.fillStyle = 'rgba(52,211,153,.3)'; ctx.font = '600 9px Inter'; ctx.textAlign = 'left';
      ctx.fillText(`${(maxGrowth / 4 * i).toFixed(0)}%`, W - p.r + 8, y + 3);
    }

    // Bars
    years.forEach((d, i) => {
      const x = p.l + i * gap + (gap - barW) / 2;
      const h = (d.rev / maxRev) * cH;
      const y = p.t + cH - h;
      const isPeak = d.rev === Math.max(...years.map(y => y.rev));

      // Bar gradient
      const grad = ctx.createLinearGradient(x, y, x, p.t + cH);
      grad.addColorStop(0, isPeak ? 'rgba(161,0,255,.9)' : 'rgba(161,0,255,.35)');
      grad.addColorStop(1, isPeak ? 'rgba(161,0,255,.4)' : 'rgba(161,0,255,.1)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      // Rounded top
      const r = 4;
      ctx.moveTo(x + r, y); ctx.lineTo(x + barW - r, y);
      ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
      ctx.lineTo(x + barW, p.t + cH); ctx.lineTo(x, p.t + cH);
      ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.fill();

      // Glow on peak
      if (isPeak) {
        ctx.shadowColor = 'rgba(161,0,255,.3)'; ctx.shadowBlur = 16;
        ctx.fill(); ctx.shadowBlur = 0;
      }

      // Value label on bar
      ctx.fillStyle = '#fff'; ctx.font = '800 10px Inter'; ctx.textAlign = 'center';
      ctx.fillText(`$${(d.rev / 1000).toFixed(1)}B`, x + barW / 2, y - 8);

      // Year label
      ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.font = '700 9px Inter';
      ctx.fillText(d.yr, x + barW / 2, H - 10);
    });

    // Growth line (on right axis)
    ctx.beginPath();
    years.forEach((d, i) => {
      if (i === 0) return; // skip first (0% baseline)
      const x = p.l + i * gap + gap / 2;
      const y = p.t + cH * (1 - d.growth / maxGrowth);
      if (i === 1) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#34d399'; ctx.lineWidth = 2.5; ctx.setLineDash([]); ctx.stroke();

    // Growth dots
    years.forEach((d, i) => {
      if (i === 0) return;
      const x = p.l + i * gap + gap / 2;
      const y = p.t + cH * (1 - d.growth / maxGrowth);
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#34d399'; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#fff'; ctx.fill();
      // Growth label
      ctx.fillStyle = '#34d399'; ctx.font = '800 9px Inter'; ctx.textAlign = 'center';
      ctx.fillText(`+${d.growth.toFixed(1)}%`, x, y - 10);
    });

    // Legend
    const ly = H - 8;
    ctx.fillStyle = 'rgba(161,0,255,.6)'; ctx.fillRect(p.l, ly - 3, 12, 6);
    ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.font = '600 9px Inter'; ctx.textAlign = 'left';
    ctx.fillText('Revenue', p.l + 16, ly + 2);
    ctx.strokeStyle = '#34d399'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.l + 80, ly); ctx.lineTo(p.l + 96, ly); ctx.stroke();
    ctx.beginPath(); ctx.arc(p.l + 88, ly, 3, 0, Math.PI * 2); ctx.fillStyle = '#34d399'; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillText('YoY Growth', p.l + 102, ly + 2);
  }, []);

  return (
    <div style={{ height: 280, background: 'var(--s1)', border: '1px solid var(--s2)', borderRadius: 14, overflow: 'hidden', position: 'relative' }}>
      <canvas ref={cvRef} style={{ display: 'block' }} />
    </div>
  );
}

function TabMacro() {
  const cvRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const pr = cv.parentElement!.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    cv.width = pr.width * dpr; cv.height = pr.height * dpr;
    cv.style.width = pr.width + 'px'; cv.style.height = pr.height + 'px';
    const ctx = cv.getContext('2d')!; ctx.scale(dpr, dpr);
    const W = pr.width, H = pr.height, p = { t: 24, r: 24, b: 32, l: 44 }, cW = W - p.l - p.r, cH = H - p.t - p.b;
    const data = [{ m: 'Jan', ca: 1.2, us: 2.1 }, { m: 'Feb', ca: 1.4, us: 2.3 }, { m: 'Mar', ca: 1.3, us: 2.0 }, { m: 'Apr', ca: 1.5, us: 2.4 }, { m: 'May', ca: 1.6, us: 2.6 }, { m: 'Jun', ca: 1.5, us: 2.5 }, { m: 'Jul', ca: 1.7, us: 2.8 }, { m: 'Aug', ca: 1.6, us: 2.7 }, { m: 'Sep', ca: 1.7, us: 2.9 }, { m: 'Oct', ca: 1.8, us: 3.0 }, { m: 'Nov', ca: 1.8, us: 3.1 }, { m: 'Dec', ca: 1.8, us: 3.2 }];
    // Grid
    for (let i = 0; i <= 5; i++) { const y = p.t + cH * (1 - i / 5); ctx.strokeStyle = 'rgba(255,255,255,.04)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p.l, y); ctx.lineTo(W - p.r, y); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.font = '600 9px Inter'; ctx.textAlign = 'right'; ctx.fillText((i * .8).toFixed(1), p.l - 8, y + 3); }
    data.forEach((d, i) => { const x = p.l + i * (cW / 11); ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.font = '600 9px Inter'; ctx.textAlign = 'center'; ctx.fillText(d.m, x, H - 8); });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const line = (key: string, col: string, alpha: string) => { ctx.beginPath(); data.forEach((d: any, i) => { const x = p.l + i * (cW / 11), y = p.t + cH * (1 - d[key] / 4); if (!i) ctx.moveTo(x, y); else { const px = p.l + (i - 1) * (cW / 11), py = p.t + cH * (1 - (data as any)[i - 1][key] / 4), s = cW / 11 * .35; ctx.bezierCurveTo(px + s, py, x - s, y, x, y); } }); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke(); const lx = p.l + 11 * (cW / 11); ctx.lineTo(lx, p.t + cH); ctx.lineTo(p.l, p.t + cH); ctx.closePath(); const g = ctx.createLinearGradient(0, p.t, 0, p.t + cH); g.addColorStop(0, alpha); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fill(); };
    line('us', '#34d399', 'rgba(52,211,153,.06)');
    line('ca', '#A100FF', 'rgba(161,0,255,.1)');
  }, []);
  return (<div className="sec">
    <div className="fu sec-head"><div className="tag">Canada vs US</div><div className="h2" style={{ marginTop: 4, fontSize: 36 }}>Macroeconomic Pulse</div><p className="sub" style={{ marginTop: 4 }}>GDP growth comparison</p></div>
    <div className="fu macro-wrap" style={{ transitionDelay: '.1s' }}><canvas ref={cvRef} style={{ display: 'block' }} /></div>
    <div className="fu macro-legend" style={{ transitionDelay: '.15s' }}><div className="ml"><i style={{ background: '#A100FF' }} />Canada</div><div className="ml"><i style={{ background: '#34d399' }} />United States</div></div>
    <div className="macro-kpis">
      {[{ l: 'GDP', v: '$2.14T', d: '+1.8%' }, { l: 'Inflation', v: '2.4%', d: '-0.8pp' }, { l: 'Unemployment', v: '5.8%', d: '+0.2pp' }, { l: 'BoC Rate', v: '4.25%', d: '-0.50pp' }].map((m, i) => (
        <div className="fu mk" key={m.l} style={{ transitionDelay: `${.2 + i * .06}s` }}><div className="tag">{m.l}</div><div className="val">{m.v}</div><div className="delta" style={{ color: 'var(--em)' }}>{m.d}</div></div>
      ))}
    </div>
    <div className="fu ai" style={{ transitionDelay: '.35s' }}><div className="ai-dot"><span className="ms">auto_awesome</span></div><div><p><span style={{ color: 'var(--p)', fontWeight: 800 }}>AI INSIGHT:</span> BoC rate cuts to stimulate H2 investment. Housing affordability remains key talent risk in Toronto/Vancouver. AI Corridor attracting $4.8B venture capital.</p></div></div>
  </div>);
}

/* ═══════════════════════════════════════
   TAB: TRENDS
   ═══════════════════════════════════════ */
function TabTrends() {
  const [open, setOpen] = useState<number | null>(null);

  const challenges = [
    { t: 'Housing Affordability Crisis', d: 'Toronto and Vancouver housing costs impacting talent attraction. Avg home price 12x median income. Remote work adoption partially offsetting, but in-person client delivery suffering.', severity: 'high', ic: 'home' },
    { t: 'US Trade Tensions', d: 'Potential tariff escalation affecting cross-border supply chains. Auto, lumber, and energy sectors most exposed. $15B bilateral trade at risk.', severity: 'high', ic: 'warning' },
    { t: 'Tech Sector Rationalization', d: 'Layoffs at Shopify (-20%), Hootsuite, Wealthsimple. Near-term IT spend reduction, but creates cost optimization consulting opportunity.', severity: 'medium', ic: 'trending_down' },
    { t: 'Interest Rate Uncertainty', d: 'BoC rate path unclear — further cuts could stimulate, but inflation persistence may pause easing. Impacts client capital allocation.', severity: 'medium', ic: 'show_chart' },
  ];

  const opportunities = [
    { t: 'AI/ML Advisory', p: '$120M+', timeline: 'FY25–27', d: 'Toronto-Montreal AI Corridor. Vector Institute, Mila partnerships. Enterprise AI transformation across FS and healthcare.', ic: 'psychology' },
    { t: 'Federal Cloud Migration', p: '$85M+', timeline: 'FY25–28', d: 'Cloud-first policy, $4.2B IT budget. SAP, ServiceNow, AWS/Azure. 14 departments in pipeline.', ic: 'cloud' },
    { t: 'Energy Transition', p: '$60M+', timeline: 'FY25–30', d: 'Carbon capture, hydrogen, renewables. Suncor, TC Energy, Enbridge all pivoting. Alberta clean tech corridor.', ic: 'eco' },
    { t: 'Open Banking', p: '$45M+', timeline: 'FY25–27', d: 'Big Five banks + 20 fintechs. API infrastructure, compliance, consumer experience redesign.', ic: 'account_balance' },
  ];

  const trends = [
    { t: 'AI Corridor Expansion', tag: 'Technology', d: 'Toronto-Montreal AI corridor — $4.8B venture investment. Enterprise AI consulting demand surging across FS and healthcare.', ic: 'psychology' },
    { t: 'Green Energy Transition', tag: 'Sustainability', d: 'Net-Zero 2050 driving $120B clean energy infrastructure — hydrogen, carbon capture across AB and BC.', ic: 'eco' },
    { t: 'Digital Government', tag: 'Public Sector', d: '$8.2B federal IT modernization budget through 2027. Cloud-first, SAP, ServiceNow.', ic: 'shield' },
    { t: 'Open Banking', tag: 'Financial Services', d: 'Big Five banks + 20 fintechs need API infra, compliance, and CX redesign.', ic: 'account_balance' },
    { t: 'Critical Minerals', tag: 'Resources', d: '$3.8B government investment in lithium, cobalt, nickel — EV supply chain play.', ic: 'bolt' },
    { t: 'Talent Reinvention', tag: 'Workforce', d: '45K transitioning to AI roles. Cloud architects aligning to hyperscaler partnerships.', ic: 'school' },
  ];

  const sevColor = (s: string) => s === 'high' ? 'var(--red)' : 'var(--amber)';

  return (<>
    {/* Header */}
    <div className="sec" style={{ paddingBottom: 0 }}>
      <div className="fu sec-head">
        <div className="tag">Research & Analysis</div>
        <div className="h2" style={{ marginTop: 4, fontSize: 36 }}>Canada — Strategic Landscape</div>
        <p className="sub" style={{ marginTop: 4 }}>Challenges, opportunities, and sector-defining trends shaping Accenture&apos;s position in Canada.</p>
      </div>
    </div>

    {/* Challenges + Opportunities side by side */}
    <div style={{ display: 'flex', gap: 24, padding: '0 48px 0' }}>
      {/* Challenges */}
      <div style={{ flex: 1 }}>
        <div className="fu" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span className="ms" style={{ fontSize: 18, color: 'var(--red)' }}>warning</span>
          <span style={{ fontSize: 14, fontWeight: 800 }}>Key Challenges</span>
          <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 4, background: 'rgba(248,113,113,.1)', color: 'var(--red)', marginLeft: 4 }}>{challenges.length}</span>
        </div>
        {challenges.map((c, i) => (
          <div className="fu" key={c.t} style={{ transitionDelay: `${i * .06}s`, padding: '14px 16px', borderRadius: 10, background: 'var(--s1)', border: '1px solid var(--s2)', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `${sevColor(c.severity)}12`, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <span className="ms" style={{ fontSize: 16, color: sevColor(c.severity) }}>{c.ic}</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 800 }}>{c.t}</div>
              </div>
              <span style={{ fontSize: 8, fontWeight: 800, padding: '2px 6px', borderRadius: 3, background: `${sevColor(c.severity)}15`, color: sevColor(c.severity), textTransform: 'uppercase', letterSpacing: '.1em' }}>{c.severity}</span>
            </div>
            <p style={{ fontSize: 10, color: 'var(--t3)', lineHeight: 1.7, paddingLeft: 42 }}>{c.d}</p>
          </div>
        ))}
      </div>

      {/* Opportunities */}
      <div style={{ flex: 1 }}>
        <div className="fu" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span className="ms" style={{ fontSize: 18, color: 'var(--em)' }}>rocket_launch</span>
          <span style={{ fontSize: 14, fontWeight: 800 }}>Strategic Opportunities</span>
          <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 4, background: 'rgba(52,211,153,.1)', color: 'var(--em)', marginLeft: 4 }}>$310M+</span>
        </div>
        {opportunities.map((o, i) => (
          <div className="fu" key={o.t} style={{ transitionDelay: `${i * .06}s`, padding: '14px 16px', borderRadius: 10, background: 'var(--s1)', border: '1px solid var(--s2)', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(161,0,255,.08)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <span className="ms" style={{ fontSize: 16, color: 'var(--p)' }}>{o.ic}</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 800 }}>{o.t}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--em)' }}>{o.p}</div>
                <div style={{ fontSize: 8, fontWeight: 700, color: 'var(--t4)' }}>{o.timeline}</div>
              </div>
            </div>
            <p style={{ fontSize: 10, color: 'var(--t3)', lineHeight: 1.7, paddingLeft: 42 }}>{o.d}</p>
          </div>
        ))}
      </div>
    </div>

    {/* Sector Watch — Horizontal cards */}
    <div className="hscroll-section" style={{ paddingTop: 32 }}>
      <div className="hscroll-head">
        <div><div className="tag">Sector Watch</div><div className="h3" style={{ marginTop: 4 }}>Industry Signals</div></div>
      </div>
      <div className="hscroll-wrap">
        {[
          { tag: 'Technology', t: 'AI Spending Surge', d: 'Canadian enterprises increasing AI budgets by 40% YoY. Toronto emerging as top-3 global AI talent hub.', img: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&q=60' },
          { tag: 'Financial Services', t: 'Open Banking Countdown', d: 'Phase 1 regulatory framework expected Q2 2025. All Big Five mobilizing implementation teams.', img: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&q=60' },
          { tag: 'Energy', t: 'Carbon Capture Milestone', d: 'Pathways Alliance $16.5B carbon capture project advancing. Alberta hydrogen hub taking shape.', img: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=400&q=60' },
          { tag: 'Public Sector', t: 'Digital ID Framework', d: 'Pan-Canadian Trust Framework gaining momentum. BC and Alberta piloting digital credentials.', img: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&q=60' },
          { tag: 'Health', t: 'Virtual Care Regulation', d: 'Provincial governments standardizing telehealth. $2.1B market by 2026. Interoperability critical.', img: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400&q=60' },
        ].map((c, i) => (
          <div key={c.t} className="fu hcard" style={{ transitionDelay: `${i * .06}s`, width: 260 }}>
            <div className="hcard-img" style={{ height: 130 }}>
              <img src={c.img} alt={c.t} />
              <div className="hcard-tag">{c.tag}</div>
            </div>
            <div className="hcard-body">
              <h4>{c.t}</h4>
              <p>{c.d}</p>
              <div className="hcard-meta"><span className="ms" style={{ fontSize: 13 }}>arrow_forward</span>Read more</div>
            </div>
          </div>
        ))}
        <div style={{ width: 48, flexShrink: 0 }} />
      </div>
    </div>

    {/* Emerging Trends Accordions */}
    <div className="sec" style={{ paddingTop: 8 }}>
      <div className="fu sec-head"><div className="tag">Deep Dive</div><div className="h3" style={{ marginTop: 4 }}>Emerging Trends</div></div>
      {trends.map((t, i) => (
        <div className={`tr-item${open === i ? ' on' : ''}`} key={t.t} style={{ animation: `fadeIn .5s ${i * .04}s both` }}>
          <div className="tr-head" onClick={() => setOpen(open === i ? null : i)}>
            <div className="tr-left"><div className="tr-ic"><span className="ms">{t.ic}</span></div><div><div className="tag">{t.tag}</div><div className="tr-t">{t.t}</div></div></div>
            <span className="ms tr-arrow">arrow_forward</span>
          </div>
          <div className="tr-body"><div className="tr-inner"><p>{t.d}</p><button className="tr-btn">Read Analysis <span className="ms" style={{ fontSize: 13 }}>north_east</span></button></div></div>
        </div>
      ))}
    </div>

    {/* AI Summary */}
    <div className="sec" style={{ paddingTop: 0 }}>
      <div className="fu ai">
        <div className="ai-dot"><span className="ms">auto_awesome</span></div>
        <div><div className="tag">Predictive AI</div>
          <p>Canada&apos;s strategic position strengthening — AI Corridor now ranks #3 globally for AI talent density. $310M+ opportunity pipeline across 4 major themes. Key risk: housing affordability may force hybrid-first talent strategy shift by Q3 2025.</p>
        </div>
      </div>
    </div>
    <div style={{ height: 48 }} />
  </>);
}

/* ═══════════════════════════════════════
   TAB: INDUSTRIES (Client Leaderboard)
   ═══════════════════════════════════════ */
function TabIndustries({ openClient }: { openClient: (i: number) => void }) {
  return (<div className="sec">
    <div className="fu sec-head"><div className="tag">Client Intelligence</div><div className="h2" style={{ marginTop: 4, fontSize: 36 }}>Canada — Impact Leaderboard</div><p className="sub" style={{ marginTop: 4 }}>Click any client for their strategic dossier.</p></div>
    {CLIENTS.map((c, i) => (
      <div className="fu cl-row" key={c.n} style={{ transitionDelay: `${i * .06}s` }} onClick={() => openClient(i)}>
        <div className="cl-rk">0{i + 1}</div>
        <div className="cl-init">{c.init}</div>
        <div className="cl-info"><div className="cl-n">{c.n}</div><div className="cl-s">{c.s}</div></div>
        <div className="cl-spark">{[.3, .5, .4, .7, .8].map((h, j) => <i key={j} style={{ height: `${h * 100}%`, background: j >= 3 ? 'var(--p)' : `rgba(161,0,255,${.1 + j * .08})` }} />)}</div>
        <div className="cl-v">{c.r}</div>
        <div className="cl-g" style={{ color: 'var(--em)' }}>{c.g}</div>
      </div>
    ))}
    <div className="fu health-wrap" style={{ transitionDelay: '.35s' }}>
      <div className="health-track"><div className="tag">Average Client Health Score</div><div className="health-bar"><div className="health-fill" style={{ width: '87%' }} /></div></div>
      <div className="health-val">87%</div>
    </div>
  </div>);
}

/* ═══════════════════════════════════════
   TAB: FINANCIALS
   ═══════════════════════════════════════ */
function TabFinancials() {
  return (<div className="sec">
    <div className="fu sec-head"><div className="tag">Financial Intelligence</div><div className="h2" style={{ marginTop: 4, fontSize: 36 }}>Canada Financial Performance</div></div>
    <div className="fu fin-grid" style={{ transitionDelay: '.08s' }}>
      {[{ l: 'Revenue', v: '$1.8B', d: '+9.4% YoY' }, { l: 'Op Margin', v: '16.2%', d: '+0.8 pts' }, { l: 'Bookings', v: '$2.1B', d: '+14%' }, { l: 'Pipeline', v: '$3.4B', d: '+18%' }, { l: 'Employees', v: '12,500', d: '+8.2%' }, { l: 'Clients', v: '284', d: '+14 new' }].map(f => (
        <div className="fin-card" key={f.l}><div className="tag">{f.l}</div><div className="val">{f.v}</div><div className="delta" style={{ color: 'var(--em)' }}>{f.d}</div>
          <div className="mini-chart">{Array.from({ length: 8 }, (_, j) => <i key={j} style={{ flex: 1, height: `${20 + Math.random() * 80}%`, background: 'rgba(161,0,255,.25)' }} />)}</div>
        </div>
      ))}
    </div>
    <div className="fu sec-head" style={{ marginTop: 8, transitionDelay: '.15s' }}><div className="tag">Service Line Breakdown</div><div className="h3" style={{ marginTop: 4 }}>Revenue by Service</div></div>
    {[{ n: 'Technology', v: 630, g: 12.8 }, { n: 'Strategy & Consulting', v: 360, g: 7.4 }, { n: 'Operations', v: 324, g: 8.1 }, { n: 'Song (Interactive)', v: 270, g: 15.2 }, { n: 'Security', v: 216, g: 22.6 }].map((s, i) => (
      <div className="fu srow" key={s.n} style={{ transitionDelay: `${.2 + i * .05}s` }}>
        <div className="srow-rk">0{i + 1}</div><div className="srow-n">{s.n}</div>
        <div className="srow-track"><div className="srow-fill" style={{ width: `${(s.v / 700) * 100}%` }} /></div>
        <div className="srow-v">${s.v}M</div><div className="srow-d" style={{ color: 'var(--em)' }}>+{s.g}%</div>
      </div>
    ))}
    <div className="fu ai" style={{ marginTop: 24, transitionDelay: '.4s' }}><div className="ai-dot"><span className="ms">auto_awesome</span></div><div><div className="tag">Predictive AI</div><p>FY2026 projected $2.0B (+11%). Security growing fastest. Federal cloud deals expected to close Q1.</p></div></div>
  </div>);
}

/* ═══════════════════════════════════════
   TAB: TALENT
   ═══════════════════════════════════════ */
function TabTalent() {
  const pyr = [{ l: 'Managing Director', c: '1.0K', w: 70 }, { l: 'Senior Manager', c: '1.9K', w: 140 }, { l: 'Manager', c: '2.5K', w: 230 }, { l: 'Consultant', c: '3.4K', w: 340 }, { l: 'Analyst', c: '3.8K', w: 460 }];
  return (<div className="sec">
    <div className="fu" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
      <div><div className="tag">Workforce Analytics</div><div className="h2" style={{ marginTop: 4, fontSize: 36 }}>Talent Intelligence</div><p className="sub" style={{ marginTop: 4 }}>Canada human capital.</p></div>
      <div style={{ display: 'flex', gap: 28 }}>
        <div style={{ textAlign: 'right' }}><div className="tag">Headcount</div><div style={{ fontSize: 28, fontWeight: 900 }}>12,500</div></div>
        <div style={{ textAlign: 'right' }}><div className="tag">Utilization</div><div style={{ fontSize: 28, fontWeight: 900 }}>87.2%</div></div>
      </div>
    </div>
    <div className="fu" style={{ transitionDelay: '.1s' }}><div className="tag">The Talent Stack</div></div>
    <div className="fu pyr-wrap" style={{ transitionDelay: '.15s' }}>
      {pyr.map((p, i) => (<div className="pyr-row" key={p.l}><div className="pyr-label">{p.l}</div><div className="pyr-shape" style={{ width: p.w, background: `rgba(161,0,255,${1 - i * .16})` }}>{p.w >= 200 && <span>{p.c}</span>}</div>{p.w < 200 && <div className="pyr-count">{p.c}</div>}</div>))}
    </div>
    <div className="fu" style={{ marginTop: 32, transitionDelay: '.25s' }}><div className="tag">Skill Alignment</div></div>
    <div className="fu align-row" style={{ marginTop: 12, transitionDelay: '.3s' }}>
      {[{ l: 'Cloud', p: 22 }, { l: 'AI/ML', p: 13 }, { l: 'Data', p: 15 }, { l: 'Security', p: 9 }, { l: 'SAP', p: 11 }, { l: 'Other', p: 30 }].map(a => (
        <div className="align-cell" key={a.l}><div className="tag">{a.l}</div><div className="val">{a.p}%</div><div className="align-bar"><i style={{ width: `${a.p * 2.5}%` }} /></div></div>
      ))}
    </div>
    <div className="fu ai" style={{ marginTop: 32, transitionDelay: '.35s' }}><div className="ai-dot"><span className="ms">auto_awesome</span></div><div><div className="tag">Predictive AI</div><p>AI/ML growing +34% — fastest capability. 340 open positions, mostly Toronto & Montreal. Cloud & Infra remains largest pool at 2,800.</p></div></div>
  </div>);
}

/* ═══════════════════════════════════════
   CLIENT MODAL
   ═══════════════════════════════════════ */
function ClientModal({ c, rank, close }: { c: typeof CLIENTS[0]; rank: number; close: () => void }) {
  const sc = (s: string) => s === 'Active' ? 'var(--em)' : s === 'Planning' ? 'var(--amber)' : 'var(--t3)';
  return (<div className="modal">
    <button className="modal-close" onClick={close}><span className="ms">close</span></button>
    <div className="modal-hero"><div className="glow" />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-end', gap: 16, width: '100%' }}>
        <div style={{ width: 52, height: 52, borderRadius: 12, background: 'rgba(255,255,255,.08)', border: '1px solid var(--s3)', display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 900, color: 'var(--p)' }}>{c.init}</div>
        <div style={{ flex: 1 }}><div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-.02em' }}>{c.n}</div><div style={{ fontSize: 10, color: 'var(--t2)', marginTop: 2 }}>{c.s} · {c.hq}</div></div>
        <div style={{ textAlign: 'right' }}><div style={{ fontSize: 9, fontWeight: 800, color: 'var(--p)', letterSpacing: '.1em' }}>#{String(rank + 1).padStart(2, '0')} CANADA</div></div>
      </div>
    </div>
    <div className="modal-body">
      <div className="modal-grid">
        <div className="modal-card"><div className="tag">Revenue</div><div className="val">{c.r}</div><div className="delta" style={{ color: 'var(--em)' }}>{c.g}</div></div>
        <div className="modal-card"><div className="tag">Impact Score</div><div className="val">{c.score}</div><div className="delta" style={{ color: 'var(--em)' }}>Top {100 - c.score}%</div></div>
      </div>
      <div className="tag" style={{ marginTop: 8 }}>Key Projects</div>
      <div style={{ marginTop: 12 }}>{c.projects.map(p => (
        <div key={p.t} style={{ display: 'flex', gap: 12, padding: '10px 0' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', marginTop: 4, flexShrink: 0, background: sc(p.s) }} />
          <div><div style={{ fontSize: 12, fontWeight: 700 }}>{p.t} <span style={{ fontSize: 8, fontWeight: 700, color: sc(p.s), letterSpacing: '.08em', textTransform: 'uppercase' as const, marginLeft: 6 }}>{p.s}</span></div><p style={{ fontSize: 10, color: 'var(--t3)', marginTop: 2 }}>{p.d}</p></div>
        </div>
      ))}</div>
      <div className="tag" style={{ marginTop: 16 }}>Account Team</div>
      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>{c.team.map(t => (
        <div key={t.n} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--s1)', border: '1px solid var(--s2)', borderRadius: 8, padding: '8px 12px', flex: 1 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(161,0,255,.1)', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 800, color: 'var(--p)' }}>{t.i}</div>
          <div><div style={{ fontSize: 11, fontWeight: 700 }}>{t.n}</div><div style={{ fontSize: 8, color: 'var(--t3)', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '.08em' }}>{t.r}</div></div>
        </div>
      ))}</div>
    </div>
  </div>);
}
