# AccSense Agentic Intelligence Pipeline — Overview & Vision

---

## What Is This?

The AccSense Agentic Pipeline is the next evolution of the Compass Intelligence platform. Today, generating a market intelligence report requires 15-20 minutes of manual work — copying prompts, pasting into AlphaSense, copying output back, converting, fixing parsing errors, and saving. The agentic pipeline replaces this entire workflow with a **single click**.

Think of it as having a team of specialized AI analysts that each handle one part of the research, working in parallel, and producing a publication-ready report in under 3 minutes.

---

## The Problem We're Solving

### Today's Workflow (Manual)
```
1. Go to Admin → AlphaSense Mode
2. Set parameters (country, industry, timeframe)
3. Copy the generated prompt
4. Open AlphaSense → Paste prompt → Wait for Deep Research
5. Copy the entire output
6. Go back to Admin → Paste Text tab → Paste output
7. Click Convert to JSON
8. Hope the regex parser doesn't break
9. Fix parsing errors if it does
10. Select country + industry → Click Update Website
11. Navigate to magazine to verify
12. Optionally upload a PDF for chart extraction
```

**Time: 15-20 minutes per report. Manual. Error-prone.**

### Tomorrow's Workflow (Agentic)
```
1. Go to Admin → Click "Generate Report"
2. Watch the progress tracker as agents work
3. Done. Magazine is updated.
```

**Time: 2-3 minutes. Automated. Perfect output every time.**

---

## How It Works: The Five Agents

The pipeline uses a team of 5 specialized agents, orchestrated by a central controller:

### 🔍 Agent 1: Strategic Intelligence (AlphaSense)

This agent makes the primary research query to AlphaSense's Deep Research mode. It asks for:
- 5-8 Emerging Trends
- 5-8 Strategic Opportunities
- 5-8 Key Challenges

Each finding comes with descriptions, impact assessments, timeframes, and source citations. This is the same type of query we make manually today, but automated.

**Why a dedicated agent?** Deep Research mode takes 12-15 minutes but produces the most comprehensive analysis. By making this a separate agent, we can run it in parallel with the others.

### 🏢 Agent 2: Company Impact & Financials (AlphaSense)

This agent focuses specifically on:
- Top 10 companies affected by the market dynamics
- Whether each company is positively or negatively impacted
- Specific revenue/market data per company
- 10-12 key macroeconomic and financial metrics

**Why separate from Agent 1?** A focused query about companies and numbers produces much cleaner, more specific data than asking for everything in one giant prompt. This is the "divide and conquer" strategy that solves our parsing problems.

### 📰 Agent 3: Broker Research & News (AlphaSense)

This agent specifically hunts for:
- Analyst reports and broker research
- Earnings call transcripts
- Regulatory filings
- News articles
- **Direct URLs to every source**

**Why separate?** When we ask AlphaSense to find sources separately (not embedded within finding descriptions), the URLs are much more reliable. The agent is specifically prompted to return hyperlinks, not just text citations.

### 🧠 Agent 4: Claude Structurer

This is where the magic happens. Agent 4 takes the raw text output from Agents 1-3 and transforms it into **perfect JSON** using Claude's intelligence.

**Why Claude, not regex?**
Our current regex parser works ~70% of the time. When AlphaSense changes its output format slightly — missing numbers, different line breaks, URLs embedded in values — the regex breaks. Claude understands context. It can:
- Parse any formatting variation
- Infer missing fields from context
- Validate that counts match arrays
- Handle multi-line descriptions
- Extract structured data from prose

The system prompt includes our exact TypeScript schema, so Claude always returns data that matches our types perfectly.

**Cost: ~$0.02 per call.** That's essentially free for perfect parsing.

### ✨ Agent 5: Claude Enricher

The final agent polishes the structured data:

1. **URL Validation** — Makes HTTP HEAD requests to every URL. If a URL returns 404 or times out, it's marked as null so the magazine doesn't show broken links.

2. **Company Cross-Reference** — Matches the companies mentioned in findings against Accenture's client database. Flags which of our clients are affected and how.

3. **Editorial Synthesis** — Generates a polished 3-5 sentence executive summary that connects themes across all findings and references specific finding numbers. Much better than AlphaSense's generic synthesis.

4. **Quality Scoring** — Each finding gets a confidence score (0-100) based on:
   - Source quality (earnings transcript > news article)
   - Data specificity (has dollar figures > vague claims)
   - Recency (last 3 months > last year)
   
5. **Missing Data Fill** — If a finding has no impact level or timeframe, Claude infers it from the description.

6. **Smart Icon Mapping** — Instead of keyword regex for Material Symbol icons, Claude reads the finding and assigns the most appropriate icon.

---

## The Orchestrator

The orchestrator is a Next.js API route (`/api/intelligence/generate`) that coordinates all 5 agents:

```
Step 1: Authenticate with AlphaSense (get access token)
Step 2: Launch Agents 1, 2, 3 in PARALLEL (3 AlphaSense queries)
Step 3: Wait for all 3 to complete
Step 4: Combine raw outputs → send to Agent 4 (Claude Structurer)
Step 5: Send structured JSON → Agent 5 (Claude Enricher)
Step 6: Save enriched data to src/data/trends/{country}/{industry}.json
Step 7: Notify user (UI update + optional email/Slack)
```

Agents 1-3 run in parallel because they're independent AlphaSense queries. This cuts the total time from ~15 minutes (sequential) to ~12-15 minutes (parallel, limited by Deep Research speed).

For "quick" mode, all agents use AlphaSense's `auto` mode instead of `deepResearch`, reducing the total time to ~30 seconds.

---

## Three Modes of Operation

### Full Mode (~2-3 minutes)
- Agent 1: deepResearch (comprehensive findings)
- Agents 2-3: auto (company data + news)
- Agents 4-5: Claude structuring + enrichment
- Best for: Monthly/quarterly strategic reports

### Refresh Mode (~30 seconds)
- Keeps existing findings from last full report
- Only re-queries news/financials (Agents 2-3)
- Re-runs Claude enrichment
- Best for: Weekly updates between full reports

### Quick Mode (~15 seconds)
- All agents use AlphaSense `auto` mode
- Skips Claude enrichment
- Best for: Ad-hoc checks, demo purposes

---

## Scheduling

The pipeline supports automated scheduling:

| Schedule | Typical Use |
|----------|------------|
| Weekly | News refresh for active markets |
| Bi-weekly | Strategic updates |
| Monthly | Full comprehensive reports |
| Quarterly | Deep-dive industry analyses |

**Configuration per country/industry pair:**
- Which mode to use (full/refresh/quick)
- Who to notify on completion
- Whether to auto-publish or hold for review

**Implementation:** Vercel Cron Jobs or a simple external scheduler that hits the API route on a timer.

---

## Cost Economics

### Per Report
| Component | Cost |
|-----------|------|
| AlphaSense queries (3 calls) | ~$1.20 |
| Claude API (structuring + enrichment) | ~$0.04 |
| **Total** | **~$1.24** |

### Monthly (typical usage)
| Scenario | Reports/month | Cost/month |
|----------|--------------|------------|
| 1 country, 1 industry, weekly | 4 | ~$5 |
| 3 countries, 2 industries, weekly | 24 | ~$30 |
| 5 countries, 3 industries, weekly | 60 | ~$75 |
| Same + daily news refresh | 150 | ~$100 |

For comparison: a single hour of manual analyst work costs $150-300+.

---

## What Stays The Same

The agentic pipeline is an **addition**, not a replacement. Everything that works today continues to work:

- **Manual workflow** — paste text, convert, save. Still works, no API keys needed.
- **PDF chart extraction** — upload PDFs for Visual Intelligence. Unchanged.
- **AccSense Magazine** — same page, same design. Just gets data faster.
- **Regex parser** — remains as offline fallback when API keys aren't configured.
- **Admin UI** — adds a "Generate Report" button alongside existing tools.

The principle is **progressive enhancement**: the more API keys you configure, the more automated it gets. Zero keys = fully manual. One key (Claude) = smart parsing. Both keys = full automation.

---

## Security & Compliance

- All API keys stored server-side in `.env.local` (git-ignored)
- AlphaSense credentials never exposed to browser
- Claude API calls made from Next.js API routes only
- No data leaves the server except to AlphaSense/Anthropic APIs
- AlphaSense enforces its own access controls on what data is queryable
- All generated reports are stored locally in the project (no external database in Phase 1)

---

## Implementation Roadmap

### Phase 3a: Claude Integration (3 days)
Replace regex parser with Claude for the "Convert to JSON" button. This alone eliminates all parsing failures.

### Phase 3b: AlphaSense API (5 days)
Add direct API queries. One-click report generation. Parallel agent execution.

### Phase 3c: Enrichment (3 days)
URL validation, quality scoring, editorial synthesis, company cross-referencing.

### Phase 3d: Scheduling (2 days)
Cron-based automation, notifications, auto-publish.

**Total: 10-13 development days.**

---

## Prerequisites

1. **AlphaSense API access** — Contact AlphaSense for API credentials (client_id, username, password)
2. **Anthropic API key** — Sign up at console.anthropic.com, create an API key
3. **Both stored in `.env.local`** in the project root

---

## Related Documents

- `ALPHASENSE_API_SPEC.md` — Original AlphaSense integration spec (auth flow, endpoints, modes)
- `AlphaSense_Builder_Handoff.md` — Text-to-JSON conversion approaches (manual, regex, Claude)
- `AlphaSense_JSON_Pipeline_Developer_Spec.md` — PDF extraction pipeline spec
- `CLAUDE.md` — Project conventions and architecture
- `PROJECT_MEMORY.md` — Full project context and history
