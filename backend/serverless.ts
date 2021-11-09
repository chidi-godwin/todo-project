import type { AWS } from '@serverless/typescript';

import auth from '@functions/auth';
import getTodos from '@functions/getTodos';
import createTodo from '@functions/createTodo';
import updateTodo from '@functions/updateTodo';
import deleteTodo from '@functions/deleteTodo';
import getUploadUrl from '@functions/getUploadUrl';

const serverlessConfiguration: AWS = {
  service: 'todo-project',
  frameworkVersion: '2',
  custom: {
    esbuild: {
      bundle: true,
      minify: false,
      sourcemap: true,
      exclude: ['aws-sdk'],
      target: 'node14',
      define: { 'require.resolve': undefined },
      platform: 'node',
    },
  },
  plugins: ['serverless-esbuild', 'serverless-iam-roles-per-function'],
  provider: {
    name: 'aws',
    runtime: 'nodejs14.x',
    apiGateway: {
      minimumCompressionSize: 1024,
      shouldStartNameWithService: true,
    },
    stage: "${opt:stage, 'dev'}",
    region: 'us-east-1',
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      NODE_OPTIONS: '--enable-source-maps --stack-trace-limit=1000',
      TODO_TABLE: 'todo-project-table-${self:provider.stage}',
      TODO_BUCKET: 'gnc-todoproject-bucket-${self:provider.stage}',
      SIGNED_URL_EXPIRATION: '300',
      INDEX_NAME: 'DueIndex'
    },
    tracing: {
      lambda: true,
      apiGateway: true
    },
    lambdaHashingVersion: '20201221',
  },
  // import the function via paths
  functions: {
    auth,
    getTodos,
    createTodo,
    updateTodo,
    deleteTodo,
    getUploadUrl
  },
  resources: {
    Resources: {
      GatewayResponseDefault4XX: {
        Type: 'AWS::ApiGateway::GatewayResponse',
        Properties: {
          ResponseParameters: {
            "gatewayresponse.header.Access-Control-Allow-Origin": "'*'",
            "gatewayresponse.header.Access-Control-Allow-Headers": "'Content-Type,X-Amz-Date,Authorization'",
            "gatewayresponse.header.Access-Control-Allow-Methods": "'GET,OPTIONS,POST'"
          },
          ResponseType: 'DEFAULT_4XX',
          RestApiId: {
            Ref: "ApiGatewayRestApi"
          }
        }
      },
      TodosTable: {
        Type: 'AWS::DynamoDB::Table',
        Properties: {
          AttributeDefinitions: [
            {
              AttributeName: 'userId',
              AttributeType: 'S'
            },
            {
              AttributeName: 'todoId',
              AttributeType: 'S'
            },
            {
              AttributeName: 'dueDate',
              AttributeType: 'S'
            }
          ],
          KeySchema: [
            {
              AttributeName: 'userId',
              KeyType: 'HASH'
            },
            {
              AttributeName: 'todoId',
              KeyType: 'RANGE'
            }
          ],
          BillingMode: 'PAY_PER_REQUEST',
          TableName: '${self:provider.environment.TODO_TABLE}',
          LocalSecondaryIndexes: [
            {
              IndexName: '${self:provider.environment.INDEX_NAME}',
              KeySchema: [
                {
                  AttributeName: 'userId',
                  KeyType: 'HASH'
                },
                {
                  AttributeName: 'dueDate',
                  KeyType: 'RANGE'
                }
              ],
              Projection: {
                ProjectionType: 'KEYS_ONLY'
              }
            }
          ]
        }
      },
      AttachmentsBucket: {
        Type: 'AWS::S3::Bucket',
        Properties: {
          BucketName: '${self:provider.environment.TODO_BUCKET}',
          CorsConfiguration: {
            CorsRules: [
              {
                AllowedOrigins: ['*'],
                AllowedHeaders: ['*'],
                AllowedMethods: [
                  'GET',
                  'PUT',
                  'POST',
                  'DELETE',
                  'HEAD'
                ],
                MaxAge: 3000
              }
            ]
          }
        }
      },
      BucketPolicy: {
        Type: 'AWS::S3::BucketPolicy',
        Properties: {
          PolicyDocument: {
            Id: 'MyPolicy',
            Version: '2012-10-17',
            Statement: [
              {
                Sid: 'PublicReadForGetBucketObjects',
                Effect: 'Allow',
                Principal: '*',
                Action: 's3:GetObject',
                Resource: 'arn:aws:s3:::${self:provider.environment.TODO_BUCKET}/*'
              }
            ]
          },
          Bucket: {"Ref": "AttachmentsBucket"}
        }
      }
    }
  }
};

module.exports = serverlessConfiguration;
