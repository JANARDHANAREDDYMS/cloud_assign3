import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';

export interface ApiGatewayConstructProps {
  photosBucket: s3.Bucket;
  searchPhotosFunction: lambda.Function;
  uploadPhotoFunction: lambda.Function;
}

export class ApiGatewayConstruct extends Construct {
  public readonly api: apigateway.RestApi;
  public readonly apiKey: apigateway.ApiKey;
  public readonly apiEndpoint: string;

  constructor(scope: Construct, id: string, props: ApiGatewayConstructProps) {
    super(scope, id);

    this.api = new apigateway.RestApi(this, 'PhotosApi', {
      restApiName: 'Photos Service',
      description: 'API for photos application',
      defaultCorsPreflightOptions: {
        allowOrigins: ['*'],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key', 'X-Amz-Security-Token', 'x-amz-meta-customLabels'],
        maxAge: cdk.Duration.days(10),
      }
    });

    const plan = this.api.addUsagePlan('PhotosUsagePlan', {
      name: 'PhotosUsagePlan',
      throttle: {
        rateLimit: 10,
        burstLimit: 2
      }
    });

    this.apiKey = new apigateway.ApiKey(this, 'PhotosApiKey', {
      apiKeyName: 'PhotosApiKey',
      description: 'API Key for Photos Service',
      enabled: true
    });

    plan.addApiKey(this.apiKey);
    plan.addApiStage({
      stage: this.api.deploymentStage
    });

    const photosResource = this.api.root.addResource('photos');
    const photosFilenameResource = photosResource.addResource('{filename}'); // ✅ Add correct dynamic segment

    const uploadIntegration = new apigateway.LambdaIntegration(props.uploadPhotoFunction, {
      proxy: true
    });

    photosFilenameResource.addMethod('PUT', uploadIntegration, {
      apiKeyRequired: true,
      requestParameters: {
        'method.request.path.filename': true
      }
    });

    const searchResource = this.api.root.addResource('search');

    const searchIntegration = new apigateway.LambdaIntegration(props.searchPhotosFunction, {
      proxy: true
    });

    searchResource.addMethod('GET', searchIntegration, {
      apiKeyRequired: true,
      requestParameters: {
        'method.request.querystring.q': true
      }
    });

    this.apiEndpoint = this.api.url;

    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: this.api.url,
      description: 'API Gateway endpoint URL'
    });

    new cdk.CfnOutput(this, 'ApiKeyId', {
      value: this.apiKey.keyId,
      description: 'API Key ID'
    });
  }
} 
