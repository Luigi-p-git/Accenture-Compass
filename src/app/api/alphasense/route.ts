/**
 * AlphaSense Conversion API
 * POST /api/alphasense
 *
 * Accepts:
 *  - FormData with 'file' (PDF) → Claude reads PDF directly (no pdf-parse needed)
 *  - JSON { text: string }       → regex parser first, Claude fallback if fails
 *  - JSON { json: object }       → validates pre-built JSON, passes through
 *
 * Returns: { success, alphasense: AlphaSensePayload, trends: TrendsData }
 */

import { NextRequest, NextResponse } from 'next/server';
import { parseAlphaSenseText, transformToTrendsData } from '@/lib/alphasenseParser';
import { structurePDFWithClaude, structureTextWithClaude } from '@/lib/aiStructure';
import type { AlphaSensePayload } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    let alphasense: AlphaSensePayload;

    if (contentType.includes('multipart/form-data')) {
      // PDF file upload → Claude reads PDF directly
      const form = await request.formData();
      const file = form.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      if (buffer.length < 100) {
        return NextResponse.json({ error: 'File too small' }, { status: 400 });
      }

      try {
        alphasense = await structurePDFWithClaude(buffer);
      } catch (err) {
        return NextResponse.json(
          { error: `PDF processing failed: ${err instanceof Error ? err.message : 'unknown'}` },
          { status: 422 }
        );
      }

    } else {
      // JSON body — handle text or pre-built JSON
      let body;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: 'Could not parse request body as JSON.' }, { status: 400 });
      }

      if (body.json) {
        // Pre-built JSON — accept both AlphaSensePayload format (findings[]) and TrendsData format (trends[])
        const payload = body.json;

        // TrendsData format — has trends/opportunities/challenges arrays directly
        if (payload.trends && Array.isArray(payload.trends)) {
          const trends = payload;
          // Ensure required fields
          if (!trends.source) trends.source = { subject: trends.subject || 'Unknown', date_generated: new Date().toISOString().split('T')[0], total_findings: (trends.trends?.length || 0) + (trends.opportunities?.length || 0) + (trends.challenges?.length || 0) };
          if (!trends.challenges) trends.challenges = [];
          if (!trends.opportunities) trends.opportunities = [];
          if (!trends.news_items) trends.news_items = [];
          if (!trends.financial_highlights) trends.financial_highlights = [];
          if (!trends.top_companies) trends.top_companies = [];
          // Return directly as TrendsData — skip the transform step
          return NextResponse.json({ success: true, trends, alphasense: { findings: [], synthesis: trends.synthesis || '', subject: trends.source?.subject || '', date_generated: trends.source?.date_generated || '', total_findings: trends.source?.total_findings || 0, news_items: trends.news_items || [], financial_highlights: trends.financial_highlights || [], top_companies: trends.top_companies || [], metadata: { emerging_trend_count: trends.trends?.length || 0, strategic_opportunity_count: trends.opportunities?.length || 0, key_challenge_count: trends.challenges?.length || 0, high_impact_count: 0, medium_impact_count: 0, low_impact_count: 0, news_count: trends.news_items?.length || 0, financial_highlight_count: trends.financial_highlights?.length || 0, top_company_count: trends.top_companies?.length || 0 } } });
        }

        // AlphaSensePayload format — has findings[] array
        if (!payload.findings || !Array.isArray(payload.findings)) {
          return NextResponse.json({ error: 'Invalid JSON: needs either "trends" array (TrendsData) or "findings" array (AlphaSensePayload)' }, { status: 400 });
        }
        alphasense = payload as AlphaSensePayload;

      } else if (body.text) {
        const rawText = String(body.text);
        if (rawText.trim().length < 50) {
          return NextResponse.json({ error: `Input text too short (${rawText.trim().length} chars).` }, { status: 400 });
        }

        // Try regex parser first (instant)
        alphasense = parseAlphaSenseText(rawText);

        // If regex fails, fall back to Claude file-based approach
        if (alphasense.findings.length === 0) {
          try {
            alphasense = await structureTextWithClaude(rawText);
          } catch (err) {
            return NextResponse.json(
              { error: `Text processing failed: ${err instanceof Error ? err.message : 'unknown'}` },
              { status: 422 }
            );
          }
        }

      } else {
        return NextResponse.json({ error: 'Provide either file (FormData), text, or json in request body' }, { status: 400 });
      }
    }

    if (!alphasense.findings || alphasense.findings.length === 0) {
      return NextResponse.json({ error: 'No findings could be extracted from the input.' }, { status: 422 });
    }

    const trends = transformToTrendsData(alphasense);

    return NextResponse.json({ success: true, alphasense, trends });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Processing failed: ${message}` }, { status: 500 });
  }
}
