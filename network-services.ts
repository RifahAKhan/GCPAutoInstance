import * as gcp from '@pulumi/gcp';
import * as pulumi from '@pulumi/pulumi';

import { createForwardingRule } from './modules/psc/forwarding-rule';
import { createServiceAttachment } from './modules/psc/service-attachment';

export function createNetworkServices(args: {
  environment: string;
  projectId: string;
  projectPurpose: string;
  networkId: pulumi.Output<string>;
  subnetId: pulumi.Output<string>;
}) {
  // Cloud NAT
  const natRouter = new gcp.compute.Router(`router-cloud-nat`, {
    name: `router-cloud-nat`,
    region: 'europe-west3-a',
    network: args.networkId,
    bgp: {
      asn: 64514,
    },
  });

  new gcp.compute.RouterNat(`cloud-nat-gateway`, {
    name: `cloud-nat-gateway`,
    router: natRouter.name,
    region: natRouter.region,
    natIpAllocateOption: 'AUTO_ONLY',
    sourceSubnetworkIpRangesToNat: 'ALL_SUBNETWORKS_ALL_IP_RANGES',
    logConfig: {
      enable: true,
      filter: 'ERRORS_ONLY',
    },
  });

  // Private Service Connect / Transit Service Setup
  const pscSubnet = new gcp.compute.Subnetwork('psc-service-attachment-subnet', {
    name: `psc-${args.projectPurpose}-eu-we4-subnet`,
    project: args.projectId,
    ipCidrRange: '172.17.1.0/24',
    region: 'europe-west3-a',
    network: args.networkId,
    purpose: 'PRIVATE_SERVICE_CONNECT',
  });


  createServiceAttachment({
    serviceAttachmentName: args.projectPurpose,
    projectId: args.projectId,
    environment: args.environment,
    subnetId: pscSubnet.id,
    autoAcceptedProjects: ['mb-mcai-transit-service-p-7406', 'mb-mbos-cdw-p-d97d'],  // Valid project IDs
    targetServiceIp: '172.16.1.2',  // IP of traefik GKE LoadBalancer Service
  });
  

  createForwardingRule({
    projectId: args.projectId,
    environment: args.environment,
    staticIpAddress: '172.16.2.2',
    subnetId: args.subnetId,
    networkId: args.networkId,
    forwardingRuleName: 'acme',
    targetServiceAttachmentUri:
      'projects/mb-mcai-transit-service-p-7406/regions/europe-west3-a/serviceAttachments/cool-dane',
  });

  // Cloud DNS
  // DNS zone for app.corpintra.net
  const dnsZoneAppCorpintraNet = new gcp.dns.ManagedZone('dns-zone-app-corpintra-net', {
    name: 'app-corpintra-net',
    dnsName: 'app.corpintra.net.',
    description: 'DNS zone for app.corpintra.net',
    visibility: 'private',
    privateVisibilityConfig: {
      networks: [
        {
          networkUrl: args.networkId,
        },
      ],
    },
  });

  new gcp.dns.RecordSet(`dns-record-set-A-acme-app-corpintra-net`, {
    managedZone: dnsZoneAppCorpintraNet.name,
    name: pulumi.interpolate`acme.${dnsZoneAppCorpintraNet.dnsName}`,
    type: 'A',
    ttl: 300,
    rrdatas: [
      '172.16.2.2', // IP of PSC Forwarding Rule Target
    ],
  });

  // DNS zone for transit-gcp.cloud.corpintra.net
  const dnsZoneTransitGcpCloudCorpintraNet = new gcp.dns.ManagedZone(
    'dns-zone-transit-gcp-cloud-corpintra-net',
    {
      name: 'transit-gcp-cloud-corpintra-net',
      dnsName: 'transit-gcp.cloud.corpintra.net.',
      description: 'DNS zone for transit-gcp.cloud.corpintra.net',
      visibility: 'private',
      privateVisibilityConfig: {
        networks: [
          {
            networkUrl: args.networkId,
          },
        ],
      },
    }
  );

  new gcp.dns.RecordSet(
    `dns-record-set-A-postgresql-${args.environment}-transit-gcp-cloud-corpintra-net`,
    {
      managedZone: dnsZoneTransitGcpCloudCorpintraNet.name,
      name:
        args.environment === 'dev'
          ? pulumi.interpolate`postgresql-dev.${dnsZoneTransitGcpCloudCorpintraNet.dnsName}`
          : args.environment === 'int'
            ? pulumi.interpolate`postgresql-int.${dnsZoneTransitGcpCloudCorpintraNet.dnsName}`
            : pulumi.interpolate`postgresql.${dnsZoneTransitGcpCloudCorpintraNet.dnsName}`,
      type: 'A',
      ttl: 300,
      rrdatas: [
        '172.16.1.2', // IP of traefik GKE LoadBalancer Service
      ],
    }
  );

  return { dnsZoneTransitGcpCloudCorpintraNet };
}