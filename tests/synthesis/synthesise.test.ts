import { describe, it, expect } from 'vitest';
import { synthesise } from '@/lib/synthesis/synthesise';
import type { ConflictRecord, PolicyRule } from '@/lib/types';

function makeConflict(overrides: Partial<ConflictRecord> = {}): ConflictRecord {
  return {
    id: 'conflict-0',
    type: 'SHADOW_RULE',
    severity: 'CRITICAL',
    description: 'Test conflict',
    ciscoRule: {
      id: 'cisco-TEST-0',
      domain: 'cisco',
      action: 'permit',
      protocol: 'tcp',
      srcCidr: { address: '10.0.1.0', prefix: 24 },
      dstCidr: { address: '0.0.0.0', prefix: 0 },
      srcPort: { from: 0, to: 65535 },
      dstPort: { from: 443, to: 443 },
      priority: 0,
      rawLine: 'permit tcp 10.0.1.0 0.0.0.255 any eq 443',
    },
    affectedCidr: { address: '10.0.1.0', prefix: 24 },
    affectedPort: { from: 443, to: 443 },
    ...overrides,
  };
}

describe('Synthesis Engine', () => {
  it('Test 1 - SHADOW_RULE returns empty ciscoCLI', () => {
    const conflict = makeConflict({ type: 'SHADOW_RULE' });
    const result = synthesise(conflict);
    
    expect(result.ciscoCLI).toHaveLength(0);
  });

  it('Test 2 - SHADOW_RULE awsJsonPatch has correct structure', () => {
    const conflict = makeConflict({ type: 'SHADOW_RULE' });
    const result = synthesise(conflict);
    
    expect(result.awsJsonPatch).toHaveProperty('IpProtocol', 'tcp');
    expect(result.awsJsonPatch).toHaveProperty('FromPort', 443);
    expect(result.awsJsonPatch).toHaveProperty('ToPort', 443);
    
    const patch = result.awsJsonPatch as any;
    expect(patch.IpRanges).toHaveLength(1);
    expect(patch.IpRanges[0].CidrIp).toBe('10.0.1.0/24');
  });

  it('Test 3 - SHADOW_RULE with protocol=all maps to IpProtocol=tcp in patch', () => {
    const conflict = makeConflict({
      type: 'SHADOW_RULE',
      ciscoRule: {
        id: 'cisco-TEST-0',
        domain: 'cisco',
        action: 'permit',
        protocol: 'all',
        srcCidr: { address: '10.0.1.0', prefix: 24 },
        dstCidr: { address: '0.0.0.0', prefix: 0 },
        srcPort: { from: 0, to: 65535 },
        dstPort: { from: 443, to: 443 },
        priority: 0,
        rawLine: 'permit ip 10.0.1.0 0.0.0.255 any',
      },
    });
    
    const result = synthesise(conflict);
    const patch = result.awsJsonPatch as any;
    
    expect(patch.IpProtocol).toBe('tcp');
  });

  it('Test 4 - SHADOW_RULE conflictId matches input conflict.id', () => {
    const conflict = makeConflict({ type: 'SHADOW_RULE' });
    const result = synthesise(conflict);
    
    expect(result.conflictId).toBe('conflict-0');
  });

  it('Test 5 - ASYMMETRIC_BOUNDARY returns non-empty ciscoCLI', () => {
    const conflict = makeConflict({
      type: 'ASYMMETRIC_BOUNDARY',
      severity: 'HIGH',
      ciscoRule: {
        id: 'cisco-TEST-0',
        domain: 'cisco',
        action: 'deny',
        protocol: 'tcp',
        srcCidr: { address: '10.0.1.0', prefix: 24 },
        dstCidr: { address: '0.0.0.0', prefix: 0 },
        srcPort: { from: 0, to: 65535 },
        dstPort: { from: 443, to: 443 },
        priority: 0,
        rawLine: 'deny tcp 10.0.1.0 0.0.0.255 any eq 443',
      },
    });
    
    const result = synthesise(conflict);
    
    expect(result.ciscoCLI.length).toBeGreaterThan(0);
    
    const hasDenyLine = result.ciscoCLI.some(line => line.includes('deny'));
    expect(hasDenyLine).toBe(true);
  });

  it('Test 6 - ASYMMETRIC_BOUNDARY awsJsonPatch has _action field', () => {
    const conflict = makeConflict({
      type: 'ASYMMETRIC_BOUNDARY',
      severity: 'HIGH',
      ciscoRule: {
        id: 'cisco-TEST-0',
        domain: 'cisco',
        action: 'deny',
        protocol: 'tcp',
        srcCidr: { address: '10.0.1.0', prefix: 24 },
        dstCidr: { address: '0.0.0.0', prefix: 0 },
        srcPort: { from: 0, to: 65535 },
        dstPort: { from: 443, to: 443 },
        priority: 0,
        rawLine: 'deny tcp 10.0.1.0 0.0.0.255 any eq 443',
      },
    });
    
    const result = synthesise(conflict);
    const patch = result.awsJsonPatch as any;
    
    expect(patch._action).toBe('RESTRICT_OR_REMOVE_RULE');
  });

  it('Test 7 - PERMIT_MISMATCH awsJsonPatch has _action=ALIGN_PORT_RANGE', () => {
    const conflict = makeConflict({
      type: 'PERMIT_MISMATCH',
      severity: 'MEDIUM',
      awsRule: {
        id: 'aws-SG-0',
        domain: 'aws',
        action: 'permit',
        protocol: 'tcp',
        srcCidr: { address: '10.0.1.0', prefix: 24 },
        dstCidr: { address: '0.0.0.0', prefix: 0 },
        srcPort: { from: 0, to: 65535 },
        dstPort: { from: 80, to: 80 },
        priority: 0,
        rawLine: '{"IpProtocol":"tcp","FromPort":80,"ToPort":80}',
      },
    });
    
    const result = synthesise(conflict);
    const patch = result.awsJsonPatch as any;
    
    expect(patch._action).toBe('ALIGN_PORT_RANGE');
  });

  it('Test 8 - All three conflict types return non-empty explanation strings', () => {
    const shadowConflict = makeConflict({ type: 'SHADOW_RULE' });
    const asymmetricConflict = makeConflict({
      type: 'ASYMMETRIC_BOUNDARY',
      severity: 'HIGH',
      ciscoRule: {
        id: 'cisco-TEST-0',
        domain: 'cisco',
        action: 'deny',
        protocol: 'tcp',
        srcCidr: { address: '10.0.1.0', prefix: 24 },
        dstCidr: { address: '0.0.0.0', prefix: 0 },
        srcPort: { from: 0, to: 65535 },
        dstPort: { from: 443, to: 443 },
        priority: 0,
        rawLine: 'deny tcp 10.0.1.0 0.0.0.255 any eq 443',
      },
    });
    const mismatchConflict = makeConflict({
      type: 'PERMIT_MISMATCH',
      severity: 'MEDIUM',
      awsRule: {
        id: 'aws-SG-0',
        domain: 'aws',
        action: 'permit',
        protocol: 'tcp',
        srcCidr: { address: '10.0.1.0', prefix: 24 },
        dstCidr: { address: '0.0.0.0', prefix: 0 },
        srcPort: { from: 0, to: 65535 },
        dstPort: { from: 80, to: 80 },
        priority: 0,
        rawLine: '{"IpProtocol":"tcp","FromPort":80,"ToPort":80}',
      },
    });
    
    const shadowResult = synthesise(shadowConflict);
    const asymmetricResult = synthesise(asymmetricConflict);
    const mismatchResult = synthesise(mismatchConflict);
    
    expect(shadowResult.explanation.length).toBeGreaterThan(20);
    expect(asymmetricResult.explanation.length).toBeGreaterThan(20);
    expect(mismatchResult.explanation.length).toBeGreaterThan(20);
  });
});
