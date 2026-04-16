/**
 * AccSense Magazine — Premium PDF Report Generator
 * Modeled after Accenture Annual Report 2025: big numbers, minimal text, clean hierarchy
 * Font sizes: 7pt min label, 10pt body, 13pt intro, 18-22pt headers, 36-48pt heroes
 */
import jsPDF from 'jspdf';
import type { TrendsData } from '@/types';

const C = {
  p: '#A100FF', pd: '#7B00BF', em: '#34d399', red: '#f87171', blue: '#60a5fa', amber: '#fbbf24',
  bg: '#0a0a0a', s1: '#141414', s2: '#1e1e1e', s3: '#2a2a2a',
  t1: '#ffffff', t2: '#cccccc', t3: '#999999', t4: '#666666', t5: '#444444',
};

function rgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  if (h.length > 6) h = h.substring(0, 6);
  return [parseInt(h.slice(0, 2), 16) || 0, parseInt(h.slice(2, 4), 16) || 0, parseInt(h.slice(4, 6), 16) || 0];
}

export function generateIntelligenceReport(data: TrendsData, country: string, industry: string) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, H = 297, M = 18, CW = W - M * 2;
  let y = 0;

  const trends = data.trends || [];
  const opps = data.opportunities || [];
  const challenges = [...(data.challenges || [])].sort((a, b) => {
    const o: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return (o[a.severity] ?? 9) - (o[b.severity] ?? 9);
  });
  const synthesis = data.synthesis || '';
  const news = data.news_items || [];
  const financials = data.financial_highlights || [];
  const companies = data.top_companies || [];
  const date = data.source?.date_generated || new Date().toISOString().split('T')[0];
  const total = data.source?.total_findings || (trends.length + opps.length + challenges.length);

  const tc = (hex: string) => doc.setTextColor(...rgb(hex));
  const fc = (hex: string) => doc.setFillColor(...rgb(hex));
  const dc = (hex: string) => doc.setDrawColor(...rgb(hex));
  const font = (style: string, size: number) => { doc.setFont('helvetica', style); doc.setFontSize(size); };
  const wrap = (text: string, w: number, s: number): string[] => { font('normal', s); return doc.splitTextToSize(text, w); };
  const newPage = () => { doc.addPage(); fc(C.bg); doc.rect(0, 0, W, H, 'F'); y = M; };
  const check = (n: number) => { if (y + n > H - 18) newPage(); };

  // ══════════════════════════════════════
  // PAGE 1: COVER — minimal, like Accenture (3 text items on their cover)
  // ══════════════════════════════════════
  fc(C.bg); doc.rect(0, 0, W, H, 'F');
  fc(C.p); doc.rect(0, 0, W, 4, 'F');

  // > watermark — subtle
  tc('#0d0520'); font('bold', 200); doc.text('>', 100, 180);

  // Title — THE COUNTRY OUTLOOK
  y = 70;
  tc(C.t1); font('bold', 48); doc.text('THE', M, y);
  y += 24;
  tc(C.p);
  const titleSize = country.length > 12 ? 36 : country.length > 8 ? 44 : 52;
  font('bold', titleSize); doc.text(country.toUpperCase(), M, y);
  y += titleSize * 0.45;
  tc(C.t1); font('bold', 48); doc.text('OUTLOOK.', M, y);

  if (industry && industry !== 'All Industries') {
    y += 14;
    tc(C.p); font('italic', 16); doc.text(`in ${industry}`, M, y);
  }

  // Bottom: date + branding
  tc(C.t4); font('normal', 8);
  doc.text(`Strategic Intelligence Report  |  ${date}`, M, H - 20);
  tc(C.p); font('bold', 8);
  doc.text('ACCSENSE MAGAZINE', M, H - 14);
  tc(C.t5); font('normal', 7);
  doc.text('Powered by AlphaSense Deep Research', M, H - 9);

  fc(C.p); doc.rect(0, H - 4, W, 4, 'F');

  // ══════════════════════════════════════
  // PAGE 2: KEY NUMBERS — Accenture style (big $69.7B numbers)
  // ══════════════════════════════════════
  newPage();

  // Top intro text
  tc(C.t2); font('normal', 13);
  const introLines = wrap(
    `In this intelligence brief, ${total} findings were identified across ${country}'s ${industry || 'key sectors'}, ` +
    `analyzing ${companies.length} major companies and ${news.length} source documents.`,
    CW, 13
  );
  introLines.slice(0, 3).forEach((line: string) => { doc.text(line, M, y); y += 7; });
  y += 8;

  // Big metric blocks — 2 per row like Accenture page 2
  const metricBlocks = [
    { label: 'Findings', value: String(total), sub: `${trends.length} trends, ${opps.length} opportunities, ${challenges.length} challenges` },
    { label: 'Companies', value: String(companies.length), sub: companies.slice(0, 3).map(c => c.name).join(', ') },
  ];

  // First row — two big numbers
  const halfW = (CW - 10) / 2;
  metricBlocks.forEach((m, i) => {
    const mx = M + i * (halfW + 10);
    tc(C.t3); font('bold', 13); doc.text(m.label, mx, y);
    tc(C.t1); font('bold', 44); doc.text(m.value, mx, y + 20);
    tc(C.t4); font('normal', 10); doc.text(m.sub.substring(0, 50), mx, y + 28);
  });
  y += 40;

  // Second row — financial highlights (top 4 as big cards)
  if (financials.length > 0) {
    y += 5;
    const topFin = financials.slice(0, 4);
    const finW = (CW - 15) / 2;
    topFin.forEach((fin, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const fx = M + col * (finW + 15);
      const fy = y + row * 35;

      tc(C.t3); font('bold', 13); doc.text(fin.metric, fx, fy);
      tc(C.t1); font('bold', 36);
      doc.text(fin.current_value, fx, fy + 16);
      if (fin.change) {
        tc(fin.change.startsWith('-') ? C.red : C.em);
        font('bold', 14);
        doc.text(fin.change, fx, fy + 25);
      }
    });
    y += Math.ceil(topFin.length / 2) * 35 + 5;
  }

  // Remaining financial highlights — smaller, 3 per row
  if (financials.length > 4) {
    check(30);
    const remFin = financials.slice(4);
    const rw = (CW - 10) / 3;
    remFin.forEach((fin, i) => {
      const col = i % 3;
      if (col === 0 && i > 0) y += 18;
      check(18);
      const fx = M + col * (rw + 5);
      tc(C.t4); font('bold', 8); doc.text(fin.metric.substring(0, 24), fx, y);
      tc(C.t1); font('bold', 18); doc.text(fin.current_value, fx, y + 8);
      if (fin.change) {
        tc(fin.change.startsWith('-') ? C.red : C.em);
        font('bold', 9); doc.text(fin.change, fx + doc.getTextWidth(fin.current_value) + 2, y + 8);
      }
    });
    y += 22;
  }

  // ══════════════════════════════════════
  // SYNTHESIS — pull quote style
  // ══════════════════════════════════════
  if (synthesis) {
    check(60);
    y += 8;
    tc(C.p); font('bold', 8); doc.text('EXECUTIVE SYNTHESIS', M, y);
    y += 10;

    const sStart = y;
    tc(C.t2); font('normal', 12);
    const sLines = wrap(synthesis, CW - 8, 12);
    sLines.slice(0, 10).forEach((line: string) => { check(6.5); doc.text(line, M + 6, y); y += 6.5; });
    fc(C.p); doc.rect(M, sStart - 2, 1.5, y - sStart + 4, 'F');
    y += 10;
  }

  // ══════════════════════════════════════
  // TOP COMPANIES
  // ══════════════════════════════════════
  if (companies.length > 0) {
    newPage();
    tc(C.blue); font('bold', 8); doc.text('COMPANY INTELLIGENCE', M, y);
    y += 6;
    tc(C.t1); font('bold', 22); doc.text('Top Companies', M, y);
    y += 4; dc(C.t1); doc.setLineWidth(0.4); doc.line(M, y, W - M, y); y += 10;

    companies.forEach((co, i) => {
      check(22);
      // Alternating bg
      fc(i % 2 === 0 ? C.s1 : C.bg); doc.rect(M - 2, y - 4, CW + 4, 18, 'F');

      // Rank
      tc(C.t5); font('bold', 14); doc.text(String(i + 1).padStart(2, '0'), M, y + 3);

      // Name + ticker
      const cx = M + 14;
      tc(C.t1); font('bold', 11); doc.text(co.name, cx, y);
      if (co.ticker) { const nw = doc.getTextWidth(co.name); tc(C.blue); font('bold', 7); doc.text(co.ticker, cx + nw + 2, y); }

      // Sector + HQ
      tc(C.t4); font('normal', 7); doc.text(`${co.sector}  |  ${co.hq}`, cx, y + 6);

      // Revenue — right aligned
      tc(C.t1); font('bold', 14); doc.text(co.revenue, W - M, y, { align: 'right' });

      // Findings pills
      const tL = co.linked_findings.trends.length;
      const oL = co.linked_findings.opportunities.length;
      const cL = co.linked_findings.challenges.length;
      let px = cx; const py = y + 10;
      if (tL > 0) { fc(C.p); doc.rect(px, py, 14, 4, 'F'); tc(C.t1); font('bold', 7); doc.text(`${tL} Trends`, px + 1, py + 3); px += 16; }
      if (oL > 0) { fc(C.em); doc.rect(px, py, 11, 4, 'F'); tc('#000000'); font('bold', 7); doc.text(`${oL} Opp`, px + 1, py + 3); px += 13; }
      if (cL > 0) { fc(C.red); doc.rect(px, py, 11, 4, 'F'); tc(C.t1); font('bold', 7); doc.text(`${cL} Risk`, px + 1, py + 3); }

      y += 22;
    });
  }

  // ══════════════════════════════════════
  // FINDINGS SECTIONS
  // ══════════════════════════════════════
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderFindings = (title: string, tag: string, items: any[], accent: string) => {
    newPage();
    tc(accent); font('bold', 8); doc.text(tag.toUpperCase(), M, y);
    y += 6;
    tc(C.t1); font('bold', 22); doc.text(title, M, y);
    y += 4; dc(C.t1); doc.setLineWidth(0.4); doc.line(M, y, W - M, y); y += 10;

    items.forEach((item, idx) => {
      check(40);

      // Number — muted background
      tc(C.s3); font('bold', 28); doc.text(String(idx + 1).padStart(2, '0'), M, y + 6);

      const ix = M + 18;

      // Title
      tc(C.t1); font('bold', 12);
      const tl = wrap(item.t, CW - 20, 12);
      tl.slice(0, 2).forEach((line: string) => { doc.text(line, ix, y); y += 5.5; });

      // Badges
      let bx = ix;
      if (item.severity) {
        const sc = item.severity === 'critical' ? '#ef4444' : item.severity === 'high' ? C.red : item.severity === 'medium' ? C.amber : C.blue;
        const label = item.severity.toUpperCase();
        font('bold', 7); const lw = doc.getTextWidth(label) + 4;
        fc(sc); doc.rect(bx, y - 2.5, lw, 4, 'F');
        tc(C.t1); doc.text(label, bx + 2, y); bx += lw + 4;
      }
      if (item.timeline) { tc(C.t4); font('normal', 8); doc.text(item.timeline, bx, y); }
      y += 5;

      // Key metric callout
      if (item.key_metrics?.length > 0) {
        const km = item.key_metrics[0];
        fc(C.s1); doc.rect(ix, y - 1, CW - 20, 9, 'F');
        tc(C.t4); font('bold', 7); doc.text((km.label || '').toUpperCase().substring(0, 35), ix + 3, y + 2);
        tc(C.t1); font('bold', 12); doc.text(km.value || '', ix + 3, y + 7);
        y += 12;
      }

      // Description — max 3 lines, 10pt
      tc(C.t3); font('normal', 9);
      const dl = wrap(item.d, CW - 20, 9);
      dl.slice(0, 3).forEach((line: string) => { doc.text(line, ix, y); y += 4.2; });

      // Companies
      if (item.affected_companies?.length > 0) {
        y += 2;
        const coLine = item.affected_companies.slice(0, 3).map((co: { name: string; impact: string }) => {
          const arrow = co.impact === 'positive' ? '[+]' : co.impact === 'negative' ? '[-]' : '[~]';
          return `${arrow} ${co.name}`;
        }).join('   ');
        tc(C.t4); font('normal', 8); doc.text(coLine.substring(0, 110), ix, y);
        y += 4;
      }

      // Source
      if (item.source?.document_title) {
        tc(C.t5); font('italic', 7);
        doc.text(`Source: ${item.source.organization || ''} | ${item.source.date || ''}`, ix, y);
        y += 3;
      }

      y += 8;
      if (idx < items.length - 1) { dc(C.t5); doc.setLineWidth(0.1); doc.line(ix, y - 3, W - M, y - 3); }
    });
  };

  if (trends.length > 0) renderFindings('Emerging Trends', 'Emerging Signals', trends, C.p);
  if (opps.length > 0) renderFindings('Strategic Opportunities', 'Growth Vectors', opps, C.em);
  if (challenges.length > 0) renderFindings('Key Challenges', 'Risk Landscape', challenges, C.red);

  // ══════════════════════════════════════
  // BROKER ANALYSIS
  // ══════════════════════════════════════
  if (news.length > 0) {
    newPage();
    tc(C.blue); font('bold', 8); doc.text('BROKER ANALYSIS & SOURCES', M, y);
    y += 6;
    tc(C.t1); font('bold', 22); doc.text('Source Intelligence', M, y);
    y += 4; dc(C.t1); doc.setLineWidth(0.4); doc.line(M, y, W - M, y); y += 10;

    news.slice(0, 12).forEach((n, idx) => {
      check(18);
      // Number
      tc(C.t5); font('bold', 12); doc.text(String(idx + 1).padStart(2, '0'), M, y + 1);

      // Headline
      tc(C.t1); font('bold', 10);
      const hl = wrap(n.headline, CW - 16, 10);
      hl.slice(0, 2).forEach((line: string) => { doc.text(line, M + 14, y); y += 4.5; });

      // Meta
      tc(C.t4); font('normal', 7);
      doc.text([n.type, n.source_org, n.date].filter(Boolean).join('  |  '), M + 14, y);
      y += 3;

      // Quote
      if (n.analyst_quote && n.analyst_quote !== 'NONE') {
        tc(C.blue); font('italic', 8);
        const ql = wrap(n.analyst_quote, CW - 20, 8);
        const qStart = y;
        ql.slice(0, 2).forEach((line: string) => { doc.text(line, M + 18, y); y += 3.8; });
        fc(C.blue); doc.rect(M + 14, qStart - 1, 0.5, y - qStart + 1, 'F');
      }

      y += 6;
    });
  }

  // ══════════════════════════════════════
  // BACK COVER — clean, minimal
  // ══════════════════════════════════════
  newPage();
  tc('#0d0520'); font('bold', 180); doc.text('>', 60, H / 2 + 20);

  const bcY = H / 2 - 30;
  tc(C.t1); font('bold', 36); doc.text(country.toUpperCase(), W / 2, bcY, { align: 'center' });
  if (industry && industry !== 'All Industries') {
    tc(C.p); font('italic', 14); doc.text(industry, W / 2, bcY + 10, { align: 'center' });
  }
  tc(C.t4); font('normal', 10); doc.text('Strategic Intelligence Report', W / 2, bcY + 22, { align: 'center' });
  tc(C.t5); font('normal', 8); doc.text(`${date}  |  ${total} Findings  |  ${companies.length} Companies  |  AlphaSense`, W / 2, bcY + 30, { align: 'center' });

  fc(C.p); doc.rect(W / 2 - 20, bcY + 38, 40, 0.8, 'F');

  tc(C.p); font('bold', 9); doc.text('ACCSENSE MAGAZINE', W / 2, bcY + 50, { align: 'center' });
  tc(C.t5); font('normal', 7); doc.text('Accenture Compass Intelligence Platform', W / 2, bcY + 56, { align: 'center' });

  fc(C.p); doc.rect(0, H - 4, W, 4, 'F');

  // Save
  const slug = country.toLowerCase().replace(/\s+/g, '-');
  const indSlug = industry && industry !== 'All Industries' ? `-${industry.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : '';
  doc.save(`AccSense-${slug}${indSlug}-${date}.pdf`);
}
