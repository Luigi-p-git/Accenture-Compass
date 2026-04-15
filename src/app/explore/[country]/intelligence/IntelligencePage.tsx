'use client';

import { useRef, useState, useEffect } from 'react';
import { motion, useScroll, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { TrendsData, TrendsChallenge, TrendsOpportunity, TrendsTrend, NewsItem, FinancialHighlight } from '@/types';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { parseChartValue } from '@/lib/alphasenseParser';
import { generateIntelligenceReport } from '@/lib/intelligenceReport';
import HeaderSelector from '@/components/intelligence/HeadlineSelector';

const CLIENTS = [
  { n: 'Shopify', s: 'Technology', r: '$68M', g: '+18%', init: 'SH', score: 94, ceo: 'Tobias Lütke', hq: 'Ottawa, ON', projects: [{ t: 'Cloud Migration III', s: 'Active', d: 'Enterprise AWS migration' }, { t: 'AI Recommendation Engine', s: 'Active', d: 'ML product recs' }], team: [{ n: 'Sarah Chen', r: 'MD', i: 'SC' }, { n: 'Marcus W.', r: 'Lead', i: 'MW' }] },
  { n: 'Royal Bank of Canada', s: 'Financial Services', r: '$68M', g: '+12%', init: 'RB', score: 92, ceo: 'Dave McKay', hq: 'Toronto, ON', projects: [{ t: 'Open Banking Platform', s: 'Active', d: 'API regulatory compliance' }], team: [{ n: 'James Park', r: 'MD', i: 'JP' }] },
  { n: 'Government of Canada', s: 'Public Services', r: '$62M', g: '+18%', init: 'GC', score: 88, ceo: 'Federal CIO', hq: 'Ottawa, ON', projects: [{ t: 'Cloud First Migration', s: 'Active', d: '14 department cloud migration' }], team: [{ n: 'Rachel Kim', r: 'MD', i: 'RK' }] },
  { n: 'TD Bank Group', s: 'Financial Services', r: '$54M', g: '+8%', init: 'TD', score: 86, ceo: 'Bharat Masrani', hq: 'Toronto, ON', projects: [{ t: 'Core Banking', s: 'Active', d: 'Legacy → cloud-native' }], team: [{ n: 'Michael T.', r: 'MD', i: 'MT' }] },
  { n: 'Suncor Energy', s: 'Energy & Resources', r: '$42M', g: '+6%', init: 'SE', score: 86, ceo: 'Rich Kruger', hq: 'Calgary, AB', projects: [{ t: 'Carbon Capture AI', s: 'Active', d: 'Emissions optimization' }, { t: 'Digital Twin', s: 'Planning', d: 'Oil sands simulation' }], team: [{ n: 'Olga P.', r: 'MD', i: 'OP' }] },
];

const ease = [0.4, 0, 0.2, 1] as const;
const sevColor = (s: string) => s === 'high' ? '#f87171' : s === 'medium' ? '#fbbf24' : '#60a5fa';

function findRelevant(sector: string, items: { t: string; d: string }[]): number[] {
  const kw = sector.toLowerCase().split(/[\s&,]+/).filter(w => w.length > 3);
  return items.map((f, i) => kw.some(k => `${f.t} ${f.d}`.toLowerCase().includes(k)) ? i : -1).filter(i => i >= 0);
}

export default function IntelligencePage({ data, country, countrySlug }: {
  data: TrendsData | null; country: string; countrySlug: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { scrollYProgress } = useScroll({ container: ref });
  const [expanded, setExpanded] = useState<{ t: string; i: number } | null>(null);
  const [selClient, setSelClient] = useState<number | null>(null);
  const [activeTrend, setActiveTrend] = useState(0);
  const [synthOpen, setSynthOpen] = useState(false);
  const [selRegion, setSelRegion] = useState('Americas');
  const [selCountry, setSelCountry] = useState(country);
  const [selIndustry, setSelIndustry] = useState('All Industries');
  const [heroKey, setHeroKey] = useState(0);
  const [liveData, setLiveData] = useState<TrendsData | null>(data);

  // When industry changes, fetch industry-specific data
  useEffect(() => {
    const slug = selIndustry.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const industryParam = selIndustry === 'All Industries' ? '' : slug;
    fetch(`/api/data?country=${countrySlug}&topic=trends${industryParam ? `&industry=${industryParam}` : ''}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.data) setLiveData(d.data);
        else if (selIndustry === 'All Industries') setLiveData(data); // fallback to server data
        else setLiveData(null); // no data for this industry yet
      })
      .catch(() => setLiveData(selIndustry === 'All Industries' ? data : null));
  }, [selIndustry, countrySlug, data]);

  const activeData = liveData;
  const trends = activeData?.trends ?? [];
  const opps = activeData?.opportunities ?? [];
  const challenges = activeData?.challenges ?? [];
  const synthesis = activeData?.synthesis ?? '';
  const newsItems = activeData?.news_items ?? [];
  const financials = activeData?.financial_highlights ?? [];
  const total = activeData?.source?.total_findings ?? (trends.length + opps.length + challenges.length);
  const date = activeData?.source?.date_generated ?? new Date().toISOString().split('T')[0];

  return (
    <div ref={ref} style={{ height: '100vh', overflowY: 'auto', overflowX: 'hidden', background: '#0a0a0a', color: '#fff', fontFamily: "'Inter',system-ui,sans-serif" }}>
      {/* Progress bar */}
      <motion.div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 2, zIndex: 100, background: '#A100FF', scaleX: scrollYProgress, transformOrigin: 'left' }} />

      {/* ════════════════════════════════════════
          MASTHEAD — fixed top bar
         ════════════════════════════════════════ */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,10,10,.9)', backdropFilter: 'blur(12px)', borderBottom: '2px solid #fff', padding: '10px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a href={`/explore/${countrySlug}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: '-.02em', color: '#fff', borderBottom: '2px solid #A100FF', paddingBottom: 1 }}>ACCSENSE</span>
            <span style={{ fontSize: 13, fontWeight: 300, fontStyle: 'italic', color: 'rgba(255,255,255,.4)', letterSpacing: '.02em' }}>Magazine</span>
          </a>
          <span style={{ width: 1, height: 18, background: 'rgba(255,255,255,.1)' }} />
          <HeaderSelector
            region={selRegion}
            country={selCountry}
            industry={selIndustry}
            onRegionChange={(r) => {
              setSelRegion(r);
              setSelCountry('All Countries');
              setHeroKey(k => k + 1);
              if (r !== 'World') {
                const slug = r.toLowerCase().replace(/\s+/g, '-');
                router.push(`/explore/${slug}/intelligence`);
              } else {
                router.push('/explore/world/intelligence');
              }
            }}
            onCountryChange={(c) => {
              setSelCountry(c);
              setHeroKey(k => k + 1);
              if (c !== 'All Countries') {
                const slug = c.toLowerCase().replace(/\s+/g, '-');
                router.push(`/explore/${slug}/intelligence`);
              }
            }}
            onIndustryChange={(ind) => { setSelIndustry(ind); setHeroKey(k => k + 1); }}
          />
        </div>
        <nav style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          {['Trends', 'Analysis', 'Opportunities', 'Visuals', 'Challenges', 'Companies', 'News'].map((s, i) => (
            <a key={s} href={`#sec-${i}`} style={{ fontSize: 8, fontWeight: 900, letterSpacing: '-.01em', textTransform: 'uppercase', color: '#fff', textDecoration: 'none', transition: 'color .2s', opacity: .35 }}
              onMouseEnter={e => { e.currentTarget.style.color = '#A100FF'; e.currentTarget.style.opacity = '1'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.opacity = '.35'; }}
            >{s}</a>
          ))}
          <a href="/admin" style={{ fontSize: 7, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: '#A100FF', textDecoration: 'none', padding: '4px 10px', border: '1px solid rgba(161,0,255,.2)', transition: 'all .2s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(161,0,255,.1)'; e.currentTarget.style.borderColor = 'rgba(161,0,255,.4)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(161,0,255,.2)'; }}
          >Manage Data</a>
        </nav>
      </header>

      <main style={{ padding: '0 48px', maxWidth: 1400, margin: '0 auto' }}>

        {/* ════════════════════════════════════════
            HERO — The Chaos Grid (magazine style)
           ════════════════════════════════════════ */}
        <section style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: 0, borderBottom: '3px solid #fff', marginBottom: 48, position: 'relative' }}>
          {/* Left: headline + map side by side */}
          <div style={{ borderRight: '2px solid #fff', paddingRight: 28, paddingBottom: 28, paddingTop: 24, position: 'relative', zIndex: 2 }}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5, ease }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ background: '#A100FF', color: '#fff', fontSize: 7, fontWeight: 900, padding: '2px 7px', textTransform: 'uppercase' }}>Strategic Intelligence</span>
                <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: '.15em', color: 'rgba(255,255,255,.2)', textTransform: 'uppercase' }}>{date}</span>
              </div>
            </motion.div>

            {/* Headline + Map row */}
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
              {/* Headline with slot machine */}
              <div style={{ fontWeight: 900, letterSpacing: '-.05em', marginBottom: 16, flex: 1 }}>
                <div style={{ fontSize: 'clamp(24px, 3vw, 44px)', lineHeight: 1.05 }}>THE</div>
                <div style={{ overflow: 'hidden' }}>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`hero-${heroKey}`}
                      initial={{ y: '100%' }}
                      animate={{ y: 0 }}
                      exit={{ y: '-100%' }}
                      transition={{ duration: .4, ease }}
                      style={{ fontSize: 'clamp(28px, 4vw, 58px)', lineHeight: 1.1, color: '#A100FF', fontStyle: 'italic' }}
                    >
                      {(selCountry !== 'All Countries' ? selCountry : selRegion).toUpperCase()}
                    </motion.div>
                  </AnimatePresence>
                </div>
                <div style={{ fontSize: 'clamp(24px, 3vw, 44px)', lineHeight: 1.05 }}>OUTLOOK.</div>
                <AnimatePresence>
                  {selIndustry !== 'All Industries' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: .25, ease }} style={{ overflow: 'hidden' }}>
                      <div style={{ fontSize: 'clamp(11px, 1.4vw, 17px)', fontWeight: 300, fontStyle: 'italic', color: '#A100FF', letterSpacing: '-.01em', marginTop: 4 }}>in {selIndustry}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Map + Report button */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, flexShrink: 0, marginTop: 8 }}>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .6, delay: .2, ease }}
                  style={{ width: 180, height: 110, opacity: .7 }}>
                  <MiniMap currentCountry={selCountry !== 'All Countries' ? selCountry : ''} currentRegion={selRegion} />
                </motion.div>
                {activeData && (
                  <motion.button
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .4, delay: .4, ease }}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: .97 }}
                    onClick={() => generateIntelligenceReport(activeData, country, selIndustry)}
                    style={{
                      width: 170, padding: 0, border: 'none', cursor: 'pointer',
                      background: 'transparent', position: 'relative',
                    }}
                  >
                    {/* Outer frame */}
                    <div style={{
                      padding: '10px 16px',
                      border: '1px solid rgba(96,165,250,.25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      position: 'relative', overflow: 'hidden',
                      transition: 'all .3s cubic-bezier(.4,0,.2,1)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(96,165,250,.5)'; e.currentTarget.style.background = 'rgba(96,165,250,.06)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(96,165,250,.25)'; e.currentTarget.style.background = 'transparent'; }}
                    >
                      {/* Accent corner marks */}
                      <div style={{ position: 'absolute', top: -1, left: -1, width: 8, height: 8, borderTop: '2px solid #60a5fa', borderLeft: '2px solid #60a5fa' }} />
                      <div style={{ position: 'absolute', top: -1, right: -1, width: 8, height: 8, borderTop: '2px solid #60a5fa', borderRight: '2px solid #60a5fa' }} />
                      <div style={{ position: 'absolute', bottom: -1, left: -1, width: 8, height: 8, borderBottom: '2px solid #60a5fa', borderLeft: '2px solid #60a5fa' }} />
                      <div style={{ position: 'absolute', bottom: -1, right: -1, width: 8, height: 8, borderBottom: '2px solid #60a5fa', borderRight: '2px solid #60a5fa' }} />

                      <span className="ms" style={{ fontSize: 12, color: '#60a5fa' }}>picture_as_pdf</span>
                      <span style={{ fontSize: 7, fontWeight: 900, letterSpacing: '.14em', color: 'rgba(255,255,255,.7)' }}>GENERATE REPORT</span>
                    </div>
                  </motion.button>
                )}
              </div>
            </div>

            {/* Synthesis — first sentence + popup */}
            <div style={{ maxWidth: 420, position: 'relative' }}>
              <p style={{ fontSize: 10, fontWeight: 400, lineHeight: 1.7, color: 'rgba(255,255,255,.35)' }}>
                {synthesis ? synthesis.split('.').slice(0, 1).join('.') + '.' : 'Emerging trends, opportunities, and challenges.'}
              </p>
              {synthesis && (
                <>
                  <button onClick={() => setSynthOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, padding: 0 }}>
                    <span style={{ fontSize: 9, fontWeight: 800, color: '#A100FF', letterSpacing: '.02em' }}>Read full synthesis</span>
                    <span style={{ fontSize: 10, color: '#A100FF' }}>→</span>
                  </button>
                </>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
              <span style={{ fontSize: 7, fontWeight: 900, borderTop: '1px solid #fff', paddingTop: 3, letterSpacing: '.1em', textTransform: 'uppercase' }}>AlphaSense</span>
              <span style={{ fontSize: 7, color: 'rgba(255,255,255,.15)' }}>·</span>
              <span style={{ fontSize: 7, color: 'rgba(255,255,255,.2)', letterSpacing: '.06em' }}>{total} FINDINGS</span>
            </div>
          </div>

          {/* Right: AlphaSense Metrics */}
          <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .5, delay: .1, ease }}
            style={{ paddingLeft: 28, paddingBottom: 28, paddingTop: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '.15em', color: 'rgba(255,255,255,.2)', textTransform: 'uppercase' }}>Key Metrics</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,.25)', marginTop: 3 }}>{total} findings · {date}</div>
              </div>
            </div>

            {/* AlphaSense financial metrics */}
            {financials.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(financials.length, 3)}, 1fr)`, gap: 0, flex: 1 }}>
                {financials.slice(0, 6).map((fin, i) => (
                  <div key={fin.id} style={{ padding: '12px 16px', borderBottom: i < 3 && financials.length > 3 ? '1px solid rgba(255,255,255,.05)' : 'none', borderRight: (i % Math.min(financials.length, 3)) < Math.min(financials.length, 3) - 1 ? '1px solid rgba(255,255,255,.05)' : 'none' }}>
                    <div style={{ fontSize: 8, fontWeight: 800, color: 'rgba(255,255,255,.2)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fin.metric}</div>
                    <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-.03em' }}>{fin.current_value}</div>
                    {fin.change && <div style={{ fontSize: 11, fontWeight: 800, color: fin.change.startsWith('-') ? '#f87171' : '#34d399', marginTop: 3 }}>{fin.change}</div>}
                    {fin.previous_value && <div style={{ fontSize: 8, color: 'rgba(255,255,255,.15)', marginTop: 2 }}>prev: {fin.previous_value}</div>}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.15)', fontWeight: 700 }}>Financial metrics will appear here</div>
                  <div style={{ fontSize: 8, color: 'rgba(255,255,255,.08)', marginTop: 4 }}>Upload AlphaSense data with the enhanced prompt</div>
                </div>
              </div>
            )}
          </motion.div>
        </section>

        {/* ════════════════════════════════════════
            EMERGING TRENDS — Master-detail layout
           ════════════════════════════════════════ */}
        {trends.length > 0 && (
          <section id="sec-0" style={{ marginBottom: 48, scrollMarginTop: 56 }}>
            <SectionRule label="Emerging Trends" accent="#A100FF" />
            <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: 0, marginTop: 20 }}>
              {/* Left: trend list */}
              <div style={{ borderRight: '2px solid rgba(255,255,255,.04)' }}>
                {trends.map((item, i) => (
                  <div
                    key={i}
                    onMouseEnter={() => setActiveTrend(i)}
                    onClick={() => setExpanded({ t: 'trend', i })}
                    style={{
                      padding: '14px 20px 14px 16px', cursor: 'pointer',
                      background: activeTrend === i ? 'rgba(161,0,255,.06)' : 'transparent',
                      borderLeft: activeTrend === i ? '3px solid #A100FF' : '3px solid transparent',
                      transition: 'all .2s cubic-bezier(.4,0,.2,1)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span className="ms" style={{ fontSize: 14, color: activeTrend === i ? '#A100FF' : 'rgba(255,255,255,.15)', transition: 'color .2s' }}>{item.ic}</span>
                      <span style={{ fontSize: 7, fontWeight: 800, color: '#A100FF', letterSpacing: '.06em', textTransform: 'uppercase', opacity: activeTrend === i ? 1 : .4, transition: 'opacity .2s' }}>{item.tag}</span>
                    </div>
                    <h3 style={{ fontSize: 12, fontWeight: 900, letterSpacing: '-.01em', lineHeight: 1.25, color: activeTrend === i ? '#fff' : 'rgba(255,255,255,.5)', transition: 'color .2s' }}>{item.t}</h3>
                  </div>
                ))}
              </div>
              {/* Right: expanded detail */}
              <div style={{ paddingLeft: 32, position: 'relative', minHeight: 300 }}>
                <AnimatePresence mode="wait">
                  {trends[activeTrend] && (
                    <motion.div
                      key={activeTrend}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -12 }}
                      transition={{ duration: .25, ease }}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setExpanded({ t: 'trend', i: activeTrend })}
                    >
                      {/* Large icon watermark */}
                      <span className="ms" style={{ position: 'absolute', top: 0, right: 0, fontSize: 80, color: 'rgba(161,0,255,.04)' }}>{trends[activeTrend].ic}</span>

                      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                        <span style={{ fontSize: 7, fontWeight: 900, padding: '2px 6px', background: 'rgba(161,0,255,.1)', color: '#A100FF', textTransform: 'uppercase', letterSpacing: '.06em' }}>{trends[activeTrend].tag}</span>
                        {trends[activeTrend].source?.document_type && (
                          <span style={{ fontSize: 7, fontWeight: 700, padding: '2px 6px', background: 'rgba(255,255,255,.03)', color: 'rgba(255,255,255,.25)' }}>{trends[activeTrend].source?.document_type}</span>
                        )}
                      </div>

                      <h2 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-.03em', lineHeight: 1.15, marginBottom: 14 }}>{trends[activeTrend].t}</h2>

                      <p style={{ fontSize: 11, lineHeight: 1.8, color: 'rgba(255,255,255,.45)', marginBottom: 16 }}>{trends[activeTrend].d}</p>

                      {/* Companies affected */}
                      {trends[activeTrend].affected_companies && trends[activeTrend].affected_companies!.length > 0 && (
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ fontSize: 7, fontWeight: 900, color: 'rgba(255,255,255,.15)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>Companies Affected</div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {trends[activeTrend].affected_companies!.map((co, ci) => (
                              <span key={ci} style={{ fontSize: 8, fontWeight: 700, padding: '3px 8px', background: co.impact === 'positive' ? 'rgba(52,211,153,.06)' : co.impact === 'negative' ? 'rgba(248,113,113,.06)' : 'rgba(255,255,255,.03)', color: co.impact === 'positive' ? '#34d399' : co.impact === 'negative' ? '#f87171' : 'rgba(255,255,255,.3)', border: `1px solid ${co.impact === 'positive' ? 'rgba(52,211,153,.12)' : co.impact === 'negative' ? 'rgba(248,113,113,.12)' : 'rgba(255,255,255,.06)'}` }}>
                                {co.impact === 'positive' ? '↑' : co.impact === 'negative' ? '↓' : '→'} {co.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Source */}
                      {trends[activeTrend].source?.document_title && (
                        <div style={{ paddingTop: 10, borderTop: '1px solid rgba(255,255,255,.04)' }}>
                          <div style={{ fontSize: 8, color: 'rgba(255,255,255,.25)' }}>
                            {trends[activeTrend].source!.document_title}
                            {trends[activeTrend].source!.organization ? ` — ${trends[activeTrend].source!.organization}` : ''}
                            {trends[activeTrend].source!.date ? ` · ${trends[activeTrend].source!.date}` : ''}
                          </div>
                        </div>
                      )}

                      <div style={{ marginTop: 14, fontSize: 8, fontWeight: 800, color: '#A100FF', letterSpacing: '.08em' }}>CLICK FOR FULL DETAIL →</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </section>
        )}

        {/* ════════════════════════════════════════
            NEWS — Inverted white section
           ════════════════════════════════════════ */}
        {newsItems.length > 0 && (
          <BrokerAnalysisSection newsItems={newsItems} onExpand={(i: number) => setExpanded({ t: 'news', i })} />
        )}

        {/* ════════════════════════════════════════
            OPPORTUNITIES — Inverted section
           ════════════════════════════════════════ */}
        {opps.length > 0 && (
          <section id="sec-2" style={{ marginBottom: 48, scrollMarginTop: 56 }}>
            <SectionRule label="Strategic Opportunities" accent="#34d399" />
            {/* Horizontal scrollable vertical cards */}
            <div style={{ display: 'flex', gap: 12, marginTop: 24, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {opps.map((item, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                  transition={{ duration: .4, delay: i * .06, ease }}
                  whileHover={{ y: -4, borderColor: 'rgba(52,211,153,.2)' }}
                  onClick={() => setExpanded({ t: 'opportunity', i })}
                  style={{
                    width: 260, minWidth: 260, flexShrink: 0, cursor: 'pointer',
                    background: 'linear-gradient(180deg, rgba(52,211,153,.04) 0%, rgba(10,10,10,.6) 100%)',
                    border: '1px solid rgba(255,255,255,.04)',
                    padding: '24px 22px', display: 'flex', flexDirection: 'column',
                    transition: 'all .3s cubic-bezier(.4,0,.2,1)',
                    position: 'relative', overflow: 'hidden',
                  }}
                >
                  {/* Number watermark */}
                  <div style={{ position: 'absolute', top: 12, right: 14, fontSize: 48, fontWeight: 900, color: 'rgba(52,211,153,.04)', lineHeight: .8 }}>0{i + 1}</div>
                  {/* Timeline badge */}
                  <span style={{ fontSize: 7, fontWeight: 900, color: '#34d399', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 10 }}>{item.timeline || 'Strategic'}</span>
                  {/* Title */}
                  <h3 style={{ fontSize: 14, fontWeight: 900, letterSpacing: '-.02em', lineHeight: 1.2, marginBottom: 10, flex: 1 }}>{item.t}</h3>
                  {/* Description */}
                  <p style={{ fontSize: 9, lineHeight: 1.6, color: 'rgba(255,255,255,.3)', marginBottom: 12 }}>{item.d.substring(0, 100)}...</p>
                  {/* Bottom */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,.04)', paddingTop: 10 }}>
                    {item.p ? <span style={{ fontSize: 9, fontWeight: 900, color: '#34d399' }}>{item.p}</span> : <span />}
                    <span style={{ fontSize: 9, color: 'rgba(52,211,153,.4)', transition: 'color .2s' }}>→</span>
                  </div>
                </motion.div>
              ))}
              <div style={{ width: 48, flexShrink: 0 }} />
            </div>
          </section>
        )}

        {/* ════════════════════════════════════════
            VISUAL INTELLIGENCE — extracted chart images
           ════════════════════════════════════════ */}
        {activeData?.images && activeData.images.length > 0 && (
          <section id="sec-3" style={{ marginBottom: 48, scrollMarginTop: 56 }}>
            <SectionRule label="Visual Intelligence" accent="#fbbf24" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12, marginTop: 20 }}>
              {activeData.images.map((img: { src: string; caption?: string }, i: number) => (
                <motion.div key={i} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: .4, delay: i * .06, ease }}
                  style={{ position: 'relative', overflow: 'hidden', background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.04)', cursor: 'pointer' }}
                  whileHover={{ borderColor: 'rgba(251,191,36,.15)' }}
                  onClick={() => window.open(img.src, '_blank')}
                >
                  <img src={img.src} alt={img.caption || `Chart ${i + 1}`} style={{ width: '100%', display: 'block' }} />
                  {img.caption && (
                    <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,.04)' }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.4)', lineHeight: 1.4 }}>{img.caption}</div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* ════════════════════════════════════════
            KEY CHALLENGES
           ════════════════════════════════════════ */}
        {challenges.length > 0 && (
          <section id="sec-4" style={{ marginBottom: 48, scrollMarginTop: 56 }}>
            <SectionRule label="Key Challenges" accent="#f87171" />
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 0 }}>
              <div style={{ borderRight: '1px solid rgba(255,255,255,.08)', paddingRight: 32 }}>
                {challenges.map((item, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: .4, delay: i * .05, ease }}
                    onClick={() => setExpanded({ t: 'challenge', i })}
                    style={{ display: 'flex', gap: 16, padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,.04)', cursor: 'pointer', transition: 'border-color .2s' }}
                    onMouseEnter={e => (e.currentTarget.style.borderBottomColor = 'rgba(248,113,113,.2)')}
                    onMouseLeave={e => (e.currentTarget.style.borderBottomColor = 'rgba(255,255,255,.04)')}>
                    <span style={{ fontSize: 24, fontWeight: 900, color: 'rgba(255,255,255,.06)', fontStyle: 'italic', width: 32, flexShrink: 0 }}>0{i + 1}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <h3 style={{ fontSize: 13, fontWeight: 900, letterSpacing: '-.01em' }}>{item.t}</h3>
                        <span style={{ fontSize: 7, fontWeight: 800, padding: '1px 6px', background: `${sevColor(item.severity)}15`, color: sevColor(item.severity), textTransform: 'uppercase' }}>{item.severity}</span>
                      </div>
                      <p style={{ fontSize: 10, lineHeight: 1.65, color: 'rgba(255,255,255,.35)' }}>{item.d.substring(0, 180)}{item.d.length > 180 ? '...' : ''}</p>
                    </div>
                    <span style={{ fontSize: 10, color: 'rgba(248,113,113,.3)', alignSelf: 'center', transition: 'transform .2s, color .2s' }}>→</span>
                  </motion.div>
                ))}
              </div>
              {/* Right sidebar: severity summary */}
              <div style={{ paddingLeft: 32, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: '.2em', color: 'rgba(255,255,255,.2)', textTransform: 'uppercase', marginBottom: 16 }}>Severity Distribution</div>
                {['high', 'medium', 'low'].map(sev => {
                  const count = challenges.filter(c => c.severity === sev).length;
                  if (count === 0) return null;
                  return (
                    <div key={sev} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 8, fontWeight: 800, color: sevColor(sev), textTransform: 'uppercase', letterSpacing: '.1em' }}>{sev}</span>
                        <span style={{ fontSize: 18, fontWeight: 900 }}>{count}</span>
                      </div>
                      <div style={{ height: 2, background: 'rgba(255,255,255,.04)' }}>
                        <motion.div initial={{ width: 0 }} whileInView={{ width: `${(count / challenges.length) * 100}%` }} viewport={{ once: true }} transition={{ duration: .8, ease }}
                          style={{ height: '100%', background: sevColor(sev) }} />
                      </div>
                    </div>
                  );
                })}
                <div style={{ marginTop: 20, padding: 20, background: 'rgba(248,113,113,.04)', borderLeft: '2px solid rgba(248,113,113,.2)' }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: '#f87171', marginBottom: 4 }}>Risk Alert</div>
                  <p style={{ fontSize: 9, lineHeight: 1.6, color: 'rgba(255,255,255,.35)' }}>{challenges.filter(c => c.severity === 'high').length} high-severity challenges require immediate strategic attention.</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ════════════════════════════════════════
            CLIENT IMPACT
           ════════════════════════════════════════ */}
        <section id="sec-5" style={{ marginBottom: 48, scrollMarginTop: 56 }}>
          <SectionRule label="Companies Intelligence" accent="#60a5fa" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0 }}>
            {CLIENTS.map((c, i) => (
              <CompanyCard key={c.n} client={c} index={i} trends={trends} opps={opps} challenges={challenges} onSelect={() => setSelClient(i)} isLast={i === CLIENTS.length - 1} />
            ))}
          </div>
        </section>

        {/* Synthesis moved to hero — removed from here */}

        {/* ════════════════════════════════════════
            NEWS — Coming Soon (newspaper style)
           ════════════════════════════════════════ */}
        <section id="sec-6" style={{
          margin: '0 -48px', marginBottom: 0, scrollMarginTop: 56,
          background: '#ede8dc', color: '#1a1a1a',
          padding: '48px 48px 56px',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Newsprint grain texture */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: .4 }}>
            <filter id="newsprint"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /></filter>
            <rect width="100%" height="100%" filter="url(#newsprint)" opacity="0.06" />
          </svg>

          {/* Aged paper edge stains */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: 60, height: '100%', background: 'linear-gradient(to right, rgba(180,160,120,.08), transparent)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: 0, right: 0, width: 60, height: '100%', background: 'linear-gradient(to left, rgba(180,160,120,.08), transparent)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 30, background: 'linear-gradient(to bottom, rgba(180,160,120,.06), transparent)', pointerEvents: 'none' }} />

          {/* Large NEWS watermark */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: 'clamp(120px, 18vw, 260px)', fontWeight: 900, opacity: .035, letterSpacing: '-.06em', lineHeight: .8, pointerEvents: 'none', color: '#1a1a1a', fontFamily: "'Georgia','Times New Roman',serif" }}>NEWS</div>

          <div style={{ position: 'relative', zIndex: 2, maxWidth: 1300, margin: '0 auto' }}>
            {/* Newspaper masthead */}
            <div style={{ textAlign: 'center', marginBottom: 24, borderBottom: '3px double rgba(0,0,0,.2)', paddingBottom: 20 }}>
              {/* Top double rule */}
              <div style={{ height: 2, background: '#1a1a1a', marginBottom: 2 }} />
              <div style={{ height: 1, background: 'rgba(0,0,0,.3)', marginBottom: 12 }} />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 6 }}>
                <span style={{ fontSize: 6, fontWeight: 700, letterSpacing: '.2em', color: 'rgba(0,0,0,.25)' }}>VOL. I</span>
                <span style={{ color: 'rgba(0,0,0,.15)' }}>·</span>
                <span style={{ fontSize: 6, fontWeight: 700, letterSpacing: '.15em', color: 'rgba(0,0,0,.25)' }}>ACCSENSE INTELLIGENCE</span>
                <span style={{ color: 'rgba(0,0,0,.15)' }}>·</span>
                <span style={{ fontSize: 6, fontWeight: 700, letterSpacing: '.15em', color: 'rgba(0,0,0,.25)' }}>COMPASS EDITION</span>
              </div>

              <h2 style={{ fontSize: 40, fontWeight: 900, letterSpacing: '-.03em', textTransform: 'uppercase', color: '#1a1a1a', fontFamily: "'Georgia','Times New Roman',serif", lineHeight: .9 }}>The AccSense Daily</h2>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 8 }}>
                <div style={{ flex: 1, maxWidth: 100, height: 1, background: 'rgba(0,0,0,.12)' }} />
                <span style={{ fontSize: 6, fontWeight: 600, letterSpacing: '.15em', color: 'rgba(0,0,0,.3)' }}>MARKET INTELLIGENCE · BROKER RESEARCH · REGULATORY FILINGS</span>
                <div style={{ flex: 1, maxWidth: 100, height: 1, background: 'rgba(0,0,0,.12)' }} />
              </div>
            </div>

            {/* Coming soon content */}
            <div style={{ textAlign: 'center', padding: '40px 0 20px' }}>
              <span className="ms" style={{ fontSize: 36, color: 'rgba(0,0,0,.08)' }}>newspaper</span>
              <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-.02em', color: '#1a1a1a', marginTop: 12 }}>Coming Soon</div>
              <p style={{ fontSize: 10, color: 'rgba(0,0,0,.35)', lineHeight: 1.7, maxWidth: 400, margin: '8px auto 0' }}>
                Live news feed powered by AlphaSense real-time monitoring. Breaking market intelligence, regulatory updates, and sector-specific alerts delivered as they happen.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                {['Breaking News', 'Market Alerts', 'Regulatory Updates', 'Earnings Coverage'].map(tag => (
                  <span key={tag} style={{ fontSize: 7, fontWeight: 700, padding: '3px 10px', background: 'rgba(0,0,0,.04)', border: '1px solid rgba(0,0,0,.08)', color: 'rgba(0,0,0,.3)', letterSpacing: '.03em' }}>{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ════════════════════════════════════════
          FOOTER
         ════════════════════════════════════════ */}
      <footer style={{ borderTop: '3px solid #A100FF', background: '#000', padding: '32px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 40 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: '-.02em' }}>ACCENTURE</div>
          <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '.2em', color: 'rgba(255,255,255,.25)', marginTop: 4, textTransform: 'uppercase' }}>© 2026 Accenture. Compass Intelligence Platform.</div>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <span style={{ fontSize: 8, fontWeight: 700, padding: '3px 10px', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(255,255,255,.3)' }}>AlphaSense Powered</span>
          <span style={{ fontSize: 8, color: 'rgba(255,255,255,.15)' }}>{country} · {date}</span>
        </div>
      </footer>

      {/* Empty state */}
      {!data && (
        <div style={{ padding: '80px 48px', textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-.03em' }}>No data yet</div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', marginTop: 6 }}>Upload AlphaSense output via <a href="/admin" style={{ color: '#A100FF', textDecoration: 'none' }}>Admin</a></p>
        </div>
      )}

      {/* ═══ SYNTHESIS VIGNETTE ═══ */}
      <AnimatePresence>
        {synthOpen && synthesis && (
          <motion.div
            key="synth-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: .3 }}
            onClick={() => setSynthOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(8px)' }}
          >
            {/* Animated vignette card */}
            <motion.div
              initial={{ opacity: 0, scale: .88, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: .92, y: 20 }}
              transition={{ duration: .35, ease: [.16, 1, .3, 1] }}
              onClick={e => e.stopPropagation()}
              style={{ width: 580, maxHeight: '70vh', position: 'relative', overflow: 'auto', scrollbarWidth: 'thin' }}
            >
              {/* Purple top accent line */}
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: .5, delay: .15, ease: [.16, 1, .3, 1] }}
                style={{ height: 3, background: 'linear-gradient(90deg, #A100FF, #60a5fa)', transformOrigin: 'left' }}
              />
              <div style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,.06)', borderTop: 'none', padding: '32px 36px 28px' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                  <div>
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .3, delay: .1 }}
                      style={{ fontSize: 7, fontWeight: 900, letterSpacing: '.25em', color: '#A100FF', textTransform: 'uppercase', marginBottom: 6 }}>
                      Executive Synthesis
                    </motion.div>
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .3, delay: .15 }}
                      style={{ fontSize: 8, color: 'rgba(255,255,255,.2)' }}>
                      {total} findings · {date}
                    </motion.div>
                  </div>
                  <button onClick={() => setSynthOpen(false)} style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)', width: 28, height: 28, display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'rgba(255,255,255,.3)', fontSize: 12, transition: 'all .2s' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.15)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,.3)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.06)'; }}
                  >✕</button>
                </div>
                {/* > motif */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: .5, delay: .2 }}
                  style={{ position: 'absolute', top: 20, right: 30, fontSize: 120, fontWeight: 900, color: 'rgba(161,0,255,.03)', lineHeight: .75, pointerEvents: 'none' }}
                >&gt;</motion.div>
                {/* Text */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: .4, delay: .2, ease }}
                  style={{ borderLeft: '2px solid rgba(161,0,255,.25)', paddingLeft: 20 }}
                >
                  <p style={{ fontSize: 13, fontWeight: 300, lineHeight: 2, color: 'rgba(255,255,255,.65)', letterSpacing: '-.005em' }}>{synthesis}</p>
                </motion.div>
                {/* Footer */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: .3, delay: .35 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 20, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,.04)' }}
                >
                  <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: '-.01em' }}>accenture</span>
                  <span style={{ width: 1, height: 10, background: 'rgba(255,255,255,.08)' }} />
                  <span style={{ fontSize: 7, fontWeight: 300, color: 'rgba(255,255,255,.2)' }}>Compass Intelligence</span>
                  <span style={{ fontSize: 7, fontWeight: 700, padding: '2px 6px', background: 'rgba(161,0,255,.06)', color: 'rgba(161,0,255,.4)', marginLeft: 'auto' }}>AlphaSense</span>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ SIDE PANEL ═══ */}
      <AnimatePresence>
        {expanded && (() => {
          // News items get their own panel
          if (expanded.t === 'news') {
            const n = newsItems[expanded.i]; if (!n) return null;
            return (
              <motion.div key="panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setExpanded(null)}
                style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)' }}>
                <div style={{ flex: 1 }} />
                <motion.div initial={{ x: 100 }} animate={{ x: 0 }} exit={{ x: 100 }} transition={{ duration: .3, ease }}
                  onClick={e => e.stopPropagation()}
                  style={{ width: 480, background: '#0d0d0d', borderLeft: '2px solid #60a5fa', padding: '36px 32px', overflowY: 'auto' }}>
                  <button onClick={() => setExpanded(null)} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', color: 'rgba(255,255,255,.25)', cursor: 'pointer', fontSize: 14 }}>✕</button>
                  <div style={{ width: 20, height: 2, background: '#60a5fa', marginBottom: 16 }} />
                  <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                    {n.type && <span style={{ fontSize: 7, fontWeight: 900, padding: '2px 6px', background: '#60a5fa', color: '#fff', textTransform: 'uppercase' }}>{n.type}</span>}
                    {n.date && <span style={{ fontSize: 8, color: 'rgba(255,255,255,.25)' }}>{n.date}</span>}
                  </div>
                  <h2 style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-.02em', lineHeight: 1.25, marginBottom: 14 }}>{n.headline}</h2>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', lineHeight: 1.8, marginBottom: 20 }}>{n.summary}</p>
                  {/* Source details */}
                  <div style={{ paddingTop: 14, borderTop: '1px solid rgba(255,255,255,.04)' }}>
                    <div style={{ fontSize: 7, fontWeight: 900, color: 'rgba(255,255,255,.15)', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 6 }}>Source</div>
                    {n.source_org && <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 2 }}>{n.source_org}</div>}
                    {n.type && <div style={{ fontSize: 9, color: 'rgba(255,255,255,.25)' }}>{n.type}{n.date ? ` · ${n.date}` : ''}</div>}
                    {n.url && <a href={n.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 9, fontWeight: 700, color: '#60a5fa', textDecoration: 'none' }}>Open source document ↗</a>}
                  </div>
                </motion.div>
              </motion.div>
            );
          }

          const items = expanded.t === 'trend' ? trends : expanded.t === 'opportunity' ? opps : challenges;
          const item = items[expanded.i]; if (!item) return null;
          const accent = expanded.t === 'trend' ? '#A100FF' : expanded.t === 'opportunity' ? '#34d399' : '#f87171';
          const relClients = CLIENTS.filter(c => c.s.toLowerCase().split(/[\s&,]+/).filter(w => w.length > 3).some(k => `${item.t} ${item.d}`.toLowerCase().includes(k)));
          return (
            <motion.div key="panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setExpanded(null)}
              style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)' }}>
              <div style={{ flex: 1 }} />
              <motion.div initial={{ x: 100 }} animate={{ x: 0 }} exit={{ x: 100 }} transition={{ duration: .3, ease }}
                onClick={e => e.stopPropagation()}
                style={{ width: 480, background: '#0d0d0d', borderLeft: `2px solid ${accent}`, padding: '36px 32px', overflowY: 'auto' }}>
                <button onClick={() => setExpanded(null)} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', color: 'rgba(255,255,255,.25)', cursor: 'pointer', fontSize: 14 }}>✕</button>
                <div style={{ width: 20, height: 2, background: accent, marginBottom: 16 }} />
                <div style={{ fontSize: 7, fontWeight: 900, letterSpacing: '.2em', color: accent, textTransform: 'uppercase', marginBottom: 6 }}>
                  {expanded.t === 'trend' ? 'Emerging Trend' : expanded.t === 'opportunity' ? 'Strategic Opportunity' : 'Key Challenge'}
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-.02em', lineHeight: 1.2, marginBottom: 14 }}>{item.t}</h2>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', lineHeight: 1.8 }}>{item.d}</p>
                <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
                  {'severity' in item && <span style={{ fontSize: 7, fontWeight: 800, padding: '2px 6px', background: `${sevColor(item.severity)}12`, color: sevColor(item.severity), textTransform: 'uppercase' }}>{item.severity}</span>}
                  {'timeline' in item && item.timeline && <span style={{ fontSize: 7, fontWeight: 700, padding: '2px 6px', background: 'rgba(255,255,255,.03)', color: 'rgba(255,255,255,.3)' }}>{item.timeline}</span>}
                  {'tag' in item && <span style={{ fontSize: 7, fontWeight: 700, padding: '2px 6px', background: `${accent}08`, color: accent }}>{item.tag}</span>}
                </div>
                {item.source?.document_title && (
                  <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,.04)' }}>
                    <div style={{ fontSize: 7, fontWeight: 900, color: 'rgba(255,255,255,.15)', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 4 }}>Source</div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,.35)' }}>{item.source.document_title}{item.source.organization ? ` — ${item.source.organization}` : ''}</div>
                    {item.source.document_type && <div style={{ fontSize: 8, color: 'rgba(255,255,255,.2)', marginTop: 2 }}>{item.source.document_type}{item.source.date ? ` · ${item.source.date}` : ''}</div>}
                    {item.source.url && <a href={item.source.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 8, fontWeight: 700, color: '#60a5fa', textDecoration: 'none', marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 3 }}>View source ↗</a>}
                  </div>
                )}
                {/* Company Impact from AlphaSense data */}
                {item.affected_companies && item.affected_companies.length > 0 && (
                  <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,.04)' }}>
                    <div style={{ fontSize: 7, fontWeight: 900, color: 'rgba(255,255,255,.15)', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 8 }}>Company Impact</div>
                    {item.affected_companies.map((co, ci) => (
                      <div key={ci} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,.02)' }}>
                        <span style={{ fontSize: 10, marginTop: 1, flexShrink: 0, color: co.impact === 'positive' ? '#34d399' : co.impact === 'negative' ? '#f87171' : '#fbbf24' }}>
                          {co.impact === 'positive' ? '↑' : co.impact === 'negative' ? '↓' : '→'}
                        </span>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 10, fontWeight: 800 }}>{co.name}</span>
                            {co.ticker && <span style={{ fontSize: 7, fontWeight: 700, color: 'rgba(255,255,255,.2)' }}>{co.ticker}</span>}
                          </div>
                          <div style={{ fontSize: 8, color: 'rgba(255,255,255,.3)', lineHeight: 1.5, marginTop: 2 }}>{co.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {relClients.length > 0 && (
                  <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,.04)' }}>
                    <div style={{ fontSize: 7, fontWeight: 900, color: 'rgba(255,255,255,.15)', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 8 }}>Accenture Clients</div>
                    {relClients.map(c => (
                      <div key={c.n} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,.02)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 7, fontWeight: 900, color: accent }}>{c.init}</span>
                          <span style={{ fontSize: 10, fontWeight: 700 }}>{c.n}</span>
                        </div>
                        <span style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,.25)' }}>{c.r}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ═══ CLIENT MODAL ═══ */}
      <AnimatePresence>
        {selClient !== null && (() => {
          const c = CLIENTS[selClient];
          const sc = (s: string) => s === 'Active' ? '#34d399' : s === 'Planning' ? '#fbbf24' : 'rgba(255,255,255,.2)';
          return (
            <motion.div key="cl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelClient(null)}
              style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)' }}>
              <motion.div initial={{ scale: .97, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .97, y: 10 }} transition={{ duration: .25, ease }}
                onClick={e => e.stopPropagation()}
                style={{ width: 520, maxHeight: '70vh', overflowY: 'auto', background: '#0d0d0d', border: '2px solid #fff' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: '-.01em' }}>{c.n}</div>
                    <div style={{ fontSize: 8, color: 'rgba(255,255,255,.3)', marginTop: 2 }}>{c.s} · {c.hq} · {c.ceo}</div>
                  </div>
                  <button onClick={() => setSelClient(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.2)', cursor: 'pointer', fontSize: 14 }}>✕</button>
                </div>
                <div style={{ padding: '16px 24px' }}>
                  <div style={{ display: 'flex', gap: 0, marginBottom: 16 }}>
                    {[{ l: 'Revenue', v: c.r }, { l: 'Growth', v: c.g }, { l: 'Score', v: String(c.score) }].map((m, i) => (
                      <div key={m.l} style={{ flex: 1, padding: '10px 12px', borderRight: i < 2 ? '1px solid rgba(255,255,255,.04)' : 'none' }}>
                        <div style={{ fontSize: 7, fontWeight: 900, color: 'rgba(255,255,255,.2)', letterSpacing: '.12em', textTransform: 'uppercase' }}>{m.l}</div>
                        <div style={{ fontSize: 20, fontWeight: 900, marginTop: 2, letterSpacing: '-.02em' }}>{m.v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 7, fontWeight: 900, color: '#A100FF', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 6 }}>Projects</div>
                  {c.projects.map(p => (
                    <div key={p.t} style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,.02)' }}>
                      <div style={{ width: 4, height: 4, marginTop: 4, background: sc(p.s), flexShrink: 0 }} />
                      <div>
                        <span style={{ fontSize: 10, fontWeight: 800 }}>{p.t}</span>
                        <span style={{ fontSize: 7, fontWeight: 700, color: sc(p.s), marginLeft: 6, textTransform: 'uppercase' }}>{p.s}</span>
                        <div style={{ fontSize: 8, color: 'rgba(255,255,255,.2)', marginTop: 1 }}>{p.d}</div>
                      </div>
                    </div>
                  ))}
                  <div style={{ fontSize: 7, fontWeight: 900, color: '#A100FF', letterSpacing: '.15em', textTransform: 'uppercase', marginTop: 14, marginBottom: 6 }}>Team</div>
                  <div style={{ display: 'flex', gap: 0 }}>
                    {c.team.map((t, i) => (
                      <div key={t.n} style={{ flex: 1, padding: '6px 10px', borderRight: i < c.team.length - 1 ? '1px solid rgba(255,255,255,.03)' : 'none' }}>
                        <span style={{ fontSize: 7, fontWeight: 900, color: '#A100FF' }}>{t.i}</span>
                        <div style={{ fontSize: 9, fontWeight: 700, marginTop: 2 }}>{t.n}</div>
                        <div style={{ fontSize: 7, color: 'rgba(255,255,255,.2)', textTransform: 'uppercase' }}>{t.r}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════
   SECTION RULE — editorial divider
   ══════════════════════════════════════════════ */
function SectionRule({ label, accent }: { label: string; accent: string }) {
  return (
    <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: .4, ease }}
      style={{ display: 'flex', alignItems: 'baseline', gap: 12, borderBottom: '2px solid #fff', paddingBottom: 6, marginBottom: 24 }}>
      <h2 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-.04em', textTransform: 'uppercase' }}>{label}</h2>
      <div style={{ flex: 1, height: 1, background: '#fff' }} />
      <span style={{ fontSize: 8, fontWeight: 900, letterSpacing: '.2em', color: accent }}>VIEW ALL →</span>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════
   EDITORIAL CARD — no box, just lines
   ══════════════════════════════════════════════ */
function EditorialCard({ item, type, accent, index, onClick, isLast }: {
  item: TrendsTrend | TrendsOpportunity | TrendsChallenge;
  type: string; accent: string; index: number; onClick: () => void; isLast: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      transition={{ duration: .35, delay: index * .04, ease }}
      onClick={onClick}
      style={{ paddingBottom: 14, marginBottom: 14, borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,.06)', cursor: 'pointer', transition: 'border-color .2s' }}
      onMouseEnter={e => { if (!isLast) e.currentTarget.style.borderBottomColor = `${accent}30`; }}
      onMouseLeave={e => { if (!isLast) e.currentTarget.style.borderBottomColor = 'rgba(255,255,255,.06)'; }}>
      <span style={{ fontSize: 8, fontWeight: 900, color: accent, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4, display: 'block' }}>
        {'tag' in item ? item.tag : type}
      </span>
      <h3 style={{ fontSize: 14, fontWeight: 900, letterSpacing: '-.02em', lineHeight: 1.2, marginBottom: 4 }}>{item.t}</h3>
      <p style={{ fontSize: 9, lineHeight: 1.6, color: 'rgba(255,255,255,.3)' }}>{item.d.substring(0, 100)}{item.d.length > 100 ? '...' : ''}</p>
      <div style={{ fontSize: 7, fontWeight: 900, letterSpacing: '.1em', color: 'rgba(255,255,255,.1)', marginTop: 6, textTransform: 'uppercase' }}>
        {'severity' in item ? item.severity + ' severity' : ''}
        {'timeline' in item && item.timeline ? item.timeline : ''}
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════
   MINI WORLD MAP
   ══════════════════════════════════════════════ */
const COUNTRY_NAMES: Record<string, string> = {
  '124': 'Canada', '840': 'United States', '076': 'Brazil', '484': 'Mexico', '032': 'Argentina', '170': 'Colombia', '152': 'Chile',
  '826': 'United Kingdom', '276': 'Germany', '250': 'France', '380': 'Italy', '724': 'Spain', '528': 'Netherlands', '756': 'Switzerland', '710': 'South Africa', '784': 'UAE', '682': 'Saudi Arabia',
  '156': 'China', '392': 'Japan', '410': 'South Korea', '356': 'India', '036': 'Australia', '702': 'Singapore', '360': 'Indonesia', '764': 'Thailand',
};

const REGION_IDS: Record<string, string[]> = {
  'Americas': ['124','840','484','076','032','170','152','604','862','218','600','858','068','328','780','388','340','320','558','188','591','214','332','044','052','660'],
  'EMEA': ['826','276','250','380','724','528','056','620','756','040','578','752','208','246','616','203','642','348','300','792','818','710','566','404','504','012','788','434','760','682','784','414','512','634','048','400','368','364','586'],
  'APAC': ['156','392','410','356','036','360','458','764','704','608','554','702','344','158','096','104','418','116','524','144'],
};

/* ══════════════════════════════════════════════
   COMPANY CARD — with expandable findings
   ══════════════════════════════════════════════ */
/* ══════════════════════════════════════════════
   BROKER ANALYSIS — Magazine spread with page turn
   ══════════════════════════════════════════════ */
function BrokerAnalysisSection({ newsItems, onExpand }: { newsItems: NewsItem[]; onExpand: (i: number) => void }) {
  const [page, setPage] = useState(0);
  const perPage = 6;
  const totalPages = Math.ceil(newsItems.length / perPage);
  const pageItems = newsItems.slice(page * perPage, (page + 1) * perPage);

  if (newsItems.length === 0) return null;

  return (
    <section id="sec-1" style={{
      margin: '0 -48px', marginBottom: 48, scrollMarginTop: 56,
      background: 'linear-gradient(145deg, #0d1117 0%, #0a0a0a 40%, #0f0a18 100%)',
      color: '#fff', position: 'relative', overflow: 'hidden',
    }}>
      {/* Border frame */}
      <div style={{ position: 'absolute', inset: 12, border: '1px solid rgba(255,255,255,.03)', pointerEvents: 'none' }} />

      {/* ── Crest Masthead ── */}
      <div style={{ padding: '32px 48px 24px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,.06)', position: 'relative' }}>
        {/* Center spine line through crest */}
        <div style={{ position: 'absolute', top: 0, left: '50%', width: 1, height: '100%', background: 'rgba(255,255,255,.04)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Top ornamental line */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ width: 40, height: 1, background: 'linear-gradient(to right, transparent, rgba(255,255,255,.15))' }} />
            <div style={{ width: 4, height: 4, background: 'rgba(161,0,255,.4)', transform: 'rotate(45deg)' }} />
            <div style={{ width: 40, height: 1, background: 'linear-gradient(to left, transparent, rgba(255,255,255,.15))' }} />
          </div>

          {/* > symbol */}
          <div style={{ fontSize: 32, fontWeight: 900, color: '#A100FF', lineHeight: .8, letterSpacing: '-.04em' }}>&gt;</div>

          {/* Brand text */}
          <div style={{ fontSize: 7, fontWeight: 900, letterSpacing: '.35em', color: 'rgba(255,255,255,.25)', marginTop: 6, textTransform: 'uppercase' }}>ACCSENSE</div>

          {/* Middle ornamental line */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0' }}>
            <div style={{ width: 25, height: 1, background: 'rgba(255,255,255,.1)' }} />
            <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(161,0,255,.3)' }} />
            <div style={{ width: 25, height: 1, background: 'rgba(255,255,255,.1)' }} />
          </div>

          {/* Section title */}
          <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: '#fff' }}>BROKER ANALYSIS & ARTICLES</div>

          {/* Bottom ornament */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
            <div style={{ width: 30, height: 1, background: 'linear-gradient(to right, transparent, rgba(255,255,255,.1))' }} />
            <span style={{ fontSize: 7, fontWeight: 700, color: 'rgba(96,165,250,.5)', letterSpacing: '.15em' }}>{newsItems.length} ARTICLES</span>
            <div style={{ width: 30, height: 1, background: 'linear-gradient(to left, transparent, rgba(255,255,255,.1))' }} />
          </div>
        </div>
      </div>

      {/* ── Articles Grid (paginated) ── */}
      <div style={{ padding: '28px 48px 20px', position: 'relative' }}>
        {/* Center spine continues */}
        <div style={{ position: 'absolute', top: 0, left: '50%', width: 1, height: '100%', background: 'rgba(255,255,255,.03)', pointerEvents: 'none' }} />
        {/* Spine shadow */}
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 20, height: '100%', background: 'linear-gradient(to right, transparent, rgba(0,0,0,.06) 45%, rgba(0,0,0,.1) 50%, rgba(0,0,0,.06) 55%, transparent)', pointerEvents: 'none' }} />

        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            initial={{ opacity: 0, rotateY: -3, x: 20 }}
            animate={{ opacity: 1, rotateY: 0, x: 0 }}
            exit={{ opacity: 0, rotateY: 3, x: -20 }}
            transition={{ duration: .35, ease: [.4, 0, .2, 1] }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px 32px', perspective: 800 }}
          >
            {pageItems.map((n, i) => (
              <motion.div key={n.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: .3, delay: i * .04 }}
                onClick={() => onExpand(page * perPage + i)}
                style={{ cursor: 'pointer', paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,.05)', transition: 'border-color .2s' }}
                onMouseEnter={e => (e.currentTarget.style.borderBottomColor = 'rgba(96,165,250,.2)')}
                onMouseLeave={e => (e.currentTarget.style.borderBottomColor = 'rgba(255,255,255,.05)')}>
                <h3 style={{ fontSize: 12, fontWeight: 900, letterSpacing: '-.02em', lineHeight: 1.3, marginBottom: 6 }}>{n.headline}</h3>
                {n.summary !== n.headline && (
                  <p style={{ fontSize: 8, lineHeight: 1.6, color: 'rgba(255,255,255,.3)', marginBottom: 8 }}>{n.summary.substring(0, 100)}{n.summary.length > 100 ? '...' : ''}</p>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                  {n.type && <span style={{ fontSize: 5, fontWeight: 900, padding: '2px 4px', background: '#60a5fa', color: '#fff', textTransform: 'uppercase', letterSpacing: '.03em' }}>{n.type}</span>}
                  {n.source_org && <span style={{ fontSize: 7, fontWeight: 700, color: 'rgba(255,255,255,.2)' }}>{n.source_org}</span>}
                  {n.date && <span style={{ fontSize: 6, color: 'rgba(255,255,255,.12)' }}>· {n.date}</span>}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Page Turn Footer ── */}
      {totalPages > 1 && (
        <div style={{ padding: '12px 48px 24px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
          <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
            style={{ background: 'none', border: 'none', cursor: page === 0 ? 'default' : 'pointer', color: page === 0 ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.3)', fontSize: 16, transition: 'color .2s', padding: '4px 8px' }}
            onMouseEnter={e => { if (page > 0) e.currentTarget.style.color = '#A100FF'; }}
            onMouseLeave={e => { e.currentTarget.style.color = page === 0 ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.3)'; }}
          >←</button>

          {/* Page dots */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {Array.from({ length: totalPages }).map((_, pi) => (
              <button key={pi} onClick={() => setPage(pi)}
                style={{ width: pi === page ? 16 : 5, height: 5, border: 'none', cursor: 'pointer', background: pi === page ? '#A100FF' : 'rgba(255,255,255,.1)', transition: 'all .3s cubic-bezier(.4,0,.2,1)', padding: 0 }} />
            ))}
          </div>

          <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page === totalPages - 1}
            style={{ background: 'none', border: 'none', cursor: page === totalPages - 1 ? 'default' : 'pointer', color: page === totalPages - 1 ? 'rgba(255,255,255,.08)' : '#A100FF', fontSize: 16, transition: 'all .2s', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
            onMouseEnter={e => { if (page < totalPages - 1) e.currentTarget.style.transform = 'translateX(3px)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
          >
            <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: '.08em' }}>NEXT</span> →
          </button>
        </div>
      )}
    </section>
  );
}

function CompanyCard({ client: c, index: i, trends, opps, challenges, onSelect, isLast }: {
  client: typeof CLIENTS[0]; index: number;
  trends: TrendsTrend[]; opps: TrendsOpportunity[]; challenges: TrendsChallenge[];
  onSelect: () => void; isLast: boolean;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const relT = findRelevant(c.s, trends);
  const relO = findRelevant(c.s, opps);
  const relC = findRelevant(c.s, challenges);
  const hasFindings = relT.length + relO.length + relC.length > 0;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: .35, delay: i * .06, ease }}
      style={{ padding: '14px 12px', cursor: 'pointer', borderRight: isLast ? 'none' : '1px solid rgba(255,255,255,.04)', borderBottom: '1px solid rgba(255,255,255,.04)', transition: 'background .2s' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.02)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
      <div onClick={onSelect}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <span style={{ fontSize: 7, fontWeight: 900, color: '#60a5fa', letterSpacing: '.06em' }}>{c.init}</span>
          <span style={{ fontSize: 7, fontWeight: 900, color: 'rgba(255,255,255,.05)' }}>0{i + 1}</span>
        </div>
        <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '-.01em', marginBottom: 1, lineHeight: 1.2 }}>{c.n}</div>
        <div style={{ fontSize: 7, color: 'rgba(255,255,255,.18)', marginBottom: 6 }}>{c.s}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 13, fontWeight: 900, letterSpacing: '-.02em' }}>{c.r}</span>
          <span style={{ fontSize: 8, fontWeight: 800, color: '#34d399' }}>{c.g}</span>
        </div>
      </div>
      {hasFindings && (
        <div style={{ marginTop: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer' }}
            onClick={(e) => { e.stopPropagation(); setShowDetails(!showDetails); }}>
            {relT.map(j => <div key={`t${j}`} style={{ width: 5, height: 5, borderRadius: 1, background: '#A100FF' }} />)}
            {relO.map(j => <div key={`o${j}`} style={{ width: 5, height: 5, borderRadius: 1, background: '#34d399' }} />)}
            {relC.map(j => <div key={`c${j}`} style={{ width: 5, height: 5, borderRadius: 1, background: '#f87171' }} />)}
            <span style={{ fontSize: 7, color: showDetails ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.12)', marginLeft: 3, transition: 'color .2s' }}>{showDetails ? '▴' : '▾'}</span>
          </div>
          <AnimatePresence>
            {showDetails && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: .2, ease: [.4, 0, .2, 1] }} style={{ overflow: 'hidden' }}>
                <div style={{ paddingTop: 6, marginTop: 4, borderTop: '1px solid rgba(255,255,255,.03)' }}>
                  {relT.map(j => (
                    <div key={`t${j}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 4, marginBottom: 3 }}>
                      <div style={{ width: 4, height: 4, borderRadius: 1, background: '#A100FF', flexShrink: 0, marginTop: 3 }} />
                      <span style={{ fontSize: 7, color: 'rgba(161,0,255,.5)', lineHeight: 1.3 }}>{trends[j]?.t}</span>
                    </div>
                  ))}
                  {relO.map(j => (
                    <div key={`o${j}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 4, marginBottom: 3 }}>
                      <div style={{ width: 4, height: 4, borderRadius: 1, background: '#34d399', flexShrink: 0, marginTop: 3 }} />
                      <span style={{ fontSize: 7, color: 'rgba(52,211,153,.5)', lineHeight: 1.3 }}>{opps[j]?.t}</span>
                    </div>
                  ))}
                  {relC.map(j => (
                    <div key={`c${j}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 4, marginBottom: 3 }}>
                      <div style={{ width: 4, height: 4, borderRadius: 1, background: '#f87171', flexShrink: 0, marginTop: 3 }} />
                      <span style={{ fontSize: 7, color: 'rgba(248,113,113,.5)', lineHeight: 1.3 }}>{challenges[j]?.t}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

const REGION_COLORS: Record<string, { fill: string; fillActive: string; stroke: string }> = {
  'Americas': { fill: 'rgba(161,0,255,.08)', fillActive: 'rgba(161,0,255,.25)', stroke: 'rgba(161,0,255,.2)' },
  'EMEA': { fill: 'rgba(96,165,250,.08)', fillActive: 'rgba(96,165,250,.25)', stroke: 'rgba(96,165,250,.2)' },
  'APAC': { fill: 'rgba(52,211,153,.08)', fillActive: 'rgba(52,211,153,.25)', stroke: 'rgba(52,211,153,.2)' },
};
const REGION_DOT_COLORS: Record<string, string> = { 'Americas': '#A100FF', 'EMEA': '#60a5fa', 'APAC': '#34d399' };

function getRegionForId(id: string): string | null {
  for (const [region, ids] of Object.entries(REGION_IDS)) {
    if (ids.includes(id)) return region;
  }
  return null;
}

function MiniMap({ currentCountry, currentRegion }: { currentCountry: string; currentRegion: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [geo, setGeo] = useState<any[]>([]);

  useEffect(() => {
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(r => r.json())
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((topo: any) => setGeo((feature(topo, topo.objects.countries) as any).features));
  }, []);

  const W = 360, H = 180;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proj = geo.length ? geoNaturalEarth1().fitSize([W, H], { type: 'FeatureCollection', features: geo } as any) : geoNaturalEarth1();
  const pathGen = geoPath(proj);

  const highlightCountryId = Object.entries(COUNTRY_NAMES).find(([, name]) => name.toLowerCase() === currentCountry.toLowerCase())?.[0];
  const isWorld = currentRegion === 'World' || (!currentCountry && !currentRegion);
  const activeRegionIds = new Set(currentRegion && currentRegion !== 'World' ? REGION_IDS[currentRegion] ?? [] : []);
  // For highlighted country, find its region color
  const countryRegion = highlightCountryId ? getRegionForId(highlightCountryId) : null;
  const dotColor = countryRegion ? REGION_DOT_COLORS[countryRegion] : '#A100FF';

  return (
    <div style={{ width: '100%', aspectRatio: '2/1', position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%', display: 'block' }}>
        {geo.map((f, i) => {
          const id = String(f.id);
          const isHighlighted = id === highlightCountryId;
          const region = getRegionForId(id);
          const rc = region ? REGION_COLORS[region] : null;
          const isActiveRegion = activeRegionIds.has(id);
          const d = pathGen(f.geometry) || '';

          let fill = 'rgba(255,255,255,.05)';
          let stroke = 'rgba(255,255,255,.06)';
          let sw = 0.25;

          if (isHighlighted) {
            fill = rc?.fillActive || 'rgba(161,0,255,.4)';
            stroke = REGION_DOT_COLORS[region || 'Americas'] || '#A100FF';
            sw = 0.8;
          } else if (isWorld && rc) {
            fill = rc.fillActive;
            stroke = rc.stroke;
            sw = 0.35;
          } else if (isActiveRegion && rc) {
            fill = rc.fillActive;
            stroke = rc.stroke;
            sw = 0.5;
          } else if (rc && !isWorld && activeRegionIds.size > 0) {
            // Other regions dimmed but still visible
            fill = 'rgba(255,255,255,.04)';
            stroke = 'rgba(255,255,255,.06)';
          } else if (rc) {
            fill = rc.fill;
            stroke = 'rgba(255,255,255,.06)';
          }

          return <path key={i} d={d} fill={fill} stroke={stroke} strokeWidth={sw} style={{ transition: 'all .5s' }} />;
        })}
        {/* Glow dot on highlighted country */}
        {highlightCountryId && geo.length > 0 && (() => {
          const f = geo.find((g: any) => String(g.id) === highlightCountryId); // eslint-disable-line @typescript-eslint/no-explicit-any
          if (!f) return null;
          const centroid = pathGen.centroid(f.geometry);
          if (!centroid || isNaN(centroid[0])) return null;
          return (
            <g>
              <circle cx={centroid[0]} cy={centroid[1]} r={4} fill={`${dotColor}40`} style={{ animation: 'pulse 2s infinite' }} />
              <circle cx={centroid[0]} cy={centroid[1]} r={2} fill={dotColor} />
            </g>
          );
        })()}
      </svg>
    </div>
  );
}
