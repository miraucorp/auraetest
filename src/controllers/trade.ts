import { TradeStatus, TradeType } from "@aucorp/bc-trade-service-model";
import { errorResponseHandler as errorHandler, validate } from "au-helpers";
import * as moment from "moment";
import * as tradeModel from "../models/trade";
import * as tradeStore from "../models/store/trade";
import * as sqsClient from "../models/client/sqs";
import { toTradeCreatedResp, toTradeGetForContactResp } from "../models/mappers/trade";
import { AuContext } from "../types/types";
import { requiredUuidValidation, uuidValidation } from "../utils";
import { currencies, gsb } from "../variables";

const createBuyTradePayableToGsbValidationRules = {
  contactId: requiredUuidValidation,
  partnerId: `required|in:${[gsb.partnerId, gsb.partnerIdUS]}`,
  accountId: requiredUuidValidation,
  amount: "required|decimal",
  selectedCurrency: ["required", { in: Object.keys(currencies) }],
  coin: ["required", { in: gsb.coins }], // the crypto coin to buy
};

export const createBuyTradePayableToGsb = async (ctx: AuContext): Promise<void> => {
  const { accountId, selectedCurrency, amount, coin } = ctx.request.body;
  const contactId = ctx.req.headers.contactid as string;
  const partnerId = ctx.req.headers.partnerid as string;
  try {
    validate(
      { contactId, partnerId, accountId, amount, coin, selectedCurrency },
      createBuyTradePayableToGsbValidationRules
    );
    const tradeResult = await tradeModel.createBuyTradePayableToGsb(ctx.appCtx, contactId, partnerId, {
      accountId,
      coin,
      amount,
      selectedCurrency,
    });
    ctx.response.ok(toTradeCreatedResp(tradeResult), "GSB buy trade created");
  } catch (e) {
    errorHandler(ctx, e);
  }
};

const createTradeMarketValidationRules = {
  contactId: requiredUuidValidation,
  partnerId: requiredUuidValidation,
  accountId: requiredUuidValidation,
  walletId: requiredUuidValidation,
  amount: "required|decimal",
  selectedCurrency: ["required", { in: Object.keys(currencies) }],
  action: ["required", { in: Object.keys(TradeType) }],
};

/**
 * Creates a BUY (fiat -> crypto) or SELL (crypto -> fiat) trade
 */
export const createTradeMarket = async (ctx: AuContext): Promise<void> => {
  const { accountId, action, selectedCurrency, walletId, amount } = ctx.request.body;
  const contactId = ctx.req.headers.contactid as string;
  const partnerId = ctx.req.headers.partnerid as string;
  try {
    validate(
      { contactId, partnerId, accountId, amount, walletId, selectedCurrency, action },
      createTradeMarketValidationRules
    );
    const tradeResult = await tradeModel.createTrade(ctx.appCtx, contactId, partnerId, {
      action,
      accountId,
      walletId,
      amount,
      selectedCurrency,
    });
    ctx.response.ok(toTradeCreatedResp(tradeResult), "Trade created");
  } catch (e) {
    errorHandler(ctx, e);
  }
};

const getLimitRateRangeValidationRules = {
  contactId: requiredUuidValidation,
  partnerId: requiredUuidValidation,
  amount: "required|numeric|min:0",
  currency: ["required", { in: Object.keys(currencies) }],
  ticker: "required|string",
  action: ["required", { in: Object.keys(TradeType) }],
};

/**
 * Returns the valid limit rate range, for instance if current market rate is: 20,000 BTC/USD then:
 *   - For a BUY it would return  19,980 - 17,000
 *   - For a SELL it would return 20,020 - 23,000
 */
export const getLimitRateRange = async (ctx: AuContext): Promise<void> => {
  const payload = ctx.request.body;
  const contactId = ctx.req.headers.contactid as string;
  const partnerId = ctx.req.headers.partnerid as string;
  try {
    validate({ contactId, partnerId, ...payload }, getLimitRateRangeValidationRules);
    const resp = await tradeModel.getTradeLimitRange(ctx.appCtx, contactId, partnerId, payload);
    ctx.response.ok(
      {
        ...resp,
        ticker: payload.ticker,
        action: payload.action,
      },
      "Limit Trade Rate Range"
    );
  } catch (e) {
    errorHandler(ctx, e);
  }
};

const createTradeLimitValidationRules = {
  contactId: requiredUuidValidation,
  partnerId: requiredUuidValidation,
  accountId: requiredUuidValidation,
  walletId: requiredUuidValidation,
  amount: "required|numeric|min:0",
  selectedCurrency: ["required", { in: Object.keys(currencies) }],
  action: ["required", { in: Object.keys(TradeType) }],
  rate: "required|numeric|min:0",
};

/**
 * Creates a BUY (fiat -> crypto) or SELL (crypto -> fiat) trade using limit order
 * The customer specifies the rate (bellow market rate if buy or above market rate if sell) by wich he wants to buy or sell
 */
export const getDraftTradeLimit = async (ctx: AuContext): Promise<void> => {
  const payload = ctx.request.body;
  const contactId = ctx.req.headers.contactid as string;
  const partnerId = ctx.req.headers.partnerid as string;
  try {
    validate({ contactId, partnerId, ...payload }, createTradeLimitValidationRules);
    const draft = await tradeModel.getTradeLimitDraft(ctx.appCtx, contactId, partnerId, payload);
    ctx.response.ok(toTradeGetForContactResp(draft), "Draft Limit Trade");
  } catch (e) {
    errorHandler(ctx, e);
  }
};

/**
 * Creates a BUY (fiat -> crypto) or SELL (crypto -> fiat) trade using limit order
 * The customer specifies the rate (bellow market rate if buy or above market rate if sell) by wich he wants to buy or sell
 */
export const createTradeLimit = async (ctx: AuContext): Promise<void> => {
  const payload = ctx.request.body;
  const contactId = ctx.req.headers.contactid as string;
  const partnerId = ctx.req.headers.partnerid as string;
  try {
    validate({ contactId, partnerId, ...payload }, createTradeLimitValidationRules);
    const tradeResult = await tradeModel.createTradeLimit(ctx.appCtx, contactId, partnerId, payload);
    ctx.response.ok(toTradeGetForContactResp(tradeResult), "Limit Trade created");
  } catch (e) {
    errorHandler(ctx, e);
  }
};

const cancelTradeLimitValidationRules = {
  tradeId: requiredUuidValidation,
  contactId: requiredUuidValidation,
  partnerId: requiredUuidValidation,
};

export const cancelTradeLimit = async (ctx: AuContext): Promise<void> => {
  const { tradeId } = ctx.params;
  const contactId = ctx.req.headers.contactid as string;
  const partnerId = ctx.req.headers.partnerid as string;
  try {
    validate({ tradeId, contactId, partnerId }, cancelTradeLimitValidationRules);
    await sqsClient.sendMessageCancelLimitTrade(ctx.appCtx, contactId, partnerId, tradeId);
    ctx.response.ok({ tradeId }, "Cancel Trade submitted");
  } catch (e) {
    errorHandler(ctx, e);
  }
};

const retryTradeValidationRules = {
  tradeId: requiredUuidValidation,
  contactId: requiredUuidValidation,
  partnerId: requiredUuidValidation,
};

/**
 * Retries a trade
 */
export const retryTrade = async (ctx: AuContext): Promise<void> => {
  const { tradeId, contactId, partnerId } = ctx.request.body;
  try {
    validate({ tradeId, contactId, partnerId }, retryTradeValidationRules);
    await tradeModel.retryTrade(ctx.appCtx, tradeId, contactId, partnerId);
    ctx.response.ok({ tradeId }, "Trade retrying");
  } catch (e) {
    errorHandler(ctx, e);
  }
};

const updateTradeStatusValidationRules = {
  contactId: requiredUuidValidation,
  partnerId: requiredUuidValidation,
  tradeId: requiredUuidValidation,
  tradeStatus: `in:${[TradeStatus.CREDITED, TradeStatus.FAILED]}`,
};

export const updateTradeStatus = async (ctx: AuContext): Promise<void> => {
  const { tradeStatus, contactId, partnerId, tradeId } = ctx.request.body;
  try {
    validate({ contactId, partnerId, tradeId, tradeStatus }, updateTradeStatusValidationRules);
    await sqsClient.sendMessageUpdateTradeStatus(ctx.appCtx, tradeId, tradeStatus);
    ctx.response.ok({ tradeId }, "Trade updated");
  } catch (e) {
    errorHandler(ctx, e);
  }
};

const getTradesValidationRules = {
  contactId: requiredUuidValidation,
  partnerId: requiredUuidValidation,
  startDate: "required|date",
  endDate: "required|date",
  walletId: uuidValidation,
  open: "in:true,false",
};

/**
 * Gets the trades for the contact id
 */
export const getTrades = async (ctx: AuContext): Promise<void> => {
  const contactId = ctx.req.headers.contactid as string;
  const partnerId = ctx.req.headers.partnerid as string;
  const {
    startDate = moment().subtract(7, "d").format("YYYY-MM-DD"),
    endDate = moment().format("YYYY-MM-DD"),
    walletId,
    open,
  } = ctx.request.query;
  try {
    validate({ contactId, partnerId, startDate, endDate, walletId, open }, getTradesValidationRules);
    if (open === "true") {
      const trades = await tradeStore.getOpenLimitTrades(ctx.appCtx, contactId, walletId as string);
      ctx.response.ok({ trades: trades.map(toTradeGetForContactResp) }, "Open Limit Trades retrieved");
      return;
    }
    if (open === "false") {
      const trades = await tradeStore.getCloseLimitTrades(ctx.appCtx, contactId, walletId as string);
      ctx.response.ok({ trades: trades.map(toTradeGetForContactResp) }, "Closed Limit Trades retrieved");
      return;
    }
    // non limit trades
    const trades = await tradeStore.getTradesForContact(
      ctx.appCtx,
      contactId,
      startDate as string,
      endDate as string,
      walletId as string
    );
    ctx.response.ok({ trades: trades.map(toTradeGetForContactResp) }, "Trades retrieved");
  } catch (e) {
    errorHandler(ctx, e);
  }
};

export const callbackKrakenOrder = async (ctx: AuContext): Promise<void> => {
  const { orders } = ctx.request.body;
  if (!orders || !orders.length) {
    ctx.response.ok(null, `No orders provided`);
    return;
  }
  try {
    await Promise.all(orders.map((o: any) => sqsClient.sendMessageCallbackKrakenOrder(ctx.appCtx, o)));
    ctx.response.ok(null, `Orders update ${orders?.length} message(s) sent`);
  } catch (e) {
    errorHandler(ctx, e);
  }
};
