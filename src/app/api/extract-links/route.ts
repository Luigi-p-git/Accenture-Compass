/**
 * PDF Hyperlink Extractor + Matcher API
 * POST /api/extract-links
 *
 * Uses pdfjs-dist (Mozilla PDF.js) to:
 * 1. Extract all link annotations with their exact URLs
 * 2. Map citation numbers to URLs from annotation positions
 * 3. Parse the Citations section to get citation# → document title/org
 * 4. Match findings to exact URLs via: finding.source → citation# → URL
 */

import { NextRequest, NextResponse } from 'next/server';
import { writeFileSync, unlinkSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const TMP_DIR = join(process.cwd(), '.tmp');

/** Normalize text for matching */
function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function extractAndMatch(pdfPath: string, data: any): Promise<{
  count: number;
  findings: { index: number; category: string; url: string }[];
  news: { index: number; url: string }[];
}> {
  // Dynamic import for ESM module
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjsLib.getDocument(pdfPath).promise;

  // ── Step 1: Build citation# → URL map from annotations ──
  const citUrl = new Map<number, string>();

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const annots = await page.getAnnotations();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tc = await page.getTextContent() as { items: any[] };
    const texts = tc.items.filter((i: { str?: string }) => i.str?.trim());

    for (const a of annots) {
      if (a.subtype !== 'Link' || !a.url?.includes('docid=')) continue;
      const [lx, ly] = a.rect;
      // Find citation number text near this annotation
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nearby = texts.filter((t: any) =>
        Math.abs(t.transform[5] - ly) < 12 && Math.abs(t.transform[4] - lx) < 30
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ).map((t: any) => t.str).join('');
      const m = nearby.match(/\[?(\d+)\]?/);
      if (m) {
        const num = parseInt(m[1]);
        if (!citUrl.has(num)) citUrl.set(num, a.url);
      }
    }
  }

  // ── Step 2: Parse Citations section for citation# → document info (with dates) ──
  const citDoc = new Map<number, { title: string; org: string; date: string }>();

  /** Convert "10 Feb 26" to "2026-02-10" for comparison */
  function parseCitDate(d: string): string {
    const months: Record<string, string> = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const m = d.match(/(\d{2})\s+(\w{3})\s+(\d{2})/);
    if (!m) return '';
    const mon = months[m[2].toLowerCase()] || '01';
    return `20${m[3]}-${mon}-${m[1]}`;
  }

  for (let p = Math.max(1, doc.numPages - 5); p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tc = await page.getTextContent() as { items: any[] };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fullText = tc.items.map((i: any) => i.str).join('');

    // Format: [num]... Org • Company • Date • "Title"
    const re = /(\[\d+\](?:\s*\[\d+\])*)\s+([^•\n]+?)•\s*([^•\n]*?)•\s*(\d{2}\s+\w{3}\s+\d{2})\s*•\s*["""\u201c]([^"""\u201d]+)["""\u201d]/g;
    let m;
    while ((m = re.exec(fullText)) !== null) {
      const nums = [...m[1].matchAll(/\[(\d+)\]/g)].map(x => parseInt(x[1]));
      const org = m[2].trim();
      const dateStr = parseCitDate(m[4].trim());
      const title = m[5].trim();
      for (const n of nums) citDoc.set(n, { title, org, date: dateStr });
    }

    // Format: [num]... Org • Date • "Title" (no company)
    const re2 = /(\[\d+\](?:\s*\[\d+\])*)\s+([^•\n]+?)•\s*(\d{2}\s+\w{3}\s+\d{2})\s*•\s*["""\u201c]([^"""\u201d]+)["""\u201d]/g;
    while ((m = re2.exec(fullText)) !== null) {
      const nums = [...m[1].matchAll(/\[(\d+)\]/g)].map(x => parseInt(x[1]));
      const org = m[2].trim();
      const dateStr = parseCitDate(m[3].trim());
      const title = m[4].trim();
      for (const n of nums) {
        if (!citDoc.has(n)) citDoc.set(n, { title, org, date: dateStr });
      }
    }

    // Special formats: M&A Screener, etc.
    const re3 = /(\[\d+\](?:\s*\[\d+\])*)\s+(M&A Screener|Company Publication|Expert Call)[^["]*/g;
    while ((m = re3.exec(fullText)) !== null) {
      const nums = [...m[1].matchAll(/\[(\d+)\]/g)].map(x => parseInt(x[1]));
      const type = m[2].trim();
      for (const n of nums) {
        if (!citDoc.has(n)) citDoc.set(n, { title: type, org: type, date: '' });
      }
    }
  }

  console.log(`[Extract-Links] ${citUrl.size} citation→URL, ${citDoc.size} citation→doc mappings`);

  // ── Step 3: Match findings to citations using title + org + DATE ──
  function findBestCitation(docTitle: string, org: string, findingDate: string): number {
    const nt = norm(docTitle);
    const no = norm(org);
    const titleWords = nt.split(' ').filter(w => w.length > 3);
    const orgWords = no.split(' ').filter(w => w.length > 3);

    let bestNum = -1;
    let bestScore = 0;

    for (const [num, info] of citDoc) {
      if (!citUrl.has(num)) continue;
      const ct = norm(info.title);
      const co = norm(info.org);

      // Title word overlap
      const titleHits = titleWords.filter(w => ct.includes(w)).length;
      // Org word overlap
      const orgHits = orgWords.filter(w => co.includes(w)).length;

      let score = titleHits * 2 + orgHits * 3;

      // Exact title substring match — strong signal
      if (nt.length > 8 && ct.includes(nt.substring(0, Math.min(nt.length, 30)))) score += 10;
      if (ct.length > 8 && nt.includes(ct.substring(0, Math.min(ct.length, 30)))) score += 10;

      // DATE MATCH — critical for disambiguating same-org citations
      if (findingDate && info.date && findingDate === info.date) score += 8;

      if (score > bestScore) { bestScore = score; bestNum = num; }
    }

    // Fallback: org-only match with date preference
    if (bestNum === -1 && orgWords.length > 0) {
      let bestOrgNum = -1;
      let bestOrgScore = 0;
      for (const [num, info] of citDoc) {
        if (!citUrl.has(num)) continue;
        const co = norm(info.org);
        const orgHits = orgWords.filter(w => co.includes(w)).length;
        if (orgHits >= 1 && orgHits === orgWords.length) {
          let s = orgHits;
          if (findingDate && info.date && findingDate === info.date) s += 5;
          if (s > bestOrgScore) { bestOrgScore = s; bestOrgNum = num; }
        }
      }
      if (bestOrgNum >= 0) return bestOrgNum;
    }

    return bestScore >= 3 ? bestNum : -1;
  }

  const findings: { index: number; category: string; url: string }[] = [];
  const news: { index: number; url: string }[] = [];

  for (const cat of ['trends', 'opportunities', 'challenges'] as const) {
    const items = data[cat] || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items.forEach((item: any, idx: number) => {
      // Priority 1: Use citation_id if available (from prompt's Source Citation field)
      const citId = item.source?.citation_id;
      if (citId && citUrl.has(citId)) {
        findings.push({ index: idx, category: cat, url: citUrl.get(citId)! });
        return;
      }
      // Priority 2: Text-based matching with date
      const cit = findBestCitation(item.source?.document_title || '', item.source?.organization || '', item.source?.date || '');
      const url = cit > 0 ? citUrl.get(cit) : undefined;
      if (url) findings.push({ index: idx, category: cat, url });
    });
  }

  if (data.news_items) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data.news_items.forEach((item: any, idx: number) => {
      // Priority 1: citation_id
      const citId = item.citation_id;
      if (citId && citUrl.has(citId)) {
        news.push({ index: idx, url: citUrl.get(citId)! });
        return;
      }
      // Priority 2: Text-based matching with date
      const cit = findBestCitation(item.headline || '', item.source_org || '', item.date || '');
      const url = cit > 0 ? citUrl.get(cit) : undefined;
      if (url) news.push({ index: idx, url });
    });
  }

  return { count: citUrl.size, findings, news };
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get('file') as File | null;
    const dataJson = form.get('data') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No PDF file provided' }, { status: 400 });
    }

    // Save PDF to temp for pdfjs to read
    if (!existsSync(TMP_DIR)) mkdirSync(TMP_DIR, { recursive: true });
    const pdfPath = join(TMP_DIR, `links-${Date.now()}.pdf`);
    const buffer = Buffer.from(await file.arrayBuffer());
    writeFileSync(pdfPath, buffer);

    try {
      if (!dataJson) {
        return NextResponse.json({ error: 'No data provided for matching' }, { status: 400 });
      }

      const data = JSON.parse(dataJson);
      const result = await extractAndMatch(pdfPath, data);

      console.log(`[Extract-Links] Matched ${result.findings.length} findings + ${result.news.length} news from ${result.count} citations`);

      return NextResponse.json({
        success: true,
        count: result.count,
        matched: { findings: result.findings, news: result.news },
      });
    } finally {
      try { unlinkSync(pdfPath); } catch { /* ignore */ }
    }
  } catch (err) {
    console.error('[Extract-Links] Error:', err);
    return NextResponse.json(
      { error: `Link extraction failed: ${err instanceof Error ? err.message : 'unknown'}` },
      { status: 500 }
    );
  }
}
