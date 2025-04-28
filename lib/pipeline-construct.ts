import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export interface PipelineConstructProps {
  frontendBucket: s3.Bucket;
  indexPhotosFunction: lambda.Function;
  searchPhotosFunction: lambda.Function;
}

export class PipelineConstruct extends Construct {
  public readonly lambdaPipeline: codepipeline.Pipeline;
  public readonly frontendPipeline: codepipeline.Pipeline;
  public readonly sourceCodeBucket: s3.Bucket;
  
  constructor(scope: Construct, id: string, props: PipelineConstructProps) {
    super(scope, id);
    
    // Create source code bucket
    this.sourceCodeBucket = new s3.Bucket(this, 'SourceCodeBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
    
    // Create artifact buckets for the pipelines
    const lambdaArtifactBucket = new s3.Bucket(this, 'LambdaArtifactBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
    
    const frontendArtifactBucket = new s3.Bucket(this, 'FrontendArtifactBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
    
    // Create source artifacts
    const lambdaSourceOutput = new codepipeline.Artifact('LambdaSourceCode');
    const frontendSourceOutput = new codepipeline.Artifact('FrontendSourceCode');
    
    // Create the Lambda pipeline (P1)
    this.lambdaPipeline = new codepipeline.Pipeline(this, 'LambdaPipeline', {
      pipelineName: 'PhotoAlbum-Lambda-Pipeline',
      artifactBucket: lambdaArtifactBucket,
    });
    
    // Add source stage for Lambda pipeline
    this.lambdaPipeline.addStage({
      stageName: 'Source',
      actions: [
        new codepipeline_actions.S3SourceAction({
          actionName: 'S3Source',
          bucket: this.sourceCodeBucket,
          bucketKey: 'lambda-source.zip',
          output: lambdaSourceOutput,
        }),
      ],
    });
    
    // Add build stage for Lambda pipeline
    const lambdaBuild = new codebuild.PipelineProject(this, 'LambdaBuildProject', {
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          build: {
            commands: [
              'echo "Processing Lambda functions"',
              'ls -la',
              'mkdir -p output',
              'cp -r * output/ || true',
            ],
          },
        },
        artifacts: {
          'base-directory': 'output',
          files: ['**/*'],
        },
      }),
    });
    
    const buildOutput = new codepipeline.Artifact('LambdaBuildOutput');
    
    this.lambdaPipeline.addStage({
      stageName: 'Build',
      actions: [
        new codepipeline_actions.CodeBuildAction({
          actionName: 'BuildLambda',
          project: lambdaBuild,
          input: lambdaSourceOutput,
          outputs: [buildOutput],
        }),
      ],
    });
    
    // Create the Frontend pipeline (P2)
    this.frontendPipeline = new codepipeline.Pipeline(this, 'FrontendPipeline', {
      pipelineName: 'PhotoAlbum-Frontend-Pipeline',
      artifactBucket: frontendArtifactBucket,
    });
    
    // Add source stage for Frontend pipeline
    this.frontendPipeline.addStage({
      stageName: 'Source',
      actions: [
        new codepipeline_actions.GitHubSourceAction({
          actionName: 'GitHub_Source',
          owner: 'YOUR_GITHUB_USERNAME',
          repo: 'YOUR_LAMBDA_REPO_NAME',
          oauthToken: cdk.SecretValue.secretsManager('github-token'),  // 🔥 See note below
          output: lambdaSourceOutput,
          branch: 'main', // or 'master'
          trigger: codepipeline_actions.GitHubTrigger.WEBHOOK
        }),
      ],
    });
    
    // Add deploy stage for Frontend pipeline
    this.frontendPipeline.addStage({
      stageName: 'Deploy',
      actions: [
        new codepipeline_actions.GitHubSourceAction({
          actionName: 'GitHub_Source',
          owner: 'YOUR_GITHUB_USERNAME',
          repo: 'YOUR_FRONTEND_REPO_NAME',
          oauthToken: cdk.SecretValue.secretsManager('github-token'),
          output: frontendSourceOutput,
          branch: 'main',
          trigger: codepipeline_actions.GitHubTrigger.WEBHOOK
        }),
      ],
    });
    
    // Output the source code bucket name
    new cdk.CfnOutput(this, 'SourceCodeBucketName', {
      value: this.sourceCodeBucket.bucketName,
      description: 'Source Code Bucket Name',
    });
  }
}