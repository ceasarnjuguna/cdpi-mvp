import { z } from 'zod';
import type { PolicyRule, CidrBlock, PortRange, Protocol } from '@/lib/types';

const IpRangeSchema = z.object({
  CidrIp: z.string(),
  Description: z.string().optional(),
});

const IpPermissionSchema = z.object({
  IpProtocol: z.string(),
  FromPort: z.number().optional(),
  ToPort: z.number().optional(),
  IpRanges: z.array(IpRangeSchema),
});

const AwsSGSchema = z.object({
  GroupId: z.string(),
  GroupName: z.string().optional(),
  IpPermissions: z.array(IpPermissionSchema),
});

/**
 * Normalize AWS protocol identifier to PolicyRule protocol type
 */
function normaliseAwsProtocol(ipProtocol: string): Protocol {
  if (ipProtocol === '-1') {
    return 'all';
  }
  if (ipProtocol === '6' || ipProtocol === 'tcp') {
    return 'tcp';
  }
  if (ipProtocol === '17' || ipProtocol === 'udp') {
    return 'udp';
  }
  if (ipProtocol === '1' || ipProtocol === 'icmp') {
    return 'icmp';
  }
  return 'all';
}

/**
 * Parse CIDR string to CidrBlock
 */
function parseCidrIp(cidrIp: string): CidrBlock {
  const parts = cidrIp.split('/');
  return {
    address: parts[0],
    prefix: parseInt(parts[1], 10),
  };
}

/**
 * Parse AWS Security Group JSON into PolicyRule array
 */
export function parseAwsSG(input: string): PolicyRule[] {
  // Parse JSON - let it throw naturally if invalid
  const rawJson = JSON.parse(input);
  
  // Validate with Zod - let it throw if schema is invalid
  const sg = AwsSGSchema.parse(rawJson);
  
  const rules: PolicyRule[] = [];
  let priority = 0;
  
  // Iterate through each IpPermission
  for (const permission of sg.IpPermissions) {
    const protocol = normaliseAwsProtocol(permission.IpProtocol);
    
    // Determine destination port range
    const dstPort: PortRange = {
      from: permission.FromPort ?? 0,
      to: permission.ToPort ?? 65535,
    };
    
    // Create one rule per IpRange
    for (const ipRange of permission.IpRanges) {
      const srcCidr = parseCidrIp(ipRange.CidrIp);
      
      const rule: PolicyRule = {
        id: `aws-${sg.GroupId}-${priority}`,
        domain: 'aws',
        action: 'permit',
        protocol,
        srcCidr,
        dstCidr: { address: '0.0.0.0', prefix: 0 },
        srcPort: { from: 0, to: 65535 },
        dstPort,
        priority,
        rawLine: JSON.stringify(permission),
      };
      
      rules.push(rule);
      priority++;
    }
  }
  
  return rules;
}
