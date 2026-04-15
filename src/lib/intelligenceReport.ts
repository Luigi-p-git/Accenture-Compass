/**
 * AccSense Magazine — Premium PDF Report Generator
 * Generates a branded, dark-themed intelligence report
 */
import jsPDF from 'jspdf';
import type { TrendsData } from '@/types';

// Design tokens
const COLORS = {
  primary: '#A100FF',
  primaryDark: '#7B00BF',
  emerald: '#34d399',
  red: '#f87171',
  blue: '#60a5fa',
  amber: '#fbbf24',
  bg: '#0a0a0a',
  surface: '#141414',
  surface2: '#1e1e1e',
  text: '#ffffff',
  textMuted: '#a0a0a0',
  textDim: '#666666',
};

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

export function generateIntelligenceReport(data: TrendsData, country: string, industry: string) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, H = 297;
  const M = 18; // margin
  const CW = W - M * 2; // content width
  let y = 0;

  const trends = data.trends || [];
  const opps = data.opportunities || [];
  const challenges = data.challenges || [];
  const synthesis = data.synthesis || '';
  const news = data.news_items || [];
  const financials = data.financial_highlights || [];
  const date = data.source?.date_generated || new Date().toISOString().split('T')[0];
  const total = data.source?.total_findings || (trends.length + opps.length + challenges.length);

  // ── Helpers ──
  const setColor = (hex: string) => doc.setTextColor(...hexToRgb(hex));
  const setFill = (hex: string) => doc.setFillColor(...hexToRgb(hex));
  const setDraw = (hex: string) => doc.setDrawColor(...hexToRgb(hex));

  const addPage = () => {
    doc.addPage();
    setFill(COLORS.bg);
    doc.rect(0, 0, W, H, 'F');
    y = M;
  };

  const checkPage = (needed: number) => {
    if (y + needed > H - 20) addPage();
  };

  const wrapText = (text: string, maxWidth: number, fontSize: number): string[] => {
    doc.setFontSize(fontSize);
    return doc.splitTextToSize(text, maxWidth);
  };

  // ══════════════════════════════════════
  // PAGE 1: COVER
  // ══════════════════════════════════════
  setFill(COLORS.bg);
  doc.rect(0, 0, W, H, 'F');

  // Purple accent bar at top
  setFill(COLORS.primary);
  doc.rect(0, 0, W, 3, 'F');

  // > motif watermark
  setColor('#1a0a2e');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(200);
  doc.text('>', 120, 180);

  // AccSense Magazine branding
  y = 40;
  setColor(COLORS.primary);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('ACCSENSE MAGAZINE', M, y);

  y += 6;
  setColor(COLORS.textDim);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`STRATEGIC INTELLIGENCE REPORT  ·  ${date}  ·  ALPHASENSE DEEP RESEARCH`, M, y);

  // Main title
  y += 25;
  setColor(COLORS.text);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(42);
  doc.text('THE', M, y);

  y += 20;
  setColor(COLORS.primary);
  doc.setFontSize(48);
  doc.text(country.toUpperCase(), M, y);

  y += 20;
  setColor(COLORS.text);
  doc.setFontSize(42);
  doc.text('OUTLOOK.', M, y);

  if (industry && industry !== 'All Industries') {
    y += 12;
    setColor(COLORS.primary);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'italic');
    doc.text(`in ${industry}`, M, y);
  }

  // Synthesis excerpt
  if (synthesis) {
    y += 20;
    setColor(COLORS.textMuted);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const lines = wrapText(synthesis.split('.').slice(0, 2).join('.') + '.', CW * 0.55, 9);
    lines.forEach(line => {
      doc.text(line, M, y);
      y += 4.5;
    });
  }

  // Stats block on right side
  const statsX = W - M - 50;
  let statsY = 120;
  setFill(COLORS.surface);
  doc.rect(statsX - 5, statsY - 8, 55, 55, 'F');

  setColor(COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.text('KEY METRICS', statsX, statsY);
  statsY += 8;

  [
    { label: 'TOTAL FINDINGS', value: String(total), color: COLORS.text },
    { label: 'TRENDS', value: String(trends.length), color: COLORS.primary },
    { label: 'OPPORTUNITIES', value: String(opps.length), color: COLORS.emerald },
    { label: 'CHALLENGES', value: String(challenges.length), color: COLORS.red },
  ].forEach(stat => {
    setColor(COLORS.textDim);
    doc.setFontSize(5);
    doc.setFont('helvetica', 'bold');
    doc.text(stat.label, statsX, statsY);
    setColor(stat.color);
    doc.setFontSize(16);
    doc.text(stat.value, statsX + 35, statsY, { align: 'right' });
    statsY += 10;
  });

  // Footer
  setColor(COLORS.textDim);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text('© 2026 Accenture. Compass Intelligence Platform. Powered by AlphaSense.', M, H - 12);

  // Purple bottom bar
  setFill(COLORS.primary);
  doc.rect(0, H - 3, W, 3, 'F');

  // ══════════════════════════════════════
  // PAGE 2+: EXECUTIVE SYNTHESIS
  // ══════════════════════════════════════
  if (synthesis) {
    addPage();
    setColor(COLORS.primary);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.text('EXECUTIVE SYNTHESIS', M, y);
    y += 8;

    setColor('#cccccc');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const synthLines = wrapText(synthesis, CW - 10, 10);
    const synthStart = y;
    synthLines.forEach(line => {
      checkPage(6);
      doc.text(line, M + 6, y);
      y += 5;
    });
    // Draw the left bar
    setFill(COLORS.primary);
    doc.rect(M, synthStart - 1, 1.5, y - synthStart + 2, 'F');
    y += 10;
  }

  // ══════════════════════════════════════
  // FINDINGS SECTION GENERATOR
  // ══════════════════════════════════════
  const renderFindings = (
    title: string,
    tag: string,
    items: { t: string; d: string; ic?: string; source?: any; severity?: string; timeline?: string; affected_companies?: any[]; key_metrics?: any[] }[], // eslint-disable-line @typescript-eslint/no-explicit-any
    accent: string,
  ) => {
    addPage();

    // Section header
    setFill(accent);
    doc.rect(M, y, 40, 0.8, 'F');
    y += 5;
    setColor(accent);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.text(tag.toUpperCase(), M, y);
    y += 5;
    setColor(COLORS.text);
    doc.setFontSize(22);
    doc.text(title, M, y);
    y += 4;

    // Divider
    setDraw(COLORS.text);
    doc.setLineWidth(0.5);
    doc.line(M, y, W - M, y);
    y += 8;

    items.forEach((item, idx) => {
      checkPage(40);

      // Number
      setColor('#1a1a1a');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(28);
      doc.text(String(idx + 1).padStart(2, '0'), M, y + 8);

      // Title
      const titleX = M + 14;
      setColor(COLORS.text);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      const titleLines = wrapText(item.t, CW - 14, 11);
      titleLines.forEach(line => { doc.text(line, titleX, y); y += 5; });

      // Badges
      y += 1;
      let bx = titleX;
      if (item.severity) {
        const sc = item.severity === 'high' ? COLORS.red : COLORS.amber;
        setFill(sc);
        doc.rect(bx, y - 2.5, doc.getTextWidth(item.severity.toUpperCase()) + 4, 3.5, 'F');
        setColor(COLORS.text);
        doc.setFontSize(5);
        doc.setFont('helvetica', 'bold');
        doc.text(item.severity.toUpperCase(), bx + 2, y);
        bx += doc.getTextWidth(item.severity.toUpperCase()) + 8;
      }
      if (item.timeline) {
        setColor(COLORS.textDim);
        doc.setFontSize(5);
        doc.setFont('helvetica', 'normal');
        doc.text(item.timeline, bx, y);
      }
      y += 5;

      // Description
      setColor(COLORS.textMuted);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const descLines = wrapText(item.d, CW - 14, 8);
      descLines.slice(0, 8).forEach(line => {
        checkPage(5);
        doc.text(line, titleX, y);
        y += 3.8;
      });

      // Companies affected
      if (item.affected_companies && item.affected_companies.length > 0) {
        y += 2;
        checkPage(10);
        setColor(COLORS.textDim);
        doc.setFontSize(5);
        doc.setFont('helvetica', 'bold');
        doc.text('COMPANIES AFFECTED', titleX, y);
        y += 3;
        item.affected_companies.slice(0, 3).forEach(co => {
          checkPage(4);
          const arrow = co.impact === 'positive' ? '▲' : co.impact === 'negative' ? '▼' : '►';
          const arrowColor = co.impact === 'positive' ? COLORS.emerald : co.impact === 'negative' ? COLORS.red : COLORS.amber;
          setColor(arrowColor);
          doc.setFontSize(5);
          doc.text(arrow, titleX, y);
          setColor(COLORS.textMuted);
          doc.setFont('helvetica', 'normal');
          doc.text(`${co.name} — ${co.detail.substring(0, 60)}${co.detail.length > 60 ? '...' : ''}`, titleX + 5, y);
          y += 3.5;
        });
      }

      // Source
      if (item.source?.document_title) {
        y += 1;
        checkPage(5);
        setColor(COLORS.textDim);
        doc.setFontSize(5);
        doc.setFont('helvetica', 'italic');
        doc.text(`Source: ${item.source.document_title}${item.source.organization ? ' — ' + item.source.organization : ''}${item.source.date ? ' · ' + item.source.date : ''}`, titleX, y);
      }

      y += 10;

      // Separator
      if (idx < items.length - 1) {
        setDraw('#1a1a1a');
        doc.setLineWidth(0.1);
        doc.line(M, y - 4, W - M, y - 4);
      }
    });
  };

  // ══════════════════════════════════════
  // RENDER ALL SECTIONS
  // ══════════════════════════════════════
  if (trends.length > 0) renderFindings('Emerging Trends', 'Emerging Signals', trends, COLORS.primary);
  if (opps.length > 0) renderFindings('Strategic Opportunities', 'Growth Vectors', opps, COLORS.emerald);
  if (challenges.length > 0) renderFindings('Key Challenges', 'Risk Landscape', challenges, COLORS.red);

  // ══════════════════════════════════════
  // FINANCIAL HIGHLIGHTS PAGE
  // ══════════════════════════════════════
  if (financials.length > 0) {
    addPage();
    setColor(COLORS.amber);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.text('KEY METRICS', M, y);
    y += 5;
    setColor(COLORS.text);
    doc.setFontSize(22);
    doc.text('Financial Highlights', M, y);
    y += 4;
    setDraw(COLORS.text);
    doc.setLineWidth(0.5);
    doc.line(M, y, W - M, y);
    y += 10;

    const colW = (CW - 8) / 3;
    financials.forEach((fin, idx) => {
      const col = idx % 3;
      const x = M + col * (colW + 4);
      if (col === 0 && idx > 0) y += 20;
      checkPage(20);
      const fy = y;

      setColor(COLORS.textDim);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5);
      doc.text(fin.metric.toUpperCase().substring(0, 25), x, fy);

      setColor(COLORS.text);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(fin.current_value, x, fy + 7);

      if (fin.change) {
        const changeColor = fin.change.startsWith('-') ? COLORS.red : COLORS.emerald;
        setColor(changeColor);
        doc.setFontSize(7);
        doc.text(fin.change, x + doc.getTextWidth(fin.current_value) + 3, fy + 7);
      }
    });
    y += 25;
  }

  // ══════════════════════════════════════
  // NEWS & SOURCES PAGE
  // ══════════════════════════════════════
  if (news.length > 0) {
    addPage();
    setColor(COLORS.blue);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.text('NEWS & SOURCES', M, y);
    y += 5;
    setColor(COLORS.text);
    doc.setFontSize(22);
    doc.text('Source Intelligence', M, y);
    y += 4;
    setDraw(COLORS.text);
    doc.setLineWidth(0.5);
    doc.line(M, y, W - M, y);
    y += 8;

    news.slice(0, 15).forEach((n, idx) => {
      checkPage(16);
      setColor('#1a1a1a');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(String(idx + 1).padStart(2, '0'), M, y + 3);

      setColor(COLORS.text);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      const headLines = wrapText(n.headline, CW - 14, 9);
      headLines.slice(0, 2).forEach(line => { doc.text(line, M + 14, y); y += 4; });

      setColor(COLORS.textDim);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5);
      const meta = [n.type, n.source_org, n.date].filter(Boolean).join(' · ');
      doc.text(meta, M + 14, y);
      y += 2;

      if (n.summary && n.summary !== n.headline) {
        y += 1;
        setColor(COLORS.textMuted);
        doc.setFontSize(6.5);
        const sumLines = wrapText(n.summary, CW - 14, 6.5);
        sumLines.slice(0, 2).forEach(line => { doc.text(line, M + 14, y); y += 3; });
      }
      y += 6;
    });
  }

  // ══════════════════════════════════════
  // BACK COVER
  // ══════════════════════════════════════
  addPage();
  const bcY = H / 2 - 20;

  setColor(COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('ACCSENSE MAGAZINE', W / 2, bcY, { align: 'center' });

  setColor(COLORS.text);
  doc.setFontSize(28);
  doc.text(country.toUpperCase(), W / 2, bcY + 15, { align: 'center' });

  setColor(COLORS.textDim);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Strategic Intelligence Report', W / 2, bcY + 22, { align: 'center' });
  doc.text(`${date}  ·  ${total} Findings  ·  AlphaSense Deep Research`, W / 2, bcY + 28, { align: 'center' });

  setFill(COLORS.primary);
  doc.rect(W / 2 - 20, bcY + 35, 40, 0.8, 'F');

  setColor(COLORS.textDim);
  doc.setFontSize(6);
  doc.text('© 2026 Accenture. Compass Intelligence Platform.', W / 2, H - 20, { align: 'center' });

  setFill(COLORS.primary);
  doc.rect(0, H - 3, W, 3, 'F');

  // ── Save ──
  const slug = country.toLowerCase().replace(/\s+/g, '-');
  const indSlug = industry && industry !== 'All Industries' ? `-${industry.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : '';
  doc.save(`AccSense-${slug}${indSlug}-${date}.pdf`);
}
