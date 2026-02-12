import { describe, it, expect } from 'vitest';
import type { PolicyRule } from '@/lib/types';

describe('Phase 1 — types.ts sanity check', () => {
  it('PolicyRule type is importable and structurally correct', () => {
    const rule: PolicyRule = {
      id: 'test-0',
      domain: 'cisco',
      action: 'permit',
      protocol: 'tcp',
      srcCidr: { address: '10.0.1.0', prefix: 24 },
      dstCidr: { address: '0.0.0.0', prefix: 0 },
      srcPort: { from: 0, to: 65535 },
      dstPort: { from: 443, to: 443 },
      priority: 0,
      rawLine: 'permit tcp 10.0.1.0 0.0.0.255 any eq 443',
    };
    expect(rule.domain).toBe('cisco');
    expect(rule.dstPort.from).toBe(443);
  });
});
