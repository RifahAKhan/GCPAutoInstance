import * as gcp from '@pulumi/gcp';
import * as pulumi from '@pulumi/pulumi';

export function createServiceAttachment(args: {
  serviceAttachmentName: string;
  projectId: string;
  environment: string;
  subnetId: pulumi.Input<string>;
  autoAcceptedProjects: string[];
  targetServiceIp: string;  // Use IP or correct target service URL.
}) {
  return new gcp.compute.ServiceAttachment(args.serviceAttachmentName, {
    name: args.serviceAttachmentName,
    project: args.projectId,
    region: 'us-east1',
    natSubnets: [args.subnetId],
    targetService: args.targetServiceIp,  // Ensure this IP or service URL is valid.
    connectionPreference: 'ACCEPT_AUTOMATIC',
    consumerAcceptLists: args.autoAcceptedProjects.map(project => ({
      projectIdOrNum: project,  // Correct field name
      connectionLimit: 10,      // Adjust this value as necessary
    })),
    enableProxyProtocol: false,
  });
}
