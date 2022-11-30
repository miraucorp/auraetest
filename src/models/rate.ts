import { TradeType, Fee as FeeM } from "@aucorp/bc-trade-service-model";
import Big from "big.js";
import { AppCtx, Fee, GetTradeLimitRangeResponse, LimitRate, RateResp } from "../types/types";
import * as feeStore from "./store/fee";
import * as coinUtil from "../utils/coin";
import { newErrWithCode } from "../utils";

export const getValidLimitRateRange = (action: TradeType, rateResp: RateResp): GetTradeLimitRangeResponse => {
  const marketRate = Big(rateResp.paymentFiatRate);
  const decimals = 2; // hardcoded for USD
  const minMarginPct = 0.001; // 0.1%
  const maxMarginPct = 0.15; // 15%

  if (action === TradeType.BUY) {
    const nearPrice = marketRate.times(Big(1).minus(minMarginPct)).toFixed(decimals);
    const farPrice = marketRate.times(Big(1).minus(maxMarginPct)).toFixed(decimals);
    return { nearPrice, farPrice };
  }
  // SELL
  const nearPrice = marketRate.times(Big(1).plus(minMarginPct)).toFixed(decimals);
  const farPrice = marketRate.times(Big(1).plus(maxMarginPct)).toFixed(decimals);
  return { nearPrice, farPrice };
};

/**
 * Validates the order is within 0.1% and 15% range of the current market rate
 */
export const validateLimitRate = (action: TradeType, limitRate: string, rateResp: RateResp): void => {
  const { nearPrice, farPrice } = getValidLimitRateRange(action, rateResp);
  const marketRate = Big(rateResp.paymentFiatRate);
  switch (action) {
    case TradeType.BUY:
      if (Big(limitRate).gt(marketRate) || Big(limitRate).lt(farPrice)) {
        throw newErrWithCode(`limit rate should be between ${farPrice} and ${nearPrice}`, 400);
      }
      break;
    case TradeType.SELL:
      if (Big(limitRate).lt(marketRate) || Big(limitRate).gt(farPrice)) {
        throw newErrWithCode(`limit rate should be between ${nearPrice} and ${farPrice}`, 400);
      }
      break;
    default:
      throw newErrWithCode(`invalid action: ${action}`, 400);
  }
};

// TODO validate limitRate before calling this method
/**
 * Calculates the limit order rate
 * Current limitations:
 * - only USD fiat is supported for now
 * - for market order continue using client.rate#getTradeRate
 */
export const getLimitRate = async (
  appCtx: AppCtx,
  contactId: string,
  params: GetLimitRateParams
): Promise<LimitRate> => {
  const fees = await getFees(appCtx, contactId);
  const { base, quote } = getBaseQuote(params.ticker);
  const userLimitRate = Big(params.limitRate);

  switch (params.action) {
    case TradeType.SELL: {
      let res;
      if (coinUtil.getType(params.currency) === "CRYPTO") {
        res = getSellLimitRateGivenSource(params.amount, params.currency, quote, userLimitRate, fees);
      } else {
        res = getSellLimitRateGivenTarget(params.amount, params.currency, base, userLimitRate, fees);
      }
      const rateWithoutFx = userLimitRate.div(Big(1).minus(fees.fx));
      const rawLimitRate = Big(rateWithoutFx).div(Big(1).minus(fees.prv));
      return {
        rawLimitRate,
        userLimitRate,
        ...res,
        fees: getUSDFeeAmounts(res.targetTotal, fees),
      };
    }

    case TradeType.BUY: {
      let res;
      if (coinUtil.getType(params.currency) === "FIAT") {
        res = getBuyLimitRateGivenSource(params.amount, params.currency, base, userLimitRate, fees);
      } else {
        res = getBuyLimitRateGivenTarget(params.amount, params.currency, quote, userLimitRate, fees);
      }
      const rateWithoutFx = userLimitRate.times(Big(1).minus(fees.fx));
      const rawLimitRate = rateWithoutFx.times(Big(1).minus(fees.prv));
      return {
        rawLimitRate,
        userLimitRate,
        ...res,
        fees: getUSDFeeAmounts(res.sourceTotal, fees),
      };
    }

    default:
      throw newErrWithCode("Invalid action", 400);
  }
};

async function getFees(appCtx: AppCtx, contactId: string) {
  const fees = await feeStore.getFees(appCtx, contactId);
  return {
    fx: fees.find((f: Fee) => f.code === "FX" && f.type === "PCT")?.amount || 0,
    alf: fees.find((f: Fee) => f.code === "ALF" && f.type === "PCT")?.amount || 0,
    // extra kraken expected fee for LIMIT orders ONLY (for MARKET orders kraken charges another fee plus risk of slippage)
    // TODO revise: setting 0.02 to make it compatible with the current market orders
    prv: 0.02,
  };
}

function getBaseQuote(ticker: string) {
  const li = ticker.lastIndexOf("_");
  if (li === -1) {
    throw new Error(`Invalid ticker: ${ticker}`);
  }
  const base = ticker.substring(0, li);
  const quote = ticker.substring(li + 1);
  return { base, quote };
}

function getSellLimitRateGivenSource(amount: string, currency: string, targetCurrency: string, rate: Big, fees: Fees) {
  const sourceTotal = Big(amount);
  const feeInSourceCurrency = sourceTotal.times(fees.alf);
  const sourceAmount = sourceTotal.minus(feeInSourceCurrency);
  const sourceCurrency = currency;

  const targetTotal = sourceTotal.times(rate);
  const feeInTargetCurrency = targetTotal.times(fees.alf);
  const targetAmount = targetTotal.minus(feeInTargetCurrency);

  return {
    sourceTotal,
    feeInSourceCurrency,
    sourceAmount,
    sourceCurrency,
    targetTotal,
    feeInTargetCurrency,
    targetAmount,
    targetCurrency,
  };
}

function getBuyLimitRateGivenSource(amount: string, currency: string, targetCurrency: string, rate: Big, fees: Fees) {
  const sourceTotal = Big(amount);
  const feeInSourceCurrency = sourceTotal.times(fees.alf);
  const sourceAmount = sourceTotal.minus(feeInSourceCurrency);
  const sourceCurrency = currency;

  const targetTotal = sourceTotal.div(rate);
  const feeInTargetCurrency = targetTotal.times(fees.alf);
  const targetAmount = targetTotal.minus(feeInTargetCurrency);

  return {
    sourceTotal,
    feeInSourceCurrency,
    sourceAmount,
    sourceCurrency,
    targetTotal,
    feeInTargetCurrency,
    targetAmount,
    targetCurrency,
  };
}

function getSellLimitRateGivenTarget(amount: string, currency: string, sourceCurrency: string, rate: Big, fees: Fees) {
  const targetAmount = Big(amount);
  const targetTotal = targetAmount.div(Big(1).minus(fees.alf));
  const feeInTargetCurrency = targetTotal.minus(targetAmount);
  const targetCurrency = currency;

  const sourceAmount = targetAmount.div(rate);
  const sourceTotal = sourceAmount.div(Big(1).minus(fees.alf));
  const feeInSourceCurrency = sourceTotal.minus(sourceAmount);

  return {
    sourceTotal,
    feeInSourceCurrency,
    sourceAmount,
    sourceCurrency,
    targetTotal,
    feeInTargetCurrency,
    targetAmount,
    targetCurrency,
  };
}

function getBuyLimitRateGivenTarget(amount: string, currency: string, sourceCurrency: string, rate: Big, fees: Fees) {
  const targetAmount = Big(amount);
  const targetTotal = targetAmount.div(Big(1).minus(fees.alf));
  const feeInTargetCurrency = targetTotal.minus(targetAmount);
  const targetCurrency = currency;

  const sourceAmount = targetAmount.times(rate);
  const sourceTotal = sourceAmount.div(Big(1).minus(fees.alf));
  const feeInSourceCurrency = sourceTotal.minus(sourceAmount);

  return {
    sourceTotal,
    feeInSourceCurrency,
    sourceAmount,
    sourceCurrency,
    targetTotal,
    feeInTargetCurrency,
    targetAmount,
    targetCurrency,
  };
}

function getUSDFeeAmounts(totalUSD: Big, { fx, alf, prv }: { fx: number; alf: number; prv: number }): FeeM[] {
  const decimals = coinUtil.getDecimals("USD");
  const res: FeeM[] = [];
  let temp = totalUSD;
  if (prv) {
    const withFee = temp;
    temp = temp.times(Big(1).minus(prv)); // remove prv fee
    res.push({
      amount: withFee.minus(temp).toFixed(decimals),
      currency: "USD",
      type: "PRV",
      pct: prv,
    });
  }
  if (fx) {
    const withFee = temp;
    temp = temp.times(Big(1).minus(fx)); // remove fx fee
    res.push({
      amount: withFee.minus(temp).toFixed(decimals),
      currency: "USD",
      type: "FX",
      pct: fx,
    });
  }
  if (alf) {
    const withFee = temp;
    temp = temp.times(Big(1).minus(alf)); // remove alf fee
    res.push({
      amount: withFee.minus(temp).toFixed(decimals),
      currency: "USD",
      type: "ALF",
      pct: alf,
    });
  }
  return res;
}

type GetLimitRateParams = {
  action: TradeType;
  /** expressed in quote currency for tickers like this: BTC_USD */
  limitRate: string;
  ticker: string;
  amount: string;
  currency: string;
};

type Fees = {
  fx: number;
  alf: number;
  prv: number;
};
