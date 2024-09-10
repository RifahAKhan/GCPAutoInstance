import * as gcp from '@pulumi/gcp';
import * as pulumi from '@pulumi/pulumi';

export class CpGkeCluster extends pulumi.ComponentResource {
  constructor(
    name: string,
    args: {
      projectId: string;
      network: pulumi.Input<string>;
      subnetwork: pulumi.Input<string>;
      additionalClusterConfig?: gcp.container.ClusterArgs;
    },
    opts?: pulumi.ComponentResourceOptions
  ) {
    super('custom:gke:CpGkeCluster', name, {}, opts);

    const cluster = new gcp.container.Cluster(name, {
      project: args.projectId,
      network: args.network,
      subnetwork: args.subnetwork,
      initialNodeCount: 1,  // Ensure the initial node count is not zero.
      ...args.additionalClusterConfig,
    }, { parent: this });

    this.registerOutputs({
      clusterName: cluster.name,
    });
  }
}
