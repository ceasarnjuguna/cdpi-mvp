export interface DemoScenario {
  id: number;
  name: string;
  description: string;
  ciscoConfig: string;
  awsSgJson: string;
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 1,
    name: 'Shadow Rule Conflict',
    description: 'Cisco permits TCP 443 from 10.0.1.0/24. AWS SG has no inbound rule for port 443. AWS default-deny silently blocks what Cisco explicitly allows.',
    ciscoConfig: `ip access-list extended CORP-INBOUND
 permit tcp 10.0.1.0 0.0.0.255 any eq 443
 permit tcp 10.0.1.0 0.0.0.255 any eq 80
 deny ip 10.0.2.0 0.0.0.255 10.0.1.0 0.0.0.255
 permit ip any any`,
    awsSgJson: JSON.stringify({
      GroupId: 'sg-0abc123',
      GroupName: 'CDPI-Demo-SG-1',
      IpPermissions: [
        {
          IpProtocol: 'tcp',
          FromPort: 80,
          ToPort: 80,
          IpRanges: [{ CidrIp: '10.0.1.0/24', Description: 'HTTP only' }]
        }
      ]
    }, null, 2),
  },
  {
    id: 2,
    name: 'Asymmetric Boundary Policy',
    description: 'Cisco denies 10.0.2.0/24 from reaching 10.0.1.0/24. AWS SG has no corresponding restriction — that subnet can reach cloud resources directly.',
    ciscoConfig: `ip access-list extended CORP-INBOUND
 deny ip 10.0.2.0 0.0.0.255 10.0.1.0 0.0.0.255
 permit tcp 10.0.1.0 0.0.0.255 any eq 443
 permit ip any any`,
    awsSgJson: JSON.stringify({
      GroupId: 'sg-0def456',
      GroupName: 'CDPI-Demo-SG-2',
      IpPermissions: [
        {
          IpProtocol: 'tcp',
          FromPort: 443,
          ToPort: 443,
          IpRanges: [
            { CidrIp: '10.0.1.0/24', Description: 'Corp subnet HTTPS' },
            { CidrIp: '10.0.2.0/24', Description: 'Should be blocked but is not' }
          ]
        }
      ]
    }, null, 2),
  },
  {
    id: 3,
    name: 'Clean Configuration',
    description: 'Cisco ACL and AWS SG are semantically equivalent. No conflicts expected. Validates the true-negative case.',
    ciscoConfig: `ip access-list extended CORP-INBOUND
 permit tcp 10.0.1.0 0.0.0.255 any eq 443
 permit tcp 10.0.1.0 0.0.0.255 any eq 80`,
    awsSgJson: JSON.stringify({
      GroupId: 'sg-0ghi789',
      GroupName: 'CDPI-Demo-SG-3',
      IpPermissions: [
        {
          IpProtocol: 'tcp',
          FromPort: 443,
          ToPort: 443,
          IpRanges: [{ CidrIp: '10.0.1.0/24', Description: 'HTTPS' }]
        },
        {
          IpProtocol: 'tcp',
          FromPort: 80,
          ToPort: 80,
          IpRanges: [{ CidrIp: '10.0.1.0/24', Description: 'HTTP' }]
        }
      ]
    }, null, 2),
  },
];
