import type { CidrBlock, PortRange } from '@/lib/types';

/**
 * Convert dotted-decimal IP address to 32-bit integer
 */
function ipToInt(ip: string): number {
  const parts = ip.split('.').map(Number);
  return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

/**
 * Convert 32-bit integer to dotted-decimal IP address
 */
function intToIp(int: number): string {
  return [
    (int >>> 24) & 0xFF,
    (int >>> 16) & 0xFF,
    (int >>> 8) & 0xFF,
    int & 0xFF,
  ].join('.');
}

/**
 * Convert a CidrBlock to a numeric IP range
 */
export function cidrToRange(cidr: CidrBlock): { start: number; end: number } {
  const ipInt = ipToInt(cidr.address);
  
  // Handle /0 specially
  if (cidr.prefix === 0) {
    return { start: 0, end: 0xFFFFFFFF };
  }
  
  const hostBits = 32 - cidr.prefix;
  const mask = 0xFFFFFFFF << hostBits;
  const start = (ipInt & mask) >>> 0; // >>> 0 ensures unsigned
  const end = (start | ((1 << hostBits) - 1)) >>> 0;
  
  return { start, end };
}

/**
 * Returns true if the two CIDR blocks share any IP addresses
 */
export function rangeOverlaps(a: CidrBlock, b: CidrBlock): boolean {
  const rangeA = cidrToRange(a);
  const rangeB = cidrToRange(b);
  
  return rangeA.start <= rangeB.end && rangeB.start <= rangeA.end;
}

/**
 * Returns true if port ranges share any ports
 */
export function portRangeOverlaps(a: PortRange, b: PortRange): boolean {
  return a.from <= b.to && b.from <= a.to;
}

/**
 * Convert CIDR prefix back to Cisco wildcard notation
 */
export function cidrToWildcard(cidr: CidrBlock): string {
  const hostBits = 32 - cidr.prefix;
  
  // Handle /0 specially (all host bits)
  let wildcardInt: number;
  if (hostBits === 32) {
    wildcardInt = 0xFFFFFFFF;
  } else {
    wildcardInt = ((1 << hostBits) - 1) >>> 0;
  }
  
  return [24, 16, 8, 0]
    .map(shift => (wildcardInt >>> shift) & 0xFF)
    .join('.');
}
