/**
 * PDF Image Extractor API
 * POST /api/extract-images
 *
 * Accepts: FormData with 'file' (PDF) + 'country' + 'industry' (optional)
 * Extracts embedded JPEG/PNG images from the PDF binary
 * Saves to public/visuals/{country}/
 * Returns: { success, images: [{ src, caption }] }
 */

import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

// JPEG starts with FF D8 FF, PNG starts with 89 50 4E 47
const JPEG_START = Buffer.from([0xFF, 0xD8, 0xFF]);
const JPEG_END = Buffer.from([0xFF, 0xD9]);
const PNG_START = Buffer.from([0x89, 0x50, 0x4E, 0x47]);
const PNG_END = Buffer.from('IEND');

function findAllOccurrences(buffer: Buffer, marker: Buffer, startFrom = 0): number[] {
  const positions: number[] = [];
  let pos = startFrom;
  while (pos < buffer.length - marker.length) {
    const idx = buffer.indexOf(marker, pos);
    if (idx === -1) break;
    positions.push(idx);
    pos = idx + 1;
  }
  return positions;
}

function extractImages(pdfBuffer: Buffer): { data: Buffer; type: 'jpeg' | 'png' }[] {
  const images: { data: Buffer; type: 'jpeg' | 'png' }[] = [];

  // Extract JPEGs
  const jpegStarts = findAllOccurrences(pdfBuffer, JPEG_START);
  for (const start of jpegStarts) {
    const endIdx = pdfBuffer.indexOf(JPEG_END, start + 3);
    if (endIdx === -1) continue;
    const end = endIdx + 2;
    const size = end - start;
    // Only keep images larger than 5KB (skip tiny thumbnails/icons)
    if (size > 5000 && size < 10_000_000) {
      images.push({ data: pdfBuffer.subarray(start, end), type: 'jpeg' });
    }
  }

  // Extract PNGs
  const pngStarts = findAllOccurrences(pdfBuffer, PNG_START);
  for (const start of pngStarts) {
    const endMarker = pdfBuffer.indexOf(PNG_END, start + 8);
    if (endMarker === -1) continue;
    const end = endMarker + 8; // IEND + 4 byte CRC
    const size = end - start;
    if (size > 5000 && size < 10_000_000) {
      images.push({ data: pdfBuffer.subarray(start, end), type: 'png' });
    }
  }

  return images;
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get('file') as File | null;
    const country = (form.get('country') as string) || 'general';
    const industry = (form.get('industry') as string) || '';

    if (!file) {
      return NextResponse.json({ error: 'No PDF file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const extracted = extractImages(buffer);

    if (extracted.length === 0) {
      return NextResponse.json({ error: 'No chart images found in this PDF. The PDF may use vector graphics instead of embedded images.' }, { status: 422 });
    }

    // Save images to public/visuals/{country}/
    const slug = industry ? `${country}/${industry}` : country;
    const outDir = path.join(process.cwd(), 'public', 'visuals', slug);
    await fs.mkdir(outDir, { recursive: true });

    const savedImages: { src: string; caption: string }[] = [];
    for (let i = 0; i < extracted.length; i++) {
      const img = extracted[i];
      const filename = `chart-${i + 1}.${img.type}`;
      const filePath = path.join(outDir, filename);
      await fs.writeFile(filePath, img.data);
      savedImages.push({
        src: `/visuals/${slug}/${filename}`,
        caption: `Chart ${i + 1} — Extracted from ${file.name}`,
      });
    }

    return NextResponse.json({
      success: true,
      count: savedImages.length,
      images: savedImages,
    });
  } catch (err) {
    return NextResponse.json({ error: `Image extraction failed: ${err instanceof Error ? err.message : 'unknown'}` }, { status: 500 });
  }
}
