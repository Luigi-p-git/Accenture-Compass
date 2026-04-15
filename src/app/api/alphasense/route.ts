/**
 * AlphaSense Conversion API
 * POST /api/alphasense
 *
 * Accepts:
 *  - FormData with 'file' (PDF) → extracts text via pdf-parse, then parses
 *  - JSON { text: string }       → parses text directly
 *  - JSON { json: object }       → validates pre-built JSON, passes through
 *
 * Returns: { success, alphasense: AlphaSensePayload, trends: TrendsData }
 */

import { NextRequest, NextResponse } from 'next/server';
import { parseAlphaSenseText, transformToTrendsData } from '@/lib/alphasenseParser';
import type { AlphaSensePayload } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    let alphasense: AlphaSensePayload;
    let rawText = '';

    if (contentType.includes('multipart/form-data')) {
      // PDF file upload
      const form = await request.formData();
      const file = form.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());

      try {
        // Dynamic import for pdf-parse (server-side only)
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require('pdf-parse');
        const pdfData = await pdfParse(buffer);
        rawText = pdfData.text || '';
      } catch (pdfErr) {
        return NextResponse.json({ error: `PDF parsing failed: ${pdfErr instanceof Error ? pdfErr.message : 'unknown'}` }, { status: 400 });
      }

      if (rawText.trim().length < 50) {
        return NextResponse.json(
          { error: `Could not extract enough text from PDF (got ${rawText.trim().length} chars). Try pasting the text directly.` },
          { status: 400 }
        );
      }

      alphasense = parseAlphaSenseText(rawText);

    } else {
      // JSON body — handle text or pre-built JSON
      let body;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: 'Could not parse request body as JSON. Make sure you are sending valid JSON.' }, { status: 400 });
      }

      if (body.json) {
        // Pre-built JSON — validate and pass through
        const payload = body.json as AlphaSensePayload;
        if (!payload.findings || !Array.isArray(payload.findings)) {
          return NextResponse.json({ error: 'Invalid JSON: missing findings array' }, { status: 400 });
        }
        alphasense = payload;

      } else if (body.text) {
        rawText = String(body.text);
        if (rawText.trim().length < 50) {
          return NextResponse.json({ error: `Input text too short (${rawText.trim().length} chars). Paste the full AlphaSense output.` }, { status: 400 });
        }
        alphasense = parseAlphaSenseText(rawText);

      } else {
        return NextResponse.json({ error: 'Provide either file (FormData), text, or json in request body' }, { status: 400 });
      }
    }

    if (alphasense.findings.length === 0) {
      return NextResponse.json(
        {
          error: 'No findings could be extracted from the input.',
          debug: {
            inputLength: rawText.length,
            inputPreview: rawText.substring(0, 400),
            hint: 'The parser looks for numbered items (e.g. "1. Title") under category headers (e.g. "EMERGING TRENDS"). Check that the text contains this structure.',
          }
        },
        { status: 422 }
      );
    }

    const trends = transformToTrendsData(alphasense);

    return NextResponse.json({ success: true, alphasense, trends });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Processing failed: ${message}` }, { status: 500 });
  }
}
