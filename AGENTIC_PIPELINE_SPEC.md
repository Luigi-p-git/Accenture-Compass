# AccSense Agentic Intelligence Pipeline — Technical Specification

Date: 2026-04-15
Status: Draft v1
Author: Luis A. Perozo (with Claude)

---

## 1) Objective

Build a fully automated, multi-agent intelligence pipeline that:

1. Queries AlphaSense API directly (no manual copy-paste)
2. Uses Claude API to structure, enrich, and validate the output
3. Generates publication-ready JSON for the AccSense Magazine
4. Supports one-click report generation and scheduled automation

**End state:** User clicks "Generate Report" in Admin → system makes 3-4 AlphaSense queries → Claude structures everything → Magazine updates automatically. Zero manual intervention.

---

## 2) Current State (Phase 1 — Manual Pipeline)

What exists today:

| Component | Status | How It Works |
|-----------|--------|-------------|
| Prompt Generator | ✅ Built | Admin page generates AlphaSense prompt with country/industry/timeframe parameters |
| Text Converter | ✅ Built | User pastes AlphaSense output → regex parser → JSON → saves to `src/data/trends/{country}/{industry}.json` |
| PDF Chart Extractor | ✅ Built | Upload PDF → extract embedded JPEG/PNG images → save to Visual Intelligence |
| AccSense Magazine | ✅ Built | Dynamic page at `/explore/{country}/intelligence` reads JSON and renders editorial report |
| Data Schema | ✅ Built | `TrendsData` with findings, news, financials, companies, images |

**Pain points the agentic pipeline solves:**

1. Manual copy-paste workflow between AlphaSense and Compass
2. Regex parser breaks on formatting variations
3. No URL validation — AlphaSense may return broken or missing URLs
4. Single monolithic prompt — one query tries to get everything
5. No quality control — garbage in, garbage out
6. No scheduling — reports are generated manually each time

---

## 3) Architecture Overview

```
┌─────────────────────────────────────────────┐
│           ADMIN UI (Trigger)                │
│  "Generate Report" button or Cron schedule  │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│        ORCHESTRATOR (Next.js API Route)     │
│  POST /api/intelligence/generate            │
│  Params: country, industry, timeframe       │
└──────────────────┬──────────────────────────┘
                   │
          ┌────────┼────────┐
          ▼        ▼        ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│ Agent 1  │ │ Agent 2  │ │ Agent 3  │
│ Trends & │ │ Company  │ │ Broker   │
│ Opps &   │ │ Impact & │ │ Research │
│ Chall.   │ │ Financ.  │ │ & News   │
│          │ │          │ │          │
│ Alpha-   │ │ Alpha-   │ │ Alpha-   │
│ Sense    │ │ Sense    │ │ Sense    │
│ Query    │ │ Query    │ │ Query    │
└────┬─────┘ └────┬─────┘ └────┬─────┘
     │            │            │
     └────────┬───┘────────────┘
              ▼
┌─────────────────────────────────────────────┐
│     CLAUDE STRUCTURER (Agent 4)             │
│  Raw AlphaSense text → Perfect JSON         │
│  - Validates schema                         │
│  - Normalizes fields                        │
│  - Extracts structured data                 │
└──────────────────┬──────────────────────────┘
                   ▼
┌─────────────────────────────────────────────┐
│     CLAUDE ENRICHER (Agent 5)               │
│  - Validates URLs (HEAD request check)      │
│  - Cross-references companies to findings   │
│  - Generates editorial synthesis            │
│  - Assigns quality/confidence scores        │
│  - Fills missing fields                     │
└──────────────────┬──────────────────────────┘
                   ▼
┌─────────────────────────────────────────────┐
│     STORAGE & NOTIFICATION                  │
│  - Saves to src/data/trends/{country}/      │
│  - Triggers magazine page refresh           │
│  - Sends notification (email/Slack)         │
└─────────────────────────────────────────────┘
```

---

## 4) Agent Specifications

### Agent 1: Strategic Intelligence Query

**Purpose:** Fetch Emerging Trends, Strategic Opportunities, and Key Challenges.

**AlphaSense API Call:**
```
POST /gql
Mode: deepResearch
Query: "Comprehensive strategic intelligence brief for {country} {industry} 
        covering emerging trends, strategic opportunities, and key challenges 
        from the past {timeframe}. Include specific data points, company names, 
        dollar figures, and source citations."
Filters:
  - countries: ["{ISO-2 code}"]
  - industries: ["{GICS code}"] (if specific industry)
  - datePreset: "{6m|12m|24m}"
```

**Expected Output:** 15-24 findings with descriptions, impact levels, timeframes, source citations.

**Cost:** ~10-100 AlphaSense credits depending on mode (auto vs deepResearch)

---

### Agent 2: Company Impact & Financial Metrics

**Purpose:** Fetch company-specific impact data and key financial metrics.

**AlphaSense API Call:**
```
POST /gql
Mode: auto (faster, cheaper)
Query: "For {country} {industry}: 
        1) List the top 10 most affected companies with specific revenue impact, 
           market position changes, and strategic responses. For each company, 
           state whether the impact is positive, negative, or neutral with 
           specific dollar figures.
        2) List 10-12 key macroeconomic and market metrics with current values, 
           previous values, and percentage changes."
Filters: same as Agent 1
```

**Expected Output:** Company impact list + financial metrics table.

**Cost:** ~10 credits

---

### Agent 3: Broker Research & News Sources

**Purpose:** Fetch analyst reports, earnings transcripts, and news articles with URLs.

**AlphaSense API Call:**
```
POST /gql
Mode: auto
Query: "List the 15 most important and recent analyst reports, earnings call 
        transcripts, regulatory filings, and news articles about {country} 
        {industry} from the past {timeframe}. For each: provide the document 
        title, publishing organization, document type, publication date, a 
        2-sentence summary of the key finding, and the direct URL or hyperlink 
        to the source document."
Filters: same as Agent 1
```

**Expected Output:** 10-15 news items with headlines, summaries, source org, type, date, URLs.

**Cost:** ~10 credits

---

### Agent 4: Claude Structurer

**Purpose:** Transform raw AlphaSense text into perfect JSON matching our schema.

**Claude API Call:**
```
POST /v1/messages
Model: claude-sonnet-4-20250514
System: "You are a data extraction engine. Transform the following AlphaSense 
         research output into strict JSON matching the provided schema. 
         Return ONLY valid JSON."
User: "{raw AlphaSense output from Agents 1-3}"
      + "{exact JSON schema with field definitions}"
Max tokens: 8192
```

**Why Claude, not regex:**
- Handles any formatting variation AlphaSense produces
- Understands context (can infer missing fields)
- Validates data consistency (counts match arrays)
- Near-perfect extraction every time
- Cost: ~$0.02 per structuring call

**Output:** `AlphaSensePayload` JSON matching our TypeScript schema exactly.

---

### Agent 5: Claude Enricher

**Purpose:** Validate, enrich, and enhance the structured data.

**Tasks:**
1. **URL Validation** — For each `source.url` and `news_item.url`, make a HEAD request to verify the URL resolves (2xx status). Mark invalid URLs as null.
2. **Company Cross-Reference** — Match `affected_companies` in findings against the Accenture client database. Flag which Accenture clients are impacted.
3. **Editorial Synthesis** — Generate a polished 3-5 sentence executive synthesis that connects cross-cutting themes and references specific findings by number.
4. **Quality Scoring** — Assign each finding a confidence score (0-100) based on: source quality (primary > secondary), data specificity (numbers > vague claims), recency.
5. **Missing Data Fill** — If a finding has no impact level, infer from description. If no timeframe, infer from context.
6. **Icon Mapping** — Assign Material Symbol icons based on content analysis (more accurate than keyword regex).

**Claude API Call:**
```
POST /v1/messages
Model: claude-sonnet-4-20250514
System: "You are a data quality and enrichment engine..."
User: "{structured JSON from Agent 4}" + "{enrichment instructions}"
Max tokens: 4096
```

**Cost:** ~$0.01-0.03 per enrichment call

---

## 5) API Route Design

### POST /api/intelligence/generate

**Request:**
```json
{
  "country": "canada",
  "industry": "banking-capital-markets",
  "timeframe": "12m",
  "mode": "full" | "refresh" | "quick"
}
```

**Modes:**
- `full` — Run all 5 agents, deep research (~2-3 minutes, ~$0.15-0.50)
- `refresh` — Only re-query news/financials, keep existing findings (~30 seconds, ~$0.05)
- `quick` — Use AlphaSense `auto` mode for all queries, skip enrichment (~15 seconds, ~$0.03)

**Response (streamed via Server-Sent Events):**
```
event: status
data: {"agent": 1, "status": "querying", "message": "Fetching strategic intelligence..."}

event: status
data: {"agent": 1, "status": "complete", "findings": 18}

event: status
data: {"agent": 4, "status": "structuring", "message": "Claude is structuring data..."}

event: complete
data: {"success": true, "totalFindings": 18, "newsItems": 12, "financials": 10}
```

The Admin UI shows a live progress tracker as each agent completes.

---

## 6) AlphaSense API Integration Details

### Authentication
```
POST https://api.alpha-sense.com/auth
Content-Type: application/x-www-form-urlencoded

grant_type=password
&client_id={ALPHASENSE_CLIENT_ID}
&username={ALPHASENSE_USERNAME}
&password={ALPHASENSE_PASSWORD}

Response: { "access_token": "...", "expires_in": 86400 }
```

- Token valid 24 hours, no refresh token
- Store in memory, re-auth on expiry
- Server-side ONLY — credentials never in browser

### GenSearch Query
```
POST https://api.alpha-sense.com/gql
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "query": "mutation { genSearch(input: { query: \"...\", mode: \"deepResearch\", filters: { countries: [\"CA\"], datePreset: \"12m\" } }) { id status result { content citations { title url } } } }"
}
```

### GenSearch Modes & Costs

| Mode | Time | Credits | Best For |
|------|------|---------|----------|
| fast | ~30s | 10 | Quick fact checks |
| auto | 30-90s | 10 | Balanced queries |
| thinkLonger | 60-90s | 25 | Complex analysis |
| deepResearch | 12-15min | 100 | Comprehensive reports |

**Recommendation:** Use `deepResearch` for Agent 1 (main findings), `auto` for Agents 2-3 (structured data).

---

## 7) Claude API Integration Details

### Message Call
```
POST https://api.anthropic.com/v1/messages
x-api-key: {ANTHROPIC_API_KEY}
anthropic-version: 2023-06-01
Content-Type: application/json

{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 8192,
  "system": "...",
  "messages": [{ "role": "user", "content": "..." }]
}
```

### Prompt Caching
- Use prompt caching for the system prompt (schema definition) — saves ~90% on repeated calls
- Cache key: hash of system prompt + schema version
- TTL: 5 minutes (Anthropic default)

### Cost Estimates

| Operation | Input Tokens | Output Tokens | Cost |
|-----------|-------------|---------------|------|
| Structuring (Agent 4) | ~4,000 | ~6,000 | ~$0.02 |
| Enrichment (Agent 5) | ~6,000 | ~3,000 | ~$0.02 |
| **Total per report** | | | **~$0.04** |

---

## 8) Scheduling & Automation

### Cron-Based Reports
```
Schedule options:
- Weekly (every Monday 6am UTC)
- Bi-weekly
- Monthly (1st of month)
- Quarterly
```

**Implementation:** Next.js API route triggered by external cron (Vercel Cron, GitHub Actions, or internal scheduler).

### Configuration (per country/industry pair)
```json
{
  "country": "canada",
  "industry": "banking-capital-markets",
  "schedule": "weekly",
  "mode": "full",
  "notify": ["luis.perozo@accenture.com"],
  "autoPublish": true
}
```

### Notification
- On completion: email summary with finding counts + link to magazine
- On failure: email error details + retry link
- Optional: Slack webhook integration

---

## 9) Environment Variables

```env
# AlphaSense
ALPHASENSE_CLIENT_ID=
ALPHASENSE_USERNAME=
ALPHASENSE_PASSWORD=

# Claude / Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Optional: Notifications
NOTIFICATION_EMAIL=
SLACK_WEBHOOK_URL=
```

All stored in `.env.local` (git-ignored). Server-side only — never exposed to browser.

---

## 10) Data Flow: Current vs Agentic

### Current (Manual)
```
User → Copy prompt → AlphaSense website → Copy output → Paste in Admin → 
Convert (regex) → Fix errors → Save → Navigate to magazine
Time: ~15-20 minutes per report
```

### Agentic (Automated)
```
User clicks "Generate" → Orchestrator → 3 parallel AlphaSense queries → 
Claude structures → Claude enriches → Auto-save → Magazine updates
Time: ~2-3 minutes (deepResearch) or ~30 seconds (quick)
```

### Scheduled (Zero-touch)
```
Cron trigger → Orchestrator → AlphaSense → Claude → Save → Email notification
Time: 0 minutes of human time
```

---

## 11) Implementation Phases

### Phase 3a: Claude API Integration (~3 days)
- Install `@anthropic-ai/sdk`
- Create `/api/intelligence/structure` route — takes raw text, returns perfect JSON
- Replace regex parser with Claude structurer for the "Convert to JSON" button
- Keep regex as offline fallback (no API key)
- Add `.env.local` setup

### Phase 3b: AlphaSense API Integration (~5 days)
- Implement AlphaSense auth flow (token management)
- Create `/api/intelligence/query` route — makes GenSearch calls
- Build the 3-agent query system (parallel execution)
- Add "Generate Report" one-click button in Admin
- Live progress tracker UI

### Phase 3c: Enrichment & Quality (~3 days)
- URL validation agent (HEAD requests)
- Claude enrichment agent (synthesis, scoring, cross-reference)
- Quality dashboard in Admin showing confidence scores
- Error handling and retry logic

### Phase 3d: Scheduling (~2 days)
- Cron configuration UI in Admin
- Scheduled execution via API route
- Email/Slack notifications
- Auto-publish toggle
- History/versioning of past reports

**Total estimated: 10-13 days**

---

## 12) Cost Analysis (Per Report)

| Component | Credits/Tokens | Cost |
|-----------|---------------|------|
| AlphaSense deepResearch (Agent 1) | 100 credits | ~$1.00* |
| AlphaSense auto x2 (Agents 2-3) | 20 credits | ~$0.20* |
| Claude structuring (Agent 4) | ~10K tokens | ~$0.02 |
| Claude enrichment (Agent 5) | ~9K tokens | ~$0.02 |
| **Total per full report** | | **~$1.24** |

*AlphaSense credit costs depend on subscription tier.

For a weekly report across 5 country/industry combinations: ~$6.20/week = ~$25/month.

---

## 13) Files To Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/app/api/intelligence/generate/route.ts` | **Create** | Orchestrator endpoint |
| `src/app/api/intelligence/query/route.ts` | **Create** | AlphaSense query wrapper |
| `src/app/api/intelligence/structure/route.ts` | **Create** | Claude structurer |
| `src/app/api/intelligence/enrich/route.ts` | **Create** | Claude enricher |
| `src/lib/alphasenseClient.ts` | **Create** | AlphaSense auth + query client |
| `src/lib/claudeClient.ts` | **Create** | Claude API wrapper with caching |
| `src/app/admin/page.tsx` | Modify | Add "Generate Report" one-click + progress UI |
| `.env.local` | **Create** | API keys |
| `package.json` | Modify | Add `@anthropic-ai/sdk` |

---

## 14) Agent Prompt Library — Production-Ready Prompts

Each agent has a specific, optimized prompt designed for its task. Variables in `{curly braces}` are injected at runtime.

---

### Agent 1 Prompt: Strategic Intelligence (AlphaSense deepResearch)

```
ROLE: You are a senior strategy consultant at a top-tier management consulting firm conducting a comprehensive market intelligence assessment.

MISSION: Produce a thorough, investment-grade strategic intelligence brief for {country}{industry_clause} based on developments from the past {timeframe}.

Your analysis must be sourced exclusively from primary and verified secondary documents: earnings call transcripts, broker research reports, expert interview transcripts, SEC/SEDAR filings, government publications, and credible financial news.

══════════════════════════════════
SECTION 1: EMERGING TRENDS (5-8 findings)
══════════════════════════════════

Identify new or accelerating patterns in technology adoption, regulation, capital flows, labor markets, competitive dynamics, trade policy, or macroeconomic shifts that are actively reshaping {country}{industry_clause}.

For EACH finding, provide:
- A concise, specific title (5-10 words — no generic titles like "Digital Transformation")
- A detailed description (5-8 sentences MINIMUM). You MUST include: specific dollar figures, percentage changes, company names, policy names, dates, and quantitative data points. Vague or generalized descriptions are unacceptable. This is the most critical part of each finding — depth and specificity determine the report's value.
- Impact assessment: High, Medium, or Low — with a one-sentence justification tied to specific market or revenue implications
- Timeframe: Near-term (0-12 months) / Medium-term (1-3 years) / Long-term (3-5+ years)
- Source: The specific document title, publishing organization, document type (Earnings Call / Expert Transcript / Broker Research / Filing / News / Government Publication), and publication date
- Source URL: The direct https:// URL to the source document. For earnings calls, link to the company investor relations or SEC Edgar page. For government publications, link to the .gov/.gc.ca page. For broker research, provide the public insights URL. Only state "NONE" if absolutely no public URL exists.
- Companies Affected: 2-4 companies most impacted, with format: CompanyName (impact: positive/negative/neutral — one sentence with specific revenue or market data explaining the impact)

══════════════════════════════════
SECTION 2: STRATEGIC OPPORTUNITIES (5-8 findings)
══════════════════════════════════

Identify actionable areas where companies, investors, or advisors can capture value in {country}{industry_clause}. Focus on: sector-specific growth pockets, government incentive programs, underserved market segments, infrastructure investment mandates, M&A consolidation plays, partnership models, export diversification, regulatory-driven tailwinds, and technology adoption gaps.

Same detailed format as Section 1. Every finding must include specific addressable market sizes, growth rates, or revenue potential where available.

══════════════════════════════════
SECTION 3: KEY CHALLENGES (5-8 findings)
══════════════════════════════════

Identify material risks, headwinds, and structural barriers affecting {country}{industry_clause}. Focus on: regulatory uncertainty, geopolitical exposure, macroeconomic pressure, talent gaps, supply chain fragility, competitive threats, credit risk, policy reversals, and systemic vulnerabilities.

Same detailed format as Section 1. Every finding must quantify the risk exposure where possible (e.g., "representing $24B or 4% of net outstanding loans").

══════════════════════════════════
SECTION 4: SYNTHESIS
══════════════════════════════════

Write 4-6 sentences connecting the most critical cross-cutting themes across all three sections. Explicitly reference specific findings by their titles. Identify the single most important development that decision-makers should act on immediately. Quantify the overall opportunity-to-risk balance.

══════════════════════════════════
FORMAT RULES
══════════════════════════════════

1. NUMBER every finding sequentially (1, 2, 3...) across ALL sections continuously
2. Every finding MUST have a named, dated, verifiable source — no unsourced claims
3. Every source MUST include a URL where publicly available
4. Descriptions must average 5-8 sentences with specific data in every sentence
5. Prioritize PRIMARY sources: earnings transcripts, expert calls, SEC/SEDAR filings, broker research
6. Include analyst names and direct quotes where they add insight
7. Aim for 18-24 total findings across all three sections
8. Do NOT use generic, vague, or recycled descriptions — every finding must contain unique, specific intelligence
```

**Variables:**
- `{country}` — e.g., "Canada", "United Kingdom"
- `{industry_clause}` — e.g., " in the Banking & Capital Markets sector" or "" (empty for all industries)
- `{timeframe}` — e.g., "12 months", "6 months"

---

### Agent 2 Prompt: Company Impact & Financial Metrics (AlphaSense auto)

```
ROLE: You are a quantitative financial analyst preparing a market data dashboard for {country}{industry_clause}.

TASK 1: COMPANY IMPACT ANALYSIS

Identify the 10-15 companies most significantly affected by current market dynamics in {country}{industry_clause} over the past {timeframe}. For each company, provide:

- Company Name (Ticker Symbol)
- Impact Direction: POSITIVE, NEGATIVE, or NEUTRAL
- Revenue/Market Impact: Specific dollar figures or percentage changes to revenue, market share, stock price, or earnings
- Strategic Response: What the company is doing in response (acquisitions, divestitures, investments, pivots)
- Key Data Point: One specific, quantifiable metric that captures the impact (e.g., "$500M AI investment", "20% workforce reduction", "12% revenue growth in Q1")
- Source: Document title, organization, type, date
- Source URL: Direct https:// link

Rank companies by magnitude of impact (most affected first).

TASK 2: FINANCIAL HIGHLIGHTS DASHBOARD

List exactly 12 key macroeconomic, sector, and market metrics for {country}{industry_clause}. Use this EXACT format for each — one clean line per metric:

- [Metric Name]: [Current Value with unit] ([Change vs prior period])

Examples:
- Real GDP Growth: 1.8% (+0.3pp QoQ)
- Unemployment Rate: 5.8% (-0.2pp YoY)
- Central Bank Policy Rate: 2.25% (-100bps)
- Federal Budget Deficit: CAD$65.4B (-$12.9B)
- Sector Market Cap: $890B (+12.4%)
- Average P/E Ratio: 14.2x (-0.8x)

STRICT RULES FOR FINANCIAL METRICS:
- One metric per line
- Numbers and units ONLY after the colon
- NO descriptions, NO URLs, NO website names, NO domain names after the colon
- Change in parentheses: use pp (percentage points), bps (basis points), % (percent change), or absolute values
- Include YoY, QoQ, or vs prior where applicable
- Source each metric but put the source on a SEPARATE line below if needed, NOT in the metric line itself
```

---

### Agent 3 Prompt: Broker Research & News Sources (AlphaSense auto)

```
ROLE: You are a research librarian and editorial curator assembling a source index for an executive intelligence publication covering {country}{industry_clause}.

TASK: BROKER ANALYSIS & ARTICLE INDEX

Compile the 15 most important, recent, and impactful source documents related to {country}{industry_clause} from the past {timeframe}. These will be published as a "Broker Analysis & Articles" section in our executive magazine.

For EACH source, provide in this EXACT format:

[Number]. [Editorial headline — write a compelling, magazine-worthy headline that captures the key insight, NOT just the document title] — [Publishing Organization], [Document Type], [Publication Date]

Summary: [2-3 sentences summarizing the key finding, including specific data points, analyst names, and direct quotes where available. Make this read like a magazine article teaser that makes executives want to read more.]

URL: [CRITICAL — provide the full https:// URL to the source document. This is MANDATORY for publication credibility.]

Source types to prioritize (in order):
1. Broker Research Reports (Goldman Sachs, JPMorgan, RBC Capital Markets, Jefferies, TD Cowen, etc.)
2. Earnings Call Transcripts (quarterly earnings, investor day presentations)
3. Regulatory Filings (SEC 10-K/10-Q, SEDAR annual reports, OSFI guidelines)
4. Government Publications (central bank reports, budget documents, policy papers)
5. Expert Interview Transcripts (industry expert calls, management commentaries)
6. Major Financial News (Reuters, Bloomberg, Financial Post, WSJ)

URL REQUIREMENTS — THIS IS NON-NEGOTIABLE:
- For earnings calls: https://[company].com/investors/ or https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=[name]
- For press releases: https://www.newswire.ca/ or https://www.globenewswire.com/ or company newsroom URL
- For government: https://www.bankofcanada.ca/ or https://www.osfi-bsif.gc.ca/ or https://[country-domain]
- For broker research: the firm's public research portal URL if available
- For news: the article's direct URL on the publisher's website
- If a document is ONLY available through AlphaSense's proprietary database with no public URL, provide the AlphaSense document title and state "Available via AlphaSense platform" instead of NONE

QUALITY STANDARDS:
- Diverse source types — do not list 15 earnings calls. Mix broker research, filings, government, and news.
- Recency — prioritize sources from the last 3-6 months
- Specificity — headlines must reference specific data, not generic themes
- Include analyst names in summaries where available (e.g., "Jefferies analyst Sarah Chen noted that...")
- Include direct quotes in summaries where impactful
```

---

### Agent 4 Prompt: Claude Structurer (Anthropic API)

```
SYSTEM PROMPT:

You are a precision data extraction engine. You transform unstructured market intelligence text into strict JSON.

You will receive raw text output from three AlphaSense research queries. Your job is to parse ALL of it into a single, unified JSON object matching the schema below EXACTLY. Return ONLY valid JSON — no markdown, no commentary, no explanation.

SCHEMA:
{
  "subject": "string — country or region analyzed",
  "date_generated": "YYYY-MM-DD",
  "total_findings": number,
  "findings": [
    {
      "id": number (sequential, starting from 1),
      "category": "Emerging Trend" | "Strategic Opportunity" | "Key Challenge",
      "finding": "string — the title",
      "description": "string — full description, preserve ALL detail",
      "impact_level": "High" | "Medium" | "Low",
      "timeframe": "Near-term (0-12mo)" | "Medium-term (1-3yr)" | "Long-term (3-5yr+)",
      "source": {
        "document_title": "string",
        "organization": "string",
        "document_type": "string",
        "date": "string",
        "url": "string or null",
        "headline": "string or null"
      },
      "affected_companies": [
        {
          "name": "string",
          "ticker": "string or null",
          "impact": "positive" | "negative" | "neutral",
          "detail": "string — specific impact detail"
        }
      ],
      "key_metrics": [
        { "label": "string", "value": "string", "trend": "up" | "down" | "stable" }
      ]
    }
  ],
  "synthesis": "string — full synthesis text",
  "news_items": [
    {
      "id": number,
      "headline": "string",
      "summary": "string",
      "source_org": "string",
      "date": "string or null",
      "type": "string or null",
      "url": "string or null",
      "related_finding_ids": [number]
    }
  ],
  "financial_highlights": [
    {
      "id": number,
      "metric": "string",
      "current_value": "string — number with unit ONLY, no URLs or text",
      "previous_value": "string or null",
      "change": "string or null",
      "chart_type": "bar",
      "data_points": []
    }
  ],
  "metadata": {
    "emerging_trend_count": number,
    "strategic_opportunity_count": number,
    "key_challenge_count": number,
    "high_impact_count": number,
    "medium_impact_count": number,
    "low_impact_count": number,
    "news_count": number,
    "financial_highlight_count": number
  }
}

RULES:
1. Return ONLY the JSON object. No text before or after.
2. PRESERVE all description text exactly as written — do not summarize or shorten.
3. Normalize impact_level to exactly "High", "Medium", or "Low".
4. Normalize timeframe to exactly "Near-term (0-12mo)", "Medium-term (1-3yr)", or "Long-term (3-5yr+)".
5. Normalize category to exactly "Emerging Trend", "Strategic Opportunity", or "Key Challenge".
6. Strip URLs and domain names from financial_highlights current_value — numbers only.
7. If a source URL starts with "http", include it. Otherwise set to null.
8. Metadata counts MUST match the actual array contents.
9. Number findings sequentially across all categories (1, 2, 3... not restarting per section).
10. If a field is missing or ambiguous in the source text, use null — do not invent data.

USER PROMPT:

Here are three research outputs to parse into a single unified JSON:

--- STRATEGIC INTELLIGENCE (Trends, Opportunities, Challenges) ---
{agent_1_output}

--- COMPANY IMPACT & FINANCIAL METRICS ---
{agent_2_output}

--- BROKER ANALYSIS & NEWS SOURCES ---
{agent_3_output}
```

---

### Agent 5 Prompt: Claude Enricher (Anthropic API)

```
SYSTEM PROMPT:

You are a data quality analyst and editorial director. You will receive a structured JSON intelligence report. Your job is to enrich, validate, and polish it for executive publication.

USER PROMPT:

Here is a structured intelligence report in JSON format:

{structured_json_from_agent_4}

Perform the following enrichment tasks and return the COMPLETE updated JSON:

1. EDITORIAL SYNTHESIS
   Rewrite the "synthesis" field as a polished 4-6 sentence executive summary:
   - Reference specific findings by their titles (not numbers, since readers see titles)
   - Quantify the overall opportunity-to-risk ratio
   - Name the single most important development requiring immediate executive attention
   - Use confident, authoritative consulting language — no hedging words like "might" or "could"
   
2. QUALITY SCORING
   Add a "quality_score" field (0-100) to each finding based on:
   - Source quality: earnings transcript (90+), broker research (80+), filing (85+), news (60+), no source (20)
   - Data specificity: has 3+ data points (90+), has 1-2 (70+), vague (40+)
   - Recency: last 3 months (90+), last 6 months (75+), last 12 months (60+)
   
3. COMPANY CROSS-REFERENCE
   For findings that mention companies but have an empty affected_companies array, extract company names from the description and populate the array with:
   - name, ticker (if identifiable), impact direction, and a one-sentence detail
   
4. MISSING FIELD INFERENCE
   - If impact_level is null, infer from the description language
   - If timeframe is null, infer from temporal references in the description
   - If a finding's icon ("ic" field in the frontend) would benefit from a more specific Material Symbol, suggest one
   
5. NEWS-FINDING LINKAGE
   For each news_item, populate related_finding_ids by matching the news source to findings that cite the same source document.

6. FINANCIAL METRIC CLEANUP
   - Ensure every current_value is a clean number with unit (no URLs, no domain names, no narrative)
   - Standardize units: use B for billions, M for millions, K for thousands, % for percentages, bps for basis points, pp for percentage points
   - If change is missing but previous_value and current_value are both present, calculate the change

Return the COMPLETE JSON with all enrichments applied. Do not omit any existing fields — only add or improve.
```

---

## 15) Acceptance Criteria

1. ✅ One-click "Generate Report" produces complete magazine data in <3 minutes
2. ✅ All findings have valid source URLs (verified by HEAD request)
3. ✅ Financial metrics are clean numbers with no embedded URLs or text
4. ✅ News items have headlines, summaries, source org, type, date, and URL
5. ✅ Companies affected are correctly cross-referenced to findings
6. ✅ Editorial synthesis references specific findings by number
7. ✅ Existing manual workflow continues to work (fallback when no API keys)
8. ✅ Scheduled reports execute on time and send notifications
9. ✅ Cost per report stays under $2.00
10. ✅ Error handling: graceful degradation if AlphaSense or Claude is unavailable
