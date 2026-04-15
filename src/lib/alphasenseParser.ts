/**
 * AlphaSense Text → JSON Parser (No AI Required)
 * Dual-mode: detects block delimiters (---FINDING---) → block parser
 * Falls back to legacy regex parser for old-format text.
 */

import type {
  AlphaSenseFinding,
  AlphaSensePayload,
  AffectedCompany,
  KeyMetric,
  NewsItem,
  FinancialHighlight,
  TopCompany,
  TrendsData,
  TrendsChallenge,
  TrendsOpportunity,
  TrendsTrend,
} from '@/types';

// ══════════════════════════════════════
// BLOCK-BASED PARSER (new format)
// ══════════════════════════════════════

const FINDING_START = /^---FINDING---/;
const FINDING_END = /^---END FINDING---/;
const METRIC_START = /^---METRIC---/;
const METRIC_END = /^---END METRIC---/;
const NEWS_START = /^---NEWS---/;
const NEWS_END = /^---END NEWS---/;
const COMPANY_START = /^---COMPANY---/;
const COMPANY_END = /^---END COMPANY---/;
const SECTION_NAME = /^SECTION:\s*(.+)$/i;
const FIELD_RE = /^([A-Z_]+):\s*(.*)$/;
const LIST_ITEM = /^\s*-\s+(.+)$/;

function extractField(lines: string[], prefix: string): string {
  const line = lines.find(l => l.startsWith(prefix + ':'));
  if (!line) return '';
  return line.substring(prefix.length + 1).trim();
}

function extractListItems(lines: string[], startPrefix: string): string[] {
  const items: string[] = [];
  let collecting = false;
  for (const line of lines) {
    if (line.startsWith(startPrefix + ':')) { collecting = true; continue; }
    if (collecting) {
      const m = LIST_ITEM.exec(line);
      if (m) { items.push(m[1].trim()); }
      else if (FIELD_RE.test(line)) { break; }
    }
  }
  return items;
}

function parseCompanyLine(raw: string): AffectedCompany {
  const parts = raw.split('|').map(s => s.trim());
  return {
    name: parts[0] || 'Unknown',
    ticker: parts[1] && parts[1] !== 'NONE' ? parts[1] : null,
    impact: (['positive', 'negative', 'neutral'].includes(parts[2]?.toLowerCase()) ? parts[2].toLowerCase() : 'neutral') as AffectedCompany['impact'],
    detail: parts[3] || '',
  };
}

function parseMetricLine(raw: string): KeyMetric {
  const parts = raw.split('|').map(s => s.trim());
  return {
    label: parts[0] || '',
    value: parts[1] || '',
    trend: (['up', 'down', 'stable'].includes(parts[2]?.toLowerCase()) ? parts[2].toLowerCase() : undefined) as KeyMetric['trend'],
  };
}

function parseDataPointLine(raw: string): { label: string; value: string } {
  const parts = raw.split('|').map(s => s.trim());
  return { label: parts[0] || '', value: parts[1] || '' };
}

function parseFindingBlock(lines: string[], sectionCategory: string): AlphaSenseFinding {
  const get = (prefix: string) => extractField(lines, prefix);
  const impactRaw = get('IMPACT');
  const impactMatch = impactRaw.match(/^(High|Medium|Low)/i);
  const urlRaw = get('SOURCE_URL');

  return {
    id: 0,
    category: (get('CATEGORY') || sectionCategory || 'Emerging Trend') as AlphaSenseFinding['category'],
    finding: get('TITLE'),
    description: get('DESCRIPTION'),
    impact_level: impactMatch ? impactMatch[1].charAt(0).toUpperCase() + impactMatch[1].slice(1).toLowerCase() as 'High' | 'Medium' | 'Low' : null,
    timeframe: normalizeTimeframe(get('TIMEFRAME')),
    source: {
      document_title: get('SOURCE_TITLE') || null,
      organization: get('SOURCE_ORG') || null,
      document_type: get('SOURCE_TYPE') || null,
      date: get('SOURCE_DATE') || null,
      url: urlRaw && urlRaw !== 'NONE' ? urlRaw : null,
      headline: get('TITLE') || null,
    },
    affected_companies: extractListItems(lines, 'COMPANIES_AFFECTED').map(parseCompanyLine),
    key_metrics: extractListItems(lines, 'KEY_METRICS').map(parseMetricLine),
  };
}

function parseMetricBlock(lines: string[]): FinancialHighlight {
  const get = (prefix: string) => extractField(lines, prefix);
  const prevRaw = get('PREVIOUS_VALUE');
  const changeRaw = get('CHANGE');
  const chartRaw = get('CHART_TYPE');
  return {
    id: 0,
    metric: get('LABEL'),
    current_value: get('CURRENT_VALUE'),
    previous_value: prevRaw && prevRaw !== 'NONE' ? prevRaw : null,
    change: changeRaw && changeRaw !== 'NONE' ? changeRaw : null,
    chart_type: (['bar', 'line', 'donut'].includes(chartRaw?.toLowerCase()) ? chartRaw.toLowerCase() : 'bar') as FinancialHighlight['chart_type'],
    data_points: extractListItems(lines, 'DATA_POINTS').map(parseDataPointLine),
  };
}

function parseNewsBlock(lines: string[]): NewsItem {
  const get = (prefix: string) => extractField(lines, prefix);
  const urlRaw = get('URL');
  const relRaw = get('RELATED_FINDINGS');
  const quoteRaw = get('ANALYST_QUOTE');
  return {
    id: 0,
    headline: get('HEADLINE'),
    summary: get('SUMMARY'),
    source_org: get('SOURCE_ORG'),
    date: get('DATE') || null,
    type: get('TYPE') || null,
    url: urlRaw && urlRaw !== 'NONE' ? urlRaw : null,
    related_finding_ids: relRaw ? relRaw.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n)) : [],
    analyst_quote: quoteRaw && quoteRaw !== 'NONE' ? quoteRaw.replace(/^[""]|[""]$/g, '').trim() : undefined,
  };
}

function parseTopCompanyLines(lines: string[]): TopCompany {
  const get = (key: string) => {
    const re = new RegExp(`^(?:${key})\\s*[:—\\-–]\\s*(.+)`, 'i');
    for (const l of lines) { const m = re.exec(l.trim()); if (m) return m[1].trim(); }
    return '';
  };
  const nameRaw = get('Company \\d+');
  const name = nameRaw || get('Name') || lines[0]?.replace(/^Company\s*\d+\s*[:—\-–]\s*/i, '').trim() || 'Unknown';
  const tickerRaw = get('Ticker');
  const initiativesRaw = get('Key Initiatives');
  const initiatives = initiativesRaw ? initiativesRaw.split(';').map(s => s.trim()).filter(Boolean) : [];

  // Parse linked findings sub-block
  const trends: number[] = [];
  const opportunities: number[] = [];
  const challenges: number[] = [];
  let inLinked = false;
  for (const l of lines) {
    const t = l.trim();
    if (/^linked\s*findings/i.test(t)) { inLinked = true; continue; }
    if (inLinked) {
      const nums = t.match(/\d+/g)?.map(Number) ?? [];
      const lower = t.toLowerCase();
      if (lower.includes('trend')) trends.push(...nums);
      else if (lower.includes('opportunit')) opportunities.push(...nums);
      else if (lower.includes('challenge')) challenges.push(...nums);
      else if (/^[A-Z]/.test(t) && !t.startsWith('-')) inLinked = false; // next section
    }
  }

  return {
    name, ticker: tickerRaw && tickerRaw !== 'PRIVATE' ? tickerRaw : null,
    sector: get('Sector'), hq: get('Headquarters') || get('HQ'),
    revenue: get('Revenue'),
    key_initiatives: initiatives,
    linked_findings: { trends, opportunities, challenges },
  };
}

function normalizeBlockText(raw: string): string {
  // Inject line breaks before known delimiters that may be glued together
  let t = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // Break before block delimiters
  t = t.replace(/(?<!\n)(---FINDING---)/g, '\n$1');
  t = t.replace(/(?<!\n)(---END FINDING---)/g, '\n$1');
  t = t.replace(/(?<!\n)(---METRIC---)/g, '\n$1');
  t = t.replace(/(?<!\n)(---END METRIC---)/g, '\n$1');
  t = t.replace(/(?<!\n)(---NEWS---)/g, '\n$1');
  t = t.replace(/(?<!\n)(---END NEWS---)/g, '\n$1');
  t = t.replace(/(?<!\n)(---COMPANY---)/g, '\n$1');
  t = t.replace(/(?<!\n)(---END COMPANY---)/g, '\n$1');
  // Break before SECTION: headers
  t = t.replace(/(?<!\n)(SECTION:\s*)/g, '\n$1');
  // Break before field prefixes inside blocks
  t = t.replace(/(?<!\n)(TITLE:\s*)/g, '\n$1');
  t = t.replace(/(?<!\n)(CATEGORY:\s*)/g, '\n$1');
  t = t.replace(/(?<!\n)(DESCRIPTION:\s*)/g, '\n$1');
  t = t.replace(/(?<!\n)(IMPACT:\s*)/g, '\n$1');
  t = t.replace(/(?<!\n)(TIMEFRAME:\s*)/g, '\n$1');
  t = t.replace(/(?<!\n)(SOURCE_TITLE:\s*)/g, '\n$1');
  t = t.replace(/(?<!\n)(SOURCE_ORG:\s*)/g, '\n$1');
  t = t.replace(/(?<!\n)(SOURCE_TYPE:\s*)/g, '\n$1');
  t = t.replace(/(?<!\n)(SOURCE_DATE:\s*)/g, '\n$1');
  t = t.replace(/(?<!\n)(SOURCE_URL:\s*)/g, '\n$1');
  t = t.replace(/(?<!\n)(COMPANIES_AFFECTED:\s*)/g, '\n$1');
  t = t.replace(/(?<!\n)(KEY_METRICS:\s*)/g, '\n$1');
  t = t.replace(/(?<!\n)(LABEL:\s*)/g, '\n$1');
  t = t.replace(/(?<!\n)(CURRENT_VALUE:\s*)/g, '\n$1');
  t = t.replace(/(?<!\n)(PREVIOUS_VALUE:\s*)/g, '\n$1');
  t = t.replace(/(?<!\n)(CHANGE:\s*)/g, '\n$1');
  t = t.replace(/(?<!\n)(CHART_TYPE:\s*)/g, '\n$1');
  t = t.replace(/(?<!\n)(DATA_POINTS:\s*)/g, '\n$1');
  t = t.replace(/(?<!\n)(HEADLINE:\s*)/g, '\n$1');
  t = t.replace(/(?<!\n)(SUMMARY:\s*)/g, '\n$1');
  t = t.replace(/(?<!\n)(URL:\s*)/g, '\n$1');
  t = t.replace(/(?<!\n)(TYPE:\s*)/g, '\n$1');
  t = t.replace(/(?<!\n)(DATE:\s*)/g, '\n$1');
  t = t.replace(/(?<!\n)(RELATED_FINDINGS:\s*)/g, '\n$1');
  t = t.replace(/(?<!\n)(ANALYST_QUOTE:\s*)/g, '\n$1');
  t = t.replace(/(?<!\n)(TICKER:\s*)/g, '\n$1');
  t = t.replace(/(?<!\n)(SECTOR:\s*)/g, '\n$1');
  t = t.replace(/(?<!\n)(HEADQUARTERS:\s*)/g, '\n$1');
  t = t.replace(/(?<!\n)(REVENUE:\s*)/g, '\n$1');
  t = t.replace(/(?<!\n)(KEY_INITIATIVES:\s*)/g, '\n$1');
  t = t.replace(/(?<!\n)(LINKED_FINDINGS:\s*)/g, '\n$1');
  // Break before ═══ lines
  t = t.replace(/(?<!\n)(═{3,})/g, '\n$1');
  // Break after ═══ lines
  t = t.replace(/(═{3,})(?!\n)/g, '$1\n');
  // Break before bullet items
  t = t.replace(/(?<!\n)(\s*-\s+\S)/g, '\n$1');
  return t;
}

function parseBlockFormat(text: string): AlphaSensePayload {
  const normalized = normalizeBlockText(text);
  const lines = normalized.split('\n');
  const findings: AlphaSenseFinding[] = [];
  const metrics: FinancialHighlight[] = [];
  const newsItems: NewsItem[] = [];
  const topCompanies: TopCompany[] = [];
  const synthesisLines: string[] = [];

  let currentSection = '';
  let currentBlock: 'finding' | 'metric' | 'news' | 'company' | null = null;
  let blockLines: string[] = [];
  let inSynthesis = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Section detection
    const secMatch = SECTION_NAME.exec(trimmed);
    if (secMatch) {
      inSynthesis = secMatch[1].toLowerCase().includes('synthesis');
      if (!inSynthesis) {
        const sec = secMatch[1].toLowerCase();
        if (sec.includes('trend')) currentSection = 'Emerging Trend';
        else if (sec.includes('opportunit')) currentSection = 'Strategic Opportunity';
        else if (sec.includes('challenge')) currentSection = 'Key Challenge';
        else if (sec.includes('compan') && (sec.includes('top') || sec.includes('10'))) currentSection = 'top_companies';
        else if (sec.includes('financial')) currentSection = 'financial';
        else if (sec.includes('news')) currentSection = 'news';
      }
      continue;
    }

    // Synthesis collection
    if (inSynthesis && !FINDING_START.test(trimmed) && !METRIC_START.test(trimmed) && !NEWS_START.test(trimmed)) {
      if (trimmed && !/^[═]+$/.test(trimmed)) synthesisLines.push(trimmed);
      continue;
    }

    // Block start/end
    if (FINDING_START.test(trimmed)) { currentBlock = 'finding'; blockLines = []; continue; }
    if (FINDING_END.test(trimmed)) {
      if (currentBlock === 'finding') findings.push(parseFindingBlock(blockLines, currentSection));
      currentBlock = null; continue;
    }
    if (METRIC_START.test(trimmed)) { currentBlock = 'metric'; blockLines = []; continue; }
    if (METRIC_END.test(trimmed)) {
      if (currentBlock === 'metric') metrics.push(parseMetricBlock(blockLines));
      currentBlock = null; continue;
    }
    if (NEWS_START.test(trimmed)) { currentBlock = 'news'; blockLines = []; continue; }
    if (NEWS_END.test(trimmed)) {
      if (currentBlock === 'news') newsItems.push(parseNewsBlock(blockLines));
      currentBlock = null; continue;
    }
    if (COMPANY_START.test(trimmed)) { currentBlock = 'company'; blockLines = []; continue; }
    if (COMPANY_END.test(trimmed)) {
      if (currentBlock === 'company') topCompanies.push(parseTopCompanyLines(blockLines));
      currentBlock = null; continue;
    }

    if (currentBlock) blockLines.push(line);
  }

  // Number everything
  findings.forEach((f, i) => { f.id = i + 1; });
  metrics.forEach((m, i) => { m.id = i + 1; });
  newsItems.forEach((n, i) => { n.id = i + 1; });

  const cats = findings.map(f => f.category);
  const impacts = findings.map(f => f.impact_level);

  return {
    subject: detectSubject(text),
    date_generated: new Date().toISOString().split('T')[0],
    total_findings: findings.length,
    findings,
    synthesis: synthesisLines.join(' ').trim(),
    news_items: newsItems,
    financial_highlights: metrics,
    metadata: {
      emerging_trend_count: cats.filter(c => c === 'Emerging Trend').length,
      strategic_opportunity_count: cats.filter(c => c === 'Strategic Opportunity').length,
      key_challenge_count: cats.filter(c => c === 'Key Challenge').length,
      high_impact_count: impacts.filter(i => i === 'High').length,
      medium_impact_count: impacts.filter(i => i === 'Medium').length,
      low_impact_count: impacts.filter(i => i === 'Low').length,
      news_count: newsItems.length,
      financial_highlight_count: metrics.length,
      top_company_count: topCompanies.length,
    },
    top_companies: topCompanies,
  };
}

// ══════════════════════════════════════
// LEGACY PARSER (old format — no block delimiters)
// ══════════════════════════════════════

const CATEGORY_MAP: Record<string, AlphaSenseFinding['category']> = {
  'emerging trend': 'Emerging Trend', 'emerging trends': 'Emerging Trend',
  'strategic opportunit': 'Strategic Opportunity', 'strategic opportunities': 'Strategic Opportunity',
  'key challenge': 'Key Challenge', 'key challenges': 'Key Challenge',
};

const IMPACT_RE = /impact\s*(?:level|assessment)?\s*[:—\-–]\s*(high|medium|low)/i;
const TIMEFRAME_RE = /(?:timeframe|time\s*frame|timeline|horizon)\s*[:—\-–]\s*(near[- ]term[^.]*|medium[- ]term[^.]*|long[- ]term[^.]*)/i;
const SOURCE_RE = /source\s*[:—\-–]\s*(.+?)(?:\n|$)/i;
const FINDING_RE = /^(\d{1,2})\.\s+(.+?)$/;
const SYNTHESIS_RE = /^(?:synthesis|summary|conclusion)\s*[:—\-–]?\s*$/i;
const DESC_RE = /^description\s*[:—\-–]\s*/i;

function normalizeTimeframe(raw: string): string | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (lower.includes('near')) return 'Near-term (0-12mo)';
  if (lower.includes('medium') || lower.includes('mid')) return 'Medium-term (1-3yr)';
  if (lower.includes('long')) return 'Long-term (3-5yr+)';
  return raw.trim();
}

function parseSourceLegacy(raw: string): AlphaSenseFinding['source'] {
  const parts = raw.split(',').map(p => p.trim());
  const source: AlphaSenseFinding['source'] = { document_title: null, organization: null, document_type: null, date: null, url: null, headline: null };
  const docTypes = ['Earnings Call', 'Expert Transcript', 'Broker Research', 'Filing', 'News', 'Government Publication'];
  for (const part of parts) {
    for (const dt of docTypes) { if (part.toLowerCase().includes(dt.toLowerCase())) { source.document_type = part; break; } }
    if (/\d{4}[-/]\d{2}[-/]\d{2}/.test(part)) source.date = part;
    else if (/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(part)) source.date = part;
  }
  if (parts.length > 0) source.document_title = parts[0];
  if (parts.length > 1 && parts[1] !== source.document_type && parts[1] !== source.date) source.organization = parts[1];
  return source;
}

function detectSubject(text: string): string {
  const patterns = [
    /researching\s+(.+?)(?:'s|'s|\s+with|\s+economic|\s+landscape)/i,
    /analysis\s+(?:of|on|for)\s+(.+?)(?:\s+with|\s+covering|\s*\.)/i,
    /intelligence\s+brief\s+(?:on|for|covering)\s+(.+?)(?:\s+with|\s*\.)/i,
    /briefing\s+(?:on|for|about)\s+(.+?)(?:\s+with|\s*\.)/i,
  ];
  for (const p of patterns) { const m = p.exec(text.substring(0, 2000)); if (m) return m[1].trim(); }
  return 'Unknown';
}

function parseLegacyFormat(text: string): AlphaSensePayload {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const findings: AlphaSenseFinding[] = [];
  const newsItems: NewsItem[] = [];
  const financials: FinancialHighlight[] = [];
  let currentCategory: AlphaSenseFinding['category'] | null = null;
  let currentFinding: AlphaSenseFinding | null = null;
  let inSynthesis = false;
  let inFinancials = false;
  let inNews = false;
  let inTopCompanies = false;
  const synthesisLines: string[] = [];
  const topCompanies: TopCompany[] = [];
  let companyLines: string[] = [];

  // Patterns for new sections
  const FINANCIAL_HEADER = /^(?:\*\*)?financial\s*highlight/i;
  const NEWS_HEADER = /^(?:\*\*)?(?:news\s*(?:and|&)\s*source|broker\s*analysis)/i;
  const TOP_COMPANIES_HEADER = /^(?:\*\*)?top\s*(?:10|ten)\s*compan/i;
  const COMPANIES_RE = /^companies\s*affected\s*[:—\-–]\s*/i;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }

    // Detect Top 10 Companies section
    if (TOP_COMPANIES_HEADER.test(line.replace(/[*#_═]/g, ''))) {
      if (currentFinding) { findings.push(currentFinding); currentFinding = null; }
      currentCategory = null; inSynthesis = false; inFinancials = false; inNews = false; inTopCompanies = true;
      companyLines = [];
      i++; continue;
    }

    // Detect Financial Highlights section
    if (FINANCIAL_HEADER.test(line.replace(/[*#_]/g, ''))) {
      if (inTopCompanies && companyLines.length > 0) { topCompanies.push(parseTopCompanyLines(companyLines)); companyLines = []; }
      if (currentFinding) { findings.push(currentFinding); currentFinding = null; }
      currentCategory = null; inSynthesis = false; inFinancials = true; inNews = false; inTopCompanies = false;
      i++; continue;
    }

    // Detect News/Broker section
    if (NEWS_HEADER.test(line.replace(/[*#_]/g, ''))) {
      if (inTopCompanies && companyLines.length > 0) { topCompanies.push(parseTopCompanyLines(companyLines)); companyLines = []; }
      if (currentFinding) { findings.push(currentFinding); currentFinding = null; }
      currentCategory = null; inSynthesis = false; inFinancials = false; inNews = true; inTopCompanies = false;
      i++; continue;
    }

    // Parse Top 10 Companies
    if (inTopCompanies) {
      if (SYNTHESIS_RE.test(line)) { if (companyLines.length > 0) { topCompanies.push(parseTopCompanyLines(companyLines)); companyLines = []; } inTopCompanies = false; inSynthesis = true; i++; continue; }
      // Detect start of a new company: "Company N:" pattern
      const compStart = /^company\s*\d+\s*[:—\-–]/i.test(line) || /^\d{1,2}[.)]\s*\[?[A-Z]/.test(line);
      if (compStart && companyLines.length > 0) {
        topCompanies.push(parseTopCompanyLines(companyLines));
        companyLines = [];
      }
      if (line && !/^[═]+$/.test(line)) companyLines.push(line);
      i++; continue;
    }

    // Parse Financial Highlights items
    if (inFinancials) {
      if (SYNTHESIS_RE.test(line)) { inFinancials = false; inSynthesis = true; i++; continue; }
      if (NEWS_HEADER.test(line.replace(/[*#_]/g, ''))) { inFinancials = false; inNews = true; i++; continue; }
      // Try to parse "Metric: $value (change)" or "- Metric: $value"
      const metricMatch = line.replace(/^[-•*\d.)\s]+/, '').replace(/^\*\*|\*\*$/g, '');
      const kvMatch = metricMatch.match(/^(.+?)[:—\-–]\s*(.+)/);
      if (kvMatch) {
        const label = kvMatch[1].trim();
        const rest = kvMatch[2].trim();
        // Only accept if the value contains a number (filter out URLs, plain text)
        if (/\d/.test(rest) && !rest.startsWith('http') && label.length < 80) {
          const changeMatch = rest.match(/\(([^)]+)\)/);
          // Strip any trailing URLs/domains from the value
          const cleanValue = rest.replace(/\([^)]+\)/, '').replace(/\s+[a-z]+[-.][\w.]+\s*/gi, '').trim();
          financials.push({
            id: financials.length + 1,
            metric: label,
            current_value: cleanValue,
            previous_value: null,
            change: changeMatch ? changeMatch[1].trim() : null,
            chart_type: 'bar',
            data_points: [],
          });
        }
      }
      i++; continue;
    }

    // Parse News items
    if (inNews) {
      if (SYNTHESIS_RE.test(line)) { inNews = false; inSynthesis = true; i++; continue; }
      const cleanLine = line.replace(/^\*\*|\*\*$/g, '').trim();
      if (cleanLine.length < 20) { i++; continue; }

      // Skip source/metadata lines
      if (/^source\s*[:—\-–|]/i.test(cleanLine)) { i++; continue; }
      if (/^document\s*type/i.test(cleanLine)) { i++; continue; }
      if (/^\|/.test(cleanLine)) { i++; continue; }

      // Handle "Summary:" and "URL:" as belonging to previous item
      if (/^summary\s*[:—\-–]/i.test(cleanLine) && newsItems.length > 0) {
        newsItems[newsItems.length - 1].summary = cleanLine.replace(/^summary\s*[:—\-–]\s*/i, '');
        i++; continue;
      }
      if (/^url\s*[:—\-–]/i.test(cleanLine) && newsItems.length > 0) {
        const urlVal = cleanLine.replace(/^url\s*[:—\-–]\s*/i, '').trim();
        if (urlVal && urlVal !== 'NONE' && urlVal.startsWith('http')) newsItems[newsItems.length - 1].url = urlVal;
        i++; continue;
      }

      // Accept both numbered "1. Headline — Org" and unnumbered "Headline — Org"
      const numberedMatch = cleanLine.match(/^(\d{1,2})[.)]\s*(.+)/);
      const entry = numberedMatch ? numberedMatch[2].trim() : cleanLine;

      // Must contain a dash separator to look like "Headline — Source, Type, Date"
      if (!entry.includes('—') && !entry.includes('–')) { i++; continue; }
      const dashSplit = entry.split(/\s*[—–]\s*/);
      let headline = entry;
      let sourceOrg = '';
      let docType: string | null = null;
      let newsDate: string | null = null;

      if (dashSplit.length >= 2) {
        headline = dashSplit[0].trim();
        const metaParts = dashSplit.slice(1).join(' — ').split(',').map(s => s.trim());
        if (metaParts.length >= 1) sourceOrg = metaParts[0];
        const docTypes = ['Earnings Call', 'Expert Transcript', 'Broker Research', 'Filing', 'News', 'Government Publication'];
        for (const part of metaParts) {
          for (const dt of docTypes) { if (part.toLowerCase().includes(dt.toLowerCase())) { docType = dt; break; } }
          if (/\d{4}/.test(part) && !sourceOrg.includes(part)) newsDate = part;
        }
      }

      // Check next lines for "Summary:", "Analyst Quote:", "URL:"
      let summary = '';
      let url: string | null = null;
      let analystQuote: string | undefined;
      let lookahead = i + 1;
      while (lookahead < lines.length && lookahead <= i + 5) {
        const nextLine = lines[lookahead]?.trim() || '';
        if (!nextLine) { lookahead++; continue; }
        if (/^summary\s*[:—\-–]/i.test(nextLine)) {
          summary = nextLine.replace(/^summary\s*[:—\-–]\s*/i, '');
          i = lookahead;
        } else if (/^analyst\s*quote\s*[:—\-–]/i.test(nextLine)) {
          const qVal = nextLine.replace(/^analyst\s*quote\s*[:—\-–]\s*/i, '').replace(/^[""]|[""]$/g, '').trim();
          if (qVal && qVal !== 'NONE') analystQuote = qVal;
          i = lookahead;
        } else if (/^url\s*[:—\-–]/i.test(nextLine)) {
          const urlVal = nextLine.replace(/^url\s*[:—\-–]\s*/i, '').trim();
          if (urlVal && urlVal !== 'NONE' && urlVal.startsWith('http')) url = urlVal;
          i = lookahead;
        } else if (/^\d{1,2}[.)]\s/.test(nextLine)) {
          break; // next numbered item
        }
        lookahead++;
      }

      newsItems.push({
        id: newsItems.length + 1,
        headline,
        summary: summary || headline,
        source_org: sourceOrg,
        date: newsDate,
        type: docType,
        url,
        related_finding_ids: [],
        analyst_quote: analystQuote,
      });
      i++; continue;
    }

    // Synthesis
    if (SYNTHESIS_RE.test(line)) { if (currentFinding) { findings.push(currentFinding); currentFinding = null; } inSynthesis = true; i++; continue; }
    if (inSynthesis) { synthesisLines.push(line); i++; continue; }

    // Category detection
    const lineLower = line.toLowerCase().replace(/[*#_ ]/g, '');
    let matchedCat: AlphaSenseFinding['category'] | null = null;
    for (const [key, val] of Object.entries(CATEGORY_MAP)) {
      if (lineLower.includes(key.replace(/\s/g, '')) && line.length < 80) { matchedCat = val; break; }
    }
    if (matchedCat) { if (currentFinding) { findings.push(currentFinding); currentFinding = null; } currentCategory = matchedCat; i++; continue; }

    // Numbered finding
    const findingMatch = FINDING_RE.exec(line);
    if (findingMatch) {
      if (currentFinding) findings.push(currentFinding);
      currentFinding = {
        id: parseInt(findingMatch[1]), category: currentCategory || 'Emerging Trend',
        finding: findingMatch[2].replace(/:$/, '').trim(), description: '',
        impact_level: null, timeframe: null,
        source: { document_title: null, organization: null, document_type: null, date: null, url: null, headline: null },
        affected_companies: [],
        key_metrics: [],
      };
      i++; continue;
    }

    // Unnumbered finding: short title followed by Description: on the next line
    if (currentCategory && !COMPANIES_RE.test(line) && !/^(description|impact|timeframe|source|key metrics)/i.test(line) && line.length < 150 && line.length > 5 && !/^[═─*#]+$/.test(line)) {
      const nextLine = (lines[i + 1] || '').trim();
      if (/^description\s*[:—\-–]/i.test(nextLine)) {
        if (currentFinding) findings.push(currentFinding);
        const title = line.replace(/^\*\*|\*\*$/g, '').replace(/^[-–—\d.)\s]+/, '').replace(/:$/, '').replace(/^\[|\]$/g, '').trim();
        currentFinding = {
          id: findings.length + 1, category: currentCategory,
          finding: title, description: '',
          impact_level: null, timeframe: null,
          source: { document_title: null, organization: null, document_type: null, date: null, url: null, headline: null },
          affected_companies: [],
          key_metrics: [],
        };
        i++; continue;
      }
    }

    if (currentFinding) {
      // Companies Affected inline
      if (COMPANIES_RE.test(line)) {
        const companiesText = line.replace(COMPANIES_RE, '');
        // Parse "Company1 (impact: positive — detail), Company2 (impact: negative — detail)"
        const companyParts = companiesText.split(/(?<=\)),\s*/);
        for (const cp of companyParts) {
          const cm = cp.match(/^(.+?)\s*\((?:impact:\s*)?(positive|negative|neutral)\s*[—\-–]\s*(.+?)\s*\)/i);
          if (cm) {
            if (!currentFinding.affected_companies) currentFinding.affected_companies = [];
            currentFinding.affected_companies.push({ name: cm[1].trim(), ticker: null, impact: cm[2].toLowerCase() as AffectedCompany['impact'], detail: cm[3].trim() });
          }
        }
        i++; continue;
      }

      const impactMatch = IMPACT_RE.exec(line);
      if (impactMatch) { currentFinding.impact_level = impactMatch[1].charAt(0).toUpperCase() + impactMatch[1].slice(1).toLowerCase() as 'High' | 'Medium' | 'Low'; i++; continue; }
      const tfMatch = TIMEFRAME_RE.exec(line);
      if (tfMatch) { currentFinding.timeframe = normalizeTimeframe(tfMatch[1]); i++; continue; }
      const sourceMatch = SOURCE_RE.exec(line);
      if (sourceMatch && !/^source\s*url/i.test(line)) { currentFinding.source = parseSourceLegacy(sourceMatch[1]); i++; continue; }
      // Source URL: line
      if (/^source\s*url\s*[:—\-–]\s*/i.test(line)) {
        const urlVal = line.replace(/^source\s*url\s*[:—\-–]\s*/i, '').trim();
        if (urlVal && urlVal !== 'NONE' && urlVal.startsWith('http')) {
          currentFinding.source.url = urlVal;
        }
        i++; continue;
      }
      if (DESC_RE.test(line)) {
        currentFinding.description = line.replace(DESC_RE, '');
        i++;
        while (i < lines.length) {
          const next = lines[i].trim();
          if (!next) { i++; break; }
          if (/^(impact|timeframe|time frame|source|source url|timeline|horizon|companies\s*affected|key\s*metrics)/i.test(next)) break;
          if (FINDING_RE.test(next)) break;
          currentFinding.description += ' ' + next; i++;
        }
        continue;
      }
      if (!currentFinding.description) currentFinding.description = line;
      else if (!/^(impact|timeframe|source|source url|time frame|companies\s*affected|key\s*metrics)/i.test(line)) currentFinding.description += ' ' + line;
    }
    i++;
  }
  if (currentFinding) findings.push(currentFinding);
  if (inTopCompanies && companyLines.length > 0) topCompanies.push(parseTopCompanyLines(companyLines));
  findings.forEach((f, idx) => { f.id = idx + 1; });

  const cats = findings.map(f => f.category);
  const impacts = findings.map(f => f.impact_level);
  return {
    subject: detectSubject(text), date_generated: new Date().toISOString().split('T')[0],
    total_findings: findings.length, findings,
    synthesis: synthesisLines.join(' ').trim(),
    news_items: newsItems,
    financial_highlights: financials,
    metadata: {
      emerging_trend_count: cats.filter(c => c === 'Emerging Trend').length,
      strategic_opportunity_count: cats.filter(c => c === 'Strategic Opportunity').length,
      key_challenge_count: cats.filter(c => c === 'Key Challenge').length,
      high_impact_count: impacts.filter(i => i === 'High').length,
      medium_impact_count: impacts.filter(i => i === 'Medium').length,
      low_impact_count: impacts.filter(i => i === 'Low').length,
      news_count: newsItems.length,
      financial_highlight_count: financials.length,
      top_company_count: topCompanies.length,
    },
    top_companies: topCompanies,
  };
}

// ══════════════════════════════════════
// MAIN ENTRY — dual-mode detection
// ══════════════════════════════════════

export function parseAlphaSenseText(text: string): AlphaSensePayload {
  // Pre-process ALL input first to inject line breaks before known markers
  const preprocessed = preProcessText(text);

  // Detect format: if block delimiters found → try new parser first
  const sample = preprocessed.substring(0, 5000);
  if (sample.includes('---FINDING---') || sample.includes('---END FINDING---')) {
    const result = parseBlockFormat(preprocessed);
    if (result.findings.length > 0) return result;
  }
  // Try legacy parser for numbered prose format
  const legacy = parseLegacyFormat(preprocessed);
  if (legacy.findings.length > 0) return legacy;

  // Last resort: try to be very lenient
  return parseLenient(preprocessed);
}

// ══════════════════════════════════════
// LENIENT PARSER — last resort, very flexible
// ══════════════════════════════════════

function preProcessText(raw: string): string {
  // Inject line breaks before known section/field markers when they're glued together
  let t = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Break before category headers
  t = t.replace(/(Emerging Trends?\b)/gi, '\n$1\n');
  t = t.replace(/(Strategic Opportunit(?:y|ies)\b)/gi, '\n$1\n');
  t = t.replace(/(Key Challenges?\b)/gi, '\n$1\n');
  t = t.replace(/(Financial Highlights?\b)/gi, '\n$1\n');
  t = t.replace(/(News (?:and|&) Sources?\b)/gi, '\n$1\n');
  t = t.replace(/(Top\s*(?:10|Ten)\s*Compan(?:y|ies)\b)/gi, '\n$1\n');
  t = t.replace(/(Broker\s*Analysis\b)/gi, '\n$1\n');
  t = t.replace(/(Synthesis\b)/gi, '\n$1\n');

  // Break before field markers (Description:, Impact:, etc.)
  t = t.replace(/(?<=[a-z.!?])(\s*Impact\s*[:—\-–])/gi, '\n$1');
  t = t.replace(/(?<=[a-z.!?])(\s*Timeframe\s*[:—\-–])/gi, '\n$1');
  t = t.replace(/(?<=[a-z.!?])(\s*Source\s*[:—\-–])/gi, '\n$1');
  t = t.replace(/(?<=[a-z.!?])(\s*Source URL\s*[:—\-–])/gi, '\n$1');
  t = t.replace(/(?<=[a-z.!?])(\s*Description\s*[:—\-–])/gi, '\n$1');
  t = t.replace(/(?<=[a-z.!?])(\s*Companies Affected\s*[:—\-–])/gi, '\n$1');
  t = t.replace(/(?<=[a-z.!?])(\s*Key Metrics\s*[:—\-–])/gi, '\n$1');
  t = t.replace(/(?<=[a-z.!?])(\s*Analyst Quote\s*[:—\-–])/gi, '\n$1');
  t = t.replace(/(?<=[a-z.!?])(\s*Summary\s*[:—\-–])/gi, '\n$1');
  t = t.replace(/(?<=[a-z.!?])(\s*URL\s*[:—\-–])/gi, '\n$1');
  t = t.replace(/(?<=[a-z.!?])(\s*Ticker\s*[:—\-–])/gi, '\n$1');
  t = t.replace(/(?<=[a-z.!?])(\s*Sector\s*[:—\-–])/gi, '\n$1');
  t = t.replace(/(?<=[a-z.!?])(\s*Headquarters\s*[:—\-–])/gi, '\n$1');
  t = t.replace(/(?<=[a-z.!?])(\s*Revenue\s*[:—\-–])/gi, '\n$1');
  t = t.replace(/(?<=[a-z.!?])(\s*Linked Findings\s*[:—\-–])/gi, '\n$1');

  // Break before numbered items: "1." "2." etc when preceded by text
  t = t.replace(/(?<=[a-z.!?\d])(\s+\d{1,2}\.\s+[A-Z])/g, '\n$1');

  // Break before "Description:" when it immediately follows a title (e.g. "Title Goes HereDescription: ...")
  t = t.replace(/(Description\s*[:—\-–])/gi, '\n$1');
  t = t.replace(/(Impact\s*[:—\-–])/gi, '\n$1');
  t = t.replace(/(Timeframe\s*[:—\-–])/gi, '\n$1');
  t = t.replace(/(Source URL\s*[:—\-–])/gi, '\n$1');
  t = t.replace(/(?<!Source )(Source\s*[:—\-–])/gi, '\n$1');
  t = t.replace(/(Companies Affected\s*[:—\-–])/gi, '\n$1');
  t = t.replace(/(Key Metrics\s*[:—\-–])/gi, '\n$1');
  t = t.replace(/(Company \d+\s*[:—\-–])/gi, '\n$1');

  // Collapse multiple newlines
  t = t.replace(/\n{3,}/g, '\n\n');

  return t;
}

function parseLenient(text: string): AlphaSensePayload {
  // Text is already preprocessed by parseAlphaSenseText
  const lines = text.split('\n');
  const findings: AlphaSenseFinding[] = [];
  let currentCategory: AlphaSenseFinding['category'] = 'Emerging Trend';
  let currentFinding: AlphaSenseFinding | null = null;
  const synthesisLines: string[] = [];
  let inSynthesis = false;
  let inFinancials = false;
  let inNews = false;
  let inTopCompanies = false;
  const financials: FinancialHighlight[] = [];
  const newsItems: NewsItem[] = [];
  const topCompanies: TopCompany[] = [];
  let companyLines: string[] = [];
  const topCompaniesPattern = /^(?:\*\*)?top\s*(?:10|ten)\s*compan/i;

  const numberTitle = /^(?:\*\*)?(\d{1,2})[.)]\s*(?:\*\*)?(.+?)(?:\*\*)?$/;
  // Also match titles in brackets: "1. [Title]" or just "[Title]"
  const bracketTitle = /^(?:\*\*)?(?:\d{1,2}[.)]\s*)?\[(.+?)\](?:\*\*)?$/;
  const catPatterns: [RegExp, AlphaSenseFinding['category']][] = [
    [/^(?:\*\*)?(?:emerging|new)\s*trend/i, 'Emerging Trend'],
    [/^(?:\*\*)?strategic\s*opportunit/i, 'Strategic Opportunity'],
    [/^(?:\*\*)?key\s*challenge/i, 'Key Challenge'],
  ];
  const fieldPrefix = /^(description|impact|timeframe|time frame|source|source url|companies\s*affected|key\s*metrics|ticker|sector|headquarters|revenue|linked findings|analyst quote|summary|url)\s*[:—\-–]/i;
  const synthPattern = /^(?:\*\*)?(?:synthesis|summary|conclusion|key\s*takeaway)/i;
  const finPattern = /^(?:\*\*)?financial\s*highlight/i;
  const newsPattern = /^(?:\*\*)?(?:news\s*(?:and|&)\s*source|broker\s*analysis)/i;
  const impactPat = /\b(high|medium|low)\b.*(?:impact|severity|significance)/i;
  const impactPat2 = /(?:impact|severity|significance).*\b(high|medium|low)\b/i;
  const tfPat = /\b(near[- ]?term|medium[- ]?term|long[- ]?term|short[- ]?term|0-12|1-3|3-5)/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Section switches
    if (topCompaniesPattern.test(line.replace(/[*#_═]/g, ''))) { if (currentFinding) { findings.push(currentFinding); currentFinding = null; } if (companyLines.length > 0) { topCompanies.push(parseTopCompanyLines(companyLines)); companyLines = []; } inTopCompanies = true; inSynthesis = false; inFinancials = false; inNews = false; continue; }
    if (synthPattern.test(line)) { if (currentFinding) { findings.push(currentFinding); currentFinding = null; } if (inTopCompanies && companyLines.length > 0) { topCompanies.push(parseTopCompanyLines(companyLines)); companyLines = []; } inSynthesis = true; inFinancials = false; inNews = false; inTopCompanies = false; continue; }
    if (finPattern.test(line.replace(/[*#_]/g, ''))) { if (currentFinding) { findings.push(currentFinding); currentFinding = null; } if (inTopCompanies && companyLines.length > 0) { topCompanies.push(parseTopCompanyLines(companyLines)); companyLines = []; } inFinancials = true; inSynthesis = false; inNews = false; inTopCompanies = false; continue; }
    if (newsPattern.test(line.replace(/[*#_]/g, ''))) { if (currentFinding) { findings.push(currentFinding); currentFinding = null; } if (inTopCompanies && companyLines.length > 0) { topCompanies.push(parseTopCompanyLines(companyLines)); companyLines = []; } inNews = true; inFinancials = false; inSynthesis = false; inTopCompanies = false; continue; }

    if (inSynthesis) { synthesisLines.push(line.replace(/^\*\*|\*\*$/g, '')); continue; }
    if (inFinancials) {
      const clean = line.replace(/^[-•*\d.)\s]+/, '').replace(/^\*\*|\*\*$/g, '');
      const kv = clean.match(/^(.+?)[:—\-–]\s*(.+)/);
      if (kv && /\d/.test(kv[2]) && !kv[2].startsWith('http') && kv[1].length < 80) {
        const changeMatch = kv[2].match(/\(([^)]+)\)/);
        financials.push({ id: financials.length + 1, metric: kv[1].trim(), current_value: kv[2].replace(/\([^)]+\)/, '').trim(), previous_value: null, change: changeMatch ? changeMatch[1].trim() : null, chart_type: 'bar', data_points: [] });
      }
      continue;
    }
    if (inTopCompanies) {
      const compStart = /^company\s*\d+\s*[:—\-–]/i.test(line);
      if (compStart && companyLines.length > 0) { topCompanies.push(parseTopCompanyLines(companyLines)); companyLines = []; }
      if (line && !/^[═]+$/.test(line)) companyLines.push(line);
      continue;
    }
    if (inNews) {
      const clean = line.replace(/^\*\*|\*\*$/g, '').trim();
      if (clean.length < 15 || /^source\s*[:—|]/i.test(clean) || /^document\s*type/i.test(clean)) continue;
      const nm = clean.match(/^(\d{1,2})[.)]\s*(.+)/);
      if (nm) {
        const entry = nm[2].trim();
        const ds = entry.split(/\s*[—–]\s*/);
        newsItems.push({ id: newsItems.length + 1, headline: ds[0]?.trim() || entry, summary: entry, source_org: ds[1]?.split(',')[0]?.trim() || '', date: null, type: null, url: null, related_finding_ids: [] });
      }
      continue;
    }

    // Category detection
    let catFound = false;
    for (const [re, cat] of catPatterns) {
      if (re.test(line.replace(/[*#_]/g, '')) && line.length < 80) {
        if (currentFinding) { findings.push(currentFinding); currentFinding = null; }
        currentCategory = cat; catFound = true; break;
      }
    }
    if (catFound) continue;

    // Numbered finding: "1. Title" or "1) Title"
    const numMatch = numberTitle.exec(line);
    const brackMatch = !numMatch ? bracketTitle.exec(line) : null;
    if (numMatch || brackMatch) {
      if (currentFinding) findings.push(currentFinding);
      const title = (numMatch ? numMatch[2] : brackMatch![1]).replace(/^\*\*|\*\*$/g, '').replace(/:$/, '').trim();
      currentFinding = {
        id: numMatch ? parseInt(numMatch[1]) : findings.length + 1, category: currentCategory,
        finding: title, description: '', impact_level: null, timeframe: null,
        source: { document_title: null, organization: null, document_type: null, date: null, url: null, headline: null },
      };
      continue;
    }

    // Unnumbered finding: a short title line followed by "Description:" on the next line
    if (currentCategory && !fieldPrefix.test(line) && line.length < 150 && line.length > 5 && !/^[═─*#]+$/.test(line)) {
      const nextLine = (lines[i + 1] || '').trim();
      if (/^description\s*[:—\-–]/i.test(nextLine)) {
        if (currentFinding) findings.push(currentFinding);
        const title = line.replace(/^\*\*|\*\*$/g, '').replace(/^[-–—\d.)\s]+/, '').replace(/:$/, '').trim();
        currentFinding = {
          id: findings.length + 1, category: currentCategory,
          finding: title, description: '', impact_level: null, timeframe: null,
          source: { document_title: null, organization: null, document_type: null, date: null, url: null, headline: null },
        };
        continue;
      }
    }

    // If we have a current finding, accumulate text and extract inline metadata
    if (currentFinding) {
      const cleanLine = line.replace(/^\*\*|\*\*$/g, '').replace(/^[-–—]\s*/, '');

      // Description: field
      if (/^description\s*[:—\-–]/i.test(cleanLine)) {
        currentFinding.description = cleanLine.replace(/^description\s*[:—\-–]\s*/i, '');
        continue;
      }
      // Impact: field
      if (/^impact\s*[:—\-–]/i.test(cleanLine)) {
        const im = /\b(high|medium|low)\b/i.exec(cleanLine);
        if (im) currentFinding.impact_level = im[1].charAt(0).toUpperCase() + im[1].slice(1).toLowerCase() as 'High' | 'Medium' | 'Low';
        continue;
      }
      // Timeframe: field
      if (/^(?:timeframe|time\s*frame|timeline)\s*[:—\-–]/i.test(cleanLine)) {
        const tm = tfPat.exec(cleanLine);
        if (tm) currentFinding.timeframe = normalizeTimeframe(tm[1]);
        continue;
      }
      // Source URL: field (must check before Source:)
      if (/^source\s*url\s*[:—\-–]/i.test(cleanLine)) {
        const urlVal = cleanLine.replace(/^source\s*url\s*[:—\-–]\s*/i, '').trim();
        if (urlVal && urlVal !== 'NONE' && urlVal.startsWith('http')) currentFinding.source.url = urlVal;
        continue;
      }
      // Source: field
      if (/^source\s*[:—\-–]/i.test(cleanLine)) {
        currentFinding.source = parseSourceLegacy(cleanLine.replace(/^source\s*[:—\-–]\s*/i, ''));
        continue;
      }
      // Companies Affected: field
      if (/^companies\s*affected\s*[:—\-–]/i.test(cleanLine)) {
        const companiesText = cleanLine.replace(/^companies\s*affected\s*[:—\-–]\s*/i, '');
        const companyParts = companiesText.split(/(?<=\)),\s*/);
        if (!currentFinding.affected_companies) currentFinding.affected_companies = [];
        for (const cp of companyParts) {
          const cm = cp.match(/^(.+?)\s*\((?:impact:\s*)?(positive|negative|neutral)\s*[—\-–]\s*(.+?)\s*\)/i);
          if (cm) currentFinding.affected_companies.push({ name: cm[1].trim(), ticker: null, impact: cm[2].toLowerCase() as AffectedCompany['impact'], detail: cm[3].trim() });
        }
        continue;
      }
      // Key Metrics: field
      if (/^key\s*metrics\s*[:—\-–]/i.test(cleanLine)) {
        continue; // skip the label line; metrics would be on subsequent lines but we don't parse them in lenient mode
      }
      // Inline impact/timeframe detection in non-field text
      const im = impactPat.exec(cleanLine) || impactPat2.exec(cleanLine);
      if (im && !currentFinding.impact_level) {
        currentFinding.impact_level = im[1].charAt(0).toUpperCase() + im[1].slice(1).toLowerCase() as 'High' | 'Medium' | 'Low';
      }
      const tm = tfPat.exec(cleanLine);
      if (tm && !currentFinding.timeframe) {
        currentFinding.timeframe = normalizeTimeframe(tm[1]);
      }
      // Accumulate description (only if not a known field prefix)
      if (!fieldPrefix.test(cleanLine)) {
        currentFinding.description += (currentFinding.description ? ' ' : '') + cleanLine;
      }
    }
  }

  if (currentFinding) findings.push(currentFinding);
  if (inTopCompanies && companyLines.length > 0) topCompanies.push(parseTopCompanyLines(companyLines));
  findings.forEach((f, idx) => { f.id = idx + 1; });

  const cats = findings.map(f => f.category);
  const impacts = findings.map(f => f.impact_level);

  return {
    subject: detectSubject(text),
    date_generated: new Date().toISOString().split('T')[0],
    total_findings: findings.length,
    findings,
    synthesis: synthesisLines.join(' ').trim(),
    news_items: newsItems, financial_highlights: financials,
    metadata: {
      emerging_trend_count: cats.filter(c => c === 'Emerging Trend').length,
      strategic_opportunity_count: cats.filter(c => c === 'Strategic Opportunity').length,
      key_challenge_count: cats.filter(c => c === 'Key Challenge').length,
      high_impact_count: impacts.filter(i => i === 'High').length,
      medium_impact_count: impacts.filter(i => i === 'Medium').length,
      low_impact_count: impacts.filter(i => i === 'Low').length,
      news_count: newsItems.length, financial_highlight_count: financials.length,
      top_company_count: topCompanies.length,
    },
    top_companies: topCompanies,
  };
}

// ══════════════════════════════════════
// ICON + TAG MAPPERS
// ══════════════════════════════════════

const ICON_MAP: [RegExp, string][] = [
  [/\b(?:ai|artificial intelligence|ml|machine learning|generat)\b/i, 'psychology'],
  [/\b(?:cloud|saas|infrastructure|data center)\b/i, 'cloud'],
  [/\b(?:energy|carbon|hydrogen|renewable|clean|net.?zero|emission)\b/i, 'eco'],
  [/\b(?:bank|financial|fintech|open banking|capital market)\b/i, 'account_balance'],
  [/\b(?:government|federal|public|regulation|policy|legislat)\b/i, 'shield'],
  [/\b(?:housing|real estate|affordab|mortgage)\b/i, 'home'],
  [/\b(?:trade|tariff|export|supply chain|geopolit|sanction)\b/i, 'warning'],
  [/\b(?:talent|workforce|hiring|skills|labor|labour|immigra)\b/i, 'school'],
  [/\b(?:health|healthcare|pharma|biotech|hospital)\b/i, 'health_and_safety'],
  [/\b(?:mineral|lithium|mining|resource|cobalt|nickel)\b/i, 'bolt'],
  [/\b(?:rate|inflation|monetary|gdp|fiscal|deficit|debt)\b/i, 'show_chart'],
  [/\b(?:tech|software|digital|cyber|semiconductor)\b/i, 'memory'],
  [/\b(?:data|analytics|intelligen)\b/i, 'bar_chart'],
  [/\b(?:transport|auto|vehicle|ev|electric)\b/i, 'directions_car'],
];

function autoMapIcon(text: string): string {
  for (const [re, icon] of ICON_MAP) { if (re.test(text)) return icon; }
  return 'trending_up';
}

const TAG_MAP: [RegExp, string][] = [
  [/\b(?:ai|ml|tech|software|digital|cyber|cloud|data)\b/i, 'Technology'],
  [/\b(?:energy|carbon|hydrogen|renewable|clean|net.?zero|climate)\b/i, 'Sustainability'],
  [/\b(?:government|federal|public sector|municipal)\b/i, 'Public Sector'],
  [/\b(?:bank|financial|fintech|insurance|capital)\b/i, 'Financial Services'],
  [/\b(?:mineral|resource|mining|oil|gas)\b/i, 'Resources'],
  [/\b(?:talent|workforce|labor|labour|hiring|immigra)\b/i, 'Workforce'],
  [/\b(?:health|pharma|biotech|hospital)\b/i, 'Health'],
  [/\b(?:trade|tariff|export|import|geopolit)\b/i, 'Trade'],
  [/\b(?:housing|real estate|property)\b/i, 'Real Estate'],
];

function deriveTag(text: string): string {
  for (const [re, tag] of TAG_MAP) { if (re.test(text)) return tag; }
  return 'Market';
}

// ══════════════════════════════════════
// TRANSFORM TO FRONTEND SHAPE
// ══════════════════════════════════════

export function transformToTrendsData(payload: AlphaSensePayload): TrendsData {
  const challengeFindings = payload.findings.filter(f => f.category === 'Key Challenge');
  const oppFindings = payload.findings.filter(f => f.category === 'Strategic Opportunity');
  const tc = payload.top_companies ?? [];

  const challenges: TrendsChallenge[] = challengeFindings.map(f => ({
    t: f.finding, d: f.description,
    severity: f.impact_level === 'Low' ? 'medium' as const : (f.impact_level?.toLowerCase() as 'high' | 'medium') || 'medium',
    ic: autoMapIcon(f.finding + ' ' + f.description),
    source: f.source,
    affected_companies: f.affected_companies,
    key_metrics: f.key_metrics,
  }));

  // Compute severity from company link counts if top_companies exist
  if (tc.length > 0) {
    challenges.forEach((c, idx) => {
      const fid = challengeFindings[idx]?.id;
      if (fid === undefined) return;
      const linkCount = tc.filter(co => co.linked_findings.challenges.includes(fid)).length;
      if (linkCount >= 4) c.severity = 'critical';
      else if (linkCount >= 3) c.severity = 'high';
      else if (linkCount >= 2) c.severity = 'medium';
      else c.severity = 'low';
    });
  }

  const opportunities: TrendsOpportunity[] = oppFindings.map(f => ({
    t: f.finding, p: '', timeline: f.timeframe || '',
    d: f.description,
    ic: autoMapIcon(f.finding + ' ' + f.description),
    source: f.source,
    affected_companies: f.affected_companies,
    key_metrics: f.key_metrics,
  }));

  // Compute priority from company link counts and sort
  if (tc.length > 0) {
    opportunities.forEach((o, idx) => {
      const fid = oppFindings[idx]?.id;
      if (fid === undefined) return;
      o.priority = tc.filter(co => co.linked_findings.opportunities.includes(fid)).length;
    });
    opportunities.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  const trends: TrendsTrend[] = payload.findings
    .filter(f => f.category === 'Emerging Trend')
    .map(f => ({
      t: f.finding, tag: deriveTag(f.finding + ' ' + f.description),
      d: f.description,
      ic: autoMapIcon(f.finding + ' ' + f.description),
      source: f.source,
      affected_companies: f.affected_companies,
      key_metrics: f.key_metrics,
    }));

  return {
    challenges, opportunities, trends,
    synthesis: payload.synthesis,
    source: {
      subject: payload.subject,
      date_generated: payload.date_generated,
      total_findings: payload.total_findings,
    },
    news_items: payload.news_items,
    financial_highlights: payload.financial_highlights,
    top_companies: tc,
  };
}

// ══════════════════════════════════════
// CHART VALUE PARSER
// ══════════════════════════════════════

export function parseChartValue(str: string): number {
  if (!str) return 0;
  const cleaned = str.replace(/[,$£€¥CAD\sUSD]/gi, '');
  const match = cleaned.match(/^([+-]?)(\d+\.?\d*)\s*(%|[KMBT])?$/i);
  if (!match) return parseFloat(cleaned) || 0;
  let num = parseFloat(match[2]);
  const suffix = match[3]?.toUpperCase();
  if (suffix === 'K') num *= 1000;
  else if (suffix === 'M') num *= 1_000_000;
  else if (suffix === 'B') num *= 1_000_000_000;
  else if (suffix === 'T') num *= 1_000_000_000_000;
  if (match[1] === '-') num = -num;
  return num;
}
