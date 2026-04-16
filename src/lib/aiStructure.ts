/**
 * AI Structuring — File-based Claude CLI approach
 *
 * Instead of piping huge text through stdin/stdout:
 * 1. Save input (PDF or text) to a temp file
 * 2. Spawn Claude with Read+Write tools
 * 3. Claude reads the input file, writes JSON to output file
 * 4. We read the output file
 *
 * No API key needed — routes through authenticated Claude CLI.
 */

import { spawn } from 'child_process';
import { writeFileSync, readFileSync, unlinkSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import type { AlphaSensePayload } from '@/types';

const TMP_DIR = join(process.cwd(), '.tmp');

function ensureTmpDir() {
  if (!existsSync(TMP_DIR)) mkdirSync(TMP_DIR, { recursive: true });
}

function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').trim();
}

function cleanup(...files: string[]) {
  for (const f of files) {
    try { unlinkSync(f); } catch { /* ignore */ }
  }
}

const SCHEMA = `{
  "trends": [{ "t": "title", "tag": "Technology|Market|Sustainability|Resources|Financial Services|Trade|Workforce|Health", "d": "full description", "ic": "material_icon_name (eco|account_balance|warning|psychology|cloud|show_chart|bolt|shield|trending_up|memory|school|bar_chart|directions_car|health_and_safety|home)", "source": { "document_title": str|null, "organization": str|null, "document_type": str|null, "date": str|null, "url": str|null, "headline": null }, "affected_companies": [{ "name": str, "ticker": str|null, "impact": "positive"|"negative"|"neutral", "detail": str }], "key_metrics": [] }],
  "opportunities": [{ "t": "title", "p": "market value", "timeline": "Near-term (0-12mo)|Medium-term (1-3yr)|Long-term (3-5yr+)", "d": "description", "ic": "icon", "priority": number_of_linked_companies, "source": {...}, "affected_companies": [...], "key_metrics": [] }],
  "challenges": [{ "t": "title", "d": "description", "severity": "critical|high|medium|low" (based on how many companies affected: 4+=critical, 3=high, 2=medium, 0-1=low), "ic": "icon", "source": {...}, "affected_companies": [...], "key_metrics": [] }],
  "synthesis": "3-5 sentence cross-cutting summary",
  "source": { "subject": "Country + Industry", "date_generated": "YYYY-MM-DD", "total_findings": number },
  "news_items": [{ "id": n, "headline": str, "summary": str, "source_org": str, "date": str|null, "type": str|null, "url": str|null, "related_finding_ids": [], "analyst_quote": "direct quote or omit", "companies_mentioned": ["company names from Top 10"], "sector": "sector name" }],
  "financial_highlights": [{ "id": n, "metric": str, "current_value": str, "previous_value": null, "change": str|null, "chart_type": "bar", "data_points": [] }],
  "top_companies": [{ "name": str, "ticker": str|null, "sector": str, "hq": str, "revenue": str, "key_initiatives": [str], "investment_focus": "2-3 sentences on investment priorities", "recent_moves": ["M&A or capex with dollar figures"], "logo_url": "https://www.google.com/s2/favicons?domain=REAL_DOMAIN&sz=128", "linked_findings": { "trends": [0-based indices], "opportunities": [0-based indices], "challenges": [0-based indices] } }]
}`;

function runClaudeWithTools(prompt: string, timeoutMs = 300_000): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`[AI-Structure] Spawning Claude with tools. Prompt: ${prompt.length} chars`);
    const startTime = Date.now();

    const proc = spawn('claude', [
      '-p',
      '--allowedTools', 'Read,Write,Bash',
      '--dangerously-skip-permissions',
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    });

    const timer = setTimeout(() => {
      console.log(`[AI-Structure] TIMEOUT after ${timeoutMs / 1000}s`);
      proc.kill();
      reject(new Error(`Claude CLI timed out after ${timeoutMs / 1000}s`));
    }, timeoutMs);

    let out = '';
    let err = '';

    proc.stdout.on('data', (d: Buffer) => { out += d.toString(); });
    proc.stderr.on('data', (d: Buffer) => { err += d.toString(); });

    proc.on('close', (code) => {
      clearTimeout(timer);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[AI-Structure] Done in ${elapsed}s. Code: ${code}, stdout: ${out.length} chars`);
      if (code !== 0) reject(new Error(`CLI exit ${code}: ${stripAnsi(err).slice(0, 500)}`));
      else resolve();
    });

    proc.on('error', (e) => {
      clearTimeout(timer);
      reject(new Error(`Failed to spawn Claude: ${e.message}`));
    });

    proc.stdin.write(prompt, 'utf8');
    proc.stdin.end();
  });
}

/**
 * Structure a PDF file into AlphaSensePayload JSON.
 * Claude reads the PDF directly — no text extraction needed.
 */
export async function structurePDFWithClaude(pdfBuffer: Buffer): Promise<AlphaSensePayload> {
  ensureTmpDir();
  const ts = Date.now();
  const inputPath = join(TMP_DIR, `input-${ts}.pdf`);
  const outputPath = join(TMP_DIR, `output-${ts}.json`);

  writeFileSync(inputPath, pdfBuffer);
  console.log(`[AI-Structure] PDF saved: ${inputPath} (${pdfBuffer.length} bytes)`);

  const prompt = `Read the PDF file at ${inputPath}. It is an AlphaSense intelligence report.

Extract ALL intelligence data from the PDF and write it as a single JSON file to ${outputPath}.

The JSON must match this exact schema:
${SCHEMA}

Rules:
- Extract EVERY finding from Emerging Trends, Strategic Opportunities, and Key Challenges sections
- Number findings in the order they appear
- For top_companies: use Google favicon URL with the company's REAL website domain
- linked_findings use 0-based indices into the trends/opportunities/challenges arrays
- severity is based on company count: 4+ companies = "critical", 3 = "high", 2 = "medium", 0-1 = "low"
- Extract analyst quotes, companies_mentioned, and sector from Broker Analysis articles
- Use EXACT same company names in affected_companies as in top_companies
- Impact: POSITIVE = revenue/margins up, well-positioned; NEGATIVE = cost/risk/disruption; NEUTRAL = uncertain
- Write ONLY the JSON file — no other output needed`;

  try {
    await runClaudeWithTools(prompt);

    if (!existsSync(outputPath)) {
      throw new Error('Claude did not write the output JSON file');
    }

    const raw = readFileSync(outputPath, 'utf8');
    const payload = JSON.parse(raw);
    ensurePayloadFields(payload);
    return payload;
  } finally {
    cleanup(inputPath, outputPath);
  }
}

/**
 * Structure raw pasted text into AlphaSensePayload JSON.
 * Saves text to a file so Claude reads it (avoids stdin buffer issues).
 */
export async function structureTextWithClaude(rawText: string): Promise<AlphaSensePayload> {
  ensureTmpDir();
  const ts = Date.now();
  const inputPath = join(TMP_DIR, `input-${ts}.txt`);
  const outputPath = join(TMP_DIR, `output-${ts}.json`);

  writeFileSync(inputPath, rawText, 'utf8');
  console.log(`[AI-Structure] Text saved: ${inputPath} (${rawText.length} chars)`);

  const prompt = `Read the file at ${inputPath}. It contains an AlphaSense intelligence report (pasted text, may have formatting issues).

Extract ALL intelligence data and write it as a single JSON file to ${outputPath}.

The JSON must match this exact schema:
${SCHEMA}

Rules:
- Extract EVERY finding from Emerging Trends, Strategic Opportunities, and Key Challenges sections
- Number findings in the order they appear
- For top_companies: use Google favicon URL with the company's REAL website domain
- linked_findings use 0-based indices into the trends/opportunities/challenges arrays
- severity is based on company count: 4+ companies = "critical", 3 = "high", 2 = "medium", 0-1 = "low"
- Extract analyst quotes, companies_mentioned, and sector from Broker Analysis articles
- Use EXACT same company names in affected_companies as in top_companies
- Impact: POSITIVE = revenue/margins up, well-positioned; NEGATIVE = cost/risk/disruption; NEUTRAL = uncertain
- Write ONLY the JSON file — no other output needed`;

  try {
    await runClaudeWithTools(prompt);

    if (!existsSync(outputPath)) {
      throw new Error('Claude did not write the output JSON file');
    }

    const raw = readFileSync(outputPath, 'utf8');
    const payload = JSON.parse(raw);
    ensurePayloadFields(payload);
    return payload;
  } finally {
    cleanup(inputPath, outputPath);
  }
}

/** Backcompat: called from the alphasense route when regex parser fails */
export async function structureWithClaude(rawText: string): Promise<AlphaSensePayload> {
  return structureTextWithClaude(rawText);
}

/**
 * Extract hyperlink mappings from a PDF using Claude.
 * Claude reads the PDF and sees which URLs are linked to which source documents.
 * Returns a mapping of document_title → URL for each cited source.
 */
export async function extractPdfLinkMappings(pdfPath: string): Promise<{ title: string; org: string; url: string }[]> {
  ensureTmpDir();
  const ts = Date.now();
  const outputPath = join(TMP_DIR, `links-${ts}.json`);

  const prompt = `Read the PDF file at ${pdfPath}.

This is an AlphaSense intelligence report. It contains findings (Emerging Trends, Strategic Opportunities, Key Challenges) and Broker Analysis articles. Each finding cites a source document with a hyperlink to research.alpha-sense.com.

Extract EVERY hyperlinked source citation. For each one, output the document title, the source organization, and the EXACT URL the hyperlink points to.

Write the result as a JSON array to ${outputPath}:
[
  { "title": "Document Title as shown in the PDF", "org": "Source Organization", "url": "https://research.alpha-sense.com/?docid=..." },
  ...
]

RULES:
- Only include URLs that start with https://research.alpha-sense.com/
- Include the FULL URL with all query parameters (docid, stmt, hl, page, etc.)
- The title should match what appears in the PDF near the hyperlink
- Include ALL cited sources, not just unique ones — some documents are cited multiple times
- Write ONLY the JSON file — no other output`;

  try {
    await runClaudeWithTools(prompt, 180_000); // 3 min timeout

    if (!existsSync(outputPath)) {
      throw new Error('Claude did not write the link mappings output');
    }

    const raw = readFileSync(outputPath, 'utf8');
    const mappings = JSON.parse(raw);
    return Array.isArray(mappings) ? mappings : [];
  } finally {
    cleanup(outputPath);
  }
}

/**
 * Analyze a chart image using Claude vision and return structured ECharts-ready data.
 * Uses the same file-based CLI proxy pattern.
 */
export async function analyzeChartImage(imagePath: string, caption: string): Promise<{
  title: string; type: string; categories?: string[];
  series: { name: string; data: number[]; type?: string }[];
  description: string;
}> {
  ensureTmpDir();
  const ts = Date.now();
  const outputPath = join(TMP_DIR, `chart-${ts}.json`);

  // imagePath is already on disk (public/visuals/...)
  const absImagePath = imagePath.startsWith('/') ? join(process.cwd(), 'public', imagePath) : imagePath;

  const prompt = `Look at the chart image at ${absImagePath}. Caption: "${caption}"

Analyze this chart THOROUGHLY. Extract ALL data AND visual styling. Write the result as JSON to ${outputPath}.

{
  "title": "Exact chart title from the image",
  "type": "bar" | "line" | "pie" | "area" | "combo" | "stacked" | "waterfall" | "scatter" | "gauge",
  "categories": ["2023", "2024", "2025", ...],
  "series": [
    { "name": "Ad Spend", "data": [23.4, 28.8, 33.4], "type": "bar", "color": "#4A90D9" },
    { "name": "Growth %", "data": [19, 13, 12], "type": "line", "yAxisIndex": 1 }
  ],
  "description": "2-3 sentences describing what the chart shows",
  "xAxisName": "Year",
  "yAxisName": "Ad Spend ($B)",
  "yAxisUnit": "$B",
  "yAxis2Name": "Growth Rate",
  "yAxis2Unit": "%",
  "colors": ["#4A90D9", "#34d399"],
  "annotations": [
    { "text": "$46.9", "dataIndex": 5 },
    { "text": "9%", "dataIndex": 5 }
  ],
  "isStacked": false,
  "isDualAxis": true,
  "source": { "organization": "Source org if visible at bottom" }
}

CRITICAL RULES:
- Read EVERY number on axes, data labels, and annotations (dollar values, percentages, growth rates)
- DETECT THE CHART TYPE PRECISELY:
  * "combo" = bars AND a line on same chart (very common — bars for values, line for growth %)
  * "stacked" = bars stacked on top of each other
  * "waterfall" = bars that build up/down from a baseline
  * "pie" = circular, "area" = filled line chart
- For COMBO charts: one series should have "type":"bar", another "type":"line" with "yAxisIndex":1
- Extract the EXACT colors used (as hex codes) — look at bar fills, line colors
- Extract ALL text annotations visible ON the chart (growth %, dollar labels above bars, callouts)
- If chart has two Y-axes (e.g. left=$B, right=%), set isDualAxis:true and yAxis2Name/yAxis2Unit
- For stacked bars, set isStacked:true and give each series the same "stack":"total"
- Extract source/attribution text if visible below the chart
- Write ONLY the JSON file`;

  try {
    await runClaudeWithTools(prompt, 120_000); // 2 min timeout per chart

    if (!existsSync(outputPath)) {
      throw new Error('Claude did not write chart analysis output');
    }

    const raw = readFileSync(outputPath, 'utf8');
    const result = JSON.parse(raw);
    return {
      title: result.title || caption || 'Chart',
      type: result.type || 'bar',
      categories: result.categories,
      series: result.series || [],
      description: result.description || '',
    };
  } finally {
    cleanup(outputPath);
  }
}

function ensurePayloadFields(payload: AlphaSensePayload) {
  if (!payload.findings) payload.findings = [];
  if (!payload.news_items) payload.news_items = [];
  if (!payload.financial_highlights) payload.financial_highlights = [];
  if (!payload.top_companies) payload.top_companies = [];
  if (!payload.synthesis) payload.synthesis = '';
  if (!payload.metadata) {
    const cats = (payload.findings || []).map(f => f.category);
    const impacts = (payload.findings || []).map(f => f.impact_level);
    payload.metadata = {
      emerging_trend_count: cats.filter(c => c === 'Emerging Trend').length,
      strategic_opportunity_count: cats.filter(c => c === 'Strategic Opportunity').length,
      key_challenge_count: cats.filter(c => c === 'Key Challenge').length,
      high_impact_count: impacts.filter(i => i === 'High').length,
      medium_impact_count: impacts.filter(i => i === 'Medium').length,
      low_impact_count: impacts.filter(i => i === 'Low').length,
      news_count: payload.news_items.length,
      financial_highlight_count: payload.financial_highlights.length,
      top_company_count: payload.top_companies.length,
    };
  }
}
