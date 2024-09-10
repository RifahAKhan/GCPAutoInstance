import * as gcp from '@pulumi/gcp';
import * as pulumi from '@pulumi/pulumi';

export function createBastionHost(args: {
  environment: string;
  subnetworkId: pulumi.Input<string>;
  nginxOverride: string;
}) {
  return new gcp.compute.Instance(`bastion-host-${args.environment}`, {
    machineType: 'f1-micro',
    zone: 'us-central1-a',
    bootDisk: {
      initializeParams: {
        image: 'debian-cloud/debian-9',
      },
    },
    networkInterfaces: [{
      subnetwork: args.subnetworkId,
      accessConfigs: [{}], // Ephemeral public IP
    }],
    metadataStartupScript: args.nginxOverride,
  });
}