import { TradeType, Fee as FeeM } from "@aucorp/bc-trade-service-model";
import { AxiosInstance } from "axios";
import Big from "big.js";
import { Context, Response } from "koa";

export interface FiatAccount {
  accountType: string;
  basicAccount: {
    currencyCode: string;
  };
  financialAccount: {
    currentBalance: number;
  };
}

export interface AppCtx {
  API: AxiosInstance;
  traced: any;
  log: any;
}

/**
 * Enhanced koa.Context by au_helpers
 */
export interface AuContext extends Context {
  response: {
    ok: any;
    forbidden: any;
  } & Response;
}

export type RateResp = {
  /**
   * Rate we provide to customer (Cumberland rate adjusted by `fxFeePc`)
   * @example
   * paymentFiatAmount * [[paymentRate]] = paymentAmount
   * 7726.93 GBP       * 0.00006471      = 0.5 BTC
   *
   * paymentFiatTotal  * [[paymentRate]] = paymentTotal
   * 7879.92 GBP       * 0.00006471      = 0.5099 BTC
   */
  paymentRate: number;
  paymentAmount: number;
  /** The `txFeeUSD` expressed in `paymentCurrency`  */
  paymentFee: number;
  paymentTotal: number;
  /** The crypto currency; e.g.: BTC, ETH, USDC... */
  paymentCurrency: string;
  /**
   * Inverse of `paymentRate`
   * @example
   * paymentAmount * [[paymentFiatRate]] = paymentFiatAmount
   * 0.5 BTC       * 15453.85284         = 7726.93 GBP
   *
   * paymentTotal  * [[paymentFiatRate]] = paymentFiatTotal
   * 0.5099 BTC    * 15453.85284         = 7879.92 GBP
   */
  paymentFiatRate: number;
  paymentFiatAmount: number;
  /** The `txFeeUSD` expressed in `paymentFiatCurrency`  */
  paymentFiatFee: number;
  paymentFiatTotal: number;
  /** The fiat currency; e.g.: USD, EUR, GBP... */
  paymentFiatCurrency: string;
  rateCreated: string;
  rateExpires: string;
  details: {
    /** Cumberland quote id */
    quoteId: string;
    /** The fiat exchange rate; e.g.: 1 EUR * `fiatRate` = 1.22 USD */
    fiatRate: number;
    /**
     * Cumberland exchange rate (we only exchange to/from USD with Cumberland)
     * @example
     * exchangeAmount * [[usdToCryptoExchangeRate]] = fxTotalUSD
     * 0.64365505 BTC * 19420.34                    = 12500 USD
     */
    usdToCryptoExchangeRate: number;
    /**
     * Fx fee applied by us on top of Cumberland's rate resulting in `paymentFiatRate`
     * @example
     * 10k USD -> 0.5 BTC (Cumberland)
     * 10k USD -> 0.499 BTC (Us)
     */
    fxFeePct: number;
    /** calculated fx fee in USD */
    fxFeeUSD: number;
    /** From/to USD amount quoted by Cumberland */
    fxTotalUSD: number;
    /** External deposit fee */
    externalFXFeePct: number;
    externalFXFeeUSD: number;
    txFeePct: number;
    txFeeUSD: number;
    /**
     * Cumberland exchange rate adjusted to fiat other than USD, e.g.: EUR -> BTC
     * If we are exchanging to/from USD then this is exactly the same as `usdToCryptoExchangeRate`
     */
    exchangeRate: number;
    /** From/to Crypto amount quoted by Cumberland */
    exchangeAmount: number;
    amount: number;
    provider?: string; // CUMBERLAND | KRAKEN | GSB
  };
};

export type CryptoWallet = {
  spendableBalance: number;
  receivingAddress: string;
  currency: string;
  type: string;
  disabledActions: Record<string, boolean>;
};

export type CreateTradeMarketRequest = {
  action: TradeType;
  accountId: string;
  walletId: string;
  amount: number;
  selectedCurrency: string;
};

export type CreateTradeLimitRequest = {
  action: TradeType;
  accountId: string;
  walletId: string;
  amount: string;
  selectedCurrency: string;
  rate: string;
};

export type GetTradeLimitRangeRequest = {
  action: TradeType;
  amount: string;
  currency: string;
  ticker: string;
};

export type GetTradeLimitRangeResponse = {
  nearPrice: string;
  farPrice: string;
};

export type CreateTradeGsbRequest = {
  accountId: string;
  amount: number;
  selectedCurrency: string;
  coin: string;
};

export type Fee = {
  amount: number;
  code: string; // "ALF" = Asset Liquidation Fee
  transactionGroup: {
    id: string;
    code: string;
  };
  statusCodeValue: string; // "Active"
  description: string;
  type: "PCT";
  feeType: "Percentage";
  id: string;
};

export type FeeAmount = {
  amount: string;
  currency: string;
  type: string;
  pct: number;
};

export type LimitRate = {
  rawLimitRate: Big;
  userLimitRate: Big;
  sourceTotal: Big;
  feeInSourceCurrency: Big;
  sourceAmount: Big;
  sourceCurrency: string;
  targetTotal: Big;
  feeInTargetCurrency: Big;
  targetAmount: Big;
  targetCurrency: string;
  fees: FeeM[];
};
