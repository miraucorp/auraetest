import { Trade, TradeType, TradeStatus, Fee, OrderType, TradeFx, TradeSubstatus } from "@aucorp/bc-trade-service-model";
import Big from "big.js";
import { min, max } from "../../utils";
import { LimitRate, RateResp } from "../../types/types";
import * as coinUtils from "../../utils/coin";
import { limitTradeExpirationInDays } from "../../variables";

function getUSDFees(rate: RateResp): Fee[] {
  const fees: Fee[] = [];
  if (Number(rate.details.fxFeeUSD) > 0 || Number(rate.details.fxFeePct) > 0) {
    fees.push({
      amount: rate.details.fxFeeUSD,
      currency: "USD",
      type: "FX",
      pct: rate.details.fxFeePct,
    });
  }
  if (Number(rate.details.txFeeUSD) > 0 || Number(rate.details.txFeePct) > 0) {
    fees.push({
      amount: rate.details.txFeeUSD,
      currency: "USD",
      type: "TXN",
      pct: rate.details.txFeePct,
    });
  }
  if (Number(rate.details.externalFXFeeUSD) > 0 || Number(rate.details.externalFXFeePct) > 0) {
    fees.push({
      amount: rate.details.externalFXFeeUSD,
      currency: "USD",
      type: "BCN",
      pct: rate.details.externalFXFeePct,
    });
  }
  return fees;
}

function usdToFiat(valueInUsd: number, rate: number, currency: string) {
  return Number(
    Big(valueInUsd)
      .times(rate)
      .toFixed(currency === "JPY" ? 0 : 2)
  );
}

function toCryptoFxs(action: TradeType, rate: RateResp, fiatAmounts: any, cryptoAmounts: any) {
  const usdFxCrypto = {
    amount: rate.details.fxTotalUSD,
    currency: "USD",
    rate: rate.details.usdToCryptoExchangeRate,
  };

  const cryptoFxCrypto = {
    amount: rate.details.exchangeAmount,
    currency: cryptoAmounts.currency,
    rate: rate.details.usdToCryptoExchangeRate,
  };

  const usdFxFiat = {
    amount: rate.details.fxTotalUSD,
    currency: "USD",
    fee: rate.details.fxFeeUSD,
    rate: rate.details.fiatRate,
  };

  const fxs = [];
  fxs.push({
    type: action === TradeType.BUY ? "FIAT_CRYPTO" : "CRYPTO_FIAT",
    provider: rate.details.provider || "CUMBERLAND",
    quoteOrActual: "QUOTE",
    sourceAmount: action === TradeType.BUY ? usdFxCrypto.amount : cryptoFxCrypto.amount,
    sourceCurrency: action === TradeType.BUY ? usdFxCrypto.currency : cryptoFxCrypto.currency,
    sourceTotal: action === TradeType.BUY ? usdFxCrypto.amount : cryptoFxCrypto.amount,
    targetAmount: action === TradeType.SELL ? usdFxCrypto.amount : cryptoFxCrypto.amount,
    targetCurrency: action === TradeType.SELL ? usdFxCrypto.currency : cryptoFxCrypto.currency,
    targetTotal: action === TradeType.SELL ? usdFxCrypto.amount : cryptoFxCrypto.amount,

    rate: action === TradeType.SELL ? usdFxCrypto.rate : undefined,
    inverseRate: action === TradeType.BUY ? usdFxCrypto.rate : undefined,
  });
  if (fiatAmounts.currency !== "USD") {
    const fiatFxFiat = {
      amount: usdToFiat(usdFxFiat.amount, usdFxFiat.rate, fiatAmounts.currency),
      currency: fiatAmounts.currency,
    };
    fxs.push({
      type: "FIAT_FIAT",
      provider: "MONEYCORP",
      quoteOrActual: "QUOTE",
      sourceAmount: action === TradeType.BUY ? fiatFxFiat.amount : usdFxFiat.amount,
      sourceCurrency: action === TradeType.BUY ? fiatFxFiat.currency : usdFxFiat.currency,
      sourceTotal: action === TradeType.BUY ? fiatFxFiat.amount : usdFxFiat.amount,
      targetAmount: action === TradeType.SELL ? fiatFxFiat.amount : usdFxFiat.amount,
      targetCurrency: action === TradeType.SELL ? fiatFxFiat.currency : usdFxFiat.currency,
      targetTotal: action === TradeType.SELL ? fiatFxFiat.amount : usdFxFiat.amount,

      rate: action === TradeType.BUY ? undefined : usdFxFiat.rate,
      inverseRate: action === TradeType.SELL ? undefined : usdFxFiat.rate,
    });
  }
  return fxs;
}

/**
 * Constructs a `Trade` object from the rate response
 */
export const toCryptoTrade = (
  tradeId: string,
  rate: RateResp,
  action: TradeType,
  contactId: string,
  partnerId: string,
  walletId: string,
  accountId: string
): Trade => {
  const fiatAmounts = {
    // TODO rate returns `amount - fee = totalAmount` sometimes, othertimes: `amount + fee = totalAmount`
    // that's why we need this workaround using `min` and `max`
    amount: min(rate.paymentFiatAmount, rate.paymentFiatTotal),
    total: max(rate.paymentFiatAmount, rate.paymentFiatTotal),
    fee: rate.paymentFiatFee,
    rate: rate.paymentFiatRate,
    currency: rate.paymentFiatCurrency,
  };

  const cryptoAmounts = {
    amount: min(rate.paymentAmount, rate.paymentTotal),
    total: max(rate.paymentAmount, rate.paymentTotal),
    fee: rate.paymentFee,
    rate: rate.paymentRate,
    currency: rate.paymentCurrency,
  };

  return {
    tradeId,
    // user data
    contactId,
    partnerId,
    tradeStatus: TradeStatus.NEW,
    tradeType: action,

    sourceAmount: action === TradeType.BUY ? fiatAmounts.amount : cryptoAmounts.amount,
    sourceCurrency: action === TradeType.BUY ? fiatAmounts.currency : cryptoAmounts.currency,
    feeInSourceCurrency: action === TradeType.BUY ? fiatAmounts.fee : cryptoAmounts.fee,
    sourceTotal: action === TradeType.BUY ? fiatAmounts.total : cryptoAmounts.total,
    sourceWalletId: action === TradeType.BUY ? accountId : walletId,

    targetAmount: action === TradeType.SELL ? fiatAmounts.amount : cryptoAmounts.amount,
    targetCurrency: action === TradeType.SELL ? fiatAmounts.currency : cryptoAmounts.currency,
    feeInTargetCurrency: action === TradeType.SELL ? fiatAmounts.fee : cryptoAmounts.fee,
    targetTotal: action === TradeType.SELL ? fiatAmounts.total : cryptoAmounts.total,
    targetWalletId: action === TradeType.SELL ? accountId : walletId,

    rate: action === TradeType.SELL ? fiatAmounts.rate : cryptoAmounts.rate,
    inverseRate: action === TradeType.BUY ? fiatAmounts.rate : cryptoAmounts.rate,

    fees: getUSDFees(rate),
    fxs: toCryptoFxs(action, rate, fiatAmounts, cryptoAmounts),
  } as Trade;
};

/**
 * Constructs a `Trade` limit object from the rate response
 */
export const toCryptoTradeLimit = (
  tradeId: string,
  rate: LimitRate,
  action: TradeType,
  contactId: string,
  partnerId: string,
  walletId: string,
  accountId: string
): Trade => {
  const sourceDecimals = coinUtils.getDecimals(rate.sourceCurrency);
  const targetDecimals = coinUtils.getDecimals(rate.targetCurrency);
  const { limitRate, inverseRate } = getRates(action, rate.userLimitRate, rate.sourceCurrency, rate.targetCurrency);

  const now = new Date();
  const createdAt = now.toISOString();
  const expiresAt = plusDays(now, limitTradeExpirationInDays);
  return {
    tradeId,
    // user data
    contactId,
    partnerId,
    tradeStatus: TradeStatus.NEW,
    tradeType: action,

    sourceAmount: rate.sourceAmount.toFixed(sourceDecimals),
    sourceCurrency: rate.sourceCurrency,
    feeInSourceCurrency: rate.feeInSourceCurrency.toFixed(sourceDecimals),
    sourceTotal: rate.sourceTotal.toFixed(sourceDecimals),
    sourceWalletId: action === TradeType.BUY ? accountId : walletId,

    targetAmount: rate.targetAmount.toFixed(targetDecimals),
    targetCurrency: rate.targetCurrency,
    feeInTargetCurrency: rate.feeInTargetCurrency.toFixed(targetDecimals),
    targetTotal: rate.targetTotal.toFixed(targetDecimals),
    targetWalletId: action === TradeType.SELL ? accountId : walletId,

    rate: limitRate,
    inverseRate,

    fees: rate.fees,
    fxs: toLimitTradeFxs(action, rate, createdAt, expiresAt),

    // limit specific
    orderType: OrderType.LIMIT,
    executedPct: "0",
    createdAt,
    expiresAt,
  } as Trade;
};

function toLimitTradeFxs(action: TradeType, rate: LimitRate, createdAt: string, expiresAt: string): TradeFx[] {
  const sourceDecimals = coinUtils.getDecimals(rate.sourceCurrency);
  const targetDecimals = coinUtils.getDecimals(rate.targetCurrency);
  const { limitRate, inverseRate } = getRates(action, rate.rawLimitRate, rate.sourceCurrency, rate.targetCurrency);

  return [
    {
      type: action === TradeType.BUY ? "FIAT_CRYPTO" : "CRYPTO_FIAT",
      provider: "KRAKEN",
      quoteOrActual: "QUOTE",
      sourceAmount: rate.sourceAmount.toFixed(sourceDecimals),
      sourceCurrency: rate.sourceCurrency,
      sourceTotal: rate.sourceTotal.toFixed(sourceDecimals),
      targetAmount: rate.targetAmount.toFixed(targetDecimals),
      targetCurrency: rate.targetCurrency,
      targetTotal: rate.targetTotal.toFixed(targetDecimals),

      rate: limitRate,
      inverseRate,

      orderType: OrderType.LIMIT,
      volumeExecuted: 0,

      createdAt,
      expiresAt,
    },
  ];
}

function getRates(action: TradeType, rate: Big, sourceCurrency: string, targetCurrency: string) {
  const cryptoCoin = action === TradeType.BUY ? targetCurrency : sourceCurrency;
  const cryptoDecimals = coinUtils.getDecimals(cryptoCoin);
  const rateDecimals = getDecimalsForKrakenRate(cryptoCoin);
  // raw rates to create the order in kraken
  let limitRate: string;
  let inverseRate: string;
  if (action === TradeType.SELL) {
    limitRate = rate.toFixed(rateDecimals);
    inverseRate = Big(1).div(rate).toFixed(cryptoDecimals);
  } else {
    limitRate = Big(1).div(rate).toFixed(cryptoDecimals);
    inverseRate = rate.toFixed(rateDecimals);
  }
  return { limitRate, inverseRate };
}

/**
 * Hack for Kraken
 */
function getDecimalsForKrakenRate(coin: string) {
  switch (coin) {
    case "BTC":
    case "TBTC":
      return 1;
    case "TRX":
      return 6;
    default:
      return 2;
  }
}

export const toTradeCreatedResp = (trade: Trade & { rateCreatedAt?: string; rateExpiresAt?: string }) => ({
  paymentId: trade.tradeId,
  paymentRate: trade.tradeType === TradeType.SELL ? trade.rate : trade.inverseRate,
  paymentAmount: trade.tradeType === TradeType.SELL ? trade.sourceAmount : trade.targetAmount,
  paymentFee: trade.tradeType === TradeType.SELL ? trade.feeInSourceCurrency : trade.feeInTargetCurrency,
  paymentTotal: trade.tradeType === TradeType.SELL ? trade.sourceTotal : trade.targetTotal,
  paymentCurrency: trade.tradeType === TradeType.SELL ? trade.sourceCurrency : trade.targetCurrency,
  paymentFiatRate: trade.tradeType === TradeType.BUY ? trade.rate : trade.inverseRate,
  paymentFiatAmount: trade.tradeType === TradeType.BUY ? trade.sourceAmount : trade.targetAmount,
  paymentFiatFee: trade.tradeType === TradeType.BUY ? trade.feeInSourceCurrency : trade.feeInTargetCurrency,
  paymentFiatTotal: trade.tradeType === TradeType.BUY ? trade.sourceTotal : trade.targetTotal,
  paymentFiatCurrency: trade.tradeType === TradeType.BUY ? trade.sourceCurrency : trade.targetCurrency,
  paymentType: trade.tradeType,
  orderType: trade.orderType,
  executedPct: trade.executedPct,
  paymentStatus: "PENDING",
  paymentCreated: trade.rateCreatedAt,
  paymentExpires: trade.rateExpiresAt,
});

export const toTradeGetForContactResp = (trade: Trade) => ({
  tradeId: trade.tradeId,
  tradeType: trade.tradeType,
  orderType: trade.orderType,
  executedPct: trade.orderType === OrderType.LIMIT ? toFixed(trade.executedPct) : undefined,
  sourceAmount: toFixed(trade.sourceTotal), // customer sent
  sourceCurrency: trade.sourceCurrency,
  targetAmount: toFixed(trade.targetAmount), // customer received
  targetCurrency: trade.targetCurrency,
  rate: toFixed(trade.rate),
  inverseRate: toFixed(trade.inverseRate),
  fee: toFixed(trade.feeInSourceCurrency),
  feeCurrency: trade.sourceCurrency,
  debitTxId: trade.debitTx?.txId ? trade.debitTx?.txId : trade.debitTx?.id,
  creditTxId: trade.creditTx?.txId ? trade.creditTx?.txId : trade.creditTx?.id,
  refundTxId: trade.refundTx?.txId ? trade.refundTx?.txId : trade.refundTx?.id,
  tradeStatus: toTradeGetStatus(trade),
  createdAt: trade.createdAt,
  expiresAt: trade.expiresAt,
});

function toTradeGetStatus(trade: Trade) {
  if (trade.orderType === OrderType.LIMIT) {
    return toLimitTradeGetStatus(trade);
  }
  if (trade.tradeStatus === TradeStatus.FAILED) {
    return trade.tradeStatus;
  }
  return trade.tradeError || trade.tradeStatus;
}

/**
 * The trade status that is returned to the end user UI or external API
 */
const enum TradeLimitResponseStatus {
  OPENING = "OPENING",
  OPEN = "OPEN",
  CLOSING = "CLOSING",
  CLOSED = "CLOSED",
  CANCELLING = "CANCELLING",
  CANCELLED = "CANCELLED",
  EXPIRED = "EXPIRED",
  FAILED = "FAILED",
  UNKNOWN = "UNKNOWN", // unknown status
}

function toLimitTradeGetStatus(trade: Trade): TradeLimitResponseStatus {
  switch (trade.tradeSubstatus) {
    case TradeSubstatus.CANCELLED:
      if (!isFinal(trade.tradeStatus)) {
        return TradeLimitResponseStatus.CANCELLING;
      }
      return TradeLimitResponseStatus.CANCELLED;
    case TradeSubstatus.EXPIRED:
      if (!isFinal(trade.tradeStatus)) {
        return TradeLimitResponseStatus.CLOSING;
      }
      return TradeLimitResponseStatus.EXPIRED;
    default:
      break;
  }
  switch (trade.tradeStatus) {
    case TradeStatus.NEW:
    case TradeStatus.DEBIT_WAITING_CONF:
    case TradeStatus.DEBITED:
      return TradeLimitResponseStatus.OPENING;
    case TradeStatus.ORDER_OPENED:
      return TradeLimitResponseStatus.OPEN;
    case TradeStatus.ORDER_CLOSED:
    case TradeStatus.EXECUTED:
    case TradeStatus.CREDIT_WAITING_CONF:
    case TradeStatus.CREDITED:
    case TradeStatus.REFUNDED_WAITING_CONF:
    case TradeStatus.REFUNDED:
      return TradeLimitResponseStatus.CLOSING;
    case TradeStatus.COMPLETED:
      return TradeLimitResponseStatus.CLOSED;
    case TradeStatus.FAILED:
      return TradeLimitResponseStatus.FAILED;
    default:
      break;
  }
  return TradeLimitResponseStatus.UNKNOWN;
}

function isFinal(s: TradeStatus): boolean {
  return [TradeStatus.FAILED, TradeStatus.COMPLETED].includes(s);
}

/** Removes the trailing decimal zeroes */
function toFixed(x: string | number = null) {
  if (Number(x)) {
    return Big(x).toFixed();
  }
  return "0";
}

/**
 * Returns the date ISO String of `dateISOString` adding to it the number of days specified by `days`
 */
function plusDays(date: Date, days: number): string {
  const time = date.getTime();
  return new Date(time + 3600 * 1000 * 24 * days).toISOString();
}
