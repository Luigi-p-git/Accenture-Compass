# Accenture Compass — Claude Code Instructions

## Project Overview

Accenture Compass is an interactive strategic intelligence platform with two main experiences:
- **Compass Dashboard** — World map → Region → Country → Topics (Talent, Industries, Financials, Macro, Trends)
- **AccSense Magazine** — Interactive editorial intelligence report powered by AlphaSense data

**Current version:** 0.4.2 (Phase 1 complete + AccSense Magazine + AlphaSense Pipeline + Robin AI + AI Structuring + Cross-Reference System + ECharts Data Viz + PDF Link Extraction + Unified Admin)
**Stack:** Next.js 16 (App Router) + React 19 + Tailwind v4 + Framer Motion 12.38 + D3-geo + Zustand + Recharts + ECharts + jsPDF + pdfjs-dist + clsx + tailwind-merge
**Design system:** Stitch (Accenture dark theme) + Editorial broadsheet (Magazine)

## Running the App

```bash
npm run dev       # Dev server (default port 3000)
npm run build     # Production build
npm run start     # Start production server
```

## Architecture

| Path | Role |
|------|------|
| `src/app/page.tsx` | Landing — World map + 13 industry pill selectors |
| `src/app/explore/canada/page.tsx` | Canada dashboard (6 tabs, DrumPicker, bento grid) |
| `src/app/explore/[country]/intelligence/` | **AccSense Magazine** — editorial intelligence report |
| `src/app/explore/[country]/intelligence/IntelligencePage.tsx` | Main magazine component (1400+ lines) |
| `src/app/industries/` | Industry Lens — sector intelligence |
| `src/app/admin/` | Admin — pipeline + manual upload + AlphaSense Mode + Paste JSON tab |
| `src/app/api/data/` | Data API — CRUD + cross-linker + data sanitizer |
| `src/app/api/alphasense/` | AlphaSense conversion — text/PDF/JSON → structured findings (regex + AI fallback) |
| `src/app/api/robin-chat/` | Robin AI chat proxy — Claude CLI file-based backend |
| `src/app/api/ai-structure/` | AI structuring endpoint — Claude CLI PDF/text → JSON |
| `src/app/api/extract-images/` | PDF image extractor — JPEG/PNG binary extraction with dedup |
| `src/app/api/extract-links/` | PDF link extractor — pdfjs-dist annotation parsing + citation-to-finding matching with date bonuses |
| `src/app/api/transform-charts/` | Chart recreation — Claude vision analyzes chart images → ECharts specs |
| `src/app/api/pipeline/` | AI pipeline API — document processing (simulated) |
| `src/components/intelligence/HeadlineSelector.tsx` | 3-cascade slot-machine spinner (Region › Country › Industry) |
| `src/components/intelligence/RobinChat.tsx` | Robin AI floating chat — context-aware, auto-sends from "Ask Robin" buttons |
| `src/components/ui/` | StatCard, GlassCard, DrumPicker |
| `src/components/charts/` | BarChart, DonutChart, Sparkline, ProgressRing |
| `src/components/layout/` | Header, Sidebar, PageTransition |
| `src/lib/alphasenseParser.ts` | Tri-mode parser: block + legacy + lenient; `preProcessText()`, `transformToTrendsData()` |
| `src/lib/aiStructure.ts` | File-based Claude CLI proxy: saves input to `.tmp/`, spawns `claude -p` with Read/Write/Bash |
| `src/lib/intelligenceReport.ts` | PDF report generator (jsPDF, dark theme) |
| `src/lib/utils.ts` | cn() utility (clsx + tailwind-merge) |
| `src/lib/store.ts` | Zustand state (lens, sidebar, theme) |
| `src/lib/pdfExport.ts` | Branded Accenture PDF generator (older) |
| `src/data/` | Static JSON data files |
| `src/data/trends/{country}/{industry}.json` | AlphaSense-generated intelligence data per country+industry |
| `src/types/index.ts` | Full TypeScript interfaces (TopCompany, TrendsData, AlphaSensePayload, etc.) |

## Design System — Stitch (DO NOT deviate)

```
Primary:       #A100FF (bright purple — signature accent)
Primary Deep:  #7B00BF
Emerald:       #34d399 (positive metrics)
Red:           #f87171 (negative/high severity)
Blue:          #60a5fa (EMEA region, client intelligence, news)
Amber:         #fbbf24 (medium severity, financials)
Background:    #0a0a0a
Surface 1-3:   rgba(255,255,255,.03/.06/.1)
Font:          Inter (300-900)
```

**Key rules:**
- NO 1px solid borders for sectioning — use background color shifts
- NO drop shadows — use Ambient Bloom
- Glass morphism for floating elements
- Purple used surgically as high-intent highlight
- Dark mode is default; light mode via `data-theme="light"` attribute
- NO boxy card layouts — use editorial structural lines, asymmetric grids

### Theme System — `--ink` CSS Variable

All theme-aware colors use the `--ink` variable pattern:
- Dark mode: `--ink: 255 255 255` (white ink on dark bg)
- Light mode: `--ink: 0 0 0` (black ink on light bg)
- Usage: `rgb(var(--ink) / opacity)` e.g. `rgb(var(--ink) / .5)` for 50% opacity text
- Helper in IntelligencePage: `const a = (o: number) => \`rgb(var(--ink) / \${o})\``
- Toggle: `useCompassStore(s => s.toggleTheme)`, renders sun/moon icon in magazine header

**AccSense Magazine design dialect:**
- Editorial broadsheet style (NEWGAZINE-inspired)
- Structural white 2px lines, asymmetric grids (5/7, 7/5, 2/1)
- Ghost watermark text (> symbol, section names)
- Master-detail layout for Trends and Challenges (hover left → detail expands right)
- Horizontal scroll cards for Opportunities
- Magazine crest + spine for Broker Analysis section
- Newspaper texture for News section (newsprint grain, double rules)
- Paginated article view with page-turn animation

## Route Map

```
/                                    → Landing (world map + industry pills)
/explore/canada                      → Canada dashboard (6 tabs + DrumPicker)
/explore/[country]/intelligence      → AccSense Magazine (dynamic report)
/industries                          → Industry Lens (all sectors)
/admin                               → Data management + AlphaSense Mode + Paste JSON
/api/data                            → Data CRUD API (supports ?industry= for trends) + cross-linker
/api/alphasense                      → AlphaSense text/PDF/JSON conversion (regex + AI fallback)
/api/robin-chat                      → Robin AI chat proxy (Claude CLI)
/api/ai-structure                    → AI structuring (Claude CLI → JSON)
/api/extract-images                  → PDF chart image extraction
/api/pipeline                        → Document processing pipeline
```

## Data Flow

**Phase 1 (Current):** Static JSON + AlphaSense manual pipeline
**Phase 2:** Supabase PostgreSQL + Prisma ORM
**Phase 3:** Agentic pipeline (see AGENTIC_PIPELINE_SPEC.md)

### API Endpoints

```
GET  /api/data?country=canada&topic=trends&industry=banking-capital-markets
POST /api/data { country, topic, data, industry }  ← triggers crossLinkData() + sanitizer
POST /api/alphasense (FormData PDF or JSON { text } or { json })
POST /api/robin-chat { messages, context }
POST /api/extract-images (FormData PDF + country + industry)
```

### Data Storage Pattern
```
src/data/trends/{country}/{industry-slug}.json
src/data/trends/canada/banking-capital-markets.json
src/data/trends/united-states/chemicals-natural-resources.json
public/visuals/{country}/{industry}/chart-1.jpeg
```

## Cross-Reference System (v0.4.1)

`crossLinkData()` in `/api/data/route.ts` runs on every "Update Website" POST:

1. **Finding → Company**: fuzzy-matches `affected_companies[].name` against `top_companies[].name`, populates `finding.linked_top_companies[]` (indices into top_companies)
2. **Company → Finding**: backfills `company.linked_findings.{trends,opportunities,challenges}[]` with finding indices
3. **News → Company**: scans `companies_mentioned[]` + headline/summary text, populates `news.linked_top_companies[]`

**UI Components:**
- `LinkedCompanyChips` — shows related companies with impact arrows on trend/challenge detail panels
- `getSourceUrl()` — generates AlphaSense search URL from source metadata
- "Open in AlphaSense ↗" links on source sections

## Robin AI Assistant

`src/components/intelligence/RobinChat.tsx` — floating blue button with Batman sidekick domino mask SVG.

- Semi-transparent chat panel (backdrop-blur 24px)
- Context-aware: receives `RobinFocus` from "Ask Robin" buttons on companies, trends, challenges, charts
- Auto-sends prompts from Visual Intelligence "Ask Robin" buttons
- Rich text rendering: **bold**, [links](url), bare URLs, numbered lists, bullet points with ▸, section headers, $dollar and %percentage highlighting in emerald
- Backend: `/api/robin-chat` → Claude CLI proxy via file-based approach (no API key needed)

## AI Structuring Pipeline

`src/lib/aiStructure.ts` — file-based Claude CLI proxy:

1. Saves input to `.tmp/` file
2. Spawns `claude -p --allowedTools "Read,Write,Bash" --dangerously-skip-permissions`
3. Claude reads input file, writes JSON to output file (avoids stdout buffer timeout)
4. Two functions: `structurePDFWithClaude(buffer)` and `structureTextWithClaude(rawText)`
5. Fallback in `/api/alphasense`: regex parser tries first → if 0 findings → AI structuring
6. Timeout: 300s (5 min) for large documents

**Important:** Do NOT pipe large text through stdin on Windows — use the file-based approach.

## Data Visualizations (ECharts)

`echarts` + `echarts-for-react` — 4 interactive panels in `GeneratedChartsSection`:

1. **Market Metrics** — horizontal bar chart from `financial_highlights` (amber gradient, sorted ascending)
2. **Company Revenue** — horizontal bar chart of top companies (blue gradient, clickable → opens company panel)
3. **Intelligence Mix** — donut chart of trends/opps/challenges counts (clickable → scrolls to section)
4. **Company × Finding Heatmap** — purple intensity grid (clickable → navigates)

All charts lazy-loaded via dynamic import. Dark/light theme aware.

## PDF Link Extraction (pdfjs-dist)

`/api/extract-links/route.ts` — Mozilla PDF.js for deterministic annotation parsing:

1. Extracts citation# → URL from PDF link annotations (decompresses zlib streams)
2. Parses Citations section (last pages) for citation# → document title + org + date
3. Two-tier matching: **Tier 1** uses `citation_id` from data (perfect), **Tier 2** uses title + org + date text matching
4. Date-matching bonus: +8 score when citation date matches finding source date
5. `getSourceUrl()` only returns real URLs — no fake search links

## Admin Pipeline (Unified)

Single "Process & Update Website" button handles JSON + PDF together:

1. **Paste JSON** (left) or **Paste Text** — auto-detects country + industry from subject
2. **Attach PDF** (right) — optional, with 3 checkboxes:
   - **Extract Charts** (instant) — pulls JPEG/PNG images from PDF binary
   - **Extract Links** (instant) — pdfjs-dist citation → URL matching
   - **Recreate Charts** (~2min) — Claude vision analyzes chart images → ECharts specs
3. Progress bar with step labels + percentage
4. All saved to data in one flow

## AlphaSense Pipeline (No API Keys Required)

1. Admin → Paste JSON or Text + optionally attach PDF
2. Parser: block format → legacy numbered → lenient (3 fallback levels)
3. Extracts: findings, financial highlights, news items, companies affected, top companies
4. Cross-linker runs on save (bidirectional finding↔company↔news linking)
5. PDF link extraction matches real AlphaSense document URLs to findings
6. Magazine renders all sections with interconnected navigation

**AlphaSense Prompt features:**
- "Top 10 Companies" with linked findings, ticker, sector, HQ, revenue, key investments with citation brackets
- "Key Investments" with `[citation#]` for PDF link matching
- "Source Citation" field for perfect finding-to-URL matching
- "Analyst Quote" field in Broker Analysis articles
- Cross-reference rules: impact criteria, broker Companies Mentioned + Sector, company Investment Focus + Recent Moves

## AccSense Magazine Sections

| Section | Description | Data Source |
|---------|-------------|------------|
| Hero | THE {COUNTRY} OUTLOOK headline, mini map, key metrics, synthesis popup | TrendsData |
| Intelligence Brief | 3-column top-5 (Trends/Opportunities/Challenges) with "View more →" | All findings |
| Emerging Trends | Master-detail: hover list → expanded card with LinkedCompanyChips | trends[] |
| Broker Analysis | Magazine crest + spine, paginated 3×2 article grid, page-turn animation | news_items[] |
| Opportunities | Horizontal scroll vertical cards with sentence-boundary truncation | opportunities[] |
| Data Visualizations | 4 ECharts panels: market metrics, company revenue, donut, heatmap — all interactive | financial_highlights[] + top_companies[] |
| Key Challenges | Master-detail with severity colors (sorted critical→low), LinkedCompanyChips | challenges[] |
| Companies Intelligence | Editorial vertical list, company logos, colored finding-count pills, enriched side panel | top_companies[] |
| Report Charts | Coming Soon teaser (code preserved: TransformedChartsSection + Claude vision pipeline) | transformed_charts[] |
| AccSense Daily | Coming Soon teaser (code preserved in git history) | Future |

## Key Types (v0.4.2)

```typescript
TopCompany: name, ticker, sector, hq, revenue, key_initiatives (string[] — may contain [citation#] brackets), investment_focus?, recent_moves?, logo_url?, linked_findings: { trends[], opportunities[], challenges[] }
TransformedChart: original_src, title, type ('bar'|'line'|'pie'|'combo'|'stacked'|'waterfall'|...), categories?, series[], description, source?, annotations?, isDualAxis?, isStacked?
TrendsChallenge: t, d, severity ('critical'|'high'|'medium'|'low'), ic, source?, affected_companies?, linked_top_companies?
TrendsOpportunity: t, p, timeline, d, ic, priority?, source?, affected_companies?, linked_top_companies?
TrendsTrend: t, tag, d, ic, source?, affected_companies?, linked_top_companies?
NewsItem: id, headline, summary, source_org, date, type, url, related_finding_ids, analyst_quote?, companies_mentioned?, sector?, linked_top_companies?
TrendsData: challenges[], opportunities[], trends[], synthesis, source, news_items?, financial_highlights?, images?, top_companies?
```

## Key Conventions

- Framer Motion for all animations (cubic-bezier 0.4,0,0.2,1)
- Lucide React for newer components, Material Symbols (`.ms` class) for older
- Zustand for global state
- Inter font at weights 300-900; Playfair Display for magazine wordmark
- Industry-specific data: files at `trends/{country}/{industry-slug}.json`
- Magazine header: 3 cascading selectors (Region › Country › Industry) with slot-machine spinners
- `window.history.replaceState` for seamless country/industry switching (no remount)
- PDF generation: jsPDF with dark theme, cover page, section headers
- Company logos: Google favicons (`https://www.google.com/s2/favicons?domain=...&sz=64`)
- Data sanitizer in `/api/data`: auto-fixes string→number, 1-based→0-based indices, auto-generates missing logo_urls

## Data Available

- **US Communications & Media** (dummy data)
- **US Chemicals & Natural Resources** (real AlphaSense PDF)
- **Canada Banking** (real AlphaSense data)
- **Canada All Industries** (aggregate)

## Spec Documents

- `AGENTIC_PIPELINE_SPEC.md` — Phase 3 multi-agent pipeline technical spec with full prompts
- `AGENTIC_PIPELINE_README.md` — Executive overview of the agentic vision
- `ALPHASENSE_API_SPEC.md` — AlphaSense API integration spec (auth, endpoints, modes)
- `AlphaSense_Builder_Handoff.md` — Text-to-JSON conversion approaches
- `AlphaSense_JSON_Pipeline_Developer_Spec.md` — PDF extraction pipeline
- `PROJECT_MEMORY.md` — Full project context and history
