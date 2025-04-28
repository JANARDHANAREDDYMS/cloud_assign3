import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';

export class LexConstruct extends Construct {
  public readonly botArn: string;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const role = new cdk.aws_iam.Role(this, 'LexBotRole', {
      assumedBy: new cdk.aws_iam.ServicePrincipal('lexv2.amazonaws.com'),
      managedPolicies: [
        cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonLexFullAccess'),
      ],
    });

    const searchBot = new cdk.aws_lex.CfnBot(this, 'SearchPhotosBot', {
      name: 'SearchPhotosBot',
      dataPrivacy: { ChildDirected: false },
      idleSessionTtlInSeconds: 300,
      roleArn: role.roleArn,
      botLocales: [
        {
          localeId: 'en_US',
          nluConfidenceThreshold: 0.4,
          intents: [
            {
              name: 'SearchIntent',
              description: 'Intent to search for photos',
              sampleUtterances: [
                { utterance: 'Show me {keyword}' },
                { utterance: 'Find {keyword}' },
                { utterance: 'Search for {keyword}' },
                { utterance: 'Display photos of {keyword}' },
                { utterance: 'I want to see {keyword}' },
                { utterance: 'Get pictures of {keyword}' },
                { utterance: 'Look for {keyword}' },
                { utterance: 'Give me images of {keyword}' },
                { utterance: 'Show me pictures of {keyword}' },
                { utterance: 'Search {keyword}' },
                { utterance: 'Find me {keyword}' },
                { utterance: 'Pictures of {keyword}' },
                { utterance: 'Photos of {keyword}' },
                { utterance: 'I want {keyword}' },
                { utterance: '{keyword}' },
                { utterance: 'Show me {keyword} and {keywordTwo}' },
                { utterance: 'Find {keyword} and {keywordTwo}' },
                { utterance: 'Photos of {keyword} and {keywordTwo}' },
                { utterance: 'I want images of {keyword} and {keywordTwo}' },
                { utterance: 'Search for {keyword} and {keywordTwo}' }
              ],
              slots: [
                {
                  name: 'keyword',
                  description: 'Primary keyword',
                  slotTypeName: 'AMAZON.AlphaNumeric',
                  valueElicitationSetting: {
                    slotConstraint: 'Required',
                    promptSpecification: {
                      maxRetries: 2,
                      allowInterrupt: true,
                      messageGroupsList: [
                        {
                          message: {
                            plainTextMessage: { value: 'What keyword do you want to search for?' }
                          }
                        }
                      ]
                    }
                  }
                },
                {
                  name: 'keywordTwo',
                  description: 'Second keyword',
                  slotTypeName: 'AMAZON.AlphaNumeric',
                  valueElicitationSetting: {
                    slotConstraint: 'Optional',
                    promptSpecification: {
                      maxRetries: 2,
                      allowInterrupt: true,
                      messageGroupsList: [
                        {
                          message: {
                            plainTextMessage: { value: 'Any other keyword?' }
                          }
                        }
                      ]
                    }
                  }
                }
              ],
              slotPriorities: [
                { priority: 1, slotName: 'keyword' },
                { priority: 2, slotName: 'keywordTwo' }
              ],
              // ❗ Important: No fulfillmentCodeHook needed
              fulfillmentCodeHook: { enabled: false }
            },
            // Add this fallback intent
            {
              name: 'FallbackIntent',
              description: 'Default fallback intent',
              parentIntentSignature: 'AMAZON.FallbackIntent'
            }
          ]
        }
      ]
    });

    this.botArn = `arn:aws:lex:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:bot/${searchBot.name}`;

    new cdk.aws_lex.CfnBotAlias(this, 'SearchBotAlias', {
      botAliasName: 'prod',
      botId: searchBot.attrId,
      botAliasLocaleSettings: [
        {
          localeId: 'en_US',
          botAliasLocaleSetting: {
            enabled: true
          }
        }
      ]
    });

    new cdk.CfnOutput(this, 'LexBotId', {
      value: searchBot.attrId,
      description: 'Lex Bot ID'
    });
  }
}