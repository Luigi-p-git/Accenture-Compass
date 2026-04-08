/**
 * Accenture Compass — AI Pipeline API
 *
 * POST /api/pipeline       → Submit document for processing
 * GET  /api/pipeline?id=X  → Check pipeline job status
 *
 * Pipeline stages:
 * 1. Parse → 2. Classify → 3. Extract → 4. Cluster → 5. Validate → 6. Stage
 *
 * In Phase 1: Simulated pipeline with mock stages.
 * In Phase 2: Real Claude API calls + BullMQ job queue.
 */
import { NextRequest, NextResponse } from 'next/server';

interface PipelineJob {
  id: string;
  documentName: string;
  status: string;
  progress: number;
  stages: { name: string; status: string; duration?: number }[];
  startedAt: string;
  completedAt?: string;
  extractedData?: Record<string, unknown>;
}

// In-memory job store (Phase 1 — replace with Redis/DB in Phase 2)
const jobs = new Map<string, PipelineJob>();

const STAGES = ['parse', 'classify', 'extract', 'cluster', 'validate', 'stage'];

function createJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    let documentName = 'uploaded_document';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      if (file) {
        documentName = file.name;
      }
    } else {
      const body = await request.json();
      documentName = body.documentName || documentName;
    }

    const jobId = createJobId();
    const job: PipelineJob = {
      id: jobId,
      documentName,
      status: 'queued',
      progress: 0,
      stages: STAGES.map((s) => ({ name: s, status: 'pending' })),
      startedAt: new Date().toISOString(),
    };

    jobs.set(jobId, job);

    // Simulate async pipeline processing
    simulatePipeline(jobId);

    return NextResponse.json({
      success: true,
      jobId,
      message: `Pipeline job created for "${documentName}"`,
      statusUrl: `/api/pipeline?id=${jobId}`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create pipeline job', details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('id');

  if (!jobId) {
    // Return all jobs
    const allJobs = Array.from(jobs.values()).sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
    return NextResponse.json({ jobs: allJobs });
  }

  const job = jobs.get(jobId);
  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  return NextResponse.json({ job });
}

// Simulate pipeline processing (Phase 1)
async function simulatePipeline(jobId: string) {
  const job = jobs.get(jobId);
  if (!job) return;

  for (let i = 0; i < STAGES.length; i++) {
    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 1000));

    job.stages[i].status = 'completed';
    job.stages[i].duration = 1.5 + Math.random();
    job.progress = Math.round(((i + 1) / STAGES.length) * 100);
    job.status = STAGES[i];

    jobs.set(jobId, { ...job });
  }

  // Final: mark complete with mock extracted data
  job.status = 'completed';
  job.completedAt = new Date().toISOString();
  job.extractedData = {
    type: 'financial_report',
    country: 'canada',
    period: 'Q4 2025',
    entities: [
      { type: 'revenue', value: '$1.82B', confidence: 0.94 },
      { type: 'growth', value: '+9.4%', confidence: 0.91 },
      { type: 'headcount', value: '12,500', confidence: 0.88 },
    ],
    suggestedTopics: ['financials', 'talent'],
  };

  jobs.set(jobId, { ...job });
}
