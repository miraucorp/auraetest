import { Trade, TradeStatus, TradeType } from "@aucorp/bc-trade-service-model";
import { v4 as uuidv4 } from "uuid";
import {
  AppCtx,
  CreateTradeMarketRequest,
  CreateTradeGsbRequest,
  CreateTradeLimitRequest,
  CryptoWallet,
  FiatAccount,
  GetTradeLimitRangeRequest,
  GetTradeLimitRangeResponse,
} from "../types/types";
import * as rateClient from "./client/rate";
import * as rateModel from "./rate";
import * as accountClient from "./client/account";
import * as walletClient from "./client/wallet";
import * as tradeMappers from "./mappers/trade";
import * as tradeStore from "./store/trade";
import * as sqsClient from "./client/sqs";
import { gsb, isTestNet } from "../variables";
import { newErrWithCode } from "../utils";

/**
 * Creates a trade
 */
export const createTrade = async (
  appCtx: AppCtx,
  contactId: string,
  partnerId: string,
  { accountId, amount, walletId, selectedCurrency, action }: CreateTradeMarketRequest
): Promise<Trade & { rateCreatedAt: string; rateExpiresAt: string }> => {
  const [account, wallet] = await Promise.all([
    accountClient.getAccount(appCtx, accountId, contactId),
    walletClient.getWallet(appCtx, walletId, contactId, partnerId),
  ]);

  const ticker = `${wallet.currency}_${account.basicAccount.currencyCode}`;
  const rate = await rateClient.getMarketTradeRate(appCtx, contactId, ticker, selectedCurrency, amount, action);
  const trade = tradeMappers.toCryptoTrade(uuidv4(), rate, action, contactId, partnerId, walletId, accountId);
  validateBalanceAndWallet(trade, wallet, account);
  await walletClient.validateAmount(appCtx, trade);

  const createdTrade = await tradeStore.insertTrade(appCtx, trade);
  try {
    await sqsClient.sendMessageFulfillTrade(appCtx, createdTrade.tradeId);
  } catch (e) {
    appCtx.log.error(`Failed to send fulfill trade message: ${createdTrade.tradeId}`, e.stack);
  }
  return Object.assign(createdTrade, {
    rateCreatedAt: rate.rateCreated,
    rateExpiresAt: rate.rateExpires,
  });
};

export const getTradeLimitRange = async (
  appCtx: AppCtx,
  contactId: string,
  partnerId: string,
  { amount, currency, ticker, action }: GetTradeLimitRangeRequest
): Promise<GetTradeLimitRangeResponse> => {
  validateLimitTradeTicker(ticker, currency);
  const marketRate = await rateClient.getMarketTradeRate(appCtx, contactId, ticker, currency, Number(amount), action);
  return rateModel.getValidLimitRateRange(action, marketRate);
};

export const getTradeLimitDraft = async (
  appCtx: AppCtx,
  contactId: string,
  partnerId: string,
  { action, accountId, walletId, amount, selectedCurrency, rate: limitRate }: CreateTradeLimitRequest
): Promise<Trade> => {
  const [account, wallet] = await Promise.all([
    accountClient.getAccount(appCtx, accountId, contactId),
    walletClient.getWallet(appCtx, walletId, contactId, partnerId),
  ]);
  const ticker = `${wallet.currency}_${account.basicAccount.currencyCode}`;
  validateLimitTradeTicker(ticker, selectedCurrency);
  const marketRate = await rateClient.getMarketTradeRate(
    appCtx,
    contactId,
    ticker,
    selectedCurrency,
    Number(amount),
    action
  );
  rateModel.validateLimitRate(action, limitRate, marketRate);
  const rate = await rateModel.getLimitRate(appCtx, contactId, {
    action,
    amount,
    currency: selectedCurrency,
    limitRate,
    ticker,
  });
  const trade = tradeMappers.toCryptoTradeLimit(uuidv4(), rate, action, contactId, partnerId, walletId, accountId);
  validateBalanceAndWallet(trade, wallet, account);
  await walletClient.validateAmount(appCtx, trade);
  return trade;
};

/**
 * Creates a limit trade
 *
 * Because of having open orders consumes liquidity we want to discourage having too many open orders for a long time;
 * we are doing this by:
 *   - allowing only one open limit order per customer per coin
 *   - allowing the rate to be between 0.1% and 15% of the current market rate (otherwise it is unlikely to be filled)
 *   - setting an expiration date specified in env variable `LIMIT_TRADE_EXPIRATION_IN_DAYS`
 */
export const createTradeLimit = async (
  appCtx: AppCtx,
  contactId: string,
  partnerId: string,
  params: CreateTradeLimitRequest
): Promise<Trade> => {
  const draft = await getTradeLimitDraft(appCtx, contactId, partnerId, params);
  const trade = await tradeStore.insertLimitTrade(appCtx, draft);
  try {
    await sqsClient.sendMessageFulfillLimitTrade(appCtx, trade.tradeId);
  } catch (e) {
    appCtx.log.error(`Failed to send fulfill limit trade message: ${trade.tradeId}`, e.stack);
  }
  return trade;
};

/**
 * Retries a trade
 */
export const retryTrade = async (
  appCtx: AppCtx,
  tradeId: string,
  contactId: string,
  partnerId: string
): Promise<void> => {
  const trade = await tradeStore.getTrade(appCtx, tradeId);
  if (!trade) {
    throw newErrWithCode(`Trade ${tradeId} not found`, 404);
  }
  if (trade.contactId !== contactId || trade.partnerId !== partnerId) {
    throw newErrWithCode(`Trade ${tradeId} not related to contactId or partnerId`, 400);
  }
  if (trade.tradeStatus === TradeStatus.CREDITED || trade.tradeStatus === TradeStatus.FAILED) {
    throw newErrWithCode(`Trade ${tradeId} already finalized, status ${trade.tradeStatus}`, 403);
  }
  await sqsClient.sendMessageFulfillTrade(appCtx, trade.tradeId, true);
};

/**
 * For GSB-Direct buy
 * @Deprecated
 */
export const createBuyTradePayableToGsb = async (
  appCtx: AppCtx,
  contactId: string,
  partnerId: string,
  { accountId, amount, coin, selectedCurrency }: CreateTradeGsbRequest
): Promise<Trade & { rateCreatedAt: string; rateExpiresAt: string }> => {
  const [account, gsbWallet] = await Promise.all([
    accountClient.getAccount(appCtx, accountId, contactId),
    walletClient.getWallet(appCtx, gsb.getGsbWalletId(coin), gsb.contactId, gsb.partnerId),
  ]);

  const ticker = `${coin}_${account.basicAccount.currencyCode}`;
  const rate = await rateClient.getMarketTradeRate(appCtx, contactId, ticker, selectedCurrency, amount, TradeType.BUY);
  const trade = tradeMappers.toCryptoTrade(
    uuidv4(),
    rate,
    TradeType.BUY,
    contactId,
    partnerId,
    gsb.getGsbWalletId(coin),
    accountId
  );
  validateBalanceAndWallet(trade, gsbWallet, account);

  const createdTrade = await tradeStore.insertTrade(appCtx, trade);
  try {
    await sqsClient.sendMessageFulfillTrade(appCtx, createdTrade.tradeId);
  } catch (e) {
    appCtx.log.error(`Failed to send fulfill trade message: ${createdTrade.tradeId}`, e.stack);
  }
  return Object.assign(createdTrade, {
    rateCreatedAt: rate.rateCreated,
    rateExpiresAt: rate.rateExpires,
  });
};

function validateBalanceAndWallet(trade: Trade, wallet: CryptoWallet, account: FiatAccount): void {
  // Validate disabled actions
  if (
    (trade.tradeType === TradeType.BUY && wallet.disabledActions?.buy) ||
    (trade.tradeType === TradeType.SELL && wallet.disabledActions?.sell)
  ) {
    const actionName = trade.tradeType === TradeType.BUY ? "Buy" : "Sell";
    throw newErrWithCode(`${actionName} ${wallet.currency} temporay disabled`, 400);
  }
  // Validate balance
  const balance =
    trade.tradeType === TradeType.SELL ? wallet.spendableBalance : account.financialAccount.currentBalance;
  if (trade.sourceTotal > balance) {
    throw newErrWithCode(`Not enough balance: ${balance} ${trade.sourceCurrency}`, 400);
  }
  // Validate address initialized before receiving funds
  if (trade.tradeType === TradeType.BUY && wallet.type !== "LEDGER" && !wallet.receivingAddress) {
    throw newErrWithCode(`Wallet might not have been initialized`);
  }
}

const allowedLimitOrderFiatCurrencies = ["USD"];
const allowedLimitOrderCryptoCurrencies = ["BTC", "ETH", "BCH", "LTC", "TRX"];
const allowedLimitOrderCryptoCurrenciesTest = ["TBTC", "TETH", "TBCH", "TLTC", "TRX"];
/**
 * For now only allow USD limit orders for non-stablecoins
 */
function validateLimitTradeTicker(ticker: string, selectedCurrency: string) {
  const allowedCryptos = isTestNet ? allowedLimitOrderCryptoCurrenciesTest : allowedLimitOrderCryptoCurrencies;
  const lastIndex = ticker.lastIndexOf("_");
  if (lastIndex === -1) {
    throw newErrWithCode(`Invalid ticker ${ticker}`, 400);
  }
  const crypto = ticker.slice(0, lastIndex);
  const fiat = ticker.slice(lastIndex + 1);

  if (!allowedCryptos.includes(crypto) || !allowedLimitOrderFiatCurrencies.includes(fiat)) {
    throw newErrWithCode(`Invalid ticker ${ticker}`, 400);
  }
  if (!allowedCryptos.includes(selectedCurrency) && !allowedLimitOrderFiatCurrencies.includes(selectedCurrency)) {
    throw newErrWithCode(`Invalid selectedCurrency ${selectedCurrency}`, 400);
  }
}
