import * as pulumi from '@pulumi/pulumi';

import * as gcp from '@pulumi/gcp';



import { createDatabase } from './database';



export class PostgreSQL extends pulumi.ComponentResource {

  constructor(

    name: string,

    args: {

      projectId: string;

      environment: string;

      defaultVpcNetworkId: pulumi.Input<string>;

      defaultSubnetId: pulumi.Input<string>;

      dnsZoneTransitGcpCloudCorpintraNet: gcp.dns.ManagedZone;

    },

    opts: pulumi.ComponentResourceOptions

  ) {

    super('custom:postgresql:PostgreSQL', name, {}, opts);



    createDatabase({

      projectId: args.projectId,

      environment: args.environment,

      defaultVpcNetworkId: args.defaultVpcNetworkId,

      defaultSubnetId: args.defaultSubnetId,

      dnsZoneTransitGcpCloudCorpintraNet: args.dnsZoneTransitGcpCloudCorpintraNet,

    }, this);

  }

}