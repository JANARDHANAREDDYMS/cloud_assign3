import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';

export interface LambdaConstructProps {
  photosBucket: s3.Bucket;
}

export class LambdaConstruct extends Construct {
  public readonly indexPhotosFunction: lambda.Function;
  public readonly searchPhotosFunction: lambda.Function;
  public readonly uploadPhotoFunction: lambda.Function; // ✅ Declare the new upload lambda

  constructor(scope: Construct, id: string, props: LambdaConstructProps) {
    super(scope, id);

    this.indexPhotosFunction = new lambda.Function(this, 'IndexPhotosFunction', {
      functionName: 'index-photos',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/index-photos'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        PHOTOS_BUCKET: props.photosBucket.bucketName,
      },
    });

    props.photosBucket.grantRead(this.indexPhotosFunction);

    this.indexPhotosFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['rekognition:DetectLabels'],
        resources: ['*'],
      })
    );

    this.searchPhotosFunction = new lambda.Function(this, 'SearchPhotosFunction', {
      functionName: 'search-photos',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/search-photos'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        PHOTOS_BUCKET: props.photosBucket.bucketName,
      },
    });

    this.searchPhotosFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['lex:PostText', 'lex:RecognizeText'],
        resources: ['*'],
      })
    );

    this.uploadPhotoFunction = new lambda.Function(this, 'UploadPhotoFunction', {
      functionName: 'upload-photo',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/upload-image'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        PHOTOS_BUCKET: props.photosBucket.bucketName,
      },
    });

    props.photosBucket.grantPut(this.uploadPhotoFunction);

    props.photosBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED_PUT,
      new s3n.LambdaDestination(this.indexPhotosFunction)
    );
  }
}
