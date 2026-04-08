'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';

const STAGE_NAMES: Record<string, string> = {
  parse: 'Parsing Document', classify: 'Classifying Data', extract: 'Extracting Structure',
  cluster: 'Clustering & Matching', validate: 'Validating Quality', stage: 'Staging Changes',
};

const TARGET_SCHEMAS: Record<string, { label: string; attrs: string[] }> = {
  'revenue-trend': { label: 'Revenue Trend', attrs: ['year', 'revenue', 'growth_pct'] },
  'client-group': { label: 'Client Group Revenue', attrs: ['sector', 'revenue', 'growth_pct'] },
  'top-clients': { label: 'Top 10 Clients', attrs: ['name', 'initials', 'sector', 'revenue', 'growth_pct'] },
  'talent-headcount': { label: 'Talent Headcount', attrs: ['city', 'province', 'headcount'] },
  'talent-skills': { label: 'Skill Breakdown', attrs: ['skill_name', 'count', 'percentage', 'growth'] },
  'macro-indicators': { label: 'Macro Indicators', attrs: ['indicator', 'value', 'change', 'direction'] },
  'industry-rankings': { label: 'Industry Rankings', attrs: ['industry', 'revenue', 'growth_pct', 'companies'] },
  'kpi-strip': { label: 'KPI Metrics', attrs: ['metric', 'value', 'change'] },
};

function parseFile(file: File): Promise<{ columns: string[]; rows: any[][]; preview: any[] }> { // eslint-disable-line @typescript-eslint/no-explicit-any
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][]; // eslint-disable-line @typescript-eslint/no-explicit-any
        const columns = (json[0] || []).map(String);
        const rows = json.slice(1).filter(r => r.some(c => c !== null && c !== undefined && c !== ''));
        const preview = rows.map(r => {
          const obj: Record<string, any> = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
          columns.forEach((c, i) => { obj[c] = r[i]; });
          return obj;
        });
        resolve({ columns, rows, preview });
      } catch (err) { reject(err); }
    };
    reader.readAsArrayBuffer(file);
  });
}

interface Job {
  id: string; documentName: string; status: string; progress: number;
  stages: { name: string; status: string; duration?: number }[];
}

export default function AdminPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'agent' | 'manual'>('agent');
  const [drag, setDrag] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsedFile, setParsedFile] = useState<{ name: string; columns: string[]; rows: any[][]; preview: any[] } | null>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});

  const toggleTarget = (key: string) => {
    setSelectedTargets(prev => {
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
      // Rebuild column map for all selected targets
      if (parsedFile) {
        const allAttrs = next.flatMap(k => TARGET_SCHEMAS[k]?.attrs || []);
        const unique = [...new Set(allAttrs)];
        const autoMap: Record<string, string> = {};
        unique.forEach(attr => {
          if (columnMap[attr]) { autoMap[attr] = columnMap[attr]; return; }
          const match = parsedFile.columns.find(col =>
            col.toLowerCase().replace(/[^a-z0-9]/g, '').includes(attr.toLowerCase().replace(/[^a-z0-9]/g, ''))
          );
          if (match) autoMap[attr] = match;
        });
        setColumnMap(autoMap);
      }
      return next;
    });
  };

  // Combined attrs from all selected targets
  const allSelectedAttrs = [...new Set(selectedTargets.flatMap(k => TARGET_SCHEMAS[k]?.attrs || []))];

  useEffect(() => {
    const obs = new IntersectionObserver(e => e.forEach(x => { if (x.isIntersecting) x.target.classList.add('v'); }), { threshold: 0.08 });
    setTimeout(() => document.querySelectorAll('.fu').forEach(el => obs.observe(el)), 60);
    return () => obs.disconnect();
  }, []);

  const poll = useCallback(async (id: string) => {
    const check = async () => {
      try {
        const r = await fetch(`/api/pipeline?id=${id}`);
        const d = await r.json();
        if (d.job) {
          setJobs(prev => { const idx = prev.findIndex(j => j.id === id); const u = [...prev]; if (idx >= 0) u[idx] = d.job; else u.push(d.job); return u; });
          setActiveJob(d.job);
          if (d.job.status !== 'completed') setTimeout(check, 2000);
        }
      } catch {}
    };
    check();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault(); setDrag(false);
    for (const file of Array.from(e.dataTransfer.files)) {
      const r = await fetch('/api/pipeline', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documentName: file.name }) });
      const d = await r.json();
      if (d.success) poll(d.jobId);
    }
  }, [poll]);

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: "'Inter',system-ui,sans-serif", color: '#fff' }}>
      <header className="bar" style={{ position: 'sticky', top: 0, zIndex: 40 }}>
        <div className="bar-l">
          <span style={{ fontSize: 14, fontWeight: 900, cursor: 'pointer' }} onClick={() => router.push('/')}>accenture</span>
          <div style={{ width: 1, height: 14, background: 'var(--s3)', margin: '0 6px' }} />
          <span style={{ fontSize: 11, fontWeight: 300, color: 'var(--t2)' }}>Compass</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--p)', marginLeft: 12 }}>Admin</span>
        </div>
        <div className="bar-r">
          <button className="cta-g" style={{ fontSize: 10, padding: '7px 16px' }} onClick={() => router.push('/')}>World Map</button>
          <button className="cta-g" style={{ fontSize: 10, padding: '7px 16px' }} onClick={() => router.push('/explore/canada')}>Canada</button>
        </div>
      </header>

      <div className="sec">
        <div className="fu sec-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="tag">Data Management</div>
            <div className="h2" style={{ marginTop: 4, fontSize: 36 }}>{mode === 'agent' ? 'Agentic Pipeline' : 'Manual Upload'}</div>
            <p className="sub" style={{ marginTop: 4 }}>{mode === 'agent' ? 'Drop documents — AI agents parse, classify, extract, and stage automatically.' : 'Upload files to populate specific charts, tables, and data artifacts directly.'}</p>
          </div>
          {/* Mode toggle */}
          <div style={{ display: 'flex', background: 'var(--s1)', border: '1px solid var(--s2)', borderRadius: 8, padding: 3, flexShrink: 0 }}>
            <button onClick={() => setMode('agent')} style={{
              padding: '8px 18px', borderRadius: 6, border: 'none', cursor: 'pointer',
              fontSize: 10, fontWeight: 800, letterSpacing: '.06em',
              background: mode === 'agent' ? 'var(--p)' : 'transparent',
              color: mode === 'agent' ? '#fff' : 'var(--t3)',
              transition: 'all .2s',
            }}>
              <span className="ms" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 4 }}>smart_toy</span>Agent
            </button>
            <button onClick={() => setMode('manual')} style={{
              padding: '8px 18px', borderRadius: 6, border: 'none', cursor: 'pointer',
              fontSize: 10, fontWeight: 800, letterSpacing: '.06em',
              background: mode === 'manual' ? 'var(--p)' : 'transparent',
              color: mode === 'manual' ? '#fff' : 'var(--t3)',
              transition: 'all .2s',
            }}>
              <span className="ms" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 4 }}>upload_file</span>Manual
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 24, minWidth: 0 }}>
          <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>

          {/* ── AGENT MODE ── */}
          {mode === 'agent' && (<>
            <div
              className="fu"
              onDragOver={e => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={handleDrop}
              style={{
                padding: 48, textAlign: 'center', borderRadius: 14, cursor: 'pointer', transition: 'all .3s',
                background: drag ? 'rgba(161,0,255,.06)' : 'var(--s1)',
                border: drag ? '2px dashed var(--p)' : '2px dashed var(--s2)',
                transform: drag ? 'scale(1.01)' : 'none',
              }}
            >
              <div style={{ width: 56, height: 56, borderRadius: 14, background: 'rgba(161,0,255,.1)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
                <span className="ms" style={{ fontSize: 28, color: 'var(--p)' }}>cloud_upload</span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>Drop Documents Here</div>
              <p style={{ fontSize: 12, color: 'var(--t3)', maxWidth: 380, margin: '0 auto 16px', lineHeight: 1.6 }}>
                PDF, Excel, PowerPoint, or CSV. The agentic AI pipeline will parse, classify, extract structured data, cluster entities, validate quality, and stage changes for approval.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                {['PDF', 'XLSX', 'PPTX', 'CSV'].map(t => (
                  <span key={t} style={{ fontSize: 9, fontWeight: 800, padding: '4px 10px', borderRadius: 4, background: 'var(--s1)', border: '1px solid var(--s2)', color: 'var(--t3)' }}>{t}</span>
                ))}
              </div>
            </div>

            {/* Jobs */}
            {jobs.map(j => (
              <div key={j.id} className="fu" style={{ marginTop: 12, padding: 16, borderRadius: 10, background: 'var(--s1)', border: '1px solid var(--s2)', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => setActiveJob(j)}>
                <span className="ms" style={{ fontSize: 18, color: 'var(--p)' }}>description</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{j.documentName}</div>
                  <div style={{ fontSize: 9, color: 'var(--t3)' }}>{j.status === 'completed' ? 'Complete' : STAGE_NAMES[j.status] || j.status}</div>
                </div>
                <div style={{ width: 80, height: 4, borderRadius: 99, background: 'var(--s2)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 99, background: j.status === 'completed' ? 'var(--em)' : 'var(--p)', width: `${j.progress}%`, transition: 'width .5s' }} />
                </div>
                <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--t3)', width: 32, textAlign: 'right' }}>{j.progress}%</span>
                <span className="ms" style={{ fontSize: 16, color: j.status === 'completed' ? 'var(--em)' : 'var(--p)' }}>
                  {j.status === 'completed' ? 'check_circle' : 'sync'}
                </span>
              </div>
            ))}
          </>)}

          {/* ── MANUAL MODE ── */}
          {mode === 'manual' && (
            <div style={{ animation: 'fadeIn .3s', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 220px)' }}>
              {/* Upload zone (compact) */}
              <div style={{ marginBottom: 12, flexShrink: 0 }}>
                <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.json" style={{ display: 'none' }}
                  onChange={async (e) => {
                    const f = e.target.files?.[0]; if (!f) return;
                    const parsed = await parseFile(f);
                    setParsedFile({ name: f.name, ...parsed });
                    setColumnMap({}); setSelectedTargets([]);
                  }}
                />
                <div
                  onDragOver={e => { e.preventDefault(); setDrag(true); }}
                  onDragLeave={() => setDrag(false)}
                  onDrop={async (e) => {
                    e.preventDefault(); setDrag(false);
                    const f = e.dataTransfer.files[0]; if (!f) return;
                    const parsed = await parseFile(f);
                    setParsedFile({ name: f.name, ...parsed });
                    setColumnMap({}); setSelectedTargets([]);
                  }}
                  onClick={() => fileRef.current?.click()}
                  style={{
                    padding: parsedFile ? '12px 16px' : '24px 16px', textAlign: 'center', borderRadius: 10, cursor: 'pointer', transition: 'all .3s',
                    background: drag ? 'rgba(161,0,255,.06)' : parsedFile ? 'rgba(52,211,153,.04)' : 'var(--s1)',
                    border: drag ? '2px dashed var(--p)' : parsedFile ? '1px solid rgba(52,211,153,.2)' : '2px dashed var(--s2)',
                    display: parsedFile ? 'flex' : 'block', alignItems: 'center', gap: 12,
                  }}
                >
                  {parsedFile ? (<>
                    <span className="ms" style={{ fontSize: 20, color: 'var(--em)' }}>check_circle</span>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ fontSize: 11, fontWeight: 800 }}>{parsedFile.name}</div>
                      <div style={{ fontSize: 9, color: 'var(--t3)' }}>{parsedFile.columns.length} cols · {parsedFile.rows.length} rows</div>
                    </div>
                    <span style={{ fontSize: 8, color: 'var(--t4)', fontWeight: 700 }}>Replace</span>
                  </>) : (<>
                    <span className="ms" style={{ fontSize: 24, color: 'var(--p)' }}>upload_file</span>
                    <div style={{ fontSize: 13, fontWeight: 800, marginTop: 6 }}>Drop or click to upload</div>
                    <p style={{ fontSize: 10, color: 'var(--t3)', marginTop: 3 }}>CSV, Excel, or JSON</p>
                  </>)}
                </div>
              </div>

              {/* Multi-select target artifacts */}
              {parsedFile && (
                <div style={{ marginBottom: 12, flexShrink: 0, animation: 'fadeIn .2s' }}>
                  <div style={{ fontSize: 8, fontWeight: 800, color: 'var(--t4)', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 6 }}>Select targets (multi)</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {Object.entries(TARGET_SCHEMAS).map(([key, schema]) => {
                      const on = selectedTargets.includes(key);
                      return (
                        <button key={key} onClick={() => toggleTarget(key)} style={{
                          padding: '5px 10px', borderRadius: 5, cursor: 'pointer',
                          background: on ? 'rgba(161,0,255,.15)' : 'var(--s1)',
                          border: on ? '1px solid rgba(161,0,255,.35)' : '1px solid var(--s2)',
                          color: on ? '#fff' : 'var(--t3)',
                          fontSize: 9, fontWeight: 800, transition: 'all .15s',
                        }}>
                          {on && <span className="ms" style={{ fontSize: 11, verticalAlign: 'middle', marginRight: 3, color: 'var(--p)' }}>check</span>}
                          {schema.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Column mapping (combined from all selected targets) */}
              {parsedFile && allSelectedAttrs.length > 0 && (
                <div style={{ flexShrink: 0, background: 'var(--s1)', border: '1px solid var(--s2)', borderRadius: 8, overflow: 'hidden', marginBottom: 8, maxHeight: 200, overflowY: 'auto' }}>
                  <div style={{ display: 'flex', padding: '6px 12px', borderBottom: '1px solid var(--s2)', fontSize: 8, fontWeight: 800, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.1em', position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 1 }}>
                    <div style={{ width: 130 }}>Attribute</div>
                    <div style={{ width: 16 }} />
                    <div style={{ flex: 1 }}>File Column</div>
                    <div style={{ width: 90 }}>Sample</div>
                  </div>
                  {allSelectedAttrs.map(attr => {
                    const mapped = columnMap[attr];
                    const sample = mapped && parsedFile.preview[0] ? String(parsedFile.preview[0][mapped] ?? '—') : '—';
                    return (
                      <div key={attr} style={{ display: 'flex', alignItems: 'center', padding: '5px 12px', borderBottom: '1px solid var(--s2)' }}>
                        <div style={{ width: 130, fontSize: 10, fontWeight: 700, color: mapped ? '#fff' : 'var(--t3)' }}>{attr}</div>
                        <div style={{ width: 16, textAlign: 'center' }}>
                          <span className="ms" style={{ fontSize: 11, color: mapped ? 'var(--em)' : 'var(--t4)' }}>{mapped ? 'link' : 'link_off'}</span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <select value={mapped || ''} onChange={(e) => setColumnMap(prev => ({ ...prev, [attr]: e.target.value }))} style={{
                            width: '100%', padding: '4px 5px', borderRadius: 4,
                            background: mapped ? 'rgba(161,0,255,.08)' : 'var(--bg)',
                            border: mapped ? '1px solid rgba(161,0,255,.2)' : '1px solid var(--s2)',
                            color: '#fff', fontSize: 9, fontWeight: 600, fontFamily: "'Inter',sans-serif", outline: 'none', cursor: 'pointer',
                          }}>
                            <option value="" style={{ background: '#111' }}>— select —</option>
                            {parsedFile.columns.map(col => <option key={col} value={col} style={{ background: '#111' }}>{col}</option>)}
                          </select>
                        </div>
                        <div style={{ width: 90, paddingLeft: 6, fontSize: 9, color: 'var(--t3)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sample}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* File preview — contained, scrolls both axes */}
              {parsedFile && (
                <div style={{ flex: 1, minHeight: 0, borderRadius: 8, border: '1px solid var(--s2)', background: 'var(--s1)', marginBottom: 8, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <div style={{ padding: '4px 10px', background: 'var(--bg)', borderBottom: '1px solid var(--s2)', fontSize: 8, fontWeight: 800, color: 'var(--t4)', letterSpacing: '.12em', textTransform: 'uppercase', flexShrink: 0 }}>
                    Preview · {parsedFile.rows.length} rows · {parsedFile.columns.length} cols
                  </div>
                  <div style={{ flex: 1, overflow: 'auto' }}>
                    <table style={{ borderCollapse: 'collapse', fontSize: 9, minWidth: 'max-content' }}>
                      <thead><tr>{parsedFile.columns.map(c => (
                        <th key={c} style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 800, fontSize: 8, color: Object.values(columnMap).includes(c) ? 'var(--p)' : 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.05em', borderBottom: '1px solid var(--s2)', background: 'var(--s1)', position: 'sticky', top: 0, whiteSpace: 'nowrap', zIndex: 1 }}>{c}</th>
                      ))}</tr></thead>
                      <tbody>
                        {parsedFile.preview.map((row, i) => (
                          <tr key={i}>{parsedFile.columns.map(c => (
                            <td key={c} style={{ padding: '3px 8px', color: 'var(--t2)', borderBottom: '1px solid var(--s2)', fontWeight: 500, whiteSpace: 'nowrap', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>{String(row[c] ?? '')}</td>
                          ))}</tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Update button — always visible at bottom */}
              {parsedFile && (
                <div style={{ flexShrink: 0 }}>
                  <button style={{
                    width: '100%', padding: '11px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: selectedTargets.length ? 'var(--p)' : 'var(--s2)',
                    color: selectedTargets.length ? '#fff' : 'var(--t4)',
                    fontSize: 11, fontWeight: 800, letterSpacing: '.06em',
                    boxShadow: selectedTargets.length ? '0 4px 16px rgba(161,0,255,.3)' : 'none',
                    transition: 'all .2s',
                  }} onClick={() => {
                    if (!selectedTargets.length) return;
                    alert(`Updating ${selectedTargets.length} artifact(s): ${selectedTargets.map(k => TARGET_SCHEMAS[k].label).join(', ')}\n\n${Object.entries(columnMap).filter(([,v]) => v).map(([k,v]) => `${k} ← ${v}`).join('\n')}`);
                  }}>
                    <span className="ms" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 4 }}>sync</span>
                    Update Website{selectedTargets.length > 0 ? ` (${selectedTargets.length} artifact${selectedTargets.length > 1 ? 's' : ''})` : ''}
                  </button>
                </div>
              )}
            </div>
          )}

          </div>

          {/* Pipeline Detail */}
          <div style={{ width: 320, flexShrink: 0 }}>
            {activeJob ? (
              <div className="fu" style={{ padding: 20, borderRadius: 14, background: 'var(--s1)', border: '1px solid var(--s2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <span className="ms" style={{ fontSize: 16, color: 'var(--p)' }}>conversion_path</span>
                  <span style={{ fontSize: 12, fontWeight: 800 }}>Pipeline Status</span>
                </div>
                {activeJob.stages.map((s, i) => (
                  <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 800, background: s.status === 'completed' ? 'rgba(52,211,153,.15)' : s.status === 'pending' ? 'var(--s1)' : 'rgba(161,0,255,.15)', color: s.status === 'completed' ? 'var(--em)' : s.status === 'pending' ? 'var(--t4)' : 'var(--p)' }}>
                      {s.status === 'completed' ? '✓' : i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: s.status === 'completed' ? 'var(--t2)' : 'var(--t3)' }}>{STAGE_NAMES[s.name]}</div>
                      {s.duration && <div style={{ fontSize: 8, color: 'var(--t4)' }}>{s.duration.toFixed(1)}s</div>}
                    </div>
                    {s.status === 'completed' && <span className="ms" style={{ fontSize: 14, color: 'var(--em)' }}>check</span>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="fu" style={{ padding: 20, borderRadius: 14, background: 'var(--s1)', border: '1px solid var(--s2)' }}>
                <div className="tag" style={{ marginBottom: 12 }}>API Endpoints</div>
                {[
                  'GET  /api/data?country=canada&topic=talent',
                  'POST /api/data { country, topic, data }',
                  'PUT  /api/data { snapshot }',
                  'POST /api/pipeline { documentName }',
                  'GET  /api/pipeline?id=job_xxx',
                ].map(ep => (
                  <div key={ep} style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", padding: '6px 8px', marginBottom: 4, borderRadius: 4, background: 'var(--bg)', color: 'var(--t3)' }}>{ep}</div>
                ))}
              </div>
            )}

            {/* Pipeline explanation */}
            <div className="fu ai" style={{ marginTop: 16 }}>
              <div className="ai-dot"><span className="ms">auto_awesome</span></div>
              <div><div className="tag">Agent Pipeline</div>
                <p style={{ fontSize: 11, color: 'var(--t2)', lineHeight: 1.7 }}>
                  6 Claude-powered agents process each document: <strong>Parser</strong> (OCR + extraction), <strong>Classifier</strong> (data type routing), <strong>Extractor</strong> (structured JSON), <strong>Clusterer</strong> (entity matching), <strong>Validator</strong> (quality check), <strong>Stager</strong> (DB update). Quarterly snapshots with diff/approve/rollback.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
