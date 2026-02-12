import { describe, it, expect } from 'vitest';
import { parseAwsSG } from '@/lib/parser/awsParser';

function makeSG(overrides: Partial<{
  GroupId: string;
  IpPermissions: unknown[];
}> = {}) {
  return JSON.stringify({
    GroupId: 'sg-test123',
    IpPermissions: [],
    ...overrides,
  });
}

describe('AWS Security Group Parser', () => {
  it('Test 1: Valid JSON with 2 IpPermissions returns 2 PolicyRules', () => {
    const input = makeSG({
      IpPermissions: [
        {
          IpProtocol: 'tcp',
          FromPort: 443,
          ToPort: 443,
          IpRanges: [{ CidrIp: '10.0.1.0/24' }],
        },
        {
          IpProtocol: 'tcp',
          FromPort: 80,
          ToPort: 80,
          IpRanges: [{ CidrIp: '10.0.2.0/24' }],
        },
      ],
    });

    const rules = parseAwsSG(input);

    expect(rules).toHaveLength(2);
    expect(rules[0].domain).toBe('aws');
    expect(rules[0].action).toBe('permit');
    expect(rules[1].domain).toBe('aws');
    expect(rules[1].action).toBe('permit');
  });

  it('Test 2: Protocol -1 (all traffic)', () => {
    const input = makeSG({
      IpPermissions: [
        {
          IpProtocol: '-1',
          IpRanges: [{ CidrIp: '0.0.0.0/0' }],
        },
      ],
    });

    const rules = parseAwsSG(input);

    expect(rules).toHaveLength(1);
    expect(rules[0].protocol).toBe('all');
    expect(rules[0].dstPort).toEqual({ from: 0, to: 65535 });
  });

  it('Test 3: Protocol 6 (numeric TCP)', () => {
    const input = makeSG({
      IpPermissions: [
        {
          IpProtocol: '6',
          FromPort: 443,
          ToPort: 443,
          IpRanges: [{ CidrIp: '10.0.1.0/24' }],
        },
      ],
    });

    const rules = parseAwsSG(input);

    expect(rules).toHaveLength(1);
    expect(rules[0].protocol).toBe('tcp');
  });

  it('Test 4: Protocol tcp (string TCP)', () => {
    const input = makeSG({
      IpPermissions: [
        {
          IpProtocol: 'tcp',
          FromPort: 443,
          ToPort: 443,
          IpRanges: [{ CidrIp: '10.0.1.0/24' }],
        },
      ],
    });

    const rules = parseAwsSG(input);

    expect(rules).toHaveLength(1);
    expect(rules[0].protocol).toBe('tcp');
  });

  it('Test 5: Missing FromPort and ToPort', () => {
    const input = makeSG({
      IpPermissions: [
        {
          IpProtocol: '-1',
          IpRanges: [{ CidrIp: '0.0.0.0/0' }],
        },
      ],
    });

    const rules = parseAwsSG(input);

    expect(rules).toHaveLength(1);
    expect(rules[0].dstPort).toEqual({ from: 0, to: 65535 });
  });

  it('Test 6: One IpPermission with 2 IpRanges returns 2 PolicyRules', () => {
    const input = makeSG({
      IpPermissions: [
        {
          IpProtocol: 'tcp',
          FromPort: 443,
          ToPort: 443,
          IpRanges: [
            { CidrIp: '10.0.1.0/24' },
            { CidrIp: '10.0.2.0/24' },
          ],
        },
      ],
    });

    const rules = parseAwsSG(input);

    expect(rules).toHaveLength(2);
    expect(rules[0].dstPort).toEqual({ from: 443, to: 443 });
    expect(rules[1].dstPort).toEqual({ from: 443, to: 443 });
    expect(rules[0].srcCidr.address).toBe('10.0.1.0');
    expect(rules[1].srcCidr.address).toBe('10.0.2.0');
  });

  it('Test 7: Invalid JSON string throws an error', () => {
    const badInput = '{ this is not valid JSON }';

    expect(() => parseAwsSG(badInput)).toThrow();
  });

  it('Test 8: Valid JSON but missing required GroupId field throws Zod error', () => {
    const invalidSG = JSON.stringify({
      IpPermissions: [],
      // GroupId is missing
    });

    expect(() => parseAwsSG(invalidSG)).toThrow();
  });
});
