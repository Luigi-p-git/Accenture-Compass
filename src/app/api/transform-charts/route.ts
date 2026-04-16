/**
 * Transform Chart Images API
 * POST /api/transform-charts
 *
 * Takes extracted chart image paths, uses Claude vision to analyze them,
 * and returns ECharts-ready JSON specs for each.
 *
 * Input: { images: [{ src: "/visuals/...", caption: "..." }] }
 * Output: { success, charts: [{ original_src, title, type, categories, series, description }] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { analyzeChartImage } from '@/lib/aiStructure';
import type { TransformedChart } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { images } = await request.json() as {
      images: { src: string; caption?: string }[];
    };

    if (!images?.length) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 });
    }

    const charts: TransformedChart[] = [];
    const errors: string[] = [];

    // Process each image sequentially (Claude CLI can only run one at a time)
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      try {
        console.log(`[Transform-Charts] Analyzing image ${i + 1}/${images.length}: ${img.src}`);
        const result = await analyzeChartImage(img.src, img.caption || `Chart ${i + 1}`);
        charts.push({
          original_src: img.src,
          title: result.title,
          type: result.type as TransformedChart['type'],
          categories: result.categories,
          series: result.series,
          description: result.description,
        });
      } catch (err) {
        const msg = `Chart ${i + 1} failed: ${err instanceof Error ? err.message : 'unknown'}`;
        console.error(`[Transform-Charts] ${msg}`);
        errors.push(msg);
      }
    }

    return NextResponse.json({
      success: true,
      count: charts.length,
      charts,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Chart transformation failed: ${err instanceof Error ? err.message : 'unknown'}` },
      { status: 500 }
    );
  }
}
