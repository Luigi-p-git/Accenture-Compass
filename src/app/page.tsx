'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';

/* ── Data ── */
const COUNTRIES: Record<string, { name: string; route: string; center: [number, number]; kpis: { l: string; v: string; d: string }[] }> = {
  '124': {
    name: 'Canada', route: '/explore/canada', center: [-96, 56],
    kpis: [
      { l: 'Revenue', v: '$1.8B', d: '+9.4% YoY' },
      { l: 'Headcount', v: '12,500', d: '+8.2%' },
      { l: 'Utilization', v: '87.2%', d: '+1.4 pts' },
      { l: 'Clients', v: '284', d: '+14 new' },
      { l: 'Health', v: '87%', d: 'Above target' },
    ],
  },
};

const REGIONS: Record<string, { name: string; ids: string[]; rev: string; headcount: string; countries: number; growth: string; color: string; kpis: { l: string; v: string; d: string }[] }> = {
  americas: { name: 'Americas', ids: ['124','840','484','076','032','152','170','604','862','218','600','858','068','328','780','388','340','320','558','188','591','214','332','044','052','660'], rev: '$28.4B', headcount: '312K', countries: 12, growth: '+9.8%', color: 'rgba(161,0,255,',
    kpis: [{ l: 'Revenue', v: '$28.4B', d: '+9.8%' }, { l: 'Headcount', v: '312K', d: '+6.1%' }, { l: 'Countries', v: '12', d: 'Active' }, { l: 'Growth', v: '+9.8%', d: 'YoY' }, { l: 'Share', v: '44%', d: 'Global' }] },
  emea: { name: 'EMEA', ids: ['826','276','250','380','724','528','056','620','756','040','578','752','208','246','616','203','642','348','300','792','818','710','566','404','504','012','788','434','760','682','784','414','512','634','048','400','368','364','586'], rev: '$22.1B', headcount: '186K', countries: 22, growth: '+7.2%', color: 'rgba(96,165,250,',
    kpis: [{ l: 'Revenue', v: '$22.1B', d: '+7.2%' }, { l: 'Headcount', v: '186K', d: '+4.8%' }, { l: 'Countries', v: '22', d: 'Active' }, { l: 'Growth', v: '+7.2%', d: 'YoY' }, { l: 'Share', v: '34%', d: 'Global' }] },
  apac: { name: 'APAC', ids: ['156','392','410','356','036','360','458','764','704','608','554','702','344','158','096','104','418','116','524','144'], rev: '$13.6B', headcount: '168K', countries: 14, growth: '+14.1%', color: 'rgba(52,211,153,',
    kpis: [{ l: 'Revenue', v: '$13.6B', d: '+14.1%' }, { l: 'Headcount', v: '168K', d: '+12.4%' }, { l: 'Countries', v: '14', d: 'Active' }, { l: 'Growth', v: '+14.1%', d: 'YoY' }, { l: 'Share', v: '22%', d: 'Global' }] },
};

const GLOBAL_KPIS = [
  { l: 'Global Revenue', v: '$64.1B', d: '+8% YoY' },
  { l: 'Op Margin', v: '15.2%', d: '+1.2 pts' },
  { l: 'Headcount', v: '733K+', d: '+4.2%' },
  { l: 'Countries', v: '48', d: 'Active' },
  { l: 'Health Score', v: '84%', d: 'Above target' },
];

function getRegion(id: string): string | null {
  for (const [key, r] of Object.entries(REGIONS)) { if (r.ids.includes(id)) return key; }
  return null;
}

/* ── Component ── */
export default function LandingPage() {
  const router = useRouter();
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [geo, setGeo] = useState<any[]>([]);
  const [hov, setHov] = useState<string | null>(null);
  const [tip, setTip] = useState<{ x: number; y: number; name: string; ok: boolean } | null>(null);
  const [dims, setDims] = useState({ w: 900, h: 480 });
  const [selRegion, setSelRegion] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [zoomTarget, setZoomTarget] = useState<{ cx: number; cy: number; id: string } | null>(null);

  // Active KPIs based on selection
  const activeKpis = selRegion && REGIONS[selRegion] ? REGIONS[selRegion].kpis : GLOBAL_KPIS;
  const activeLabel = selRegion ? REGIONS[selRegion].name : 'Global';

  useEffect(() => {
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(r => r.json())
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((topo: any) => setGeo((feature(topo, topo.objects.countries) as any).features));
  }, []);

  useEffect(() => {
    const fit = () => { if (mapRef.current) { const r = mapRef.current.getBoundingClientRect(); setDims({ w: r.width, h: r.height }); } };
    fit(); window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(e => e.forEach(x => { if (x.isIntersecting) x.target.classList.add('v'); }), { threshold: 0.08 });
    document.querySelectorAll('.fu').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, [geo]);

  const proj = geo.length
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? geoNaturalEarth1().fitSize([dims.w, dims.h], { type: 'FeatureCollection', features: geo } as any)
    : geoNaturalEarth1();
  const pathGen = geoPath(proj);

  const navigateToCountry = (id: string, route: string) => {
    // Get Canada's center for zoom
    const center = COUNTRIES[id]?.center;
    if (center) {
      const pt = proj(center);
      if (pt) setZoomTarget({ cx: pt[0], cy: pt[1], id });
    }
    setTransitioning(true);
    setTip(null);
    setTimeout(() => router.push(route), 1000);
  };

  const regionColors: Record<string, { base: string; hover: string; sel: string; selHover: string; stroke: string }> = {
    americas: { base: 'rgba(161,0,255,.07)', hover: 'rgba(161,0,255,.15)', sel: 'rgba(161,0,255,.2)', selHover: 'rgba(161,0,255,.35)', stroke: 'rgba(161,0,255,.4)' },
    emea: { base: 'rgba(96,165,250,.05)', hover: 'rgba(96,165,250,.12)', sel: 'rgba(96,165,250,.18)', selHover: 'rgba(96,165,250,.3)', stroke: 'rgba(96,165,250,.4)' },
    apac: { base: 'rgba(52,211,153,.05)', hover: 'rgba(52,211,153,.12)', sel: 'rgba(52,211,153,.18)', selHover: 'rgba(52,211,153,.3)', stroke: 'rgba(52,211,153,.4)' },
  };

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', color: '#fff', fontFamily: "'Inter',system-ui,sans-serif" }}>
      {/* Transition overlay */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 200, pointerEvents: transitioning ? 'all' : 'none',
        background: transitioning ? 'radial-gradient(circle at 30% 60%, rgba(161,0,255,.15), rgba(10,10,10,.95) 70%)' : 'transparent',
        opacity: transitioning ? 1 : 0,
        transition: 'opacity .8s cubic-bezier(.4,0,.2,1)',
      }} />

      {/* ── Top Bar ── */}
      <header className="bar" style={{ position: 'sticky', top: 0, zIndex: 40 }}>
        <div className="bar-l">
          <span style={{ fontSize: 14, fontWeight: 900, letterSpacing: '-.02em' }}>accenture</span>
          <div style={{ width: 1, height: 14, background: 'var(--s3)', margin: '0 6px' }} />
          <span style={{ fontSize: 11, fontWeight: 300, color: 'var(--t2)', letterSpacing: '.04em' }}>Compass</span>
        </div>
        <div className="bar-r">
          <button className="cta-g" style={{ fontSize: 10, padding: '7px 16px' }} onClick={() => router.push('/industries')}>Industry Lens</button>
          <button className="cta-g" style={{ fontSize: 10, padding: '7px 16px' }} onClick={() => router.push('/admin')}>Admin</button>
          <div className="av" style={{ background: 'var(--p)', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 800 }}>LP</div>
        </div>
      </header>

      {/* ── Compact Hero ── */}
      <div style={{ position: 'relative', height: 180, overflow: 'hidden' }}>
        <div className="hero-bg" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1462275646964-a0e3c11f18a6?w=1400&q=80')" }} />
        <div className="hero-ov" />
        <div className="hero-glow" style={{ width: 400, height: 400 }} />
        <div style={{ position: 'relative', zIndex: 2, padding: '28px 48px' }}>
          <div className="fu"><div className="badge"><div className="dot" /><span>Live Intelligence</span></div></div>
          <div className="fu" style={{ transitionDelay: '.1s' }}>
            <h1 style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-.03em', lineHeight: 1 }}>Global <span style={{ color: 'var(--p)' }}>Strategic Pulse</span></h1>
          </div>
          <p className="fu" style={{ fontSize: 12, color: 'var(--t2)', marginTop: 8, transitionDelay: '.2s' }}>
            Select a region or country to explore intelligence.
          </p>
        </div>
      </div>

      {/* ── KPI Strip (animated on region change) ── */}
      <div className="kpi-strip" key={activeLabel} style={{ animation: 'fadeIn .4s' }}>
        <div style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', borderRight: '1px solid var(--s2)' }}>
          <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.2em', color: selRegion ? (selRegion === 'americas' ? '#A100FF' : selRegion === 'emea' ? '#60a5fa' : '#34d399') : 'var(--t3)', textTransform: 'uppercase' }}>{activeLabel}</span>
        </div>
        {activeKpis.map((k) => (
          <div className="kpi" key={k.l}>
            <div className="tag">{k.l}</div>
            <div className="val">{k.v}</div>
            <div className="delta" style={{ color: 'var(--em)' }}>{k.d}</div>
          </div>
        ))}
      </div>

      {/* ── World Map ── */}
      <div style={{ padding: '24px 48px 0' }}>
        <div ref={mapRef} style={{ position: 'relative', height: 'calc(100vh - 340px)', minHeight: 360, background: '#060606', border: '1px solid var(--s2)', borderRadius: 14, overflow: 'hidden' }}>

          {/* Region buttons */}
          <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', zIndex: 10, display: 'flex', gap: 4, background: 'rgba(10,10,10,.85)', backdropFilter: 'blur(12px)', padding: '4px 5px', borderRadius: 8, border: '1px solid var(--s2)' }}>
            {[
              { key: 'americas', label: 'Americas', c: '#A100FF' },
              { key: 'emea', label: 'EMEA', c: '#60a5fa' },
              { key: 'apac', label: 'APAC', c: '#34d399' },
            ].map(r => (
              <button key={r.key} onClick={() => setSelRegion(selRegion === r.key ? null : r.key)} style={{
                padding: '6px 18px', borderRadius: 5, border: 'none', cursor: 'pointer',
                fontSize: 9, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase',
                background: selRegion === r.key ? r.c : 'transparent',
                color: selRegion === r.key ? '#fff' : 'var(--t3)',
                transition: 'all .2s',
              }}>
                {r.label}
              </button>
            ))}
          </div>

          {/* Glow */}
          <div style={{ position: 'absolute', top: '15%', left: '15%', width: 350, height: 350, background: 'radial-gradient(circle, rgba(161,0,255,.08), transparent 70%)', pointerEvents: 'none' }} />

          {/* SVG Map */}
          <svg
            viewBox={`0 0 ${dims.w} ${dims.h}`}
            style={{
              width: '100%', height: '100%', display: 'block',
              transition: 'transform .9s cubic-bezier(.4,0,.2,1), opacity .6s',
              transformOrigin: zoomTarget ? `${(zoomTarget.cx / dims.w) * 100}% ${(zoomTarget.cy / dims.h) * 100}%` : '50% 50%',
              transform: zoomTarget ? 'scale(4)' : 'scale(1)',
              opacity: zoomTarget ? 0.6 : 1,
            }}
          >
            <defs>
              <filter id="glow"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            </defs>
            {geo.map((f, i) => {
              const id = String(f.id);
              const avail = !!COUNTRIES[id];
              const region = getRegion(id);
              const isHov = hov === id;
              const isSel = region ? selRegion === region : false;
              const d = pathGen(f.geometry) || '';
              const rc = region ? regionColors[region] : null;

              let fill = 'rgba(255,255,255,.03)';
              let stroke = 'rgba(255,255,255,.04)';
              let sw = 0.3;

              // During zoom transition, fade non-target countries
              if (zoomTarget && !avail) {
                fill = 'rgba(255,255,255,.01)';
                stroke = 'rgba(255,255,255,.02)';
                sw = 0.1;
              } else if (zoomTarget && avail) {
                fill = 'rgba(161,0,255,.6)';
                stroke = '#A100FF';
                sw = 2;
              } else if (avail) {
                fill = isHov ? 'rgba(161,0,255,.5)' : isSel ? 'rgba(161,0,255,.35)' : 'rgba(161,0,255,.22)';
                stroke = isHov ? '#A100FF' : 'rgba(161,0,255,.4)';
                sw = isHov ? 1.5 : 0.8;
              } else if (rc) {
                fill = isSel ? (isHov ? rc.selHover : rc.sel) : (isHov ? rc.hover : rc.base);
                stroke = isSel ? rc.stroke : (isHov ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.04)');
                sw = isSel ? 0.6 : 0.4;
              } else if (isHov) {
                fill = 'rgba(255,255,255,.05)';
              }

              return (
                <path key={i} d={d} fill={fill} stroke={stroke} strokeWidth={sw}
                  filter={avail && isHov ? 'url(#glow)' : undefined}
                  style={{ cursor: avail || region ? 'pointer' : 'default', transition: 'all .3s' }}
                  onMouseMove={(e) => {
                    setHov(id);
                    const name = f.properties?.name || 'Unknown';
                    setTip({ x: e.clientX, y: e.clientY, name: avail ? name : region ? `${name} · ${REGIONS[region].name}` : name, ok: avail });
                  }}
                  onMouseLeave={() => { setHov(null); setTip(null); }}
                  onClick={() => {
                    if (avail) navigateToCountry(id, COUNTRIES[id].route);
                    else if (region) setSelRegion(selRegion === region ? null : region);
                  }}
                />
              );
            })}
            {/* Canada dot */}
            {Object.values(COUNTRIES).map(c => {
              const pt = proj(c.center); if (!pt) return null;
              return (<g key={c.name}><circle cx={pt[0]} cy={pt[1]} r={6} fill="rgba(161,0,255,.3)" style={{ animation: 'pulse 2s infinite' }} /><circle cx={pt[0]} cy={pt[1]} r={3} fill="#A100FF" /></g>);
            })}
          </svg>

          {/* Region info panel */}
          {selRegion && REGIONS[selRegion] && (
            <div style={{ position: 'absolute', top: 14, right: 14, width: 270, background: 'rgba(10,10,10,.92)', border: '1px solid var(--s3)', borderRadius: 12, padding: 20, backdropFilter: 'blur(12px)', animation: 'fadeIn .3s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <div className="tag">{REGIONS[selRegion].name}</div>
                  <div style={{ fontSize: 24, fontWeight: 900, marginTop: 2 }}>{REGIONS[selRegion].rev}</div>
                </div>
                <button onClick={() => setSelRegion(null)} style={{ background: 'var(--s1)', border: '1px solid var(--s2)', borderRadius: 6, width: 28, height: 28, display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--t3)' }}>
                  <span className="ms" style={{ fontSize: 16 }}>close</span>
                </button>
              </div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                {[{ l: 'Headcount', v: REGIONS[selRegion].headcount }, { l: 'Countries', v: String(REGIONS[selRegion].countries) }, { l: 'Growth', v: REGIONS[selRegion].growth }].map(m => (
                  <div key={m.l} style={{ flex: 1 }}>
                    <div style={{ fontSize: 8, fontWeight: 800, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.15em' }}>{m.l}</div>
                    <div style={{ fontSize: 14, fontWeight: 900, marginTop: 2 }}>{m.v}</div>
                  </div>
                ))}
              </div>
              <button onClick={() => {/* future: region page */}} style={{
                width: '100%', padding: '10px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: selRegion === 'americas' ? '#A100FF' : selRegion === 'emea' ? '#60a5fa' : '#34d399',
                color: '#fff', fontSize: 10, fontWeight: 800, letterSpacing: '.06em',
                boxShadow: `0 4px 16px ${selRegion === 'americas' ? 'rgba(161,0,255,.3)' : selRegion === 'emea' ? 'rgba(96,165,250,.3)' : 'rgba(52,211,153,.3)'}`,
                transition: 'transform .15s',
              }}>
                Explore {REGIONS[selRegion].name}
              </button>
              <div style={{ fontSize: 9, color: 'var(--t4)', marginTop: 8, textAlign: 'center' }}>
                Canada active in Phase 1
              </div>
            </div>
          )}

          {/* Legend */}
          <div style={{ position: 'absolute', bottom: 14, left: 18, display: 'flex', gap: 12 }}>
            {[{ c: '#A100FF', l: 'Americas' }, { c: '#60a5fa', l: 'EMEA' }, { c: '#34d399', l: 'APAC' }].map(r => (
              <span key={r.l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 8, fontWeight: 700, color: 'var(--t4)' }}>
                <i style={{ width: 6, height: 6, borderRadius: '50%', background: r.c, display: 'inline-block', opacity: .6 }} />{r.l}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ height: 48 }} />

      {/* Tooltip */}
      {tip && (
        <div style={{ position: 'fixed', zIndex: 100, pointerEvents: 'none', left: tip.x + 16, top: tip.y - 8, background: 'rgba(15,15,15,.95)', border: '1px solid var(--s3)', borderRadius: 6, padding: '6px 10px' }}>
          <div style={{ fontSize: 12, fontWeight: 700 }}>{tip.name}</div>
          <div style={{ fontSize: 9, fontWeight: 800, color: tip.ok ? 'var(--p)' : 'var(--t4)', letterSpacing: '.1em', textTransform: 'uppercase' }}>{tip.ok ? 'Click to explore' : 'Coming soon'}</div>
        </div>
      )}
    </div>
  );
}
