import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as es from 'aws-cdk-lib/aws-elasticsearch';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export interface OpenSearchConstructProps {
  indexPhotosFunction: lambda.Function;
  searchPhotosFunction: lambda.Function;
}

export class OpenSearchConstruct extends Construct {
  public readonly domain: es.CfnDomain;
  
  constructor(scope: Construct, id: string, props: OpenSearchConstructProps) {
    super(scope, id);
    
    // Create the OpenSearch domain using CfnDomain (L1 construct)
    this.domain = new es.CfnDomain(this, 'PhotosDomain', {
      domainName: 'photos',
      elasticsearchVersion: '7.10', // Use Elasticsearch 7.10 (compatible with OpenSearch 1.x)
      elasticsearchClusterConfig: {
        instanceType: 't3.small.elasticsearch',
        instanceCount: 1,
      },
      ebsOptions: {
        ebsEnabled: true,
        volumeSize: 10,
        volumeType: 'gp2',
      },
      accessPolicies: {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: {
              AWS: [
                props.indexPhotosFunction.role!.roleArn,
                props.searchPhotosFunction.role!.roleArn,
              ]
            },
            Action: 'es:*',
            Resource: `arn:aws:es:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:domain/photos/*`
          }
        ]
      }
    });
    
    // Grant Lambda functions access to OpenSearch
    const domainEndpoint = `https://${this.domain.attrDomainEndpoint}`;
    props.indexPhotosFunction.addEnvironment('OPENSEARCH_DOMAIN', domainEndpoint);
    props.searchPhotosFunction.addEnvironment('OPENSEARCH_DOMAIN', domainEndpoint);
    
    // Output the domain endpoint
    new cdk.CfnOutput(this, 'OpenSearchDomainEndpoint', {
      value: domainEndpoint,
      description: 'OpenSearch Domain Endpoint',
    });
  }
}