import { describe, it, expect } from 'vitest';
import { parseCiscoACL } from '@/lib/parser/ciscoParser';
import type { PolicyRule } from '@/lib/types';

describe('Cisco IOS ACL Parser', () => {
  it('Test 1: Named ACL header is parsed with correct rule ID', () => {
    const input = `ip access-list extended CORP-INBOUND
permit tcp 10.0.1.0 0.0.0.255 any eq 443`;
    
    const rules = parseCiscoACL(input);
    
    expect(rules).toHaveLength(1);
    expect(rules[0].id).toBe('cisco-CORP-INBOUND-0');
    expect(rules[0].action).toBe('permit');
  });

  it('Test 2: permit tcp with /24 source and any destination on port 443', () => {
    const input = 'permit tcp 10.0.1.0 0.0.0.255 any eq 443';
    
    const rules = parseCiscoACL(input);
    
    expect(rules).toHaveLength(1);
    const rule = rules[0];
    expect(rule.action).toBe('permit');
    expect(rule.protocol).toBe('tcp');
    expect(rule.srcCidr).toEqual({ address: '10.0.1.0', prefix: 24 });
    expect(rule.dstCidr).toEqual({ address: '0.0.0.0', prefix: 0 });
    expect(rule.dstPort).toEqual({ from: 443, to: 443 });
  });

  it('Test 3: permit tcp with destination port 80', () => {
    const input = 'permit tcp 10.0.1.0 0.0.0.255 any eq 80';
    
    const rules = parseCiscoACL(input);
    
    expect(rules).toHaveLength(1);
    expect(rules[0].dstPort).toEqual({ from: 80, to: 80 });
  });

  it('Test 4: deny ip with /24 source and /24 destination', () => {
    const input = 'deny ip 10.0.2.0 0.0.0.255 10.0.1.0 0.0.0.255';
    
    const rules = parseCiscoACL(input);
    
    expect(rules).toHaveLength(1);
    const rule = rules[0];
    expect(rule.action).toBe('deny');
    expect(rule.protocol).toBe('all');
    expect(rule.srcCidr.prefix).toBe(24);
    expect(rule.dstCidr.prefix).toBe(24);
  });

  it('Test 5: permit ip any any', () => {
    const input = 'permit ip any any';
    
    const rules = parseCiscoACL(input);
    
    expect(rules).toHaveLength(1);
    const rule = rules[0];
    expect(rule.srcCidr).toEqual({ address: '0.0.0.0', prefix: 0 });
    expect(rule.dstCidr).toEqual({ address: '0.0.0.0', prefix: 0 });
    expect(rule.protocol).toBe('all');
  });

  it('Test 6: permit tcp with host source address', () => {
    const input = 'permit tcp host 10.0.1.5 any eq 443';
    
    const rules = parseCiscoACL(input);
    
    expect(rules).toHaveLength(1);
    expect(rules[0].srcCidr).toEqual({ address: '10.0.1.5', prefix: 32 });
  });

  it('Test 7: permit tcp with /8 source and port range', () => {
    const input = 'permit tcp 10.0.0.0 0.255.255.255 any range 8080 8090';
    
    const rules = parseCiscoACL(input);
    
    expect(rules).toHaveLength(1);
    expect(rules[0].srcCidr.prefix).toBe(8);
    expect(rules[0].dstPort).toEqual({ from: 8080, to: 8090 });
  });

  it('Test 8: Lines starting with ! are skipped', () => {
    const input = `! This is a comment
! Another comment
! Third comment
permit tcp 10.0.1.0 0.0.0.255 any eq 443`;
    
    const rules = parseCiscoACL(input);
    
    expect(rules).toHaveLength(1);
    expect(rules[0].action).toBe('permit');
  });

  it('Test 9: Empty lines and whitespace-only lines are skipped', () => {
    const input = `

    
permit tcp 10.0.1.0 0.0.0.255 any eq 443

    
deny ip any any`;
    
    const rules = parseCiscoACL(input);
    
    expect(rules).toHaveLength(2);
    expect(rules[0].action).toBe('permit');
    expect(rules[1].action).toBe('deny');
  });

  it('Test 10: Full named ACL with 4 rules and correct priority values', () => {
    const input = `ip access-list extended CORP-INBOUND
permit tcp 10.0.1.0 0.0.0.255 any eq 443
permit tcp 10.0.2.0 0.0.0.255 any eq 80
deny tcp 10.0.3.0 0.0.0.255 any eq 22
permit ip any any`;
    
    const rules = parseCiscoACL(input);
    
    expect(rules).toHaveLength(4);
    expect(rules[0].priority).toBe(0);
    expect(rules[1].priority).toBe(1);
    expect(rules[2].priority).toBe(2);
    expect(rules[3].priority).toBe(3);
    expect(rules[0].id).toBe('cisco-CORP-INBOUND-0');
    expect(rules[3].id).toBe('cisco-CORP-INBOUND-3');
  });

  it('Test 11: wildcardToCidr edge case - 0.0.0.0 wildcard equals /32', () => {
    const input = 'permit tcp 192.168.1.0 0.0.0.0 any eq 22';
    
    const rules = parseCiscoACL(input);
    
    expect(rules).toHaveLength(1);
    expect(rules[0].srcCidr).toEqual({ address: '192.168.1.0', prefix: 32 });
  });

  it('Test 12: deny ip any any', () => {
    const input = 'deny ip any any';
    
    const rules = parseCiscoACL(input);
    
    expect(rules).toHaveLength(1);
    const rule = rules[0];
    expect(rule.action).toBe('deny');
    expect(rule.protocol).toBe('all');
    expect(rule.srcCidr.prefix).toBe(0);
    expect(rule.dstCidr.prefix).toBe(0);
  });
});
