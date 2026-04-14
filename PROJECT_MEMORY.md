# Accenture Compass -- Project Memory

> **Purpose:** Complete context dump for migrating to a new Claude workspace. This file captures everything a new Claude instance needs to know to continue development without loss of context.
> **Last updated:** 2026-04-14
> **Author:** Luis A. Perozo (with Claude)

---

## 1. What Is This Project?

**Accenture Compass** is an interactive strategic intelligence platform built for Accenture. It lets leadership explore global business data through two navigation paradigms:

- **Regional Lens** -- World map -> Region -> Country -> Topics (Talent, Industries, Financials, Macro)
- **Industry Lens** -- Sector grid -> Global industry -> Region -> Country for a specific industry

The drill-down model: click a country -> dashboard, click an industry -> company rankings, click a company -> client profiles. Smooth transitions throughout via Framer Motion.

---

## 2. Current State & Version

- **Version:** 0.1.0 (Phase 1 -- Canada vertical only)
- **Phase 1 Scope:** Canada is the only "deep data" country. All other countries show "Coming soon" on the world map.
- **Data source:** Static JSON files in `src/data/` (no database yet)
- **Deployment:** Local development only (no production deployment configured)

---

## 3. Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| Next.js | 16.2.3 | App Router, SSR/SSG framework |
| React | 19.2.4 | UI library |
| TypeScript | ^5 | Type safety |
| Tailwind CSS | v4 | Utility-first styling (used in some components) |
| Framer Motion | ^12.38 | Page transitions, animations |
| D3-geo | ^3.1.1 | World map projection (Natural Earth) |
| topojson-client | ^3.1.0 | TopoJSON to GeoJSON conversion for map |
| Recharts | ^3.8.1 | Chart library (available but some charts use raw Canvas) |
| Zustand | ^5.0.12 | Global state management |
| jsPDF | ^4.2.1 | PDF report generation |
| html2canvas | ^1.4.1 | Screen capture for reports |
| xlsx | ^0.18.5 | Excel file parsing for admin uploads |
| Lucide React | ^1.7.0 | Icon library |
| Material Symbols | via Google Fonts CDN | Additional icons (used in landing + Canada dashboard) |

---

## 4. Design System -- Stitch

Accenture's internal design language called "Stitch." Reference designs are in `stitch/` folder (HTML mockups + screenshots).

### Color Tokens (Dark Mode -- Default)

```
Primary:         #A100FF (bright purple) -- used as signature accent
Primary Deep:    #8300ca (deep purple) -- PDF reports, secondary purple
Primary Light:   rgba(161,0,255,.08) -- subtle backgrounds
Emerald:         #34d399 -- positive metrics, growth indicators
Red:             #f87171 -- negative metrics, high severity
Blue:            #60a5fa -- EMEA region, secondary accent
Amber:           #fbbf24 -- medium severity warnings
Background:      #0a0a0a -- app background
Surface 1:       rgba(255,255,255,.03) -- card backgrounds
Surface 2:       rgba(255,255,255,.06) -- borders, dividers
Surface 3:       rgba(255,255,255,.1) -- stronger borders
Text Primary:    #fff
Text Secondary:  rgba(255,255,255,.5)
Text Tertiary:   rgba(255,255,255,.25)
Text Quaternary: rgba(255,255,255,.12)
```

### Design Rules (Critical -- DO NOT violate)

1. **NO 1px solid borders** for sectioning -- use background color shifts
2. **NO standard drop shadows** -- use Ambient Bloom: `0 12px 40px rgba(26,28,28,0.06)`
3. **Glass morphism** for floating elements: `backdrop-filter: blur(20px)`
4. **Purple used surgically** as high-intent highlight, never as a wash
5. **Dark mode is the default**
6. **Inter font** at weights 300-900, letter-spacing varies by element size
7. Cards scale 1.01x on hover with subtle border color shift to purple

### Stitch Reference Mockups (in `stitch/` folder)

| Folder | Description |
|---|---|
| `executive_summary_dashboard/` | Light-mode executive overview (screenshot only) |
| `executive_summary_dashboard_dark_theme/` | Dark-mode version (HTML + screenshot) |
| `executive_summary_hr_added/` | With HR/talent section (HTML + screenshot) |
| `industries_clients_intelligence/` | Industry & client grid layout (HTML + screenshot) |
| `client_profile_biotech_innovations/` | Individual client profile page (HTML + screenshot) |
| `financials_global_revenue_1/` | Financial overview (screenshot only) |
| `financials_global_revenue_2/` | Financial details (HTML + screenshot) |
| `talent_intelligence_dashboard/` | Talent analytics layout (HTML + screenshot) |
| `strategic_pulse/DESIGN.md` | Full design system spec document |

---

## 5. Project Architecture

### Directory Structure

```
compass/
  src/
    app/
      page.tsx              -- Landing page (world map + region selector + KPI strip)
      layout.tsx            -- Root layout (Inter font, Material Symbols, DevToolkit)
      globals.css           -- All CSS (design tokens, layouts, components, animations)
      admin/
        page.tsx            -- Admin page (agent pipeline + manual upload)
      explore/
        canada/
          page.tsx          -- Canada dashboard (6 tabs: Overview, Macro, Trends, Industries, Financials, Talent)
      industries/
        page.tsx            -- Industry Lens (8 sector listing)
      api/
        data/
          route.ts          -- Data CRUD API (GET/POST/PUT, reads from static JSON)
        pipeline/
          route.ts          -- AI pipeline API (simulated 6-stage processing)
    components/
      layout/
        Header.tsx          -- Top nav bar (logo, lens switcher, actions)
        Sidebar.tsx         -- Side navigation (context-aware, Framer Motion animated)
        PageTransition.tsx  -- Animation wrappers (FadeIn, SlideIn, ScaleIn, StaggerChild)
      charts/
        BarChart.tsx        -- Animated bar chart + MiniSparkline component
        DonutChart.tsx      -- Donut chart + ProgressRing component
      map/
        WorldMap.tsx         -- D3-geo interactive world map (standalone component)
      ui/
        StatCard.tsx        -- KPI stat card with trend indicator
        GlassCard.tsx       -- Glass morphism card + GlassCardStrong variant
    lib/
      store.ts             -- Zustand store (lens, sidebar, theme, hover, zoom, activeSection)
      pdfExport.ts         -- Branded PDF generator (cover page, KPIs, tables, rankings)
    data/
      countries/
        canada.json        -- Country overview (population, GDP, Accenture metrics)
      talent/
        canada.json        -- Talent data (headcount, skills, cities, levels, trends)
      industries/
        index.json         -- Global industry listing (8 sectors)
        canada/
          index.json       -- Canada-specific industry data (6 sectors with companies)
      financials/
        canada.json        -- Financial data (revenue, service lines, quarterly, top accounts)
      macro/
        canada.json        -- Macro data (GDP, inflation, risks, opportunities, trends)
      companies/
        canada/
          shopify.json     -- Deep company profile (engagement, projects, contacts)
    types/
      index.ts             -- Full TypeScript interfaces (25+ interfaces)
    DevToolkit.jsx         -- Dev-only element inspector & flag tool
  CLAUDE.md                -- Claude Code instructions
  ALPHASENSE_API_SPEC.md   -- AlphaSense integration specification (Phase 3)
```

### Key Routing

```
/                               -> Landing (world map + region buttons + KPI strip)
/explore/canada                 -> Canada dashboard (6 tabs rendered client-side)
/industries                     -> Industry Lens (8 sector list)
/admin                          -> Admin (agent pipeline + manual upload modes)
/api/data?country=X&topic=Y    -> Data REST API
/api/pipeline                   -> Pipeline job API
```

### State Management (Zustand)

Store at `src/lib/store.ts` manages:
- `lens`: 'regional' | 'industry' -- current navigation paradigm
- `sidebarOpen`: boolean
- `hoveredCountry`: string | null
- `zoomLevel`: number
- `activeSection`: string | null
- `theme`: 'dark' | 'light'

---

## 6. Pages Deep Dive

### Landing Page (`src/app/page.tsx`)
- Full-screen world map using D3-geo Natural Earth projection
- TopoJSON data fetched from CDN: `world-atlas@2/countries-110m.json`
- Three region buttons (Americas/EMEA/APAC) with color coding
- Clicking a region highlights its countries and shows a side panel with stats
- Canada (country ID `124`) is the only clickable country -- others show "Coming soon"
- Region click updates KPI strip with region-specific data
- Canada click triggers zoom animation (SVG transform scale(4)) then navigates after 1s
- All KPI data is hardcoded inline (not from JSON files)
- Global stats: Revenue $64.1B, Headcount 733K+, Countries 48

### Canada Dashboard (`src/app/explore/canada/page.tsx`)
- Sidebar + content layout (`.app` flex container)
- 6 tabs rendered as separate React components: TabOverview, TabMacro, TabTrends, TabIndustries, TabFinancials, TabTalent
- KPI strip always visible below header
- **TabOverview:** Navigation cards (horizontal scroll), 5-year revenue chart (Canvas), sector revenue bars, top 10 clients list, AI insight card
- **TabMacro:** Canada vs US GDP chart (Canvas with bezier curves), 4 macro KPIs
- **TabTrends:** Challenges (4 cards) + Opportunities (4 cards) side-by-side, sector watch horizontal cards, emerging trends accordions (6 items)
- **TabIndustries:** Sector rows + client list with modal popups
- **TabFinancials:** Revenue trend, service line breakdown, quarterly comparison
- **TabTalent:** Headcount metrics, skills breakdown, city density, level pyramid
- Client modal shows detailed profile: score, CEO, HQ, projects, team members
- Revenue charts use raw HTML Canvas (not Recharts)
- Intersection Observer animations (`.fu` class -> `.v` class on visible)

### Industry Lens Page (`src/app/industries/page.tsx`)
- Lists 8 global industry sectors
- Each row: icon, name, description, countries active, market share, revenue, growth
- Material Symbols icons, color-coded per industry
- No drill-down implemented yet (no `/industries/[slug]` page built)

### Admin Page (`src/app/admin/page.tsx`)
- Two modes: Agent (AI pipeline) and Manual (file upload)
- **Agent Mode:** Drag-and-drop zone for documents, triggers simulated 6-stage pipeline (Parse -> Classify -> Extract -> Cluster -> Validate -> Stage), shows progress in sidebar
- **Manual Mode:** File upload with xlsx parsing, multi-select target schemas (8 types: revenue-trend, client-group, top-clients, talent-headcount, etc.), column mapping UI with auto-match, preview table, "Update Website" button (currently shows alert only)
- Pipeline status panel shows real-time stage progression
- API endpoint info panel when no active job

---

## 7. API Endpoints

### Data API (`/api/data`)
- **GET** `?country=canada&topic=talent` -- reads from `src/data/{topic}/{country}.json`
- **POST** `{ country, topic, data }` -- writes JSON to data files
- **PUT** `{ snapshot: { country, period, topics: {...} } }` -- bulk update multiple topics
- Topics: overview, talent, industries, financials, macro

### Pipeline API (`/api/pipeline`)
- **POST** `{ documentName }` -- creates job, runs simulated pipeline
- **GET** `?id=job_xxx` -- returns job status
- **GET** (no id) -- returns all jobs
- In-memory job store (Map), not persistent
- Simulated pipeline: 6 stages, ~1.5-2.5s each, returns mock extracted data

---

## 8. Data Model (TypeScript Interfaces)

Key types defined in `src/types/index.ts`:

**Geographic:** Country, CountryOverview, Region
**Talent:** TalentData, SkillCategory, LevelBand, CityTalent, TrendPoint
**Industries:** Industry, IndustryCountryData, CompanySummary
**Companies:** Company, EngagementSummary, Client, ProjectSummary, ContactSummary
**Financials:** FinancialData, ServiceLine, QuarterlyRevenue, AccountRevenue
**Macro:** MacroData, MacroIndicator, MacroTrend, RiskItem, OpportunityItem
**Navigation:** LensMode ('regional' | 'industry'), NavigationState, Breadcrumb
**Pipeline:** DataSnapshot, PipelineJob (with full status enum)

---

## 9. Canada Data Summary (Phase 1)

### Key Metrics
- Revenue: $1.8B CAD (+9.4% YoY)
- Headcount: 12,500 (+8.2%)
- Utilization: 87.2% (+1.4pts)
- Active Clients: 284 (+14 new)
- Operating Margin: 16.2%
- Bookings: $2.1B, Pipeline: $3.4B

### Top Clients
1. Royal Bank of Canada -- $68M (+12%)
2. Government of Canada -- $62M (+18%)
3. TD Bank Group -- $54M (+8%)
4. Shopify -- $48M (+24%)
5. Suncor Energy -- $42M (+6%)

### Industries (Canada Revenue)
1. Technology -- $520M (+14.2%)
2. Financial Services -- $410M (+8.6%)
3. Energy & Resources -- $320M (+6.1%)
4. Public Services -- $280M (+11.8%)
5. Health & Life Sciences -- $170M (+19.4%)
6. Communications & Media -- $100M (+5.3%)

### Service Lines
1. Technology -- $630M (35%) +12.8%
2. Strategy & Consulting -- $360M (20%) +7.4%
3. Operations -- $324M (18%) +8.1%
4. Interactive (Song) -- $270M (15%) +15.2%
5. Security -- $216M (12%) +22.6%

### Talent Distribution
- Toronto: 5,200 | Montreal: 2,800 | Ottawa: 1,500 | Vancouver: 1,200
- Calgary: 800 | Edmonton: 400 | Winnipeg: 300 | Halifax: 200 | KW: 100
- Top skills: Cloud (22.4%), Data (15.2%), AI/ML (13.2%, +34% growth)

### Strategic Landscape
**Challenges:** Housing affordability, US trade tensions, tech sector rationalization, interest rate uncertainty
**Opportunities ($310M+ total):** AI/ML advisory ($120M+), Federal cloud migration ($85M+), Energy transition ($60M+), Open banking ($45M+)
**Trends:** AI Corridor expansion, Green energy transition, Digital government, Open banking, Critical minerals, Talent reinvention

---

## 10. Planned Phases (Roadmap)

### Phase 1 (Current) -- Canada Vertical
- Static JSON data
- Canada as the only deep-data country
- World map with region highlighting
- Admin with simulated pipeline

### Phase 2 -- Database & Multi-Country
- Supabase PostgreSQL + Prisma ORM
- Add more countries (US, UK, India likely next)
- Real data persistence
- Admin CRUD that writes to database

### Phase 3 -- Agentic Pipeline + AlphaSense
- Claude API integration for document ingestion (real pipeline)
- BullMQ job queue for async processing
- AlphaSense API integration for market intelligence (see `ALPHASENSE_API_SPEC.md`)
  - Chatbot: natural language queries -> structured insights
  - Admin: scheduled/manual intelligence gathering
  - Shared canonical schema: Key Challenges, Strategic Opportunities, Emerging Trends
  - OAuth2 auth, GraphQL endpoint, GenSearch modes (fast/auto/thinkLonger/deepResearch)
  - Server-side only (credentials must not be in browser)

---

## 11. AlphaSense Integration (Phase 3 Spec)

A detailed spec exists at `ALPHASENSE_API_SPEC.md` (v2, 2026-04-13). Key points:

- **Endpoints:** Auth POST `/auth`, GraphQL POST `/gql`
- **Auth:** OAuth2 password grant, 24h token, no refresh token
- **Modes:** fast (30s/10 credits), auto (30-90s/10 credits), thinkLonger (60-90s/25 credits), deepResearch (12-15min/100 credits)
- **Filters:** countries (ISO 2-letter), industries (GICS codes), date presets
- **Output:** Markdown with citations, must be normalized to canonical JSON schema
- **Internal endpoints planned:** POST /api/intel/query, POST /api/intel/admin/run, GET /api/intel/jobs/:id, GET /api/intel/snapshots
- **Canonical response schema:** scope, summary, keyChallenges[], strategicOpportunities[], emergingTrends[], meta
- **Delivery estimate:** 4 phases totaling 10-18 days

---

## 12. CSS Architecture

All styles are in `src/app/globals.css` (single file, ~236 lines). Key patterns:

- CSS custom properties for design tokens (`--p`, `--bg`, `--s1`, `--t2`, etc.)
- Class-based component styles (`.kpi`, `.srow`, `.cl-row`, `.tr-item`, `.hcard`, etc.)
- Animation classes: `.fu` (fade-up, activated by adding `.v` class via IntersectionObserver)
- Layout classes: `.app`, `.side`, `.wrap`, `.cnt`, `.bar`
- Some components also use Tailwind classes directly (Header, Sidebar, GlassCard, StatCard)
- **Mixed approach:** Landing page and Canada dashboard use globals.css classes; newer components (Header, Sidebar, chart components) use Tailwind

---

## 13. DevToolkit

A development-only floating tool (`src/DevToolkit.jsx`):
- Purple button in bottom-right corner
- "Inspect Element" mode: crosshair cursor, highlights hovered elements
- Click to capture: shows element selector, chain, position, content
- Flag elements with type (Bug/Enhancement/Request/Issue) and notes
- Copy all flags as a text report
- Persists to localStorage
- Only renders in development mode

---

## 14. Known Patterns & Conventions

1. **Animations:** IntersectionObserver + `.fu`/`.v` classes for scroll-triggered fade-ups
2. **Charts:** Mix of Canvas (revenue trend, macro) and Framer Motion (BarChart, DonutChart)
3. **Icons:** Material Symbols (via `<span className="ms">icon_name</span>`) on older pages, Lucide React on newer components
4. **Navigation:** `useRouter().push()` for all page transitions
5. **State:** Zustand store for global state, React `useState` for local UI state
6. **Font loading:** Google Fonts CDN links in `layout.tsx` head
7. **Map data:** Fetched from CDN at runtime (`cdn.jsdelivr.net/npm/world-atlas@2`)
8. **PDF export:** `generateCanadaReport()` in `pdfExport.ts` creates branded dark-theme Accenture PDF

---

## 15. User Context

- **User:** Luis A. Perozo
- **Role:** Building this platform (developer + product owner)
- **Workspace:** `C:\Users\luis.a.perozo\Documents\Claude Projects\Accenture Compass\`
- **Migration target:** Claude Enterprise workspace (reason this file exists)
- **Working style:** Iterative development with Claude Code, uses DevToolkit for QA flagging

---

## 16. What's Not Built Yet

- [ ] Individual country sub-pages for topics (e.g., `/explore/canada/talent` as separate route -- currently tabs)
- [ ] Industry Lens drill-down (`/industries/[slug]` page)
- [ ] Region pages (Americas/EMEA/APAC overview pages)
- [ ] Database integration (Phase 2)
- [ ] Real pipeline processing (Phase 2-3)
- [ ] AlphaSense integration (Phase 3)
- [ ] Chatbot interface for natural language queries
- [ ] Light mode theme (CSS tokens exist but not fully implemented)
- [ ] Search functionality (button exists, no logic)
- [ ] "Generate Report" button in sidebar (calls `generateCanadaReport` from header only)
- [ ] Multi-country support (only Canada has data files)
- [ ] Authentication / role-based access
- [ ] Responsive / mobile layout

---

## 17. File-by-File Reference

| File | Lines | What It Does |
|---|---|---|
| `src/app/page.tsx` | ~313 | Landing: world map, regions, KPIs, zoom navigation |
| `src/app/explore/canada/page.tsx` | ~500+ | Canada dashboard: 6 tabbed sections, charts, client modal |
| `src/app/industries/page.tsx` | ~69 | Industry listing: 8 sectors with metrics |
| `src/app/admin/page.tsx` | ~414 | Admin: agent pipeline + manual upload |
| `src/app/layout.tsx` | ~23 | Root layout: fonts, DevToolkit |
| `src/app/globals.css` | ~236 | All design tokens + component styles |
| `src/app/api/data/route.ts` | ~141 | Data CRUD: GET/POST/PUT for JSON files |
| `src/app/api/pipeline/route.ts` | ~134 | Pipeline: simulated 6-stage processor |
| `src/lib/store.ts` | ~47 | Zustand: lens, sidebar, theme, hover state |
| `src/lib/pdfExport.ts` | ~358 | PDF: branded cover, KPIs, tables, rankings |
| `src/types/index.ts` | ~288 | All TypeScript interfaces |
| `src/components/layout/Header.tsx` | ~123 | Header: logo, lens switcher, actions |
| `src/components/layout/Sidebar.tsx` | ~119 | Sidebar: context-aware nav |
| `src/components/layout/PageTransition.tsx` | ~126 | Animation wrappers |
| `src/components/charts/BarChart.tsx` | ~117 | BarChart + MiniSparkline |
| `src/components/charts/DonutChart.tsx` | ~139 | DonutChart + ProgressRing |
| `src/components/ui/StatCard.tsx` | ~77 | KPI stat card |
| `src/components/ui/GlassCard.tsx` | ~67 | Glass morphism card |
| `src/components/map/WorldMap.tsx` | ~241 | D3-geo world map (standalone) |
| `src/DevToolkit.jsx` | ~195 | Dev-only element inspector |
| `CLAUDE.md` | ~101 | Claude Code project instructions |
| `ALPHASENSE_API_SPEC.md` | ~463 | Phase 3 AlphaSense integration spec |
