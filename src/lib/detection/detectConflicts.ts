import type { UnifiedPolicyGraph, ConflictRecord, CidrBlock, PortRange } from '@/lib/types';
import { portRangeOverlaps } from '@/lib/graph/cidrUtils';

/**
 * Format CIDR for descriptions
 */
function formatCidr(cidr: CidrBlock): string {
  return `${cidr.address}/${cidr.prefix}`;
}

/**
 * Format port range for descriptions
 */
function formatPortRange(port: PortRange): string {
  if (port.from === port.to) {
    return `${port.from}`;
  }
  return `${port.from}-${port.to}`;
}

/**
 * Detect policy conflicts in a unified graph
 */
export function detectConflicts(graph: UnifiedPolicyGraph): ConflictRecord[] {
  const conflicts: ConflictRecord[] = [];
  let conflictIndex = 0;
  
  for (const edge of graph.edges) {
    // Case 1: SHADOW_RULE (CRITICAL)
    // Cisco explicitly allows traffic, but AWS has no matching inbound rule
    if (edge.ciscoRule && 
        edge.ciscoRule.action === 'permit' && 
        !edge.awsRule) {
      
      const srcCidr = formatCidr(edge.ciscoRule.srcCidr);
      const dstPort = formatPortRange(edge.ciscoRule.dstPort);
      
      conflicts.push({
        id: `conflict-${conflictIndex++}`,
        type: 'SHADOW_RULE',
        severity: 'CRITICAL',
        description: `Cisco ACL permits ${srcCidr} → port ${dstPort} but AWS SG has no matching inbound rule. AWS default-deny will silently block this traffic.`,
        ciscoRule: edge.ciscoRule,
        affectedCidr: edge.ciscoRule.srcCidr,
        affectedPort: edge.ciscoRule.dstPort,
      });
      continue;
    }
    
    // Case 2: ASYMMETRIC_BOUNDARY (HIGH)
    // Cisco explicitly blocks traffic, but AWS has no corresponding restriction
    if (edge.ciscoRule && 
        edge.ciscoRule.action === 'deny' && 
        !edge.awsRule) {
      
      const srcCidr = formatCidr(edge.ciscoRule.srcCidr);
      
      conflicts.push({
        id: `conflict-${conflictIndex++}`,
        type: 'ASYMMETRIC_BOUNDARY',
        severity: 'HIGH',
        description: `Cisco ACL denies ${srcCidr} but AWS SG has no corresponding restriction. ${srcCidr} can reach cloud resources directly.`,
        ciscoRule: edge.ciscoRule,
        affectedCidr: edge.ciscoRule.srcCidr,
        affectedPort: edge.ciscoRule.dstPort,
      });
      continue;
    }
    
    // Case 3: PERMIT_MISMATCH (MEDIUM)
    // Both permit but on different port ranges
    if (edge.ciscoRule && 
        edge.ciscoRule.action === 'permit' &&
        edge.awsRule && 
        edge.awsRule.action === 'permit' &&
        !portRangeOverlaps(edge.ciscoRule.dstPort, edge.awsRule.dstPort)) {
      
      const ciscoPort = formatPortRange(edge.ciscoRule.dstPort);
      const awsPort = formatPortRange(edge.awsRule.dstPort);
      
      conflicts.push({
        id: `conflict-${conflictIndex++}`,
        type: 'PERMIT_MISMATCH',
        severity: 'MEDIUM',
        description: `Cisco permits port range ${ciscoPort} but AWS SG permits ${awsPort}. Port ranges do not overlap — coverage gap exists.`,
        ciscoRule: edge.ciscoRule,
        awsRule: edge.awsRule,
        affectedCidr: edge.ciscoRule.srcCidr,
        affectedPort: edge.ciscoRule.dstPort,
      });
      continue;
    }
  }
  
  return conflicts;
}
