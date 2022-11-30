import { TradeFx, TradeType } from "@aucorp/bc-trade-service-model";
import { Fee } from "@aucorp/bc-trade-service-model/lib/types/trade-types";
import { toCryptoTrade } from "../../../models/mappers/trade";
import { getRateResponse, rateRespOnlyFxFee, fxRateRespMocks } from "../../mocks/tradeMocks";

describe("toCryptoTrade", () => {
  test("SELL will render fiat quotes and crypto targets", () => {
    const trade = toCryptoTrade("t-id", getRateResponse, TradeType.SELL, "c-id", "p-id", "wall-id", "acc-id");

    expect(trade.tradeStatus).toBe("NEW");
    expect(trade.tradeType).toBe("SELL");
    // TBTC -> EUR
    expect(trade.sourceWalletId).toBe("wall-id");
    expect(trade.sourceCurrency).toBe("TBTC");
    expect(trade.sourceAmount).toBe(0.00080546);
    expect(trade.feeInSourceCurrency).toBe(0.00001627);
    expect(trade.rate).toBe(12169.437264000002);
    expect(trade.sourceTotal).toBe(0.00082173);
    expect(trade.fees).toStrictEqual([
      {
        amount: 0.05,
        currency: "USD",
        type: "FX",
        pct: 0.005,
      },
      {
        amount: 0.22,
        currency: "USD",
        type: "TXN",
        pct: 0.0198,
      },
    ] as Fee[]);

    expect(trade.targetWalletId).toBe("acc-id");
    expect(trade.targetCurrency).toBe("EUR");
    expect(trade.targetAmount).toBe(9.8);
    expect(trade.feeInTargetCurrency).toBe(0.2);
    expect(trade.inverseRate).toBe(0.00008217);
    expect(trade.targetTotal).toBe(10); // amount + fee

    expect(trade.fxs).toStrictEqual([
      // TBTC -> USD
      {
        type: "CRYPTO_FIAT",
        provider: "CUMBERLAND",
        quoteOrActual: "QUOTE",
        sourceAmount: 0.00082584,
        sourceCurrency: "TBTC",
        sourceTotal: 0.00082584,
        rate: 13161.84,
        targetAmount: 10.87,
        targetCurrency: "USD",
        inverseRate: undefined,
        targetTotal: 10.87,
      },
      // USD -> EUR
      {
        type: "FIAT_FIAT",
        provider: "MONEYCORP",
        quoteOrActual: "QUOTE",
        sourceAmount: 10.87,
        sourceCurrency: "USD",
        sourceTotal: 10.87,
        rate: 0.92,
        targetAmount: 10,
        targetCurrency: "EUR",
        targetTotal: 10,
        inverseRate: undefined,
      },
    ] as TradeFx[]);
  });

  test("BUY will render crypto quotes and fiat targets", () => {
    const trade = toCryptoTrade("t-id", getRateResponse, TradeType.BUY, "c-id", "p-id", "wall-id", "acc-id");

    expect(trade.tradeStatus).toBe("NEW");
    expect(trade.tradeType).toBe("BUY");
    // EUR -> TBTC
    expect(trade.sourceWalletId).toBe("acc-id");
    expect(trade.sourceCurrency).toBe("EUR");
    expect(trade.sourceAmount).toBe(9.8);
    expect(trade.feeInSourceCurrency).toBe(0.2);
    expect(trade.rate).toBe(0.00008217);
    expect(trade.sourceTotal).toBe(10);

    expect(trade.targetWalletId).toBe("wall-id");
    expect(trade.targetCurrency).toBe("TBTC");
    expect(trade.targetAmount).toBe(0.00080546);
    expect(trade.feeInTargetCurrency).toBe(0.00001627);
    expect(trade.inverseRate).toBe(12169.437264000002);
    expect(trade.targetTotal).toBe(0.00082173);

    expect(trade.fees).toStrictEqual([
      {
        amount: 0.05,
        currency: "USD",
        type: "FX",
        pct: 0.005,
      },
      {
        amount: 0.22,
        currency: "USD",
        type: "TXN",
        pct: 0.0198,
      },
    ] as Fee[]);

    // USD -> TBTC
    expect(trade.fxs[0]).toStrictEqual({
      type: "FIAT_CRYPTO",
      provider: "CUMBERLAND",
      quoteOrActual: "QUOTE",
      sourceAmount: 10.87,
      sourceCurrency: "USD",
      sourceTotal: 10.87,
      rate: undefined,
      targetAmount: 0.00082584,
      targetCurrency: "TBTC",
      inverseRate: 13161.84,
      targetTotal: 0.00082584,
    } as TradeFx);
    // EUR -> USD
    expect(trade.fxs[1]).toStrictEqual({
      type: "FIAT_FIAT",
      provider: "MONEYCORP",
      quoteOrActual: "QUOTE",
      sourceAmount: 10,
      sourceCurrency: "EUR",
      rate: undefined,
      sourceTotal: 10,
      targetAmount: 10.87,
      targetCurrency: "USD",
      inverseRate: 0.92,
      targetTotal: 10.87,
    } as TradeFx);
  });

  test("SELL only fx fee", () => {
    const trade = toCryptoTrade("t-id", rateRespOnlyFxFee, TradeType.SELL, "c-id", "p-id", "wall-id", "acc-id");

    expect(trade.tradeStatus).toBe("NEW");
    expect(trade.tradeType).toBe("SELL");
    // BTC -> USD
    expect(trade.sourceWalletId).toBe("wall-id");
    expect(trade.sourceCurrency).toBe("BTC");
    expect(trade.sourceAmount).toBe(0.5);
    expect(trade.feeInSourceCurrency).toBe(0);
    expect(trade.rate).toBe(16370.625549999999);
    expect(trade.sourceTotal).toBe(0.5);

    expect(trade.fees).toStrictEqual([
      {
        amount: 41.13,
        currency: "USD",
        type: "FX",
        pct: 0.005,
      },
    ] as Fee[]);

    expect(trade.targetWalletId).toBe("acc-id");
    expect(trade.targetCurrency).toBe("USD");
    expect(trade.targetAmount).toBe(8185.31);
    expect(trade.feeInTargetCurrency).toBe(0);
    expect(trade.inverseRate).toBe(0.00006108);
    expect(trade.targetTotal).toBe(8185.31);

    // BTC -> USD
    expect(trade.fxs).toStrictEqual([
      {
        type: "CRYPTO_FIAT",
        provider: "CUMBERLAND",
        quoteOrActual: "QUOTE",
        sourceAmount: 0.5,
        sourceCurrency: "BTC",
        sourceTotal: 0.5,
        rate: 16452.89,
        targetAmount: 8226.45,
        targetCurrency: "USD",
        inverseRate: undefined,
        targetTotal: 8226.45,
      },
    ] as TradeFx[]);
  });
});

describe("toCryptoTrade buy & sell", () => {
  test("Buy USD -> 0.5 BTC", () => {
    const trade = toCryptoTrade(
      "tradeId",
      fxRateRespMocks["Buy_USD_->_0.5_BTC"],
      TradeType.BUY,
      "contactId",
      "partnerId",
      "walletId",
      "accountId"
    );
    expect(trade.tradeStatus).toBe("NEW");
    expect(trade.tradeType).toBe("BUY");

    // USD -> BTC
    expect(trade.sourceWalletId).toBe("accountId");
    expect(trade.sourceCurrency).toBe("USD");
    expect(trade.sourceAmount).toBe(9623.21);
    expect(trade.feeInSourceCurrency).toBe(190.54);
    expect(trade.rate).toBe(0.00005196);
    expect(trade.sourceTotal).toBe(9813.75);

    expect(trade.targetWalletId).toBe("walletId");
    expect(trade.targetCurrency).toBe("BTC");
    expect(trade.targetAmount).toBe(0.5); // Customer to receive
    expect(trade.feeInTargetCurrency).toBe(0.0099);
    expect(trade.inverseRate).toBe(19246.4133);
    expect(trade.targetTotal).toBe(0.5099);
    expect(trade.fees).toStrictEqual([
      {
        amount: 47.88,
        currency: "USD",
        type: "FX",
        pct: 0.005,
      },
      {
        amount: 190.54,
        currency: "USD",
        type: "TXN",
        pct: 0.0198,
      },
    ] as Fee[]);

    // No fiat to fiat fx since it is USD
    expect(trade.fxs.length).toBe(1);
    // USD -> BTC
    expect(trade.fxs[0]).toStrictEqual({
      type: "FIAT_CRYPTO",
      provider: "CUMBERLAND",
      quoteOrActual: "QUOTE",
      sourceAmount: 9575.33,
      sourceCurrency: "USD",
      sourceTotal: 9575.33,
      rate: undefined,
      targetAmount: 0.5,
      targetCurrency: "BTC",
      inverseRate: 19150.66,
      targetTotal: 0.5,
    } as TradeFx);
  });

  test("Buy GBP -> 0.5 BTC", () => {
    const trade = toCryptoTrade(
      "tradeId",
      fxRateRespMocks["Buy_GBP_->_0.5_BTC"],
      TradeType.BUY,
      "contactId",
      "partnerId",
      "walletId",
      "accountId"
    );
    expect(trade.tradeStatus).toBe("NEW");
    expect(trade.tradeType).toBe("BUY");

    // GBP -> BTC
    expect(trade.sourceWalletId).toBe("accountId");
    expect(trade.sourceCurrency).toBe("GBP");
    expect(trade.sourceAmount).toBe(7726.93);
    expect(trade.feeInSourceCurrency).toBe(152.99);
    expect(trade.rate).toBe(0.00006471);
    expect(trade.sourceTotal).toBe(7879.92); // Customer to pay

    expect(trade.targetWalletId).toBe("walletId");
    expect(trade.targetCurrency).toBe("BTC");
    expect(trade.targetAmount).toBe(0.5); // Customer to receive
    expect(trade.feeInTargetCurrency).toBe(0.0099);
    expect(trade.inverseRate).toBe(15453.852840000001);
    expect(trade.targetTotal).toBe(0.5099);
    expect(trade.fees).toStrictEqual([
      {
        amount: 48.05,
        currency: "USD",
        type: "FX",
        pct: 0.005,
      },
      {
        amount: 191.24,
        currency: "USD",
        type: "TXN",
        pct: 0.0198,
      },
    ] as Fee[]);

    expect(trade.fxs.length).toBe(2);

    // USD -> BTC
    expect(trade.fxs[0]).toStrictEqual({
      type: "FIAT_CRYPTO",
      provider: "CUMBERLAND",
      quoteOrActual: "QUOTE",
      sourceAmount: 9610.61,
      sourceCurrency: "USD",
      sourceTotal: 9610.61,
      rate: undefined,
      targetAmount: 0.5,
      targetCurrency: "BTC",
      inverseRate: 19221.21,
      targetTotal: 0.5,
    } as TradeFx);
    // GBP -> USD
    expect(trade.fxs[1]).toStrictEqual({
      type: "FIAT_FIAT",
      provider: "MONEYCORP",
      quoteOrActual: "QUOTE",
      sourceAmount: 7688.49, // This one is calculated (missed from resp)
      sourceCurrency: "GBP",
      sourceTotal: 7688.49,
      rate: undefined,
      targetAmount: 9610.61,
      targetCurrency: "USD",
      inverseRate: 0.8,
      targetTotal: 9610.61,
    } as TradeFx);
  });

  test("Buy 10k USD -> BTC", () => {
    const trade = toCryptoTrade(
      "tradeId",
      fxRateRespMocks["Buy_10k_USD_->_BTC"],
      TradeType.BUY,
      "contactId",
      "partnerId",
      "walletId",
      "accountId"
    );
    expect(trade.tradeStatus).toBe("NEW");
    expect(trade.tradeType).toBe("BUY");

    // USD -> BTC
    expect(trade.sourceWalletId).toBe("accountId");
    expect(trade.sourceCurrency).toBe("USD");
    expect(trade.sourceAmount).toBe(9802);
    expect(trade.feeInSourceCurrency).toBe(198);
    expect(trade.rate).toBe(0.00005139);
    expect(trade.sourceTotal).toBe(10000); // Customer to pay

    expect(trade.targetWalletId).toBe("walletId");
    expect(trade.targetCurrency).toBe("BTC");
    expect(trade.targetAmount).toBe(0.50372966); // Customer to receive
    expect(trade.feeInTargetCurrency).toBe(0.01017532);
    expect(trade.inverseRate).toBe(19458.8502);
    expect(trade.targetTotal).toBe(0.51390498);
    expect(trade.fees).toStrictEqual([
      {
        amount: 50,
        currency: "USD",
        type: "FX",
        pct: 0.005,
      },
      {
        amount: 198,
        currency: "USD",
        type: "TXN",
        pct: 0.0198,
      },
    ] as Fee[]);

    expect(trade.fxs.length).toBe(1);

    // USD -> BTC
    expect(trade.fxs[0]).toStrictEqual({
      type: "FIAT_CRYPTO",
      provider: "CUMBERLAND",
      quoteOrActual: "QUOTE",
      sourceAmount: 10000,
      sourceCurrency: "USD",
      sourceTotal: 10000,
      rate: undefined,
      targetAmount: 0.5164745,
      targetCurrency: "BTC",
      inverseRate: 19362.04,
      targetTotal: 0.5164745,
    } as TradeFx);
  });

  test("Buy 10k GBP -> BTC", () => {
    const trade = toCryptoTrade(
      "tradeId",
      fxRateRespMocks["Buy_10k_GBP_->_BTC"],
      TradeType.BUY,
      "contactId",
      "partnerId",
      "walletId",
      "accountId"
    );
    expect(trade.tradeStatus).toBe("NEW");
    expect(trade.tradeType).toBe("BUY");

    // GBP -> BTC
    expect(trade.sourceWalletId).toBe("accountId");
    expect(trade.sourceCurrency).toBe("GBP");
    expect(trade.sourceAmount).toBe(9802);
    expect(trade.feeInSourceCurrency).toBe(198);
    expect(trade.rate).toBe(0.00006404);
    expect(trade.sourceTotal).toBe(10000); // Customer to pay

    expect(trade.targetWalletId).toBe("walletId");
    expect(trade.targetCurrency).toBe("BTC");
    expect(trade.targetAmount).toBe(0.62777182); // Customer to receive
    expect(trade.feeInTargetCurrency).toBe(0.01268097);
    expect(trade.inverseRate).toBe(15613.953360000001);
    expect(trade.targetTotal).toBe(0.64045279);
    expect(trade.fees).toStrictEqual([
      {
        amount: 62.5,
        currency: "USD",
        type: "FX",
        pct: 0.005,
      },
      {
        amount: 247.5,
        currency: "USD",
        type: "TXN",
        pct: 0.0198,
      },
    ] as Fee[]);

    expect(trade.fxs.length).toBe(2);

    // USD -> BTC
    expect(trade.fxs[0]).toStrictEqual({
      type: "FIAT_CRYPTO",
      provider: "CUMBERLAND",
      quoteOrActual: "QUOTE",
      sourceAmount: 12500,
      sourceCurrency: "USD",
      sourceTotal: 12500,
      rate: undefined,
      targetAmount: 0.64365505,
      targetCurrency: "BTC",
      inverseRate: 19420.34,
      targetTotal: 0.64365505,
    } as TradeFx);

    // GBP -> USD
    expect(trade.fxs[1]).toStrictEqual({
      type: "FIAT_FIAT",
      provider: "MONEYCORP",
      quoteOrActual: "QUOTE",
      sourceAmount: 10000,
      sourceCurrency: "GBP",
      sourceTotal: 10000,
      rate: undefined,
      targetAmount: 12500,
      targetCurrency: "USD",
      inverseRate: 0.8,
      targetTotal: 12500,
    } as TradeFx);
  });

  test("Sell BTC -> 10k USD", () => {
    const trade = toCryptoTrade(
      "tradeId",
      fxRateRespMocks["Sell_BTC_->_10k_USD"],
      TradeType.SELL,
      "contactId",
      "partnerId",
      "walletId",
      "accountId"
    );
    expect(trade.tradeStatus).toBe("NEW");
    expect(trade.tradeType).toBe("SELL");

    // BTC -> USD
    expect(trade.sourceWalletId).toBe("walletId");
    expect(trade.sourceCurrency).toBe("BTC");
    expect(trade.sourceAmount).toBe(0.52065154);
    expect(trade.feeInSourceCurrency).toBe(0.01051714);
    expect(trade.rate).toBe(19206.7039);
    expect(trade.sourceTotal).toBe(0.53116868); // Customer to pay

    expect(trade.targetWalletId).toBe("accountId");
    expect(trade.targetCurrency).toBe("USD");
    expect(trade.targetAmount).toBe(10000); // Customer to receive
    expect(trade.feeInTargetCurrency).toBe(202);
    expect(trade.inverseRate).toBe(0.00005206);
    expect(trade.targetTotal).toBe(10202);
    expect(trade.fees).toStrictEqual([
      {
        amount: 50,
        currency: "USD",
        type: "FX",
        pct: 0.005,
      },
      {
        amount: 202,
        currency: "USD",
        type: "TXN",
        pct: 0.0198,
      },
    ] as Fee[]);

    expect(trade.fxs.length).toBe(1);
    // BTC -> USD
    expect(trade.fxs[0]).toStrictEqual({
      type: "CRYPTO_FIAT",
      provider: "CUMBERLAND",
      quoteOrActual: "QUOTE",
      sourceAmount: 0.51804828,
      sourceCurrency: "BTC",
      sourceTotal: 0.51804828,
      rate: 19303.22,
      targetAmount: 10000,
      targetCurrency: "USD",
      inverseRate: undefined,
      targetTotal: 10000,
    } as TradeFx);
  });

  test("Sell BTC -> 10k GBP", () => {
    const trade = toCryptoTrade(
      "tradeId",
      fxRateRespMocks["Sell_BTC_->_10k_GBP"],
      TradeType.SELL,
      "contactId",
      "partnerId",
      "walletId",
      "accountId"
    );
    expect(trade.tradeStatus).toBe("NEW");
    expect(trade.tradeType).toBe("SELL");

    // USD -> BTC general
    expect(trade.sourceWalletId).toBe("walletId");
    expect(trade.sourceCurrency).toBe("BTC");
    expect(trade.sourceAmount).toBe(0.64820692);
    expect(trade.feeInSourceCurrency).toBe(0.01309375);
    expect(trade.rate).toBe(15427.17252);
    expect(trade.sourceTotal).toBe(0.66130067); // Customer to pay

    expect(trade.targetWalletId).toBe("accountId");
    expect(trade.targetCurrency).toBe("GBP");
    expect(trade.targetAmount).toBe(10000); // Customer to receive
    expect(trade.feeInTargetCurrency).toBe(202);
    expect(trade.inverseRate).toBe(0.00006482);
    expect(trade.targetTotal).toBe(10202);
    expect(trade.fees).toStrictEqual([
      {
        amount: 62.5,
        currency: "USD",
        type: "FX",
        pct: 0.005,
      },
      {
        amount: 252.5,
        currency: "USD",
        type: "TXN",
        pct: 0.0198,
      },
    ] as Fee[]);

    expect(trade.fxs.length).toBe(2);

    // BTC -> USD
    expect(trade.fxs[0]).toStrictEqual({
      type: "CRYPTO_FIAT",
      provider: "CUMBERLAND",
      quoteOrActual: "QUOTE",
      sourceAmount: 0.64496589,
      sourceCurrency: "BTC",
      sourceTotal: 0.64496589,
      rate: 19380.87,
      targetAmount: 12500,
      targetCurrency: "USD",
      inverseRate: undefined,
      targetTotal: 12500,
    } as TradeFx);

    // USD -> GBP
    expect(trade.fxs[1]).toStrictEqual({
      type: "FIAT_FIAT",
      provider: "MONEYCORP",
      quoteOrActual: "QUOTE",
      sourceAmount: 12500,
      sourceCurrency: "USD",
      sourceTotal: 12500,
      rate: 0.8,
      targetAmount: 10000,
      targetCurrency: "GBP",
      inverseRate: undefined,
      targetTotal: 10000,
    } as TradeFx);
  });

  test("Sell 0.5 BTC -> USD", () => {
    const trade = toCryptoTrade(
      "tradeId",
      fxRateRespMocks["Sell_0.5_BTC_->_USD"],
      TradeType.SELL,
      "contactId",
      "partnerId",
      "walletId",
      "accountId"
    );
    expect(trade.tradeStatus).toBe("NEW");
    expect(trade.tradeType).toBe("SELL");

    // BTC -> USD general
    expect(trade.sourceWalletId).toBe("walletId");
    expect(trade.sourceCurrency).toBe("BTC");
    expect(trade.sourceAmount).toBe(0.4901);
    expect(trade.feeInSourceCurrency).toBe(0.0099);
    expect(trade.rate).toBe(19054.956449999998);
    expect(trade.sourceTotal).toBe(0.5); // Customer to pay

    expect(trade.targetWalletId).toBe("accountId");
    expect(trade.targetCurrency).toBe("USD");
    expect(trade.targetAmount).toBe(9338.84); // Customer to receive
    expect(trade.feeInTargetCurrency).toBe(188.64);
    expect(trade.inverseRate).toBe(0.00005248);
    expect(trade.targetTotal).toBe(9527.48);
    expect(trade.fees).toStrictEqual([
      {
        amount: 47.88,
        currency: "USD",
        type: "FX",
        pct: 0.005,
      },
      {
        amount: 188.64,
        currency: "USD",
        type: "TXN",
        pct: 0.0198,
      },
    ] as Fee[]);

    // No fiat to fiat fx since it is USD
    expect(trade.fxs.length).toBe(1);
    // BTC -> USD
    expect(trade.fxs[0]).toStrictEqual({
      type: "CRYPTO_FIAT",
      provider: "CUMBERLAND",
      quoteOrActual: "QUOTE",
      sourceAmount: 0.5,
      sourceCurrency: "BTC",
      sourceTotal: 0.5,
      rate: 19150.71,
      targetAmount: 9575.36,
      targetCurrency: "USD",
      inverseRate: undefined,
      targetTotal: 9575.36,
    } as TradeFx);
  });

  test("Sell 0.5 BTC -> GBP", () => {
    const trade = toCryptoTrade(
      "tradeId",
      fxRateRespMocks["Sell_0.5_BTC_->_GBP"],
      TradeType.SELL,
      "contactId",
      "partnerId",
      "walletId",
      "accountId"
    );
    expect(trade.tradeStatus).toBe("NEW");
    expect(trade.tradeType).toBe("SELL");

    // BTC -> GBP
    expect(trade.sourceWalletId).toBe("walletId");
    expect(trade.sourceCurrency).toBe("BTC");
    expect(trade.sourceAmount).toBe(0.4901);
    expect(trade.feeInSourceCurrency).toBe(0.0099);
    expect(trade.rate).toBe(15244.944239999999);
    expect(trade.sourceTotal).toBe(0.5); // Customer to pay

    expect(trade.targetWalletId).toBe("accountId");
    expect(trade.targetCurrency).toBe("GBP");
    expect(trade.targetAmount).toBe(7471.55); // Customer to receive
    expect(trade.feeInTargetCurrency).toBe(150.92);
    expect(trade.inverseRate).toBe(0.00006559);
    expect(trade.targetTotal).toBe(7622.47);
    expect(trade.fees).toStrictEqual([
      {
        amount: 47.88,
        currency: "USD",
        type: "FX",
        pct: 0.005,
      },
      {
        amount: 188.66,
        currency: "USD",
        type: "TXN",
        pct: 0.0198,
      },
    ] as Fee[]);

    expect(trade.fxs.length).toBe(2);

    // BTC -> USD
    expect(trade.fxs[0]).toStrictEqual({
      type: "CRYPTO_FIAT",
      provider: "CUMBERLAND",
      quoteOrActual: "QUOTE",
      sourceAmount: 0.5,
      sourceCurrency: "BTC",
      sourceTotal: 0.5,
      rate: 19151.94,
      targetAmount: 9575.97,
      targetCurrency: "USD",
      inverseRate: undefined,
      targetTotal: 9575.97,
    } as TradeFx);

    // USD -> GBP
    expect(trade.fxs[1]).toStrictEqual({
      type: "FIAT_FIAT",
      provider: "MONEYCORP",
      quoteOrActual: "QUOTE",
      sourceAmount: 9575.97,
      sourceCurrency: "USD",
      sourceTotal: 9575.97,
      rate: 0.8,
      targetAmount: 7660.78,
      targetCurrency: "GBP",
      inverseRate: undefined,
      targetTotal: 7660.78,
    } as TradeFx);
  });
});
