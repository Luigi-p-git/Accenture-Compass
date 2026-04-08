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

// Mapping of topic → file path pattern
const TOPIC_PATHS: Record<string, (country: string) => string> = {
  overview: (country) => `countries/${country}.json`,
  talent: (country) => `talent/${country}.json`,
  industries: (country) => `industries/${country}/index.json`,
  financials: (country) => `financials/${country}.json`,
  macro: (country) => `macro/${country}.json`,
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get('country') || 'canada';
  const topic = searchParams.get('topic') || 'overview';

  const pathResolver = TOPIC_PATHS[topic];
  if (!pathResolver) {
    return NextResponse.json(
      { error: `Unknown topic: ${topic}` },
      { status: 400 }
    );
  }

  const filePath = path.join(DATA_DIR, pathResolver(country));

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
    const { country, topic, data, period } = body;

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

    const filePath = path.join(DATA_DIR, pathResolver(country));

    // Ensure directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });

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
