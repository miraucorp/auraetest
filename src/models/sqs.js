"use strict";

const variables = require("../variables");

const { SqsClient } = require("au-helpers").client;

const sqs = new SqsClient({
  region: variables.awsRegion,
  queueUrl: variables.bcTradeServiceWorkerSQS
});

exports.createPaymentInCRM = async (appCtx, messageBody) => {
  return await sqs.sendMessage(
    appCtx,
    "CREATE_CRYPTO_PAYMENT",
    "bc-trade-service",
    JSON.stringify(messageBody)
  );
};

exports.cancelPaymentInCRM = async (appCtx, messageBody) => {
  return await sqs.sendMessage(
    appCtx,
    "CANCEL_CRYPTO_PAYMENT",
    "bc-trade-service",
    JSON.stringify(messageBody)
  );
};

exports.createFXinCRM = async (appCtx, messageBody) => {
  return await sqs.sendMessage(
    appCtx,
    "CREATE_CRYPTO_FX",
    "bc-trade-service",
    JSON.stringify(messageBody)
  );
};
