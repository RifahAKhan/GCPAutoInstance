import * as gcp from '@pulumi/gcp';
import * as pulumi from '@pulumi/pulumi';

export class AdasBaseLayer extends pulumi.ComponentResource {
  public readonly vpcNetworkId: pulumi.Output<string>;
  public readonly subnetId: pulumi.Output<string>;
  public readonly vpcNetworkUri: pulumi.Output<string>;

  constructor(
    name: string,
    args: {
      projectId: string;
      projectPurpose: string;
      environment: string;
    },
    opts?: pulumi.ComponentResourceOptions
  ) {
    super('custom:base:AdasBaseLayer', name, {}, opts);

    const network = new gcp.compute.Network(`${name}-network`, {
      project: args.projectId,
      autoCreateSubnetworks: false,
    }, { parent: this });

    const subnet = new gcp.compute.Subnetwork(`${name}-subnet`, {
      project: args.projectId,
      region: 'europe-west3-a',
      network: network.id,
      ipCidrRange: '10.0.0.0/24',
    }, { parent: this });

    this.vpcNetworkId = network.id;
    this.subnetId = subnet.id;
    this.vpcNetworkUri = network.selfLink;

    this.registerOutputs({
      vpcNetworkId: this.vpcNetworkId,
      subnetId: this.subnetId,
      vpcNetworkUri: this.vpcNetworkUri,
    });
  }
}