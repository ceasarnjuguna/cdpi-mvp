import type { PolicyRule, CidrBlock, PortRange, Protocol, Action } from '@/lib/types';

/**
 * Convert Cisco wildcard mask to CIDR notation
 */
function wildcardToCidr(ip: string, wildcard: string): CidrBlock {
  const wildcardBytes = wildcard.split('.').map(Number);
  
  // Invert each byte to get subnet mask
  const subnetMask = wildcardBytes.map(byte => 255 - byte);
  
  // Count leading 1-bits to get prefix length
  let prefix = 0;
  for (const byte of subnetMask) {
    if (byte === 255) {
      prefix += 8;
    } else if (byte === 254) {
      prefix += 7;
      break;
    } else if (byte === 252) {
      prefix += 6;
      break;
    } else if (byte === 248) {
      prefix += 5;
      break;
    } else if (byte === 240) {
      prefix += 4;
      break;
    } else if (byte === 224) {
      prefix += 3;
      break;
    } else if (byte === 192) {
      prefix += 2;
      break;
    } else if (byte === 128) {
      prefix += 1;
      break;
    } else {
      break;
    }
  }
  
  return { address: ip, prefix };
}

/**
 * Parse address specification from tokens
 */
function parseAddressTokens(tokens: string[], startIndex: number): { cidr: CidrBlock; consumed: number } {
  if (startIndex >= tokens.length) {
    return { cidr: { address: '0.0.0.0', prefix: 0 }, consumed: 0 };
  }
  
  const token = tokens[startIndex];
  
  // Handle 'any'
  if (token === 'any') {
    return { cidr: { address: '0.0.0.0', prefix: 0 }, consumed: 1 };
  }
  
  // Handle 'host IP'
  if (token === 'host' && startIndex + 1 < tokens.length) {
    return { cidr: { address: tokens[startIndex + 1], prefix: 32 }, consumed: 2 };
  }
  
  // Handle 'IP WILDCARD'
  if (startIndex + 1 < tokens.length) {
    const ip = token;
    const wildcard = tokens[startIndex + 1];
    return { cidr: wildcardToCidr(ip, wildcard), consumed: 2 };
  }
  
  // Fallback: single IP treated as /32
  return { cidr: { address: token, prefix: 32 }, consumed: 1 };
}

/**
 * Parse port specification from tokens
 */
function parsePortTokens(tokens: string[], startIndex: number): { port: PortRange; consumed: number } {
  if (startIndex >= tokens.length) {
    return { port: { from: 0, to: 65535 }, consumed: 0 };
  }
  
  const token = tokens[startIndex];
  
  // Handle 'eq PORT'
  if (token === 'eq' && startIndex + 1 < tokens.length) {
    const port = parseInt(tokens[startIndex + 1], 10);
    return { port: { from: port, to: port }, consumed: 2 };
  }
  
  // Handle 'range PORT1 PORT2'
  if (token === 'range' && startIndex + 2 < tokens.length) {
    const port1 = parseInt(tokens[startIndex + 1], 10);
    const port2 = parseInt(tokens[startIndex + 2], 10);
    return { port: { from: port1, to: port2 }, consumed: 3 };
  }
  
  // Handle 'gt PORT'
  if (token === 'gt' && startIndex + 1 < tokens.length) {
    const port = parseInt(tokens[startIndex + 1], 10);
    return { port: { from: port + 1, to: 65535 }, consumed: 2 };
  }
  
  // Handle 'lt PORT'
  if (token === 'lt' && startIndex + 1 < tokens.length) {
    const port = parseInt(tokens[startIndex + 1], 10);
    return { port: { from: 0, to: port - 1 }, consumed: 2 };
  }
  
  // No port specifier found
  return { port: { from: 0, to: 65535 }, consumed: 0 };
}

/**
 * Parse Cisco IOS ACL configuration into PolicyRule array
 */
export function parseCiscoACL(input: string): PolicyRule[] {
  const lines = input.split('\n');
  const rules: PolicyRule[] = [];
  let currentAclName = 'UNNAMED';
  let priority = 0;
  
  for (const rawLine of lines) {
    const line = rawLine.trim();
    
    // Skip empty lines and comments
    if (line === '' || line.startsWith('!') || line.startsWith('#')) {
      continue;
    }
    
    // Detect named ACL header
    const aclHeaderMatch = line.match(/^ip\s+access-list\s+extended\s+(\S+)/i);
    if (aclHeaderMatch) {
      currentAclName = aclHeaderMatch[1];
      priority = 0;
      continue;
    }
    
    // Attempt to parse as a rule
    const tokens = line.split(/\s+/);
    
    // Must start with permit or deny
    if (tokens.length < 4 || !['permit', 'deny'].includes(tokens[0])) {
      continue;
    }
    
    const action = tokens[0] as Action;
    const protocolRaw = tokens[1];
    
    // Normalize protocol
    let protocol: Protocol;
    if (protocolRaw === 'ip') {
      protocol = 'all';
    } else if (protocolRaw === 'tcp' || protocolRaw === 'udp' || protocolRaw === 'icmp') {
      protocol = protocolRaw;
    } else {
      continue; // Unknown protocol, skip
    }
    
    // Parse source address
    const srcResult = parseAddressTokens(tokens, 2);
    let currentIndex = 2 + srcResult.consumed;
    
    // Parse source port (always 0-65535 for MVP)
    const srcPort: PortRange = { from: 0, to: 65535 };
    
    // Parse destination address
    const dstResult = parseAddressTokens(tokens, currentIndex);
    currentIndex += dstResult.consumed;
    
    // Parse destination port
    const dstPortResult = parsePortTokens(tokens, currentIndex);
    
    // Create the rule
    const rule: PolicyRule = {
      id: `cisco-${currentAclName}-${priority}`,
      domain: 'cisco',
      action,
      protocol,
      srcCidr: srcResult.cidr,
      dstCidr: dstResult.cidr,
      srcPort,
      dstPort: dstPortResult.port,
      priority,
      rawLine,
    };
    
    rules.push(rule);
    priority++;
  }
  
  return rules;
}
