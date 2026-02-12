export type Protocol = 'tcp' | 'udp' | 'icmp' | 'all';
export type Action = 'permit' | 'deny';
export type PolicyDomain = 'cisco' | 'aws';
export type ConflictSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type ConflictType = 'SHADOW_RULE' | 'ASYMMETRIC_BOUNDARY' | 'PERMIT_MISMATCH' | 'IMPLICIT_DENY';

export interface CidrBlock {
  address: string;
  prefix: number;
}

export interface PortRange {
  from: number;
  to: number;
}

export interface PolicyRule {
  id: string;
  domain: PolicyDomain;
  action: Action;
  protocol: Protocol;
  srcCidr: CidrBlock;
  dstCidr: CidrBlock;
  srcPort: PortRange;
  dstPort: PortRange;
  priority: number;
  rawLine: string;
}

export interface PolicyNode {
  id: string;
  label: string;
  domain: PolicyDomain;
  cidr: CidrBlock;
  rules: PolicyRule[];
}

export interface PolicyEdge {
  id: string;
  src: string;
  dst: string;
  ciscoRule?: PolicyRule;
  awsRule?: PolicyRule;
  conflict?: ConflictRecord;
}

export interface UnifiedPolicyGraph {
  nodes: PolicyNode[];
  edges: PolicyEdge[];
}

export interface ConflictRecord {
  id: string;
  type: ConflictType;
  severity: ConflictSeverity;
  description: string;
  ciscoRule: PolicyRule;
  awsRule?: PolicyRule;
  affectedCidr: CidrBlock;
  affectedPort: PortRange;
}

export interface SynthesisResult {
  conflictId: string;
  ciscoCLI: string[];
  awsJsonPatch: object;
  explanation: string;
}

export interface VerifyResponse {
  conflicts: ConflictRecord[];
  fixes: SynthesisResult[];
  graph: UnifiedPolicyGraph;
  meta: {
    ciscoRuleCount: number;
    awsRuleCount: number;
    conflictCount: number;
    latencyMs: number;
  };
}
