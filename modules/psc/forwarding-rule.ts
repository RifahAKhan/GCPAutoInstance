import * as gcp from '@pulumi/gcp';
import * as pulumi from '@pulumi/pulumi';

export function createForwardingRule(args: {
  projectId: string;
  environment: string;
  staticIpAddress: string;
  subnetId: pulumi.Input<string>;
  networkId: pulumi.Input<string>;
  forwardingRuleName: string;
  targetServiceAttachmentUri: string;  // Ensure this is the correct service URI.
}) {
  return new gcp.compute.ForwardingRule(args.forwardingRuleName, {
    name: args.forwardingRuleName,
    project: args.projectId,
    region: 'us-east1',
    ipAddress: args.staticIpAddress,
    ipProtocol: 'TCP',
    loadBalancingScheme: 'INTERNAL',
    network: args.networkId,
    subnetwork: args.subnetId,
    backendService: args.targetServiceAttachmentUri,  // Ensure this points to the correct service.
  });
}
