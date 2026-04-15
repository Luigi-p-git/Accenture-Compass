'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';

const STAGE_NAMES: Record<string, string> = {
  parse: 'Parsing Document', classify: 'Classifying Data', extract: 'Extracting Structure',
  cluster: 'Clustering & Matching', validate: 'Validating Quality', stage: 'Staging Changes',
};

const TARGET_SCHEMAS: Record<string, { label: string; attrs: string[] }> = {
  'revenue-trend': { label: 'Revenue Trend', attrs: ['year', 'revenue', 'growth_pct'] },
  'client-group': { label: 'Client Group Revenue', attrs: ['sector', 'revenue', 'growth_pct'] },
  'top-clients': { label: 'Top 10 Clients', attrs: ['name', 'initials', 'sector', 'revenue', 'growth_pct'] },
  'talent-headcount': { label: 'Talent Headcount', attrs: ['city', 'province', 'headcount'] },
  'talent-skills': { label: 'Skill Breakdown', attrs: ['skill_name', 'count', 'percentage', 'growth'] },
  'macro-indicators': { label: 'Macro Indicators', attrs: ['indicator', 'value', 'change', 'direction'] },
  'industry-rankings': { label: 'Industry Rankings', attrs: ['industry', 'revenue', 'growth_pct', 'companies'] },
  'kpi-strip': { label: 'KPI Metrics', attrs: ['metric', 'value', 'change'] },
};

function parseFile(file: File): Promise<{ columns: string[]; rows: any[][]; preview: any[] }> { // eslint-disable-line @typescript-eslint/no-explicit-any
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][]; // eslint-disable-line @typescript-eslint/no-explicit-any
        const columns = (json[0] || []).map(String);
        const rows = json.slice(1).filter(r => r.some(c => c !== null && c !== undefined && c !== ''));
        const preview = rows.map(r => {
          const obj: Record<string, any> = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
          columns.forEach((c, i) => { obj[c] = r[i]; });
          return obj;
        });
        resolve({ columns, rows, preview });
      } catch (err) { reject(err); }
    };
    reader.readAsArrayBuffer(file);
  });
}

/* ── AlphaSense Mode data ── */
const ALPHA_REGIONS: Record<string, string[]> = {
  'Americas': ['Canada', 'United States', 'Brazil', 'Mexico', 'Argentina', 'Colombia', 'Chile'],
  'EMEA': ['United Kingdom', 'Germany', 'France', 'Italy', 'Spain', 'Netherlands', 'Switzerland', 'South Africa', 'UAE', 'Saudi Arabia'],
  'APAC': ['China', 'Japan', 'South Korea', 'India', 'Australia', 'Singapore', 'Indonesia', 'Thailand'],
};

const ALPHA_INDUSTRIES = [
  'All Industries', 'Banking & Capital Markets', 'CG&S, Retail, Travel', 'Chemicals & Natural Resources',
  'Communications & Media', 'Energy', 'Health', 'High Tech', 'Industrials',
  'Insurance', 'Life Sciences', 'Public Service', 'Software & Platforms', 'Utilities',
];

const ALPHA_TIMEFRAMES = ['6 Months', '12 Months', '24 Months'];

function buildAlphaPrompt(region: string, country: string, industry: string, timeframe: string) {
  const subject = country || region || 'Global Markets';
  const industryCtx = industry && industry !== 'All Industries' ? industry : 'technology, energy, financial services, trade policy, regulatory environment';
  const tf = timeframe.toLowerCase();
  const regionCtx = country && region ? ` Particularly in the context of ${subject}'s position within the ${region} region.` : '';

  return `ROLE: You are a senior strategy consultant and market analyst conducting a comprehensive intelligence briefing for ${subject}.

CONTEXT: I am researching ${subject} with a focus on developments from the past ${tf}. I need a structured intelligence brief covering emerging trends, strategic opportunities, key challenges, financial metrics, and broker/analyst sources across ${industryCtx}.${regionCtx}

This report will be published in an executive magazine format. Every finding must be substantiated with a verifiable source, and every source MUST include a direct URL or hyperlink whenever publicly available.

══════════════════════════════════
EMERGING TRENDS
══════════════════════════════════

Present 5-8 findings. Number every finding sequentially starting from 1.

For EACH finding, present in this EXACT structure:

1. [Title — concise, 5-10 words]
Description: [4-6 detailed sentences. Include specific data: dollar figures, percentages, company names, policy names, dates. Be thorough — this is the most important part. Do NOT compress for brevity.]
Impact: [High/Medium/Low] — [one-sentence justification]
Timeframe: [Near-term (0-12 months) / Medium-term (1-3 years) / Long-term (3-5+ years)]
Source: [Document title], [Organization], [Document type], [Date]
Source URL: [Full https:// URL to the source document. Provide the direct link to the earnings transcript, press release, SEC/SEDAR filing, government publication, or news article. If behind a paywall, provide the landing page URL. Write NONE only as last resort.]
Companies Affected: [CompanyName (impact: positive — one-sentence detail with revenue/market data)], [CompanyName (impact: negative — detail)]
Key Metrics: [Metric: $Value (+change%)], [Metric: Value]

══════════════════════════════════
STRATEGIC OPPORTUNITIES
══════════════════════════════════

Present 5-8 findings numbered sequentially continuing from above. Same EXACT format as Emerging Trends.

══════════════════════════════════
KEY CHALLENGES
══════════════════════════════════

Present 5-8 findings numbered sequentially continuing from above. Same EXACT format as Emerging Trends.

══════════════════════════════════
FINANCIAL HIGHLIGHTS
══════════════════════════════════

List 8-12 key economic and market metrics. Use EXACTLY this format — one clean line per metric:

- GDP Growth: 1.8% (+0.3pp)
- Unemployment Rate: 5.8% (-0.2pp)
- Federal Deficit: CAD$78B (-$12.9B)
- Policy Rate: 2.25% (-100bps)
- Market Index: 34,000 (+41%)
- Home Price: $698K (+0.0%)

STRICT RULES FOR FINANCIAL HIGHLIGHTS:
- Each line: [Metric Name]: [Number with unit] ([change])
- Numbers and units ONLY — no descriptions, no URLs, no website names, no domain names
- Do NOT append source URLs to metric values
- Do NOT include narrative text in metric lines

══════════════════════════════════
BROKER ANALYSIS AND ARTICLES
══════════════════════════════════

This section populates our Broker Analysis magazine spread. List 10-15 of the most important source documents, analyst reports, earnings transcripts, and regulatory filings referenced in your research.

For EACH article, use this EXACT format:

1. [Write a compelling, editorial-style headline summarizing the key finding] — [Source Organization], [Document Type], [Date]
Summary: [2-3 sentence summary of the key insight, including specific data points and analyst quotes where available]
URL: [FULL https:// URL to the source. This is CRITICAL — provide the direct hyperlink to the document, press release, filing page, earnings transcript, or news article. For company filings, link to the investor relations page. For government publications, link to the .gov or .gc.ca page. For broker research, provide the research portal URL if publicly accessible.]

CRITICAL URL REQUIREMENTS:
- Every article MUST attempt to include a URL
- For earnings calls: link to the company's investor relations / SEC Edgar / SEDAR+ page
- For press releases: link to the company's newsroom or PR Newswire/GlobeNewsWire page
- For government publications: link to the official .gov / .gc.ca / central bank page
- For broker research: link to the research firm's public insights page if available
- For news articles: link to the publisher's article page (Reuters, Bloomberg, Financial Post, etc.)
- Only write NONE if absolutely no public URL exists for the source
- Include analyst names and direct quotes where possible — this adds credibility to the magazine

══════════════════════════════════
SYNTHESIS
══════════════════════════════════

3-5 sentences connecting the most critical cross-cutting themes. Highlight the single most important development for decision-makers. Reference specific findings by number.

══════════════════════════════════
STRICT FORMAT RULES — READ CAREFULLY
══════════════════════════════════

1. NUMBER every finding sequentially (1, 2, 3...) across all categories
2. Every finding MUST have Description:, Impact:, Timeframe:, Source:, Source URL: on separate lines
3. Every finding MUST include a Source URL — this is non-negotiable for our publication
4. Companies Affected: use format "CompanyName (impact: positive/negative/neutral — detail)"
5. FINANCIAL HIGHLIGHTS: numbers only, no URLs, no domains, no narrative text in metric lines
6. BROKER ANALYSIS: every article MUST have a URL line — provide the best available public link
7. Prioritize primary sources: earnings transcripts, analyst reports, SEC/SEDAR filings, official government publications
8. Aim for 15-24 total findings across Trends + Opportunities + Challenges
9. All URLs must be complete (start with https://)
10. Do NOT embed URLs or domain names inside description text or metric values — put them ONLY on the Source URL: or URL: line`;
}

interface Job {
  id: string; documentName: string; status: string; progress: number;
  stages: { name: string; status: string; duration?: number }[];
}

export default function AdminPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'agent' | 'manual'>('agent');
  const [drag, setDrag] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsedFile, setParsedFile] = useState<{ name: string; columns: string[]; rows: any[][]; preview: any[] } | null>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [alphaMode, setAlphaMode] = useState(false);
  const [alphaRegion, setAlphaRegion] = useState('');
  const [alphaCountry, setAlphaCountry] = useState('');
  const [alphaIndustry, setAlphaIndustry] = useState('');
  const [alphaTimeframe, setAlphaTimeframe] = useState('12 Months');
  // Step 2: Conversion
  const [alphaInputMode, setAlphaInputMode] = useState<'paste' | 'pdf' | 'json'>('paste');
  const [alphaInput, setAlphaInput] = useState('');
  const [alphaJsonInput, setAlphaJsonInput] = useState('');
  const alphaPdfRef = useRef<HTMLInputElement>(null);
  const [alphaPdfName, setAlphaPdfName] = useState('');
  const [alphaProcessing, setAlphaProcessing] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [alphaResult, setAlphaResult] = useState<any>(null);
  const [alphaError, setAlphaError] = useState('');
  const [alphaTargetCountry, setAlphaTargetCountry] = useState('canada');
  const [alphaTargetIndustry, setAlphaTargetIndustry] = useState('all-industries');
  const [alphaSaved, setAlphaSaved] = useState(false);
  const [chartPdfRef] = useState(() => ({ current: null as HTMLInputElement | null }));
  const [chartImages, setChartImages] = useState<{ src: string; caption: string }[]>([]);
  const [chartProcessing, setChartProcessing] = useState(false);
  const [chartError, setChartError] = useState('');

  const toggleTarget = (key: string) => {
    setSelectedTargets(prev => {
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
      // Rebuild column map for all selected targets
      if (parsedFile) {
        const allAttrs = next.flatMap(k => TARGET_SCHEMAS[k]?.attrs || []);
        const unique = [...new Set(allAttrs)];
        const autoMap: Record<string, string> = {};
        unique.forEach(attr => {
          if (columnMap[attr]) { autoMap[attr] = columnMap[attr]; return; }
          const match = parsedFile.columns.find(col =>
            col.toLowerCase().replace(/[^a-z0-9]/g, '').includes(attr.toLowerCase().replace(/[^a-z0-9]/g, ''))
          );
          if (match) autoMap[attr] = match;
        });
        setColumnMap(autoMap);
      }
      return next;
    });
  };

  // Combined attrs from all selected targets
  const allSelectedAttrs = [...new Set(selectedTargets.flatMap(k => TARGET_SCHEMAS[k]?.attrs || []))];

  useEffect(() => {
    const obs = new IntersectionObserver(e => e.forEach(x => { if (x.isIntersecting) x.target.classList.add('v'); }), { threshold: 0.08 });
    setTimeout(() => document.querySelectorAll('.fu').forEach(el => obs.observe(el)), 60);
    return () => obs.disconnect();
  }, []);

  const poll = useCallback(async (id: string) => {
    const check = async () => {
      try {
        const r = await fetch(`/api/pipeline?id=${id}`);
        const d = await r.json();
        if (d.job) {
          setJobs(prev => { const idx = prev.findIndex(j => j.id === id); const u = [...prev]; if (idx >= 0) u[idx] = d.job; else u.push(d.job); return u; });
          setActiveJob(d.job);
          if (d.job.status !== 'completed') setTimeout(check, 2000);
        }
      } catch {}
    };
    check();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault(); setDrag(false);
    for (const file of Array.from(e.dataTransfer.files)) {
      const r = await fetch('/api/pipeline', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documentName: file.name }) });
      const d = await r.json();
      if (d.success) poll(d.jobId);
    }
  }, [poll]);

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: "'Inter',system-ui,sans-serif", color: '#fff', overflowY: 'auto' }}>
      <header className="bar" style={{ position: 'sticky', top: 0, zIndex: 40 }}>
        <div className="bar-l">
          <span style={{ fontSize: 14, fontWeight: 900, cursor: 'pointer' }} onClick={() => router.push('/')}>accenture</span>
          <div style={{ width: 1, height: 14, background: 'var(--s3)', margin: '0 6px' }} />
          <span style={{ fontSize: 11, fontWeight: 300, color: 'var(--t2)' }}>Compass</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--p)', marginLeft: 12 }}>Admin</span>
        </div>
        <div className="bar-r">
          <button className="cta-g" style={{ fontSize: 10, padding: '7px 16px' }} onClick={() => router.push('/')}>World Map</button>
          <button className="cta-g" style={{ fontSize: 10, padding: '7px 16px' }} onClick={() => router.push('/explore/canada')}>Canada</button>
        </div>
      </header>

      <div className="sec">
        <div className="fu sec-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="tag">Data Management</div>
            <div className="h2" style={{ marginTop: 4, fontSize: 36 }}>{mode === 'agent' ? 'Agentic Pipeline' : 'Manual Upload'}</div>
            <p className="sub" style={{ marginTop: 4 }}>{mode === 'agent' ? 'Drop documents — AI agents parse, classify, extract, and stage automatically.' : 'Upload files to populate specific charts, tables, and data artifacts directly.'}</p>
          </div>
          {/* Mode toggle */}
          <div style={{ display: 'flex', background: 'var(--s1)', border: '1px solid var(--s2)', borderRadius: 8, padding: 3, flexShrink: 0 }}>
            <button onClick={() => setMode('agent')} style={{
              padding: '8px 18px', borderRadius: 6, border: 'none', cursor: 'pointer',
              fontSize: 10, fontWeight: 800, letterSpacing: '.06em',
              background: mode === 'agent' ? 'var(--p)' : 'transparent',
              color: mode === 'agent' ? '#fff' : 'var(--t3)',
              transition: 'all .2s',
            }}>
              <span className="ms" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 4 }}>smart_toy</span>Agent
            </button>
            <button onClick={() => setMode('manual')} style={{
              padding: '8px 18px', borderRadius: 6, border: 'none', cursor: 'pointer',
              fontSize: 10, fontWeight: 800, letterSpacing: '.06em',
              background: mode === 'manual' ? 'var(--p)' : 'transparent',
              color: mode === 'manual' ? '#fff' : 'var(--t3)',
              transition: 'all .2s',
            }}>
              <span className="ms" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 4 }}>upload_file</span>Manual
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 24, minWidth: 0 }}>
          <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>

          {/* ── AGENT MODE ── */}
          {mode === 'agent' && (<>
            <div
              className="fu"
              onDragOver={e => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={handleDrop}
              style={{
                padding: 48, textAlign: 'center', borderRadius: 14, cursor: 'pointer', transition: 'all .3s',
                background: drag ? 'rgba(161,0,255,.06)' : 'var(--s1)',
                border: drag ? '2px dashed var(--p)' : '2px dashed var(--s2)',
                transform: drag ? 'scale(1.01)' : 'none',
              }}
            >
              <div style={{ width: 56, height: 56, borderRadius: 14, background: 'rgba(161,0,255,.1)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
                <span className="ms" style={{ fontSize: 28, color: 'var(--p)' }}>cloud_upload</span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>Drop Documents Here</div>
              <p style={{ fontSize: 12, color: 'var(--t3)', maxWidth: 380, margin: '0 auto 16px', lineHeight: 1.6 }}>
                PDF, Excel, PowerPoint, or CSV. The agentic AI pipeline will parse, classify, extract structured data, cluster entities, validate quality, and stage changes for approval.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                {['PDF', 'XLSX', 'PPTX', 'CSV'].map(t => (
                  <span key={t} style={{ fontSize: 9, fontWeight: 800, padding: '4px 10px', borderRadius: 4, background: 'var(--s1)', border: '1px solid var(--s2)', color: 'var(--t3)' }}>{t}</span>
                ))}
              </div>
            </div>

            {/* Jobs */}
            {jobs.map(j => (
              <div key={j.id} className="fu" style={{ marginTop: 12, padding: 16, borderRadius: 10, background: 'var(--s1)', border: '1px solid var(--s2)', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => setActiveJob(j)}>
                <span className="ms" style={{ fontSize: 18, color: 'var(--p)' }}>description</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{j.documentName}</div>
                  <div style={{ fontSize: 9, color: 'var(--t3)' }}>{j.status === 'completed' ? 'Complete' : STAGE_NAMES[j.status] || j.status}</div>
                </div>
                <div style={{ width: 80, height: 4, borderRadius: 99, background: 'var(--s2)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 99, background: j.status === 'completed' ? 'var(--em)' : 'var(--p)', width: `${j.progress}%`, transition: 'width .5s' }} />
                </div>
                <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--t3)', width: 32, textAlign: 'right' }}>{j.progress}%</span>
                <span className="ms" style={{ fontSize: 16, color: j.status === 'completed' ? 'var(--em)' : 'var(--p)' }}>
                  {j.status === 'completed' ? 'check_circle' : 'sync'}
                </span>
              </div>
            ))}
          </>)}

          {/* ── MANUAL MODE ── */}
          {mode === 'manual' && (
            <div style={{ animation: 'fadeIn .3s', display: 'flex', flexDirection: 'column', minHeight: 0 }}>

              {/* AlphaSense toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexShrink: 0 }}>
                <button onClick={() => setAlphaMode(!alphaMode)} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 18px', borderRadius: 99, cursor: 'pointer',
                  background: alphaMode ? 'rgba(161,0,255,.12)' : 'var(--s1)',
                  border: alphaMode ? '1px solid rgba(161,0,255,.3)' : '1px solid var(--s2)',
                  color: alphaMode ? '#fff' : 'var(--t3)',
                  fontSize: 10, fontWeight: 800, letterSpacing: '.04em',
                  transition: 'all .25s cubic-bezier(.16,1,.3,1)',
                }}>
                  <div style={{
                    width: 28, height: 16, borderRadius: 99, padding: 2,
                    background: alphaMode ? 'var(--p)' : 'var(--s3)',
                    transition: 'background .25s',
                    display: 'flex', alignItems: alphaMode ? 'center' : 'center',
                    justifyContent: alphaMode ? 'flex-end' : 'flex-start',
                  }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#fff', transition: 'all .25s' }} />
                  </div>
                  AlphaSense Mode
                </button>
                {alphaMode && (
                  <span style={{ fontSize: 9, color: 'var(--t3)', fontWeight: 500 }}>Configure intelligence query parameters below</span>
                )}
              </div>

              {/* AlphaSense Panel */}
              {alphaMode && (
                <div style={{ flexShrink: 0, marginBottom: 16, animation: 'fadeIn .3s' }}>
                  {/* Parameter dropdowns */}
                  <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                    {/* Region */}
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 8, fontWeight: 800, color: 'var(--t4)', letterSpacing: '.15em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Region</label>
                      <select value={alphaRegion} onChange={e => { setAlphaRegion(e.target.value); setAlphaCountry(''); }} style={{
                        width: '100%', padding: '9px 12px', borderRadius: 8,
                        background: 'var(--s1)', border: '1px solid var(--s2)',
                        color: alphaRegion ? '#fff' : 'var(--t3)',
                        fontSize: 11, fontWeight: 600, fontFamily: "'Inter',sans-serif",
                        outline: 'none', cursor: 'pointer', appearance: 'none',
                      }}>
                        <option value="" style={{ background: '#111' }}>All Regions</option>
                        {Object.keys(ALPHA_REGIONS).map(r => <option key={r} value={r} style={{ background: '#111' }}>{r}</option>)}
                      </select>
                    </div>
                    {/* Country */}
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 8, fontWeight: 800, color: 'var(--t4)', letterSpacing: '.15em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Country</label>
                      <select value={alphaCountry} onChange={e => setAlphaCountry(e.target.value)} style={{
                        width: '100%', padding: '9px 12px', borderRadius: 8,
                        background: 'var(--s1)', border: '1px solid var(--s2)',
                        color: alphaCountry ? '#fff' : 'var(--t3)',
                        fontSize: 11, fontWeight: 600, fontFamily: "'Inter',sans-serif",
                        outline: 'none', cursor: 'pointer', appearance: 'none',
                      }}>
                        <option value="" style={{ background: '#111' }}>All Countries</option>
                        {(alphaRegion ? ALPHA_REGIONS[alphaRegion] : Object.values(ALPHA_REGIONS).flat()).map(c => (
                          <option key={c} value={c} style={{ background: '#111' }}>{c}</option>
                        ))}
                      </select>
                    </div>
                    {/* Industry */}
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 8, fontWeight: 800, color: 'var(--t4)', letterSpacing: '.15em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Industry</label>
                      <select value={alphaIndustry} onChange={e => setAlphaIndustry(e.target.value)} style={{
                        width: '100%', padding: '9px 12px', borderRadius: 8,
                        background: 'var(--s1)', border: '1px solid var(--s2)',
                        color: alphaIndustry ? '#fff' : 'var(--t3)',
                        fontSize: 11, fontWeight: 600, fontFamily: "'Inter',sans-serif",
                        outline: 'none', cursor: 'pointer', appearance: 'none',
                      }}>
                        <option value="" style={{ background: '#111' }}>Select Industry</option>
                        {ALPHA_INDUSTRIES.map(ind => <option key={ind} value={ind} style={{ background: '#111' }}>{ind}</option>)}
                      </select>
                    </div>
                    {/* Timeframe */}
                    <div style={{ flex: 0.7 }}>
                      <label style={{ fontSize: 8, fontWeight: 800, color: 'var(--t4)', letterSpacing: '.15em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Timeframe</label>
                      <select value={alphaTimeframe} onChange={e => setAlphaTimeframe(e.target.value)} style={{
                        width: '100%', padding: '9px 12px', borderRadius: 8,
                        background: 'var(--s1)', border: '1px solid var(--s2)',
                        color: '#fff',
                        fontSize: 11, fontWeight: 600, fontFamily: "'Inter',sans-serif",
                        outline: 'none', cursor: 'pointer', appearance: 'none',
                      }}>
                        {ALPHA_TIMEFRAMES.map(t => <option key={t} value={t} style={{ background: '#111' }}>{t}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Selection summary pills */}
                  <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                    {alphaRegion && <span style={{ fontSize: 8, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: 'rgba(96,165,250,.08)', border: '1px solid rgba(96,165,250,.15)', color: '#60a5fa' }}>{alphaRegion}</span>}
                    {alphaCountry && <span style={{ fontSize: 8, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: 'rgba(161,0,255,.08)', border: '1px solid rgba(161,0,255,.15)', color: 'var(--p)' }}>{alphaCountry}</span>}
                    {alphaIndustry && <span style={{ fontSize: 8, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: 'rgba(52,211,153,.08)', border: '1px solid rgba(52,211,153,.15)', color: '#34d399' }}>{alphaIndustry}</span>}
                    <span style={{ fontSize: 8, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: 'rgba(251,191,36,.08)', border: '1px solid rgba(251,191,36,.15)', color: '#fbbf24' }}>{alphaTimeframe}</span>
                  </div>

                  {/* Prompt area */}
                  <div style={{ position: 'relative' }}>
                    <div style={{ fontSize: 8, fontWeight: 800, color: 'var(--t4)', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>Generated Prompt</span>
                      <button onClick={() => navigator.clipboard.writeText(buildAlphaPrompt(alphaRegion, alphaCountry, alphaIndustry, alphaTimeframe))} style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '3px 8px', borderRadius: 4, border: '1px solid var(--s2)',
                        background: 'var(--s1)', color: 'var(--t3)',
                        fontSize: 8, fontWeight: 700, cursor: 'pointer', transition: 'all .2s',
                      }}>
                        <span className="ms" style={{ fontSize: 11 }}>content_copy</span>Copy
                      </button>
                    </div>
                    <div style={{
                      padding: '14px 16px', borderRadius: 10,
                      background: 'rgba(161,0,255,.03)',
                      border: '1px solid rgba(161,0,255,.1)',
                      maxHeight: 200, overflowY: 'auto',
                      fontSize: 10, color: 'var(--t2)', lineHeight: 1.8,
                      fontFamily: "'Inter',sans-serif", whiteSpace: 'pre-wrap',
                      scrollbarWidth: 'thin',
                    }}>
                      {buildAlphaPrompt(alphaRegion, alphaCountry, alphaIndustry, alphaTimeframe)}
                    </div>
                  </div>

                  {/* Run query button */}
                  <button style={{
                    width: '100%', padding: '12px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: 'var(--p)', color: '#fff', marginTop: 14,
                    fontSize: 11, fontWeight: 800, letterSpacing: '.06em',
                    boxShadow: '0 4px 20px rgba(161,0,255,.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'transform .15s',
                  }} onClick={() => alert('AlphaSense query will be sent to the API in Phase 3.')}>
                    <span className="ms" style={{ fontSize: 16 }}>bolt</span>
                    Run AlphaSense Query
                  </button>

                  {/* ── Step 2: Convert AlphaSense Output ── */}
                  <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--s2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                      <span className="ms" style={{ fontSize: 16, color: 'var(--p)' }}>transform</span>
                      <span style={{ fontSize: 13, fontWeight: 800 }}>Step 2 — Convert AlphaSense Output</span>
                    </div>

                    {/* Three-tab toggle */}
                    <div style={{ display: 'flex', background: 'var(--s1)', border: '1px solid var(--s2)', borderRadius: 8, padding: 3, marginBottom: 14 }}>
                      {([['paste', 'content_paste', 'Paste Text'], ['pdf', 'picture_as_pdf', 'Upload PDF'], ['json', 'data_object', 'Paste JSON']] as const).map(([key, ic, label]) => (
                        <button key={key} onClick={() => setAlphaInputMode(key as 'paste' | 'pdf' | 'json')} style={{
                          flex: 1, padding: '7px 0', borderRadius: 5, border: 'none', cursor: 'pointer',
                          fontSize: 9, fontWeight: 800, letterSpacing: '.04em',
                          background: alphaInputMode === key ? 'var(--p)' : 'transparent',
                          color: alphaInputMode === key ? '#fff' : 'var(--t3)',
                          transition: 'all .2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                        }}>
                          <span className="ms" style={{ fontSize: 13 }}>{ic}</span>{label}
                        </button>
                      ))}
                    </div>

                    {/* Paste Text */}
                    {alphaInputMode === 'paste' && (
                      <textarea
                        value={alphaInput}
                        onChange={e => { setAlphaInput(e.target.value); setAlphaResult(null); setAlphaError(''); setAlphaSaved(false); }}
                        placeholder="Paste your AlphaSense output here...&#10;&#10;EMERGING TRENDS&#10;&#10;1. Finding title&#10;Description: ...&#10;Impact: High — ...&#10;Timeframe: Near-term (0-12 months)&#10;Source: ..."
                        style={{
                          width: '100%', height: 160, padding: '12px 14px', borderRadius: 10,
                          background: 'var(--s1)', border: '1px solid var(--s2)', color: '#fff',
                          fontSize: 10, fontFamily: "'Inter',sans-serif", lineHeight: 1.7,
                          resize: 'vertical', outline: 'none',
                        }}
                      />
                    )}

                    {/* Upload PDF */}
                    {alphaInputMode === 'pdf' && (
                      <>
                        <input ref={alphaPdfRef} type="file" accept=".pdf" style={{ display: 'none' }}
                          onChange={async (e) => {
                            const f = e.target.files?.[0]; if (!f) return;
                            setAlphaPdfName(f.name);
                            setAlphaResult(null); setAlphaError(''); setAlphaSaved(false);
                            // Read as text for FormData later — store in alphaInput as marker
                            setAlphaInput(`__PDF__${f.name}`);
                          }}
                        />
                        <div
                          onClick={() => alphaPdfRef.current?.click()}
                          style={{
                            padding: alphaPdfName ? '12px 16px' : '24px 16px', textAlign: 'center', borderRadius: 10, cursor: 'pointer',
                            background: alphaPdfName ? 'rgba(52,211,153,.04)' : 'var(--s1)',
                            border: alphaPdfName ? '1px solid rgba(52,211,153,.2)' : '2px dashed var(--s2)',
                            display: alphaPdfName ? 'flex' : 'block', alignItems: 'center', gap: 12,
                            transition: 'all .3s',
                          }}
                        >
                          {alphaPdfName ? (<>
                            <span className="ms" style={{ fontSize: 20, color: 'var(--em)' }}>check_circle</span>
                            <div style={{ flex: 1, textAlign: 'left' }}>
                              <div style={{ fontSize: 11, fontWeight: 800 }}>{alphaPdfName}</div>
                              <div style={{ fontSize: 9, color: 'var(--t3)' }}>PDF ready for conversion</div>
                            </div>
                            <span style={{ fontSize: 8, color: 'var(--t4)', fontWeight: 700 }}>Replace</span>
                          </>) : (<>
                            <span className="ms" style={{ fontSize: 24, color: 'var(--p)' }}>picture_as_pdf</span>
                            <div style={{ fontSize: 13, fontWeight: 800, marginTop: 6 }}>Drop or click to upload PDF</div>
                            <p style={{ fontSize: 10, color: 'var(--t3)', marginTop: 3 }}>AlphaSense PDF export</p>
                          </>)}
                        </div>
                      </>
                    )}

                    {/* Paste JSON */}
                    {alphaInputMode === 'json' && (
                      <textarea
                        value={alphaJsonInput}
                        onChange={e => { setAlphaJsonInput(e.target.value); setAlphaResult(null); setAlphaError(''); setAlphaSaved(false); }}
                        placeholder='Paste pre-converted JSON here...&#10;&#10;{&#10;  "subject": "Canada",&#10;  "findings": [ ... ],&#10;  "synthesis": "..."&#10;}'
                        style={{
                          width: '100%', height: 160, padding: '12px 14px', borderRadius: 10,
                          background: 'var(--s1)', border: '1px solid var(--s2)', color: '#fff',
                          fontSize: 10, fontFamily: "'JetBrains Mono','Consolas',monospace", lineHeight: 1.6,
                          resize: 'vertical', outline: 'none',
                        }}
                      />
                    )}

                    {/* Convert button */}
                    <button
                      disabled={alphaProcessing || (alphaInputMode === 'paste' && !alphaInput.trim()) || (alphaInputMode === 'pdf' && !alphaPdfName) || (alphaInputMode === 'json' && !alphaJsonInput.trim())}
                      style={{
                        width: '100%', padding: '11px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                        background: alphaProcessing ? 'var(--s2)' : 'linear-gradient(135deg, var(--p), #6b21a8)',
                        color: '#fff', marginTop: 12,
                        fontSize: 11, fontWeight: 800, letterSpacing: '.06em',
                        boxShadow: alphaProcessing ? 'none' : '0 4px 16px rgba(161,0,255,.25)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        opacity: alphaProcessing ? .6 : 1, transition: 'all .2s',
                      }}
                      onClick={async () => {
                        setAlphaProcessing(true); setAlphaError(''); setAlphaResult(null); setAlphaSaved(false);
                        try {
                          let res;
                          if (alphaInputMode === 'pdf' && alphaPdfRef.current?.files?.[0]) {
                            const form = new FormData();
                            form.append('file', alphaPdfRef.current.files[0]);
                            res = await fetch('/api/alphasense', { method: 'POST', body: form });
                          } else if (alphaInputMode === 'json') {
                            const parsed = JSON.parse(alphaJsonInput);
                            res = await fetch('/api/alphasense', {
                              method: 'POST', headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ json: parsed }),
                            });
                          } else {
                            res = await fetch('/api/alphasense', {
                              method: 'POST', headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ text: alphaInput }),
                            });
                          }
                          const data = await res.json();
                          if (!res.ok) {
                            const debugInfo = data.debug ? `\n\nInput preview: "${data.debug.inputPreview?.substring(0, 150)}..."\n\nHint: ${data.debug.hint}` : '';
                            throw new Error((data.error || 'Conversion failed') + debugInfo);
                          }
                          setAlphaResult(data);
                          // Auto-detect country
                          const subject = (data.alphasense?.subject || '').toLowerCase().trim();
                          const allCountries = Object.values(ALPHA_REGIONS).flat();
                          const match = allCountries.find(c => subject.includes(c.toLowerCase()));
                          if (match) setAlphaTargetCountry(match.toLowerCase().replace(/\s+/g, '-'));
                        } catch (err) {
                          setAlphaError(err instanceof Error ? err.message : 'Conversion failed');
                        } finally { setAlphaProcessing(false); }
                      }}
                    >
                      {alphaProcessing ? (<><span className="ms" style={{ fontSize: 14, animation: 'pulse 1s infinite' }}>sync</span>Converting...</>) : (<><span className="ms" style={{ fontSize: 14 }}>transform</span>Convert to JSON</>)}
                    </button>

                    {/* Error */}
                    {alphaError && (
                      <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 8, background: 'rgba(248,113,113,.06)', border: '1px solid rgba(248,113,113,.15)', color: 'var(--red)', fontSize: 10, lineHeight: 1.6 }}>
                        <span className="ms" style={{ fontSize: 13, verticalAlign: 'middle', marginRight: 4 }}>error</span>{alphaError}
                      </div>
                    )}

                    {/* Result preview */}
                    {alphaResult && (
                      <div style={{ marginTop: 14, animation: 'fadeIn .3s' }}>
                        {/* Summary bar */}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                          <div style={{ flex: 1, padding: '10px 12px', borderRadius: 8, background: 'rgba(52,211,153,.04)', border: '1px solid rgba(52,211,153,.12)' }}>
                            <div style={{ fontSize: 8, fontWeight: 800, color: 'var(--t4)', letterSpacing: '.12em', textTransform: 'uppercase' }}>Subject</div>
                            <div style={{ fontSize: 13, fontWeight: 900, color: '#fff', marginTop: 2 }}>{alphaResult.alphasense?.subject}</div>
                            <div style={{ fontSize: 8, color: 'var(--t3)', marginTop: 1 }}>{alphaResult.alphasense?.date_generated} · {alphaResult.alphasense?.total_findings} findings</div>
                          </div>
                          {[
                            { label: 'Trends', count: alphaResult.alphasense?.metadata?.emerging_trend_count, color: '#0ea5e9' },
                            { label: 'Opps', count: alphaResult.alphasense?.metadata?.strategic_opportunity_count, color: '#34d399' },
                            { label: 'Risks', count: alphaResult.alphasense?.metadata?.key_challenge_count, color: '#fbbf24' },
                            { label: 'News', count: alphaResult.alphasense?.metadata?.news_count || alphaResult.alphasense?.news_items?.length || 0, color: '#60a5fa' },
                            { label: 'Finance', count: alphaResult.alphasense?.metadata?.financial_highlight_count || alphaResult.alphasense?.financial_highlights?.length || 0, color: '#A100FF' },
                          ].map(c => (
                            <div key={c.label} style={{ padding: '10px 12px', borderRadius: 8, background: `${c.color}08`, border: `1px solid ${c.color}18`, textAlign: 'center', minWidth: 70 }}>
                              <div style={{ fontSize: 20, fontWeight: 900, color: c.color }}>{c.count || 0}</div>
                              <div style={{ fontSize: 7, fontWeight: 800, color: c.color, letterSpacing: '.1em', textTransform: 'uppercase', marginTop: 1 }}>{c.label}</div>
                            </div>
                          ))}
                        </div>

                        {/* Synthesis preview */}
                        {alphaResult.alphasense?.synthesis && (
                          <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(161,0,255,.03)', border: '1px solid rgba(161,0,255,.08)', marginBottom: 10 }}>
                            <div style={{ fontSize: 8, fontWeight: 800, color: 'var(--p)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 4 }}>Synthesis</div>
                            <p style={{ fontSize: 10, color: 'var(--t2)', lineHeight: 1.7 }}>{alphaResult.alphasense.synthesis.substring(0, 300)}{alphaResult.alphasense.synthesis.length > 300 ? '...' : ''}</p>
                          </div>
                        )}

                        {/* Copy JSON button */}
                        <button onClick={() => navigator.clipboard.writeText(JSON.stringify(alphaResult.alphasense, null, 2))} style={{
                          width: '100%', padding: '8px 0', borderRadius: 6, border: '1px solid var(--s2)',
                          background: 'var(--s1)', color: 'var(--t2)', fontSize: 9, fontWeight: 700,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          marginBottom: 10, transition: 'all .2s',
                        }}>
                          <span className="ms" style={{ fontSize: 13 }}>content_copy</span>Copy Raw JSON
                        </button>

                        {/* Country + Industry selector + Update button */}
                        <div style={{ display: 'flex', gap: 8 }}>
                          <div style={{ width: 120 }}>
                            <label style={{ fontSize: 7, fontWeight: 800, color: 'var(--t4)', letterSpacing: '.12em', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Country</label>
                            <select value={alphaTargetCountry} onChange={e => { setAlphaTargetCountry(e.target.value); setAlphaSaved(false); }} style={{
                              width: '100%', padding: '9px 10px', borderRadius: 6,
                              background: 'var(--s1)', border: '1px solid var(--s2)',
                              color: '#fff', fontSize: 10, fontWeight: 700,
                              fontFamily: "'Inter',sans-serif", outline: 'none', cursor: 'pointer', appearance: 'none',
                            }}>
                              {Object.values(ALPHA_REGIONS).flat().map(c => (
                                <option key={c} value={c.toLowerCase().replace(/\s+/g, '-')} style={{ background: '#111' }}>{c}</option>
                              ))}
                            </select>
                          </div>
                          <div style={{ width: 140 }}>
                            <label style={{ fontSize: 7, fontWeight: 800, color: 'var(--t4)', letterSpacing: '.12em', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Industry</label>
                            <select value={alphaTargetIndustry} onChange={e => { setAlphaTargetIndustry(e.target.value); setAlphaSaved(false); }} style={{
                              width: '100%', padding: '9px 10px', borderRadius: 6,
                              background: 'var(--s1)', border: '1px solid var(--s2)',
                              color: '#fff', fontSize: 10, fontWeight: 700,
                              fontFamily: "'Inter',sans-serif", outline: 'none', cursor: 'pointer', appearance: 'none',
                            }}>
                              <option value="all-industries" style={{ background: '#111' }}>All Industries</option>
                              {ALPHA_INDUSTRIES.filter(i => i !== 'All Industries').map(ind => (
                                <option key={ind} value={ind.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')} style={{ background: '#111' }}>{ind}</option>
                              ))}
                            </select>
                          </div>
                          <button
                            disabled={alphaSaved}
                            style={{
                              flex: 1, padding: '9px 0', borderRadius: 6, border: 'none', cursor: alphaSaved ? 'default' : 'pointer',
                              background: alphaSaved ? 'rgba(52,211,153,.15)' : 'var(--em)',
                              color: alphaSaved ? 'var(--em)' : '#000',
                              fontSize: 10, fontWeight: 800, letterSpacing: '.04em',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                              marginTop: 'auto', transition: 'all .2s',
                            }}
                            onClick={async () => {
                              if (!alphaResult?.trends) return;
                              const res = await fetch('/api/data', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ country: alphaTargetCountry, topic: 'trends', data: alphaResult.trends, industry: alphaTargetIndustry === 'all-industries' ? '' : alphaTargetIndustry }),
                              });
                              if (res.ok) setAlphaSaved(true);
                            }}
                          >
                            <span className="ms" style={{ fontSize: 14 }}>{alphaSaved ? 'check_circle' : 'sync'}</span>
                            {alphaSaved ? `Updated ${alphaTargetCountry}${alphaTargetIndustry !== 'all-industries' ? ' / ' + alphaTargetIndustry : ''}` : 'Update Website'}
                          </button>
                        </div>

                      </div>
                    )}
                  </div>

                  {/* ── Visual Intelligence: PDF Chart Upload ── */}
                  <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid var(--s2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <span className="ms" style={{ fontSize: 16, color: '#fbbf24' }}>image</span>
                      <span style={{ fontSize: 13, fontWeight: 800 }}>Visual Intelligence — Extract Charts from PDF</span>
                    </div>
                    <p style={{ fontSize: 9, color: 'var(--t3)', lineHeight: 1.5, marginBottom: 12 }}>Upload an AlphaSense PDF report to extract chart images. Select country and industry, then upload. Charts will appear in the magazine&apos;s Visual Intelligence section.</p>

                    {/* Country + Industry for charts */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                      <div style={{ width: 120 }}>
                        <label style={{ fontSize: 7, fontWeight: 800, color: 'var(--t4)', letterSpacing: '.1em', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Country</label>
                        <select value={alphaTargetCountry} onChange={e => setAlphaTargetCountry(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, background: 'var(--s1)', border: '1px solid var(--s2)', color: '#fff', fontSize: 10, fontWeight: 700, fontFamily: "'Inter',sans-serif", outline: 'none', cursor: 'pointer', appearance: 'none' }}>
                          {Object.values(ALPHA_REGIONS).flat().map(c => (
                            <option key={c} value={c.toLowerCase().replace(/\s+/g, '-')} style={{ background: '#111' }}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ width: 140 }}>
                        <label style={{ fontSize: 7, fontWeight: 800, color: 'var(--t4)', letterSpacing: '.1em', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Industry</label>
                        <select value={alphaTargetIndustry} onChange={e => setAlphaTargetIndustry(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, background: 'var(--s1)', border: '1px solid var(--s2)', color: '#fff', fontSize: 10, fontWeight: 700, fontFamily: "'Inter',sans-serif", outline: 'none', cursor: 'pointer', appearance: 'none' }}>
                          <option value="all-industries" style={{ background: '#111' }}>All Industries</option>
                          {ALPHA_INDUSTRIES.filter(ind => ind !== 'All Industries').map(ind => (
                            <option key={ind} value={ind.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')} style={{ background: '#111' }}>{ind}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <input ref={el => { chartPdfRef.current = el; }} type="file" accept=".pdf" style={{ display: 'none' }}
                      onChange={async (e) => {
                        const f = e.target.files?.[0]; if (!f) return;
                        setChartProcessing(true); setChartError(''); setChartImages([]);
                        try {
                          const form = new FormData();
                          form.append('file', f);
                          form.append('country', alphaTargetCountry);
                          form.append('industry', alphaTargetIndustry === 'all-industries' ? '' : alphaTargetIndustry);
                          const res = await fetch('/api/extract-images', { method: 'POST', body: form });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error);
                          setChartImages(data.images);
                          // Save images to the trends data
                          const trendRes = await fetch(`/api/data?country=${alphaTargetCountry}&topic=trends${alphaTargetIndustry !== 'all-industries' ? `&industry=${alphaTargetIndustry}` : ''}`);
                          if (trendRes.ok) {
                            const trendData = await trendRes.json();
                            const updated = { ...trendData.data, images: data.images };
                            await fetch('/api/data', {
                              method: 'POST', headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ country: alphaTargetCountry, topic: 'trends', data: updated, industry: alphaTargetIndustry === 'all-industries' ? '' : alphaTargetIndustry }),
                            });
                          }
                        } catch (err) { setChartError(err instanceof Error ? err.message : 'Failed'); }
                        finally { setChartProcessing(false); }
                      }}
                    />
                    <button onClick={() => chartPdfRef.current?.click()} disabled={chartProcessing} style={{
                      width: '100%', padding: '12px 0', borderRadius: 8, border: 'none', cursor: chartProcessing ? 'default' : 'pointer',
                      background: chartProcessing ? 'var(--s2)' : 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                      color: chartProcessing ? 'var(--t3)' : '#000',
                      fontSize: 11, fontWeight: 800, letterSpacing: '.04em',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      boxShadow: chartProcessing ? 'none' : '0 4px 16px rgba(251,191,36,.2)',
                      transition: 'all .2s',
                    }}>
                      <span className="ms" style={{ fontSize: 16 }}>{chartProcessing ? 'sync' : 'picture_as_pdf'}</span>
                      {chartProcessing ? 'Extracting charts...' : 'Upload PDF & Extract Charts'}
                    </button>
                    {chartError && <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 6, background: 'rgba(248,113,113,.06)', border: '1px solid rgba(248,113,113,.12)', fontSize: 9, color: 'var(--red)' }}>{chartError}</div>}
                    {chartImages.length > 0 && (
                      <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 6, background: 'rgba(52,211,153,.04)', border: '1px solid rgba(52,211,153,.12)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="ms" style={{ fontSize: 14, color: 'var(--em)' }}>check_circle</span>
                        <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--em)' }}>{chartImages.length} chart{chartImages.length > 1 ? 's' : ''} extracted and saved</span>
                        <span style={{ fontSize: 8, color: 'var(--t3)', marginLeft: 4 }}>→ Visual Intelligence section in the magazine</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Upload zone (compact) */}
              <div style={{ marginBottom: 12, flexShrink: 0 }}>
                <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.json" style={{ display: 'none' }}
                  onChange={async (e) => {
                    const f = e.target.files?.[0]; if (!f) return;
                    const parsed = await parseFile(f);
                    setParsedFile({ name: f.name, ...parsed });
                    setColumnMap({}); setSelectedTargets([]);
                  }}
                />
                <div
                  onDragOver={e => { e.preventDefault(); setDrag(true); }}
                  onDragLeave={() => setDrag(false)}
                  onDrop={async (e) => {
                    e.preventDefault(); setDrag(false);
                    const f = e.dataTransfer.files[0]; if (!f) return;
                    const parsed = await parseFile(f);
                    setParsedFile({ name: f.name, ...parsed });
                    setColumnMap({}); setSelectedTargets([]);
                  }}
                  onClick={() => fileRef.current?.click()}
                  style={{
                    padding: parsedFile ? '12px 16px' : '24px 16px', textAlign: 'center', borderRadius: 10, cursor: 'pointer', transition: 'all .3s',
                    background: drag ? 'rgba(161,0,255,.06)' : parsedFile ? 'rgba(52,211,153,.04)' : 'var(--s1)',
                    border: drag ? '2px dashed var(--p)' : parsedFile ? '1px solid rgba(52,211,153,.2)' : '2px dashed var(--s2)',
                    display: parsedFile ? 'flex' : 'block', alignItems: 'center', gap: 12,
                  }}
                >
                  {parsedFile ? (<>
                    <span className="ms" style={{ fontSize: 20, color: 'var(--em)' }}>check_circle</span>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ fontSize: 11, fontWeight: 800 }}>{parsedFile.name}</div>
                      <div style={{ fontSize: 9, color: 'var(--t3)' }}>{parsedFile.columns.length} cols · {parsedFile.rows.length} rows</div>
                    </div>
                    <span style={{ fontSize: 8, color: 'var(--t4)', fontWeight: 700 }}>Replace</span>
                  </>) : (<>
                    <span className="ms" style={{ fontSize: 24, color: 'var(--p)' }}>upload_file</span>
                    <div style={{ fontSize: 13, fontWeight: 800, marginTop: 6 }}>Drop or click to upload</div>
                    <p style={{ fontSize: 10, color: 'var(--t3)', marginTop: 3 }}>CSV, Excel, or JSON</p>
                  </>)}
                </div>
              </div>

              {/* Multi-select target artifacts */}
              {parsedFile && (
                <div style={{ marginBottom: 12, flexShrink: 0, animation: 'fadeIn .2s' }}>
                  <div style={{ fontSize: 8, fontWeight: 800, color: 'var(--t4)', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 6 }}>Select targets (multi)</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {Object.entries(TARGET_SCHEMAS).map(([key, schema]) => {
                      const on = selectedTargets.includes(key);
                      return (
                        <button key={key} onClick={() => toggleTarget(key)} style={{
                          padding: '5px 10px', borderRadius: 5, cursor: 'pointer',
                          background: on ? 'rgba(161,0,255,.15)' : 'var(--s1)',
                          border: on ? '1px solid rgba(161,0,255,.35)' : '1px solid var(--s2)',
                          color: on ? '#fff' : 'var(--t3)',
                          fontSize: 9, fontWeight: 800, transition: 'all .15s',
                        }}>
                          {on && <span className="ms" style={{ fontSize: 11, verticalAlign: 'middle', marginRight: 3, color: 'var(--p)' }}>check</span>}
                          {schema.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Column mapping (combined from all selected targets) */}
              {parsedFile && allSelectedAttrs.length > 0 && (
                <div style={{ flexShrink: 0, background: 'var(--s1)', border: '1px solid var(--s2)', borderRadius: 8, overflow: 'hidden', marginBottom: 8, maxHeight: 200, overflowY: 'auto' }}>
                  <div style={{ display: 'flex', padding: '6px 12px', borderBottom: '1px solid var(--s2)', fontSize: 8, fontWeight: 800, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.1em', position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 1 }}>
                    <div style={{ width: 130 }}>Attribute</div>
                    <div style={{ width: 16 }} />
                    <div style={{ flex: 1 }}>File Column</div>
                    <div style={{ width: 90 }}>Sample</div>
                  </div>
                  {allSelectedAttrs.map(attr => {
                    const mapped = columnMap[attr];
                    const sample = mapped && parsedFile.preview[0] ? String(parsedFile.preview[0][mapped] ?? '—') : '—';
                    return (
                      <div key={attr} style={{ display: 'flex', alignItems: 'center', padding: '5px 12px', borderBottom: '1px solid var(--s2)' }}>
                        <div style={{ width: 130, fontSize: 10, fontWeight: 700, color: mapped ? '#fff' : 'var(--t3)' }}>{attr}</div>
                        <div style={{ width: 16, textAlign: 'center' }}>
                          <span className="ms" style={{ fontSize: 11, color: mapped ? 'var(--em)' : 'var(--t4)' }}>{mapped ? 'link' : 'link_off'}</span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <select value={mapped || ''} onChange={(e) => setColumnMap(prev => ({ ...prev, [attr]: e.target.value }))} style={{
                            width: '100%', padding: '4px 5px', borderRadius: 4,
                            background: mapped ? 'rgba(161,0,255,.08)' : 'var(--bg)',
                            border: mapped ? '1px solid rgba(161,0,255,.2)' : '1px solid var(--s2)',
                            color: '#fff', fontSize: 9, fontWeight: 600, fontFamily: "'Inter',sans-serif", outline: 'none', cursor: 'pointer',
                          }}>
                            <option value="" style={{ background: '#111' }}>— select —</option>
                            {parsedFile.columns.map(col => <option key={col} value={col} style={{ background: '#111' }}>{col}</option>)}
                          </select>
                        </div>
                        <div style={{ width: 90, paddingLeft: 6, fontSize: 9, color: 'var(--t3)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sample}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* File preview — contained, scrolls both axes */}
              {parsedFile && (
                <div style={{ flex: 1, minHeight: 0, borderRadius: 8, border: '1px solid var(--s2)', background: 'var(--s1)', marginBottom: 8, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <div style={{ padding: '4px 10px', background: 'var(--bg)', borderBottom: '1px solid var(--s2)', fontSize: 8, fontWeight: 800, color: 'var(--t4)', letterSpacing: '.12em', textTransform: 'uppercase', flexShrink: 0 }}>
                    Preview · {parsedFile.rows.length} rows · {parsedFile.columns.length} cols
                  </div>
                  <div style={{ flex: 1, overflow: 'auto' }}>
                    <table style={{ borderCollapse: 'collapse', fontSize: 9, minWidth: 'max-content' }}>
                      <thead><tr>{parsedFile.columns.map(c => (
                        <th key={c} style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 800, fontSize: 8, color: Object.values(columnMap).includes(c) ? 'var(--p)' : 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.05em', borderBottom: '1px solid var(--s2)', background: 'var(--s1)', position: 'sticky', top: 0, whiteSpace: 'nowrap', zIndex: 1 }}>{c}</th>
                      ))}</tr></thead>
                      <tbody>
                        {parsedFile.preview.map((row, i) => (
                          <tr key={i}>{parsedFile.columns.map(c => (
                            <td key={c} style={{ padding: '3px 8px', color: 'var(--t2)', borderBottom: '1px solid var(--s2)', fontWeight: 500, whiteSpace: 'nowrap', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>{String(row[c] ?? '')}</td>
                          ))}</tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Update button — always visible at bottom */}
              {parsedFile && (
                <div style={{ flexShrink: 0 }}>
                  <button style={{
                    width: '100%', padding: '11px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: selectedTargets.length ? 'var(--p)' : 'var(--s2)',
                    color: selectedTargets.length ? '#fff' : 'var(--t4)',
                    fontSize: 11, fontWeight: 800, letterSpacing: '.06em',
                    boxShadow: selectedTargets.length ? '0 4px 16px rgba(161,0,255,.3)' : 'none',
                    transition: 'all .2s',
                  }} onClick={() => {
                    if (!selectedTargets.length) return;
                    alert(`Updating ${selectedTargets.length} artifact(s): ${selectedTargets.map(k => TARGET_SCHEMAS[k].label).join(', ')}\n\n${Object.entries(columnMap).filter(([,v]) => v).map(([k,v]) => `${k} ← ${v}`).join('\n')}`);
                  }}>
                    <span className="ms" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 4 }}>sync</span>
                    Update Website{selectedTargets.length > 0 ? ` (${selectedTargets.length} artifact${selectedTargets.length > 1 ? 's' : ''})` : ''}
                  </button>
                </div>
              )}
            </div>
          )}

          </div>

          {/* Pipeline Detail */}
          <div style={{ width: 320, flexShrink: 0 }}>
            {activeJob ? (
              <div className="fu" style={{ padding: 20, borderRadius: 14, background: 'var(--s1)', border: '1px solid var(--s2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <span className="ms" style={{ fontSize: 16, color: 'var(--p)' }}>conversion_path</span>
                  <span style={{ fontSize: 12, fontWeight: 800 }}>Pipeline Status</span>
                </div>
                {activeJob.stages.map((s, i) => (
                  <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 800, background: s.status === 'completed' ? 'rgba(52,211,153,.15)' : s.status === 'pending' ? 'var(--s1)' : 'rgba(161,0,255,.15)', color: s.status === 'completed' ? 'var(--em)' : s.status === 'pending' ? 'var(--t4)' : 'var(--p)' }}>
                      {s.status === 'completed' ? '✓' : i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: s.status === 'completed' ? 'var(--t2)' : 'var(--t3)' }}>{STAGE_NAMES[s.name]}</div>
                      {s.duration && <div style={{ fontSize: 8, color: 'var(--t4)' }}>{s.duration.toFixed(1)}s</div>}
                    </div>
                    {s.status === 'completed' && <span className="ms" style={{ fontSize: 14, color: 'var(--em)' }}>check</span>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="fu" style={{ padding: 20, borderRadius: 14, background: 'var(--s1)', border: '1px solid var(--s2)' }}>
                <div className="tag" style={{ marginBottom: 12 }}>API Endpoints</div>
                {[
                  'GET  /api/data?country=canada&topic=talent',
                  'POST /api/data { country, topic, data }',
                  'PUT  /api/data { snapshot }',
                  'POST /api/pipeline { documentName }',
                  'GET  /api/pipeline?id=job_xxx',
                ].map(ep => (
                  <div key={ep} style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", padding: '6px 8px', marginBottom: 4, borderRadius: 4, background: 'var(--bg)', color: 'var(--t3)' }}>{ep}</div>
                ))}
              </div>
            )}

            {/* Pipeline explanation */}
            <div className="fu ai" style={{ marginTop: 16 }}>
              <div className="ai-dot"><span className="ms">auto_awesome</span></div>
              <div><div className="tag">Agent Pipeline</div>
                <p style={{ fontSize: 11, color: 'var(--t2)', lineHeight: 1.7 }}>
                  6 Claude-powered agents process each document: <strong>Parser</strong> (OCR + extraction), <strong>Classifier</strong> (data type routing), <strong>Extractor</strong> (structured JSON), <strong>Clusterer</strong> (entity matching), <strong>Validator</strong> (quality check), <strong>Stager</strong> (DB update). Quarterly snapshots with diff/approve/rollback.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
