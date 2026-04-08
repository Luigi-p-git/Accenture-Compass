/**
 * Accenture Compass — PDF Report Generator
 * Generates branded Accenture-style intelligence reports
 */
import jsPDF from 'jspdf';

// Design tokens
const COLORS = {
  primary: '#8300ca',
  primaryLight: '#a600ff',
  dark: '#09090b',
  surface: '#18181b',
  text: '#fafafa',
  textMuted: '#a1a1aa',
  accent: '#a600ff',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
};

const FONT = 'helvetica';

interface ReportConfig {
  title: string;
  subtitle: string;
  country: string;
  period: string;
  sections: ReportSection[];
}

interface ReportSection {
  title: string;
  type: 'kpis' | 'table' | 'text' | 'ranking';
  data: Record<string, unknown>;
}

function addCoverPage(doc: jsPDF, config: ReportConfig) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  // Dark background
  doc.setFillColor(9, 9, 11);
  doc.rect(0, 0, w, h, 'F');

  // Purple accent bar
  doc.setFillColor(131, 0, 202);
  doc.rect(0, 0, 6, h, 'F');

  // Gradient circle (decorative)
  doc.setFillColor(131, 0, 202);
  doc.setGState(doc.GState({ opacity: 0.08 }));
  doc.circle(w - 50, 80, 120, 'F');
  doc.setGState(doc.GState({ opacity: 1 }));

  // Logo area
  doc.setFont(FONT, 'bold');
  doc.setFontSize(10);
  doc.setTextColor(131, 0, 202);
  doc.text('COMPASS', 24, 40);
  doc.setFontSize(7);
  doc.setTextColor(160, 160, 170);
  doc.text('ACCENTURE', 66, 40);

  // Main title
  doc.setFont(FONT, 'bold');
  doc.setFontSize(42);
  doc.setTextColor(250, 250, 250);
  doc.text(config.title, 24, h / 2 - 20);

  // Subtitle
  doc.setFont(FONT, 'normal');
  doc.setFontSize(16);
  doc.setTextColor(161, 161, 170);
  doc.text(config.subtitle, 24, h / 2 + 10);

  // Metadata bar at bottom
  doc.setFillColor(24, 24, 27);
  doc.rect(0, h - 60, w, 60, 'F');

  doc.setFont(FONT, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(131, 0, 202);
  const metadata = [
    { label: 'COUNTRY', value: config.country },
    { label: 'PERIOD', value: config.period },
    { label: 'GENERATED', value: new Date().toLocaleDateString() },
    { label: 'CLASSIFICATION', value: 'CONFIDENTIAL' },
  ];

  metadata.forEach((m, i) => {
    const x = 24 + i * 50;
    doc.setTextColor(120, 120, 130);
    doc.text(m.label, x, h - 38);
    doc.setTextColor(250, 250, 250);
    doc.setFontSize(9);
    doc.text(m.value, x, h - 26);
    doc.setFontSize(8);
  });
}

function addSectionHeader(doc: jsPDF, title: string, y: number): number {
  const w = doc.internal.pageSize.getWidth();

  // Purple line
  doc.setDrawColor(131, 0, 202);
  doc.setLineWidth(1.5);
  doc.line(20, y, 50, y);

  doc.setFont(FONT, 'bold');
  doc.setFontSize(18);
  doc.setTextColor(250, 250, 250);
  doc.text(title, 20, y + 16);

  return y + 30;
}

function addKPIGrid(doc: jsPDF, kpis: { label: string; value: string; change?: string }[], y: number): number {
  const w = doc.internal.pageSize.getWidth();
  const colWidth = (w - 48) / Math.min(kpis.length, 4);

  kpis.slice(0, 4).forEach((kpi, i) => {
    const x = 20 + i * colWidth;

    // Card background
    doc.setFillColor(24, 24, 27);
    doc.roundedRect(x, y, colWidth - 8, 40, 4, 4, 'F');

    // Label
    doc.setFont(FONT, 'bold');
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 130);
    doc.text(kpi.label.toUpperCase(), x + 8, y + 14);

    // Value
    doc.setFontSize(16);
    doc.setTextColor(250, 250, 250);
    doc.text(kpi.value, x + 8, y + 30);

    // Change
    if (kpi.change) {
      doc.setFontSize(7);
      if (kpi.change.startsWith('+')) {
        doc.setTextColor(16, 185, 129);
      } else {
        doc.setTextColor(239, 68, 68);
      }
      doc.text(kpi.change, x + colWidth - 28, y + 30);
    }
  });

  return y + 52;
}

function addTable(
  doc: jsPDF,
  headers: string[],
  rows: string[][],
  y: number
): number {
  const w = doc.internal.pageSize.getWidth();
  const colWidth = (w - 40) / headers.length;
  const rowHeight = 16;

  // Header row
  doc.setFillColor(24, 24, 27);
  doc.rect(20, y, w - 40, rowHeight, 'F');
  doc.setFont(FONT, 'bold');
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 130);
  headers.forEach((h, i) => {
    doc.text(h.toUpperCase(), 24 + i * colWidth, y + 10);
  });
  y += rowHeight;

  // Data rows
  doc.setFont(FONT, 'normal');
  doc.setFontSize(8);
  rows.forEach((row, ri) => {
    if (ri % 2 === 0) {
      doc.setFillColor(14, 14, 16);
      doc.rect(20, y, w - 40, rowHeight, 'F');
    }
    doc.setTextColor(200, 200, 210);
    row.forEach((cell, ci) => {
      doc.text(cell, 24 + ci * colWidth, y + 10);
    });
    y += rowHeight;
  });

  return y + 8;
}

function addPageBackground(doc: jsPDF) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  // Dark background
  doc.setFillColor(9, 9, 11);
  doc.rect(0, 0, w, h, 'F');

  // Purple accent line
  doc.setFillColor(131, 0, 202);
  doc.rect(0, 0, 3, h, 'F');

  // Page number
  doc.setFont(FONT, 'bold');
  doc.setFontSize(7);
  doc.setTextColor(80, 80, 90);
  const pageNum = doc.getCurrentPageInfo().pageNumber;
  doc.text(`COMPASS — ${pageNum.toString().padStart(2, '0')}`, w - 50, h - 12);
}

export function generateCompassReport(config: ReportConfig): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Cover page
  addCoverPage(doc, config);

  // Process sections
  config.sections.forEach((section) => {
    doc.addPage();
    addPageBackground(doc);

    let y = 30;
    y = addSectionHeader(doc, section.title, y);

    switch (section.type) {
      case 'kpis': {
        const kpis = section.data.kpis as { label: string; value: string; change?: string }[];
        y = addKPIGrid(doc, kpis, y);
        break;
      }
      case 'table': {
        const headers = section.data.headers as string[];
        const rows = section.data.rows as string[][];
        y = addTable(doc, headers, rows, y);
        break;
      }
      case 'text': {
        const content = section.data.content as string;
        doc.setFont(FONT, 'normal');
        doc.setFontSize(10);
        doc.setTextColor(180, 180, 190);
        const lines = doc.splitTextToSize(content, 160);
        doc.text(lines, 20, y);
        break;
      }
      case 'ranking': {
        const items = section.data.items as { rank: number; name: string; value: string; growth: string }[];
        items.forEach((item, i) => {
          if (i % 2 === 0) {
            doc.setFillColor(14, 14, 16);
            doc.rect(20, y - 4, 170, 18, 'F');
          }
          // Rank
          doc.setFont(FONT, 'bold');
          doc.setFontSize(14);
          doc.setTextColor(60, 60, 70);
          doc.text(String(item.rank).padStart(2, '0'), 24, y + 8);

          // Name
          doc.setFontSize(10);
          doc.setTextColor(250, 250, 250);
          doc.text(item.name, 42, y + 8);

          // Value
          doc.setFontSize(10);
          doc.text(item.value, 140, y + 8);

          // Growth
          doc.setFontSize(8);
          doc.setTextColor(16, 185, 129);
          doc.text(item.growth, 170, y + 8);

          y += 18;
        });
        break;
      }
    }
  });

  // Save
  doc.save(`Compass_${config.country}_${config.period.replace(/\s/g, '_')}.pdf`);
}

// Pre-built report templates
export function generateCanadaReport() {
  generateCompassReport({
    title: 'Canada',
    subtitle: 'Strategic Intelligence Report — Q4 2025',
    country: 'Canada',
    period: 'Q4 2025',
    sections: [
      {
        title: 'Executive Summary',
        type: 'kpis',
        data: {
          kpis: [
            { label: 'Accenture Headcount', value: '12,500', change: '+8.2%' },
            { label: 'Revenue (CAD)', value: '$1.8B', change: '+9.4%' },
            { label: 'Utilization', value: '87.2%', change: '+1.4%' },
            { label: 'Active Clients', value: '284', change: '+12' },
          ],
        },
      },
      {
        title: 'Industry Rankings',
        type: 'ranking',
        data: {
          items: [
            { rank: 1, name: 'Technology', value: '$520M', growth: '+14.2%' },
            { rank: 2, name: 'Financial Services', value: '$410M', growth: '+8.6%' },
            { rank: 3, name: 'Energy & Resources', value: '$320M', growth: '+6.1%' },
            { rank: 4, name: 'Public Services', value: '$280M', growth: '+11.8%' },
            { rank: 5, name: 'Health & Life Sciences', value: '$170M', growth: '+19.4%' },
            { rank: 6, name: 'Communications & Media', value: '$100M', growth: '+5.3%' },
          ],
        },
      },
      {
        title: 'Top Accounts',
        type: 'table',
        data: {
          headers: ['Rank', 'Account', 'Revenue', 'Growth'],
          rows: [
            ['01', 'Royal Bank of Canada', '$68M', '+12%'],
            ['02', 'Government of Canada', '$62M', '+18%'],
            ['03', 'TD Bank Group', '$54M', '+8%'],
            ['04', 'Shopify', '$48M', '+24%'],
            ['05', 'Suncor Energy', '$42M', '+6%'],
            ['06', 'Bell Canada', '$38M', '+10%'],
            ['07', 'Manulife Financial', '$35M', '+14%'],
            ['08', 'Province of Ontario', '$32M', '+22%'],
          ],
        },
      },
      {
        title: 'Talent Intelligence',
        type: 'kpis',
        data: {
          kpis: [
            { label: 'Total Headcount', value: '12,500', change: '+8.2%' },
            { label: 'Utilization Rate', value: '87.2%', change: '+1.4%' },
            { label: 'Attrition Rate', value: '12.1%', change: '-2.3%' },
            { label: 'Avg Tenure', value: '4.2 yr' },
          ],
        },
      },
      {
        title: 'Macroeconomic Landscape',
        type: 'text',
        data: {
          content: `Canada's economy shows resilient growth at +1.8% GDP with moderating inflation at 2.4%. The Bank of Canada has begun easing rates (currently 4.25%), which should stimulate investment in H2 2025. Key tailwinds include the AI Corridor expansion between Toronto and Montreal ($4.8B venture investment), the federal Green Energy Transition commitment ($120B in clean infrastructure), and accelerated Digital Government Modernization ($8.2B IT budget). Risks to monitor include the persistent housing affordability crisis affecting talent attraction in Toronto/Vancouver, potential US-Canada trade tensions, and ongoing tech sector rationalization. Strategic opportunities totaling $310M+ have been identified across AI advisory, federal cloud migration, energy transition consulting, and open banking implementation.`,
        },
      },
    ],
  });
}
