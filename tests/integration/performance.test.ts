import { describe, it, expect } from 'vitest';
import { parseCiscoACL }   from '@/lib/parser/ciscoParser';
import { parseAwsSG }      from '@/lib/parser/awsParser';
import { buildGraph }      from '@/lib/graph/buildGraph';
import { detectConflicts } from '@/lib/detection/detectConflicts';
import { synthesise }      from '@/lib/synthesis/synthesise';
import { DEMO_SCENARIOS }  from '@/lib/fixtures/demoScenarios';

function runPipeline(ciscoConfig: string, awsSgJson: string) {
  const cisco     = parseCiscoACL(ciscoConfig);
  const aws       = parseAwsSG(awsSgJson);
  const graph     = buildGraph(cisco, aws);
  const conflicts = detectConflicts(graph);
  const fixes     = conflicts.map(c => synthesise(c));
  return { cisco, aws, graph, conflicts, fixes };
}

function benchmark(label: string, ciscoConfig: string, awsSgJson: string, runs = 10) {
  const times: number[] = [];
  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    runPipeline(ciscoConfig, awsSgJson);
    times.push(performance.now() - start);
  }
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  console.log(`\n📊 ${label}`);
  console.log(`   Runs: ${runs}`);
  console.log(`   Min:  ${min.toFixed(3)}ms`);
  console.log(`   Avg:  ${avg.toFixed(3)}ms`);
  console.log(`   Max:  ${max.toFixed(3)}ms`);
  return { avg, min, max };
}

describe('Performance Baseline — Thesis Chapter 5 Data', () => {

  it('Scenario 1 (Shadow Rule) — 10 runs under 500ms each', () => {
    const s = DEMO_SCENARIOS[0];
    const { avg, max } = benchmark('Scenario 1 — Shadow Rule', s.ciscoConfig, s.awsSgJson);
    expect(max).toBeLessThan(500);
    expect(avg).toBeLessThan(100);
  });

  it('Scenario 2 (Asymmetric Boundary) — 10 runs under 500ms each', () => {
    const s = DEMO_SCENARIOS[1];
    const { avg, max } = benchmark('Scenario 2 — Asymmetric Boundary', s.ciscoConfig, s.awsSgJson);
    expect(max).toBeLessThan(500);
    expect(avg).toBeLessThan(100);
  });

  it('Scenario 3 (Clean Config) — 10 runs under 500ms each', () => {
    const s = DEMO_SCENARIOS[2];
    const { avg, max } = benchmark('Scenario 3 — Clean Config', s.ciscoConfig, s.awsSgJson);
    expect(max).toBeLessThan(500);
    expect(avg).toBeLessThan(100);
  });

  it('All three scenarios complete true-positive and true-negative cases', () => {
    const r1 = runPipeline(DEMO_SCENARIOS[0].ciscoConfig, DEMO_SCENARIOS[0].awsSgJson);
    const r2 = runPipeline(DEMO_SCENARIOS[1].ciscoConfig, DEMO_SCENARIOS[1].awsSgJson);
    const r3 = runPipeline(DEMO_SCENARIOS[2].ciscoConfig, DEMO_SCENARIOS[2].awsSgJson);

    // True positives - Scenarios 1 and 2 detect conflicts
    expect(r1.conflicts.length).toBeGreaterThan(0);
    expect(r1.conflicts[0].type).toBe('SHADOW_RULE');
    expect(r2.conflicts.length).toBeGreaterThan(0);
    
    // True negative - Scenario 3 has no conflicts (semantically equivalent policies)
    expect(r3.conflicts.length).toBe(0);

    // Verify conflict types are valid
    const validTypes = ['SHADOW_RULE', 'ASYMMETRIC_BOUNDARY', 'PERMIT_MISMATCH', 'IMPLICIT_DENY'];
    r1.conflicts.forEach(c => expect(validTypes).toContain(c.type));
    r2.conflicts.forEach(c => expect(validTypes).toContain(c.type));

    // Synthesis completeness - every conflict gets a fix
    expect(r1.fixes.length).toBe(r1.conflicts.length);
    expect(r2.fixes.length).toBe(r2.conflicts.length);
    expect(r3.fixes.length).toBe(0); // No conflicts = no fixes

    console.log('\n✅ Correctness Summary:');
    console.log(`   Scenario 1: ${r1.conflicts.length} conflict(s) detected, ${r1.fixes.length} fix(es) generated`);
    console.log(`   Scenario 2: ${r2.conflicts.length} conflict(s) detected, ${r2.fixes.length} fix(es) generated`);
    console.log(`   Scenario 3: ${r3.conflicts.length} conflict(s) — true negative confirmed ✓`);
  });

});
