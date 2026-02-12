import { NextRequest, NextResponse } from 'next/server';
import { parseCiscoACL }    from '@/lib/parser/ciscoParser';
import { parseAwsSG }       from '@/lib/parser/awsParser';
import { buildGraph }       from '@/lib/graph/buildGraph';
import { detectConflicts }  from '@/lib/detection/detectConflicts';
import { synthesise }       from '@/lib/synthesis/synthesise';

export async function POST(req: NextRequest) {
  const start = performance.now();
  try {
    const body = await req.json();
    const { ciscoConfig, awsSgJson } = body as { ciscoConfig?: string; awsSgJson?: string };

    if (!ciscoConfig || typeof ciscoConfig !== 'string' || ciscoConfig.trim().length === 0) {
      return NextResponse.json({ error: 'ciscoConfig is required and must be a non-empty string' }, { status: 400 });
    }
    if (!awsSgJson || typeof awsSgJson !== 'string' || awsSgJson.trim().length === 0) {
      return NextResponse.json({ error: 'awsSgJson is required and must be a non-empty string' }, { status: 400 });
    }

    const ciscoRules  = parseCiscoACL(ciscoConfig);
    const awsRules    = parseAwsSG(awsSgJson);
    const graph       = buildGraph(ciscoRules, awsRules);
    const conflicts   = detectConflicts(graph);
    const fixes       = conflicts.map(c => synthesise(c));
    const latencyMs   = Math.round(performance.now() - start);

    return NextResponse.json({
      conflicts,
      fixes,
      graph,
      meta: {
        ciscoRuleCount: ciscoRules.length,
        awsRuleCount:   awsRules.length,
        conflictCount:  conflicts.length,
        latencyMs,
      }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown processing error';
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
