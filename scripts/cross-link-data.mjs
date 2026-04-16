/**
 * One-time script: run crossLinkData() on all trends JSON files that have top_companies.
 * Usage: node scripts/cross-link-data.mjs
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

function normalizeName(name) {
  return name.toLowerCase()
    .replace(/\b(inc|corp|co|ltd|plc|group|holdings|nv|lp|llc|company|the|enterprises?|partners?)\b\.?/g, '')
    .replace(/[.,&]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function fuzzyMatch(a, b) {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.length > 3 && nb.length > 3) {
    if (na.includes(nb) || nb.includes(na)) return true;
  }
  const wa = na.split(' ').filter(w => w.length > 2);
  const wb = nb.split(' ').filter(w => w.length > 2);
  if (wa[0] && wb[0] && wa[0] === wb[0] && wa[0].length > 3) return true;
  return false;
}

function crossLinkData(data) {
  if (!data.top_companies?.length) return false;
  const tc = data.top_companies;
  let changed = false;

  for (const cat of ['trends', 'opportunities', 'challenges']) {
    const findings = data[cat];
    if (!findings?.length) continue;

    findings.forEach((finding, fIdx) => {
      const matchedCompanyIndices = new Set();

      if (finding.affected_companies?.length) {
        for (const ac of finding.affected_companies) {
          tc.forEach((company, tcIdx) => {
            if (fuzzyMatch(ac.name, company.name)) matchedCompanyIndices.add(tcIdx);
          });
        }
      }

      tc.forEach((company, tcIdx) => {
        if (company.linked_findings?.[cat]?.includes(fIdx)) matchedCompanyIndices.add(tcIdx);
      });

      const sorted = [...matchedCompanyIndices].sort((a, b) => a - b);
      if (JSON.stringify(finding.linked_top_companies || []) !== JSON.stringify(sorted)) changed = true;
      finding.linked_top_companies = sorted;

      matchedCompanyIndices.forEach(tcIdx => {
        const company = tc[tcIdx];
        if (!company.linked_findings) company.linked_findings = { trends: [], opportunities: [], challenges: [] };
        if (!company.linked_findings[cat]) company.linked_findings[cat] = [];
        if (!company.linked_findings[cat].includes(fIdx)) {
          company.linked_findings[cat].push(fIdx);
          company.linked_findings[cat].sort((a, b) => a - b);
          changed = true;
        }
      });
    });
  }

  if (data.news_items?.length) {
    data.news_items.forEach(news => {
      const matchedIndices = new Set();

      if (news.companies_mentioned?.length) {
        for (const name of news.companies_mentioned) {
          tc.forEach((company, tcIdx) => {
            if (fuzzyMatch(name, company.name)) matchedIndices.add(tcIdx);
          });
        }
      }

      const text = `${news.headline} ${news.summary}`.toLowerCase();
      tc.forEach((company, tcIdx) => {
        const normalized = normalizeName(company.name);
        const words = normalized.split(' ').filter(w => w.length > 3);
        if (words.some(w => text.includes(w))) matchedIndices.add(tcIdx);
      });

      const sorted = [...matchedIndices].sort((a, b) => a - b);
      if (JSON.stringify(news.linked_top_companies || []) !== JSON.stringify(sorted)) changed = true;
      news.linked_top_companies = sorted;
    });
  }

  return changed;
}

// Find all trends JSON files
const trendsDir = join(process.cwd(), 'src', 'data', 'trends');
function findJsonFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) results.push(...findJsonFiles(full));
    else if (entry.endsWith('.json')) results.push(full);
  }
  return results;
}

const files = findJsonFiles(trendsDir);
let processed = 0;
let linked = 0;

for (const file of files) {
  const raw = readFileSync(file, 'utf-8');
  const data = JSON.parse(raw);

  if (!data.top_companies?.length) {
    console.log(`SKIP (no top_companies): ${file.replace(process.cwd(), '.')}`);
    continue;
  }

  processed++;
  const changed = crossLinkData(data);

  if (changed) {
    writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
    linked++;
    console.log(`LINKED: ${file.replace(process.cwd(), '.')}`);
  } else {
    console.log(`OK (already linked): ${file.replace(process.cwd(), '.')}`);
  }
}

console.log(`\nDone: ${processed} files processed, ${linked} files updated.`);
