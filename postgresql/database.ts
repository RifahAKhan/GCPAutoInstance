import * as gcp from '@pulumi/gcp';
import * as pulumi from '@pulumi/pulumi';
import * as random from '@pulumi/random';

import { PscEndpoint } from '../modules/psc/endpoint';

export function createDatabase(
  args: {
    projectId: string;
    environment: string;
    defaultVpcNetworkId: pulumi.Input<string>;
    defaultSubnetId: pulumi.Input<string>;
    dnsZoneTransitGcpCloudCorpintraNet: gcp.dns.ManagedZone;
  },
  parent: pulumi.ComponentResource
) {
  // Generates a random root password for the database
  const dbRootPassword = new random.RandomPassword('db-root-password', {
    length: 16,
    special: false,
  }, { parent });

  const dbUserSecret = new gcp.secretmanager.Secret('db-root-password-secret', {
    secretId: 'db-root-password-secret',
    replication: {
      auto: {}, // Corrected property for automatic replication
    },
  }, { parent });

  new gcp.secretmanager.SecretVersion('db-root-password-secret-version', {
    secret: dbUserSecret.id,
    secretData: dbRootPassword.result,
  }, { parent });

  const dbInstance = new gcp.sql.DatabaseInstance(`postgresql-${args.environment}-db-instance`, {
    databaseVersion: 'POSTGRES_13',
    region: 'us-central1-a',
    settings: {
       tier: 'db-custom-2-13312',
      diskSize: 250,
      availabilityType: 'ZONAL',
      backupConfiguration: {
        enabled: true,
        startTime: '20:00',
        backupRetentionSettings: {  // Use backupRetentionSettings instead of retainedBackups
          retainedBackups: 8,
          retentionUnit: 'COUNT', // COUNT or DAYS, depending on your requirements
        },
      },
      ipConfiguration: {
        ipv4Enabled: false,
        privateNetwork: args.defaultVpcNetworkId,
        requireSsl: true,
      },
      maintenanceWindow: {
        day: 7,
        hour: 3,
      },
    },
    deletionProtection: true,
    rootPassword: dbRootPassword.result,
  }, { parent });


  dbInstance.connectionName.apply(connectionName => {
    new PscEndpoint('db-psc-endpoint', {
      projectId: args.projectId,
      name: 'db-psc-endpoint',
      description: 'PSC endpoint for PostgreSQL database',
      networkId: args.defaultVpcNetworkId,
      subnetworkId: args.defaultSubnetId,
      target: connectionName, // Convert Output<string> to string
      dnsZone: args.dnsZoneTransitGcpCloudCorpintraNet,
      dnsName: pulumi.interpolate`postgresql-${args.environment}.${args.dnsZoneTransitGcpCloudCorpintraNet.dnsName}`,
    }, { parent });
  });
}