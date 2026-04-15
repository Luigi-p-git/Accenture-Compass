# Accenture Compass — Claude Code Instructions

## Project Overview

Accenture Compass is an interactive strategic intelligence platform with two main experiences:
- **Compass Dashboard** — World map → Region → Country → Topics (Talent, Industries, Financials, Macro, Trends)
- **AccSense Magazine** — Interactive editorial intelligence report powered by AlphaSense data

**Current version:** 0.3.0 (Phase 1 complete + AccSense Magazine + AlphaSense Pipeline)
**Stack:** Next.js 16 (App Router) + Tailwind v4 + Framer Motion 12.38 + D3-geo + Recharts + jsPDF + pdf-parse + clsx + tailwind-merge
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
| `src/app/industries/` | Industry Lens — sector intelligence |
| `src/app/admin/` | Admin — pipeline + manual upload + AlphaSense Mode |
| `src/app/api/data/` | Data API — CRUD (topics: overview, talent, industries, financials, macro, trends) |
| `src/app/api/alphasense/` | AlphaSense conversion API — text/PDF/JSON → structured findings |
| `src/app/api/extract-images/` | PDF image extractor — chart images for Visual Intelligence |
| `src/app/api/pipeline/` | AI pipeline API — document processing (simulated) |
| `src/components/intelligence/` | HeadlineSelector (3-cascade slot-machine spinner) |
| `src/components/ui/` | StatCard, GlassCard, DrumPicker |
| `src/components/charts/` | BarChart, DonutChart, Sparkline, ProgressRing |
| `src/components/layout/` | Header, Sidebar, PageTransition |
| `src/lib/alphasenseParser.ts` | Dual-mode parser: block + legacy + lenient (no AI needed) |
| `src/lib/intelligenceReport.ts` | PDF report generator (jsPDF, dark theme) |
| `src/lib/utils.ts` | cn() utility (clsx + tailwind-merge) |
| `src/lib/store.ts` | Zustand state (lens, sidebar, theme) |
| `src/lib/pdfExport.ts` | Branded Accenture PDF generator (older) |
| `src/data/` | Static JSON data files |
| `src/data/trends/{country}/{industry}.json` | AlphaSense-generated intelligence data per country+industry |
| `src/types/` | Full TypeScript interfaces (AlphaSense, Trends, News, Financials, etc.) |

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
- Dark mode is default
- NO boxy card layouts — use editorial structural lines, asymmetric grids

**AccSense Magazine design dialect:**
- Editorial broadsheet style (NEWGAZINE-inspired)
- Structural white 2px lines, asymmetric grids (5/7, 7/5, 2/1)
- Ghost watermark text (> symbol, section names)
- Master-detail layout for Trends (hover left → detail expands right)
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
/admin                               → Data management + AlphaSense Mode
/api/data                            → Data CRUD API (supports ?industry= for trends)
/api/alphasense                      → AlphaSense text/PDF/JSON conversion
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
POST /api/data { country, topic, data, industry }
POST /api/alphasense (FormData PDF or JSON { text } or { json })
POST /api/extract-images (FormData PDF + country + industry)
```

### Data Storage Pattern
```
src/data/trends/{country}/{industry-slug}.json
src/data/trends/canada/all-industries.json
src/data/trends/canada/banking-capital-markets.json
public/visuals/{country}/{industry}/chart-1.jpeg
```

## AlphaSense Pipeline (No API Keys Required)

1. Admin → Manual → AlphaSense Mode ON
2. Configure region/country/industry/timeframe → prompt generated
3. Copy prompt → run in AlphaSense Deep Research
4. Paste output (text/PDF/JSON) → Convert to JSON
5. Parser: block format → legacy numbered → lenient (3 fallback levels)
6. Extracts: findings, financial highlights, news items, companies affected
7. Select country + industry → Update Website
8. Optional: Upload PDF for chart image extraction (Visual Intelligence)
9. Magazine reads data and renders all sections

## AccSense Magazine Sections

| Section | Description | Data Source |
|---------|-------------|------------|
| Hero | THE {COUNTRY} OUTLOOK headline, map, key metrics, synthesis | TrendsData |
| Emerging Trends | Master-detail: hover list → expanded card | trends[] |
| Broker Analysis | Magazine crest, paginated article cards, page-turn animation | news_items[] |
| Opportunities | Horizontal scroll vertical cards | opportunities[] |
| Visual Intelligence | Extracted chart images from PDFs | images[] |
| Key Challenges | 2/1 split with severity sidebar | challenges[] |
| Companies Intelligence | 5-column grid with expandable finding dots | CLIENTS + cross-ref |
| News (Coming Soon) | Newspaper-style section with newsprint texture | Future |

## Key Conventions

- Framer Motion for all animations (cubic-bezier 0.4,0,0.2,1)
- Lucide React for newer components, Material Symbols for older
- Zustand for global state
- Inter font at weights 300-900
- Industry-specific data: files at `trends/{country}/{industry-slug}.json`
- Magazine header: 3 cascading selectors (Region › Country › Industry) with slot-machine spinners
- PDF generation: jsPDF with dark theme, cover page, section headers

## Spec Documents

- `AGENTIC_PIPELINE_SPEC.md` — Phase 3 multi-agent pipeline technical spec with full prompts
- `AGENTIC_PIPELINE_README.md` — Executive overview of the agentic vision
- `ALPHASENSE_API_SPEC.md` — AlphaSense API integration spec (auth, endpoints, modes)
- `AlphaSense_Builder_Handoff.md` — Text-to-JSON conversion approaches
- `AlphaSense_JSON_Pipeline_Developer_Spec.md` — PDF extraction pipeline
- `PROJECT_MEMORY.md` — Full project context and history
