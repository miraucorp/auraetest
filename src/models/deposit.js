"use strict";

const variables = require("../variables");

const openQuote = async ({ ticker, currency, amount, contactId }, API) => {
  const body = {
    ticker,
    currency,
    quantity: amount,
    contactId
  };
  const result = await API.post(
    `${variables.bcCryptoService}/cumberland/quote/open`,
    body
  );

  return result.data.data;
};

const executeTrade = async ({ action, quote_id, contactId }, API) => {
  const body = {
    action,
    quote_id,
    contactId
  };
  const result = await API.post(
    `${variables.bcCryptoService}/cumberland/trade`,
    body
  );

  return result.data.data;
};

const createPaymentAddress = async (
  currency,
  provider,
  paymentType,
  partnerId,
  API
) => {
  const result = await API.post(
    `${variables.bcCryptoService}/generate-address`,
    {
      currency,
      provider,
      paymentType,
      partnerId
    }
  ).catch(error => {
    if (error.response) {
      throw error.response;
    } else {
      throw { status: 500, data: { message: "Crypto Service Failed" } };
    }
  });

  const { data } = result.data;

  return {
    reference: data.address,
    invoice: data.invoice,
    createdOn: new Date().toISOString(),
    expiresOn: new Date(new Date().getTime() + 12 * 60 * 1000).toISOString(),
    fxRate: 1
  };
};

const updatePaymentActuals = async (paymentId, requestData, API) => {
  const result = await API.put(
    `${variables.bcCrmAdapter}/transfer/actuals/${paymentId}`,
    requestData
  );

  return result.data.data;
};

const getPaymentById = async (id, API) => {
  const result = await API.get(`${variables.bcCrmAdapter}/transfer/${id}`);

  return result.data.data;
};

const cancelDeposit = async (id, API) => {
  return API.put(`${variables.bcCrmAdapter}/transfer/cancel/${id}`).then(
    result => result.data.data
  );
};
const getAllCryptoPayments = async (accountId, API) => {
  return API.get(
    `${variables.bcCrmAdapter}/transfer/account/${accountId}`
  ).then(result => result.data.data);
};

/**
 * Generic endpoint to execute a trade regardless of provider
 *
 * (currently it supports only KRAKEN)
 *
 * @param {*} appCtx
 * @param {string} contactId
 * @param {Object} params
 * @returns {Promise<TradeResponse>}
 */
 const trade = async (appCtx, contactId, { ticker, currency, amount, action }) => {
  const body = { ticker, currency, amount, action, contactId };
  const result = await appCtx.API.post(`${variables.bcCryptoService}/trade`, body);
  return result.data.data.trade;
};

/**
 * @typedef TradeResponse
 * @property {string} quote_id
 * @property {string} trade_id
 * @property {Object} unit_price
 * @property {number} unit_price.price
 * @property {string} unit_price.ticket_name
 * @property {Object} total_amount
 * @property {number} total_amount.amount
 * @property {string} total_amount.currency
 * @property {Object} quantity
 * @property {number} quantity.quantity
 * @property {string} quantity.currency
 * @property {string} reason
 * @property {string} status
 * @property {number} trade_time
 * @property {string} action
 * @property {string} [provider]
 */


module.exports = {
  updatePaymentActuals,
  getAllCryptoPayments,
  cancelDeposit,
  createPaymentAddress,
  getPaymentById,
  openQuote,
  executeTrade,
  trade,
};
