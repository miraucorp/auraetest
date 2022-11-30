"use strict";

const { docClient } = require("../awsClient");
const variables = require("../variables");

const { TracedService } = require("au-helpers").tracing;

exports.createPaymentInDDB = async (appCtx, item) => {
  const params = {
    TableName: variables.bcCryptoPaymentsTable,
    Item: item
  };

  return await appCtx.traced(
    TracedService.DDB,
    `put-payment-into-db`,
    async () => {
      return await docClient.put(params).promise();
    }
  );
};

exports.cancelPaymentInDDB = async (appCtx, id) => {
  const params = {
    TableName: variables.bcCryptoPaymentsTable,
    Key: { id },
    UpdateExpression: "set transactionStatus = :status",
    ExpressionAttributeValues: {
      ":status": "CANCELLED"
    },
    ReturnValues: "UPDATED_NEW",
  };

  return await appCtx.traced(
    TracedService.DDB,
    `update-payment-in-db`,
    async () => {
      return await docClient.update(params).promise();
    }
  );
};

exports.getPaymentFromDDB = async (appCtx, id) => {
  const params = {
    TableName: variables.bcCryptoPaymentsTable,
    Key: { id }
  };
  return await appCtx.traced(
    TracedService.DDB,
    `get-payment-from-db`,
    async () => {
      return await docClient.get(params).promise()
        .then(result => result.Item);
    }
  );
};

exports.getPayment = async (appCtx, paymentId) => {
  const config = {
    headers: { "Content-Type": "application/json" }
  };
  const result = await appCtx.API.get(`${variables.bcCrmAdapter}/transfer/${paymentId}`, config);
  return result.data.data;
};

exports.getPaymentConfirmations = async (appCtx, paymentId) => {
  const config = {
    headers: { "Content-Type": "application/json" }
  };
  const result = await appCtx.API.get(`${variables.bcCrmAdapter}/crypto-payment-confirmation/${paymentId}`, config);
  return result.data.data;
};

exports.createPaymentAddress = async (
  API,
  endpoint,
  currency,
  provider,
  paymentType,
  partnerId
) => {
  return await API.post(`${endpoint}/generate-address`, {
    currency,
    provider,
    paymentType,
    partnerId
  }).then(response => response.data.data);
};
