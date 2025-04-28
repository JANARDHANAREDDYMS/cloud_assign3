import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';

export interface StorageConstructProps {
  // Optional properties if needed
}

export class StorageConstruct extends Construct {
  // Expose buckets as public properties so they can be accessed from the main stack
  public readonly frontendBucket: s3.Bucket;
  public readonly photosBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props?: StorageConstructProps) {
    super(scope, id);

    // Create frontend bucket (B1) with website hosting enabled
    this.frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'error.html',
      publicReadAccess: true, // Allows public access for website hosting
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS, // Override default to allow public access
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development - CAUTION: will delete bucket on stack deletion
      autoDeleteObjects: true, // For development - auto delete objects when bucket is deleted
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.HEAD,
          ],
          allowedOrigins: ['*'], // Restrict this in production
          allowedHeaders: ['*'],
          maxAge: 3000,
        },
      ],
    });

    // Create photos bucket (B2) for storing uploaded photos
    this.photosBucket = new s3.Bucket(this, 'PhotosBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL, // Block all public access for security
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development
      autoDeleteObjects: true, // For development
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.POST,
            s3.HttpMethods.PUT,
            s3.HttpMethods.DELETE,
            s3.HttpMethods.HEAD,
          ],
          allowedOrigins: ['*'], // Should be restricted to your frontend URL in production
          allowedHeaders: ['*'], // Include 'x-amz-meta-customLabels' and other necessary headers
          maxAge: 3000,
        },
      ],
    });

    // Output the website URL for easy access
    new cdk.CfnOutput(this, 'WebsiteURL', {
      value: this.frontendBucket.bucketWebsiteUrl,
      description: 'The URL of the website',
    });

    // Output the photos bucket name for reference
    new cdk.CfnOutput(this, 'PhotosBucketName', {
      value: this.photosBucket.bucketName,
      description: 'Name of the photos bucket',
    });
  }
}