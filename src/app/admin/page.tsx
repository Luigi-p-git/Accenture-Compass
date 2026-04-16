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

This report will be published in an executive magazine format. Every finding must be substantiated with a verifiable source document.

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
Source Citation: [The primary citation number from your research, e.g. 3 or 42. This is the footnote/reference number for the main source document. Write the number only.]
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
TOP 10 COMPANIES
══════════════════════════════════

Based on all findings above, identify the 10 most significant companies in ${subject}'s ${industryCtx} landscape. These companies should be the ones MOST affected by or positioned for the trends, opportunities, and challenges you identified.

For EACH company, present in this EXACT format:

Company 1: [Company Name]
Ticker: [Stock ticker symbol, or PRIVATE if not publicly traded]
Sector: [Primary industry sector]
Headquarters: [City, Country]
Revenue: [Latest annual revenue with currency, e.g. $180B]
Key Investments: [2-3 major investments or strategic moves. For EACH, include the source citation number in brackets, e.g. "Invested $24B in content production [56]; Acquired streaming rights for NFL [15]; Launched unified Disney+/Hulu app [72]"]
Investment Focus: [2-3 sentences describing current investment priorities and capital allocation strategy]
Recent Moves: [1-2 recent strategic moves with source citation numbers — e.g. "Completed $110.9B acquisition of WBD [33]; Launched StreamSaver bundle at $18/month [34]"]
Linked Findings:
  - Trends: [Finding numbers from Emerging Trends that affect this company, e.g. 1, 3, 5]
  - Opportunities: [Finding numbers from Strategic Opportunities this company is positioned for]
  - Challenges: [Finding numbers from Key Challenges this company faces]

CRITICAL RULES FOR TOP 10 COMPANIES:
- Select companies based on RELEVANCE to the findings above — not just size
- Every company MUST link to at least 3 findings by their exact sequential number
- Finding numbers MUST match the numbering used in the sections above
- Include a mix of sectors reflecting the industry/country focus
- Prioritize companies with cross-category linkages (affected by trends AND opportunities AND challenges)
- Include both public companies (with ticker) and major private/government entities
- Company names MUST be used CONSISTENTLY — use the exact same name in Companies Affected fields throughout

══════════════════════════════════
FINANCIAL HIGHLIGHTS
══════════════════════════════════

List 8-12 key economic and market metrics relevant to ${industryCtx}. Use EXACTLY this format — one clean line per metric:

- Total Market Revenue: $380B (+8.5%)
- Digital Ad Spend: $270B (+12%)
- Broadband Penetration: 92% (+2pp)
- Industry Employment: 2.8M (+3.1%)
- M&A Volume: $85B (+22%)
- Consumer Spending Index: 142 (+4.5%)

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
Summary: [2-3 sentence summary of the key insight, including specific data points]
Analyst Quote: ["Analyst Name, Title at Firm" — "Direct quotation from the report or transcript." Write NONE if no direct quote available.]
Companies Mentioned: [Exact company names from the Top 10 list that this article discusses, comma-separated. Write NONE if no Top 10 company is referenced.]
Sector: [Primary sector this article covers, e.g. Telecom, Streaming, Advertising, Media]

══════════════════════════════════
SYNTHESIS
══════════════════════════════════

3-5 sentences connecting the most critical cross-cutting themes. Highlight the single most important development for decision-makers. Reference specific findings by number.

══════════════════════════════════
STRICT FORMAT RULES — READ CAREFULLY
══════════════════════════════════

1. NUMBER every finding sequentially (1, 2, 3...) across all categories
2. Every finding MUST have Description:, Impact:, Timeframe:, Source:, Source Citation:, Companies Affected:, Key Metrics: on separate lines
3. Every finding MUST include a Source with document title, organization, document type, date, AND a Source Citation number (the primary footnote reference number)
4. Companies Affected: use format "CompanyName (impact: positive/negative/neutral — detail)"
5. FINANCIAL HIGHLIGHTS: numbers only, no URLs, no domains, no narrative text in metric lines
6. Prioritize primary sources: earnings transcripts, analyst reports, SEC/SEDAR filings, official government publications
7. Aim for 15-24 total findings across Trends + Opportunities + Challenges
8. Do NOT embed URLs or domain names inside description text or metric values
9. TOP 10 COMPANIES: every company MUST have Linked Findings with valid finding numbers from above
10. BROKER ANALYSIS: include Analyst Quote, Companies Mentioned, and Sector for every article
11. Companies Affected in findings MUST use the EXACT same company names as in the Top 10 Companies section
12. Each Top 10 Company MUST appear in the Companies Affected field of at least 3 different findings
13. Impact rating criteria: POSITIVE = revenue/margins/market share expected to increase or company well-positioned; NEGATIVE = cost increases, regulatory risk, market share loss, operational disruption; NEUTRAL = affected but outcome uncertain or balanced`;
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
  const [alphaMode, setAlphaMode] = useState(true);
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
  const [alphaProgress, setAlphaProgress] = useState({ step: '', pct: 0 });
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
  // PDF extraction options
  const [pdfExtractCharts, setPdfExtractCharts] = useState(true);
  const [pdfExtractLinks, setPdfExtractLinks] = useState(true);
  const [pdfTransformCharts, setPdfTransformCharts] = useState(true);

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
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
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
        <div style={{ marginBottom: 16, display: 'flex', gap: 20 }}>
          <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', color: 'var(--t2)', fontSize: 9, fontWeight: 700, letterSpacing: '.04em', transition: 'color .2s' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#A100FF'; }}
            onMouseLeave={e => { e.currentTarget.style.color = ''; }}
          ><span className="ms" style={{ fontSize: 14 }}>home</span>Compass Home</a>
          <a href="/explore/world/intelligence" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', color: 'var(--t2)', fontSize: 9, fontWeight: 700, letterSpacing: '.04em', transition: 'color .2s' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#A100FF'; }}
            onMouseLeave={e => { e.currentTarget.style.color = ''; }}
          ><span className="ms" style={{ fontSize: 14 }}>auto_stories</span>AccSense Magazine</a>
        </div>
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
                      <span style={{ fontSize: 13, fontWeight: 800 }}>Step 2 — Load Data & Update</span>
                    </div>

                    {/* Country + Industry selector — shared, at the top */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                      <div style={{ width: 140 }}>
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
                      <div style={{ flex: 1 }}>
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
                    </div>

                    {/* Two-column: JSON paste (left) + PDF for charts (right) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>

                      {/* Left: JSON / Text paste */}
                      <div>
                        <div style={{ display: 'flex', background: 'var(--s1)', border: '1px solid var(--s2)', borderRadius: 6, padding: 2, marginBottom: 8 }}>
                          {([['json', 'data_object', 'Paste JSON'], ['paste', 'content_paste', 'Paste Text']] as const).map(([key, ic, label]) => (
                            <button key={key} onClick={() => setAlphaInputMode(key as 'paste' | 'pdf' | 'json')} style={{
                              flex: 1, padding: '5px 0', borderRadius: 4, border: 'none', cursor: 'pointer',
                              fontSize: 8, fontWeight: 800, letterSpacing: '.04em',
                              background: alphaInputMode === key ? 'var(--p)' : 'transparent',
                              color: alphaInputMode === key ? '#fff' : 'var(--t3)',
                              transition: 'all .2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
                            }}>
                              <span className="ms" style={{ fontSize: 11 }}>{ic}</span>{label}
                            </button>
                          ))}
                        </div>
                        {alphaInputMode === 'json' ? (
                          <textarea
                            value={alphaJsonInput}
                            onChange={e => {
                              const val = e.target.value;
                              setAlphaJsonInput(val); setAlphaResult(null); setAlphaError(''); setAlphaSaved(false);
                              // Auto-detect country + industry from pasted JSON
                              try {
                                const subjectMatch = val.match(/"subject"\s*:\s*"([^"]+)"/);
                                if (subjectMatch) {
                                  const s = subjectMatch[1].toLowerCase();
                                  const allC = Object.values(ALPHA_REGIONS).flat();
                                  const cm = allC.find((c: string) => s.includes(c.toLowerCase()));
                                  if (cm) setAlphaTargetCountry(cm.toLowerCase().replace(/\s+/g, '-'));
                                  const im = ALPHA_INDUSTRIES.filter(i => i !== 'All Industries').find(ind => s.includes(ind.toLowerCase()));
                                  if (im) setAlphaTargetIndustry(im.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
                                }
                              } catch { /* ignore parse errors during typing */ }
                            }}
                            placeholder='Paste JSON here — supports both formats:&#10;&#10;{ "trends": [...], "top_companies": [...] }&#10;&#10;{ "findings": [...], "synthesis": "..." }'
                            style={{
                              width: '100%', height: 140, padding: '10px 12px', borderRadius: 8,
                              background: 'var(--s1)', border: '1px solid var(--s2)', color: '#fff',
                              fontSize: 9, fontFamily: "'JetBrains Mono','Consolas',monospace", lineHeight: 1.6,
                              resize: 'vertical', outline: 'none',
                            }}
                          />
                        ) : (
                          <textarea
                            value={alphaInput}
                            onChange={e => { setAlphaInput(e.target.value); setAlphaResult(null); setAlphaError(''); setAlphaSaved(false); }}
                            placeholder="Paste AlphaSense text output here...&#10;&#10;EMERGING TRENDS&#10;&#10;1. Finding title&#10;Description: ..."
                            style={{
                              width: '100%', height: 140, padding: '10px 12px', borderRadius: 8,
                              background: 'var(--s1)', border: '1px solid var(--s2)', color: '#fff',
                              fontSize: 9, fontFamily: "'Inter',sans-serif", lineHeight: 1.7,
                              resize: 'vertical', outline: 'none',
                            }}
                          />
                        )}
                      </div>

                      {/* Right: PDF upload for chart extraction */}
                      <div>
                        <div style={{ fontSize: 8, fontWeight: 800, color: '#fbbf24', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span className="ms" style={{ fontSize: 12 }}>image</span>Chart PDF (optional)
                        </div>
                        <input ref={el => { chartPdfRef.current = el; }} type="file" accept=".pdf" style={{ display: 'none' }}
                          onChange={async (e) => {
                            const f = e.target.files?.[0]; if (!f) return;
                            setAlphaPdfName(f.name);
                            setChartImages([]); setChartError(''); setAlphaSaved(false);
                          }}
                        />
                        <div
                          onClick={() => chartPdfRef.current?.click()}
                          style={{
                            height: 140, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            borderRadius: 8, cursor: 'pointer',
                            background: alphaPdfName ? 'rgba(251,191,36,.04)' : 'var(--s1)',
                            border: alphaPdfName ? '1px solid rgba(251,191,36,.2)' : '2px dashed var(--s2)',
                            transition: 'all .3s', gap: 6,
                          }}
                        >
                          <span className="ms" style={{ fontSize: 24, color: alphaPdfName ? '#fbbf24' : 'var(--t4)' }}>
                            {alphaPdfName ? 'check_circle' : 'picture_as_pdf'}
                          </span>
                          <div style={{ fontSize: 10, fontWeight: 800, color: alphaPdfName ? '#fbbf24' : 'var(--t3)' }}>
                            {alphaPdfName || 'Upload PDF for charts'}
                          </div>
                          <div style={{ fontSize: 8, color: 'var(--t4)' }}>
                            {alphaPdfName ? 'Click to replace' : 'AlphaSense PDF report'}
                          </div>
                        </div>
                        {/* Extraction options — only show when PDF is attached */}
                        {alphaPdfName && (
                          <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                            {([
                              { key: 'charts', label: 'Extract Charts', icon: 'bar_chart', color: '#fbbf24', state: pdfExtractCharts, set: setPdfExtractCharts, hint: 'instant' },
                              { key: 'links', label: 'Extract Links', icon: 'link', color: '#60a5fa', state: pdfExtractLinks, set: setPdfExtractLinks, hint: 'instant' },
                              { key: 'transform', label: 'Recreate Charts', icon: 'auto_awesome', color: '#A100FF', state: pdfTransformCharts, set: setPdfTransformCharts, hint: '~2 min (AI)' },
                            ] as const).map(opt => (
                              <button key={opt.key} onClick={() => opt.set(!opt.state)}
                                style={{
                                  flex: 1, minWidth: 100, padding: '6px 8px', borderRadius: 6, cursor: 'pointer',
                                  background: opt.state ? `${opt.color}12` : 'var(--s1)',
                                  border: `1px solid ${opt.state ? opt.color + '40' : 'var(--s2)'}`,
                                  display: 'flex', alignItems: 'center', gap: 6, transition: 'all .2s',
                                }}>
                                <span className="ms" style={{ fontSize: 14, color: opt.state ? opt.color : 'var(--t4)' }}>
                                  {opt.state ? 'check_box' : 'check_box_outline_blank'}
                                </span>
                                <div style={{ textAlign: 'left' }}>
                                  <div style={{ fontSize: 8, fontWeight: 800, color: opt.state ? '#fff' : 'var(--t3)' }}>{opt.label}</div>
                                  <div style={{ fontSize: 6, color: 'var(--t4)' }}>{opt.hint}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Single Process & Update button */}
                    {(() => {
                      const hasData = alphaInputMode === 'json' ? !!alphaJsonInput.trim() : !!alphaInput.trim();
                      const hasPdf = !!alphaPdfName;
                      const hasAnything = hasData || hasPdf;
                      return (
                    <div style={{ position: 'relative', width: '100%' }}>
                    {/* Progress bar overlay */}
                    {alphaProcessing && (
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2 }}>
                        <div style={{ height: 3, background: 'var(--s2)', borderRadius: '8px 8px 0 0', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${alphaProgress.pct}%`, background: 'linear-gradient(90deg, #34d399, #22d3ee)', borderRadius: 3, transition: 'width .6s cubic-bezier(.4,0,.2,1)' }} />
                        </div>
                      </div>
                    )}
                    <button
                      disabled={alphaProcessing || alphaSaved || !hasAnything}
                      style={{
                        width: '100%', padding: alphaProcessing ? '10px 0 14px' : '13px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                        background: alphaSaved ? 'rgba(52,211,153,.15)' : alphaProcessing ? 'var(--s1)' : 'linear-gradient(135deg, var(--p), #6b21a8)',
                        color: alphaSaved ? 'var(--em)' : '#fff',
                        fontSize: 12, fontWeight: 900, letterSpacing: '.04em',
                        boxShadow: alphaSaved || alphaProcessing ? 'none' : '0 4px 16px rgba(161,0,255,.3)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: alphaProcessing ? 4 : 0,
                        opacity: !hasAnything && !alphaSaved ? .5 : 1,
                        transition: 'all .2s',
                      }}
                      onClick={async () => {
                        setAlphaProcessing(true); setAlphaError(''); setAlphaResult(null); setAlphaSaved(false);
                        setChartError(''); setChartImages([]);
                        setAlphaProgress({ step: 'Preparing...', pct: 5 });
                        try {
                          const hasDataInput = alphaInputMode === 'json' ? !!alphaJsonInput.trim() : !!alphaInput.trim();
                          const pdfFile = chartPdfRef.current?.files?.[0];
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          let result: any = null;
                          let detectedCountry = alphaTargetCountry;
                          let detectedIndustry = alphaTargetIndustry;

                          // ── Step A: Process JSON or Text (if provided) ──
                          if (hasDataInput) {
                            setAlphaProgress({ step: 'Parsing data...', pct: 10 });
                            if (alphaInputMode === 'json') {
                              let raw = alphaJsonInput.trim();
                              const fenceMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
                              if (fenceMatch) raw = fenceMatch[1].trim();
                              if (raw.startsWith('"') && !raw.startsWith('{')) raw = '{' + raw;
                              if (!raw.endsWith('}')) { const lb = raw.lastIndexOf('}'); if (lb > 0) raw = raw.substring(0, lb + 1); }
                              const si = raw.indexOf('{'); const ei = raw.lastIndexOf('}');
                              if (si !== -1 && ei > si) raw = raw.substring(si, ei + 1);
                              const parsed = JSON.parse(raw);

                              if (parsed.trends && Array.isArray(parsed.trends)) {
                                if (!parsed.source) parsed.source = { subject: 'Unknown', date_generated: new Date().toISOString().split('T')[0], total_findings: (parsed.trends?.length || 0) + (parsed.opportunities?.length || 0) + (parsed.challenges?.length || 0) };
                                result = { success: true, trends: parsed, alphasense: { subject: parsed.source?.subject, findings: [], synthesis: parsed.synthesis || '', metadata: { emerging_trend_count: parsed.trends?.length || 0, strategic_opportunity_count: parsed.opportunities?.length || 0, key_challenge_count: parsed.challenges?.length || 0, news_count: parsed.news_items?.length || 0, financial_highlight_count: parsed.financial_highlights?.length || 0, top_company_count: parsed.top_companies?.length || 0 } } };
                              } else if (parsed.findings && Array.isArray(parsed.findings)) {
                                const res = await fetch('/api/alphasense', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ json: parsed }) });
                                result = await res.json();
                                if (!res.ok) throw new Error(result.error || 'Conversion failed');
                              } else {
                                throw new Error('JSON must have either "trends" or "findings" array');
                              }
                            } else {
                              const res = await fetch('/api/alphasense', {
                                method: 'POST', headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ text: alphaInput }),
                              });
                              result = await res.json();
                              if (!res.ok) {
                                const debugInfo = result.debug ? `\n\nInput preview: "${result.debug.inputPreview?.substring(0, 150)}..."\n\nHint: ${result.debug.hint}` : '';
                                throw new Error((result.error || 'Conversion failed') + debugInfo);
                              }
                            }

                            setAlphaResult(result);

                            // Auto-detect country + industry from subject
                            const subject = (result.alphasense?.subject || result.trends?.source?.subject || '').toLowerCase().trim();
                            const allCountries = Object.values(ALPHA_REGIONS).flat().sort((a, b) => b.length - a.length);
                            const countryMatch = allCountries.find((c: string) => subject.includes(c.toLowerCase()));
                            if (countryMatch) { detectedCountry = countryMatch.toLowerCase().replace(/\s+/g, '-'); setAlphaTargetCountry(detectedCountry); }
                            const industryMatch = ALPHA_INDUSTRIES.filter(i => i !== 'All Industries').sort((a, b) => b.length - a.length).find(ind => subject.includes(ind.toLowerCase()));
                            if (industryMatch) { detectedIndustry = industryMatch.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); setAlphaTargetIndustry(detectedIndustry); }

                            // Save to website
                            setAlphaProgress({ step: 'Saving data...', pct: 40 });
                            if (result?.trends) {
                              const saveRes = await fetch('/api/data', {
                                method: 'POST', headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ country: detectedCountry, topic: 'trends', data: result.trends, industry: detectedIndustry === 'all-industries' ? '' : detectedIndustry }),
                              });
                              if (!saveRes.ok) throw new Error('Failed to save data');
                            }
                          }

                          // ── Step B: PDF processing ──
                          if (pdfFile) {
                            // B1: Extract chart images (if checked)
                            if (pdfExtractCharts) {
                              setAlphaProgress({ step: 'Extracting charts from PDF...', pct: 50 });
                              try {
                                const form = new FormData();
                                form.append('file', pdfFile);
                                form.append('country', detectedCountry);
                                form.append('industry', detectedIndustry === 'all-industries' ? '' : detectedIndustry);
                                const imgRes = await fetch('/api/extract-images', { method: 'POST', body: form });
                                const imgData = await imgRes.json();
                                if (imgRes.ok && imgData.images?.length) {
                                  setChartImages(imgData.images);
                                  const indParam = detectedIndustry !== 'all-industries' ? `&industry=${detectedIndustry}` : '';
                                  const existingRes = await fetch(`/api/data?country=${detectedCountry}&topic=trends${indParam}`);
                                  const existingTrends = existingRes.ok ? (await existingRes.json()).data : (result?.trends || {});
                                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                  const updated: any = { ...existingTrends, images: imgData.images };

                                  // B1b: Transform charts with AI (if checked)
                                  if (pdfTransformCharts) {
                                    setAlphaProgress({ step: 'Recreating charts with AI...', pct: 60 });
                                    try {
                                      const tfRes = await fetch('/api/transform-charts', {
                                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ images: imgData.images }),
                                      });
                                      const tfData = await tfRes.json();
                                      if (tfRes.ok && tfData.charts?.length) {
                                        updated.transformed_charts = tfData.charts;
                                      }
                                    } catch { /* non-fatal */ }
                                  }

                                  await fetch('/api/data', {
                                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ country: detectedCountry, topic: 'trends', data: updated, industry: detectedIndustry === 'all-industries' ? '' : detectedIndustry }),
                                  });
                                } else if (imgData.error) {
                                  setChartError(imgData.error);
                                }
                              } catch {
                                setChartError('Chart extraction failed' + (hasDataInput ? ' (data was still saved)' : ''));
                              }
                            }

                            // B2: Extract hyperlinks (if checked)
                            if (pdfExtractLinks) {
                              setAlphaProgress({ step: 'Extracting hyperlinks from PDF...', pct: 80 });
                            try {
                              const indParam = detectedIndustry !== 'all-industries' ? `&industry=${detectedIndustry}` : '';
                              const currentRes = await fetch(`/api/data?country=${detectedCountry}&topic=trends${indParam}`);
                              const currentData = currentRes.ok ? (await currentRes.json()).data : null;

                              if (currentData) {
                                const linkForm = new FormData();
                                linkForm.append('file', pdfFile);
                                linkForm.append('data', JSON.stringify(currentData));
                                const linkRes = await fetch('/api/extract-links', { method: 'POST', body: linkForm });
                                const linkData = await linkRes.json();

                                if (linkRes.ok && linkData.matched) {
                                  // Apply matched URLs to findings
                                  let changed = false;
                                  for (const match of linkData.matched.findings) {
                                    const items = currentData[match.category];
                                    if (items?.[match.index]?.source) {
                                      items[match.index].source.url = match.url;
                                      changed = true;
                                    }
                                  }
                                  for (const match of linkData.matched.news) {
                                    if (currentData.news_items?.[match.index]) {
                                      currentData.news_items[match.index].url = match.url;
                                      changed = true;
                                    }
                                  }
                                  if (changed) {
                                    await fetch('/api/data', {
                                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ country: detectedCountry, topic: 'trends', data: currentData, industry: detectedIndustry === 'all-industries' ? '' : detectedIndustry }),
                                    });
                                    console.log(`[Admin] Applied ${linkData.matched.findings.length} finding links + ${linkData.matched.news.length} news links from PDF`);
                                  }
                                }
                              }
                            } catch { /* non-fatal — links are a bonus */ }
                            }
                          }

                          setAlphaProgress({ step: 'Complete!', pct: 100 });
                          setAlphaSaved(true);
                        } catch (err) {
                          setAlphaError(err instanceof Error ? err.message : 'Processing failed');
                        } finally { setAlphaProcessing(false); }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="ms" style={{ fontSize: 16, animation: alphaProcessing ? 'spin 1.5s linear infinite' : 'none' }}>
                          {alphaSaved ? 'check_circle' : alphaProcessing ? 'sync' : 'rocket_launch'}
                        </span>
                        {alphaSaved
                          ? `Updated ${alphaTargetCountry}${alphaTargetIndustry !== 'all-industries' ? ' / ' + alphaTargetIndustry : ''}${chartImages.length ? ` + ${chartImages.length} charts` : ''}`
                          : alphaProcessing ? `${alphaProgress.step}` : 'Process & Update Website'}
                      </div>
                      {alphaProcessing && (
                        <span style={{ fontSize: 8, fontWeight: 700, color: '#34d399', letterSpacing: '.06em' }}>{alphaProgress.pct}%</span>
                      )}
                    </button>
                    </div>
                      );
                    })()}

                    {/* Error */}
                    {alphaError && (
                      <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 8, background: 'rgba(248,113,113,.06)', border: '1px solid rgba(248,113,113,.15)', color: 'var(--red)', fontSize: 10, lineHeight: 1.6 }}>
                        <span className="ms" style={{ fontSize: 13, verticalAlign: 'middle', marginRight: 4 }}>error</span>{alphaError}
                      </div>
                    )}
                    {chartError && (
                      <div style={{ marginTop: 6, padding: '8px 12px', borderRadius: 6, background: 'rgba(251,191,36,.06)', border: '1px solid rgba(251,191,36,.12)', fontSize: 9, color: '#fbbf24' }}>
                        <span className="ms" style={{ fontSize: 11, verticalAlign: 'middle', marginRight: 4 }}>warning</span>{chartError}
                      </div>
                    )}

                    {/* Result preview */}
                    {alphaResult && (
                      <div style={{ marginTop: 14, animation: 'fadeIn .3s' }}>
                        {/* Summary bar */}
                        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                          <div style={{ flex: '1 1 180px', padding: '10px 12px', borderRadius: 8, background: 'rgba(52,211,153,.04)', border: '1px solid rgba(52,211,153,.12)' }}>
                            <div style={{ fontSize: 8, fontWeight: 800, color: 'var(--t4)', letterSpacing: '.12em', textTransform: 'uppercase' }}>Subject</div>
                            <div style={{ fontSize: 13, fontWeight: 900, color: '#fff', marginTop: 2 }}>{alphaResult.alphasense?.subject}</div>
                            <div style={{ fontSize: 8, color: 'var(--t3)', marginTop: 1 }}>{alphaResult.alphasense?.date_generated} · {alphaResult.alphasense?.total_findings || alphaResult.alphasense?.metadata?.emerging_trend_count + alphaResult.alphasense?.metadata?.strategic_opportunity_count + alphaResult.alphasense?.metadata?.key_challenge_count || '?'} findings</div>
                          </div>
                          {[
                            { label: 'Trends', count: alphaResult.alphasense?.metadata?.emerging_trend_count || alphaResult.trends?.trends?.length, color: '#0ea5e9' },
                            { label: 'Opps', count: alphaResult.alphasense?.metadata?.strategic_opportunity_count || alphaResult.trends?.opportunities?.length, color: '#34d399' },
                            { label: 'Risks', count: alphaResult.alphasense?.metadata?.key_challenge_count || alphaResult.trends?.challenges?.length, color: '#fbbf24' },
                            { label: 'Companies', count: alphaResult.alphasense?.metadata?.top_company_count || alphaResult.trends?.top_companies?.length, color: '#60a5fa' },
                          ].map(c => (
                            <div key={c.label} style={{ padding: '10px 12px', borderRadius: 8, background: `${c.color}08`, border: `1px solid ${c.color}18`, textAlign: 'center', minWidth: 60 }}>
                              <div style={{ fontSize: 18, fontWeight: 900, color: c.color }}>{c.count || 0}</div>
                              <div style={{ fontSize: 6, fontWeight: 800, color: c.color, letterSpacing: '.1em', textTransform: 'uppercase', marginTop: 1 }}>{c.label}</div>
                            </div>
                          ))}
                          {chartImages.length > 0 && (
                            <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(251,191,36,.08)', border: '1px solid rgba(251,191,36,.18)', textAlign: 'center', minWidth: 60 }}>
                              <div style={{ fontSize: 18, fontWeight: 900, color: '#fbbf24' }}>{chartImages.length}</div>
                              <div style={{ fontSize: 6, fontWeight: 800, color: '#fbbf24', letterSpacing: '.1em', textTransform: 'uppercase', marginTop: 1 }}>Charts</div>
                            </div>
                          )}
                        </div>

                        {/* Synthesis preview */}
                        {(alphaResult.alphasense?.synthesis || alphaResult.trends?.synthesis) && (
                          <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(161,0,255,.03)', border: '1px solid rgba(161,0,255,.08)', marginBottom: 10 }}>
                            <div style={{ fontSize: 8, fontWeight: 800, color: 'var(--p)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 4 }}>Synthesis</div>
                            <p style={{ fontSize: 10, color: 'var(--t2)', lineHeight: 1.7 }}>{((alphaResult.alphasense?.synthesis || alphaResult.trends?.synthesis) as string).substring(0, 300)}{(alphaResult.alphasense?.synthesis || alphaResult.trends?.synthesis || '').length > 300 ? '...' : ''}</p>
                          </div>
                        )}

                        {/* Copy JSON button */}
                        <button onClick={() => navigator.clipboard.writeText(JSON.stringify(alphaResult.trends || alphaResult.alphasense, null, 2))} style={{
                          width: '100%', padding: '8px 0', borderRadius: 6, border: '1px solid var(--s2)',
                          background: 'var(--s1)', color: 'var(--t2)', fontSize: 9, fontWeight: 700,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          transition: 'all .2s',
                        }}>
                          <span className="ms" style={{ fontSize: 13 }}>content_copy</span>Copy Raw JSON
                        </button>
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
