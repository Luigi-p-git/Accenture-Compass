/**
 * AI Structuring API — Claude CLI Proxy
 * POST /api/ai-structure
 *
 * Takes raw messy text from AlphaSense and uses Claude CLI
 * to normalize it into clean AlphaSensePayload JSON.
 * No API key needed — routes through authenticated Claude CLI.
 */

import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';

function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').trim();
}

function runClaude(prompt: string, timeoutMs = 120_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('claude', ['-p'], {
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error('Claude CLI timed out'));
    }, timeoutMs);

    let out = '';
    let err = '';

    proc.stdout.on('data', (d: Buffer) => { out += d.toString(); });
    proc.stderr.on('data', (d: Buffer) => { err += d.toString(); });

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) reject(new Error(`CLI exit ${code}: ${err.slice(0, 300)}`));
      else resolve(stripAnsi(out));
    });

    proc.on('error', (e) => {
      clearTimeout(timer);
      reject(new Error(`Spawn failed: ${e.message}`));
    });

    proc.stdin.write(prompt, 'utf8');
    proc.stdin.end();
  });
}

const STRUCTURING_PROMPT = `You are a JSON structuring engine. Convert the raw intelligence text below into a VALID JSON object matching this EXACT schema. Output ONLY the JSON — no markdown, no code fences, no explanation.

SCHEMA:
{
  "subject": "string — country or region being analyzed",
  "date_generated": "YYYY-MM-DD",
  "total_findings": number,
  "findings": [
    {
      "id": sequential_number,
      "category": "Emerging Trend" | "Strategic Opportunity" | "Key Challenge",
      "finding": "short title",
      "description": "4-6 sentence description with data",
      "impact_level": "High" | "Medium" | "Low" | null,
      "timeframe": "Near-term (0-12mo)" | "Medium-term (1-3yr)" | "Long-term (3-5yr+)" | null,
      "source": {
        "document_title": "string or null",
        "organization": "string or null",
        "document_type": "string or null",
        "date": "string or null",
        "url": "string or null",
        "headline": null
      },
      "affected_companies": [
        { "name": "string", "ticker": "string or null", "impact": "positive" | "negative" | "neutral", "detail": "string" }
      ],
      "key_metrics": [
        { "label": "string", "value": "string", "trend": "up" | "down" | "stable" }
      ]
    }
  ],
  "synthesis": "3-5 sentence cross-cutting summary",
  "news_items": [
    {
      "id": number,
      "headline": "editorial headline",
      "summary": "2-3 sentences",
      "source_org": "string",
      "date": "string or null",
      "type": "Broker Research" | "Earnings Call" | "News" | "Government Publication" | null,
      "url": "string or null",
      "related_finding_ids": [numbers],
      "analyst_quote": "string or undefined"
    }
  ],
  "financial_highlights": [
    {
      "id": number,
      "metric": "string",
      "current_value": "string",
      "previous_value": "string or null",
      "change": "string or null",
      "chart_type": "bar",
      "data_points": []
    }
  ],
  "top_companies": [
    {
      "name": "string",
      "ticker": "string or null",
      "sector": "string",
      "hq": "string",
      "revenue": "string",
      "key_initiatives": ["string"],
      "logo_url": "https://www.google.com/s2/favicons?domain=COMPANY_DOMAIN&sz=128",
      "linked_findings": {
        "trends": [finding_id_numbers],
        "opportunities": [finding_id_numbers],
        "challenges": [finding_id_numbers]
      }
    }
  ],
  "metadata": {
    "emerging_trend_count": number,
    "strategic_opportunity_count": number,
    "key_challenge_count": number,
    "high_impact_count": number,
    "medium_impact_count": number,
    "low_impact_count": number,
    "news_count": number,
    "financial_highlight_count": number,
    "top_company_count": number
  }
}

RULES:
1. Detect sections: EMERGING TRENDS, STRATEGIC OPPORTUNITIES, KEY CHALLENGES, TOP 10 COMPANIES, FINANCIAL HIGHLIGHTS, BROKER ANALYSIS/NEWS, SYNTHESIS
2. Number findings sequentially across all categories (1, 2, 3...)
3. Extract Description, Impact, Timeframe, Source, Source URL, Companies Affected for each finding
4. For top_companies, generate a logo_url using Google favicons: https://www.google.com/s2/favicons?domain=COMPANY_WEBSITE_DOMAIN&sz=128
5. Link companies to findings by their sequential number
6. Analyst quotes should be extracted from broker analysis articles if present
7. Output ONLY valid JSON — no text before or after

RAW TEXT:
`;

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();
    if (!text || typeof text !== 'string' || text.trim().length < 50) {
      return NextResponse.json({ error: 'Text too short' }, { status: 400 });
    }

    const prompt = STRUCTURING_PROMPT + text;
    const raw = await runClaude(prompt);

    // Extract JSON from response (handle potential markdown fences)
    let jsonStr = raw;
    const fenceMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (fenceMatch) jsonStr = fenceMatch[1];

    // Try to find JSON object boundaries
    const startIdx = jsonStr.indexOf('{');
    const endIdx = jsonStr.lastIndexOf('}');
    if (startIdx === -1 || endIdx === -1) {
      return NextResponse.json({ error: 'Claude did not return valid JSON', raw: raw.substring(0, 500) }, { status: 422 });
    }
    jsonStr = jsonStr.substring(startIdx, endIdx + 1);

    const payload = JSON.parse(jsonStr);

    if (!payload.findings || !Array.isArray(payload.findings) || payload.findings.length === 0) {
      return NextResponse.json({ error: 'Claude returned JSON but no findings were extracted', raw: raw.substring(0, 500) }, { status: 422 });
    }

    return NextResponse.json({ success: true, payload });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `AI structuring failed: ${message}` }, { status: 500 });
  }
}
