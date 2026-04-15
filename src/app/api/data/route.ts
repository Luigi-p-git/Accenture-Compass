/**
 * Accenture Compass — Data Management API
 *
 * GET /api/data?country=canada&topic=talent    → Fetch data
 * POST /api/data                                → Upload/update data
 * PUT /api/data                                 → Bulk update from snapshot
 *
 * In Phase 1, serves from static JSON files.
 * In Phase 2, connects to Supabase/PostgreSQL.
 */
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

const DATA_DIR = path.join(process.cwd(), 'src', 'data');

// ── Cross-Linker: builds bidirectional links between findings, companies, and news ──

function normalizeName(name: string): string {
  return name.toLowerCase()
    .replace(/\b(inc|corp|co|ltd|plc|group|holdings|nv|lp|llc|company|the|enterprises?|partners?)\b\.?/g, '')
    .replace(/[.,&]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function fuzzyMatch(a: string, b: string): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  // Check if either contains the other (handles "Dow" matching "Dow Chemical")
  if (na.length > 3 && nb.length > 3) {
    if (na.includes(nb) || nb.includes(na)) return true;
  }
  // Check if the first significant word matches (handles "Exxon Mobil Corp" vs "Exxon")
  const wa = na.split(' ').filter(w => w.length > 2);
  const wb = nb.split(' ').filter(w => w.length > 2);
  if (wa[0] && wb[0] && wa[0] === wb[0] && wa[0].length > 3) return true;
  return false;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function crossLinkData(data: any) {
  if (!data.top_companies?.length) return;
  const tc = data.top_companies;

  // Build bidirectional links for each finding category
  for (const cat of ['trends', 'opportunities', 'challenges'] as const) {
    const findings = data[cat];
    if (!findings?.length) continue;

    findings.forEach((finding: any, fIdx: number) => {
      const matchedCompanyIndices = new Set<number>();

      // Direction 1: finding's affected_companies → fuzzy match to top_companies
      if (finding.affected_companies?.length) {
        for (const ac of finding.affected_companies) {
          tc.forEach((company: any, tcIdx: number) => {
            if (fuzzyMatch(ac.name, company.name)) matchedCompanyIndices.add(tcIdx);
          });
        }
      }

      // Direction 2: top_company's linked_findings → check if this finding is referenced
      tc.forEach((company: any, tcIdx: number) => {
        if (company.linked_findings?.[cat]?.includes(fIdx)) matchedCompanyIndices.add(tcIdx);
      });

      // Store resolved links on the finding
      finding.linked_top_companies = [...matchedCompanyIndices].sort((a, b) => a - b);

      // Backfill: ensure each matched company's linked_findings includes this finding
      matchedCompanyIndices.forEach((tcIdx: number) => {
        const company = tc[tcIdx];
        if (!company.linked_findings) company.linked_findings = { trends: [], opportunities: [], challenges: [] };
        if (!company.linked_findings[cat]) company.linked_findings[cat] = [];
        if (!company.linked_findings[cat].includes(fIdx)) {
          company.linked_findings[cat].push(fIdx);
          company.linked_findings[cat].sort((a: number, b: number) => a - b);
        }
      });
    });
  }

  // Cross-link news items to top companies
  if (data.news_items?.length) {
    data.news_items.forEach((news: any) => {
      const matchedIndices = new Set<number>();

      // From companies_mentioned field
      if (news.companies_mentioned?.length) {
        for (const name of news.companies_mentioned) {
          tc.forEach((company: any, tcIdx: number) => {
            if (fuzzyMatch(name, company.name)) matchedIndices.add(tcIdx);
          });
        }
      }

      // Also scan headline + summary for company names
      const text = `${news.headline} ${news.summary}`.toLowerCase();
      tc.forEach((company: any, tcIdx: number) => {
        const normalized = normalizeName(company.name);
        const words = normalized.split(' ').filter((w: string) => w.length > 3);
        if (words.some((w: string) => text.includes(w))) matchedIndices.add(tcIdx);
      });

      news.linked_top_companies = [...matchedIndices].sort((a, b) => a - b);
    });
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// Mapping of topic → file path pattern
const TOPIC_PATHS: Record<string, (country: string) => string> = {
  overview: (country) => `countries/${country}.json`,
  talent: (country) => `talent/${country}.json`,
  industries: (country) => `industries/${country}/index.json`,
  financials: (country) => `financials/${country}.json`,
  macro: (country) => `macro/${country}.json`,
  trends: (country) => `trends/${country}/all-industries.json`,
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get('country') || 'canada';
  const topic = searchParams.get('topic') || 'overview';
  const industry = searchParams.get('industry') || '';

  const pathResolver = TOPIC_PATHS[topic];
  if (!pathResolver) {
    return NextResponse.json(
      { error: `Unknown topic: ${topic}` },
      { status: 400 }
    );
  }

  let filePath = path.join(DATA_DIR, pathResolver(country));
  // For trends topic, support industry-specific files
  if (topic === 'trends' && industry) {
    const slug = industry.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    filePath = path.join(DATA_DIR, 'trends', country, `${slug}.json`);
  }

  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(raw);
    return NextResponse.json({
      success: true,
      country,
      topic,
      period: 'Q4 2025',
      data,
    });
  } catch {
    return NextResponse.json(
      { error: `Data not found for ${country}/${topic}` },
      { status: 404 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { country, topic, data, period, industry } = body;

    if (!country || !topic || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: country, topic, data' },
        { status: 400 }
      );
    }

    const pathResolver = TOPIC_PATHS[topic];
    if (!pathResolver) {
      return NextResponse.json(
        { error: `Unknown topic: ${topic}` },
        { status: 400 }
      );
    }

    let filePath = path.join(DATA_DIR, pathResolver(country));
    // For trends topic, support industry-specific files
    if (topic === 'trends' && industry) {
      const slug = industry.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      filePath = path.join(DATA_DIR, 'trends', country, `${slug}.json`);
    }

    // Ensure directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Sanitize trends data — fix common issues from AI-generated JSON
    if (topic === 'trends') {
      // Fix source.total_findings — must be a number
      if (data.source) {
        if (typeof data.source.total_findings === 'string') data.source.total_findings = parseInt(data.source.total_findings) || 0;
        if (!data.source.total_findings) data.source.total_findings = (data.trends?.length || 0) + (data.opportunities?.length || 0) + (data.challenges?.length || 0);
      }

      // Fix linked_findings — detect if 1-based and convert to 0-based
      if (data.top_companies?.length && data.trends?.length) {
        for (const co of data.top_companies) {
          if (!co.linked_findings) { co.linked_findings = { trends: [], opportunities: [], challenges: [] }; continue; }
          // Detect 1-based: if any index equals the array length (would be out of bounds for 0-based)
          const maxT = Math.max(0, ...(co.linked_findings.trends || []));
          const maxO = Math.max(0, ...(co.linked_findings.opportunities || []));
          const maxC = Math.max(0, ...(co.linked_findings.challenges || []));
          const looksOneBased = (maxT >= (data.trends?.length || 0)) || (maxO >= (data.opportunities?.length || 0)) || (maxC >= (data.challenges?.length || 0));
          if (looksOneBased) {
            co.linked_findings.trends = (co.linked_findings.trends || []).map((n: number) => Math.max(0, n - 1));
            co.linked_findings.opportunities = (co.linked_findings.opportunities || []).map((n: number) => Math.max(0, n - 1));
            co.linked_findings.challenges = (co.linked_findings.challenges || []).map((n: number) => Math.max(0, n - 1));
          }
          // Ensure logo_url exists
          if (!co.logo_url && co.name) {
            const domain = co.name.toLowerCase().replace(/\b(inc|corp|co|ltd|plc|group)\b/g, '').trim().split(/\s+/).pop()?.replace(/[^a-z]/g, '');
            if (domain) co.logo_url = `https://www.google.com/s2/favicons?domain=${domain}.com&sz=128`;
          }
        }
      }

      // Fix news_items — ensure ids are numbers
      if (data.news_items) {
        data.news_items.forEach((n: { id: number | string }, i: number) => {
          if (typeof n.id === 'string') n.id = parseInt(n.id as string) || (i + 1);
        });
      }

      // Fix financial_highlights — ensure ids are numbers
      if (data.financial_highlights) {
        data.financial_highlights.forEach((f: { id: number | string }, i: number) => {
          if (typeof f.id === 'string') f.id = parseInt(f.id as string) || (i + 1);
        });
      }

      // Ensure all required arrays exist
      if (!data.trends) data.trends = [];
      if (!data.opportunities) data.opportunities = [];
      if (!data.challenges) data.challenges = [];
      if (!data.news_items) data.news_items = [];
      if (!data.financial_highlights) data.financial_highlights = [];
      if (!data.top_companies) data.top_companies = [];
      if (!data.synthesis) data.synthesis = '';
    }

    // For trends: auto-detect extracted images for this country/industry
    if (topic === 'trends' && !data.images?.length) {
      const slug = industry ? industry.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : '';
      const visualDir = path.join(process.cwd(), 'public', 'visuals', country, slug || '');
      try {
        const files = await fs.readdir(visualDir);
        const imageFiles = files.filter(f => /\.(jpeg|jpg|png)$/i.test(f)).sort();
        if (imageFiles.length > 0) {
          data.images = imageFiles.map((f, i) => ({
            src: `/visuals/${country}/${slug ? slug + '/' : ''}${f}`,
            caption: `Chart ${i + 1} — Extracted from PDF`,
          }));
        }
      } catch { /* no visuals dir — that's fine */ }
    }

    // Cross-link all data bidirectionally
    if (topic === 'trends') crossLinkData(data);

    // Write data
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));

    return NextResponse.json({
      success: true,
      message: `Data updated for ${country}/${topic}`,
      path: filePath,
      period: period || 'current',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update data', details: String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { snapshot } = body;

    if (!snapshot || !snapshot.country || !snapshot.topics) {
      return NextResponse.json(
        { error: 'Missing snapshot data. Required: { snapshot: { country, period, topics: { [topic]: data } } }' },
        { status: 400 }
      );
    }

    const results: { topic: string; status: string }[] = [];

    for (const [topic, data] of Object.entries(snapshot.topics)) {
      const pathResolver = TOPIC_PATHS[topic];
      if (!pathResolver) {
        results.push({ topic, status: 'skipped — unknown topic' });
        continue;
      }

      const filePath = path.join(DATA_DIR, pathResolver(snapshot.country));
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
      results.push({ topic, status: 'updated' });
    }

    return NextResponse.json({
      success: true,
      message: `Bulk update complete for ${snapshot.country}`,
      period: snapshot.period,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Bulk update failed', details: String(error) },
      { status: 500 }
    );
  }
}
