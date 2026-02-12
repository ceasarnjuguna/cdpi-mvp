import { describe, it, expect } from 'vitest';
import { parseCiscoACL } from '@/lib/parser/ciscoParser';
import { parseAwsSG } from '@/lib/parser/awsParser';
import { buildGraph } from '@/lib/graph/buildGraph';
import { detectConflicts } from '@/lib/detection/detectConflicts';

describe('Conflict Detection', () => {
  it('Test 1 - Scenario 1: Shadow Rule detected', () => {
    const ciscoInput = `ip access-list extended CORP-INBOUND
permit tcp 10.0.1.0 0.0.0.255 any eq 443`;
    
    const awsInput = JSON.stringify({
      GroupId: 'sg-001',
      IpPermissions: [
        {
          IpProtocol: 'tcp',
          FromPort: 80,
          ToPort: 80,
          IpRanges: [{ CidrIp: '10.0.1.0/24' }],
        },
      ],
    });
    
    const ciscoRules = parseCiscoACL(ciscoInput);
    const awsRules = parseAwsSG(awsInput);
    const graph = buildGraph(ciscoRules, awsRules);
    const conflicts = detectConflicts(graph);
    
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].type).toBe('SHADOW_RULE');
    expect(conflicts[0].severity).toBe('CRITICAL');
  });

  it('Test 2 - Scenario 2: Asymmetric Boundary detected', () => {
    const ciscoInput = `ip access-list extended CORP-INBOUND
deny ip 10.0.2.0 0.0.0.255 10.0.1.0 0.0.0.255`;
    
    const awsInput = JSON.stringify({
      GroupId: 'sg-002',
      IpPermissions: [],
    });
    
    const ciscoRules = parseCiscoACL(ciscoInput);
    const awsRules = parseAwsSG(awsInput);
    const graph = buildGraph(ciscoRules, awsRules);
    const conflicts = detectConflicts(graph);
    
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].type).toBe('ASYMMETRIC_BOUNDARY');
    expect(conflicts[0].severity).toBe('HIGH');
  });

  it('Test 3 - Scenario 3: Clean config with no conflicts', () => {
    const ciscoInput = `ip access-list extended CORP-INBOUND
permit tcp 10.0.1.0 0.0.0.255 any eq 443
permit tcp 10.0.1.0 0.0.0.255 any eq 80`;
    
    const awsInput = JSON.stringify({
      GroupId: 'sg-003',
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
          IpRanges: [{ CidrIp: '10.0.1.0/24' }],
        },
      ],
    });
    
    const ciscoRules = parseCiscoACL(ciscoInput);
    const awsRules = parseAwsSG(awsInput);
    const graph = buildGraph(ciscoRules, awsRules);
    const conflicts = detectConflicts(graph);
    
    expect(conflicts).toHaveLength(0);
  });

  it('Test 4 - Multiple conflicts in one config', () => {
    const ciscoInput = `ip access-list extended CORP-INBOUND
permit tcp 10.0.1.0 0.0.0.255 any eq 443
permit tcp 10.0.1.0 0.0.0.255 any eq 22`;
    
    const awsInput = JSON.stringify({
      GroupId: 'sg-004',
      IpPermissions: [],
    });
    
    const ciscoRules = parseCiscoACL(ciscoInput);
    const awsRules = parseAwsSG(awsInput);
    const graph = buildGraph(ciscoRules, awsRules);
    const conflicts = detectConflicts(graph);
    
    expect(conflicts).toHaveLength(2);
    expect(conflicts[0].type).toBe('SHADOW_RULE');
    expect(conflicts[1].type).toBe('SHADOW_RULE');
  });

  it('Test 5 - deny any any with empty AWS', () => {
    const ciscoInput = 'deny ip any any';
    
    const awsInput = JSON.stringify({
      GroupId: 'sg-005',
      IpPermissions: [],
    });
    
    const ciscoRules = parseCiscoACL(ciscoInput);
    const awsRules = parseAwsSG(awsInput);
    const graph = buildGraph(ciscoRules, awsRules);
    const conflicts = detectConflicts(graph);
    
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].type).toBe('ASYMMETRIC_BOUNDARY');
    expect(conflicts[0].affectedCidr).toEqual({ address: '0.0.0.0', prefix: 0 });
  });

  it('Test 6 - conflict has correct affectedCidr and affectedPort', () => {
    const ciscoInput = `ip access-list extended CORP-INBOUND
permit tcp 10.0.1.0 0.0.0.255 any eq 443`;
    
    const awsInput = JSON.stringify({
      GroupId: 'sg-001',
      IpPermissions: [
        {
          IpProtocol: 'tcp',
          FromPort: 80,
          ToPort: 80,
          IpRanges: [{ CidrIp: '10.0.1.0/24' }],
        },
      ],
    });
    
    const ciscoRules = parseCiscoACL(ciscoInput);
    const awsRules = parseAwsSG(awsInput);
    const graph = buildGraph(ciscoRules, awsRules);
    const conflicts = detectConflicts(graph);
    
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].affectedCidr.address).toBe('10.0.1.0');
    expect(conflicts[0].affectedPort.from).toBe(443);
  });

  it('Test 7 - conflict descriptions are non-empty strings', () => {
    const ciscoInput = `ip access-list extended CORP-INBOUND
permit tcp 10.0.1.0 0.0.0.255 any eq 443`;
    
    const awsInput = JSON.stringify({
      GroupId: 'sg-001',
      IpPermissions: [
        {
          IpProtocol: 'tcp',
          FromPort: 80,
          ToPort: 80,
          IpRanges: [{ CidrIp: '10.0.1.0/24' }],
        },
      ],
    });
    
    const ciscoRules = parseCiscoACL(ciscoInput);
    const awsRules = parseAwsSG(awsInput);
    const graph = buildGraph(ciscoRules, awsRules);
    const conflicts = detectConflicts(graph);
    
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].description.length).toBeGreaterThan(0);
  });
});
