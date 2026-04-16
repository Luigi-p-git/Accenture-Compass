/**
 * AccSense Intelligence Presentation Generator
 * Accenture brand: Graphik font, purple-forward palette, clean layouts
 * Supports light and dark themes
 */

import PptxGenJS from 'pptxgenjs';
import type { TrendsData, TopCompany } from '@/types';

// ── Theme Palettes — Accenture brand-aligned ────────────────────
interface Palette {
  bg: string; bgAlt: string; text: string; textMid: string; textDim: string;
  rule: string; cardBg: string; purple: string; purpleD: string; purpleLight: string;
  emerald: string; red: string; amber: string; white: string;
  coverBg: string; coverBg2: string; coverText: string; wmColor: string;
  closeBg: string; closeText: string; closeMid: string;
}

const LIGHT: Palette = {
  bg: 'FFFFFF', bgAlt: 'FAFAFA', text: '1A1A1A', textMid: '555555', textDim: '999999',
  rule: 'E8E8E8', cardBg: 'F5F5F7',
  purple: 'A100FF', purpleD: '7B00BF', purpleLight: 'E8D5F5', emerald: '2EA67A', red: 'D93025', amber: 'E8A317', white: 'FFFFFF',
  coverBg: 'A100FF', coverBg2: '7B00BF', coverText: 'FFFFFF', wmColor: '8C00E0',
  closeBg: '1A1A1A', closeText: 'FFFFFF', closeMid: '777777',
};

const DARK: Palette = {
  bg: '0C0C0C', bgAlt: '141414', text: 'ECECEC', textMid: '8A8A8A', textDim: '555555',
  rule: '252525', cardBg: '181818',
  purple: 'A100FF', purpleD: '7B00BF', purpleLight: '2A1540', emerald: '2EA67A', red: 'D93025', amber: 'E8A317', white: 'FFFFFF',
  coverBg: '0C0C0C', coverBg2: '111111', coverText: 'FFFFFF', wmColor: '1A1A1A',
  closeBg: '0C0C0C', closeText: 'ECECEC', closeMid: '555555',
};

// Graphik is Accenture's brand font — falls back to Calibri if not installed
const FONT = 'Graphik';
const FONT_MED = 'Graphik Medium';
const FONT_LIGHT = 'Graphik';  // pptxgenjs doesn't support font weights, we use bold/italic flags

const W = 13.33;
const H = 7.5;
const MX = 0.7;
const MY = 0.5;
const CW = W - MX * 2;

function sevHex(s: string, p: Palette) { return s === 'critical' ? p.red : s === 'high' ? 'E05555' : s === 'medium' ? p.amber : '7B8794'; }
function trunc(s: string, max: number) { if (!s || s.length <= max) return s || ''; return s.substring(0, max - 1) + '…'; }

function addFooter(slide: PptxGenJS.Slide, pg: number, total: number, p: Palette) {
  slide.addShape('rect', { x: MX, y: H - 0.42, w: CW, h: 0.012, fill: { color: p.purple } });
  slide.addText('AccSense Intelligence', { x: MX, y: H - 0.38, w: 3, h: 0.28, fontSize: 7, fontFace: FONT, color: p.textDim, bold: true, charSpacing: 1 });
  slide.addText(`${pg} / ${total}`, { x: W - MX - 1.5, y: H - 0.38, w: 1.5, h: 0.28, fontSize: 7, fontFace: FONT, color: p.textDim, align: 'right' });
}

function addBg(slide: PptxGenJS.Slide, p: Palette) { slide.addShape('rect', { x: 0, y: 0, w: W, h: H, fill: { color: p.bg } }); }

// Section dividers — always purple accent, clean
function addDivider(pres: PptxGenJS, title: string, subtitle: string, pg: number, total: number, p: Palette) {
  const slide = pres.addSlide();
  addBg(slide, p);
  slide.addShape('rect', { x: 0, y: 0, w: 0.1, h: H, fill: { color: p.purple } });
  slide.addText(title, { x: MX + 0.2, y: H * 0.35, w: CW - 0.2, h: 1, fontSize: 36, fontFace: FONT, color: p.text, bold: true });
  slide.addText(subtitle, { x: MX + 0.2, y: H * 0.35 + 0.85, w: CW - 0.2, h: 0.5, fontSize: 13, fontFace: FONT, color: p.textMid });
  slide.addShape('rect', { x: MX + 0.2, y: H * 0.35 + 1.45, w: 1.2, h: 0.035, fill: { color: p.purple } });
  addFooter(slide, pg, total, p);
}

// ══════════════════════════════════════════════════════════════════
export function generateIntelligencePresentation(data: TrendsData, country: string, industry: string, theme: 'dark' | 'light' = 'light') {
  const p = theme === 'dark' ? DARK : LIGHT;
  const pres = new PptxGenJS();
  pres.layout = 'LAYOUT_WIDE';
  pres.author = 'AccSense Intelligence';
  pres.company = 'Accenture';
  pres.subject = `${country} ${industry} Intelligence Report`;
  pres.title = `AccSense — ${country} ${industry}`;

  const trends = data.trends || [];
  const opps = data.opportunities || [];
  const sevOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const challenges = [...(data.challenges || [])].sort((a, b) => (sevOrder[a.severity] ?? 9) - (sevOrder[b.severity] ?? 9));
  const news = data.news_items || [];
  const financials = data.financial_highlights || [];
  const companies = data.top_companies || [];
  const total = trends.length + opps.length + challenges.length;
  const date = data.source?.date_generated || new Date().toISOString().split('T')[0];

  // Collect all sources for appendix
  const allSources: { title: string; org: string; url: string; date: string }[] = [];
  const addSource = (s: { document_title?: string | null; organization?: string | null; url?: string | null; date?: string | null } | undefined) => {
    if (!s?.document_title) return;
    const url = s.url && s.url.startsWith('http') ? s.url : '';
    if (!allSources.find(x => x.title === s.document_title)) {
      allSources.push({ title: s.document_title || '', org: s.organization || '', url, date: s.date || '' });
    }
  };
  trends.forEach(t => addSource(t.source));
  opps.forEach(o => addSource(o.source));
  challenges.forEach(c => addSource(c.source));

  const totalPages = 3 + // cover + exec + metrics
    (trends.length > 0 ? 2 : 0) +
    (opps.length > 0 ? 2 : 0) +
    (challenges.length > 0 ? 2 : 0) +
    (companies.length > 0 ? 1 + Math.ceil(companies.length / 2) : 0) +
    (news.length > 0 ? 1 + Math.ceil(news.length / 4) : 0) +
    Math.ceil(allSources.length / 12) + // appendix
    1; // closing

  let pg = 0;

  // ═══ COVER ═══
  {
    pg++;
    const slide = pres.addSlide();
    if (theme === 'dark') {
      slide.addShape('rect', { x: 0, y: 0, w: W, h: H, fill: { color: p.coverBg } });
      slide.addShape('rect', { x: 0, y: 0, w: 0.12, h: H, fill: { color: p.purple } });
      slide.addShape('rect', { x: 0, y: H * 0.6, w: W, h: H * 0.4, fill: { color: p.coverBg2 } });
      // Purple chevron watermark
      slide.addText('>', { x: W - 4.5, y: -0.3, w: 4.5, h: 5, fontSize: 280, fontFace: FONT, color: p.purple, bold: true, transparency: 85 });
    } else {
      slide.addShape('rect', { x: 0, y: 0, w: W, h: H, fill: { color: p.coverBg } });
      slide.addShape('rect', { x: 0, y: H * 0.6, w: W, h: H * 0.4, fill: { color: p.coverBg2 } });
      slide.addText('>', { x: W - 4.5, y: -0.3, w: 4.5, h: 5, fontSize: 280, fontFace: FONT, color: p.wmColor, bold: true, transparency: 50 });
    }
    slide.addText('ACCSENSE INTELLIGENCE', { x: MX, y: 0.9, w: CW, h: 0.4, fontSize: 10, fontFace: FONT, color: p.coverText, bold: true, charSpacing: 5 });
    slide.addText(`THE ${country.toUpperCase()}\nOUTLOOK`, { x: MX, y: 1.6, w: CW * 0.65, h: 2.2, fontSize: 44, fontFace: FONT, color: p.coverText, bold: true, lineSpacingMultiple: 0.9 });
    slide.addText(industry || 'All Industries', { x: MX, y: 3.9, w: CW, h: 0.5, fontSize: 16, fontFace: FONT, color: p.coverText, transparency: 25 });
    slide.addShape('rect', { x: MX, y: 4.6, w: 1.8, h: 0.025, fill: { color: p.coverText } });
    slide.addText(`${total} Findings  •  ${companies.length} Companies  •  ${news.length} Sources`, { x: MX, y: 4.85, w: CW, h: 0.35, fontSize: 10, fontFace: FONT, color: p.coverText, transparency: 35 });
    slide.addText(date, { x: MX, y: 5.25, w: CW, h: 0.25, fontSize: 9, fontFace: FONT, color: p.coverText, transparency: 45 });
    slide.addText('Accenture', { x: W - MX - 2, y: H - 0.55, w: 2, h: 0.35, fontSize: 10, fontFace: FONT, color: p.coverText, align: 'right', transparency: 45, bold: true });
  }

  // ═══ EXECUTIVE SUMMARY ═══
  if (data.synthesis) {
    pg++;
    const slide = pres.addSlide();
    addBg(slide, p);
    slide.addShape('rect', { x: 0, y: 0, w: 0.08, h: H, fill: { color: p.purple } });
    slide.addText('EXECUTIVE SUMMARY', { x: MX, y: MY, w: CW, h: 0.3, fontSize: 9, fontFace: FONT, color: p.purple, bold: true, charSpacing: 3 });
    slide.addText('Strategic Intelligence Overview', { x: MX, y: MY + 0.35, w: CW, h: 0.5, fontSize: 22, fontFace: FONT, color: p.text, bold: true });
    slide.addShape('rect', { x: MX, y: MY + 1.0, w: 0.03, h: 2.2, fill: { color: p.purple } });
    const safeSyn = data.synthesis.replace(/U\.S\./g, 'U·S·').replace(/e\.g\./g, 'e·g·');
    const sentences = safeSyn.split(/(?<=[.!?])\s+(?=[A-Z])/).map(s => s.replace(/·/g, '.'));
    // Limit to 5 sentences max to avoid overflow
    const synText = sentences.slice(0, 5).map(s => `→  ${s.trim()}`).join('\n\n');
    slide.addText(synText, { x: MX + 0.18, y: MY + 1.0, w: CW * 0.55, h: 4.2, fontSize: 9, fontFace: FONT, color: p.textMid, lineSpacingMultiple: 1.3, valign: 'top', paraSpaceAfter: 4 });
    // Key signals column — offset right with enough room
    const sX = MX + CW * 0.6;
    const sW = CW * 0.38;
    slide.addText('KEY SIGNALS', { x: sX, y: MY + 1.0, w: sW, h: 0.25, fontSize: 8, fontFace: FONT, color: p.textDim, bold: true, charSpacing: 2 });
    const signals: { label: string; text: string; color: string }[] = [];
    const crit = challenges.find(c => c.severity === 'critical');
    if (crit) signals.push({ label: 'CRITICAL RISK', text: crit.t, color: p.red });
    if (opps.length) signals.push({ label: 'TOP OPPORTUNITY', text: opps[0].t, color: p.emerald });
    if (trends.length) signals.push({ label: 'LEADING TREND', text: trends[0].t, color: p.purple });
    signals.forEach((sig, i) => {
      const sy = MY + 1.5 + i * 1.05;
      slide.addShape('rect', { x: sX, y: sy, w: 0.07, h: 0.07, fill: { color: sig.color } });
      slide.addText(sig.label, { x: sX + 0.13, y: sy - 0.03, w: sW - 0.13, h: 0.18, fontSize: 7, fontFace: FONT, color: sig.color, bold: true, charSpacing: 1 });
      slide.addText(trunc(sig.text, 75), { x: sX, y: sy + 0.18, w: sW, h: 0.55, fontSize: 9, fontFace: FONT, color: p.text, bold: true, lineSpacingMultiple: 1.2 });
    });
    // Counts
    const yC = MY + 4.8;
    slide.addShape('rect', { x: sX, y: yC - 0.1, w: sW, h: 0.012, fill: { color: p.rule } });
    [{ n: trends.length, l: 'Trends' }, { n: opps.length, l: 'Opportunities' }, { n: challenges.length, l: 'Risks' }].forEach((ct, i) => {
      const cx = sX + i * (sW / 3);
      slide.addText(String(ct.n), { x: cx, y: yC, w: sW / 3, h: 0.3, fontSize: 20, fontFace: FONT, color: p.purple, bold: true, align: 'center' });
      slide.addText(ct.l, { x: cx, y: yC + 0.28, w: sW / 3, h: 0.18, fontSize: 6, fontFace: FONT, color: p.textDim, align: 'center' });
    });
    addFooter(slide, pg, totalPages, p);
  }

  // ═══ KEY METRICS ═══
  if (financials.length > 0) {
    pg++;
    const slide = pres.addSlide();
    addBg(slide, p);
    slide.addShape('rect', { x: 0, y: 0, w: 0.08, h: H, fill: { color: p.purple } });
    slide.addText('KEY METRICS', { x: MX, y: MY, w: CW, h: 0.3, fontSize: 9, fontFace: FONT, color: p.purple, bold: true, charSpacing: 3 });
    slide.addText('Financial & Market Indicators', { x: MX, y: MY + 0.3, w: CW, h: 0.4, fontSize: 20, fontFace: FONT, color: p.text, bold: true });
    const cols = 4;
    const cardW = (CW - (cols - 1) * 0.18) / cols;
    const cardH = 1.3;
    financials.slice(0, 12).forEach((f, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = MX + col * (cardW + 0.18);
      const cy = MY + 0.95 + row * (cardH + 0.12);
      slide.addShape('rect', { x: cx, y: cy, w: cardW, h: cardH, fill: { color: p.cardBg }, rectRadius: 0.04 });
      slide.addShape('rect', { x: cx, y: cy, w: cardW, h: 0.025, fill: { color: p.purple } });
      slide.addText(trunc(f.metric, 32), { x: cx + 0.1, y: cy + 0.08, w: cardW - 0.2, h: 0.32, fontSize: 7.5, fontFace: FONT, color: p.textMid, bold: true });
      slide.addText(f.current_value, { x: cx + 0.1, y: cy + 0.4, w: cardW - 0.2, h: 0.42, fontSize: 19, fontFace: FONT, color: p.text, bold: true });
      if (f.change) {
        const neg = f.change.startsWith('-');
        slide.addText(f.change, { x: cx + 0.1, y: cy + 0.85, w: cardW - 0.2, h: 0.22, fontSize: 9, fontFace: FONT, color: neg ? p.red : p.emerald, bold: true });
      }
    });
    addFooter(slide, pg, totalPages, p);
  }

  // ═══ Helper: render a list of findings across multiple slides if needed ═══
  function addFindingSlides(
    label: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items: any[],
    getTitle: (item: any) => string,
    getMeta: (item: any) => string,
    getDesc: (item: any) => string,
    getBadge?: (item: any) => { text: string; color: string } | null,
  ) {
    const perSlide = 5;
    for (let batch = 0; batch < items.length; batch += perSlide) {
      pg++;
      const slide = pres.addSlide();
      addBg(slide, p);
      slide.addShape('rect', { x: 0, y: 0, w: 0.06, h: H, fill: { color: p.purple } });
      slide.addText(label, { x: MX, y: MY, w: CW, h: 0.25, fontSize: 8, fontFace: FONT, color: p.purple, bold: true, charSpacing: 3 });
      const chunk = items.slice(batch, batch + perSlide);
      const rowH = (H - MY - 0.9) / perSlide;
      chunk.forEach((item, i) => {
        const globalIdx = batch + i;
        const y = MY + 0.38 + i * rowH;
        const badge = getBadge?.(item);
        const numText = String(globalIdx + 1).padStart(2, '0');
        const titleText = getTitle(item);
        const metaText = getMeta(item);
        const descText = getDesc(item);
        const leftX = MX;
        const contentX = badge ? MX + 0.65 : MX;
        const contentW = badge ? CW - 0.65 : CW;

        // Severity badge (challenges only)
        if (badge) {
          const bw = badge.text.length * 0.065 + 0.2;
          slide.addShape('roundRect', { x: leftX, y: y + 0.04, w: bw, h: 0.15, fill: { color: badge.color }, rectRadius: 0.015 });
          slide.addText(badge.text, { x: leftX, y: y + 0.04, w: bw, h: 0.15, fontSize: 5.5, fontFace: FONT, color: p.white, bold: true, align: 'center' });
        }

        // Number + Title as rich text in one box — prevents clipping
        slide.addText([
          { text: `${numText}  `, options: { fontSize: 11, fontFace: FONT, color: p.purple, bold: true } },
          { text: titleText, options: { fontSize: 11, fontFace: FONT, color: p.text, bold: true } },
        ], { x: contentX, y, w: contentW, h: 0.22 });

        // Meta (tag / timeline)
        if (metaText) slide.addText(metaText, { x: contentX, y: y + 0.22, w: contentW, h: 0.14, fontSize: 6, fontFace: FONT, color: p.purple, bold: true, charSpacing: 1 });

        // Description
        slide.addText(trunc(descText, 320), { x: contentX, y: y + 0.38, w: contentW, h: rowH - 0.5, fontSize: 8, fontFace: FONT, color: p.textMid, lineSpacingMultiple: 1.35, valign: 'top' });

        // Divider
        if (i < chunk.length - 1) slide.addShape('rect', { x: contentX, y: y + rowH - 0.08, w: contentW, h: 0.004, fill: { color: p.rule } });
      });
      addFooter(slide, pg, totalPages, p);
    }
  }

  // ═══ EMERGING TRENDS ═══
  if (trends.length > 0) {
    pg++;
    addDivider(pres, 'Emerging Trends', `${trends.length} directional signals identified`, pg, totalPages, p);
    addFindingSlides('EMERGING TRENDS', trends, t => t.t, t => t.tag?.toUpperCase() || '', t => t.d);
  }

  // ═══ STRATEGIC OPPORTUNITIES ═══
  if (opps.length > 0) {
    pg++;
    addDivider(pres, 'Strategic Opportunities', `${opps.length} growth vectors identified`, pg, totalPages, p);
    addFindingSlides('STRATEGIC OPPORTUNITIES', opps, o => o.t, o => [o.timeline, o.p].filter(Boolean).join('  •  '), o => o.d);
  }

  // ═══ KEY CHALLENGES ═══
  if (challenges.length > 0) {
    pg++;
    addDivider(pres, 'Key Challenges', `${challenges.length} risks ranked by severity`, pg, totalPages, p);
    addFindingSlides('KEY CHALLENGES', challenges, c => c.t, () => '', c => c.d, c => ({ text: c.severity.toUpperCase(), color: sevHex(c.severity, p) }));
  }

  // ═══ COMPANY PROFILES (2 per slide) — with full finding titles ═══
  if (companies.length > 0) {
    pg++;
    addDivider(pres, 'Companies Intelligence', `Top ${companies.length} companies analyzed`, pg, totalPages, p);
    for (let ci = 0; ci < companies.length; ci += 2) {
      pg++;
      const slide = pres.addSlide();
      addBg(slide, p);
      slide.addShape('rect', { x: 0, y: 0, w: 0.08, h: H, fill: { color: p.purple } });
      slide.addText('COMPANIES INTELLIGENCE', { x: MX, y: MY, w: CW, h: 0.28, fontSize: 9, fontFace: FONT, color: p.purple, bold: true, charSpacing: 3 });
      const pair = companies.slice(ci, ci + 2);
      pair.forEach((co: TopCompany, pi: number) => {
        const colX = MX + pi * (CW / 2 + 0.1);
        const colW = CW / 2 - 0.1;
        let y = MY + 0.5;
        // Name + meta
        slide.addText(co.name, { x: colX, y, w: colW, h: 0.35, fontSize: 15, fontFace: FONT, color: p.text, bold: true });
        y += 0.33;
        slide.addText([co.ticker, co.sector, co.hq].filter(Boolean).join('  •  '), { x: colX, y, w: colW, h: 0.18, fontSize: 7.5, fontFace: FONT, color: p.textMid });
        y += 0.28;
        // Revenue
        if (co.revenue) {
          slide.addText(co.revenue, { x: colX, y, w: colW, h: 0.4, fontSize: 24, fontFace: FONT, color: p.purple, bold: true });
          y += 0.38;
          slide.addText('ANNUAL REVENUE', { x: colX, y, w: colW, h: 0.15, fontSize: 6, fontFace: FONT, color: p.textDim, charSpacing: 1 });
          y += 0.22;
        }
        slide.addShape('rect', { x: colX, y, w: colW * 0.25, h: 0.018, fill: { color: p.purple } });
        y += 0.15;
        // Key initiatives
        slide.addText('KEY INITIATIVES', { x: colX, y, w: colW, h: 0.15, fontSize: 6.5, fontFace: FONT, color: p.purple, bold: true, charSpacing: 1 });
        y += 0.18;
        co.key_initiatives.slice(0, 2).forEach(init => {
          slide.addText(`→  ${init.replace(/\s*\[\d+\]\s*/g, ' ').trim()}`, { x: colX, y, w: colW, h: 0.3, fontSize: 7.5, fontFace: FONT, color: p.textMid, lineSpacingMultiple: 1.2, valign: 'top' });
          y += 0.28;
        });
        y += 0.08;
        // Linked findings — actual titles, not just counts
        const lf = co.linked_findings;
        const sections: { label: string; items: string[] }[] = [];
        if (lf.trends.length) sections.push({ label: 'LINKED TRENDS', items: lf.trends.map(idx => trends[idx]?.t).filter(Boolean) });
        if (lf.opportunities.length) sections.push({ label: 'LINKED OPPORTUNITIES', items: lf.opportunities.map(idx => opps[idx]?.t).filter(Boolean) });
        if (lf.challenges.length) sections.push({ label: 'LINKED RISKS', items: lf.challenges.map(idx => challenges[idx]?.t).filter(Boolean) });
        sections.forEach(sec => {
          if (y > H - 1) return;
          slide.addText(sec.label, { x: colX, y, w: colW, h: 0.14, fontSize: 6, fontFace: FONT, color: p.purple, bold: true, charSpacing: 0.5 });
          y += 0.16;
          sec.items.slice(0, 3).forEach(title => {
            if (y > H - 0.7) return;
            slide.addText(`•  ${trunc(title, 55)}`, { x: colX + 0.05, y, w: colW - 0.05, h: 0.2, fontSize: 7, fontFace: FONT, color: p.textMid, valign: 'top' });
            y += 0.18;
          });
          y += 0.06;
        });
        // Separator
        if (pi === 0 && pair.length > 1) slide.addShape('rect', { x: colX + colW + 0.05, y: MY + 0.5, w: 0.006, h: 5.5, fill: { color: p.rule } });
      });
      addFooter(slide, pg, totalPages, p);
    }
  }

  // ═══ NEWS & ANALYST VIEWS (4 per slide) ═══
  if (news.length > 0) {
    pg++;
    addDivider(pres, 'News & Analyst Views', `${news.length} source articles`, pg, totalPages, p);
    for (let ni = 0; ni < news.length; ni += 4) {
      pg++;
      const slide = pres.addSlide();
      addBg(slide, p);
      slide.addShape('rect', { x: 0, y: 0, w: 0.08, h: H, fill: { color: p.purple } });
      slide.addText('NEWS & ANALYST VIEWS', { x: MX, y: MY, w: CW, h: 0.28, fontSize: 9, fontFace: FONT, color: p.purple, bold: true, charSpacing: 3 });
      news.slice(ni, ni + 4).forEach((n, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const cx = MX + col * (CW / 2 + 0.1);
        const cy = MY + 0.5 + row * 2.9;
        const cardW = CW / 2 - 0.1;
        slide.addText(`${n.source_org || ''}  •  ${n.date || ''}`, { x: cx, y: cy, w: cardW, h: 0.18, fontSize: 6.5, fontFace: FONT, color: p.purple, bold: true, charSpacing: 0.5 });
        slide.addText(trunc(n.headline, 95), { x: cx, y: cy + 0.2, w: cardW, h: 0.45, fontSize: 10.5, fontFace: FONT, color: p.text, bold: true, lineSpacingMultiple: 1.15 });
        slide.addText(trunc(n.summary, 190), { x: cx, y: cy + 0.68, w: cardW, h: 0.9, fontSize: 8, fontFace: FONT, color: p.textMid, lineSpacingMultiple: 1.3, valign: 'top' });
        if (n.analyst_quote) {
          slide.addShape('rect', { x: cx, y: cy + 1.65, w: 0.025, h: 0.55, fill: { color: p.purple } });
          slide.addText(`"${trunc(n.analyst_quote, 140)}"`, { x: cx + 0.1, y: cy + 1.65, w: cardW - 0.1, h: 0.6, fontSize: 7.5, fontFace: FONT, color: p.textMid, italic: true, lineSpacingMultiple: 1.2, valign: 'top' });
        }
      });
      addFooter(slide, pg, totalPages, p);
    }
  }

  // ═══ APPENDIX — SOURCES & LINKS ═══
  if (allSources.length > 0) {
    const perPage = 14;
    for (let si = 0; si < allSources.length; si += perPage) {
      pg++;
      const slide = pres.addSlide();
      addBg(slide, p);
      slide.addShape('rect', { x: 0, y: 0, w: 0.08, h: H, fill: { color: p.purple } });
      slide.addText(si === 0 ? 'APPENDIX — SOURCES' : 'SOURCES (CONTINUED)', { x: MX, y: MY, w: CW, h: 0.28, fontSize: 9, fontFace: FONT, color: p.purple, bold: true, charSpacing: 3 });
      if (si === 0) slide.addText('All source documents referenced in this report', { x: MX, y: MY + 0.3, w: CW, h: 0.25, fontSize: 10, fontFace: FONT, color: p.textMid });
      const batch = allSources.slice(si, si + perPage);
      // Table header
      const tY = si === 0 ? MY + 0.7 : MY + 0.45;
      slide.addShape('rect', { x: MX, y: tY, w: CW, h: 0.3, fill: { color: p.cardBg } });
      slide.addText('Document Title', { x: MX + 0.1, y: tY, w: CW * 0.45, h: 0.3, fontSize: 7, fontFace: FONT, color: p.textDim, bold: true, charSpacing: 0.5 });
      slide.addText('Organization', { x: MX + CW * 0.47, y: tY, w: CW * 0.25, h: 0.3, fontSize: 7, fontFace: FONT, color: p.textDim, bold: true, charSpacing: 0.5 });
      slide.addText('Date', { x: MX + CW * 0.73, y: tY, w: CW * 0.12, h: 0.3, fontSize: 7, fontFace: FONT, color: p.textDim, bold: true, charSpacing: 0.5 });
      slide.addText('Link', { x: MX + CW * 0.86, y: tY, w: CW * 0.13, h: 0.3, fontSize: 7, fontFace: FONT, color: p.textDim, bold: true, charSpacing: 0.5 });
      batch.forEach((src, ri) => {
        const ry = tY + 0.32 + ri * 0.36;
        if (ry > H - 0.7) return;
        if (ri % 2 === 0) slide.addShape('rect', { x: MX, y: ry, w: CW, h: 0.36, fill: { color: p.bgAlt } });
        slide.addText(trunc(src.title, 55), { x: MX + 0.1, y: ry, w: CW * 0.45, h: 0.36, fontSize: 7.5, fontFace: FONT, color: p.text, valign: 'middle' });
        slide.addText(trunc(src.org, 28), { x: MX + CW * 0.47, y: ry, w: CW * 0.25, h: 0.36, fontSize: 7.5, fontFace: FONT, color: p.textMid, valign: 'middle' });
        slide.addText(src.date, { x: MX + CW * 0.73, y: ry, w: CW * 0.12, h: 0.36, fontSize: 7.5, fontFace: FONT, color: p.textMid, valign: 'middle' });
        if (src.url) {
          slide.addText([{ text: 'Open ↗', options: { hyperlink: { url: src.url }, color: p.purple, bold: true, fontSize: 7.5, fontFace: FONT } }], { x: MX + CW * 0.86, y: ry, w: CW * 0.13, h: 0.36, valign: 'middle' });
        } else {
          slide.addText('—', { x: MX + CW * 0.86, y: ry, w: CW * 0.13, h: 0.36, fontSize: 7.5, fontFace: FONT, color: p.textDim, valign: 'middle' });
        }
      });
      addFooter(slide, pg, totalPages, p);
    }
  }

  // ═══ CLOSING ═══
  {
    pg++;
    const slide = pres.addSlide();
    slide.addShape('rect', { x: 0, y: 0, w: W, h: H, fill: { color: p.closeBg } });
    slide.addShape('rect', { x: W * 0.35, y: H * 0.3, w: 0.035, h: 1.4, fill: { color: p.purple } });
    slide.addText('Thank you', { x: W * 0.38, y: H * 0.3, w: W * 0.5, h: 0.75, fontSize: 38, fontFace: FONT, color: p.closeText });
    slide.addText('AccSense Intelligence', { x: W * 0.38, y: H * 0.3 + 0.75, w: W * 0.5, h: 0.35, fontSize: 13, fontFace: FONT, color: p.purple, bold: true });
    slide.addText(`${country}  •  ${industry}  •  ${date}`, { x: W * 0.38, y: H * 0.3 + 1.2, w: W * 0.5, h: 0.25, fontSize: 9, fontFace: FONT, color: p.closeMid });
    slide.addText('Accenture', { x: W - MX - 2, y: H - 0.5, w: 2, h: 0.25, fontSize: 9, fontFace: FONT, color: p.closeMid, align: 'right', bold: true });
  }

  // ── Save ──
  const slug = country.toLowerCase().replace(/\s+/g, '-');
  const indSlug = industry.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const mode = theme === 'dark' ? 'dark' : 'light';
  pres.writeFile({ fileName: `AccSense-${slug}-${indSlug}-${date}-${mode}.pptx` });
}
