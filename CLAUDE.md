# Accenture Compass — Claude Code Instructions

## Project Overview

Accenture Compass is an interactive strategic intelligence platform. Users explore global data through two lenses:
- **Regional Lens** — World map → Region → Country → Topics (Talent, Industries, Financials, Macro)
- **Industry Lens** — Sector grid → Global → Region → Country for a specific industry

Every interaction drills deeper. Click a country → dashboard. Click an industry → company rankings. Click a company → client profiles. Smooth Framer Motion transitions throughout.

**Current version:** 0.1.0 (Phase 1 — Canada vertical)
**Stack:** Next.js 16 (App Router) + Tailwind v4 + Framer Motion + D3-geo + Recharts + jsPDF
**Design system:** Stitch (Accenture's internal design language)

## Running the App

```bash
npm run dev       # Dev server (default port 3000)
npm run build     # Production build
npm run start     # Start production server
```

## Architecture

| Path | Role |
|------|------|
| `src/app/page.tsx` | Landing — World map + dual lens selector |
| `src/app/explore/` | Regional Lens — country dashboards |
| `src/app/industries/` | Industry Lens — sector intelligence |
| `src/app/admin/` | Developer back-office — data management |
| `src/app/api/data/` | Data API — CRUD for all entities |
| `src/app/api/pipeline/` | AI pipeline API — document processing |
| `src/components/map/` | D3-geo world map with interactive countries |
| `src/components/charts/` | BarChart, DonutChart, Sparkline, ProgressRing |
| `src/components/layout/` | Header, Sidebar, PageTransition animations |
| `src/components/ui/` | StatCard, GlassCard — reusable UI primitives |
| `src/lib/store.ts` | Zustand state (lens, sidebar, theme, selections) |
| `src/lib/pdfExport.ts` | Branded Accenture-style PDF report generator |
| `src/data/` | Static JSON data files (Phase 1) |
| `src/types/` | Full TypeScript interfaces |

## Design System — Stitch (DO NOT deviate)

```
Primary:       #8300ca (deep purple)
Primary Bright: #a600ff
Primary Fixed:  #f3daff
Surface:        #f9f9f9  (light) / #09090b (dark)
On Surface:     #1a1c1c  (light) / #fafafa (dark)
Font:           Inter (300-900)
```

**Key rules:**
- NO 1px solid borders — use background color shifts
- NO drop shadows — use Ambient Bloom: `0 12px 40px rgba(26,28,28,0.06)`
- Glass morphism for floating elements: `backdrop-filter: blur(20px)`
- Purple used surgically as high-intent highlight, never as wash
- Dark mode is default

## Route Map

```
/                           → Landing (world map + lens selector)
/explore/canada             → Canada dashboard
/explore/canada/talent      → Talent intelligence
/explore/canada/industries  → Industry rankings
/explore/canada/industries/[id]  → Industry detail + company list
/explore/canada/financials  → Financial performance
/explore/canada/macro       → Macroeconomic & trends
/industries                 → Industry Lens (all sectors)
/industries/[slug]          → Global industry view + country breakdown
/admin                      → Data management + pipeline
/api/data                   → Data CRUD API
/api/pipeline               → Document processing pipeline
```

## Data Flow

Phase 1: Static JSON files in `src/data/`
Phase 2: Supabase PostgreSQL + Prisma ORM
Phase 3: Agentic pipeline (Claude API) for document ingestion

### API Endpoints

```
GET  /api/data?country=canada&topic=talent  → Fetch data
POST /api/data { country, topic, data }     → Update data
PUT  /api/data { snapshot: {...} }          → Bulk quarterly update
POST /api/pipeline { documentName }         → Submit doc to AI pipeline
GET  /api/pipeline?id=job_xxx               → Check pipeline status
```

## Key Conventions

- All animations use Framer Motion (not CSS transitions for page-level)
- Chart animations: staggered delays with cubic-bezier(0.4, 0, 0.2, 1)
- Color values are inline (not Tailwind classes) when dynamic
- Lucide React for all icons
- Zustand for global state (no Redux, no Context)
- Inter font at weights 300-900, letter-spacing varies by size
