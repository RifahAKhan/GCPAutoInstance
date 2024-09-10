import * as gcp from '@pulumi/gcp';
import * as pulumi from '@pulumi/pulumi';

export function createServiceAttachment(args: {
  serviceAttachmentName: string;
  projectId: string;
  environment: string;
  subnetId: pulumi.Input<string>;
  autoAcceptedProjects: string[];
  targetServiceIp: string;
}) {
  return new gcp.compute.ServiceAttachment(args.serviceAttachmentName, {
    name: args.serviceAttachmentName,
    project: args.projectId,
    region: 'europe-west4',
    natSubnets: [args.subnetId],
    targetService: args.targetServiceIp,
    connectionPreference: 'ACCEPT_AUTOMATIC',
    consumerAcceptLists: args.autoAcceptedProjects.map(project =>
      pulumi.output({
        projectId: project,
        connectionLimit: 10, // Example value; adjust according to your requirements
        // Add other required properties here
      }) as pulumi.Input<gcp.types.input.compute.ServiceAttachmentConsumerAcceptList>
    ),
    enableProxyProtocol: false,
  });
}
