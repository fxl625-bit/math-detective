/**
 * v2.10.2: Dev Diagnostics API
 *
 * POST /api/dev-diagnostics
 * Only active in development mode.
 * Writes browser state snapshot to artifacts/runtime/latest-browser-state.json
 */
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'disabled in production' }, { status: 403 });
  }

  // Only allow localhost
  const host = request.headers.get('host') || '';
  if (!host.startsWith('localhost') && !host.startsWith('127.0.0.1')) {
    return NextResponse.json({ error: 'localhost only' }, { status: 403 });
  }

  try {
    const body = await request.json();

    // Strip any PII (keep only math-detective diagnostic data)
    const sanitized: any = {};
    const allowedKeys = [
      'appVersion', 'commitHash', 'storageKeys', 'stateVersion',
      'todayLessonVersion', 'learnerProfile', 'curriculumProfile',
      'usageStage', 'difficulty', 'currentQuestions', 'fallbackReason',
      'currentStep', 'currentPhase', 'generationReport',
      'stars', 'streak', 'totalCompleted', 'correctCount', 'wrongCount',
    ];
    for (const key of allowedKeys) {
      if (body[key] !== undefined) sanitized[key] = body[key];
    }
    sanitized.receivedAt = new Date().toISOString();

    // Write to artifacts
    const fs = await import('fs/promises');
    const path = await import('path');
    const artifactsDir = path.join(process.cwd(), 'artifacts', 'runtime');
    await fs.mkdir(artifactsDir, { recursive: true });
    await fs.writeFile(
      path.join(artifactsDir, 'latest-browser-state.json'),
      JSON.stringify(sanitized, null, 2),
      'utf-8',
    );

    return NextResponse.json({ ok: true, wroteTo: 'artifacts/runtime/latest-browser-state.json' });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
