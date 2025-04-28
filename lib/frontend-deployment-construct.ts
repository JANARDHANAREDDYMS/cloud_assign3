// Update lib/frontend-deployment-construct.ts

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as path from 'path';
import * as fs from 'fs';

export interface FrontendDeploymentConstructProps {
  frontendBucket: s3.Bucket;
  apiEndpoint: string;
  apiKey: string;
}

export class FrontendDeploymentConstruct extends Construct {
  constructor(scope: Construct, id: string, props: FrontendDeploymentConstructProps) {
    super(scope, id);
    
    // Create a temporary directory for processed files
    const tempDir = path.join(__dirname, '../.frontend-build');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Copy and process the frontend files
    const sourceDir = path.join(__dirname, '../frontend');
    this.copyAndReplaceFiles(sourceDir, tempDir, {
      'YOUR_API_ENDPOINT': props.apiEndpoint,
      'YOUR_API_KEY': props.apiKey
    });
    
    // Deploy the processed files
    new s3deploy.BucketDeployment(this, 'DeployFrontend', {
      sources: [s3deploy.Source.asset(tempDir)],
      destinationBucket: props.frontendBucket
    });
  }
  
  // Helper method to copy files and replace placeholders
  private copyAndReplaceFiles(sourceDir: string, destDir: string, replacements: Record<string, string>) {
    const files = fs.readdirSync(sourceDir);
    
    for (const file of files) {
      const sourcePath = path.join(sourceDir, file);
      const destPath = path.join(destDir, file);
      
      const stat = fs.statSync(sourcePath);
      
      if (stat.isDirectory()) {
        // Create the directory if it doesn't exist
        if (!fs.existsSync(destPath)) {
          fs.mkdirSync(destPath, { recursive: true });
        }
        // Recursively copy subdirectories
        this.copyAndReplaceFiles(sourcePath, destPath, replacements);
      } else {
        // For app.js, replace the placeholders
        if (file === 'app.js') {
          let content = fs.readFileSync(sourcePath, 'utf8');
          
          // Replace all placeholders
          for (const [search, replace] of Object.entries(replacements)) {
            content = content.replace(new RegExp(search, 'g'), replace);
          }
          
          // Write the processed file
          fs.writeFileSync(destPath, content);
        } else {
          // For other files, just copy them
          fs.copyFileSync(sourcePath, destPath);
        }
      }
    }
  }
}