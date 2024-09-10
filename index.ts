import * as pulumi from '@pulumi/pulumi';

import { AdasBaseLayer } from './base-layer';
import { createBastionHost } from './modules/psc/gke/bastion-host';
import { CpGkeCluster } from './modules/psc/gke/cp-cluster';
import { PostgreSQL } from './postgresql';
import { createNetworkServices } from './network-services';

const gcpConfig = new pulumi.Config('gcp');
const adasConfig = new pulumi.Config();

const projectId = gcpConfig.require('project');
const billingAccount: string = adasConfig.require('billingaccount');
const environment: string = adasConfig.require('environment');
const folderId: string = adasConfig.require('folderid');
const projectName: string = adasConfig.require('projectname');
const projectNumber: string = adasConfig.require('projectnumber');
const projectPurpose: string = adasConfig.require('projectpurpose');

const baseLayer = new AdasBaseLayer('base-layer', { projectId, projectPurpose, environment }, {});

const networkServices = createNetworkServices({
  environment: environment,
  projectId: projectId,
  projectPurpose: projectPurpose,
  networkId: baseLayer.vpcNetworkId,
  subnetId: baseLayer.subnetId,
});

const bastionHost = createBastionHost({
  environment: environment,
  subnetworkId: baseLayer.subnetId,
  nginxOverride: ``,
});

const interiorsensingGkeCluster = new CpGkeCluster(
  `mbadas-${environment}-gke-interiorsensing`,
  {
    projectId: projectId,
    network: baseLayer.vpcNetworkUri,
    subnetwork: baseLayer.subnetId,
    additionalClusterConfig: {
      privateClusterConfig: {
        masterIpv4CidrBlock: '192.168.0.0/28',
      },
      masterAuthorizedNetworksConfig: {
        cidrBlocks: [
          {
            cidrBlock: '10.0.0.0/16',
            displayName: 'GKE Pods CIDR',
          },
          {
            cidrBlock: '172.16.0.0/16',
            displayName: 'Default GCP Subnet',
          },
        ],
      },
      ipAllocationPolicy: {
        clusterIpv4CidrBlock: '10.0.0.0/16',
        stackType: 'IPV4',
      },
    },
  },
  {}
);

const postgresql = new PostgreSQL(
  'postgresql',
  {
    projectId: projectId,
    environment: environment,
    defaultVpcNetworkId: baseLayer.vpcNetworkId,
    defaultSubnetId: baseLayer.subnetId,
    dnsZoneTransitGcpCloudCorpintraNet: networkServices.dnsZoneTransitGcpCloudCorpintraNet,
  },
  {}
);