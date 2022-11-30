"use strict";
const variables = require("../variables");


exports.getCalculatedCryptoDepositRate = async (
  API,
  contactId,
  amount,
  currency,
  ticker,
  action = "SELL"
) => {
  const config = {
    headers: {
      "Content-Type": "application/json"
    }
  };

  const body = {
    contactId,
    amount,
    currency,
    ticker,
    action
  };
  const result = await API.post(
    `${variables.fsFXService}/internal/crypto/deposit/rate`,
    body,
    config
  );

  return result.data.data;
};

exports.getFXBy = async (paymentId, API) => {
  const result = await API.get(`${variables.bcCrmAdapter}/fx/${paymentId}`);

  return result.data.data;
};
