import path from 'path';
import fs from 'fs/promises';
import type { TrendsData } from '@/types';
import IntelligencePage from './IntelligencePage';

const DATA_DIR = path.join(process.cwd(), 'src', 'data');

export async function generateMetadata({ params }: { params: Promise<{ country: string }> }) {
  const { country } = await params;
  const name = country.charAt(0).toUpperCase() + country.slice(1).replace(/-/g, ' ');
  return {
    title: `${name} — Strategic Intelligence | Accenture Compass`,
    description: `Interactive strategic intelligence report for ${name}. Emerging trends, opportunities, and challenges.`,
  };
}

export default async function IntelligenceRoute({ params }: { params: Promise<{ country: string }> }) {
  const { country } = await params;
  const countryName = country.charAt(0).toUpperCase() + country.slice(1).replace(/-/g, ' ');

  // Try to load all-industries data as default
  let data: TrendsData | null = null;
  try {
    const filePath = path.join(DATA_DIR, 'trends', country, 'all-industries.json');
    const raw = await fs.readFile(filePath, 'utf-8');
    data = JSON.parse(raw);
  } catch {
    // Try legacy flat file path (backward compat)
    try {
      const legacyPath = path.join(DATA_DIR, 'trends', `${country}.json`);
      const raw = await fs.readFile(legacyPath, 'utf-8');
      data = JSON.parse(raw);
    } catch {
      // No data file — will show empty state
    }
  }

  return <IntelligencePage data={data} country={countryName} countrySlug={country} />;
}
