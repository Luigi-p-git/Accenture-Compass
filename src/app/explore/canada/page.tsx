'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DrumPicker from '@/components/ui/DrumPicker';
import type { TrendsData } from '@/types';

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

/* ── Industry KPI data (dummy per vertical, "all" = real totals) ── */
const INDUSTRY_KPIS: Record<string, { l: string; v: string; d: string }[]> = {
  'all':                        [{ l: 'Revenue', v: '$1.8B', d: '+9.4%' }, { l: 'Utilization', v: '87.2%', d: '+1.4pts' }, { l: 'Headcount', v: '12,500', d: '+8.2%' }, { l: 'Clients', v: '284', d: '+14' }],
  'banking-capital-markets':    [{ l: 'Revenue', v: '$410M', d: '+8.6%' }, { l: 'Utilization', v: '91.3%', d: '+2.1pts' }, { l: 'Headcount', v: '2,840', d: '+6.4%' }, { l: 'Clients', v: '42', d: '+3' }],
  'cgs-retail-travel':          [{ l: 'Revenue', v: '$185M', d: '+11.2%' }, { l: 'Utilization', v: '84.7%', d: '+0.8pts' }, { l: 'Headcount', v: '1,320', d: '+9.1%' }, { l: 'Clients', v: '38', d: '+5' }],
  'chemicals-natural-resources':[{ l: 'Revenue', v: '$220M', d: '+6.1%' }, { l: 'Utilization', v: '86.1%', d: '+1.2pts' }, { l: 'Headcount', v: '1,580', d: '+4.3%' }, { l: 'Clients', v: '24', d: '+2' }],
  'communications-media':       [{ l: 'Revenue', v: '$100M', d: '+5.3%' }, { l: 'Utilization', v: '82.4%', d: '-0.6pts' }, { l: 'Headcount', v: '720', d: '+3.1%' }, { l: 'Clients', v: '18', d: '+1' }],
  'energy':                     [{ l: 'Revenue', v: '$320M', d: '+7.8%' }, { l: 'Utilization', v: '88.6%', d: '+1.9pts' }, { l: 'Headcount', v: '2,100', d: '+5.6%' }, { l: 'Clients', v: '31', d: '+2' }],
  'health':                     [{ l: 'Revenue', v: '$95M', d: '+14.8%' }, { l: 'Utilization', v: '85.2%', d: '+2.4pts' }, { l: 'Headcount', v: '680', d: '+12.1%' }, { l: 'Clients', v: '16', d: '+3' }],
  'high-tech':                  [{ l: 'Revenue', v: '$520M', d: '+14.2%' }, { l: 'Utilization', v: '89.8%', d: '+2.8pts' }, { l: 'Headcount', v: '3,600', d: '+11.4%' }, { l: 'Clients', v: '52', d: '+6' }],
  'industrials':                [{ l: 'Revenue', v: '$145M', d: '+9.6%' }, { l: 'Utilization', v: '86.9%', d: '+1.1pts' }, { l: 'Headcount', v: '1,040', d: '+7.2%' }, { l: 'Clients', v: '22', d: '+2' }],
  'insurance':                  [{ l: 'Revenue', v: '$130M', d: '+10.4%' }, { l: 'Utilization', v: '90.1%', d: '+1.8pts' }, { l: 'Headcount', v: '940', d: '+8.6%' }, { l: 'Clients', v: '19', d: '+1' }],
  'life-sciences':              [{ l: 'Revenue', v: '$170M', d: '+19.4%' }, { l: 'Utilization', v: '84.3%', d: '+3.2pts' }, { l: 'Headcount', v: '1,220', d: '+15.8%' }, { l: 'Clients', v: '14', d: '+4' }],
  'public-service':             [{ l: 'Revenue', v: '$280M', d: '+11.8%' }, { l: 'Utilization', v: '83.7%', d: '+0.4pts' }, { l: 'Headcount', v: '1,960', d: '+9.3%' }, { l: 'Clients', v: '8', d: '+1' }],
  'software-platforms':         [{ l: 'Revenue', v: '$240M', d: '+16.7%' }, { l: 'Utilization', v: '91.6%', d: '+3.4pts' }, { l: 'Headcount', v: '1,680', d: '+13.2%' }, { l: 'Clients', v: '28', d: '+3' }],
  'utilities':                  [{ l: 'Revenue', v: '$85M', d: '+4.2%' }, { l: 'Utilization', v: '81.9%', d: '-0.3pts' }, { l: 'Headcount', v: '620', d: '+2.8%' }, { l: 'Clients', v: '11', d: '+1' }],
};

/* ── Deterministic scale factors per industry (used to morph all charts/lists) ── */
const INDUSTRY_SCALES: Record<string, { rev: number; sector: number[]; client: number[]; fin: number; svc: number[] }> = {
  'all':                        { rev: 1, sector: [1,1,1,1,1,1], client: [1,1,1,1,1,1,1,1,1,1], fin: 1, svc: [1,1,1,1,1] },
  'banking-capital-markets':    { rev: .72, sector: [.3,1.6,.2,.4,.5,.3], client: [.2,1.8,.1,1.6,.1,.1,1.4,.1,.1,.2], fin: .72, svc: [.8,1.2,.6,.4,1.1] },
  'cgs-retail-travel':          { rev: .38, sector: [.6,.2,.1,.3,.4,1.4], client: [.3,.2,.1,.2,.1,1.5,.2,.1,.1,.3], fin: .38, svc: [.9,.7,1.3,1.5,.4] },
  'chemicals-natural-resources':{ rev: .48, sector: [.2,.3,1.8,.2,.6,.2], client: [.1,.2,.1,.2,1.6,.1,.1,.1,1.4,.1], fin: .48, svc: [1.1,.6,1.2,.3,.8] },
  'communications-media':       { rev: .22, sector: [.4,.2,.1,.2,.3,1.8], client: [.1,.2,.1,.1,.1,1.8,.2,.1,.1,.3], fin: .22, svc: [.7,.5,.6,1.6,.5] },
  'energy':                     { rev: .56, sector: [.3,.2,1.6,.1,.4,.3], client: [.1,.1,.1,.2,1.8,.1,.1,.1,1.5,.1], fin: .56, svc: [1.2,.5,1.1,.3,.9] },
  'health':                     { rev: .18, sector: [.2,.1,.1,.3,1.8,.2], client: [.1,.1,.3,.1,.1,.2,.3,.4,.1,.1], fin: .18, svc: [1.1,1.3,.5,.6,.7] },
  'high-tech':                  { rev: .92, sector: [1.8,.3,.2,.4,.3,.5], client: [1.6,.2,.1,.2,.1,.3,.2,.1,.2,1.4], fin: .92, svc: [1.4,.8,.5,1.2,.9] },
  'industrials':                { rev: .30, sector: [.4,.2,1.2,.3,.4,.3], client: [.2,.1,.2,.1,.8,.3,.1,.2,.6,.2], fin: .30, svc: [1.0,.8,1.4,.3,.7] },
  'insurance':                  { rev: .28, sector: [.2,1.4,.1,.3,.5,.2], client: [.1,1.2,.1,1.3,.1,.2,1.5,.1,.1,.2], fin: .28, svc: [.7,1.3,.8,.4,1.0] },
  'life-sciences':              { rev: .34, sector: [.3,.1,.3,.2,1.8,.2], client: [.1,.1,.2,.1,.1,.2,.4,.3,.1,.1], fin: .34, svc: [1.0,1.1,.4,.7,.8] },
  'public-service':             { rev: .50, sector: [.3,.2,.2,1.6,.5,.4], client: [.1,.1,1.8,.1,.1,.3,.2,1.5,.2,.1], fin: .50, svc: [.9,1.0,1.3,.5,.6] },
  'software-platforms':         { rev: .46, sector: [1.5,.2,.1,.3,.2,.6], client: [1.4,.3,.1,.2,.1,.4,.2,.1,.2,1.2], fin: .46, svc: [1.3,.9,.4,1.4,.7] },
  'utilities':                  { rev: .16, sector: [.2,.1,.8,.2,.3,.4], client: [.1,.1,.2,.1,.6,.3,.1,.2,.5,.1], fin: .16, svc: [.8,.5,1.2,.3,1.1] },
};

const getScale = (industry: string) => INDUSTRY_SCALES[industry] || INDUSTRY_SCALES['all'];

/* ═══════════════════════════════════════
   MAIN
   ═══════════════════════════════════════ */
export default function CanadaDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState(0);
  const [modal, setModal] = useState<number | null>(null);
  const [industry, setIndustry] = useState('all');
  const onIndustryChange = useCallback((key: string) => setIndustry(key), []);
  const cntRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(e => e.forEach(x => { if (x.isIntersecting) x.target.classList.add('v'); }), { threshold: 0.08 });
    const t = setTimeout(() => cntRef.current?.querySelectorAll('.fu').forEach(el => obs.observe(el)), 60);
    return () => { clearTimeout(t); obs.disconnect(); };
  }, [tab]);

  const go = (i: number) => { setTab(i); if (cntRef.current) cntRef.current.scrollTop = 0; };

  // Fetch dynamic trends data (AlphaSense)
  const [trendsData, setTrendsData] = useState<TrendsData | undefined>();
  useEffect(() => {
    fetch('/api/data?country=canada&topic=trends&industry=')
      .then(r => r.ok ? r.json() : null)
      .then(d => d?.data ? setTrendsData(d.data) : null)
      .catch(() => {});
  }, []);

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
        <div style={{ padding: '12px 8px', marginTop: 'auto' }}>
          <button
            onClick={() => router.push('/explore/canada/intelligence')}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(161,0,255,.15)',
              background: 'rgba(161,0,255,.04)', cursor: 'pointer',
              transition: 'all .2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(161,0,255,.1)'; e.currentTarget.style.borderColor = 'rgba(161,0,255,.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(161,0,255,.04)'; e.currentTarget.style.borderColor = 'rgba(161,0,255,.15)'; }}
          >
            <span className="ms" style={{ fontSize: 18, color: '#A100FF' }}>auto_stories</span>
            <div>
              <div style={{ fontSize: 10, fontWeight: 900, color: '#fff', letterSpacing: '-.01em', textAlign: 'left' }}>AccSense Magazine</div>
              <div style={{ fontSize: 7, fontWeight: 600, color: 'rgba(255,255,255,.3)', letterSpacing: '.06em', textTransform: 'uppercase', textAlign: 'left' }}>Intelligence Report</div>
            </div>
          </button>
        </div>
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
          <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderRight: '1px solid var(--s2)' }}>
            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.2em', color: 'var(--p)', textTransform: 'uppercase' }}>Canada</span>
            <div style={{ width: 1, height: 20, background: 'var(--s2)' }} />
            <DrumPicker value={industry} onChange={onIndustryChange} />
          </div>
          {(INDUSTRY_KPIS[industry] || INDUSTRY_KPIS['all']).map(k => (
            <div className="kpi" key={k.l} style={{ transition: 'opacity .2s', animation: 'fadeIn .3s' }}>
              <div className="tag">{k.l}</div><div className="val" style={{ fontSize: 22 }}>{k.v}</div><div className="delta" style={{ color: 'var(--em)' }}>{k.d}</div>
            </div>
          ))}
        </div>

        <div className="cnt" ref={cntRef}>
          {tab === 0 && <TabOverview onNav={go} industry={industry} />}
          {tab === 1 && <TabMacro />}
          {tab === 2 && <TabTrends data={trendsData} />}
          {tab === 3 && <TabIndustries openClient={setModal} />}
          {tab === 4 && <TabFinancials industry={industry} />}
          {tab === 5 && <TabTalent industry={industry} />}
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
   REVENUE CHART (CSS bars, fixed scale)
   ═══════════════════════════════════════ */
const FIXED_REV_MAX = 2100; // fixed ceiling so bars shrink across industries
function RevChart({ revD, growthD }: { revD: { yr: string; rev: number }[]; growthD: number[]; mx: number }) {
  const localMax = Math.max(...revD.map(d => d.rev));
  return (
    <div style={{ height: 300, background: 'var(--s1)', border: '1px solid var(--s2)', borderRadius: 14, padding: '20px 24px 12px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: '100%' }}>
        {revD.map((d, i) => {
          const pct = (d.rev / FIXED_REV_MAX) * 100;
          const isPeak = d.rev === localMax;
          const g = growthD[i];
          return (
            <div key={d.yr} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, height: '100%', justifyContent: 'flex-end' }}>
              {/* Revenue label */}
              <span style={{
                fontSize: 10, fontWeight: 800, marginBottom: 6,
                color: isPeak ? '#fff' : 'var(--t3)',
                transition: 'color .4s',
              }}>
                ${d.rev >= 1000 ? `${(d.rev/1000).toFixed(1)}B` : `${d.rev}M`}
              </span>
              {/* Bar */}
              <div style={{
                width: '60%', borderRadius: '6px 6px 0 0',
                height: `${pct}%`,
                background: isPeak
                  ? 'linear-gradient(180deg, rgba(161,0,255,.9), rgba(161,0,255,.35))'
                  : 'linear-gradient(180deg, rgba(161,0,255,.35), rgba(161,0,255,.08))',
                boxShadow: isPeak ? '0 0 24px rgba(161,0,255,.3)' : 'none',
                transition: 'height .6s cubic-bezier(.16,1,.3,1), background .4s, box-shadow .4s',
                display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center',
                paddingBottom: 8, minHeight: 28,
                position: 'relative',
              }}>
                {/* Growth badge inside bar */}
                {i > 0 && (
                  <span style={{
                    fontSize: 8, fontWeight: 800,
                    color: g > 0 ? '#34d399' : 'var(--red)',
                    background: 'rgba(0,0,0,.45)',
                    padding: '2px 6px', borderRadius: 4,
                    backdropFilter: 'blur(4px)',
                    whiteSpace: 'nowrap',
                  }}>
                    {g > 0 ? '+' : ''}{g}%
                  </span>
                )}
              </div>
              {/* Year label */}
              <span style={{ fontSize: 9, fontWeight: 700, color: isPeak ? 'var(--t2)' : 'var(--t4)', marginTop: 8 }}>{d.yr}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   TAB: OVERVIEW
   ═══════════════════════════════════════ */
function TabOverview({ onNav, industry }: { onNav: (i: number) => void; industry: string }) {
  const sc = getScale(industry);
  const baseYears = [
    { yr: 'FY21', rev: 1120 },
    { yr: 'FY22', rev: 1280 },
    { yr: 'FY23', rev: 1420 },
    { yr: 'FY24', rev: 1580 },
    { yr: 'FY25', rev: 1800 },
  ];
  const revD = baseYears.map(d => ({ yr: d.yr, rev: Math.round(d.rev * sc.rev) }));
  const growthD = revD.map((d, i) => i === 0 ? 0 : +((d.rev / revD[i-1].rev - 1) * 100).toFixed(1));
  const mx = Math.max(...revD.map(d => d.rev), 1);

  return (<>
    {/* ── Editorial Bento Grid ── */}
    <div style={{ padding: '28px 48px 0' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.4fr 1fr 1fr',
        gridTemplateRows: '200px 180px',
        gridTemplateAreas: `"fin tal ind" "tre tre mac"`,
        gap: 12,
      }}>
        {/* ── Financial Performance ── */}
        <div className="bento-tile" onClick={() => onNav(4)} style={{ gridArea: 'fin', background: 'linear-gradient(145deg, rgba(161,0,255,.04) 0%, rgba(10,10,10,.6) 100%)', borderRadius: 16, padding: '28px 28px 20px', cursor: 'pointer', position: 'relative', overflow: 'hidden', transition: 'all .35s cubic-bezier(.16,1,.3,1)', border: '1px solid rgba(255,255,255,.04)' }}>
          <div className="bento-glow" style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, background: 'radial-gradient(circle, rgba(161,0,255,.1), transparent 70%)', pointerEvents: 'none', opacity: 0, transition: 'opacity .4s' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: '.2em', color: 'var(--p)', textTransform: 'uppercase' }}>Explore</span>
              <h3 style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: '-.03em', lineHeight: 1.1, marginTop: 4 }}>Financial<br/>Performance</h3>
              <p style={{ fontSize: 10, color: 'var(--t3)', lineHeight: 1.7, marginTop: 8, maxWidth: 200 }}>Revenue dynamics, service lines, and growth trajectory.</p>
            </div>
            <span className="ms bento-arrow" style={{ fontSize: 18, color: 'var(--t4)', transition: 'all .3s', marginTop: 4 }}>north_east</span>
          </div>
          {/* Bar chart visual — prominent, right-aligned */}
          <div style={{ position: 'absolute', bottom: 16, right: 20, display: 'flex', alignItems: 'flex-end', gap: 6, height: 120, width: 220 }}>
            {revD.map((d, j) => {
              const pct = (d.rev / FIXED_REV_MAX) * 100;
              const isLast = j === revD.length - 1;
              return (
                <div key={d.yr} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                  <div style={{
                    width: '100%', borderRadius: '5px 5px 2px 2px',
                    height: `${pct}%`,
                    background: isLast
                      ? 'linear-gradient(180deg, rgba(161,0,255,.85), rgba(161,0,255,.3))'
                      : `linear-gradient(180deg, rgba(161,0,255,${0.12 + j * 0.06}), rgba(161,0,255,${0.04 + j * 0.02}))`,
                    transition: 'height .6s cubic-bezier(.16,1,.3,1)',
                    boxShadow: isLast ? '0 -4px 20px rgba(161,0,255,.25)' : 'none',
                  }} />
                  <span style={{ fontSize: 8, color: isLast ? 'var(--t2)' : 'var(--t4)', fontWeight: 700 }}>{d.yr.slice(2)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Talent Intelligence ── */}
        <div className="bento-tile" onClick={() => onNav(5)} style={{ gridArea: 'tal', background: 'linear-gradient(160deg, rgba(52,211,153,.03) 0%, rgba(10,10,10,.4) 100%)', borderRadius: 16, padding: '28px 24px 20px', cursor: 'pointer', position: 'relative', overflow: 'hidden', transition: 'all .35s cubic-bezier(.16,1,.3,1)', border: '1px solid rgba(255,255,255,.04)' }}>
          <div className="bento-glow" style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, background: 'radial-gradient(circle, rgba(52,211,153,.1), transparent 70%)', pointerEvents: 'none', opacity: 0, transition: 'opacity .4s' }} />
          <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: '.2em', color: '#34d399', textTransform: 'uppercase' }}>Explore</span>
          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: '-.02em', lineHeight: 1.15, marginTop: 4 }}>Talent<br/>Intelligence</h3>
          <p style={{ fontSize: 10, color: 'var(--t3)', lineHeight: 1.7, marginTop: 6 }}>Workforce, skills &amp; city mapping.</p>
          <span className="ms bento-arrow" style={{ position: 'absolute', top: 24, right: 20, fontSize: 18, color: 'var(--t4)', transition: 'all .3s' }}>north_east</span>
          {/* Pyramid */}
          <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            {[
              { w: 28, label: 'MD' },
              { w: 48, label: 'SM' },
              { w: 72, label: 'MGR' },
              { w: 100, label: 'CON' },
              { w: 130, label: 'ANL' },
            ].map((b, j) => (
              <div key={j} style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: b.w, height: 8, borderRadius: 2, background: `rgba(52,211,153,${.75 - j * .13})` }} />
                {b.w >= 72 && <span style={{ position: 'absolute', fontSize: 6, fontWeight: 800, color: 'rgba(255,255,255,.5)', letterSpacing: '.08em' }}>{b.label}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* ── Industries ── */}
        <div className="bento-tile" onClick={() => onNav(3)} style={{ gridArea: 'ind', background: 'linear-gradient(160deg, rgba(255,255,255,.02) 0%, rgba(10,10,10,.3) 100%)', borderRadius: 16, padding: '28px 24px 16px', cursor: 'pointer', position: 'relative', overflow: 'hidden', transition: 'all .35s cubic-bezier(.16,1,.3,1)', border: '1px solid rgba(255,255,255,.04)' }}>
          <div className="bento-glow" style={{ position: 'absolute', bottom: -40, left: -40, width: 140, height: 140, background: 'radial-gradient(circle, rgba(161,0,255,.08), transparent 70%)', pointerEvents: 'none', opacity: 0, transition: 'opacity .4s' }} />
          <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: '.2em', color: 'var(--p)', textTransform: 'uppercase' }}>Explore</span>
          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: '-.02em', lineHeight: 1.15, marginTop: 4 }}>Client<br/>Industries</h3>
          <span className="ms bento-arrow" style={{ position: 'absolute', top: 24, right: 20, fontSize: 18, color: 'var(--t4)', transition: 'all .3s' }}>north_east</span>
          {/* Sector bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 16 }}>
            {SECTORS.slice(0, 4).map((s, j) => {
              const sv = Math.round(s.v * (sc.sector[j] ?? 1));
              return (
                <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 7, fontWeight: 700, color: 'var(--t4)', width: 52, flexShrink: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{s.n}</span>
                  <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,.03)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 2, width: `${(sv / 550) * 100}%`, background: `rgba(161,0,255,${0.25 + j * 0.08})`, transition: 'width .6s cubic-bezier(.16,1,.3,1)' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Strategic Trends (wide) ── */}
        <div className="bento-tile" onClick={() => onNav(2)} style={{ gridArea: 'tre', background: 'linear-gradient(145deg, rgba(251,191,36,.03) 0%, rgba(10,10,10,.4) 100%)', borderRadius: 16, padding: '28px 28px 20px', cursor: 'pointer', position: 'relative', overflow: 'hidden', transition: 'all .35s cubic-bezier(.16,1,.3,1)', border: '1px solid rgba(255,255,255,.04)' }}>
          <div className="bento-glow" style={{ position: 'absolute', top: -40, left: -40, width: 160, height: 160, background: 'radial-gradient(circle, rgba(251,191,36,.06), transparent 70%)', pointerEvents: 'none', opacity: 0, transition: 'opacity .4s' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: '.2em', color: 'var(--amber)', textTransform: 'uppercase' }}>Explore</span>
              <h3 style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: '-.03em', lineHeight: 1.1, marginTop: 4 }}>Strategic Landscape</h3>
              <p style={{ fontSize: 10, color: 'var(--t3)', lineHeight: 1.7, marginTop: 6 }}>Challenges, opportunities, and the emerging signals shaping this market.</p>
            </div>
            <span className="ms bento-arrow" style={{ fontSize: 18, color: 'var(--t4)', transition: 'all .3s', marginTop: 4 }}>north_east</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 16 }}>
            {['AI Corridor', 'Green Energy', 'Open Banking', 'Digital Government', 'Critical Minerals', 'Talent Shift'].map(t => (
              <span key={t} style={{ fontSize: 9, fontWeight: 600, padding: '5px 12px', borderRadius: 99, background: 'rgba(251,191,36,.04)', border: '1px solid rgba(251,191,36,.1)', color: 'rgba(251,191,36,.6)', letterSpacing: '.01em' }}>{t}</span>
            ))}
          </div>
        </div>

        {/* ── Economic Pulse ── */}
        <div className="bento-tile" onClick={() => onNav(1)} style={{ gridArea: 'mac', background: 'linear-gradient(160deg, rgba(96,165,250,.03) 0%, rgba(10,10,10,.4) 100%)', borderRadius: 16, padding: '28px 24px 20px', cursor: 'pointer', position: 'relative', overflow: 'hidden', transition: 'all .35s cubic-bezier(.16,1,.3,1)', border: '1px solid rgba(255,255,255,.04)' }}>
          <div className="bento-glow" style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, background: 'radial-gradient(circle, rgba(96,165,250,.08), transparent 70%)', pointerEvents: 'none', opacity: 0, transition: 'opacity .4s' }} />
          <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: '.2em', color: '#60a5fa', textTransform: 'uppercase' }}>Explore</span>
          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: '-.02em', lineHeight: 1.15, marginTop: 4 }}>Economic<br/>Pulse</h3>
          <span className="ms bento-arrow" style={{ position: 'absolute', top: 24, right: 20, fontSize: 18, color: 'var(--t4)', transition: 'all .3s' }}>north_east</span>
          {/* Wave visual */}
          <svg viewBox="0 0 200 50" style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 60, opacity: .35 }} preserveAspectRatio="none">
            <path d="M0,40 C40,15 70,45 110,22 C140,6 170,35 200,18" fill="none" stroke="#60a5fa" strokeWidth="2" />
            <path d="M0,44 C40,25 70,48 110,30 C140,16 170,40 200,28" fill="none" stroke="rgba(161,0,255,.5)" strokeWidth="1.5" />
            <path d="M0,40 C40,15 70,45 110,22 C140,6 170,35 200,18 L200,50 L0,50 Z" fill="url(#blueWash)" />
            <defs><linearGradient id="blueWash" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgba(96,165,250,.08)" /><stop offset="100%" stopColor="transparent" /></linearGradient></defs>
          </svg>
        </div>
      </div>
    </div>
    {/* 5-Year Revenue Trend + Growth Line */}
    <div className="sec">
      <div className="fu sec-head">
        <div className="tag">Financial Performance</div>
        <div className="h2" style={{ marginTop: 4 }}>Revenue Trend — 5 Year</div>
        <p className="sub" style={{ marginTop: 4 }}>Annual revenue (bars) with YoY growth rate (line) · CAD</p>
      </div>
      <div className="fu" style={{ transitionDelay: '.1s' }}>
        <RevChart revD={revD} growthD={growthD} mx={mx} />
      </div>
    </div>

    {/* Revenue by Client Group */}
    <div className="sec" style={{ paddingTop: 0 }}>
      <div className="fu sec-head"><div className="tag">Sector Intelligence</div><div className="h2" style={{ marginTop: 4 }}>Revenue by Client Group</div></div>
      {SECTORS.map((s, i) => {
        const sv = Math.round(s.v * (sc.sector[i] ?? 1));
        const sg = +(s.g * (sc.sector[i] ?? 1)).toFixed(1);
        return (
        <div className="fu srow" key={s.n} style={{ transitionDelay: `${i * .05}s` }} onClick={() => onNav(3)}>
          <div className="srow-rk">0{i + 1}</div><div className="srow-n">{s.n}</div>
          <div className="srow-track"><div className="srow-fill" style={{ width: `${(sv / 550) * 100}%`, transition: 'width .6s cubic-bezier(.16,1,.3,1)' }} /></div>
          <div className="srow-v" style={{ transition: 'opacity .3s' }}>${sv}M</div><div className="srow-d" style={{ color: 'var(--em)', transition: 'opacity .3s' }}>+{sg}%</div>
        </div>
        );
      })}
    </div>

    {/* Top 10 Clients */}
    <div className="sec" style={{ paddingTop: 0 }}>
      <div className="fu sec-head"><div className="tag">Client Intelligence</div><div className="h2" style={{ marginTop: 4 }}>Top 10 Clients — Canada</div></div>
      {[
        { n: 'Royal Bank of Canada', init: 'RBC', sector: 'Financial Services', rev: 68, g: 12 },
        { n: 'Shopify', init: 'SH', sector: 'Technology', rev: 68, g: 18 },
        { n: 'Government of Canada', init: 'GoC', sector: 'Public Services', rev: 62, g: 18 },
        { n: 'TD Bank Group', init: 'TD', sector: 'Financial Services', rev: 54, g: 8 },
        { n: 'Suncor Energy', init: 'SU', sector: 'Energy & Resources', rev: 42, g: 6 },
        { n: 'Bell Canada', init: 'BCE', sector: 'Communications', rev: 38, g: 10 },
        { n: 'Manulife Financial', init: 'MFC', sector: 'Financial Services', rev: 35, g: 14 },
        { n: 'Province of Ontario', init: 'ON', sector: 'Public Services', rev: 32, g: 22 },
        { n: 'Enbridge', init: 'ENB', sector: 'Energy & Resources', rev: 30, g: 4 },
        { n: 'OpenText', init: 'OT', sector: 'Technology', rev: 28, g: 12 },
      ].map((c, i) => {
        const cScale = sc.client[i] ?? 1;
        const scaledRev = Math.round(c.rev * cScale);
        const scaledG = +(c.g * cScale).toFixed(0);
        const opacity = 1 - i * 0.07;
        const barPct = (scaledRev / 80) * 100;
        return (
        <div className="fu cl-row" key={c.n} style={{ transitionDelay: `${i * .04}s` }}>
          <div className="cl-rk" style={{ fontSize: 14 }}>{String(i + 1).padStart(2, '0')}</div>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: `rgba(161,0,255,${0.08 + i * 0.02})`, border: '1px solid rgba(161,0,255,.15)', display: 'grid', placeItems: 'center', fontSize: 9, fontWeight: 900, color: `rgba(161,0,255,${opacity})`, flexShrink: 0, letterSpacing: '.02em' }}>{c.init}</div>
          <div className="cl-info"><div className="cl-n">{c.n}</div><div className="cl-s">{c.sector}</div></div>
          <div className="cl-spark" style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${Math.min(barPct, 100)}%`, background: 'linear-gradient(180deg, rgba(161,0,255,.5), rgba(161,0,255,.1))', borderRadius: 4, transition: 'height .6s cubic-bezier(.16,1,.3,1)' }} />
          </div>
          <div className="cl-v">${scaledRev}M</div>
          <div className="cl-g" style={{ color: 'var(--em)' }}>+{scaledG}%</div>
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
function TabTrends({ data }: { data?: TrendsData }) {
  const [open, setOpen] = useState<number | null>(null);

  const challenges = data?.challenges ?? [
    { t: 'Housing Affordability Crisis', d: 'Toronto and Vancouver housing costs impacting talent attraction. Avg home price 12x median income. Remote work adoption partially offsetting, but in-person client delivery suffering.', severity: 'high' as const, ic: 'home' },
    { t: 'US Trade Tensions', d: 'Potential tariff escalation affecting cross-border supply chains. Auto, lumber, and energy sectors most exposed. $15B bilateral trade at risk.', severity: 'high' as const, ic: 'warning' },
    { t: 'Tech Sector Rationalization', d: 'Layoffs at Shopify (-20%), Hootsuite, Wealthsimple. Near-term IT spend reduction, but creates cost optimization consulting opportunity.', severity: 'medium' as const, ic: 'trending_down' },
    { t: 'Interest Rate Uncertainty', d: 'BoC rate path unclear — further cuts could stimulate, but inflation persistence may pause easing. Impacts client capital allocation.', severity: 'medium' as const, ic: 'show_chart' },
  ];

  const opportunities = data?.opportunities ?? [
    { t: 'AI/ML Advisory', p: '$120M+', timeline: 'FY25–27', d: 'Toronto-Montreal AI Corridor. Vector Institute, Mila partnerships. Enterprise AI transformation across FS and healthcare.', ic: 'psychology' },
    { t: 'Federal Cloud Migration', p: '$85M+', timeline: 'FY25–28', d: 'Cloud-first policy, $4.2B IT budget. SAP, ServiceNow, AWS/Azure. 14 departments in pipeline.', ic: 'cloud' },
    { t: 'Energy Transition', p: '$60M+', timeline: 'FY25–30', d: 'Carbon capture, hydrogen, renewables. Suncor, TC Energy, Enbridge all pivoting. Alberta clean tech corridor.', ic: 'eco' },
    { t: 'Open Banking', p: '$45M+', timeline: 'FY25–27', d: 'Big Five banks + 20 fintechs. API infrastructure, compliance, consumer experience redesign.', ic: 'account_balance' },
  ];

  const trends = data?.trends ?? [
    { t: 'AI Corridor Expansion', tag: 'Technology', d: 'Toronto-Montreal AI corridor — $4.8B venture investment. Enterprise AI consulting demand surging across FS and healthcare.', ic: 'psychology' },
    { t: 'Green Energy Transition', tag: 'Sustainability', d: 'Net-Zero 2050 driving $120B clean energy infrastructure — hydrogen, carbon capture across AB and BC.', ic: 'eco' },
    { t: 'Digital Government', tag: 'Public Sector', d: '$8.2B federal IT modernization budget through 2027. Cloud-first, SAP, ServiceNow.', ic: 'shield' },
    { t: 'Open Banking', tag: 'Financial Services', d: 'Big Five banks + 20 fintechs need API infra, compliance, and CX redesign.', ic: 'account_balance' },
    { t: 'Critical Minerals', tag: 'Resources', d: '$3.8B government investment in lithium, cobalt, nickel — EV supply chain play.', ic: 'bolt' },
    { t: 'Talent Reinvention', tag: 'Workforce', d: '45K transitioning to AI roles. Cloud architects aligning to hyperscaler partnerships.', ic: 'school' },
  ];

  const synthesisText = data?.synthesis || "Canada\u2019s strategic position strengthening \u2014 AI Corridor now ranks #3 globally for AI talent density. $310M+ opportunity pipeline across 4 major themes. Key risk: housing affordability may force hybrid-first talent strategy shift by Q3 2025.";

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
                {o.p && <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--em)' }}>{o.p}</div>}
                {o.timeline && <div style={{ fontSize: 8, fontWeight: 700, color: 'var(--t4)' }}>{o.timeline}</div>}
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
          <p>{synthesisText}</p>
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
function TabFinancials({ industry }: { industry: string }) {
  const sc = getScale(industry);
  const baseFin = [
    { l: 'Revenue', base: 1800, fmt: (v: number) => `$${(v/1000).toFixed(1)}B`, d: '+9.4% YoY' },
    { l: 'Op Margin', base: 16.2, fmt: (v: number) => `${v.toFixed(1)}%`, d: '+0.8 pts' },
    { l: 'Bookings', base: 2100, fmt: (v: number) => `$${(v/1000).toFixed(1)}B`, d: '+14%' },
    { l: 'Pipeline', base: 3400, fmt: (v: number) => `$${(v/1000).toFixed(1)}B`, d: '+18%' },
    { l: 'Employees', base: 12500, fmt: (v: number) => v >= 1000 ? `${(v/1000).toFixed(1)}K` : String(v), d: '+8.2%' },
    { l: 'Clients', base: 284, fmt: (v: number) => String(Math.round(v)), d: '+14 new' },
  ];
  const baseSvc = [{ n: 'Technology', v: 630, g: 12.8 }, { n: 'Strategy & Consulting', v: 360, g: 7.4 }, { n: 'Operations', v: 324, g: 8.1 }, { n: 'Song (Interactive)', v: 270, g: 15.2 }, { n: 'Security', v: 216, g: 22.6 }];
  // Seed mini-chart heights deterministically per industry
  const seed = industry.length;
  const miniH = (i: number, j: number) => 20 + ((seed * 7 + i * 13 + j * 31) % 60);

  return (<div className="sec">
    <div className="fu sec-head"><div className="tag">Financial Intelligence</div><div className="h2" style={{ marginTop: 4, fontSize: 36 }}>Canada Financial Performance</div></div>
    <div className="fu fin-grid" style={{ transitionDelay: '.08s' }}>
      {baseFin.map((f, i) => {
        const scaled = f.base * sc.fin;
        return (
        <div className="fin-card" key={f.l}><div className="tag">{f.l}</div><div className="val">{f.fmt(scaled)}</div><div className="delta" style={{ color: 'var(--em)' }}>{f.d}</div>
          <div className="mini-chart">{Array.from({ length: 8 }, (_, j) => <i key={j} style={{ flex: 1, height: `${miniH(i, j) * sc.fin}%`, background: 'rgba(161,0,255,.25)', transition: 'height .6s cubic-bezier(.16,1,.3,1)' }} />)}</div>
        </div>
        );
      })}
    </div>
    <div className="fu sec-head" style={{ marginTop: 8, transitionDelay: '.15s' }}><div className="tag">Service Line Breakdown</div><div className="h3" style={{ marginTop: 4 }}>Revenue by Service</div></div>
    {baseSvc.map((s, i) => {
      const sv = Math.round(s.v * (sc.svc[i] ?? 1));
      const sg = +(s.g * (sc.svc[i] ?? 1)).toFixed(1);
      return (
      <div className="fu srow" key={s.n} style={{ transitionDelay: `${.2 + i * .05}s` }}>
        <div className="srow-rk">0{i + 1}</div><div className="srow-n">{s.n}</div>
        <div className="srow-track"><div className="srow-fill" style={{ width: `${(sv / 700) * 100}%`, transition: 'width .6s cubic-bezier(.16,1,.3,1)' }} /></div>
        <div className="srow-v">${sv}M</div><div className="srow-d" style={{ color: 'var(--em)' }}>+{sg}%</div>
      </div>
      );
    })}
    <div className="fu ai" style={{ marginTop: 24, transitionDelay: '.4s' }}><div className="ai-dot"><span className="ms">auto_awesome</span></div><div><div className="tag">Predictive AI</div><p>FY2026 projected $2.0B (+11%). Security growing fastest. Federal cloud deals expected to close Q1.</p></div></div>
  </div>);
}

/* ═══════════════════════════════════════
   TAB: TALENT
   ═══════════════════════════════════════ */
function TabTalent({ industry }: { industry: string }) {
  const sc = getScale(industry);
  const basePyr = [{ l: 'Managing Director', c: 1000, w: 70 }, { l: 'Senior Manager', c: 1900, w: 140 }, { l: 'Manager', c: 2500, w: 230 }, { l: 'Consultant', c: 3400, w: 340 }, { l: 'Analyst', c: 3800, w: 460 }];
  const headcount = INDUSTRY_KPIS[industry]?.[2]?.v || '12,500';
  const util = INDUSTRY_KPIS[industry]?.[1]?.v || '87.2%';
  const baseSkills = [{ l: 'Cloud', p: 22 }, { l: 'AI/ML', p: 13 }, { l: 'Data', p: 15 }, { l: 'Security', p: 9 }, { l: 'SAP', p: 11 }, { l: 'Other', p: 30 }];
  // Vary skills by industry seed
  const seed = industry.length;
  const skillScale = (i: number) => 0.4 + ((seed * 7 + i * 17) % 12) / 10;

  return (<div className="sec">
    <div className="fu" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
      <div><div className="tag">Workforce Analytics</div><div className="h2" style={{ marginTop: 4, fontSize: 36 }}>Talent Intelligence</div><p className="sub" style={{ marginTop: 4 }}>Canada human capital.</p></div>
      <div style={{ display: 'flex', gap: 28 }}>
        <div style={{ textAlign: 'right' }}><div className="tag">Headcount</div><div style={{ fontSize: 28, fontWeight: 900 }}>{headcount}</div></div>
        <div style={{ textAlign: 'right' }}><div className="tag">Utilization</div><div style={{ fontSize: 28, fontWeight: 900 }}>{util}</div></div>
      </div>
    </div>
    <div className="fu" style={{ transitionDelay: '.1s' }}><div className="tag">The Talent Stack</div></div>
    <div className="fu pyr-wrap" style={{ transitionDelay: '.15s' }}>
      {basePyr.map((p, i) => {
        const sw = Math.round(p.w * sc.fin);
        const sc2 = Math.round(p.c * sc.fin);
        const label = sc2 >= 1000 ? `${(sc2/1000).toFixed(1)}K` : String(sc2);
        return (<div className="pyr-row" key={p.l}><div className="pyr-label">{p.l}</div><div className="pyr-shape" style={{ width: sw, background: `rgba(161,0,255,${1 - i * .16})`, transition: 'width .6s cubic-bezier(.16,1,.3,1)' }}>{sw >= 200 && <span>{label}</span>}</div>{sw < 200 && <div className="pyr-count">{label}</div>}</div>);
      })}
    </div>
    <div className="fu" style={{ marginTop: 32, transitionDelay: '.25s' }}><div className="tag">Skill Alignment</div></div>
    <div className="fu align-row" style={{ marginTop: 12, transitionDelay: '.3s' }}>
      {baseSkills.map((a, i) => {
        const sp = industry === 'all' ? a.p : Math.round(a.p * skillScale(i));
        return (
        <div className="align-cell" key={a.l}><div className="tag">{a.l}</div><div className="val">{sp}%</div><div className="align-bar"><i style={{ width: `${sp * 2.5}%`, transition: 'width .6s cubic-bezier(.16,1,.3,1)' }} /></div></div>
        );
      })}
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
