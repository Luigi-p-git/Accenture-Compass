/**
 * Robin Chat API — Claude CLI proxy for the magazine assistant
 * POST /api/robin-chat
 * Body: { message: string, context: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';

function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').trim();
}

function askClaude(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('claude', ['-p'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    });

    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error('Timed out'));
    }, 120_000);

    let out = '';
    let err = '';

    proc.stdout.on('data', (d: Buffer) => { out += d.toString(); });
    proc.stderr.on('data', (d: Buffer) => { err += d.toString(); });

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) reject(new Error(err.slice(0, 200)));
      else resolve(stripAnsi(out));
    });

    proc.on('error', (e) => {
      clearTimeout(timer);
      reject(new Error(e.message));
    });

    // Chunked write to avoid Windows pipe buffer issues
    const CHUNK = 4096;
    let offset = 0;
    function writeNext() {
      while (offset < prompt.length) {
        const chunk = prompt.slice(offset, offset + CHUNK);
        offset += CHUNK;
        if (!proc.stdin.write(chunk, 'utf8')) {
          proc.stdin.once('drain', writeNext);
          return;
        }
      }
      proc.stdin.end();
    }
    writeNext();
  });
}

export async function POST(request: NextRequest) {
  try {
    const { message, context } = await request.json();
    if (!message) {
      return NextResponse.json({ error: 'No message' }, { status: 400 });
    }

    const prompt = `You are Robin, a senior intelligence analyst assistant embedded in the AccSense Magazine — Accenture's strategic intelligence platform.

CURRENT PAGE DATA:
${(context || '').substring(0, 10000)}

USER QUESTION: ${message}

RESPONSE FORMAT:
- Use **bold** for company names, dollar figures, percentages, and key terms
- Use bullet points (- ) for lists
- Use numbered lists (1. ) for ranked items
- Use short uppercase headers for sections when the answer has multiple parts
- Be concise but substantive — 3-6 sentences for simple questions, structured sections for complex ones
- Always reference specific data from the context: exact numbers, company names, percentages
- Speak as a senior Accenture consultant — authoritative, data-driven, actionable
- If the user is focused on a specific company/trend/challenge, lead with that context
- Do NOT use markdown code blocks or links — just plain text with **bold** markers`;

    const response = await askClaude(prompt);
    return NextResponse.json({ response });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Chat failed' },
      { status: 500 }
    );
  }
}
