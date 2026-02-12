import { describe, it, expect } from 'vitest';
import { cidrToRange, rangeOverlaps, portRangeOverlaps, cidrToWildcard } from '@/lib/graph/cidrUtils';

describe('CIDR Utilities', () => {
  it('cidrToRange: converts 10.0.1.0/24 correctly', () => {
    const result = cidrToRange({ address: '10.0.1.0', prefix: 24 });
    expect(result.start).toBe(167772416); // 10.0.1.0
    expect(result.end).toBe(167772671);   // 10.0.1.255
  });

  it('cidrToRange: handles /0 (all addresses)', () => {
    const result = cidrToRange({ address: '0.0.0.0', prefix: 0 });
    expect(result.start).toBe(0);
    expect(result.end).toBe(0xFFFFFFFF);
  });

  it('cidrToRange: handles /32 (single host)', () => {
    const result = cidrToRange({ address: '192.168.1.0', prefix: 32 });
    expect(result.start).toBe(result.end);
  });

  it('rangeOverlaps: detects overlapping ranges', () => {
    const a = { address: '10.0.1.0', prefix: 24 };
    const b = { address: '10.0.1.128', prefix: 25 };
    expect(rangeOverlaps(a, b)).toBe(true);
  });

  it('rangeOverlaps: detects non-overlapping ranges', () => {
    const a = { address: '10.0.1.0', prefix: 24 };
    const b = { address: '10.0.2.0', prefix: 24 };
    expect(rangeOverlaps(a, b)).toBe(false);
  });

  it('portRangeOverlaps: detects overlapping ports', () => {
    const a = { from: 80, to: 443 };
    const b = { from: 400, to: 500 };
    expect(portRangeOverlaps(a, b)).toBe(true);
  });

  it('portRangeOverlaps: detects non-overlapping ports', () => {
    const a = { from: 80, to: 80 };
    const b = { from: 443, to: 443 };
    expect(portRangeOverlaps(a, b)).toBe(false);
  });

  it('cidrToWildcard: converts /24 correctly', () => {
    const result = cidrToWildcard({ address: '10.0.1.0', prefix: 24 });
    expect(result).toBe('0.0.0.255');
  });

  it('cidrToWildcard: converts /32 correctly', () => {
    const result = cidrToWildcard({ address: '192.168.1.0', prefix: 32 });
    expect(result).toBe('0.0.0.0');
  });

  it('cidrToWildcard: converts /0 correctly', () => {
    const result = cidrToWildcard({ address: '0.0.0.0', prefix: 0 });
    expect(result).toBe('255.255.255.255');
  });

  it('cidrToWildcard: converts /8 correctly', () => {
    const result = cidrToWildcard({ address: '10.0.0.0', prefix: 8 });
    expect(result).toBe('0.255.255.255');
  });
});
