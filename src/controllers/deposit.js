"use strict";

const {
  trade,
  createPaymentAddress,
  getPaymentById,
  cancelDeposit,
  getAllCryptoPayments,
  updatePaymentActuals,
} = require("../models/deposit");
const { createPaymentInDDB, getPaymentFromDDB, getPaymentConfirmations, cancelPaymentInDDB } = require("../models/transfer");
const accountModel = require("../models/client/account");
const walletModel = require("../models/client/wallet");
const { getCalculatedCryptoDepositRate, getFXBy } = require("../models/fx");
const { createFXinCRM, createPaymentInCRM, cancelPaymentInCRM } = require("../models/sqs");
const variables = require("../variables");
const validate = require("au-helpers").validate;
const errorResponse = require("au-helpers").errorResponseHandler;
const { v4: uuidv4 } = require("uuid");
const { toPaymentResponse, toReceivedAmount, toRateResponse } = require("../models/mappers/deposit");

function getPartnerHeaders(ctx) {
  const partnercontactid = ctx.req.headers.partnercontactid;
  const partnerid = ctx.req.headers.partnerid;
  validate({ partnercontactid, partnerid }, {
    partnercontactid: "required|regex:/^[a-zA-Z0-9-]{36}$/",
    partnerid: "required|regex:/^[a-zA-Z0-9-]{36}$/",
  });
  return { contactId: partnercontactid, partnerId: partnerid };
}

exports.getPartnerCurrencies = async (ctx) => {
  try {
    const { contactId, partnerId } = getPartnerHeaders(ctx);

    const { enabled: cryptoCurrencies } = await walletModel.getAvailableDepositCryptoCurrencies(ctx.appCtx, partnerId);
    const accounts = await accountModel.listActiveAccounts(ctx.appCtx, contactId);
    ctx.response.ok({
      cryptoCurrencies,
      fiatCurrencies: accounts.map(acc => acc.currencyCode),
    }, "Currencies Retrieved");
  } catch (error) {
    errorResponse(ctx, error);
  }
}

async function getDepositRate(ctx, fiatAmount, fiatCurrency, cryptoCurrency) {
  const { contactId, partnerId } = getPartnerHeaders(ctx);
  validate({ fiatAmount, fiatCurrency, cryptoCurrency }, {
    fiatAmount: "required|decimal|min:10",
    fiatCurrency: "required|string",
    cryptoCurrency: "required|string"
  });

  const { enabled: cryptoCurrencies } = await walletModel.getAvailableDepositCryptoCurrencies(ctx.appCtx, partnerId);
  const accounts = await accountModel.listActiveAccounts(ctx.appCtx, contactId);
  if (!accounts.length) {
    throw { status: 404, title: "No accounts" };
  }
  const fiatCurrencies = accounts.map(acc => acc.currencyCode);
  validate({ fiatCurrency, cryptoCurrency }, {
    fiatCurrency: ["required", { in: fiatCurrencies }],
    cryptoCurrency: ["required", { in: cryptoCurrencies }],
  });
  const rate = await getCalculatedCryptoDepositRate(ctx.appCtx.API, contactId, fiatAmount, fiatCurrency,
    `${cryptoCurrency}_${fiatCurrency}`);

  const account = accounts.find(acc => acc.currencyCode === fiatCurrency);
  const accountId = account.accountId;

  return { rate, accountId };
}

exports.getPartnerDepositQuote = async (ctx) => {
  const { fiatAmount, fiatCurrency, cryptoCurrency } = ctx.request.query;
  try {
    const { rate } = await getDepositRate(ctx, Number(fiatAmount), fiatCurrency, cryptoCurrency);
    ctx.response.ok(toRateResponse(rate), "Deposit Rate Retrieved");
  } catch (error) {
    errorResponse(ctx, error);
  }
}

/**
 * Creates a deposit to be payable in the next 15 mins
 * @param ctx {Object}
 * @param {string} ctx.request.body.fiatCurrency The fiat currency
 * @param {number} ctx.request.body.fiatAmount The amount to deposit in `fiatCurrency`
 * @param {number} ctx.request.body.cryptoCurrency The crypto currency selected to pay the deposit
 * @param {string} [ctx.request.body.reference] The reference of the deposit
 * @return {Promise<void>}
 */
exports.createPartnerDeposit = async (ctx) => {
  const { fiatCurrency, fiatAmount, cryptoCurrency, reference } = ctx.request.body;
  try {
    const { contactId, partnerId } = getPartnerHeaders(ctx);
    const { rate, accountId } = await getDepositRate(ctx, fiatAmount, fiatCurrency, cryptoCurrency);

    const { reference: address, invoice } = await createPaymentAddress(
      variables.ercTokens.includes(cryptoCurrency) ? variables.eth : cryptoCurrency,
      "BITGO",
      "DEPOSIT",
      partnerId,
      ctx.appCtx.API
    );

    const payment = {
      id: uuidv4(),
      contactId,
      accountId,
      fiatCurrencyId: variables.currencies[fiatCurrency],
      fiatCurrency,
      transactionType: "DEPOSIT",
      reference,
      address,
      invoice,
      amount: rate.paymentAmount,
      fee: rate.paymentFee,
      totalAmount: rate.paymentTotal,
      rate: rate.paymentRate,
      fiatAmount: rate.paymentFiatAmount,
      created: rate.rateCreated,
      expires: rate.rateExpires,
      currencyId: variables.currencies[cryptoCurrency],
      currency: cryptoCurrency,
      transactionStatus: "PENDING",
      quoteCryptoFXBaseCurrencyId: variables.currencies[cryptoCurrency],
      quoteCryptoFXTargetCurrencyId: variables.currencies.USD,
      quoteCryptoFXBaseAmount: rate.paymentAmount,
      quoteCryptoFXTargetAmount: rate.details.fxTotalUSD,
      quoteFiatFXBaseCurrencyId: variables.currencies.USD,
      quoteFiatFXTargetCurrencyId: variables.currencies[fiatCurrency],
      quoteFiatFXBaseAmount: rate.details.fxTotalUSD,
      quoteFiatFXTargetAmount: rate.paymentFiatAmount,
    };
    const ddbUpdatedPayment = await createPaymentAndFx(ctx.appCtx, payment, rate);
    ctx.response.ok(toPaymentResponse(ddbUpdatedPayment, rate), "Crypto Deposit Created");
  } catch (error) {
    errorResponse(ctx, error);
  }
}

/**
 * Creates a payment in DDB and sends a message to create the payment in CRM
 */
async function createPaymentAndFx(appCtx, payment, rateResponse) {
  const ddbPayment = Object.assign({}, payment, {
    fiatFee: rateResponse.paymentFiatFee,
    fiatTotal: rateResponse.paymentFiatTotal,
    fiatRate: rateResponse.paymentFiatRate,
  });
  // updates or created the payment in DDB
  await createPaymentInDDB(appCtx, ddbPayment);

  createPaymentInCRM(appCtx, payment);
  createFXinCRM(appCtx, {
    cryptoPaymentId: payment.id,
    amount: rateResponse.details.fxTotalUSD,
    baseCurrencyId: variables.currencies.USD,
    convertedAmount: rateResponse.paymentFiatAmount,
    currencyId: payment.fiatCurrencyId,
    fxStatus: variables.fxStatus.new,
    rate: rateResponse.details.fiatRate,
    reference: "FIAT",
    fxType: variables.fxType.deposit,
    supplier: variables.fxSuppliers.moneyCorp
  });
  createFXinCRM(appCtx, {
    cryptoPaymentId: payment.id,
    amount: rateResponse.paymentAmount,
    baseCurrencyId: payment.currencyId,
    convertedAmount: rateResponse.details.fxTotalUSD,
    currencyId: variables.currencies.USD,
    fxStatus: variables.fxStatus.new,
    rate: rateResponse.details.usdToCryptoExchangeRate,
    reference: "CRYPTO",
    fxType: variables.fxType.deposit,
    supplier: variables.fxSuppliers.cumberland,
    memberRate: rateResponse.details.fxFeePct,
    memberActual: rateResponse.details.fxFeeUSD,
    partnerRate: rateResponse.details.externalFXFeePct,
    partnerActual: rateResponse.details.externalFXFeeUSD,
    revenueRate: rateResponse.details.txFeePct,
    revenueActual: rateResponse.details.txFeeUSD,
    externalFxId: rateResponse.details.quoteId
  });
  return ddbPayment;
}

exports.createDeposit = async ctx => {
  const requestBody = ctx.request.body;
  const contactId = ctx.req.headers.contactid || requestBody.contactId;
  const amount = Number(requestBody.amount);
  const accountId = requestBody.accountId;
  const baseCurrency = requestBody.baseCurrency;
  const selectedCurrency = requestBody.selectedCurrency;
  const baseCurrencyId = variables.currencies[baseCurrency] || "";
  const partnerId = ctx.req.headers.partnerid;
  const reference = requestBody.reference;

  const rules = {
    contactId: "required|regex:/^[a-zA-Z0-9-]{36}$/",
    accountId: "required|regex:/^[a-zA-Z0-9-]{36}$/",
    amount: "required|decimal",
    baseCurrency: ["required", { in: Object.keys(variables.currencies) }],
    selectedCurrency: ["required", { in: Object.keys(variables.currencies) }],
    partnerId: "required|regex:/^[a-zA-Z0-9-]{36}$/"
  };

  try {
    validate(
      {
        accountId,
        contactId,
        amount,
        baseCurrency,
        selectedCurrency,
        partnerId
      },
      rules
    );

    const accountDetails = await accountModel.getAccount(
      ctx.appCtx,
      accountId,
      contactId
    );

    const fiatCurrencyId =
      variables.currencies[accountDetails.basicAccount.currencyCode] || "";

    const ticker = `${baseCurrency}_${accountDetails.basicAccount.currencyCode}`;

    const rateResponse = await getCalculatedCryptoDepositRate(
      ctx.appCtx.API,
      contactId,
      amount,
      selectedCurrency,
      ticker
    );

    const currencyId =
      variables.currencies[accountDetails.basicAccount.currencyCode] || "";

    const externalPayment = await createPaymentAddress(
      variables.ercTokens.includes(baseCurrency) ? variables.eth : baseCurrency,
      "BITGO",
      "DEPOSIT",
      partnerId,
      ctx.appCtx.API
    );

    const cryptoPaymentId = uuidv4();

    const cryptoPaymentData = {
      id: cryptoPaymentId,
      contactId,
      address: externalPayment.reference,
      invoice: externalPayment.invoice,
      amount: rateResponse.paymentAmount,
      fee: rateResponse.paymentFee,
      totalAmount: rateResponse.paymentTotal,
      rate: rateResponse.paymentRate,
      fiatAmount: rateResponse.paymentFiatAmount,
      fiatCurrencyId: fiatCurrencyId,
      created: rateResponse.rateCreated,
      expires: rateResponse.rateExpires,
      currencyId: baseCurrencyId,
      transactionType: "DEPOSIT",
      accountId: accountId,
      transactionStatus: "PENDING",
      quoteCryptoFXBaseCurrencyId: baseCurrencyId,
      quoteCryptoFXTargetCurrencyId: variables.currencies.USD,
      quoteCryptoFXBaseAmount: rateResponse.paymentAmount,
      quoteCryptoFXTargetAmount: rateResponse.details.fxTotalUSD,
      quoteFiatFXBaseCurrencyId: variables.currencies.USD,
      quoteFiatFXTargetCurrencyId: currencyId,
      quoteFiatFXBaseAmount: rateResponse.details.fxTotalUSD,
      quoteFiatFXTargetAmount: rateResponse.paymentFiatAmount,
      depositPurpose: requestBody.depositPurpose,
      reference: reference,
    };

    await createPaymentInDDB(ctx.appCtx, cryptoPaymentData);

    createPaymentInCRM(ctx.appCtx, cryptoPaymentData);

    createFXinCRM(ctx.appCtx, {
      cryptoPaymentId: cryptoPaymentId,
      amount: rateResponse.details.fxTotalUSD,
      baseCurrencyId: variables.currencies.USD,
      convertedAmount: rateResponse.paymentFiatAmount,
      currencyId: currencyId,
      fxStatus: variables.fxStatus.new,
      rate: rateResponse.details.fiatRate,
      reference: "FIAT",
      fxType: variables.fxType.deposit,
      supplier: variables.fxSuppliers.moneyCorp
    });

    createFXinCRM(ctx.appCtx, {
      cryptoPaymentId: cryptoPaymentId,
      amount: rateResponse.paymentAmount,
      baseCurrencyId: baseCurrencyId,
      convertedAmount: rateResponse.details.fxTotalUSD,
      currencyId: variables.currencies.USD,
      fxStatus: variables.fxStatus.new,
      rate: rateResponse.details.usdToCryptoExchangeRate,
      reference: "CRYPTO",
      fxType: variables.fxType.deposit,
      supplier: variables.fxSuppliers.kraken,
      memberRate: rateResponse.details.fxFeePct,
      memberActual: rateResponse.details.fxFeeUSD,
      partnerRate: rateResponse.details.externalFXFeePct,
      partnerActual: rateResponse.details.externalFXFeeUSD,
      revenueRate: rateResponse.details.txFeePct,
      revenueActual: rateResponse.details.txFeeUSD,
      externalFxId: rateResponse.details.quoteId
    });

    ctx.response.ok(
      {
        paymentId: cryptoPaymentId,
        paymentRate: rateResponse.paymentRate,
        paymentAmount: rateResponse.paymentAmount,
        paymentFee: rateResponse.paymentFee,
        paymentTotal: rateResponse.paymentTotal,
        paymentCurrency: rateResponse.paymentCurrency,
        paymentCreated: rateResponse.rateCreated,
        paymentExpires: rateResponse.rateExpires,
        paymentAddress: externalPayment.reference,
        paymentFiatRate: rateResponse.paymentFiatRate,
        paymentFiatAmount: rateResponse.paymentFiatAmount,
        paymentFiatFee: rateResponse.paymentFiatFee,
        paymentFiatTotal: rateResponse.paymentFiatTotal,
        paymentType: "DEPOSIT",
        paymentStatus: "PENDING",
        paymentFiatCurrency: rateResponse.paymentFiatCurrency
      },
      "Crypto payment created"
    );
  } catch (error) {
    errorResponse(ctx, error);
  }
};

exports.getDeposit = async ctx => {
  const id = ctx.params.id;
  try {
    const response = await getPaymentById(id, ctx.appCtx.API);
    ctx.response.ok(response, "Crypto payment retrieved successfully.");
  } catch (error) {
    errorResponse(ctx, error);
  }
};

/**
 * Gets the deposit, if uninitialized it will also return the enabled currencies to pay the deposit in
 * @param ctx
 * @return {Promise<void>}
 */
exports.getPartnerDeposit = async ctx => {
  const id = ctx.params.id;
  const contactId = ctx.req.headers.partnercontactid;
  try {
    const res = await getDeposit(ctx.appCtx, contactId, id);
    if (res) {
      ctx.response.ok(res, "Crypto payment retrieved successfully.");
    } else {
      ctx.response.notFound({}, "Not Found");
    }
  } catch (error) {
    errorResponse(ctx, error);
  }
}

exports.cancelPartnerDeposit = async ctx => {
  const id = ctx.params.id;
  const contactId = ctx.req.headers.partnercontactid;
  try {
    const deposit = await getDeposit(ctx.appCtx, contactId, id);
    validateCancelDeposit(deposit);
    await cancelPaymentInDDB(ctx.appCtx, id);
    cancelPaymentInCRM(ctx.appCtx, { id });
    ctx.response.ok({ id }, "Crypto payment cancelled successfully.");
  } catch (error) {
    errorResponse(ctx, error);
  }
};

async function getDeposit(appCtx, contactId, id) {
  validate({ id }, { id: "required|regex:/^[a-zA-Z0-9-]{36}$/" });
  const promises = [
    getPaymentById(id, appCtx.API),
    getPaymentFromDDB(appCtx, id),
  ].map(p => p.catch(() => null));
  const [crmPayment, ddbPayment] = await Promise.all(promises);
  validateDepositContactId(appCtx, contactId, ddbPayment);
  if (!ddbPayment) {
    return null;
  }
  const res = toPaymentResponse(crmPayment, ddbPayment);
  if (res.latestConfirmation !== undefined && res.latestConfirmation !== null) {
    const { confirmations } = await getPaymentConfirmations(appCtx, id);
    return Object.assign(res, toReceivedAmount(confirmations));
  }
  return res;
}

function validateDepositContactId(appCtx, contactId, ddbPayment) {
  if (!contactId) {
    throw { status: 401, title: "Missing header" }
  }
  if (ddbPayment.contactId !== contactId) {
    appCtx.log.error(`Partner contact id ${contactId} not matching deposit contactId ${ddbPayment.contactId}`);
    throw { status: 404, title: "Deposit not found" }
  }
}

function validateCancelDeposit(deposit) {
  if (!deposit) {
    throw { status: 404, title: `Deposit not found`};
  }
  if (deposit.status !== "CREATED" && deposit.status !== "PENDING") {
    throw { status: 409, title: `Deposit cannot be cancelled`};
  }
  if (deposit.txSeenAt) {
    throw { status: 409, title: `Deposit cannot be cancelled, tx from customer for deposit seen`};
  }
}

exports.cancelDeposit = async ctx => {
  const id = ctx.params.id;
  try {
    const response = await cancelDeposit(id, ctx.appCtx.API);
    ctx.response.ok(response, "Crypto payment cancelled successfully.");
  } catch (error) {
    errorResponse(ctx, error);
  }
};

exports.getAllDeposits = async ctx => {
  const accountId = ctx.params.accountId;
  try {
    const response = await getAllCryptoPayments(accountId, ctx.appCtx.API);
    ctx.response.ok(response, "Crypto payments retrieved successfully.");
  } catch (error) {
    errorResponse(ctx, error);
  }
};

exports.liquidateCrypto = async ctx => {
  const { paymentId, contactId } = ctx.request.body;

  const rules = {
    contactId: "required|regex:/^[a-zA-Z0-9-]{36}$/",
    paymentId: "required|regex:/^[a-zA-Z0-9-]{36}$/"
  };

  try {
    validate(
      {
        paymentId,
        contactId
      },
      rules
    );
    const cryptoPayment = await getPaymentById(paymentId, ctx.appCtx.API);

    if (cryptoPayment.transactionStatus === "CONFIRMED") {
      const currencyISO = Object.keys(variables.currencies).filter(key => {
        return variables.currencies[key] === cryptoPayment.currencyId;
      })[0];

      const tradeResponse = await trade(ctx.appCtx, contactId, {
        ticker: `${currencyISO}_USD`,
        currency: currencyISO,
        amount: cryptoPayment.totalAmount,
        action: "SELL",
      });

      const fxes = await getFXBy(paymentId, ctx.appCtx.API);

      const cryptoFX = fxes.filter(fx => fx.reference === "CRYPTO")[0];

      updatePaymentActuals(
        paymentId,
        {
          actualCryptoFXBaseCurrencyId: cryptoPayment.currencyId,
          actualCryptoFXBaseAmount: cryptoPayment.totalAmount,
          actualCryptoFXTargetCurrencyId: variables.currencies.USD,
          actualCryptoFXTargetAmount: tradeResponse.total_amount.amount,
        },
        ctx.appCtx.API
      );

      createFXinCRM(ctx.appCtx, {
        cryptoPaymentId: cryptoPayment.id,
        amount: cryptoPayment.totalAmount,
        baseCurrencyId: cryptoPayment.currencyId,
        convertedAmount: tradeResponse.total_amount.amount,
        currencyId: variables.currencies.USD,
        fxStatus: variables.fxStatus.new,
        rate: tradeResponse.unit_price.price,
        reference: "CRYPTO",
        fxType: variables.fxType.liquidation,
        externalFxId: tradeResponse.trade_id,
        supplier: variables.fxSuppliers.kraken,
        totalExpected: cryptoFX.convertedAmount,
        totalActual: tradeResponse.total_amount.amount,
        totalPL: tradeResponse.total_amount.amount - cryptoFX.convertedAmount,
      });

      ctx.response.ok(
        {
          tradeId: tradeResponse.trade_id,
          amount: cryptoPayment.totalAmount,
          convertedAmount: tradeResponse.total_amount.amount,
          rate: tradeResponse.unit_price.price
        },
        "Crypto liquidated successfully"
      );
    } else {
      ctx.response.badRequest(
        null,
        "Crypto payment status is not valid for liquidation"
      );
    }
  } catch (error) {
    errorResponse(ctx, error);
  }
};
