'use client';

import { useRef, useState, useEffect } from 'react';
import { motion, useScroll, AnimatePresence } from 'framer-motion';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { TrendsData, TrendsChallenge, TrendsOpportunity, TrendsTrend, NewsItem, FinancialHighlight, TopCompany, AffectedCompany, TransformedChart } from '@/types';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { parseChartValue } from '@/lib/alphasenseParser';
import { generateIntelligenceReport } from '@/lib/intelligenceReport';
import HeaderSelector, { REGION_COUNTRIES } from '@/components/intelligence/HeadlineSelector';
import { useCompassStore } from '@/lib/store';
import RobinChat, { type RobinFocus } from '@/components/intelligence/RobinChat';

const ease = [0.4, 0, 0.2, 1] as const;
const sevColor = (s: string) => s === 'critical' ? '#ef4444' : s === 'high' ? '#f87171' : s === 'medium' ? '#fbbf24' : '#60a5fa';

/** Split description into 2-3 sentence chunks and render as editorial arrow points */
function DescriptionBullets({ text, accent = '#A100FF' }: { text: string; accent?: string }) {
  // Protect abbreviations, then split on real sentence boundaries
  const safe = text
    .replace(/U\.S\./g, 'U·S·')
    .replace(/Inc\./g, 'Inc·')
    .replace(/Ltd\./g, 'Ltd·')
    .replace(/Corp\./g, 'Corp·')
    .replace(/Dr\./g, 'Dr·')
    .replace(/vs\./g, 'vs·')
    .replace(/etc\./g, 'etc·')
    .replace(/e\.g\./g, 'e·g·')
    .replace(/i\.e\./g, 'i·e·');
  const rawSentences = safe.split(/(?<=[.!?])\s+(?=[A-Z])/).map(s => s.replace(/·/g, '.'));

  // Group into chunks of 2 sentences for better readability
  const chunks: string[] = [];
  for (let i = 0; i < rawSentences.length; i += 2) {
    chunks.push(rawSentences.slice(i, i + 2).join(' ').trim());
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
      {chunks.map((chunk, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{ color: accent, fontSize: 10, marginTop: 3, flexShrink: 0, opacity: .6 }}>›</span>
          <span style={{ fontSize: 11, lineHeight: 1.75, color: 'rgb(var(--ink) / .5)' }}>{chunk}</span>
        </div>
      ))}
    </div>
  );
}

function CompanyLogo({ name, logoUrl, size = 36 }: { name: string; logoUrl?: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const initials = name.split(/\s+/).map(w => w[0]).join('').substring(0, 2).toUpperCase();
  if (!logoUrl || failed) {
    return <span style={{ width: size, height: size, display: 'grid', placeItems: 'center', fontSize: size * 0.28, fontWeight: 900, color: '#60a5fa', background: 'rgba(96,165,250,.08)', border: '1px solid rgba(96,165,250,.12)', flexShrink: 0, borderRadius: 4 }}>{initials}</span>;
  }
  return <img src={logoUrl} alt={name} onError={() => setFailed(true)} style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0, borderRadius: 4, background: 'rgb(var(--ink) / .03)', padding: 2 }} />;
}

/** Get source URL — only returns real URLs extracted from PDF or provided by data */
function getSourceUrl(source: { document_title?: string | null; organization?: string | null; url?: string | null } | undefined): string | null {
  if (!source) return null;
  if (source.url && source.url.startsWith('http')) return source.url;
  return null;
}

/** Show linked top companies for a finding with impact details */
function LinkedCompanyChips({ finding, topCompanies, onSelectCompany, source, allFindings }: {
  finding: { linked_top_companies?: number[]; affected_companies?: AffectedCompany[] };
  topCompanies: TopCompany[];
  onSelectCompany: (idx: number) => void;
  source?: { document_title?: string | null; organization?: string | null; url?: string | null } | null;
  allFindings?: { affected_companies?: AffectedCompany[] }[];
}) {
  const sourceUrl = source?.url && source.url.startsWith('http') ? source.url : null;
  const sourceName = source?.organization || source?.document_title || '';
  if (!finding.linked_top_companies?.length && !finding.affected_companies?.length) return null;

  // Build display list from linked_top_companies with impact from affected_companies
  const items = (finding.linked_top_companies || []).map(tcIdx => {
    const co = topCompanies[tcIdx];
    if (!co) return null;
    // Find impact detail from affected_companies via fuzzy match
    const ac = finding.affected_companies?.find(a => {
      const na = a.name.toLowerCase().replace(/\b(inc|corp|co|ltd)\b\.?/g, '').trim();
      const nc = co.name.toLowerCase().replace(/\b(inc|corp|co|ltd)\b\.?/g, '').trim();
      return na === nc || na.includes(nc) || nc.includes(na);
    });
    // If no direct match, search ALL findings for an impact detail about this company
    let detail = ac?.detail || '';
    let impact = ac?.impact || 'neutral' as const;
    if (!ac && allFindings) {
      for (const f of allFindings) {
        const match = f.affected_companies?.find((a: AffectedCompany) => {
          const na2 = a.name.toLowerCase().replace(/\b(inc|corp|co|ltd)\b\.?/g, '').trim();
          const nc2 = co.name.toLowerCase().replace(/\b(inc|corp|co|ltd)\b\.?/g, '').trim();
          return na2 === nc2 || na2.includes(nc2) || nc2.includes(na2);
        });
        if (match?.detail) { detail = match.detail; impact = match.impact; break; }
      }
    }
    return { co, tcIdx, impact, detail };
  }).filter(Boolean) as { co: TopCompany; tcIdx: number; impact: string; detail: string }[];

  if (items.length === 0) return null;

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 7, fontWeight: 900, color: 'rgb(var(--ink) / .15)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 8 }}>Related Companies</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map(({ co, tcIdx, impact, detail }) => (
          <div key={tcIdx} onClick={() => onSelectCompany(tcIdx)}
            style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', padding: '8px 10px', background: 'rgb(var(--ink) / .02)', border: '1px solid rgb(var(--ink) / .06)', transition: 'all .15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgb(var(--ink) / .05)'; e.currentTarget.style.borderColor = 'rgba(96,165,250,.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgb(var(--ink) / .02)'; e.currentTarget.style.borderColor = 'rgb(var(--ink) / .06)'; }}
          >
            <CompanyLogo name={co.name} logoUrl={co.logo_url} size={28} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 800 }}>{co.name}</span>
                <span style={{ fontSize: 7, color: 'rgb(var(--ink) / .2)' }}>{co.revenue}</span>
                <span style={{ fontSize: 10, color: impact === 'positive' ? '#34d399' : impact === 'negative' ? '#f87171' : '#fbbf24' }}>
                  {impact === 'positive' ? '↑' : impact === 'negative' ? '↓' : '→'}
                </span>
              </div>
              {detail && <div style={{ fontSize: 8, color: 'rgb(var(--ink) / .35)', lineHeight: 1.5, marginTop: 2 }}>{detail}</div>}
              {sourceUrl && <a href={sourceUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 7, fontWeight: 700, color: '#60a5fa', textDecoration: 'none', marginTop: 3, display: 'inline-block' }}>Source: {sourceName ? sourceName.substring(0, 40) + (sourceName.length > 40 ? '...' : '') : 'AlphaSense'} ↗</a>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function IntelligencePage({ data, country, countrySlug }: {
  data: TrendsData | null; country: string; countrySlug: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ container: ref });
  const theme = useCompassStore(s => s.theme);
  const toggleTheme = useCompassStore(s => s.toggleTheme);
  const light = theme === 'light';
  const a = (o: number) => `rgb(var(--ink) / ${o})`;
  const [expanded, setExpanded] = useState<{ t: string; i: number } | null>(null);
  const [activeTrend, setActiveTrend] = useState(0);
  const [synthOpen, setSynthOpen] = useState(false);
  const [activeChallenge, setActiveChallenge] = useState(0);
  const [selCompany, setSelCompany] = useState<number | null>(null);
  const [robinFocus, setRobinFocus] = useState<RobinFocus | null>(null);
  const [robinAutoMsg, setRobinAutoMsg] = useState<string | null>(null);
  // Derive initial region & country from the URL slug
  const initRegion = countrySlug === 'world' ? 'World'
    : Object.entries(REGION_COUNTRIES).find(([, cs]) =>
        cs.some(c => c.toLowerCase().replace(/\s+/g, '-') === countrySlug)
      )?.[0] ?? 'World';
  const initCountry = countrySlug === 'world' ? 'All Countries' : country;

  const [selRegion, setSelRegion] = useState(initRegion);
  const [selCountry, setSelCountry] = useState(initCountry);
  const [selIndustry, setSelIndustry] = useState('All Industries');
  const [heroKey, setHeroKey] = useState(0);
  const [liveData, setLiveData] = useState<TrendsData | null>(data);

  // Derive live country slug from selection
  const liveSlug = selCountry !== 'All Countries'
    ? selCountry.toLowerCase().replace(/\s+/g, '-')
    : selRegion !== 'World'
      ? selRegion.toLowerCase().replace(/\s+/g, '-')
      : 'world';

  // Silently sync URL when selection changes (no navigation / no remount)
  useEffect(() => {
    const url = `/explore/${liveSlug}/intelligence`;
    if (window.location.pathname !== url) {
      window.history.replaceState(null, '', url);
    }
  }, [liveSlug]);

  // Fetch data when country or industry changes
  useEffect(() => {
    const indSlug = selIndustry.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const industryParam = selIndustry === 'All Industries' ? '' : indSlug;
    fetch(`/api/data?country=${liveSlug}&topic=trends${industryParam ? `&industry=${industryParam}` : ''}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.data) setLiveData(d.data);
        else if (liveSlug === countrySlug && selIndustry === 'All Industries') setLiveData(data);
        else setLiveData(null);
      })
      .catch(() => setLiveData(liveSlug === countrySlug && selIndustry === 'All Industries' ? data : null));
    setActiveTrend(0);
  }, [selIndustry, liveSlug, countrySlug, data]);

  const activeData = liveData;
  const trends = activeData?.trends ?? [];
  const opps = activeData?.opportunities ?? [];
  const sevOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const challenges = [...(activeData?.challenges ?? [])].sort((a, b) => (sevOrder[a.severity] ?? 9) - (sevOrder[b.severity] ?? 9));
  const synthesis = activeData?.synthesis ?? '';
  const newsItems = activeData?.news_items ?? [];
  const financials = activeData?.financial_highlights ?? [];
  const topCompanies = activeData?.top_companies ?? [];
  const total = activeData?.source?.total_findings ?? (trends.length + opps.length + challenges.length);
  const date = activeData?.source?.date_generated ?? new Date().toISOString().split('T')[0];

  return (
    <div ref={ref} data-theme={theme} style={{ height: '100vh', overflowY: 'auto', overflowX: 'hidden', background: 'var(--bg)', color: 'var(--t1)', fontFamily: "'Inter',system-ui,sans-serif", transition: 'background .4s, color .4s' }}>
      {/* Progress bar */}
      <motion.div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 2, zIndex: 100, background: '#A100FF', scaleX: scrollYProgress, transformOrigin: 'left' }} />

      {/* ════════════════════════════════════════
          MASTHEAD — fixed top bar
         ════════════════════════════════════════ */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--mast)', backdropFilter: 'blur(12px)', borderBottom: '2px solid var(--rule)', padding: '10px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background .4s, border-color .4s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a href={`/explore/${countrySlug}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: '-.02em', color: 'var(--t1)', borderBottom: '2px solid #A100FF', paddingBottom: 1 }}>ACCSENSE</span>
            <span style={{ fontSize: 15, fontWeight: 400, fontStyle: 'italic', fontFamily: "'Playfair Display', Georgia, serif", color: a(.45), letterSpacing: '.01em' }}>Magazine</span>
          </a>
          <span style={{ width: 1, height: 18, background: a(.1) }} />
          <HeaderSelector
            region={selRegion}
            country={selCountry}
            industry={selIndustry}
            onRegionChange={(r) => {
              setSelRegion(r);
              setSelCountry('All Countries');
              setSelIndustry('All Industries');
              setHeroKey(k => k + 1);
            }}
            onCountryChange={(c) => {
              setSelCountry(c);
              setSelIndustry('All Industries');
              setHeroKey(k => k + 1);
            }}
            onIndustryChange={(ind) => { setSelIndustry(ind); setHeroKey(k => k + 1); }}
          />
        </div>
        <nav style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          {['Trends', 'Analysis', 'Opportunities', 'Data', 'Challenges', 'Companies', 'News'].map((s, i) => (
            <a key={s} href={`#sec-${i}`} style={{ fontSize: 8, fontWeight: 900, letterSpacing: '-.01em', textTransform: 'uppercase', color: 'var(--t1)', textDecoration: 'none', transition: 'color .2s', opacity: .35 }}
              onMouseEnter={e => { e.currentTarget.style.color = '#A100FF'; e.currentTarget.style.opacity = '1'; }}
              onMouseLeave={e => { e.currentTarget.style.color = ''; e.currentTarget.style.opacity = '.35'; }}
            >{s}</a>
          ))}
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={light ? 'Switch to dark mode' : 'Switch to light mode'}
            style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${a(.1)}`, background: 'transparent', display: 'grid', placeItems: 'center', cursor: 'pointer', transition: 'all .2s', color: a(.5) }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(161,0,255,.1)'; e.currentTarget.style.borderColor = 'rgba(161,0,255,.3)'; e.currentTarget.style.color = '#A100FF'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = a(.1); e.currentTarget.style.color = a(.5); }}
          >
            <motion.span
              key={theme}
              initial={{ rotate: -30, opacity: 0, scale: 0.5 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 30, opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.25 }}
              className="ms"
              style={{ fontSize: 16 }}
            >{light ? 'dark_mode' : 'light_mode'}</motion.span>
          </button>
          <span style={{ width: 1, height: 16, background: a(.1) }} />
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
        <section style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: 0, borderBottom: '3px solid var(--rule)', marginBottom: 48, position: 'relative' }}>
          {/* Left: headline + map side by side */}
          <div style={{ borderRight: '2px solid var(--rule)', paddingRight: 28, paddingBottom: 28, paddingTop: 24, position: 'relative', zIndex: 2 }}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5, ease }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ background: '#A100FF', color: '#fff', fontSize: 7, fontWeight: 900, padding: '2px 7px', textTransform: 'uppercase' }}>Strategic Intelligence</span>
                <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: '.15em', color: a(.2), textTransform: 'uppercase' }}>{date}</span>
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
                    onClick={() => generateIntelligenceReport(activeData, selCountry !== 'All Countries' ? selCountry : country, selIndustry)}
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
                      <span style={{ fontSize: 7, fontWeight: 900, letterSpacing: '.14em', color: a(.7) }}>GENERATE REPORT</span>
                    </div>
                  </motion.button>
                )}
              </div>
            </div>

            {/* Synthesis — first sentence + popup */}
            <div style={{ maxWidth: 420, position: 'relative' }}>
              <p style={{ fontSize: 10, fontWeight: 400, lineHeight: 1.7, color: a(.35) }}>
                {synthesis ? (() => { const m = synthesis.substring(80).match(/\.\s/); return m ? synthesis.substring(0, 80 + m.index! + 1) : synthesis.substring(0, 200) + '...'; })() : 'Emerging trends, opportunities, and challenges.'}
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
              <span style={{ fontSize: 7, fontWeight: 900, borderTop: '1px solid var(--rule)', paddingTop: 3, letterSpacing: '.1em', textTransform: 'uppercase' }}>AlphaSense</span>
              <span style={{ fontSize: 7, color: a(.15) }}>·</span>
              <span style={{ fontSize: 7, color: a(.2), letterSpacing: '.06em' }}>{total} FINDINGS</span>
            </div>
          </div>

          {/* Right: AlphaSense Metrics */}
          <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .5, delay: .1, ease }}
            style={{ paddingLeft: 28, paddingBottom: 28, paddingTop: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '.15em', color: a(.2), textTransform: 'uppercase' }}>Key Metrics</div>
                <div style={{ fontSize: 9, color: a(.25), marginTop: 3 }}>{total} findings · {date}</div>
              </div>
            </div>

            {/* AlphaSense financial metrics */}
            {financials.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(financials.length, 3)}, 1fr)`, gap: 0, flex: 1 }}>
                {financials.slice(0, 6).map((fin, i) => (
                  <div key={fin.id} style={{ padding: '12px 16px', borderBottom: i < 3 && financials.length > 3 ? `1px solid ${a(.05)}` : 'none', borderRight: (i % Math.min(financials.length, 3)) < Math.min(financials.length, 3) - 1 ? `1px solid ${a(.05)}` : 'none' }}>
                    <div style={{ fontSize: 8, fontWeight: 800, color: a(.2), letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fin.metric}</div>
                    <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-.03em' }}>{fin.current_value}</div>
                    {fin.change && <div style={{ fontSize: 11, fontWeight: 800, color: fin.change.startsWith('-') ? '#f87171' : '#34d399', marginTop: 3 }}>{fin.change}</div>}
                    {fin.previous_value && <div style={{ fontSize: 8, color: a(.15), marginTop: 2 }}>prev: {fin.previous_value}</div>}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: a(.15), fontWeight: 700 }}>Financial metrics will appear here</div>
                  <div style={{ fontSize: 8, color: a(.08), marginTop: 4 }}>Upload AlphaSense data with the enhanced prompt</div>
                </div>
              </div>
            )}
          </motion.div>
        </section>

        {/* ════════════════════════════════════════
            INTELLIGENCE BRIEF — top 5 per category
           ════════════════════════════════════════ */}
        {(trends.length > 0 || opps.length > 0 || challenges.length > 0) && (
          <section style={{ marginBottom: 48 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 20 }}>
              <span style={{ fontSize: 8, fontWeight: 900, letterSpacing: '.2em', color: a(.2), textTransform: 'uppercase' }}>Intelligence Brief</span>
              <div style={{ flex: 1, height: 1, background: a(.08) }} />
              <span style={{ fontSize: 7, fontWeight: 700, color: a(.15) }}>{total} findings</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0 }}>
              {([
                { label: 'Trends', items: trends.slice(0, 5).map(t => ({ title: t.t, sub: t.tag })), accent: '#A100FF', anchor: '#sec-0', total: trends.length },
                { label: 'Opportunities', items: opps.slice(0, 5).map(o => ({ title: o.t, sub: o.timeline || o.p })), accent: '#34d399', anchor: '#sec-2', total: opps.length },
                { label: 'Challenges', items: challenges.slice(0, 5).map(c => ({ title: c.t, sub: c.severity })), accent: '#f87171', anchor: '#sec-4', total: challenges.length },
              ] as const).map((col, ci) => (
                <div key={col.label} style={{ borderRight: ci < 2 ? `1px solid ${a(.08)}` : 'none', padding: ci === 0 ? '0 24px 0 0' : ci === 1 ? '0 24px' : '0 0 0 24px' }}>
                  {/* Column header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 3, height: 14, background: col.accent }} />
                      <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: '.06em', textTransform: 'uppercase' }}>{col.label}</span>
                      <span style={{ fontSize: 11, fontWeight: 900, color: col.accent, letterSpacing: '-.01em' }}>{col.total}</span>
                    </div>
                    <a href={col.anchor} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none', fontSize: 7, fontWeight: 700, letterSpacing: '.04em', color: '#A100FF', transition: 'gap .2s' }}
                      onMouseEnter={e => { e.currentTarget.style.gap = '7px'; }}
                      onMouseLeave={e => { e.currentTarget.style.gap = '4px'; }}
                    >View more <span style={{ fontSize: 9, transition: 'transform .2s' }}>→</span></a>
                  </div>
                  {/* Top 5 list */}
                  {col.items.map((item, ii) => (
                    <div key={ii} style={{ padding: '8px 0', borderTop: `1px solid ${a(.06)}` }}>
                      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '-.01em', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{item.title}</div>
                      {item.sub && <div style={{ fontSize: 7, fontWeight: 700, color: col.accent, textTransform: 'uppercase', letterSpacing: '.04em', marginTop: 2, opacity: .7 }}>{item.sub}</div>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ════════════════════════════════════════
            EMERGING TRENDS — Master-detail layout
           ════════════════════════════════════════ */}
        {trends.length > 0 && (
          <section id="sec-0" style={{ marginBottom: 48, scrollMarginTop: 56 }}>
            <SectionRule label="Emerging Trends" accent="#A100FF" />
            <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: 0, marginTop: 20 }}>
              {/* Left: trend list */}
              <div style={{ borderRight: `2px solid ${a(.04)}` }}>
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
                      <span className="ms" style={{ fontSize: 14, color: activeTrend === i ? '#A100FF' : a(.15), transition: 'color .2s' }}>{item.ic}</span>
                      <span style={{ fontSize: 7, fontWeight: 800, color: '#A100FF', letterSpacing: '.06em', textTransform: 'uppercase', opacity: activeTrend === i ? 1 : .4, transition: 'opacity .2s' }}>{item.tag}</span>
                    </div>
                    <h3 style={{ fontSize: 12, fontWeight: 900, letterSpacing: '-.01em', lineHeight: 1.25, color: activeTrend === i ? 'var(--t1)' : a(.5), transition: 'color .2s' }}>{item.t}</h3>
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
                          <span style={{ fontSize: 7, fontWeight: 700, padding: '2px 6px', background: a(.03), color: a(.25) }}>{trends[activeTrend].source?.document_type}</span>
                        )}
                      </div>

                      <h2 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-.03em', lineHeight: 1.15, marginBottom: 14 }}>{trends[activeTrend].t}</h2>

                      <DescriptionBullets text={trends[activeTrend].d} accent="#A100FF" />

                      {/* Linked companies with impact */}
                      <LinkedCompanyChips finding={trends[activeTrend]} topCompanies={topCompanies} onSelectCompany={(idx) => { setExpanded(null); setSelCompany(idx); }} source={trends[activeTrend].source} allFindings={[...trends, ...opps, ...challenges]} />

                      {/* Source via AlphaSense */}
                      {trends[activeTrend].source?.document_title && (() => {
                        const url = getSourceUrl(trends[activeTrend].source);
                        return (
                          <div style={{ paddingTop: 10, borderTop: `1px solid ${a(.08)}` }}>
                            <div style={{ fontSize: 8, color: a(.25) }}>
                              {trends[activeTrend].source!.document_title}
                              {trends[activeTrend].source!.organization ? ` — ${trends[activeTrend].source!.organization}` : ''}
                              {trends[activeTrend].source!.date ? ` · ${trends[activeTrend].source!.date}` : ''}
                            </div>
                            {url && <a href={url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, fontSize: 8, fontWeight: 700, color: '#60a5fa', textDecoration: 'none' }}>Open in AlphaSense ↗</a>}
                          </div>
                        );
                      })()}

                      <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 8, fontWeight: 800, color: '#A100FF', letterSpacing: '.08em' }}>CLICK FOR FULL DETAIL →</span>
                        <button onClick={(e) => { e.stopPropagation(); setRobinFocus({ type: 'trend', label: trends[activeTrend].t }); }}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(59,130,246,.06)', border: '1px solid rgba(59,130,246,.15)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontSize: 7, fontWeight: 800, color: '#60a5fa', transition: 'all .15s' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59,130,246,.15)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(59,130,246,.06)'; }}
                        >Ask Robin</button>
                      </div>
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
          <BrokerAnalysisSection newsItems={newsItems} onExpand={(i: number) => setExpanded({ t: 'news', i })} topCompanies={topCompanies} onSelectCompany={(idx) => { setExpanded(null); setSelCompany(idx); }} />
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
                    background: light ? 'linear-gradient(180deg, rgba(52,211,153,.06) 0%, rgba(0,0,0,.02) 100%)' : 'linear-gradient(180deg, rgba(52,211,153,.04) 0%, rgba(10,10,10,.6) 100%)',
                    border: `1px solid ${a(.04)}`,
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
                  <p style={{ fontSize: 9, lineHeight: 1.6, color: a(.3), marginBottom: 12 }}>{(() => { const cut = item.d.substring(60).match(/\.\s/); return cut ? item.d.substring(0, 60 + cut.index! + 1) : item.d.substring(0, 120) + '...'; })()}</p>
                  {/* Bottom */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${a(.04)}`, paddingTop: 10 }}>
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
            VISUAL INTELLIGENCE — auto-generated charts + extracted images
           ════════════════════════════════════════ */}
        {(financials.length > 0 || topCompanies.length > 0 || (activeData?.images && activeData.images.length > 0) || (activeData?.transformed_charts && activeData.transformed_charts.length > 0)) && (
          <>
            {/* Auto-generated charts from financial data */}
            {(financials.length > 0 || topCompanies.length > 0) && (
              <GeneratedChartsSection financials={financials} topCompanies={topCompanies}
                findingCounts={{ trends: trends.length, opportunities: opps.length, challenges: challenges.length }}
                onAskRobin={(prompt) => setRobinAutoMsg(prompt + ' [' + Date.now() + ']')}
                onSelectCompany={(idx) => { setExpanded(null); setSelCompany(idx); }}
                onScrollToSection={(anchor) => document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              />
            )}
            {/* Report Charts — Coming Soon teaser */}
            {(activeData?.transformed_charts?.length || activeData?.images?.length) ? (
              <section style={{ marginBottom: 48, position: 'relative' }}>
                <SectionRule label="Report Charts" accent="#A100FF" />
                <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 8 }}>
                  {/* Blurred preview of charts */}
                  <div style={{ filter: 'blur(6px)', opacity: .3, pointerEvents: 'none', padding: '24px 0' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} style={{ background: 'rgb(var(--ink) / .02)', border: `1px solid rgb(var(--ink) / .06)`, padding: 20, height: 180 }}>
                          <div style={{ width: '60%', height: 8, background: 'rgb(var(--ink) / .06)', marginBottom: 12 }} />
                          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 120 }}>
                            {[40, 65, 50, 80, 70, 90].map((h, j) => (
                              <div key={j} style={{ flex: 1, height: `${h}%`, background: i % 2 === 0 ? 'rgba(161,0,255,.15)' : 'rgba(96,165,250,.15)', borderRadius: '3px 3px 0 0' }} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Coming Soon overlay */}
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
                    <div style={{ background: 'rgba(161,0,255,.08)', border: '1px solid rgba(161,0,255,.15)', backdropFilter: 'blur(4px)', padding: '16px 32px', textAlign: 'center' }}>
                      <span className="ms" style={{ fontSize: 20, color: '#A100FF', display: 'block', marginBottom: 6 }}>auto_awesome</span>
                      <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: '-.01em' }}>Report Charts</div>
                      <div style={{ fontSize: 8, color: 'rgb(var(--ink) / .3)', marginTop: 4 }}>Interactive chart recreation from AlphaSense PDF</div>
                      <div style={{ fontSize: 7, fontWeight: 800, color: '#A100FF', letterSpacing: '.1em', textTransform: 'uppercase', marginTop: 8 }}>Coming Soon</div>
                    </div>
                  </div>
                </div>
              </section>
            ) : null}
          </>
        )}

        {/* ════════════════════════════════════════
            KEY CHALLENGES
           ════════════════════════════════════════ */}
        {challenges.length > 0 && (
          <section id="sec-4" style={{ marginBottom: 48, scrollMarginTop: 56 }}>
            <SectionRule label="Key Challenges" accent="#f87171" />
            <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: 0, marginTop: 20 }}>
              {/* Left: challenge list */}
              <div style={{ borderRight: `2px solid ${a(.08)}` }}>
                {challenges.map((item, i) => (
                  <div
                    key={i}
                    onMouseEnter={() => setActiveChallenge(i)}
                    onClick={() => setExpanded({ t: 'challenge', i })}
                    style={{
                      padding: '14px 20px 14px 16px', cursor: 'pointer',
                      background: activeChallenge === i ? 'rgba(248,113,113,.06)' : 'transparent',
                      borderLeft: activeChallenge === i ? `3px solid ${sevColor(item.severity)}` : '3px solid transparent',
                      transition: 'all .2s cubic-bezier(.4,0,.2,1)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span className="ms" style={{ fontSize: 14, color: activeChallenge === i ? sevColor(item.severity) : a(.15), transition: 'color .2s' }}>{item.ic}</span>
                      <span style={{ fontSize: 7, fontWeight: 800, padding: '1px 6px', background: `${sevColor(item.severity)}15`, color: sevColor(item.severity), textTransform: 'uppercase' }}>{item.severity}</span>
                    </div>
                    <h3 style={{ fontSize: 12, fontWeight: 900, letterSpacing: '-.01em', lineHeight: 1.25, color: activeChallenge === i ? 'var(--t1)' : a(.5), transition: 'color .2s' }}>{item.t}</h3>
                  </div>
                ))}
              </div>
              {/* Right: expanded detail */}
              <div style={{ paddingLeft: 32, position: 'relative', minHeight: 300 }}>
                <AnimatePresence mode="wait">
                  {challenges[activeChallenge] && (
                    <motion.div
                      key={activeChallenge}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -12 }}
                      transition={{ duration: .25, ease }}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setExpanded({ t: 'challenge', i: activeChallenge })}
                    >
                      <span className="ms" style={{ position: 'absolute', top: 0, right: 0, fontSize: 80, color: 'rgba(248,113,113,.04)' }}>{challenges[activeChallenge].ic}</span>

                      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                        <span style={{ fontSize: 7, fontWeight: 900, padding: '2px 6px', background: `${sevColor(challenges[activeChallenge].severity)}15`, color: sevColor(challenges[activeChallenge].severity), textTransform: 'uppercase', letterSpacing: '.06em' }}>{challenges[activeChallenge].severity} severity</span>
                      </div>

                      <h2 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-.03em', lineHeight: 1.15, marginBottom: 14 }}>{challenges[activeChallenge].t}</h2>

                      <DescriptionBullets text={challenges[activeChallenge].d} accent="#f87171" />

                      <LinkedCompanyChips finding={challenges[activeChallenge]} topCompanies={topCompanies} onSelectCompany={(idx) => { setExpanded(null); setSelCompany(idx); }} source={challenges[activeChallenge].source} allFindings={[...trends, ...opps, ...challenges]} />

                      {challenges[activeChallenge].source?.document_title && (() => {
                        const url = getSourceUrl(challenges[activeChallenge].source);
                        return (
                          <div style={{ paddingTop: 10, borderTop: `1px solid ${a(.08)}` }}>
                            <div style={{ fontSize: 8, color: a(.25) }}>
                              {challenges[activeChallenge].source!.document_title}
                              {challenges[activeChallenge].source!.organization ? ` — ${challenges[activeChallenge].source!.organization}` : ''}
                            </div>
                            {url && <a href={url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, fontSize: 8, fontWeight: 700, color: '#60a5fa', textDecoration: 'none' }}>Open in AlphaSense ↗</a>}
                          </div>
                        );
                      })()}

                      <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 8, fontWeight: 800, color: '#f87171', letterSpacing: '.08em' }}>CLICK FOR FULL DETAIL →</span>
                        <button onClick={(e) => { e.stopPropagation(); setRobinFocus({ type: 'challenge', label: challenges[activeChallenge].t }); }}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(59,130,246,.06)', border: '1px solid rgba(59,130,246,.15)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontSize: 7, fontWeight: 800, color: '#60a5fa', transition: 'all .15s' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59,130,246,.15)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(59,130,246,.06)'; }}
                        >Ask Robin</button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </section>
        )}

        {/* ════════════════════════════════════════
            COMPANIES INTELLIGENCE
           ════════════════════════════════════════ */}
        <section id="sec-5" style={{ marginBottom: 48, scrollMarginTop: 56 }}>
          <SectionRule label="Companies Intelligence" accent="#60a5fa" />
          {topCompanies.length > 0 ? (
            <div>
              {topCompanies.map((co, i) => {
                const tCount = co.linked_findings.trends.length;
                const oCount = co.linked_findings.opportunities.length;
                const cCount = co.linked_findings.challenges.length;
                return (
                  <motion.div key={co.name} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: .3, delay: i * .04, ease }}
                    onClick={() => setSelCompany(i)}
                    style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 0', borderBottom: `1px solid ${a(.08)}`, cursor: 'pointer', transition: 'background .2s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(96,165,250,.04)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <CompanyLogo name={co.name} logoUrl={co.logo_url} size={36} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 900, letterSpacing: '-.01em' }}>{co.name}</span>
                        {co.ticker && <span style={{ fontSize: 7, fontWeight: 700, color: a(.2) }}>{co.ticker}</span>}
                      </div>
                      <div style={{ fontSize: 8, color: a(.3), marginTop: 1 }}>{co.sector}{co.hq ? ` · ${co.hq}` : ''}{co.revenue ? ` · ${co.revenue}` : ''}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      {tCount > 0 && <span style={{ fontSize: 7, fontWeight: 800, padding: '2px 6px', background: 'rgba(161,0,255,.06)', color: '#A100FF' }}>{tCount} trend{tCount > 1 ? 's' : ''}</span>}
                      {oCount > 0 && <span style={{ fontSize: 7, fontWeight: 800, padding: '2px 6px', background: 'rgba(52,211,153,.06)', color: '#34d399' }}>{oCount} opp{oCount > 1 ? 's' : ''}</span>}
                      {cCount > 0 && <span style={{ fontSize: 7, fontWeight: 800, padding: '2px 6px', background: 'rgba(248,113,113,.06)', color: '#f87171' }}>{cCount} risk{cCount > 1 ? 's' : ''}</span>}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setRobinFocus({ type: 'company', label: co.name }); }}
                      title={`Ask Robin about ${co.name}`}
                      style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid rgba(59,130,246,.15)', background: 'rgba(59,130,246,.06)', cursor: 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0, transition: 'all .2s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59,130,246,.2)'; e.currentTarget.style.borderColor = 'rgba(59,130,246,.4)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(59,130,246,.06)'; e.currentTarget.style.borderColor = 'rgba(59,130,246,.15)'; }}
                    ><span style={{ fontSize: 10, color: '#60a5fa' }}>?</span></button>
                    <span style={{ fontSize: 10, color: a(.15), flexShrink: 0 }}>→</span>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
              <span className="ms" style={{ fontSize: 32, color: a(.08) }}>domain</span>
              <div style={{ fontSize: 11, color: a(.2), fontWeight: 700, marginTop: 8 }}>Company intelligence will appear here</div>
              <div style={{ fontSize: 8, color: a(.1), marginTop: 4 }}>Run the enhanced AlphaSense prompt to generate company data with linked findings</div>
            </div>
          )}
        </section>

        {/* Synthesis moved to hero — removed from here */}

        {/* ════════════════════════════════════════
            NEWS — Elegant Coming Soon
           ════════════════════════════════════════ */}
        <section id="sec-6" style={{ margin: '0 -48px', marginBottom: 0, scrollMarginTop: 56, position: 'relative', overflow: 'hidden' }}>
          {/* Blurred newspaper preview */}
          <div style={{ filter: 'blur(4px)', opacity: .15, pointerEvents: 'none', background: light ? '#f5f0e8' : '#1a1814', padding: '48px 48px 56px' }}>
            <div style={{ textAlign: 'center', maxWidth: 800, margin: '0 auto' }}>
              <div style={{ height: 2, background: 'rgb(var(--ink) / .2)', marginBottom: 8 }} />
              <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-.03em', fontFamily: "'Georgia',serif" }}>The AccSense Daily</div>
              <div style={{ height: 1, background: 'rgb(var(--ink) / .1)', marginTop: 8, marginBottom: 20 }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
                {[1, 2, 3].map(i => (
                  <div key={i}>
                    <div style={{ height: 8, background: 'rgb(var(--ink) / .08)', marginBottom: 8, width: '80%' }} />
                    <div style={{ height: 5, background: 'rgb(var(--ink) / .04)', marginBottom: 4 }} />
                    <div style={{ height: 5, background: 'rgb(var(--ink) / .04)', marginBottom: 4 }} />
                    <div style={{ height: 5, background: 'rgb(var(--ink) / .04)', width: '60%' }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Coming Soon overlay */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 2, background: light ? 'rgba(245,240,232,.85)' : 'rgba(10,10,10,.85)', backdropFilter: 'blur(2px)' }}>
            <span className="ms" style={{ fontSize: 28, color: 'rgb(var(--ink) / .08)', marginBottom: 8 }}>newspaper</span>
            <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: '-.01em', color: 'var(--t1)' }}>The AccSense Daily</div>
            <div style={{ fontSize: 8, color: 'rgb(var(--ink) / .25)', marginTop: 4, maxWidth: 300, textAlign: 'center', lineHeight: 1.6 }}>Live intelligence feed powered by AlphaSense real-time monitoring</div>
            <div style={{ fontSize: 7, fontWeight: 800, color: '#A100FF', letterSpacing: '.15em', textTransform: 'uppercase', marginTop: 12, padding: '4px 14px', border: '1px solid rgba(161,0,255,.2)' }}>Coming Soon</div>
          </div>
        </section>
      </main>

      {/* ════════════════════════════════════════
          FOOTER
         ════════════════════════════════════════ */}
      <footer style={{ borderTop: '3px solid #A100FF', background: 'var(--foot)', padding: '32px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 40, color: '#fff', transition: 'background .4s' }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: '-.02em' }}>ACCENTURE</div>
          <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '.2em', color: 'rgb(var(--ink) / .25)', marginTop: 4, textTransform: 'uppercase' }}>© 2026 Accenture. Compass Intelligence Platform.</div>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <span style={{ fontSize: 8, fontWeight: 700, padding: '3px 10px', border: '1px solid rgb(var(--ink) / .1)', color: 'rgb(var(--ink) / .3)' }}>AlphaSense Powered</span>
          <span style={{ fontSize: 8, color: 'rgb(var(--ink) / .15)' }}>{country} · {date}</span>
        </div>
      </footer>

      {/* Empty state */}
      {!data && (
        <div style={{ padding: '80px 48px', textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-.03em' }}>No data yet</div>
          <p style={{ fontSize: 11, color: a(.3), marginTop: 6 }}>Upload AlphaSense output via <a href="/admin" style={{ color: '#A100FF', textDecoration: 'none' }}>Admin</a></p>
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
              <div style={{ background: 'var(--panel)', border: `1px solid ${a(.06)}`, borderTop: 'none', padding: '32px 36px 28px' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                  <div>
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .3, delay: .1 }}
                      style={{ fontSize: 7, fontWeight: 900, letterSpacing: '.25em', color: '#A100FF', textTransform: 'uppercase', marginBottom: 6 }}>
                      Executive Synthesis
                    </motion.div>
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .3, delay: .15 }}
                      style={{ fontSize: 8, color: 'rgb(var(--ink) / .2)' }}>
                      {total} findings · {date}
                    </motion.div>
                  </div>
                  <button onClick={() => setSynthOpen(false)} style={{ background: a(.04), border: `1px solid ${a(.06)}`, width: 28, height: 28, display: 'grid', placeItems: 'center', cursor: 'pointer', color: a(.3), fontSize: 12, transition: 'all .2s' }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--t1)'; e.currentTarget.style.borderColor = a(.15); }}
                    onMouseLeave={e => { e.currentTarget.style.color = a(.3); e.currentTarget.style.borderColor = a(.06); }}
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
                  <p style={{ fontSize: 13, fontWeight: 300, lineHeight: 2, color: a(.65), letterSpacing: '-.005em' }}>{synthesis}</p>
                </motion.div>
                {/* Footer */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: .3, delay: .35 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 20, paddingTop: 14, borderTop: `1px solid ${a(.04)}` }}
                >
                  <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: '-.01em' }}>accenture</span>
                  <span style={{ width: 1, height: 10, background: a(.08) }} />
                  <span style={{ fontSize: 7, fontWeight: 300, color: a(.2) }}>Compass Intelligence</span>
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
                  style={{ width: 480, background: 'var(--panel)', borderLeft: '2px solid #60a5fa', padding: '36px 32px', overflowY: 'auto', color: 'var(--t1)' }}>
                  <button onClick={() => setExpanded(null)} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', color: a(.25), cursor: 'pointer', fontSize: 14 }}>✕</button>
                  <div style={{ width: 20, height: 2, background: '#60a5fa', marginBottom: 16 }} />
                  <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                    {n.type && <span style={{ fontSize: 7, fontWeight: 900, padding: '2px 6px', background: '#60a5fa', color: '#fff', textTransform: 'uppercase' }}>{n.type}</span>}
                    {n.date && <span style={{ fontSize: 8, color: a(.25) }}>{n.date}</span>}
                  </div>
                  <h2 style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-.02em', lineHeight: 1.25, marginBottom: 14 }}>{n.headline}</h2>
                  <p style={{ fontSize: 12, color: a(.5), lineHeight: 1.8, marginBottom: 20 }}>{n.summary}</p>
                  {n.analyst_quote && (
                    <div style={{ margin: '0 0 20px', padding: '12px 16px', borderLeft: '2px solid rgba(96,165,250,.3)', background: 'rgba(96,165,250,.04)' }}>
                      <div style={{ fontSize: 10, fontStyle: 'italic', color: a(.45), lineHeight: 1.7 }}>"{n.analyst_quote}"</div>
                    </div>
                  )}
                  {/* Companies Referenced */}
                  {n.linked_top_companies && n.linked_top_companies.length > 0 && (
                    <div style={{ paddingTop: 14, borderTop: `1px solid ${a(.04)}`, marginBottom: 14 }}>
                      <div style={{ fontSize: 7, fontWeight: 900, color: a(.15), letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 8 }}>Companies Referenced</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {n.linked_top_companies.map(tcIdx => {
                          const c = topCompanies[tcIdx];
                          if (!c) return null;
                          return (
                            <span key={tcIdx}
                              onClick={(e) => { e.stopPropagation(); setExpanded(null); setSelCompany(tcIdx); }}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px', background: a(.02), border: `1px solid ${a(.06)}`, cursor: 'pointer', transition: 'all .15s' }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(96,165,250,.08)'; e.currentTarget.style.borderColor = 'rgba(96,165,250,.15)'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = a(.02); e.currentTarget.style.borderColor = a(.06); }}
                            >
                              <CompanyLogo name={c.name} logoUrl={c.logo_url} size={16} />
                              <div>
                                <div style={{ fontSize: 9, fontWeight: 800 }}>{c.name}</div>
                                {c.revenue && <div style={{ fontSize: 7, color: a(.2) }}>{c.revenue}</div>}
                              </div>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {/* Source details */}
                  <div style={{ paddingTop: 14, borderTop: `1px solid ${a(.04)}` }}>
                    <div style={{ fontSize: 7, fontWeight: 900, color: a(.15), letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 6 }}>Source</div>
                    {n.source_org && <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 2 }}>{n.source_org}</div>}
                    {n.type && <div style={{ fontSize: 9, color: a(.25) }}>{n.type}{n.date ? ` · ${n.date}` : ''}</div>}
                    {(() => {
                      const url = getSourceUrl({ document_title: n.headline, organization: n.source_org, url: n.url });
                      return url && <a href={url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 9, fontWeight: 700, color: '#60a5fa', textDecoration: 'none' }}>Open in AlphaSense ↗</a>;
                    })()}
                  </div>
                </motion.div>
              </motion.div>
            );
          }

          const items = expanded.t === 'trend' ? trends : expanded.t === 'opportunity' ? opps : challenges;
          const item = items[expanded.i]; if (!item) return null;
          const accent = expanded.t === 'trend' ? '#A100FF' : expanded.t === 'opportunity' ? '#34d399' : '#f87171';
          const findingIdx = expanded.i; // 0-indexed
          const findingKey = expanded.t === 'trend' ? 'trends' : expanded.t === 'opportunity' ? 'opportunities' : 'challenges';
          const relCompanies = topCompanies.filter(co => (co.linked_findings as Record<string, number[]>)[findingKey]?.includes(findingIdx));
          return (
            <motion.div key="panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setExpanded(null)}
              style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)' }}>
              <div style={{ flex: 1 }} />
              <motion.div initial={{ x: 100 }} animate={{ x: 0 }} exit={{ x: 100 }} transition={{ duration: .3, ease }}
                onClick={e => e.stopPropagation()}
                style={{ width: 480, background: 'var(--panel)', borderLeft: `2px solid ${accent}`, padding: '36px 32px', overflowY: 'auto', color: 'var(--t1)' }}>
                <button onClick={() => setExpanded(null)} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', color: a(.25), cursor: 'pointer', fontSize: 14 }}>✕</button>
                <div style={{ width: 20, height: 2, background: accent, marginBottom: 16 }} />
                <div style={{ fontSize: 7, fontWeight: 900, letterSpacing: '.2em', color: accent, textTransform: 'uppercase', marginBottom: 6 }}>
                  {expanded.t === 'trend' ? 'Emerging Trend' : expanded.t === 'opportunity' ? 'Strategic Opportunity' : 'Key Challenge'}
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-.02em', lineHeight: 1.2, marginBottom: 14 }}>{item.t}</h2>
                <p style={{ fontSize: 11, color: 'rgb(var(--ink) / .5)', lineHeight: 1.8 }}>{item.d}</p>
                <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
                  {'severity' in item && <span style={{ fontSize: 7, fontWeight: 800, padding: '2px 6px', background: `${sevColor(item.severity)}12`, color: sevColor(item.severity), textTransform: 'uppercase' }}>{item.severity}</span>}
                  {'timeline' in item && item.timeline && <span style={{ fontSize: 7, fontWeight: 700, padding: '2px 6px', background: 'rgb(var(--ink) / .08)', color: 'rgb(var(--ink) / .3)' }}>{item.timeline}</span>}
                  {'tag' in item && <span style={{ fontSize: 7, fontWeight: 700, padding: '2px 6px', background: `${accent}08`, color: accent }}>{item.tag}</span>}
                </div>
                {item.source?.document_title && (() => {
                  const srcUrl = getSourceUrl(item.source);
                  return (
                    <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid rgb(var(--ink) / .08)' }}>
                      <div style={{ fontSize: 7, fontWeight: 900, color: 'rgb(var(--ink) / .15)', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 4 }}>Source</div>
                      <div style={{ fontSize: 9, color: 'rgb(var(--ink) / .35)' }}>{item.source!.document_title}{item.source!.organization ? ` — ${item.source!.organization}` : ''}</div>
                      {item.source!.document_type && <div style={{ fontSize: 8, color: 'rgb(var(--ink) / .2)', marginTop: 2 }}>{item.source!.document_type}{item.source!.date ? ` · ${item.source!.date}` : ''}</div>}
                      {srcUrl && <a href={srcUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 8, fontWeight: 700, color: '#60a5fa', textDecoration: 'none', marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 3 }}>Open in AlphaSense ↗</a>}
                    </div>
                  );
                })()}
                {/* Company Impact from AlphaSense data */}
                {item.affected_companies && item.affected_companies.length > 0 && (
                  <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid rgb(var(--ink) / .08)' }}>
                    <div style={{ fontSize: 7, fontWeight: 900, color: 'rgb(var(--ink) / .15)', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 8 }}>Company Impact</div>
                    {item.affected_companies.map((co, ci) => {
                      const tcIdx = topCompanies.findIndex(tc => {
                        const na = co.name.toLowerCase().replace(/\b(inc|corp|co|ltd)\b\.?/g, '').trim();
                        const nb = tc.name.toLowerCase().replace(/\b(inc|corp|co|ltd)\b\.?/g, '').trim();
                        return na === nb || na.includes(nb) || nb.includes(na);
                      });
                      return (
                      <div key={ci}
                        onClick={tcIdx >= 0 ? (e) => { e.stopPropagation(); setExpanded(null); setSelCompany(tcIdx); } : undefined}
                        style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0', borderBottom: '1px solid rgb(var(--ink) / .08)', cursor: tcIdx >= 0 ? 'pointer' : 'default', transition: 'background .15s' }}
                        onMouseEnter={tcIdx >= 0 ? e => { e.currentTarget.style.background = 'rgb(var(--ink) / .03)'; } : undefined}
                        onMouseLeave={tcIdx >= 0 ? e => { e.currentTarget.style.background = 'transparent'; } : undefined}
                      >
                        <span style={{ fontSize: 10, marginTop: 1, flexShrink: 0, color: co.impact === 'positive' ? '#34d399' : co.impact === 'negative' ? '#f87171' : '#fbbf24' }}>
                          {co.impact === 'positive' ? '↑' : co.impact === 'negative' ? '↓' : '→'}
                        </span>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 10, fontWeight: 800, color: tcIdx >= 0 ? '#60a5fa' : 'inherit' }}>{co.name}</span>
                            {co.ticker && <span style={{ fontSize: 7, fontWeight: 700, color: 'rgb(var(--ink) / .2)' }}>{co.ticker}</span>}
                            {tcIdx >= 0 && <span style={{ fontSize: 8, color: 'rgb(var(--ink) / .15)' }}>→</span>}
                          </div>
                          <div style={{ fontSize: 8, color: 'rgb(var(--ink) / .3)', lineHeight: 1.5, marginTop: 2 }}>{co.detail}</div>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}
                {relCompanies.length > 0 && (
                  <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid rgb(var(--ink) / .08)' }}>
                    <div style={{ fontSize: 7, fontWeight: 900, color: 'rgb(var(--ink) / .15)', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 8 }}>Linked Companies</div>
                    {relCompanies.map(c => (
                      <div key={c.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgb(var(--ink) / .08)', cursor: 'pointer' }}
                        onClick={(e) => { e.stopPropagation(); setExpanded(null); setSelCompany(topCompanies.indexOf(c)); }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 7, fontWeight: 900, color: '#60a5fa' }}>{c.name.split(/\s+/).map(w => w[0]).join('').substring(0, 2)}</span>
                          <span style={{ fontSize: 10, fontWeight: 700 }}>{c.name}</span>
                        </div>
                        <span style={{ fontSize: 9, fontWeight: 800, color: 'rgb(var(--ink) / .25)' }}>{c.revenue}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ═══ COMPANY SIDE PANEL ═══ */}
      <AnimatePresence>
        {selCompany !== null && (() => {
          const co = topCompanies[selCompany];
          if (!co) return null;
          const linkedT = co.linked_findings.trends.map(id => trends[id]).filter(Boolean);
          const linkedO = co.linked_findings.opportunities.map(id => opps[id]).filter(Boolean);
          const linkedC = co.linked_findings.challenges.map(id => challenges[id]).filter(Boolean);

          // Impact summary: count positive/negative/neutral across all linked findings
          const allLinkedFindings = [
            ...linkedT.map(f => ({ f, cat: 'trends' as const })),
            ...linkedO.map(f => ({ f, cat: 'opportunities' as const })),
            ...linkedC.map(f => ({ f, cat: 'challenges' as const })),
          ];
          const impactCounts = { positive: 0, negative: 0, neutral: 0 };
          allLinkedFindings.forEach(({ f }) => {
            const ac = f.affected_companies?.find((c: AffectedCompany) => {
              const na = c.name.toLowerCase().replace(/\b(inc|corp|co|ltd)\b\.?/g, '').trim();
              const nc = co.name.toLowerCase().replace(/\b(inc|corp|co|ltd)\b\.?/g, '').trim();
              return na === nc || na.includes(nc) || nc.includes(na);
            });
            if (ac) impactCounts[ac.impact as keyof typeof impactCounts]++;
            else impactCounts.neutral++;
          });
          const totalImpacts = impactCounts.positive + impactCounts.negative + impactCounts.neutral;

          // Helper to find impact detail for this company — search direct match first, then all findings
          const getImpactForFinding = (f: { affected_companies?: AffectedCompany[] }) => {
            const fuzzy = (a: string, b: string) => {
              const na = a.toLowerCase().replace(/\b(inc|corp|co|ltd)\b\.?/g, '').trim();
              const nb = b.toLowerCase().replace(/\b(inc|corp|co|ltd)\b\.?/g, '').trim();
              return na === nb || na.includes(nb) || nb.includes(na);
            };
            // Direct match on this finding
            const direct = f.affected_companies?.find((c: AffectedCompany) => fuzzy(c.name, co.name));
            if (direct) return direct;
            // Fallback: search ALL findings for any mention of this company
            const allF = [...trends, ...opps, ...challenges];
            for (const af of allF) {
              const match = af.affected_companies?.find((c: AffectedCompany) => fuzzy(c.name, co.name));
              if (match) return match;
            }
            return undefined;
          };

          return (
            <motion.div key="co-panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelCompany(null)}
              style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)' }}>
              <div style={{ flex: 1 }} />
              <motion.div initial={{ x: 100 }} animate={{ x: 0 }} exit={{ x: 100 }} transition={{ duration: .3, ease }}
                onClick={e => e.stopPropagation()}
                style={{ width: 500, background: 'var(--panel)', borderLeft: '2px solid #60a5fa', padding: '36px 32px', overflowY: 'auto', color: 'var(--t1)' }}>
                <button onClick={() => setSelCompany(null)} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', color: a(.25), cursor: 'pointer', fontSize: 14 }}>✕</button>
                <div style={{ width: 20, height: 2, background: '#60a5fa', marginBottom: 16 }} />

                {/* Company header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                  <CompanyLogo name={co.name} logoUrl={co.logo_url} size={40} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <h2 style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-.02em' }}>{co.name}</h2>
                      {co.ticker && <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 6px', background: 'rgba(96,165,250,.08)', color: '#60a5fa' }}>{co.ticker}</span>}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 9, color: a(.3), marginBottom: 16 }}>{co.sector}{co.hq ? ` · ${co.hq}` : ''}</div>

                {/* Revenue */}
                {co.revenue && (
                  <div style={{ padding: '10px 0', borderTop: `1px solid ${a(.08)}`, borderBottom: `1px solid ${a(.08)}`, marginBottom: 16 }}>
                    <div style={{ fontSize: 7, fontWeight: 900, color: a(.2), letterSpacing: '.12em', textTransform: 'uppercase' }}>Revenue</div>
                    <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-.02em', marginTop: 2 }}>{co.revenue}</div>
                  </div>
                )}

                {/* Investment Focus */}
                {co.investment_focus && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 7, fontWeight: 900, color: '#34d399', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 6 }}>Investment Focus</div>
                    <p style={{ fontSize: 10, color: a(.45), lineHeight: 1.7 }}>{co.investment_focus}</p>
                  </div>
                )}

                {/* Recent Moves */}
                {co.recent_moves && co.recent_moves.length > 0 && (
                  <div style={{ marginBottom: 16, paddingTop: 14, borderTop: `1px solid ${a(.08)}` }}>
                    <div style={{ fontSize: 7, fontWeight: 900, color: '#fbbf24', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 6 }}>Recent Moves</div>
                    {co.recent_moves.map((move, mi) => (
                      <div key={mi} style={{ display: 'flex', gap: 8, padding: '4px 0' }}>
                        <span style={{ color: '#fbbf24', fontSize: 10, marginTop: 2, flexShrink: 0, opacity: .6 }}>→</span>
                        <span style={{ fontSize: 10, color: a(.5), lineHeight: 1.5 }}>{move}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Impact Summary Bar */}
                {totalImpacts > 0 && (
                  <div style={{ marginBottom: 16, paddingTop: 14, borderTop: `1px solid ${a(.08)}` }}>
                    <div style={{ fontSize: 7, fontWeight: 900, color: a(.2), letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 8 }}>Impact Summary</div>
                    <div style={{ display: 'flex', height: 4, overflow: 'hidden', marginBottom: 6 }}>
                      {impactCounts.positive > 0 && <div style={{ flex: impactCounts.positive, background: '#34d399' }} />}
                      {impactCounts.neutral > 0 && <div style={{ flex: impactCounts.neutral, background: '#fbbf24' }} />}
                      {impactCounts.negative > 0 && <div style={{ flex: impactCounts.negative, background: '#f87171' }} />}
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 8 }}>
                      {impactCounts.positive > 0 && <span style={{ color: '#34d399', fontWeight: 800 }}>↑ {impactCounts.positive} positive</span>}
                      {impactCounts.neutral > 0 && <span style={{ color: '#fbbf24', fontWeight: 800 }}>→ {impactCounts.neutral} neutral</span>}
                      {impactCounts.negative > 0 && <span style={{ color: '#f87171', fontWeight: 800 }}>↓ {impactCounts.negative} negative</span>}
                    </div>
                  </div>
                )}

                {/* Key Investments */}
                {co.key_initiatives.length > 0 && (() => {
                  // Build a pool of source URLs from all linked findings for this company
                  const allLinkedSources = [...linkedT, ...linkedO, ...linkedC]
                    .filter(f => f.source?.url)
                    .map(f => ({ url: f.source!.url!, org: f.source!.organization || '', title: f.t }));
                  return (
                  <div style={{ marginBottom: 18, paddingTop: 14, borderTop: `1px solid ${a(.08)}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ fontSize: 7, fontWeight: 900, color: '#60a5fa', letterSpacing: '.15em', textTransform: 'uppercase' }}>Key Investments</div>
                      <div style={{ fontSize: 6, color: a(.15) }}>AlphaSense research</div>
                    </div>
                    {co.key_initiatives.map((init, ii) => {
                      // Try to find a source for this initiative by matching words to linked findings
                      const initWords = init.toLowerCase().split(/\s+/).filter(w => w.length > 4);
                      const matchedSource = allLinkedSources.find(s => {
                        const fWords = s.title.toLowerCase().split(/\s+/);
                        return initWords.filter(w => fWords.some(fw => fw.includes(w) || w.includes(fw))).length >= 2;
                      }) || allLinkedSources[ii % allLinkedSources.length]; // fallback: round-robin
                      return (
                        <div key={ii} style={{ display: 'flex', gap: 8, padding: '5px 0', borderBottom: ii < co.key_initiatives.length - 1 ? `1px solid ${a(.03)}` : 'none' }}>
                          <div style={{ width: 4, height: 4, marginTop: 5, background: '#60a5fa', flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: 10, color: a(.5), lineHeight: 1.5 }}>{init.replace(/\s*\[\d+\]\s*/g, ' ').trim()}</span>
                            {matchedSource && (
                              <a href={matchedSource.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                                style={{ display: 'block', fontSize: 7, fontWeight: 700, color: '#60a5fa', textDecoration: 'none', marginTop: 2 }}>
                                {matchedSource.org.substring(0, 30)} ↗
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  );
                })()}

                {/* Linked Trends — with impact detail */}
                {linkedT.length > 0 && (
                  <div style={{ marginBottom: 16, paddingTop: 14, borderTop: `1px solid ${a(.08)}` }}>
                    <div style={{ fontSize: 7, fontWeight: 900, color: '#A100FF', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 8 }}>Linked Trends</div>
                    {linkedT.map((t, ti) => {
                      const impact = getImpactForFinding(t);
                      const url = getSourceUrl(t.source);
                      return (
                        <div key={ti} onClick={(e) => { e.stopPropagation(); setSelCompany(null); setExpanded({ t: 'trend', i: trends.indexOf(t) }); }}
                          style={{ padding: '8px 0', cursor: 'pointer', transition: 'background .15s', borderBottom: ti < linkedT.length - 1 ? `1px solid ${a(.04)}` : 'none' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(161,0,255,.04)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                            <span style={{ fontSize: 10, color: impact ? (impact.impact === 'positive' ? '#34d399' : impact.impact === 'negative' ? '#f87171' : '#fbbf24') : a(.15), marginTop: 1, flexShrink: 0 }}>
                              {impact ? (impact.impact === 'positive' ? '↑' : impact.impact === 'negative' ? '↓' : '→') : '·'}
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, lineHeight: 1.4 }}>{t.t}</span>
                              {impact?.detail && <div style={{ fontSize: 8, color: a(.3), lineHeight: 1.5, marginTop: 2 }}>{impact.detail}</div>}
                              {url && <a href={url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 7, fontWeight: 700, color: '#60a5fa', textDecoration: 'none', marginTop: 2, display: 'inline-block' }}>{t.source?.organization ? t.source.organization.substring(0, 30) : 'Source'} ↗</a>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Linked Opportunities — with impact detail */}
                {linkedO.length > 0 && (
                  <div style={{ marginBottom: 16, paddingTop: 14, borderTop: `1px solid ${a(.08)}` }}>
                    <div style={{ fontSize: 7, fontWeight: 900, color: '#34d399', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 8 }}>Linked Opportunities</div>
                    {linkedO.map((o, oi) => {
                      const impact = getImpactForFinding(o);
                      const url = getSourceUrl(o.source);
                      return (
                        <div key={oi} onClick={(e) => { e.stopPropagation(); setSelCompany(null); setExpanded({ t: 'opportunity', i: opps.indexOf(o) }); }}
                          style={{ padding: '8px 0', cursor: 'pointer', transition: 'background .15s', borderBottom: oi < linkedO.length - 1 ? `1px solid ${a(.04)}` : 'none' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(52,211,153,.04)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                            <span style={{ fontSize: 10, color: impact ? (impact.impact === 'positive' ? '#34d399' : impact.impact === 'negative' ? '#f87171' : '#fbbf24') : a(.15), marginTop: 1, flexShrink: 0 }}>
                              {impact ? (impact.impact === 'positive' ? '↑' : impact.impact === 'negative' ? '↓' : '→') : '·'}
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, lineHeight: 1.4 }}>{o.t}</span>
                              {impact?.detail && <div style={{ fontSize: 8, color: a(.3), lineHeight: 1.5, marginTop: 2 }}>{impact.detail}</div>}
                              {url && <a href={url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 7, fontWeight: 700, color: '#60a5fa', textDecoration: 'none', marginTop: 2, display: 'inline-block' }}>{o.source?.organization ? o.source.organization.substring(0, 30) : 'Source'} ↗</a>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Linked Challenges — with impact detail */}
                {linkedC.length > 0 && (
                  <div style={{ paddingTop: 14, borderTop: `1px solid ${a(.08)}` }}>
                    <div style={{ fontSize: 7, fontWeight: 900, color: '#f87171', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 8 }}>Linked Challenges</div>
                    {linkedC.map((c, ci) => {
                      const impact = getImpactForFinding(c);
                      const url = getSourceUrl(c.source);
                      return (
                        <div key={ci} onClick={(e) => { e.stopPropagation(); setSelCompany(null); setExpanded({ t: 'challenge', i: challenges.indexOf(c) }); }}
                          style={{ padding: '8px 0', cursor: 'pointer', transition: 'background .15s', borderBottom: ci < linkedC.length - 1 ? `1px solid ${a(.04)}` : 'none' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,.04)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                            <span style={{ fontSize: 10, color: impact ? (impact.impact === 'positive' ? '#34d399' : impact.impact === 'negative' ? '#f87171' : '#fbbf24') : a(.15), marginTop: 1, flexShrink: 0 }}>
                              {impact ? (impact.impact === 'positive' ? '↑' : impact.impact === 'negative' ? '↓' : '→') : '·'}
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div>
                                <span style={{ fontSize: 10, fontWeight: 700, lineHeight: 1.4 }}>{c.t}</span>
                                <span style={{ fontSize: 7, fontWeight: 800, padding: '1px 4px', marginLeft: 6, background: `${sevColor(c.severity)}15`, color: sevColor(c.severity), textTransform: 'uppercase' }}>{c.severity}</span>
                              </div>
                              {impact?.detail && <div style={{ fontSize: 8, color: a(.3), lineHeight: 1.5, marginTop: 2 }}>{impact.detail}</div>}
                              {url && <a href={url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 7, fontWeight: 700, color: '#60a5fa', textDecoration: 'none', marginTop: 2, display: 'inline-block' }}>{c.source?.organization ? c.source.organization.substring(0, 30) : 'Source'} ↗</a>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ═══ ROBIN CHAT ═══ */}
      <RobinChat data={activeData} focus={robinFocus} autoMessage={robinAutoMsg} />
    </div>
  );
}

/* ══════════════════════════════════════════════
   TRANSFORMED CHARTS — PDF charts recreated via Claude vision
   ══════════════════════════════════════════════ */
function TransformedChartsSection({ charts, onAskRobin }: { charts: TransformedChart[]; onAskRobin: (label: string) => void }) {
  const light = useCompassStore(s => s.theme) === 'light';
  const a = (o: number) => `rgb(var(--ink) / ${o})`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [EChart, setEChart] = useState<any>(null);
  useEffect(() => { import('echarts-for-react').then(mod => setEChart(() => mod.default)); }, []);

  const txtColor = light ? 'rgba(0,0,0,.5)' : 'rgba(255,255,255,.5)';
  const subtxtColor = light ? 'rgba(0,0,0,.2)' : 'rgba(255,255,255,.2)';
  const borderColor = light ? 'rgba(0,0,0,.06)' : 'rgba(255,255,255,.06)';
  const defaultColors = ['#60a5fa', '#A100FF', '#34d399', '#fbbf24', '#f87171', '#818cf8', '#fb923c', '#22d3ee'];

  if (!EChart) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function buildOption(chart: TransformedChart): any {
    const colors = chart.colors?.length ? chart.colors : defaultColors;
    const tooltipStyle = { backgroundColor: light ? '#fff' : '#1a1a1a', borderColor, textStyle: { color: light ? '#000' : '#fff', fontSize: 11, fontWeight: 700, fontFamily: 'Inter' } };

    // ── PIE / DONUT ──
    if (chart.type === 'pie') {
      return {
        backgroundColor: 'transparent',
        tooltip: { trigger: 'item', ...tooltipStyle },
        series: [{
          type: 'pie', radius: ['42%', '72%'], center: ['50%', '50%'],
          itemStyle: { borderRadius: 5, borderColor: light ? '#fafafa' : '#0a0a0a', borderWidth: 2 },
          label: { color: txtColor, fontSize: 9, fontWeight: 700, fontFamily: 'Inter', formatter: '{b}\n{d}%' },
          emphasis: { itemStyle: { shadowBlur: 15, shadowColor: 'rgba(161,0,255,.25)' } },
          data: (chart.categories || []).map((cat, i) => ({ value: chart.series[0]?.data[i] || 0, name: cat, itemStyle: { color: colors[i % colors.length] } })),
          animationType: 'scale', animationEasing: 'cubicOut', animationDuration: 800,
        }],
      };
    }

    // ── COMBO / DUAL-AXIS (bars + line) ──
    const isCombo = chart.type === 'combo' || chart.isDualAxis || chart.series.some(s => s.type === 'line') && chart.series.some(s => s.type === 'bar');
    const isStacked = chart.type === 'stacked' || chart.isStacked;
    const isLine = chart.type === 'line' || chart.type === 'area';

    // Build yAxis array
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const yAxes: any[] = [{
      type: 'value', name: chart.yAxisName || '', nameTextStyle: { color: subtxtColor, fontSize: 8, fontFamily: 'Inter' },
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { color: txtColor, fontSize: 8, fontFamily: 'Inter', formatter: chart.yAxisUnit === '$B' ? '${value}B' : chart.yAxisUnit === '$M' ? '${value}M' : '{value}' + (chart.yAxisUnit === '%' ? '%' : '') },
      splitLine: { lineStyle: { color: borderColor } },
    }];
    if (isCombo || chart.isDualAxis) {
      yAxes.push({
        type: 'value', name: chart.yAxis2Name || '', nameTextStyle: { color: subtxtColor, fontSize: 8, fontFamily: 'Inter' },
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: txtColor, fontSize: 8, fontFamily: 'Inter', formatter: chart.yAxis2Unit === '%' ? '{value}%' : '{value}' },
        splitLine: { show: false },
      });
    }

    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', axisPointer: { type: isLine ? 'line' : 'shadow' }, ...tooltipStyle },
      legend: chart.series.length > 1 ? { data: chart.series.map(s => s.name), textStyle: { color: txtColor, fontSize: 8, fontWeight: 700, fontFamily: 'Inter' }, bottom: 0, itemWidth: 10, itemHeight: 3 } : undefined,
      grid: { left: 10, right: isCombo ? 10 : 16, top: chart.annotations?.length ? 24 : 16, bottom: chart.series.length > 1 ? 28 : 8, containLabel: true },
      xAxis: {
        type: 'category', data: chart.categories || [],
        name: chart.xAxisName || '', nameLocation: 'center', nameGap: 25, nameTextStyle: { color: subtxtColor, fontSize: 8, fontFamily: 'Inter' },
        axisLine: { lineStyle: { color: borderColor } }, axisTick: { show: false },
        axisLabel: { color: txtColor, fontSize: 8, fontWeight: 700, fontFamily: 'Inter', rotate: (chart.categories?.length || 0) > 8 ? 30 : 0 },
      },
      yAxis: yAxes.length > 1 ? yAxes : yAxes[0],
      series: chart.series.map((s, si) => {
        const seriesType = s.type || (isLine ? 'line' : 'bar');
        const color = s.color || colors[si % colors.length];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const item: any = {
          name: s.name, type: seriesType, data: s.data,
          yAxisIndex: s.yAxisIndex ?? (isCombo && seriesType === 'line' ? 1 : 0),
          animationDelay: (i: number) => i * 40,
        };
        if (seriesType === 'bar') {
          item.itemStyle = { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: color }, { offset: 1, color: color + 'B0' }] }, borderRadius: [3, 3, 0, 0] };
          item.barMaxWidth = 40;
          if (isStacked) item.stack = s.stack || 'total';
          // Show value labels on top of bars
          item.label = { show: true, position: 'top', color: txtColor, fontSize: 8, fontWeight: 800, fontFamily: 'Inter', formatter: (chart.yAxisUnit === '$B' || chart.yAxisUnit === '$b') ? '${c}' : '{c}' + (chart.yAxisUnit === '%' ? '%' : '') };
        }
        if (seriesType === 'line') {
          item.lineStyle = { width: 2.5, color, type: 'dashed' };
          item.itemStyle = { color };
          item.symbol = 'triangle';
          item.symbolSize = 8;
          item.smooth = 0.3;
          item.label = { show: true, position: 'bottom', color, fontSize: 7, fontWeight: 800, fontFamily: 'Inter', formatter: '{c}' + (chart.yAxis2Unit === '%' ? '%' : '') };
          if (chart.type === 'area') {
            item.areaStyle = { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: color + '40' }, { offset: 1, color: color + '05' }] } };
          }
        }
        return item;
      }),
      animationEasing: 'cubicOut', animationDuration: 800,
    };
  }

  const panelStyle: React.CSSProperties = { background: light ? 'rgba(0,0,0,.015)' : 'rgba(255,255,255,.015)', border: `1px solid ${borderColor}`, padding: '20px 16px 12px', position: 'relative', overflow: 'hidden' };

  return (
    <section style={{ marginBottom: 48 }}>
      <SectionRule label="Report Charts" accent="#A100FF" />
      <div style={{ fontSize: 8, color: a(.2), marginTop: -16, marginBottom: 16 }}>Recreated from AlphaSense PDF report — interactive versions</div>
      <div style={{ display: 'grid', gridTemplateColumns: charts.length === 1 ? '1fr' : 'repeat(2, 1fr)', gap: 16 }}>
        {charts.map((chart, ci) => (
          <motion.div key={ci} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: .5, delay: ci * .1, ease }}
            style={{ ...panelStyle, gridColumn: charts.length === 3 && ci === 2 ? 'span 2' : undefined }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '-.01em', lineHeight: 1.3 }}>{chart.title}</div>
                {chart.description && <div style={{ fontSize: 7, color: a(.3), marginTop: 3, lineHeight: 1.5 }}>{chart.description}</div>}
              </div>
              <button onClick={() => onAskRobin(`Analyze this chart: "${chart.title}". ${chart.description}`)}
                style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'rgba(59,130,246,.08)', border: '1px solid rgba(59,130,246,.15)', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', flexShrink: 0 }}
              ><span style={{ fontSize: 6, fontWeight: 800, color: '#60a5fa' }}>Ask Robin</span></button>
            </div>
            <EChart option={buildOption(chart)} style={{ height: 260 }} opts={{ renderer: 'canvas' }} />
            {/* Source attribution */}
            {chart.source && (chart.source.organization || chart.source.document_title) && (
              <div style={{ marginTop: 6, paddingTop: 6, borderTop: `1px solid ${borderColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 7, color: a(.2) }}>
                  {chart.source.organization}{chart.source.date ? ` · ${chart.source.date}` : ''}
                  {chart.source.document_title ? ` — ${chart.source.document_title}` : ''}
                </div>
                {chart.source.url && <a href={chart.source.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 7, fontWeight: 700, color: '#60a5fa', textDecoration: 'none' }}>Source ↗</a>}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════
   DATA VISUALIZATIONS — ECharts premium rendering
   ══════════════════════════════════════════════ */
function GeneratedChartsSection({ financials, topCompanies, findingCounts, onAskRobin, onSelectCompany, onScrollToSection }: {
  financials: FinancialHighlight[]; topCompanies: TopCompany[];
  findingCounts: { trends: number; opportunities: number; challenges: number };
  onAskRobin: (label: string) => void;
  onSelectCompany: (idx: number) => void; onScrollToSection: (anchor: string) => void;
}) {
  const light = useCompassStore(s => s.theme) === 'light';
  const a = (o: number) => `rgb(var(--ink) / ${o})`;
  // Dynamic import state for ECharts (heavy library — lazy load)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [EChart, setEChart] = useState<any>(null);
  useEffect(() => {
    import('echarts-for-react').then(mod => setEChart(() => mod.default));
  }, []);

  const txtColor = light ? 'rgba(0,0,0,.45)' : 'rgba(255,255,255,.45)';
  const subtxtColor = light ? 'rgba(0,0,0,.2)' : 'rgba(255,255,255,.2)';
  const bgColor = 'transparent';
  const borderColor = light ? 'rgba(0,0,0,.06)' : 'rgba(255,255,255,.06)';

  // ── Parse financial data ──
  const finData = financials.slice(0, 12).map(f => {
    const raw = f.current_value.replace(/[,$£€¥\s]/g, '');
    const m = raw.match(/^([+-]?)(\d+\.?\d*)\s*(%|[KMBT])?$/i);
    let val = m ? parseFloat(m[2]) : parseFloat(raw) || 0;
    const suffix = m?.[3]?.toUpperCase();
    if (suffix === 'K') val /= 1000;
    else if (suffix === 'M') val *= 1;
    else if (suffix === 'B') val *= 1000;
    else if (suffix === 'T') val *= 1000000;
    return { name: f.metric, value: val, display: f.current_value, change: f.change };
  }).filter(d => d.value > 0).sort((x, y) => x.value - y.value);

  // ── Company revenue data ──
  const compData = topCompanies.slice(0, 10).map(c => ({
    name: c.name, value: parseChartValue(c.revenue) / 1e9, display: c.revenue, ticker: c.ticker,
  })).filter(d => d.value > 0).sort((x, y) => x.value - y.value);

  // ── Finding distribution (actual finding counts, not link counts) ──
  const findingDist = [
    { name: 'Trends', value: findingCounts.trends, color: '#A100FF' },
    { name: 'Opportunities', value: findingCounts.opportunities, color: '#34d399' },
    { name: 'Challenges', value: findingCounts.challenges, color: '#f87171' },
  ].filter(d => d.value > 0);

  // ── Company impact heatmap data ──
  const heatData: [number, number, number][] = [];
  const cats = ['Trends', 'Opportunities', 'Challenges'] as const;
  const catKeys = ['trends', 'opportunities', 'challenges'] as const;
  const compNames = topCompanies.slice(0, 10).map(c => c.name.length > 18 ? c.name.substring(0, 16) + '…' : c.name);
  topCompanies.slice(0, 10).forEach((c, ci) => {
    catKeys.forEach((k, ki) => { heatData.push([ki, ci, c.linked_findings[k].length]); });
  });
  const heatMax = Math.max(...heatData.map(d => d[2]), 1);

  if (finData.length === 0 && compData.length === 0) return null;
  if (!EChart) return (
    <section id="sec-3" style={{ marginBottom: 48, scrollMarginTop: 56 }}>
      <SectionRule label="Data Visualizations" accent="#fbbf24" />
      <div style={{ padding: '40px 0', textAlign: 'center' }}>
        <span className="ms" style={{ fontSize: 24, color: a(.1), animation: 'pulse 1.5s infinite' }}>insert_chart</span>
        <div style={{ fontSize: 10, color: a(.2), marginTop: 8 }}>Loading visualizations...</div>
      </div>
    </section>
  );

  const panelStyle: React.CSSProperties = { background: light ? 'rgba(0,0,0,.015)' : 'rgba(255,255,255,.015)', border: `1px solid ${borderColor}`, padding: '20px 16px 8px', position: 'relative', overflow: 'hidden' };

  // ── ECharts options ──
  const marketMetricsOpt = {
    backgroundColor: bgColor,
    tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const }, backgroundColor: light ? '#fff' : '#1a1a1a', borderColor: borderColor, textStyle: { color: light ? '#000' : '#fff', fontSize: 11, fontWeight: 700, fontFamily: 'Inter' },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      formatter: (p: any) => { const d = p[0]; const item = finData[d.dataIndex]; return `<b>${item.name}</b><br/>${item.display}${item.change ? ` <span style="color:${item.change?.startsWith('-') ? '#f87171' : '#34d399'}">${item.change}</span>` : ''}`; },
    },
    grid: { left: 10, right: 30, top: 8, bottom: 8, containLabel: true },
    xAxis: { type: 'value' as const, show: false },
    yAxis: { type: 'category' as const, data: finData.map(d => d.name.length > 28 ? d.name.substring(0, 26) + '…' : d.name), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: txtColor, fontSize: 9, fontWeight: 700, fontFamily: 'Inter' } },
    series: [{ type: 'bar' as const, data: finData.map((d, i) => ({ value: d.value, itemStyle: { color: { type: 'linear' as const, x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: i % 2 === 0 ? 'rgba(251,191,36,.65)' : 'rgba(245,158,11,.55)' }, { offset: 1, color: i % 2 === 0 ? 'rgba(245,158,11,.9)' : 'rgba(251,191,36,.85)' }] }, borderRadius: [0, 3, 3, 0] } })), barWidth: 16, label: { show: true, position: 'right' as const, color: txtColor, fontSize: 9, fontWeight: 800, fontFamily: 'Inter',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      formatter: (p: any) => finData[p.dataIndex].display }, animationDelay: (i: number) => i * 60, }],
    animationEasing: 'cubicOut' as const,
    animationDuration: 800,
  };

  const compRevenueOpt = {
    backgroundColor: bgColor,
    tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const }, backgroundColor: light ? '#fff' : '#1a1a1a', borderColor, textStyle: { color: light ? '#000' : '#fff', fontSize: 11, fontWeight: 700, fontFamily: 'Inter' },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      formatter: (p: any) => { const d = p[0]; const item = compData[d.dataIndex]; return `<b>${item.name}</b>${item.ticker ? ` (${item.ticker})` : ''}<br/>${item.display}`; },
    },
    grid: { left: 10, right: 40, top: 8, bottom: 8, containLabel: true },
    xAxis: { type: 'value' as const, show: false },
    yAxis: { type: 'category' as const, data: compData.map(d => d.name.length > 20 ? d.name.substring(0, 18) + '…' : d.name), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: txtColor, fontSize: 9, fontWeight: 700, fontFamily: 'Inter' } },
    series: [{ type: 'bar' as const, data: compData.map((d, i) => ({ value: d.value, itemStyle: { color: { type: 'linear' as const, x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: `rgba(96,165,250,${0.3 + (i / compData.length) * 0.4})` }, { offset: 1, color: `rgba(59,130,246,${0.5 + (i / compData.length) * 0.45})` }] }, borderRadius: [0, 3, 3, 0] } })), barWidth: 18, label: { show: true, position: 'right' as const, color: txtColor, fontSize: 9, fontWeight: 800, fontFamily: 'Inter',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      formatter: (p: any) => compData[p.dataIndex].display }, animationDelay: (i: number) => i * 80, }],
    animationEasing: 'cubicOut' as const, animationDuration: 1000,
  };

  const donutOpt = {
    backgroundColor: bgColor,
    tooltip: { trigger: 'item' as const, backgroundColor: light ? '#fff' : '#1a1a1a', borderColor, textStyle: { color: light ? '#000' : '#fff', fontSize: 11, fontWeight: 700, fontFamily: 'Inter' } },
    series: [{
      type: 'pie' as const, radius: ['52%', '78%'], center: ['50%', '50%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 6, borderColor: light ? '#fafafa' : '#0a0a0a', borderWidth: 3 },
      label: { show: true, color: txtColor, fontSize: 10, fontWeight: 800, fontFamily: 'Inter', formatter: '{b}\n{c}' },
      labelLine: { lineStyle: { color: subtxtColor } },
      emphasis: { itemStyle: { shadowBlur: 20, shadowColor: 'rgba(161,0,255,.3)' }, label: { fontSize: 12, fontWeight: 900 } },
      data: findingDist.map(d => ({ value: d.value, name: d.name, itemStyle: { color: d.color } })),
      animationType: 'scale' as const, animationEasing: 'cubicOut' as const, animationDuration: 1000,
    }],
  };

  const heatmapOpt = compNames.length > 0 ? {
    backgroundColor: bgColor,
    tooltip: { position: 'top' as const, backgroundColor: light ? '#fff' : '#1a1a1a', borderColor, textStyle: { color: light ? '#000' : '#fff', fontSize: 11, fontWeight: 700, fontFamily: 'Inter' },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      formatter: (p: any) => `<b>${compNames[p.value[1]]}</b><br/>${cats[p.value[0]]}: ${p.value[2]} findings`,
    },
    grid: { left: 10, right: 20, top: 30, bottom: 10, containLabel: true },
    xAxis: { type: 'category' as const, data: [...cats], position: 'top' as const, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: txtColor, fontSize: 9, fontWeight: 800, fontFamily: 'Inter' }, splitArea: { show: false } },
    yAxis: { type: 'category' as const, data: compNames, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: txtColor, fontSize: 8, fontWeight: 700, fontFamily: 'Inter' }, splitArea: { show: false } },
    visualMap: { min: 0, max: heatMax, show: false, inRange: { color: ['rgba(161,0,255,.04)', 'rgba(161,0,255,.15)', 'rgba(161,0,255,.35)', 'rgba(161,0,255,.6)', '#A100FF'] } },
    series: [{ type: 'heatmap' as const, data: heatData, label: { show: true, color: txtColor, fontSize: 10, fontWeight: 900, fontFamily: 'Inter' }, emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(161,0,255,.4)' } }, itemStyle: { borderRadius: 3, borderColor: light ? '#fafafa' : '#0a0a0a', borderWidth: 2 }, animationDelay: (i: number) => i * 30, }],
    animationEasing: 'cubicOut' as const, animationDuration: 800,
  } : null;

  return (
    <section id="sec-3" style={{ marginBottom: 48, scrollMarginTop: 56 }}>
      <SectionRule label="Data Visualizations" accent="#fbbf24" />
      <div style={{ fontSize: 8, color: a(.2), marginTop: -16, marginBottom: 16 }}>Auto-generated from AlphaSense financial highlights and company intelligence data</div>

      {/* Top row: Market Metrics + Company Revenue */}
      <div style={{ display: 'grid', gridTemplateColumns: compData.length > 0 ? '1fr 1fr' : '1fr', gap: 16 }}>
        {finData.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: .5, ease }} style={panelStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 8, fontWeight: 900, color: '#fbbf24', letterSpacing: '.12em', textTransform: 'uppercase' }}>Market Metrics</div>
                <div style={{ fontSize: 7, color: a(.2), marginTop: 2 }}>{finData.length} key indicators</div>
              </div>
              <button onClick={() => onAskRobin('Analyze the key financial metrics shown in the data visualizations. What are the most significant trends?')}
                style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'rgba(59,130,246,.08)', border: '1px solid rgba(59,130,246,.15)', borderRadius: 4, padding: '2px 6px', cursor: 'pointer' }}
              ><span style={{ fontSize: 6, fontWeight: 800, color: '#60a5fa' }}>Ask Robin</span></button>
            </div>
            <EChart option={marketMetricsOpt} style={{ height: Math.max(finData.length * 30, 200) }} opts={{ renderer: 'canvas' }} />
          </motion.div>
        )}

        {compData.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: .5, delay: .1, ease }} style={panelStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 8, fontWeight: 900, color: '#60a5fa', letterSpacing: '.12em', textTransform: 'uppercase' }}>Company Revenue</div>
                <div style={{ fontSize: 7, color: a(.2), marginTop: 2 }}>Top {compData.length} by annual revenue</div>
              </div>
              <button onClick={() => onAskRobin('Compare the revenue profiles of the top companies. Who dominates and how do smaller players compete?')}
                style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'rgba(59,130,246,.08)', border: '1px solid rgba(59,130,246,.15)', borderRadius: 4, padding: '2px 6px', cursor: 'pointer' }}
              ><span style={{ fontSize: 6, fontWeight: 800, color: '#60a5fa' }}>Ask Robin</span></button>
            </div>
            <EChart option={compRevenueOpt} style={{ height: Math.max(compData.length * 32, 200), cursor: 'pointer' }} opts={{ renderer: 'canvas' }}
              onEvents={{ click: (p: { dataIndex: number }) => { const orig = topCompanies.findIndex(c => c.name === compData[p.dataIndex]?.name); if (orig >= 0) onSelectCompany(orig); } }} />
          </motion.div>
        )}
      </div>

      {/* Bottom row: Finding Distribution Donut + Company Heatmap */}
      {(findingDist.length > 0 || heatmapOpt) && (
        <div style={{ display: 'grid', gridTemplateColumns: findingDist.length > 0 && heatmapOpt ? '1fr 2fr' : '1fr', gap: 16, marginTop: 16 }}>
          {findingDist.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: .5, delay: .2, ease }} style={panelStyle}>
              <div style={{ fontSize: 8, fontWeight: 900, color: '#A100FF', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 4 }}>Intelligence Mix</div>
              <div style={{ fontSize: 7, color: a(.2) }}>Finding distribution across categories</div>
              <EChart option={donutOpt} style={{ height: 220, cursor: 'pointer' }} opts={{ renderer: 'canvas' }}
                onEvents={{ click: (p: { name: string }) => { const map: Record<string, string> = { Trends: 'sec-0', Opportunities: 'sec-2', Challenges: 'sec-4' }; const anchor = map[p.name]; if (anchor) onScrollToSection(anchor); } }} />
            </motion.div>
          )}

          {heatmapOpt && (
            <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: .5, delay: .3, ease }} style={panelStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div>
                  <div style={{ fontSize: 8, fontWeight: 900, color: '#A100FF', letterSpacing: '.12em', textTransform: 'uppercase' }}>Company × Finding Heatmap</div>
                  <div style={{ fontSize: 7, color: a(.2), marginTop: 2 }}>Density of findings per company across categories</div>
                </div>
              </div>
              <EChart option={heatmapOpt} style={{ height: Math.max(compNames.length * 28 + 40, 200), cursor: 'pointer' }} opts={{ renderer: 'canvas' }}
                onEvents={{ click: (p: { value?: [number, number, number] }) => {
                  if (!p.value) return;
                  const [catIdx, compIdx] = p.value;
                  const sectionMap = ['sec-0', 'sec-2', 'sec-4'];
                  if (p.value[2] > 0) onScrollToSection(sectionMap[catIdx]);
                  else onSelectCompany(compIdx);
                } }} />
            </motion.div>
          )}
        </div>
      )}
    </section>
  );
}

/* ══════════════════════════════════════════════
   SECTION RULE — editorial divider
   ══════════════════════════════════════════════ */
function VisualIntelligenceSection({ images, onAskRobin }: { images: { src: string; caption?: string }[]; onAskRobin: (label: string) => void }) {
  const [expandedImg, setExpandedImg] = useState<number | null>(null);
  return (
    <>
      <section style={{ marginBottom: 48, scrollMarginTop: 56 }}>
        <SectionRule label="Extracted Charts" accent="#fbbf24" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, marginTop: 20 }}>
          {images.map((img, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: .3, delay: i * .04, ease }}
              style={{ cursor: 'pointer', overflow: 'hidden', background: 'rgb(var(--ink) / .03)', border: '1px solid rgb(var(--ink) / .08)', transition: 'border-color .2s', position: 'relative' }}
              whileHover={{ borderColor: 'rgba(251,191,36,.2)' }}
            >
              <div onClick={() => setExpandedImg(i)} style={{ width: '100%', height: 130, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgb(var(--ink) / .02)' }}>
                <img src={img.src} alt={img.caption || `Chart ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ padding: '5px 8px', borderTop: '1px solid rgb(var(--ink) / .06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 7, fontWeight: 700, color: 'rgb(var(--ink) / .3)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{img.caption || `Chart ${i + 1}`}</span>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button onClick={(e) => { e.stopPropagation(); onAskRobin(`Interpret chart: ${img.caption || `Chart ${i + 1}`} from the Visual Intelligence section. Describe what this chart likely shows based on the intelligence context.`); }}
                    title="Ask Robin to interpret"
                    style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'rgba(59,130,246,.08)', border: '1px solid rgba(59,130,246,.15)', borderRadius: 4, padding: '2px 5px', cursor: 'pointer', transition: 'all .15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59,130,246,.2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(59,130,246,.08)'; }}
                  >
                    <span style={{ fontSize: 6, fontWeight: 800, color: '#60a5fa' }}>Ask Robin</span>
                  </button>
                  <span onClick={() => setExpandedImg(i)} className="ms" style={{ fontSize: 12, color: 'rgba(251,191,36,.3)', cursor: 'pointer' }}>zoom_in</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Lightbox */}
      <AnimatePresence>
        {expandedImg !== null && images[expandedImg] && (
          <motion.div
            key="lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setExpandedImg(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 250, background: 'rgba(0,0,0,.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: .25 }}
              onClick={e => e.stopPropagation()}
              style={{ maxWidth: '85vw', maxHeight: '85vh', position: 'relative' }}
            >
              <img src={images[expandedImg].src} alt={images[expandedImg].caption || ''} style={{ maxWidth: '100%', maxHeight: '75vh', display: 'block', border: '2px solid rgba(251,191,36,.2)' }} />
              <div style={{ padding: '10px 0', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.5)' }}>{images[expandedImg].caption || `Chart ${expandedImg + 1}`}</span>
                <button onClick={(e) => { e.stopPropagation(); setExpandedImg(null); onAskRobin(`Analyze and interpret this chart in detail: ${images[expandedImg].caption || `Chart ${expandedImg + 1}`}. What are the key takeaways, trends shown, and strategic implications?`); }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(59,130,246,.15)', border: '1px solid rgba(59,130,246,.3)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', transition: 'all .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59,130,246,.3)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(59,130,246,.15)'; }}
                >
                  <span style={{ fontSize: 8, fontWeight: 800, color: '#60a5fa' }}>Ask Robin to interpret</span>
                </button>
              </div>
              {images.length > 1 && (
                <>
                  <button onClick={(e) => { e.stopPropagation(); setExpandedImg(expandedImg > 0 ? expandedImg - 1 : images.length - 1); }}
                    style={{ position: 'absolute', left: -48, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,.4)', fontSize: 28, cursor: 'pointer' }}>←</button>
                  <button onClick={(e) => { e.stopPropagation(); setExpandedImg(expandedImg < images.length - 1 ? expandedImg + 1 : 0); }}
                    style={{ position: 'absolute', right: -48, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,.4)', fontSize: 28, cursor: 'pointer' }}>→</button>
                </>
              )}
              <button onClick={() => setExpandedImg(null)}
                style={{ position: 'absolute', top: -36, right: 0, background: 'none', border: 'none', color: 'rgba(255,255,255,.4)', fontSize: 18, cursor: 'pointer', fontWeight: 900 }}>✕</button>
              <div style={{ textAlign: 'center', marginTop: 2 }}>
                <span style={{ fontSize: 8, color: 'rgba(255,255,255,.2)' }}>{expandedImg + 1} / {images.length}</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function SectionRule({ label, accent }: { label: string; accent: string }) {
  return (
    <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: .4, ease }}
      style={{ display: 'flex', alignItems: 'baseline', gap: 12, borderBottom: '2px solid var(--rule)', paddingBottom: 6, marginBottom: 24 }}>
      <h2 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-.04em', textTransform: 'uppercase' }}>{label}</h2>
      <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
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
      style={{ paddingBottom: 14, marginBottom: 14, borderBottom: isLast ? 'none' : '1px solid rgb(var(--ink) / .08)', cursor: 'pointer', transition: 'border-color .2s' }}
      onMouseEnter={e => { if (!isLast) e.currentTarget.style.borderBottomColor = `${accent}30`; }}
      onMouseLeave={e => { if (!isLast) e.currentTarget.style.borderBottomColor = 'rgb(var(--ink) / .08)'; }}>
      <span style={{ fontSize: 8, fontWeight: 900, color: accent, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4, display: 'block' }}>
        {'tag' in item ? item.tag : type}
      </span>
      <h3 style={{ fontSize: 14, fontWeight: 900, letterSpacing: '-.02em', lineHeight: 1.2, marginBottom: 4 }}>{item.t}</h3>
      <p style={{ fontSize: 9, lineHeight: 1.6, color: 'rgb(var(--ink) / .3)' }}>{item.d.substring(0, 100)}{item.d.length > 100 ? '...' : ''}</p>
      <div style={{ fontSize: 7, fontWeight: 900, letterSpacing: '.1em', color: 'rgb(var(--ink) / .1)', marginTop: 6, textTransform: 'uppercase' }}>
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
function BrokerAnalysisSection({ newsItems, onExpand, topCompanies, onSelectCompany }: { newsItems: NewsItem[]; onExpand: (i: number) => void; topCompanies: TopCompany[]; onSelectCompany: (idx: number) => void }) {
  const [page, setPage] = useState(0);
  const light = useCompassStore(s => s.theme) === 'light';
  const perPage = 6;
  const totalPages = Math.ceil(newsItems.length / perPage);
  const pageItems = newsItems.slice(page * perPage, (page + 1) * perPage);

  if (newsItems.length === 0) return null;

  return (
    <section id="sec-1" style={{
      margin: '0 -48px', marginBottom: 48, scrollMarginTop: 56,
      background: light
        ? 'linear-gradient(145deg, rgba(161,0,255,.04) 0%, rgba(161,0,255,.02) 40%, rgba(96,165,250,.03) 100%)'
        : 'linear-gradient(145deg, #0d1117 0%, #0a0a0a 40%, #0f0a18 100%)',
      color: 'var(--t1)', position: 'relative', overflow: 'hidden',
      transition: 'background .4s',
    }}>
      {/* Border frame */}
      <div style={{ position: 'absolute', inset: 12, border: `1px solid ${light ? 'rgba(161,0,255,.08)' : 'rgb(var(--ink) / .08)'}`, pointerEvents: 'none' }} />

      {/* ── Crest Masthead ── */}
      <div style={{ padding: '32px 48px 24px', textAlign: 'center', borderBottom: '1px solid rgb(var(--ink) / .08)', position: 'relative' }}>
        {/* Center spine line through crest — dark mode only */}
        {!light && <div style={{ position: 'absolute', top: 0, left: '50%', width: 1, height: '100%', background: 'rgb(var(--ink) / .08)', pointerEvents: 'none' }} />}

        <div style={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Top ornamental line */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ width: 40, height: 1, background: 'linear-gradient(to right, transparent, rgb(var(--ink) / .15))' }} />
            <div style={{ width: 4, height: 4, background: 'rgba(161,0,255,.4)', transform: 'rotate(45deg)' }} />
            <div style={{ width: 40, height: 1, background: 'linear-gradient(to left, transparent, rgb(var(--ink) / .15))' }} />
          </div>

          {/* > symbol */}
          <div style={{ fontSize: 32, fontWeight: 900, color: '#A100FF', lineHeight: .8, letterSpacing: '-.04em' }}>&gt;</div>

          {/* Brand text */}
          <div style={{ fontSize: 7, fontWeight: 900, letterSpacing: '.35em', color: 'rgb(var(--ink) / .25)', marginTop: 6, textTransform: 'uppercase' }}>ACCSENSE</div>

          {/* Middle ornamental line */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0' }}>
            <div style={{ width: 25, height: 1, background: 'rgb(var(--ink) / .1)' }} />
            <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(161,0,255,.3)' }} />
            <div style={{ width: 25, height: 1, background: 'rgb(var(--ink) / .1)' }} />
          </div>

          {/* Section title */}
          <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t1)' }}>BROKER ANALYSIS & ARTICLES</div>

          {/* Bottom ornament */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
            <div style={{ width: 30, height: 1, background: 'linear-gradient(to right, transparent, rgb(var(--ink) / .1))' }} />
            <span style={{ fontSize: 7, fontWeight: 700, color: 'rgba(96,165,250,.5)', letterSpacing: '.15em' }}>{newsItems.length} ARTICLES</span>
            <div style={{ width: 30, height: 1, background: 'linear-gradient(to left, transparent, rgb(var(--ink) / .1))' }} />
          </div>
        </div>
      </div>

      {/* ── Articles Grid (paginated) ── */}
      <div style={{ padding: '28px 48px 20px', position: 'relative' }}>
        {/* Center spine continues — dark mode only */}
        {!light && <div style={{ position: 'absolute', top: 0, left: '50%', width: 1, height: '100%', background: 'rgb(var(--ink) / .08)', pointerEvents: 'none' }} />}
        {/* Spine shadow */}
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 20, height: '100%', background: light ? 'linear-gradient(to right, transparent, rgba(161,0,255,.02) 45%, rgba(161,0,255,.04) 50%, rgba(161,0,255,.02) 55%, transparent)' : 'linear-gradient(to right, transparent, rgba(0,0,0,.06) 45%, rgba(0,0,0,.1) 50%, rgba(0,0,0,.06) 55%, transparent)', pointerEvents: 'none' }} />

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
                style={{ cursor: 'pointer', paddingBottom: 16, borderBottom: '1px solid rgb(var(--ink) / .08)', transition: 'border-color .2s' }}
                onMouseEnter={e => (e.currentTarget.style.borderBottomColor = 'rgba(96,165,250,.2)')}
                onMouseLeave={e => (e.currentTarget.style.borderBottomColor = 'rgb(var(--ink) / .08)')}>
                <h3 style={{ fontSize: 12, fontWeight: 900, letterSpacing: '-.02em', lineHeight: 1.3, marginBottom: 6 }}>{n.headline}</h3>
                {n.summary !== n.headline && (
                  <p style={{ fontSize: 8, lineHeight: 1.6, color: 'rgb(var(--ink) / .3)', marginBottom: 8 }}>{n.summary.substring(0, 100)}{n.summary.length > 100 ? '...' : ''}</p>
                )}
                {n.analyst_quote && (
                  <div style={{ marginBottom: 8, paddingLeft: 8, borderLeft: '2px solid rgba(96,165,250,.2)' }}>
                    <p style={{ fontSize: 7, fontStyle: 'italic', color: 'rgba(96,165,250,.5)', lineHeight: 1.6 }}>"{n.analyst_quote}"</p>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                  {n.type && <span style={{ fontSize: 5, fontWeight: 900, padding: '2px 4px', background: '#60a5fa', color: '#fff', textTransform: 'uppercase', letterSpacing: '.03em' }}>{n.type}</span>}
                  {n.source_org && <span style={{ fontSize: 7, fontWeight: 700, color: 'rgb(var(--ink) / .2)' }}>{n.source_org}</span>}
                  {n.date && <span style={{ fontSize: 6, color: 'rgb(var(--ink) / .12)' }}>· {n.date}</span>}
                </div>
                {/* Company chips */}
                {n.linked_top_companies && n.linked_top_companies.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                    {n.linked_top_companies.slice(0, 4).map(tcIdx => {
                      const c = topCompanies[tcIdx];
                      if (!c) return null;
                      return (
                        <span key={tcIdx}
                          onClick={(e) => { e.stopPropagation(); onSelectCompany(tcIdx); }}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 6px', background: 'rgba(96,165,250,.06)', border: '1px solid rgba(96,165,250,.1)', fontSize: 7, fontWeight: 700, color: 'rgb(var(--ink) / .35)', cursor: 'pointer', transition: 'all .15s' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(96,165,250,.15)'; e.currentTarget.style.borderColor = 'rgba(96,165,250,.25)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(96,165,250,.06)'; e.currentTarget.style.borderColor = 'rgba(96,165,250,.1)'; }}
                        >
                          <CompanyLogo name={c.name} logoUrl={c.logo_url} size={12} />
                          {c.name.length > 15 ? c.name.substring(0, 13) + '…' : c.name}
                        </span>
                      );
                    })}
                    {n.linked_top_companies.length > 4 && (
                      <span style={{ fontSize: 6, fontWeight: 700, color: 'rgb(var(--ink) / .15)', padding: '2px 4px' }}>+{n.linked_top_companies.length - 4}</span>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Page Turn Footer ── */}
      {totalPages > 1 && (
        <div style={{ padding: '12px 48px 24px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
          <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
            style={{ background: 'none', border: 'none', cursor: page === 0 ? 'default' : 'pointer', color: page === 0 ? 'rgb(var(--ink) / .08)' : 'rgb(var(--ink) / .3)', fontSize: 16, transition: 'color .2s', padding: '4px 8px' }}
            onMouseEnter={e => { if (page > 0) e.currentTarget.style.color = '#A100FF'; }}
            onMouseLeave={e => { e.currentTarget.style.color = page === 0 ? 'rgb(var(--ink) / .08)' : 'rgb(var(--ink) / .3)'; }}
          >←</button>

          {/* Page dots */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {Array.from({ length: totalPages }).map((_, pi) => (
              <button key={pi} onClick={() => setPage(pi)}
                style={{ width: pi === page ? 16 : 5, height: 5, border: 'none', cursor: 'pointer', background: pi === page ? '#A100FF' : 'rgb(var(--ink) / .1)', transition: 'all .3s cubic-bezier(.4,0,.2,1)', padding: 0 }} />
            ))}
          </div>

          <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page === totalPages - 1}
            style={{ background: 'none', border: 'none', cursor: page === totalPages - 1 ? 'default' : 'pointer', color: page === totalPages - 1 ? 'rgb(var(--ink) / .08)' : '#A100FF', fontSize: 16, transition: 'all .2s', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
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

          let fill = 'rgb(var(--ink) / .08)';
          let stroke = 'rgb(var(--ink) / .08)';
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
            fill = 'rgb(var(--ink) / .08)';
            stroke = 'rgb(var(--ink) / .08)';
          } else if (rc) {
            fill = rc.fill;
            stroke = 'rgb(var(--ink) / .08)';
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
