import * as gcp from '@pulumi/gcp';
import * as pulumi from '@pulumi/pulumi';

export class PscEndpoint extends pulumi.ComponentResource {
  constructor(
    name: string,
    args: {
      projectId: string;
      name: string;
      description: string;
      networkId: pulumi.Input<string>;
      subnetworkId: pulumi.Input<string>;
      target: string;
      dnsZone: gcp.dns.ManagedZone;
      dnsName: pulumi.Input<string>;
    },
    opts: pulumi.ComponentResourceOptions
  ) {
    super('custom:psc:PscEndpoint', name, {}, opts);

    const pscEndpoint = new gcp.compute.ServiceAttachment(name, {
      name: args.name,
      project: args.projectId,
      region: 'europe-west3-a',
      targetService: args.target,
      connectionPreference: 'ACCEPT_AUTOMATIC',
      natSubnets: [args.subnetworkId],
      enableProxyProtocol: false, // Add this line to resolve the error
    }, { parent: this });

    new gcp.dns.RecordSet(`${name}-dns`, {
      managedZone: args.dnsZone.name,
      name: args.dnsName,
      type: 'A',
      ttl: 300,
      rrdatas: [pscEndpoint.selfLink], // Use selfLink instead of serviceAttachmentSelfLink
    }, { parent: this });
  }
}