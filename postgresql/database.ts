import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import * as random from "@pulumi/random";
import { PscEndpoint } from "../modules/psc/endpoint";

// Function to create a PostgreSQL database with secure root password
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
  const dbRootPassword = new random.RandomPassword("db-root-password", {
    length: 16,
    special: false,
  }, { parent });

  // Create a KMS Key Ring for encryption
  const keyRing = new gcp.kms.KeyRing("my-keyring", {
    location: "global",
    name: "my-keyring",
  });

  // Create a KMS Crypto Key for encryption
  const cryptoKey = new gcp.kms.CryptoKey("my-key", {
    keyRing: keyRing.id,
    name: "my-key",
    rotationPeriod: "100000s", // Adjust as needed
    purpose: "ENCRYPT_DECRYPT",
  });

  // Create a Secret Manager secret for storing the DB root password
  const dbUserSecret = new gcp.secretmanager.Secret("db-root-password-secret", {
    secretId: "db-root-password-secret",
    replication: {
      auto: {
        customerManagedEncryption: {
          kmsKeyName: cryptoKey.id,
        },
      },
    },
  }, { parent });

  // Store the root password as a secret version
  new gcp.secretmanager.SecretVersion("db-root-password-secret-version", {
    secret: dbUserSecret.id,
    secretData: dbRootPassword.result,
  }, { parent });

  // Grant a service account access to the secret
  new gcp.secretmanager.SecretIamBinding("db-secret-access", {
    secretId: dbUserSecret.id,
    role: "roles/secretmanager.secretAccessor",
    members: [
      "serviceAccount:my-service-account@my-project.iam.gserviceaccount.com",
    ],
  });

  // Create the PostgreSQL database instance
  const dbInstance = new gcp.sql.DatabaseInstance(
    `postgresql-${args.environment}-db-instance`,
    {
      databaseVersion: "POSTGRES_13",
      region: "us-east1",
      settings: {
        tier: "db-custom-2-13312",
        diskSize: 250,
        availabilityType: "ZONAL",
        backupConfiguration: {
          enabled: true,
          startTime: "20:00",
          backupRetentionSettings: {
            retainedBackups: 8,
            retentionUnit: "COUNT",
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
      rootPassword: dbRootPassword.result, // Using the generated root password
    },
    { parent }
  );

  // Create Private Service Connect (PSC) Endpoint
  dbInstance.connectionName.apply((connectionName) => {
    new PscEndpoint(
      "db-psc-endpoint",
      {
        projectId: args.projectId,
        name: "db-psc-endpoint",
        description: "PSC endpoint for PostgreSQL database",
        networkId: args.defaultVpcNetworkId,
        subnetworkId: args.defaultSubnetId,
        target: connectionName,
        dnsZone: args.dnsZoneTransitGcpCloudCorpintraNet,
        dnsName: pulumi.interpolate`postgresql-${args.environment}.${args.dnsZoneTransitGcpCloudCorpintraNet.dnsName}`,
      },
      { parent }
    );
  });

  // Export important outputs
  return {
    dbInstanceName: dbInstance.name,
    secretId: dbUserSecret.id,
  };
}
