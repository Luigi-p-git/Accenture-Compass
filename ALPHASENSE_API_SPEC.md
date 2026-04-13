# AlphaSense Integration Spec (Compass + Admin)

Date: 2026-04-13
Status: Draft v2 (verification-hardened)

## 1) Objective

Integrate AlphaSense APIs to power:

1. Website chatbot queries (on-demand)
2. Admin automation queries (scheduled or manual trigger)
3. A unified response format for both channels:
   - Key Challenges
   - Strategic Opportunities
   - Emerging Trends

Scope must support country-level and industry-level analysis.

## 2) Feasibility Summary

Feasibility: YES (high), with required constraints.

What is verified as feasible now:

1. Auth + query flow is well documented.
2. Agent API supports natural language GenSearch with filters for countries and industries.
3. Follow-up questions are supported through conversation IDs and thread retrieval.
4. Response includes citations and source links for traceability.

Required architecture constraints:

1. Move AlphaSense credentials out of browser code into a server-side integration layer.
2. Force all chatbot and admin flows through a single normalization + validation service.
3. Treat AlphaSense markdown as upstream content, not final UI payload.

Why this is required:

1. AlphaSense requires API key, client ID, client secret, username, and password.
2. Current client-side chat patterns are not safe for AlphaSense credentials.
3. AlphaSense output is markdown with citations, not guaranteed pre-structured JSON for your exact UI schema.

## 3) AlphaSense Docs Facts Used

Base endpoints:

1. Auth: POST https://api.alpha-sense.com/auth
2. GraphQL: POST https://api.alpha-sense.com/gql

Auth model:

1. OAuth2 password grant
2. Access token lifetime: 24 hours
3. No refresh token for this flow; re-auth required on expiry

GenSearch modes:

1. fast (~30s, 10 credits)
2. auto (~30-90s, 10 credits, recommended default)
3. thinkLonger (~60-90s, 25 credits)
4. deepResearch (~12-15 min, 100 credits)

Filter capabilities relevant to your use case:

1. countries: ISO 2-letter codes (example: US, CA)
2. industries: GICS codes
3. date presets or custom ranges
4. companies filters (optional extension)

Response behavior:

1. Results are polled by conversation ID until progress reaches 1.0
2. Output is markdown with inline citations
3. Error patterns include NO_DOCS, 401, 429

## 3.1) Verification Matrix (No Guesswork)

The table below separates what is documented from what we implement as our own contract.

| Topic | Status | Source evidence | Build implication |
|---|---|---|---|
| Auth endpoint `/auth` with OAuth password grant | Verified | Agent API Authentication + Quickstart | Implement server-side token manager |
| Token lifetime 24h and no refresh token | Verified | Agent API Authentication | Cache token and re-auth on expiry/401 |
| GraphQL endpoint `/gql` | Verified | API Getting Started | All queries/mutations go through GraphQL client |
| GenSearch modes (`fast`, `auto`, `thinkLonger`, `deepResearch`) | Verified | Agent API GenSearch + Credits docs | Mode-based routing for chat vs admin |
| Country and industry filters | Verified | Agent API GenSearch + Utility APIs | Map country ISO and GICS codes before query |
| Follow-up and thread history | Verified | Agent API GenSearch | Persist conversation/thread IDs |
| Markdown citations format | Verified | Agent API Response Parsing | Parse citations into structured evidence objects |
| OpenAPI artifact coverage of GenSearch | Verified (partial schema) | OpenAPI YAML | Treat as baseline contract; rely on docs for advanced filter usage |
| Your exact UI schema (challenges/opportunities/trends) returned directly by AlphaSense | Not verified | No doc guarantee | Must normalize and validate ourselves |
| Uniform section labels across all prompts/modes | Not guaranteed | LLM behavior | Enforce canonical template + fallback extractor |

## 3.2) Explicit Non-Guarantees (Important)

These are not promised by AlphaSense docs and must be handled by our implementation:

1. AlphaSense will not consistently return your exact section headers unless we constrain prompting and post-process.
2. Citation density may vary by query and corpus availability.
3. `NO_DOCS` can occur for narrow scopes; this is expected behavior, not system failure.
4. Credit and polling limits are commercial-plan dependent, so throughput assumptions must be configurable.
5. The published OpenAPI spec appears intentionally minimal for `GenSearchInput` (documents all modes and conversation polling, but not full advanced filter shape), so advanced filter details should be sourced from Agent API docs + utility APIs.

## 4) Target Functional Requirements

### 4.1 Chatbot (Website)

1. User asks a question in natural language.
2. System sends GenSearch request (default mode: auto).
3. System polls completion.
4. System normalizes output into a strict JSON schema.
5. UI renders:
   - Key Challenges cards
   - Strategic Opportunities cards
   - Emerging Trends accordion/list
6. User can ask follow-up questions in same thread.

### 4.2 Admin Session (Automatic + Manual)

1. Admin can run one-off or scheduled prompts.
2. Admin chooses scope:
   - Country-only
   - Industry-only
   - Country + industry
3. Results are normalized with same schema as chatbot.
4. System stores snapshots for audit/history and re-use in frontend.
5. Optional: publish approved snapshots to app data layer.

## 5) Canonical Response Schema (Shared)

```json
{
  "scope": {
    "country": "canada",
    "countryCode": "CA",
    "industry": {
      "name": "Financial Services",
      "gicsCode": "4010"
    },
    "timeRange": {
      "preset": "LAST_90_DAYS"
    }
  },
  "summary": "Short executive synthesis.",
  "keyChallenges": [
    {
      "title": "Housing Affordability",
      "detail": "Impacts talent attraction in major cities.",
      "severity": "high",
      "impact": "high",
      "citations": [
        {
          "number": 38,
          "source": "10-K",
          "url": "https://research.alpha-sense.com?...",
          "docId": "V00001234",
          "page": "29"
        }
      ]
    }
  ],
  "strategicOpportunities": [
    {
      "title": "AI/ML Advisory",
      "detail": "Enterprise AI transformation demand accelerating.",
      "estimatedValue": "$120M+",
      "timeline": "FY25-FY27",
      "priority": "high",
      "citations": []
    }
  ],
  "emergingTrends": [
    {
      "title": "AI Corridor Expansion",
      "tag": "Technology",
      "detail": "Venture investment concentration rising.",
      "momentum": "up",
      "horizon": "12-24m",
      "citations": []
    }
  ],
  "meta": {
    "mode": "auto",
    "conversationId": "conv-abc-123",
    "progress": 1,
    "generatedAt": "2026-04-13T00:00:00.000Z",
    "errors": []
  }
}
```

Notes:

1. This schema matches Compass trend UI semantics (Challenges, Opportunities, Emerging Trends).
2. Same schema powers both chatbot and admin outputs.
3. This schema is an internal contract, not an upstream AlphaSense response format.

## 5.1) Consistency Rules (Contract Enforcement)

The payload is accepted only if all checks pass:

1. Required fields present: `scope`, `summary`, `keyChallenges`, `strategicOpportunities`, `emergingTrends`, `meta`.
2. Enum checks:
  - `severity`: `low|medium|high`
  - `impact`: `low|medium|high`
  - `priority`: `low|medium|high`
  - `momentum`: `down|flat|up`
3. `countryCode` must be ISO alpha-2 and validated against `documentCountryCodes` lookup.
4. `industry.gicsCode` must be validated against `documentIndustries` lookup.
5. Citation URLs must match `research.alpha-sense.com` and parse for `docid/page` when available.
6. Empty arrays are allowed, but only with a structured reason in `meta.errors`.

## 6) Proposed Architecture

## 6.1 Integration Layer (Server-side only)

Create a backend integration module that handles:

1. Token management and caching
2. GenSearch request execution
3. Polling and retry/backoff
4. Markdown + citation parsing
5. JSON normalization and validation

## 6.2 Suggested API Endpoints (Internal)

1. POST /api/intel/query
   - For chatbot and manual admin trigger
2. POST /api/intel/admin/run
   - For automated batches/scheduled jobs
3. GET /api/intel/jobs/:id
   - Poll job status for long runs (especially deepResearch)
4. GET /api/intel/snapshots
   - Retrieve latest stored outputs by scope

## 6.3 Shared Services

1. Auth service (token cache, expiry handling)
2. AlphaSense client (GraphQL calls)
3. Normalization service (markdown -> schema)
4. Validation service (schema validation)
5. Persistence service (history, dedupe, publish state)

## 7) Request Contract (Internal)

```json
{
  "prompt": "What are key challenges, strategic opportunities, and emerging trends for consulting in Canada?",
  "mode": "auto",
  "scope": {
    "countryCodes": ["CA"],
    "industryGics": ["202010"],
    "datePreset": "LAST_90_DAYS"
  },
  "conversationId": null,
  "useWebSearch": false,
  "channel": "chatbot"
}
```

Rules:

1. mode default = auto
2. deepResearch only for admin/manual premium flows
3. If conversationId exists, execute follow-up in same thread

## 8) Normalization Strategy (Critical)

AlphaSense returns markdown, so normalize in two steps:

1. Parse citations from markdown links.
2. Convert narrative into strict schema fields.

Recommended implementation:

1. Primary parser:
   - Extract section headers and bullet lists
   - Map to challenges/opportunities/trends by heading keywords
2. Fallback structuring:
   - If markdown shape is inconsistent, run a structured extraction pass with strict JSON schema validation
3. Validation:
   - Reject malformed payloads and retry extraction once

Normalization pipeline (deterministic):

1. Ingest raw `markdown`, `progress`, `error`, `conversationId`.
2. Parse citations via known regex patterns (short, number-only, full-metadata forms).
3. Detect candidate sections by synonym dictionary:
  - Challenges: `challenge|risk|headwind|constraint`
  - Opportunities: `opportunity|upside|growth lever|strategic move`
  - Trends: `trend|signal|emerging pattern|market shift`
4. Convert bullets/paragraph chunks into item objects.
5. Apply enum mapping + confidence scoring.
6. Validate against schema.
7. If invalid, run one structured repair pass.
8. If still invalid, return a controlled fallback payload with `meta.errors` populated.

Why this matters:

1. Ensures chatbot and admin produce identical output shape.
2. Keeps UI components simple and stable.

## 9) Prompt Template for Stable Output

Use a fixed instruction wrapper for AlphaSense prompt content:

1. Ask specifically for three sections: Key Challenges, Strategic Opportunities, Emerging Trends.
2. Require compact bullets with clear titles and business impact.
3. Request country and industry grounding.
4. Request concise executive summary.

Prompting policy (must be consistent across chatbot/admin):

1. Use one shared prompt builder function and version it (example: `promptSpecVersion: 1`).
2. Keep instruction order fixed.
3. Inject only scoped variables (`country`, `industry`, `datePreset`, `mode`, user question).
4. Do not allow arbitrary system prompt overrides in production.
5. Record final rendered prompt in admin audit logs (with PII-safe redaction).

Example prompt suffix:

"Return findings in three clearly labeled sections: Key Challenges, Strategic Opportunities, Emerging Trends. Keep each item to: title, 1-2 sentence detail, and business impact. Prioritize country-level and industry-level relevance."

Canonical prompt skeleton:

1. Role instruction: market intelligence analyst.
2. Scope instruction: country + industry + time range.
3. Output instruction: exactly 3 sections + concise summary.
4. Evidence instruction: include citations for factual claims where available.
5. Failure instruction: if insufficient evidence, state it explicitly and return fewer items.

## 10) Error Handling and Reliability

Handle these cases:

1. 401: re-auth then retry once
2. 429: exponential backoff with minimum 60s gate
3. NO_DOCS: return structured empty-state message for UI
4. Timeout in deepResearch: keep async job open and allow later fetch
5. Partial markdown while progress < 1.0: do not finalize normalization yet

Additional reliability controls:

1. Idempotency key on admin jobs to avoid duplicate runs.
2. Circuit breaker for repeated upstream failures.
3. Configurable polling interval by mode:
  - fast: 2-3s
  - auto: 3-5s
  - thinkLonger: 5s
  - deepResearch: 10s
4. Hard timeout per mode with resumable status endpoint.

## 11) Security Requirements

1. Never expose AlphaSense secrets to browser.
2. Store secrets in server environment only.
3. Redact secrets from logs.
4. Add role-based guard for admin automation endpoint.
5. Keep snapshot audit log (who ran, when, what scope, what mode).

## 12) Delivery Plan

Phase 0: Contract and scaffolding (1-2 days)

1. Approve schema
2. Create internal endpoint stubs + validation middleware
3. Add env vars and secret management

Phase 1: AlphaSense connector MVP (2-4 days)

1. Auth + token cache
2. GenSearch auto mode + polling
3. Country/industry filters
4. Verification tests against utility lookups (country/GICS)

Phase 2: Normalization and UI wiring (3-5 days)

1. Markdown parser + citation extraction
2. Schema validator
3. Chatbot renders shared cards/sections
4. Admin uses same payload contract

Phase 3: Admin automation (2-4 days)

1. Manual admin run endpoint
2. Scheduled runs by scope
3. Snapshot storage and retrieval

Phase 4: Hardening (2-3 days)

1. Retry/backoff tuning
2. Usage/rate monitoring
3. Failure analytics and alerting
4. Prompt versioning + payload conformance dashboard

## 12.1) Acceptance Criteria (Build Gate)

Ship only when these are true:

1. 100% of successful responses validate against canonical schema.
2. Chatbot and admin responses are byte-compatible at the schema level.
3. Country and industry values are always resolved via utility APIs or approved cache.
4. No AlphaSense secrets exposed in browser network calls.
5. 401 and 429 recovery paths tested with integration tests.
6. `NO_DOCS` returns a controlled empty payload, not a UI error.

## 12.2) Test Plan (Minimum)

1. Unit tests:
  - citation parser
  - section mapper
  - enum normalizer
  - schema validator
2. Integration tests:
  - auth and token refresh behavior
  - auto mode happy path
  - follow-up conversation path
  - country/industry filter path
3. Failure tests:
  - 401, 429, NO_DOCS
  - malformed markdown
  - partial markdown
4. Contract tests:
  - chatbot payload == admin payload shape

## 13) Open Inputs Needed From Your Team

1. Confirm preferred default mode (recommended: auto)
2. Confirm allowed countries and industries
3. Confirm if web search should be enabled
4. Define admin schedule cadence (daily/weekly/monthly)
5. Confirm storage target for snapshots (DB, files, or both)

## 14) Final Feasibility Decision

Feasible and recommended.

Confidence: high for chatbot and admin integration, provided secrets are moved server-side and output normalization is implemented as a first-class service.

Confidence boundaries:

1. High confidence: API auth/query/poll/filter/thread capabilities.
2. Medium confidence: one-pass section extraction quality across all query styles.
3. High confidence after implementation: consistent output format, because consistency will be enforced by internal schema validation (not left to model variance).

The API capability supports your exact scope requirements (country + industry), follow-up chat behavior, and evidence-backed insights suitable for the Key Challenges / Strategic Opportunities / Emerging Trends format.

## 15) Source References Used

1. https://developer.alpha-sense.com/api/getting-started/
2. https://developer.alpha-sense.com/agent-api/quickstart
3. https://developer.alpha-sense.com/agent-api/authentication
4. https://developer.alpha-sense.com/agent-api/gensearch
5. https://developer.alpha-sense.com/agent-api/credits-and-limits
6. https://developer.alpha-sense.com/agent-api/response-parsing
7. https://developer.alpha-sense.com/agent-api/utility-apis
8. https://developer.alpha-sense.com/llms.txt
9. https://developer.alpha-sense.com/openapi/alphasense-gensearch.yaml
10. https://developer.alpha-sense.com/postman/alphasense-agent-api.json

Artifact verification note:

1. Postman collection was retrieved and confirmed to include auth, all four GenSearch modes, conversation polling, and document search examples.
2. OpenAPI YAML was retrieved directly via terminal and confirms `/auth`, `/gql`, mode mutations, and conversation response schemas.
3. OpenAPI currently exposes a minimal `GenSearchInput` schema (prompt required) and should be treated as partial for advanced filter field coverage.
