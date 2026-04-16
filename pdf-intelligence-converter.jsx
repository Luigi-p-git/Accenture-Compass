import { useState, useRef, useCallback, useEffect } from "react";

const SCHEMA_PROMPT = `Convert this intelligence report into JSON matching this EXACT schema. Output ONLY the JSON — no markdown fences, no explanation.
{
  "trends": [
    {
      "t": "Finding title (5-10 words)",
      "tag": "Technology|Market|Sustainability|Resources|Financial Services|Trade|Workforce|Health",
      "d": "Full description paragraph with data points, dollar figures, percentages",
      "ic": "Material icon name: eco|account_balance|warning|psychology|cloud|show_chart|bolt|shield|trending_up|memory|school|bar_chart|directions_car|health_and_safety|home",
      "source": {
        "document_title": "string or null",
        "organization": "string or null",
        "document_type": "string or null",
        "date": "string or null",
        "url": "https://... or null",
        "headline": null,
        "citation_id": 15
      },
      "affected_companies": [
        { "name": "Company Name", "ticker": "TICK or null", "impact": "positive|negative|neutral", "detail": "One sentence impact detail" }
      ],
      "key_metrics": []
    }
  ],
  "opportunities": [
    {
      "t": "Opportunity title",
      "p": "Market value (e.g. $42B market)",
      "timeline": "Near-term (0-12mo)|Medium-term (1-3yr)|Long-term (3-5yr+)",
      "d": "Full description",
      "ic": "icon_name",
      "priority": number_of_linked_companies,
      "source": {
        "document_title": "string or null",
        "organization": "string or null",
        "document_type": "string or null",
        "date": "string or null",
        "url": "https://... or null",
        "headline": null,
        "citation_id": 42
      },
      "affected_companies": [ { "name": "Company Name", "ticker": "TICK or null", "impact": "positive|negative|neutral", "detail": "One sentence impact detail" } ],
      "key_metrics": []
    }
  ],
  "challenges": [
    {
      "t": "Challenge title",
      "d": "Full description",
      "severity": "critical|high|medium|low (4+ companies=critical, 3=high, 2=medium, 0-1=low)",
      "ic": "icon_name",
      "source": {
        "document_title": "string or null",
        "organization": "string or null",
        "document_type": "string or null",
        "date": "string or null",
        "url": "https://... or null",
        "headline": null,
        "citation_id": 7
      },
      "affected_companies": [ { "name": "Company Name", "ticker": "TICK or null", "impact": "positive|negative|neutral", "detail": "One sentence impact detail" } ],
      "key_metrics": []
    }
  ],
  "synthesis": "3-5 sentence executive summary connecting key themes",
  "source": {
    "subject": "Country + Industry (e.g. United States Chemicals & Natural Resources)",
    "date_generated": "2026-04-15",
    "total_findings": "total_number_of_trends_plus_opportunities_plus_challenges"
  },
  "news_items": [
    {
      "id": "sequential_number",
      "citation_id": 23,
      "headline": "Editorial-style headline",
      "summary": "2-3 sentence summary",
      "source_org": "Organization name",
      "date": "date string or null",
      "type": "Broker Research|Earnings Call|News|Government Publication|null",
      "url": "https://... or null",
      "related_finding_ids": [],
      "analyst_quote": "Direct quote from analyst — or omit this field"
    }
  ],
  "financial_highlights": [
    {
      "id": "sequential_number",
      "metric": "Metric Name (include time period, e.g. 'Brent Crude (Mar 2026)')",
      "current_value": "$42B or 5.8% etc",
      "previous_value": null,
      "change": "+35% or -2pp etc",
      "chart_type": "bar",
      "data_points": []
    }
  ],
  "top_companies": [
    {
      "name": "Company Name",
      "ticker": "TICK or null",
      "sector": "Industry sector",
      "hq": "City, State/Country",
      "revenue": "$88.9B",
      "key_initiatives": ["Initiative 1 [15]", "Initiative 2 [42]", "Initiative 3 [7]"],
      "investment_focus": "2-3 sentences on investment priorities",
      "recent_moves": ["Recent move 1 [23]", "Recent move 2 [45]"],
      "logo_url": "https://www.google.com/s2/favicons?domain=company-website.com&sz=128",
      "linked_findings": {
        "trends": [0, 2, 4],
        "opportunities": [1, 3],
        "challenges": [0]
      }
    }
  ]
}

CITATION TRACKING — CRITICAL:
The PDF contains numbered citations in brackets like [1], [2], [15], [42] throughout the text body. These map to source documents listed in the Citations section at the end of the PDF.

For EVERY finding and news item, you MUST identify the PRIMARY citation [N] from the PDF text and include it as "citation_id" (integer only, no brackets).

HOW TO FIND THE RIGHT CITATION NUMBER:
- Look for [N] brackets in the PDF text near the data points used in each finding
- The Citations section at the end lists: [N] Organization • Date • "Document Title"
- Match the citation that best corresponds to the finding's primary source
- Use citation numbers that appear as CLICKABLE LINKS in the body text (these are typically lower numbers that appear inline near facts and figures)
- For key_initiatives and recent_moves: preserve the citation bracket inline, e.g. "Expanded into new market segment [14]"
- EVERY finding MUST have a citation_id — do not skip any

FINANCIAL HIGHLIGHTS — DATA QUALITY:
- Only include ACTUAL reported figures — not forecasts or analyst estimates
- Include the time period in the metric name (e.g. "FY 2025 Revenue", "Q1 2026 Margin", "Apr 2026 Index")
- For market prices or indices: use the specific date-anchored value from the document
- 8-12 financial_highlights

GENERAL RULES:
- linked_findings use 0-BASED INDICES into the trends/opportunities/challenges arrays
- logo_url: use Google favicon with the company's REAL website domain
- Extract ALL findings — do not skip any
- severity based on how many companies are affected
- priority = count of linked companies for that opportunity
- 10 top_companies minimum with investment_focus and recent_moves
- 10-15 news_items with analyst quotes where available`;

// ─── Utility Components ──────────────────────────────────────────
function StatusPill({ color, children }) {
  const colors = {
    blue: { bg: "rgba(59,130,246,0.12)", text: "#3b82f6", border: "rgba(59,130,246,0.25)" },
    green: { bg: "rgba(34,197,94,0.12)", text: "#22c55e", border: "rgba(34,197,94,0.25)" },
    amber: { bg: "rgba(245,158,11,0.12)", text: "#f59e0b", border: "rgba(245,158,11,0.25)" },
    red: { bg: "rgba(239,68,68,0.12)", text: "#ef4444", border: "rgba(239,68,68,0.25)" },
    slate: { bg: "rgba(148,163,184,0.12)", text: "#94a3b8", border: "rgba(148,163,184,0.25)" },
  };
  const c = colors[color] || colors.slate;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600,
      letterSpacing: "0.03em", background: c.bg, color: c.text,
      border: `1px solid ${c.border}`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 99, background: c.text }} />
      {children}
    </span>
  );
}

function IconBtn({ onClick, children, title, disabled, primary }) {
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        gap: 6, padding: "8px 16px", borderRadius: 8, border: "none",
        fontSize: 13, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        background: primary ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "rgba(255,255,255,0.06)",
        color: primary ? "#fff" : "rgba(255,255,255,0.7)",
        transition: "all 0.2s",
      }}
    >
      {children}
    </button>
  );
}

// ─── Tab System ──────────────────────────────────────────────────
function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: "flex", gap: 2, background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 3 }}>
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            flex: 1, padding: "8px 14px", borderRadius: 8, border: "none",
            fontSize: 12, fontWeight: 600, cursor: "pointer",
            background: active === t.id ? "rgba(99,102,241,0.2)" : "transparent",
            color: active === t.id ? "#a5b4fc" : "rgba(255,255,255,0.45)",
            transition: "all 0.2s",
          }}
        >
          {t.icon} {t.label}
        </button>
      ))}
    </div>
  );
}

// ─── JSON Viewer ─────────────────────────────────────────────────
function JsonViewer({ data }) {
  const [collapsed, setCollapsed] = useState({});
  const toggle = (path) => setCollapsed(p => ({ ...p, [path]: !p[path] }));

  const renderValue = (val, path, depth) => {
    if (val === null) return <span style={{ color: "#f97316" }}>null</span>;
    if (typeof val === "boolean") return <span style={{ color: "#f97316" }}>{val.toString()}</span>;
    if (typeof val === "number") return <span style={{ color: "#22d3ee" }}>{val}</span>;
    if (typeof val === "string") {
      if (val.length > 120) {
        return <span style={{ color: "#a3e635" }}>"{val.slice(0, 120)}…"</span>;
      }
      return <span style={{ color: "#a3e635" }}>"{val}"</span>;
    }
    if (Array.isArray(val)) {
      if (val.length === 0) return <span style={{ color: "rgba(255,255,255,0.3)" }}>[]</span>;
      const isCollapsed = collapsed[path];
      return (
        <span>
          <span onClick={() => toggle(path)} style={{ cursor: "pointer", color: "#94a3b8", userSelect: "none" }}>
            {isCollapsed ? "▸" : "▾"} [{val.length}]
          </span>
          {!isCollapsed && (
            <div style={{ marginLeft: 18, borderLeft: "1px solid rgba(255,255,255,0.06)", paddingLeft: 12 }}>
              {val.map((item, i) => (
                <div key={i} style={{ marginTop: 2 }}>
                  <span style={{ color: "#64748b", fontSize: 10 }}>{i}: </span>
                  {renderValue(item, `${path}[${i}]`, depth + 1)}
                </div>
              ))}
            </div>
          )}
        </span>
      );
    }
    if (typeof val === "object") {
      const keys = Object.keys(val);
      if (keys.length === 0) return <span style={{ color: "rgba(255,255,255,0.3)" }}>{"{}"}</span>;
      const isCollapsed = collapsed[path];
      return (
        <span>
          <span onClick={() => toggle(path)} style={{ cursor: "pointer", color: "#94a3b8", userSelect: "none" }}>
            {isCollapsed ? "▸" : "▾"} {"{"}
            {isCollapsed && <span style={{ color: "#64748b" }}> {keys.length} keys </span>}
            {isCollapsed && "}"}
          </span>
          {!isCollapsed && (
            <div style={{ marginLeft: 18, borderLeft: "1px solid rgba(255,255,255,0.06)", paddingLeft: 12 }}>
              {keys.map(k => (
                <div key={k} style={{ marginTop: 2 }}>
                  <span style={{ color: "#c084fc" }}>"{k}"</span>
                  <span style={{ color: "#64748b" }}>: </span>
                  {renderValue(val[k], `${path}.${k}`, depth + 1)}
                </div>
              ))}
            </div>
          )}
          {!isCollapsed && <div>{"}"}</div>}
        </span>
      );
    }
    return <span>{String(val)}</span>;
  };

  return (
    <div style={{
      fontFamily: "'SFMono-Regular', 'Cascadia Code', 'Consolas', monospace", fontSize: 12,
      lineHeight: 1.6, color: "rgba(255,255,255,0.8)", overflow: "auto",
      maxHeight: 500, padding: 16,
    }}>
      {renderValue(data, "root", 0)}
    </div>
  );
}

// ─── Stats Dashboard ─────────────────────────────────────────────
function StatsDashboard({ data }) {
  if (!data) return null;
  const stats = [
    { label: "Trends", value: data.trends?.length || 0, color: "#6366f1", icon: "📈" },
    { label: "Opportunities", value: data.opportunities?.length || 0, color: "#22c55e", icon: "🎯" },
    { label: "Challenges", value: data.challenges?.length || 0, color: "#ef4444", icon: "⚠️" },
    { label: "Companies", value: data.top_companies?.length || 0, color: "#f59e0b", icon: "🏢" },
    { label: "News Items", value: data.news_items?.length || 0, color: "#06b6d4", icon: "📰" },
    { label: "Financials", value: data.financial_highlights?.length || 0, color: "#8b5cf6", icon: "💰" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
      {stats.map(s => (
        <div key={s.label} style={{
          background: `linear-gradient(135deg, ${s.color}11, ${s.color}08)`,
          border: `1px solid ${s.color}30`, borderRadius: 10, padding: "12px 14px",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ fontSize: 22 }}>{s.icon}</span>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.color, fontFamily: "system-ui, -apple-system, sans-serif" }}>{s.value}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>{s.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Image Gallery ───────────────────────────────────────────────
function ImageGallery({ images }) {
  const [selected, setSelected] = useState(null);

  if (!images || images.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.3)" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🖼️</div>
        <div style={{ fontSize: 13 }}>No images extracted yet</div>
        <div style={{ fontSize: 11, marginTop: 4 }}>Upload a PDF to extract embedded images</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
        {images.map((img, i) => (
          <div
            key={i}
            onClick={() => setSelected(i)}
            style={{
              borderRadius: 10, overflow: "hidden", cursor: "pointer",
              border: selected === i ? "2px solid #6366f1" : "1px solid rgba(255,255,255,0.08)",
              background: "rgba(0,0,0,0.3)", transition: "all 0.2s",
              aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <img
              src={img.dataUrl}
              alt={`Extracted ${i + 1}`}
              style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
            />
          </div>
        ))}
      </div>
      {selected !== null && images[selected] && (
        <div style={{
          marginTop: 12, borderRadius: 10, overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.4)",
          padding: 16, textAlign: "center",
        }}>
          <img src={images[selected].dataUrl} alt="Preview" style={{ maxWidth: "100%", maxHeight: 400, objectFit: "contain", borderRadius: 6 }} />
          <div style={{ marginTop: 8, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
            Page {images[selected].page} • {images[selected].width}×{images[selected].height} • Image {selected + 1} of {images.length}
          </div>
          <a
            href={images[selected].dataUrl}
            download={`extracted-image-${selected + 1}.png`}
            style={{
              display: "inline-block", marginTop: 8, padding: "6px 14px",
              borderRadius: 6, background: "rgba(99,102,241,0.2)", color: "#a5b4fc",
              fontSize: 11, fontWeight: 600, textDecoration: "none",
            }}
          >
            ↓ Download
          </a>
        </div>
      )}
    </div>
  );
}

// ─── PDF.js Image Extractor (client-side) ────────────────────────
async function extractImagesFromPdf(file) {
  // Extract only EMBEDDED images (charts, photos, logos) — not full page renders
  const pdfjsLib = window.pdfjsLib;
  if (!pdfjsLib) return [];

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const images = [];
  const seenKeys = new Set(); // deduplicate images that appear on multiple pages

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const ops = await page.getOperatorList();

    for (let j = 0; j < ops.fnArray.length; j++) {
      // OPS.paintImageXObject = 85, OPS.paintJpegXObject = 82
      if (ops.fnArray[j] === 85 || ops.fnArray[j] === 82) {
        const imgName = ops.argsArray[j][0];
        if (seenKeys.has(imgName)) continue; // skip duplicates (headers/footers/watermarks)
        seenKeys.add(imgName);

        try {
          const imgData = await new Promise((resolve, reject) => {
            page.objs.get(imgName, (obj) => {
              if (obj) resolve(obj); else reject(new Error("no obj"));
            });
          });

          // Skip tiny images (icons, bullets, decorative dots — typically < 50px)
          const w = imgData.width;
          const h = imgData.height;
          if (w < 50 || h < 50) continue;

          // Draw image data onto a canvas to get a dataURL
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");

          // Handle different image data formats from pdf.js
          let imageDataObj;
          if (imgData.bitmap) {
            // ImageBitmap path (newer pdf.js)
            ctx.drawImage(imgData.bitmap, 0, 0);
          } else if (imgData.data) {
            // Raw pixel data path
            const arr = imgData.data instanceof Uint8ClampedArray
              ? imgData.data
              : new Uint8ClampedArray(imgData.data);

            if (imgData.kind === 2) {
              // RGB — need to expand to RGBA
              const rgba = new Uint8ClampedArray(w * h * 4);
              for (let p = 0, q = 0; p < arr.length; p += 3, q += 4) {
                rgba[q] = arr[p];
                rgba[q + 1] = arr[p + 1];
                rgba[q + 2] = arr[p + 2];
                rgba[q + 3] = 255;
              }
              imageDataObj = new ImageData(rgba, w, h);
            } else if (imgData.kind === 1) {
              // Grayscale — expand to RGBA
              const rgba = new Uint8ClampedArray(w * h * 4);
              for (let p = 0, q = 0; p < arr.length; p++, q += 4) {
                rgba[q] = rgba[q + 1] = rgba[q + 2] = arr[p];
                rgba[q + 3] = 255;
              }
              imageDataObj = new ImageData(rgba, w, h);
            } else {
              // RGBA or other — try direct
              imageDataObj = new ImageData(arr, w, h);
            }
            ctx.putImageData(imageDataObj, 0, 0);
          } else {
            continue; // unknown format, skip
          }

          const dataUrl = canvas.toDataURL("image/png");
          images.push({ dataUrl, page: i, width: w, height: h });
        } catch {
          // skip images that fail to extract
        }
      }
    }
  }
  return images;
}

// ─── Main App ────────────────────────────────────────────────────
export default function PDFIntelligenceConverter() {
  const [file, setFile] = useState(null);
  const [pdfText, setPdfText] = useState("");
  const [jsonResult, setJsonResult] = useState(null);
  const [rawJson, setRawJson] = useState("");
  const [images, setImages] = useState([]);
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState("");
  const [activeTab, setActiveTab] = useState("json");
  const [viewMode, setViewMode] = useState("tree");
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [pdfjsLoaded, setPdfjsLoaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef(null);

  // Load pdf.js
  useEffect(() => {
    try {
      if (window.pdfjsLib) { setPdfjsLoaded(true); return; }
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      script.onload = () => {
        try {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
          setPdfjsLoaded(true);
        } catch (e) { console.error("pdf.js init error", e); }
      };
      script.onerror = () => console.error("Failed to load pdf.js");
      document.head.appendChild(script);
    } catch (e) { console.error("pdf.js load error", e); }
  }, []);

  const readPdfText = useCallback(async (f) => {
    if (!window.pdfjsLib) return "";
    const arrayBuffer = await f.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let allText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(" ");
      allText += `\n--- Page ${i} ---\n${pageText}`;
    }
    return allText;
  }, []);

  const handleFile = useCallback(async (f) => {
    if (!f || f.type !== "application/pdf") {
      setError("Please upload a PDF file");
      return;
    }
    setFile(f);
    setError(null);
    setJsonResult(null);
    setRawJson("");
    setImages([]);
    setStatus("reading");
    setProgress("Reading PDF text…");

    try {
      const text = await readPdfText(f);
      setPdfText(text);
      setProgress("Extracting embedded images (charts, graphs, photos)…");

      const imgs = await extractImagesFromPdf(f);
      setImages(imgs);
      setStatus("ready");
      setProgress("");
    } catch (err) {
      setError(`Failed to read PDF: ${err.message}`);
      setStatus("idle");
    }
  }, [readPdfText]);

  const convertToJson = useCallback(async () => {
    if (!pdfText) return;
    setStatus("converting");
    setProgress("Sending to Claude for structured extraction…");
    setError(null);

    try {
      // Truncate if too long
      const maxLen = 90000;
      const textToSend = pdfText.length > maxLen ? pdfText.slice(0, maxLen) + "\n\n[TRUNCATED — document too long]" : pdfText;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 16000,
          messages: [
            {
              role: "user",
              content: `${SCHEMA_PROMPT}\n\nHere is the document text:\n\n${textToSend}`
            }
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.content.map(b => b.type === "text" ? b.text : "").join("");
      const clean = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

      try {
        const parsed = JSON.parse(clean);
        setJsonResult(parsed);
        setRawJson(JSON.stringify(parsed, null, 2));
        setStatus("done");
        setProgress("");
      } catch {
        // Try to find JSON in the response
        const match = clean.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          setJsonResult(parsed);
          setRawJson(JSON.stringify(parsed, null, 2));
          setStatus("done");
          setProgress("");
        } else {
          throw new Error("Could not parse JSON from response");
        }
      }
    } catch (err) {
      setError(`Conversion failed: ${err.message}`);
      setStatus("ready");
      setProgress("");
    }
  }, [pdfText]);

  const downloadJson = useCallback(() => {
    if (!rawJson) return;
    const blob = new Blob([rawJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (file?.name || "report").replace(/\.pdf$/i, "") + "_intelligence.json";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }, [rawJson, file]);

  const downloadAllImages = useCallback(() => {
    images.forEach((img, i) => {
      setTimeout(() => {
        const a = document.createElement("a");
        a.href = img.dataUrl;
        a.download = `page-${img.page}-image-${i + 1}.png`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => document.body.removeChild(a), 100);
      }, i * 300);
    });
  }, [images]);

  const doCopy = useCallback((text) => {
    // Try multiple clipboard approaches for sandbox compatibility
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }, []);

  const fallbackCopy = useCallback((text) => {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;left:-9999px;top:-9999px;opacity:0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand("copy");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Last resort: open in a new window for manual copy
      const w = window.open("", "_blank", "width=600,height=400");
      if (w) {
        w.document.write("<pre style='white-space:pre-wrap;word-wrap:break-word;font-size:12px'>" + text.replace(/</g, "&lt;") + "</pre>");
        w.document.title = "Copy JSON";
      }
    }
    document.body.removeChild(ta);
  }, []);

  const copyJson = useCallback(() => {
    if (rawJson) doCopy(rawJson);
  }, [rawJson, doCopy]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const tabs = [
    { id: "json", label: "JSON Output", icon: "{ }" },
    { id: "images", label: `Images (${images.length})`, icon: "🖼️" },
    { id: "raw", label: "Raw Text", icon: "📄" },
  ];

  const statusColors = {
    idle: "slate", reading: "blue", ready: "amber", converting: "blue", done: "green",
  };
  const statusLabels = {
    idle: "Waiting", reading: "Reading PDF", ready: "Ready to Convert", converting: "AI Processing", done: "Complete",
  };

  return (
    <div style={{
      minHeight: "100vh", fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
      background: "linear-gradient(145deg, #0c0c1d 0%, #111128 40%, #0d1117 100%)",
      color: "#e2e8f0",
    }}>
      {/* Header */}
      <div style={{
        padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(0,0,0,0.2)", backdropFilter: "blur(20px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, fontWeight: 700, color: "#fff",
            }}>⚡</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em" }}>
                PDF Intelligence Converter
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                JSON Schema Extractor + Image Export
              </div>
            </div>
          </div>
          <StatusPill color={statusColors[status]}>{statusLabels[status]}</StatusPill>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 16px" }}>
        {/* Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? "#6366f1" : "rgba(255,255,255,0.1)"}`,
            borderRadius: 14, padding: file ? "14px 20px" : "36px 20px",
            textAlign: "center", cursor: "pointer",
            background: dragOver ? "rgba(99,102,241,0.06)" : "rgba(255,255,255,0.02)",
            transition: "all 0.3s", marginBottom: 16,
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf"
            onChange={(e) => handleFile(e.target.files?.[0])}
            style={{ display: "none" }}
          />
          {file ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 15, fontWeight: 700, color: "#ef4444",
                }}>PDF</div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{file.name}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                    {(file.size / 1024).toFixed(0)} KB • {pdfText ? `${pdfText.length.toLocaleString()} chars extracted` : "Processing…"}
                  </div>
                </div>
              </div>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Click to change</span>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.5 }}>📎</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                Drop PDF here or click to browse
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                Intelligence reports, research docs, financial filings
              </div>
            </>
          )}
        </div>

        {/* Progress / Error */}
        {progress && (
          <div style={{
            padding: "10px 14px", borderRadius: 8, marginBottom: 12,
            background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.15)",
            fontSize: 12, color: "#a5b4fc", display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{
              width: 14, height: 14, border: "2px solid #6366f1", borderTopColor: "transparent",
              borderRadius: 99, animation: "spin 0.8s linear infinite",
            }} />
            {progress}
          </div>
        )}
        {error && (
          <div style={{
            padding: "10px 14px", borderRadius: 8, marginBottom: 12,
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)",
            fontSize: 12, color: "#fca5a5",
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Action Bar */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <IconBtn
            primary
            disabled={status !== "ready" && status !== "done"}
            onClick={convertToJson}
          >
            ⚡ Convert to JSON
          </IconBtn>
          {jsonResult && (
            <>
              <IconBtn onClick={downloadJson}>↓ Download JSON</IconBtn>
              <IconBtn onClick={copyJson}>📋 Copy</IconBtn>
            </>
          )}
          {images.length > 0 && (
            <IconBtn onClick={downloadAllImages}>🖼️ Download All Images ({images.length})</IconBtn>
          )}
        </div>

        {/* Stats */}
        {jsonResult && <StatsDashboard data={jsonResult} />}

        {/* Synthesis */}
        {jsonResult?.synthesis && (
          <div style={{
            padding: "14px 16px", borderRadius: 10, marginBottom: 16,
            background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.06))",
            border: "1px solid rgba(99,102,241,0.15)", fontSize: 13, lineHeight: 1.6,
            color: "rgba(255,255,255,0.75)",
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#a5b4fc", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
              Executive Synthesis
            </div>
            {jsonResult.synthesis}
          </div>
        )}

        {/* Tabs + Content */}
        {(file || jsonResult) && (
          <div style={{
            borderRadius: 12, overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(0,0,0,0.25)",
          }}>
            <div style={{ padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
            </div>

            {activeTab === "json" && (
              <div>
                {jsonResult ? (
                  <div>
                    <div style={{
                      padding: "6px 12px", borderBottom: "1px solid rgba(255,255,255,0.04)",
                      display: "flex", gap: 4, alignItems: "center",
                    }}>
                      {["tree", "raw"].map(m => (
                        <button
                          key={m}
                          onClick={() => setViewMode(m)}
                          style={{
                            padding: "4px 10px", borderRadius: 6, border: "none", fontSize: 11, fontWeight: 600,
                            cursor: "pointer",
                            background: viewMode === m ? "rgba(99,102,241,0.15)" : "transparent",
                            color: viewMode === m ? "#a5b4fc" : "rgba(255,255,255,0.35)",
                          }}
                        >
                          {m === "tree" ? "🌲 Tree" : "{ } Raw"}
                        </button>
                      ))}
                      <div style={{ flex: 1 }} />
                      <button
                        onClick={() => { if (rawJson) doCopy(rawJson); }}
                        style={{
                          padding: "4px 12px", borderRadius: 6, border: "1px solid rgba(99,102,241,0.25)",
                          fontSize: 11, fontWeight: 600, cursor: "pointer",
                          background: copied ? "rgba(34,197,94,0.15)" : "rgba(99,102,241,0.1)",
                          color: copied ? "#4ade80" : "#a5b4fc",
                          display: "flex", alignItems: "center", gap: 5,
                          transition: "all 0.2s",
                        }}
                      >
                        {copied ? "✓ Copied!" : "📋 Copy JSON"}
                      </button>
                    </div>
                    {viewMode === "tree" ? (
                      <JsonViewer data={jsonResult} />
                    ) : (
                      <pre style={{
                        margin: 0, padding: 16, fontSize: 11,
                        fontFamily: "'SFMono-Regular', 'Cascadia Code', 'Consolas', monospace",
                        color: "rgba(255,255,255,0.7)", overflow: "auto",
                        maxHeight: 500, whiteSpace: "pre-wrap",
                      }}>
                        {rawJson}
                      </pre>
                    )}
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.25)" }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>{"{ }"}</div>
                    <div style={{ fontSize: 13 }}>JSON output will appear here</div>
                    <div style={{ fontSize: 11, marginTop: 4 }}>Click "Convert to JSON" to extract structured data</div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "images" && (
              <div style={{ padding: 12 }}>
                <ImageGallery images={images} />
              </div>
            )}

            {activeTab === "raw" && (
              <pre style={{
                margin: 0, padding: 16, fontSize: 11,
                fontFamily: "'SFMono-Regular', 'Cascadia Code', 'Consolas', monospace",
                color: "rgba(255,255,255,0.6)", overflow: "auto",
                maxHeight: 500, whiteSpace: "pre-wrap",
              }}>
                {pdfText || "No text extracted yet"}
              </pre>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        html, body, #root { margin: 0; padding: 0; background: #0c0c1d; min-height: 100vh; }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        button:hover:not(:disabled) { filter: brightness(1.15); }
      `}</style>
    </div>
  );
}
