import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { StorageConstruct } from './storage-construct';
import { LambdaConstruct } from './lambda-construct';
import { LexConstruct } from './lex-construct';
import { ApiGatewayConstruct } from './api-gateway-construct';
import { FrontendDeploymentConstruct } from './frontend-deployment-construct';
import { PipelineConstruct } from './pipeline-construct';
import { OpenSearchConstruct } from './opensearch-construct';


export class Assign4Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create S3 buckets
    const storage = new StorageConstruct(this, 'Storage');
    
    // Create Lex bot
    const lexBot = new LexConstruct(this, 'LexBot');
    
    // Create Lambda functions
    const lambdas = new LambdaConstruct(this, 'Lambdas', {
      photosBucket: storage.photosBucket,
      // We'll add opensearchDomain later
    });
    
    // Add bot ARN to search Lambda environment variables
    lambdas.searchPhotosFunction.addEnvironment('LEX_BOT_ID', lexBot.botArn);

    const sourceCodeBucket = new s3.Bucket(this, 'SourceCodeBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
    // Create API Gateway
    const api = new ApiGatewayConstruct(this, 'Api', {
      photosBucket: storage.photosBucket,
      searchPhotosFunction: lambdas.searchPhotosFunction,
      uploadPhotoFunction: lambdas.uploadPhotoFunction  // ✅ Add this
    });
    const pipelines = new PipelineConstruct(this, 'Pipelines', {
      frontendBucket: storage.frontendBucket,
      indexPhotosFunction: lambdas.indexPhotosFunction,
      searchPhotosFunction: lambdas.searchPhotosFunction,
    });
    const openSearch = new OpenSearchConstruct(this, 'OpenSearch', {
      indexPhotosFunction: lambdas.indexPhotosFunction,
      searchPhotosFunction: lambdas.searchPhotosFunction,
    });
    
    // Deploy frontend
    new FrontendDeploymentConstruct(this, 'FrontendDeployment', {
      frontendBucket: storage.frontendBucket,
      apiEndpoint: api.apiEndpoint,
      apiKey: api.apiKey.keyId
    });
    
    // Output resources
    new cdk.CfnOutput(this, 'FrontendWebsiteUrl', {
      value: `http://${storage.frontendBucket.bucketWebsiteUrl}`,
      description: 'Frontend Website URL',
    });
    
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: api.apiEndpoint,
      description: 'API Gateway Endpoint',
    });

    new cdk.CfnOutput(this, 'SourceCodeBucketName', {
      value: pipelines.sourceCodeBucket.bucketName,
      description: 'Source Code Bucket Name',
    });
  }
}