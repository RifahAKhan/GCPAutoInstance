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
    region: 'europe-west3-a',
    natSubnets: [args.subnetId],
    targetService: args.targetServiceIp,
    connectionPreference: 'ACCEPT_AUTOMATIC',
    consumerAcceptLists: args.autoAcceptedProjects.map(project => ({
      projectIdOrNum: project,  // Correct field name
      connectionLimit: 10,      // Adjust this value as necessary
    }) as gcp.types.input.compute.ServiceAttachmentConsumerAcceptList),
    enableProxyProtocol: false,
  });
}
