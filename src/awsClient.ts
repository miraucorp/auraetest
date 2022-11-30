import { config, DynamoDB } from "aws-sdk";
import { client } from "au-helpers";
import { awsRegion, bcTradeServiceWorkerSQS } from "./variables";

const { SqsClient } = client;

config.update({
  region: awsRegion,
});

/**
 * Document client to access dynamo DB
 */
export const docClient = new DynamoDB.DocumentClient();

/**
 * SQS client to send messages to bc-tx-service-worker fifo queue
 * @type {SqsClient}
 */
export const sqsBcTradeServiceWorkerClient = new SqsClient({
  region: awsRegion,
  queueUrl: bcTradeServiceWorkerSQS,
});
