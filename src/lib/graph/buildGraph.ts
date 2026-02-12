import type { PolicyRule, UnifiedPolicyGraph, PolicyNode, PolicyEdge, CidrBlock } from '@/lib/types';
import { rangeOverlaps, portRangeOverlaps } from './cidrUtils';

/**
 * Create a unique string key for a CIDR block
 */
function cidrKey(cidr: CidrBlock): string {
  return `${cidr.address}/${cidr.prefix}`;
}

/**
 * Create a node ID from a CIDR block
 */
function nodeId(cidr: CidrBlock): string {
  return `node-${cidr.address.replace(/\./g, '-')}-${cidr.prefix}`;
}

/**
 * Build a unified policy graph from Cisco and AWS rules
 */
export function buildGraph(ciscoRules: PolicyRule[], awsRules: PolicyRule[]): UnifiedPolicyGraph {
  // Step 1: Collect all unique CIDRs
  const cidrMap = new Map<string, CidrBlock>();
  const cidrDomains = new Map<string, Set<'cisco' | 'aws'>>();
  
  for (const rule of ciscoRules) {
    const srcKey = cidrKey(rule.srcCidr);
    const dstKey = cidrKey(rule.dstCidr);
    
    cidrMap.set(srcKey, rule.srcCidr);
    cidrMap.set(dstKey, rule.dstCidr);
    
    if (!cidrDomains.has(srcKey)) cidrDomains.set(srcKey, new Set());
    if (!cidrDomains.has(dstKey)) cidrDomains.set(dstKey, new Set());
    cidrDomains.get(srcKey)!.add('cisco');
    cidrDomains.get(dstKey)!.add('cisco');
  }
  
  for (const rule of awsRules) {
    const srcKey = cidrKey(rule.srcCidr);
    cidrMap.set(srcKey, rule.srcCidr);
    
    if (!cidrDomains.has(srcKey)) cidrDomains.set(srcKey, new Set());
    cidrDomains.get(srcKey)!.add('aws');
  }
  
  // Step 2: Create PolicyNodes
  const nodes: PolicyNode[] = [];
  const nodeMap = new Map<string, PolicyNode>();
  
  for (const [key, cidr] of cidrMap.entries()) {
    const domains = cidrDomains.get(key)!;
    const domain = domains.has('cisco') ? 'cisco' : 'aws';
    
    // Collect rules that reference this CIDR as srcCidr
    const rules: PolicyRule[] = [];
    for (const rule of [...ciscoRules, ...awsRules]) {
      if (cidrKey(rule.srcCidr) === key) {
        rules.push(rule);
      }
    }
    
    const node: PolicyNode = {
      id: nodeId(cidr),
      label: `${cidr.address}/${cidr.prefix}`,
      domain,
      cidr,
      rules,
    };
    
    nodes.push(node);
    nodeMap.set(key, node);
  }
  
  // Step 3: Create edges from Cisco rules
  const edges: PolicyEdge[] = [];
  const edgeMap = new Map<string, PolicyEdge>();
  
  for (const rule of ciscoRules) {
    const srcKey = cidrKey(rule.srcCidr);
    const dstKey = cidrKey(rule.dstCidr);
    
    const srcNode = nodeMap.get(srcKey);
    const dstNode = nodeMap.get(dstKey);
    
    if (!srcNode || !dstNode) continue;
    
    const edgeId = `edge-${srcNode.id}-${dstNode.id}-${rule.dstPort.from}`;
    
    const edge: PolicyEdge = {
      id: edgeId,
      src: srcNode.id,
      dst: dstNode.id,
      ciscoRule: rule,
    };
    
    edges.push(edge);
    edgeMap.set(edgeId, edge);
  }
  
  // Step 4: Attach AWS rules to existing edges or create new ones
  for (const awsRule of awsRules) {
    let matchedEdge = false;
    
    // Try to find a matching edge
    for (const edge of edges) {
      if (edge.ciscoRule && 
          rangeOverlaps(edge.ciscoRule.srcCidr, awsRule.srcCidr) &&
          portRangeOverlaps(edge.ciscoRule.dstPort, awsRule.dstPort)) {
        edge.awsRule = awsRule;
        matchedEdge = true;
        break;
      }
    }
    
    // If no matching edge, create a new one
    if (!matchedEdge) {
      const srcKey = cidrKey(awsRule.srcCidr);
      const dstKey = cidrKey({ address: '0.0.0.0', prefix: 0 });
      
      const srcNode = nodeMap.get(srcKey);
      let dstNode = nodeMap.get(dstKey);
      
      // Create 0.0.0.0/0 node if it doesn't exist
      if (!dstNode) {
        const dstCidr: CidrBlock = { address: '0.0.0.0', prefix: 0 };
        dstNode = {
          id: nodeId(dstCidr),
          label: '0.0.0.0/0',
          domain: 'aws',
          cidr: dstCidr,
          rules: [],
        };
        nodes.push(dstNode);
        nodeMap.set(dstKey, dstNode);
      }
      
      if (srcNode) {
        const edgeId = `edge-${srcNode.id}-${dstNode.id}-${awsRule.dstPort.from}`;
        
        const edge: PolicyEdge = {
          id: edgeId,
          src: srcNode.id,
          dst: dstNode.id,
          awsRule,
        };
        
        edges.push(edge);
      }
    }
  }
  
  return { nodes, edges };
}
