# AlphaSense → JSON: Complete Builder Handoff

---

## WHAT THIS IS

We use AlphaSense (market intelligence platform) to generate structured
research reports on countries, regions, and industries. The output is
rich prose with numbered findings, source citations, impact levels, and
timeframes. We need to convert this output into structured JSON so our
website bot can consume and display it.

This document covers three conversion approaches. Pick the one that fits
our stack or combine them.

---

## THE JSON SCHEMA (Same for All Approaches)

Every approach must produce JSON matching this exact schema:

```json
{
  "subject": "Canada",
  "date_generated": "2026-04-14",
  "total_findings": 18,
  "findings": [
    {
      "id": 1,
      "category": "Emerging Trend",
      "finding": "Critical minerals supply chain acceleration",
      "description": "Canada has significantly expanded its critical minerals strategy, with $3.8B in federal investment commitments over the past year targeting lithium, nickel, cobalt, and rare earth processing facilities. Several major projects in Quebec and Ontario have reached final investment decisions, driven by both US Inflation Reduction Act incentives and EU Critical Raw Materials Act requirements that favor allied-nation sourcing.",
      "impact_level": "High",
      "timeframe": "Medium-term (1-3yr)",
      "source": {
        "document_title": "Q4 2025 Earnings Call Transcript",
        "organization": "Teck Resources",
        "document_type": "Earnings Call",
        "date": "2026-02-15"
      }
    }
  ],
  "synthesis": "Canada's economic landscape is defined by a tension between significant resource-based opportunities and structural headwinds...",
  "metadata": {
    "emerging_trend_count": 6,
    "strategic_opportunity_count": 7,
    "key_challenge_count": 5,
    "high_impact_count": 10,
    "medium_impact_count": 6,
    "low_impact_count": 2
  }
}
```

### Field Definitions

| Field | Type | Values |
|-------|------|--------|
| `category` | string | `"Emerging Trend"` \| `"Strategic Opportunity"` \| `"Key Challenge"` |
| `impact_level` | string | `"High"` \| `"Medium"` \| `"Low"` |
| `timeframe` | string | `"Near-term (0-12mo)"` \| `"Medium-term (1-3yr)"` \| `"Long-term (3-5yr+)"` |
| `document_type` | string | `"Earnings Call"` \| `"Expert Transcript"` \| `"Broker Research"` \| `"Filing"` \| `"News"` \| `"Government Publication"` |

---

## WHAT THE ALPHASENSE OUTPUT LOOKS LIKE

The input you'll receive is structured prose that looks like this:

```
EMERGING TRENDS

1. Critical Minerals Supply Chain Acceleration
Description: Canada has significantly expanded its critical minerals
strategy, with $3.8B in federal investment commitments...
Impact: High — This directly affects Canada's positioning in the
global EV and battery supply chain.
Timeframe: Medium-term (1-3 years)
Source: Q4 2025 Earnings Call Transcript, Teck Resources, Earnings
Call, 2026-02-15

2. AI Infrastructure Investment Surge
Description: Major cloud providers including AWS, Google, and
Microsoft have announced combined data center investments exceeding
$4B across Ontario and Quebec...
Impact: High — Positions Canada as a secondary AI infrastructure hub.
Timeframe: Near-term (0-12 months)
Source: ...

STRATEGIC OPPORTUNITIES

3. ...

KEY CHALLENGES

10. ...

SYNTHESIS
Canada's economic landscape is defined by a tension between...
```

The format can vary slightly between runs (extra line breaks, different
labeling styles, occasional bold markers, etc). Your parser needs to
handle these variations.

---

## APPROACH A: MANUAL CLAUDE CONVERSION (No Code Needed)

### How It Works

1. Run the AlphaSense prompt
2. Copy the output (clipboard button in AlphaSense)
3. Open Claude (claude.ai) and paste this:

```
Convert the following AlphaSense report into JSON using this exact
schema. Return ONLY valid JSON, nothing else.

Schema:
{
  "subject": "string",
  "date_generated": "YYYY-MM-DD",
  "total_findings": number,
  "findings": [
    {
      "id": number,
      "category": "Emerging Trend | Strategic Opportunity | Key Challenge",
      "finding": "string",
      "description": "string — preserve full detail",
      "impact_level": "High | Medium | Low",
      "timeframe": "Near-term (0-12mo) | Medium-term (1-3yr) | Long-term (3-5yr+)",
      "source": {
        "document_title": "string",
        "organization": "string",
        "document_type": "string",
        "date": "YYYY-MM-DD"
      }
    }
  ],
  "synthesis": "string",
  "metadata": {
    "emerging_trend_count": number,
    "strategic_opportunity_count": number,
    "key_challenge_count": number,
    "high_impact_count": number,
    "medium_impact_count": number,
    "low_impact_count": number
  }
}

Here is the AlphaSense output:

[PASTE ALPHASENSE OUTPUT HERE]
```

4. Claude returns clean JSON
5. Copy the JSON and save it / upload it to the CMS

### Pros & Cons

- **Pro**: Zero setup, zero cost beyond existing Claude subscription
- **Pro**: Handles any format variation perfectly
- **Con**: Manual process, not automatable
- **Con**: Requires human in the loop every time

### Best For

Ad-hoc or low-frequency reports (monthly/quarterly updates).

---

## APPROACH B: NO-AI REGEX PARSER (No API Key Needed)

### How It Works

A rule-based parser that reads the structured prose and extracts
findings using pattern matching. No external API calls. Runs entirely
in your app.

### Python Implementation

```python
"""
AlphaSense Text → JSON Parser (No AI Required)
Parses the structured prose output from AlphaSense into JSON.
"""

import re
import json
from datetime import date
from typing import Optional


def parse_alphasense_text(text: str) -> dict:
    """Parse AlphaSense prose output into structured JSON."""

    findings = []
    synthesis = ""
    current_category = None
    current_finding = None

    # Normalize line endings and clean up
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    lines = text.split("\n")

    # Category detection patterns
    category_map = {
        "emerging trend": "Emerging Trend",
        "emerging trends": "Emerging Trend",
        "strategic opportunit": "Strategic Opportunity",
        "key challenge": "Key Challenge",
        "key challenges": "Key Challenge",
    }

    # Impact level pattern
    impact_pattern = re.compile(
        r"impact\s*(?:level|assessment)?\s*[:—\-]\s*(high|medium|low)",
        re.IGNORECASE,
    )

    # Timeframe pattern
    timeframe_pattern = re.compile(
        r"(?:timeframe|time\s*frame|timeline|horizon)\s*[:—\-]\s*"
        r"(near[- ]term[^\.]*|medium[- ]term[^\.]*|long[- ]term[^\.]*)",
        re.IGNORECASE,
    )

    # Source pattern — flexible to match various formats
    source_pattern = re.compile(
        r"source\s*[:—\-]\s*(.+?)(?:\n|$)", re.IGNORECASE
    )

    # Finding number + title pattern
    finding_pattern = re.compile(
        r"^(\d{1,2})\.\s+(.+?)$"
    )

    # Synthesis detection
    synthesis_pattern = re.compile(
        r"^(?:synthesis|summary|conclusion)\s*[:—\-]?\s*$", re.IGNORECASE
    )

    in_synthesis = False
    synthesis_lines = []

    i = 0
    while i < len(lines):
        line = lines[i].strip()

        # Skip empty lines
        if not line:
            i += 1
            continue

        # Check for synthesis section
        if synthesis_pattern.match(line):
            # Save current finding if any
            if current_finding:
                findings.append(current_finding)
                current_finding = None
            in_synthesis = True
            i += 1
            continue

        if in_synthesis:
            synthesis_lines.append(line)
            i += 1
            continue

        # Check for category headers
        line_lower = line.lower().strip("*#_ ")
        matched_category = None
        for key, value in category_map.items():
            if key in line_lower and len(line_lower) < 40:
                matched_category = value
                break

        if matched_category:
            if current_finding:
                findings.append(current_finding)
                current_finding = None
            current_category = matched_category
            i += 1
            continue

        # Check for new finding (numbered item)
        finding_match = finding_pattern.match(line)
        if finding_match:
            # Save previous finding
            if current_finding:
                findings.append(current_finding)

            current_finding = {
                "id": int(finding_match.group(1)),
                "category": current_category or "Unknown",
                "finding": finding_match.group(2).strip().rstrip(":"),
                "description": "",
                "impact_level": None,
                "timeframe": None,
                "source": {
                    "document_title": None,
                    "organization": None,
                    "document_type": None,
                    "date": None,
                },
            }
            i += 1
            continue

        # If we have a current finding, try to extract fields
        if current_finding:
            # Check for impact
            impact_match = impact_pattern.search(line)
            if impact_match:
                current_finding["impact_level"] = impact_match.group(
                    1
                ).capitalize()
                i += 1
                continue

            # Check for timeframe
            tf_match = timeframe_pattern.search(line)
            if tf_match:
                raw_tf = tf_match.group(1).strip()
                current_finding["timeframe"] = normalize_timeframe(raw_tf)
                i += 1
                continue

            # Check for source
            source_match = source_pattern.match(line)
            if source_match:
                raw_source = source_match.group(1).strip()
                current_finding["source"] = parse_source(raw_source)
                i += 1
                continue

            # Check for description label
            desc_lower = line.lower()
            if desc_lower.startswith("description:") or desc_lower.startswith(
                "description —"
            ):
                desc_text = re.sub(
                    r"^description\s*[:—\-]\s*", "", line, flags=re.IGNORECASE
                )
                current_finding["description"] = desc_text
                # Gather continuation lines
                i += 1
                while i < len(lines):
                    next_line = lines[i].strip()
                    if not next_line:
                        i += 1
                        break
                    if any(
                        next_line.lower().startswith(p)
                        for p in [
                            "impact",
                            "timeframe",
                            "time frame",
                            "source",
                            "timeline",
                            "horizon",
                        ]
                    ):
                        break
                    if finding_pattern.match(next_line):
                        break
                    current_finding["description"] += " " + next_line
                    i += 1
                continue

            # If line doesn't match any field, it's likely part of
            # the description
            if not current_finding["description"]:
                current_finding["description"] = line
            else:
                # Check if this looks like a continuation
                if not any(
                    line.lower().startswith(p)
                    for p in ["impact", "timeframe", "source", "time frame"]
                ):
                    current_finding["description"] += " " + line

        i += 1

    # Save last finding
    if current_finding:
        findings.append(current_finding)

    synthesis = " ".join(synthesis_lines).strip()

    # Renumber findings sequentially
    for idx, f in enumerate(findings, 1):
        f["id"] = idx

    # Build metadata
    cats = [f["category"] for f in findings]
    impacts = [f["impact_level"] for f in findings]

    return {
        "subject": detect_subject(text),
        "date_generated": date.today().isoformat(),
        "total_findings": len(findings),
        "findings": findings,
        "synthesis": synthesis,
        "metadata": {
            "emerging_trend_count": cats.count("Emerging Trend"),
            "strategic_opportunity_count": cats.count(
                "Strategic Opportunity"
            ),
            "key_challenge_count": cats.count("Key Challenge"),
            "high_impact_count": impacts.count("High"),
            "medium_impact_count": impacts.count("Medium"),
            "low_impact_count": impacts.count("Low"),
        },
    }


def normalize_timeframe(raw: str) -> str:
    """Normalize timeframe strings to standard values."""
    raw_lower = raw.lower()
    if "near" in raw_lower:
        return "Near-term (0-12mo)"
    elif "medium" in raw_lower or "mid" in raw_lower:
        return "Medium-term (1-3yr)"
    elif "long" in raw_lower:
        return "Long-term (3-5yr+)"
    return raw.strip()


def parse_source(raw: str) -> dict:
    """Parse a source citation string into structured fields."""
    parts = [p.strip() for p in raw.split(",")]

    source = {
        "document_title": None,
        "organization": None,
        "document_type": None,
        "date": None,
    }

    # Try to identify document type
    doc_types = [
        "Earnings Call",
        "Expert Transcript",
        "Broker Research",
        "Filing",
        "News",
        "Government Publication",
        "SEC Filing",
        "SEDAR Filing",
        "10-K",
        "10-Q",
        "Annual Report",
    ]

    for i, part in enumerate(parts):
        # Check if it's a document type
        for dt in doc_types:
            if dt.lower() in part.lower():
                source["document_type"] = part.strip()
                break

        # Check if it looks like a date
        if re.search(r"\d{4}[-/]\d{2}[-/]\d{2}", part):
            source["date"] = part.strip()
        elif re.search(
            r"(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)", part
        ):
            source["date"] = part.strip()

    # First part is usually document title
    if parts:
        source["document_title"] = parts[0]

    # Second part is usually organization
    if len(parts) > 1 and not source["organization"]:
        # Skip if it's already identified as type or date
        if parts[1] != source["document_type"] and parts[1] != source["date"]:
            source["organization"] = parts[1]

    return source


def detect_subject(text: str) -> str:
    """Try to detect the subject from the text content."""
    # Look for common patterns
    patterns = [
        r"researching\s+(.+?)(?:'s|'s|\s+with|\s+economic|\s+landscape)",
        r"analysis\s+(?:of|on|for)\s+(.+?)(?:\s+with|\s+covering|\s*\.)",
        r"intelligence\s+brief\s+(?:on|for|covering)\s+(.+?)(?:\s+with|\s*\.)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text[:2000], re.IGNORECASE)
        if match:
            return match.group(1).strip()

    return "Unknown"


# --- COMMAND LINE USAGE ---

if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python parser_no_ai.py <input.txt> [output.json]")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else "output.json"

    with open(input_path, "r", encoding="utf-8") as f:
        raw_text = f.read()

    result = parse_alphasense_text(raw_text)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    print(f"Parsed {result['total_findings']} findings")
    print(f"  Emerging Trends: {result['metadata']['emerging_trend_count']}")
    print(f"  Opportunities:   {result['metadata']['strategic_opportunity_count']}")
    print(f"  Challenges:      {result['metadata']['key_challenge_count']}")
    print(f"Saved to {output_path}")
```

### Node.js Implementation

```javascript
/**
 * AlphaSense Text → JSON Parser (No AI Required)
 * Parses structured prose output into JSON.
 *
 * Usage:
 *   node parser_no_ai.js input.txt [output.json]
 */

const fs = require("fs");
const path = require("path");

function parseAlphaSenseText(text) {
  const findings = [];
  let synthesis = "";
  let currentCategory = null;
  let currentFinding = null;
  let inSynthesis = false;
  const synthesisLines = [];

  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = text.split("\n");

  const categoryMap = {
    "emerging trend": "Emerging Trend",
    "emerging trends": "Emerging Trend",
    "strategic opportunit": "Strategic Opportunity",
    "key challenge": "Key Challenge",
    "key challenges": "Key Challenge",
  };

  const impactRe = /impact\s*(?:level|assessment)?\s*[:—\-]\s*(high|medium|low)/i;
  const timeframeRe = /(?:timeframe|time\s*frame|timeline|horizon)\s*[:—\-]\s*(near[- ]term[^.]*|medium[- ]term[^.]*|long[- ]term[^.]*)/i;
  const sourceRe = /^source\s*[:—\-]\s*(.+)/i;
  const findingRe = /^(\d{1,2})\.\s+(.+)$/;
  const synthesisRe = /^(?:synthesis|summary|conclusion)\s*[:—\-]?\s*$/i;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }

    // Synthesis section
    if (synthesisRe.test(line)) {
      if (currentFinding) { findings.push(currentFinding); currentFinding = null; }
      inSynthesis = true;
      i++; continue;
    }
    if (inSynthesis) { synthesisLines.push(line); i++; continue; }

    // Category headers
    const lineLower = line.toLowerCase().replace(/[*#_ ]/g, "");
    let matchedCategory = null;
    for (const [key, value] of Object.entries(categoryMap)) {
      if (lineLower.includes(key) && line.length < 50) {
        matchedCategory = value; break;
      }
    }
    if (matchedCategory) {
      if (currentFinding) { findings.push(currentFinding); currentFinding = null; }
      currentCategory = matchedCategory;
      i++; continue;
    }

    // New finding
    const findingMatch = line.match(findingRe);
    if (findingMatch) {
      if (currentFinding) findings.push(currentFinding);
      currentFinding = {
        id: parseInt(findingMatch[1]),
        category: currentCategory || "Unknown",
        finding: findingMatch[2].replace(/:$/, "").trim(),
        description: "",
        impact_level: null,
        timeframe: null,
        source: { document_title: null, organization: null, document_type: null, date: null },
      };
      i++; continue;
    }

    // Extract fields from current finding
    if (currentFinding) {
      const impactMatch = line.match(impactRe);
      if (impactMatch) {
        currentFinding.impact_level = impactMatch[1].charAt(0).toUpperCase() + impactMatch[1].slice(1).toLowerCase();
        i++; continue;
      }

      const tfMatch = line.match(timeframeRe);
      if (tfMatch) {
        currentFinding.timeframe = normalizeTimeframe(tfMatch[1]);
        i++; continue;
      }

      const srcMatch = line.match(sourceRe);
      if (srcMatch) {
        currentFinding.source = parseSource(srcMatch[1]);
        i++; continue;
      }

      if (/^description\s*[:—\-]/i.test(line)) {
        currentFinding.description = line.replace(/^description\s*[:—\-]\s*/i, "");
        i++;
        while (i < lines.length) {
          const next = lines[i].trim();
          if (!next || /^(?:impact|timeframe|time frame|source|timeline|horizon)/i.test(next) || findingRe.test(next)) break;
          currentFinding.description += " " + next;
          i++;
        }
        continue;
      }

      // Default: append to description
      if (!currentFinding.description) {
        currentFinding.description = line;
      } else if (!/^(?:impact|timeframe|source|time frame)/i.test(line)) {
        currentFinding.description += " " + line;
      }
    }

    i++;
  }

  if (currentFinding) findings.push(currentFinding);
  synthesis = synthesisLines.join(" ").trim();

  // Renumber
  findings.forEach((f, idx) => { f.id = idx + 1; });

  const cats = findings.map((f) => f.category);
  const impacts = findings.map((f) => f.impact_level);

  return {
    subject: detectSubject(text),
    date_generated: new Date().toISOString().split("T")[0],
    total_findings: findings.length,
    findings,
    synthesis,
    metadata: {
      emerging_trend_count: cats.filter((c) => c === "Emerging Trend").length,
      strategic_opportunity_count: cats.filter((c) => c === "Strategic Opportunity").length,
      key_challenge_count: cats.filter((c) => c === "Key Challenge").length,
      high_impact_count: impacts.filter((i) => i === "High").length,
      medium_impact_count: impacts.filter((i) => i === "Medium").length,
      low_impact_count: impacts.filter((i) => i === "Low").length,
    },
  };
}

function normalizeTimeframe(raw) {
  const lower = raw.toLowerCase();
  if (lower.includes("near")) return "Near-term (0-12mo)";
  if (lower.includes("medium") || lower.includes("mid")) return "Medium-term (1-3yr)";
  if (lower.includes("long")) return "Long-term (3-5yr+)";
  return raw.trim();
}

function parseSource(raw) {
  const parts = raw.split(",").map((p) => p.trim());
  const source = { document_title: null, organization: null, document_type: null, date: null };
  const docTypes = ["Earnings Call", "Expert Transcript", "Broker Research", "Filing", "News", "Government Publication", "SEC Filing", "SEDAR Filing", "10-K", "10-Q", "Annual Report"];

  parts.forEach((part) => {
    for (const dt of docTypes) {
      if (part.toLowerCase().includes(dt.toLowerCase())) { source.document_type = part; return; }
    }
    if (/\d{4}[-/]\d{2}[-/]\d{2}/.test(part) || /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(part)) {
      source.date = part;
    }
  });

  if (parts[0] && parts[0] !== source.document_type && parts[0] !== source.date) source.document_title = parts[0];
  if (parts[1] && parts[1] !== source.document_type && parts[1] !== source.date) source.organization = parts[1];

  return source;
}

function detectSubject(text) {
  const patterns = [
    /researching\s+(.+?)(?:'s|'s|\s+with|\s+economic|\s+landscape)/i,
    /analysis\s+(?:of|on|for)\s+(.+?)(?:\s+with|\s+covering|\.)/i,
  ];
  for (const pattern of patterns) {
    const match = text.substring(0, 2000).match(pattern);
    if (match) return match[1].trim();
  }
  return "Unknown";
}

// --- CLI ---
if (require.main === module) {
  const inputPath = process.argv[2];
  const outputPath = process.argv[3] || "output.json";

  if (!inputPath) {
    console.log("Usage: node parser_no_ai.js <input.txt> [output.json]");
    process.exit(1);
  }

  const text = fs.readFileSync(inputPath, "utf-8");
  const result = parseAlphaSenseText(text);

  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), "utf-8");
  console.log(`Parsed ${result.total_findings} findings`);
  console.log(`  Emerging Trends: ${result.metadata.emerging_trend_count}`);
  console.log(`  Opportunities:   ${result.metadata.strategic_opportunity_count}`);
  console.log(`  Challenges:      ${result.metadata.key_challenge_count}`);
  console.log(`Saved to ${outputPath}`);
}

module.exports = { parseAlphaSenseText };
```

### Pros & Cons

- **Pro**: No API key, no external dependencies, no cost per conversion
- **Pro**: Fast — runs in milliseconds
- **Pro**: Can run entirely in the browser or on a server
- **Con**: Fragile — if AlphaSense changes its output format, the parser can break
- **Con**: Less accurate on edge cases (missing fields, unusual formatting)
- **Con**: Requires maintenance when format changes

### Best For

High-frequency conversions where cost matters, or environments where
external API calls are not allowed.

---

## APPROACH C: CLAUDE API INTEGRATION (Recommended)

### How It Works

Add the Claude API to your app. Send the raw AlphaSense text, get
clean JSON back. Handles any format variation automatically.

### Setup

1. Get an API key from https://console.anthropic.com
2. Add the key to your environment variables
3. Install the SDK

```bash
# Python
pip install anthropic pdfplumber
export ANTHROPIC_API_KEY="sk-ant-api03-..."

# Node.js
npm install @anthropic-ai/sdk pdf-parse
export ANTHROPIC_API_KEY="sk-ant-api03-..."
```

### Cost

Each conversion: **~$0.01 - $0.05** using Claude Sonnet.
100 conversions/month = **~$1 - $5/month**.

### The Extraction Prompt (Used by Both Implementations)

This is the system prompt that tells Claude how to parse the data:

```
You are a data extraction engine. You will receive the text output from
an AlphaSense market intelligence report. Your job is to parse it into
a strict JSON structure.

The report contains findings organized into three categories: Emerging
Trends, Strategic Opportunities, and Key Challenges. Each finding has
a number, category, finding title, detailed description, impact level,
timeframe, and source citation.

There may also be a synthesis section at the end.

Extract ALL findings and return ONLY valid JSON matching this exact
schema. No text before or after the JSON.

{
  "subject": "string — the country, region, or industry analyzed",
  "date_generated": "YYYY-MM-DD — today's date",
  "total_findings": number,
  "findings": [
    {
      "id": number,
      "category": "Emerging Trend | Strategic Opportunity | Key Challenge",
      "finding": "string — the short title/label",
      "description": "string — the full detailed description exactly as written",
      "impact_level": "High | Medium | Low",
      "timeframe": "Near-term (0-12mo) | Medium-term (1-3yr) | Long-term (3-5yr+)",
      "source": {
        "document_title": "string",
        "organization": "string",
        "document_type": "string",
        "date": "string — YYYY-MM-DD or as close as available"
      }
    }
  ],
  "synthesis": "string — the full synthesis paragraph",
  "metadata": {
    "emerging_trend_count": number,
    "strategic_opportunity_count": number,
    "key_challenge_count": number,
    "high_impact_count": number,
    "medium_impact_count": number,
    "low_impact_count": number
  }
}

RULES:
- Return ONLY the JSON. No markdown backticks, no commentary.
- Preserve descriptions exactly — do not summarize or shorten them.
- If a source date is approximate or missing, use the best available
  date and add "(approx)" to the date string.
- If any field is ambiguous or missing from the source text, use null.
- The metadata counts must match the actual data in the findings array.
- Ensure the JSON is valid and parseable.
```

### Python — Full Pipeline Script

```python
"""
AlphaSense → JSON Pipeline (Claude API)
Usage:
  python alphasense_to_json.py --pdf report.pdf --output output.json
  python alphasense_to_json.py --text input.txt --output output.json
"""

import argparse
import json
import sys
from pathlib import Path
import pdfplumber
import anthropic


EXTRACTION_PROMPT = """You are a data extraction engine. You will receive
the text output from an AlphaSense market intelligence report. Your job
is to parse it into a strict JSON structure.

The report contains findings organized into three categories: Emerging
Trends, Strategic Opportunities, and Key Challenges. Each finding has
a number, category, finding title, detailed description, impact level,
timeframe, and source citation.

Extract ALL findings and return ONLY valid JSON matching this exact
schema. No text before or after the JSON.

{
  "subject": "string",
  "date_generated": "YYYY-MM-DD",
  "total_findings": number,
  "findings": [
    {
      "id": number,
      "category": "Emerging Trend | Strategic Opportunity | Key Challenge",
      "finding": "string",
      "description": "string — preserve full detail",
      "impact_level": "High | Medium | Low",
      "timeframe": "Near-term (0-12mo) | Medium-term (1-3yr) | Long-term (3-5yr+)",
      "source": {
        "document_title": "string",
        "organization": "string",
        "document_type": "string",
        "date": "string"
      }
    }
  ],
  "synthesis": "string",
  "metadata": {
    "emerging_trend_count": number,
    "strategic_opportunity_count": number,
    "key_challenge_count": number,
    "high_impact_count": number,
    "medium_impact_count": number,
    "low_impact_count": number
  }
}

RULES:
- Return ONLY the JSON. No markdown, no commentary.
- Preserve descriptions exactly as written.
- Use null for missing fields.
- Ensure valid, parseable JSON."""


def extract_from_pdf(pdf_path: str) -> str:
    text_parts = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                text_parts.append(text)
    full_text = "\n\n".join(text_parts)
    if not full_text.strip():
        raise ValueError(f"No text extracted from {pdf_path}")
    return full_text


def extract_from_text_file(text_path: str) -> str:
    return Path(text_path).read_text(encoding="utf-8")


def parse_with_claude(raw_text: str) -> dict:
    client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY from env

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=8000,
        system="You are a data extraction engine. You ONLY output valid JSON. Never output explanations, markdown backticks, or any text that is not part of the JSON object.",
        messages=[
            {
                "role": "user",
                "content": f"{EXTRACTION_PROMPT}\n\n---\n\nHere is the AlphaSense output to parse:\n\n{raw_text}"
            }
        ]
    )

    text = message.content[0].text.strip()

    # Clean markdown fences if present
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()

    # Find JSON object if wrapped in extra text
    if not text.startswith("{"):
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1:
            text = text[start : end + 1]

    return json.loads(text)


def validate_output(data: dict) -> list:
    warnings = []

    if "findings" not in data:
        warnings.append("CRITICAL: Missing 'findings' array")
        return warnings

    findings = data["findings"]
    if len(findings) < 10:
        warnings.append(
            f"LOW COUNT: Only {len(findings)} findings (expected 15-24)"
        )
    if len(findings) > 30:
        warnings.append(
            f"HIGH COUNT: {len(findings)} findings (expected 15-24)"
        )

    categories = set(f["category"] for f in findings)
    expected = {"Emerging Trend", "Strategic Opportunity", "Key Challenge"}
    missing = expected - categories
    if missing:
        warnings.append(f"MISSING CATEGORIES: {missing}")

    for f in findings:
        if not f.get("source", {}).get("document_title"):
            warnings.append(
                f"Finding #{f.get('id')}: Missing source document title"
            )

    if not data.get("synthesis"):
        warnings.append("Missing synthesis section")

    return warnings


def main():
    parser = argparse.ArgumentParser(
        description="Convert AlphaSense output to structured JSON"
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--pdf", help="Path to AlphaSense PDF export")
    group.add_argument("--text", help="Path to text file with pasted output")
    parser.add_argument(
        "--output", "-o", default="output.json",
        help="Output JSON file path (default: output.json)"
    )

    args = parser.parse_args()

    # Step 1: Extract text
    print("Step 1: Extracting text...")
    if args.pdf:
        raw_text = extract_from_pdf(args.pdf)
    else:
        raw_text = extract_from_text_file(args.text)
    print(f"  Extracted {len(raw_text)} characters")

    # Step 2: Parse with Claude
    print("Step 2: Parsing with Claude API...")
    parsed = parse_with_claude(raw_text)
    print(f"  Extracted {len(parsed.get('findings', []))} findings")

    # Step 3: Validate
    print("Step 3: Validating...")
    warnings = validate_output(parsed)
    if warnings:
        for w in warnings:
            print(f"  WARNING: {w}")
    else:
        print("  All validations passed")

    # Save
    output_path = Path(args.output)
    output_path.write_text(
        json.dumps(parsed, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(f"\nDone! JSON saved to {output_path}")


if __name__ == "__main__":
    main()
```

### Node.js — Full Pipeline Script

```javascript
/**
 * AlphaSense → JSON Pipeline (Claude API)
 * Usage:
 *   node alphasense_to_json.js --pdf report.pdf --output output.json
 *   node alphasense_to_json.js --text input.txt --output output.json
 */

const fs = require("fs");
const path = require("path");
const Anthropic = require("@anthropic-ai/sdk");

const EXTRACTION_PROMPT = `You are a data extraction engine. You will
receive the text output from an AlphaSense market intelligence report.
Your job is to parse it into a strict JSON structure.

The report contains findings organized into three categories: Emerging
Trends, Strategic Opportunities, and Key Challenges. Each finding has
a number, category, finding title, detailed description, impact level,
timeframe, and source citation.

Extract ALL findings and return ONLY valid JSON matching this exact
schema. No text before or after the JSON.

{
  "subject": "string",
  "date_generated": "YYYY-MM-DD",
  "total_findings": number,
  "findings": [
    {
      "id": number,
      "category": "Emerging Trend | Strategic Opportunity | Key Challenge",
      "finding": "string",
      "description": "string — preserve full detail",
      "impact_level": "High | Medium | Low",
      "timeframe": "Near-term (0-12mo) | Medium-term (1-3yr) | Long-term (3-5yr+)",
      "source": {
        "document_title": "string",
        "organization": "string",
        "document_type": "string",
        "date": "string"
      }
    }
  ],
  "synthesis": "string",
  "metadata": {
    "emerging_trend_count": number,
    "strategic_opportunity_count": number,
    "key_challenge_count": number,
    "high_impact_count": number,
    "medium_impact_count": number,
    "low_impact_count": number
  }
}

RULES:
- Return ONLY the JSON. No markdown, no commentary.
- Preserve descriptions exactly as written.
- Use null for missing fields.
- Ensure valid, parseable JSON.`;

async function extractFromPDF(pdfPath) {
  const pdfParse = require("pdf-parse");
  const buffer = fs.readFileSync(pdfPath);
  const data = await pdfParse(buffer);
  if (!data.text.trim()) throw new Error(`No text extracted from ${pdfPath}`);
  return data.text;
}

function extractFromTextFile(textPath) {
  return fs.readFileSync(textPath, "utf-8");
}

async function parseWithClaude(rawText) {
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8000,
    system:
      "You are a data extraction engine. You ONLY output valid JSON. Never output explanations, markdown backticks, or any text that is not part of the JSON object.",
    messages: [
      {
        role: "user",
        content: `${EXTRACTION_PROMPT}\n\n---\n\nHere is the AlphaSense output to parse:\n\n${rawText}`,
      },
    ],
  });

  let text = message.content
    .map((item) => (item.type === "text" ? item.text : ""))
    .filter(Boolean)
    .join("\n")
    .trim();

  // Clean markdown fences
  if (text.startsWith("```json")) text = text.slice(7);
  else if (text.startsWith("```")) text = text.slice(3);
  if (text.endsWith("```")) text = text.slice(0, -3);
  text = text.trim();

  // Find JSON if wrapped in extra text
  if (!text.startsWith("{")) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end !== -1) text = text.substring(start, end + 1);
  }

  return JSON.parse(text);
}

function validate(data) {
  const warnings = [];
  if (!data.findings) {
    warnings.push("CRITICAL: Missing findings array");
    return warnings;
  }
  if (data.findings.length < 10) warnings.push(`LOW COUNT: Only ${data.findings.length} findings`);
  if (data.findings.length > 30) warnings.push(`HIGH COUNT: ${data.findings.length} findings`);

  const cats = new Set(data.findings.map((f) => f.category));
  for (const expected of ["Emerging Trend", "Strategic Opportunity", "Key Challenge"]) {
    if (!cats.has(expected)) warnings.push(`MISSING CATEGORY: ${expected}`);
  }

  data.findings.forEach((f) => {
    if (!f.source?.document_title) warnings.push(`Finding #${f.id}: Missing source`);
  });

  if (!data.synthesis) warnings.push("Missing synthesis");
  return warnings;
}

async function main() {
  const args = process.argv.slice(2);
  let rawText, outputPath = "output.json";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--pdf" && args[i + 1]) {
      console.log("Step 1: Extracting text from PDF...");
      rawText = await extractFromPDF(args[++i]);
    } else if (args[i] === "--text" && args[i + 1]) {
      console.log("Step 1: Reading text file...");
      rawText = extractFromTextFile(args[++i]);
    } else if ((args[i] === "--output" || args[i] === "-o") && args[i + 1]) {
      outputPath = args[++i];
    }
  }

  if (!rawText) {
    console.log("Usage:");
    console.log("  node alphasense_to_json.js --pdf report.pdf --output output.json");
    console.log("  node alphasense_to_json.js --text input.txt --output output.json");
    process.exit(1);
  }

  console.log(`  Extracted ${rawText.length} characters`);

  console.log("Step 2: Parsing with Claude API...");
  const parsed = await parseWithClaude(rawText);
  console.log(`  Extracted ${parsed.findings?.length || 0} findings`);

  console.log("Step 3: Validating...");
  const warnings = validate(parsed);
  if (warnings.length) warnings.forEach((w) => console.log(`  WARNING: ${w}`));
  else console.log("  All validations passed");

  fs.writeFileSync(outputPath, JSON.stringify(parsed, null, 2), "utf-8");
  console.log(`\nDone! JSON saved to ${outputPath}`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
```

### API Endpoint (For Web App Integration)

If your app has an Express/FastAPI backend, add this endpoint so
the frontend can call it:

#### Express.js (Node)

```javascript
const express = require("express");
const Anthropic = require("@anthropic-ai/sdk");

const app = express();
app.use(express.json({ limit: "5mb" }));

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

app.post("/api/convert-alphasense", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.length < 200) {
      return res.status(400).json({ error: "Input text too short" });
    }

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      system: "You are a data extraction engine. You ONLY output valid JSON.",
      messages: [
        {
          role: "user",
          content: `${EXTRACTION_PROMPT}\n\n---\n\n${text}`,
        },
      ],
    });

    let response = message.content
      .map((item) => (item.type === "text" ? item.text : ""))
      .filter(Boolean)
      .join("\n")
      .trim();

    // Clean and parse
    if (response.startsWith("```json")) response = response.slice(7);
    if (response.startsWith("```")) response = response.slice(3);
    if (response.endsWith("```")) response = response.slice(0, -3);
    response = response.trim();

    if (!response.startsWith("{")) {
      const s = response.indexOf("{");
      const e = response.lastIndexOf("}");
      if (s !== -1 && e !== -1) response = response.substring(s, e + 1);
    }

    const parsed = JSON.parse(response);
    res.json(parsed);
  } catch (err) {
    console.error("Conversion error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3001, () => console.log("Converter API running on :3001"));
```

#### FastAPI (Python)

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import anthropic
import json

app = FastAPI()
client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY from env


class ConvertRequest(BaseModel):
    text: str


@app.post("/api/convert-alphasense")
async def convert(req: ConvertRequest):
    if len(req.text) < 200:
        raise HTTPException(400, "Input text too short")

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=8000,
        system="You are a data extraction engine. You ONLY output valid JSON.",
        messages=[
            {
                "role": "user",
                "content": f"{EXTRACTION_PROMPT}\n\n---\n\n{req.text}",
            }
        ],
    )

    text = message.content[0].text.strip()
    for prefix in ["```json", "```"]:
        if text.startswith(prefix):
            text = text[len(prefix) :]
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()

    if not text.startswith("{"):
        s, e = text.find("{"), text.rfind("}")
        if s != -1 and e != -1:
            text = text[s : e + 1]

    return json.loads(text)
```

### Pros & Cons

- **Pro**: Handles any format variation — most robust solution
- **Pro**: Near-perfect accuracy on every conversion
- **Pro**: Easy to maintain — no parser updates needed when format changes
- **Con**: Requires API key and small per-conversion cost
- **Con**: Adds ~5-10 seconds latency per conversion
- **Con**: External dependency on Anthropic API

### Best For

Production use. This is the recommended approach for any automated or
regular workflow.

---

## RECOMMENDATION

Use **Approach C (Claude API)** for your production pipeline. It's the
most reliable, handles format variations automatically, and costs
almost nothing. Use **Approach A (manual Claude paste)** as a fallback
when you need a quick one-off conversion without touching code. Keep
**Approach B (regex parser)** as a backup if you ever need to run
conversions without any external API access.

---

## WEBSITE INTEGRATION NOTES

1. **Storage**: Store each JSON output keyed by `subject` + `date_generated`
2. **Rendering**: The `findings` array maps directly to cards, table rows,
   or accordion components
3. **Filtering**: Use `category`, `impact_level`, and `timeframe` for
   client-side filtering and sorting
4. **Sources**: Render `source` objects as citation footnotes or
   expandable details
5. **Refresh cadence**: Run the pipeline monthly or quarterly per subject
6. **Versioning**: Keep previous JSON outputs to show trend evolution
