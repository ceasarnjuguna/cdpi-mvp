import { NextRequest, NextResponse } from 'next/server';
import { DEMO_SCENARIOS } from '@/lib/fixtures/demoScenarios';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ scenario: string }> }
) {
  const params = await context.params;
  const n = parseInt(params.scenario, 10);
  if (isNaN(n) || n < 1 || n > 3) {
    return NextResponse.json({ error: 'Scenario must be 1, 2, or 3' }, { status: 400 });
  }
  const scenario = DEMO_SCENARIOS[n - 1];
  return NextResponse.json(scenario);
}
