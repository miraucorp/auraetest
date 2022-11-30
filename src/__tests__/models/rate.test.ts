import { TradeType } from "@aucorp/bc-trade-service-model";
import * as feeStore from "../../models/store/fee";
import * as rateModel from "../../models/rate";
import { AppCtx } from "../../types/types";

jest.mock("../../models/store/fee");

const getFeesMock = feeStore.getFees as jest.Mock;

const appCtxMock = {} as AppCtx;
const contactIdMock = "contactId";

describe("getLimitRate SELL", () => {
  beforeEach(() => {
    getFeesMock.mockResolvedValue([
      { code: "ALF", type: "PCT", amount: 0.02 },
      { code: "FX", type: "PCT", amount: 0.02 },
    ]);
  });

  const expectedRes = {
    // user pays
    sourceTotal: 1,
    sourceCurrency: "TBTC",
    // user receives
    targetAmount: 941.192,
    targetCurrency: "USD",

    // rates
    userLimitRate: 960.4,
    rawLimitRate: 1000,

    // other
    sourceAmount: 0.98,
    feeInSourceCurrency: 0.02,
    targetTotal: 960.4,
    feeInTargetCurrency: 19.208,
  };

  test("[1 TBTC] -> 941.192 USD", async () => {
    const params = {
      action: TradeType.SELL,
      amount: "1",
      currency: "TBTC",
      limitRate: "960.4",
      ticker: "TBTC_USD",
    };
    const res = await rateModel.getLimitRate(appCtxMock, contactIdMock, params);
    expectRes(res, expectedRes);
  });

  test("1 TBTC -> [941.192 USD]", async () => {
    const params = {
      action: TradeType.SELL,
      amount: "941.192",
      currency: "USD",
      limitRate: "960.4",
      ticker: "TBTC_USD",
    };
    const res = await rateModel.getLimitRate(appCtxMock, contactIdMock, params);
    expectRes(res, expectedRes);
  });
});

describe("getLimitRate BUY", () => {
  beforeEach(() => {
    getFeesMock.mockResolvedValue([
      { code: "ALF", type: "PCT", amount: 0.02 },
      { code: "FX", type: "PCT", amount: 0.02 },
    ]);
  });

  const expectedRes = {
    // user pays
    sourceTotal: 1000,
    sourceCurrency: "USD",
    // user receives
    targetAmount: 0.98,
    targetCurrency: "TBTC",

    // rates
    userLimitRate: 1000,
    rawLimitRate: 960.4,

    // other
    sourceAmount: 980,
    feeInSourceCurrency: 20,
    targetTotal: 1,
    feeInTargetCurrency: 0.02,
  };

  test("[1000 USD] -> 0.98 TBTC", async () => {
    const params = {
      action: TradeType.BUY,
      amount: "1000",
      currency: "USD",
      limitRate: "1000",
      ticker: "TBTC_USD",
    };
    const res = await rateModel.getLimitRate(appCtxMock, contactIdMock, params);
    expectRes(res, expectedRes);
  });

  test("1000 USD -> [0.98 TBTC]", async () => {
    const params = {
      action: TradeType.BUY,
      amount: "0.98",
      currency: "TBTC",
      limitRate: "1000",
      ticker: "TBTC_USD",
    };
    const res = await rateModel.getLimitRate(appCtxMock, contactIdMock, params);
    expectRes(res, expectedRes);
  });
});

describe("getValidLimitRateRange", () => {
  test("buy market=20,000", () => {
    const res = rateModel.getValidLimitRateRange(TradeType.BUY, { paymentFiatRate: 20000 } as any);
    expect(Number(res.nearPrice)).toBeCloseTo(19_980);
    expect(Number(res.farPrice)).toBeCloseTo(17_000);
  });

  test("sell market=20,000", () => {
    const res = rateModel.getValidLimitRateRange(TradeType.SELL, { paymentFiatRate: 20000 } as any);
    expect(Number(res.nearPrice)).toBeCloseTo(20_020);
    expect(Number(res.farPrice)).toBeCloseTo(23_000);
  });
});

function expectRes(res: any, expected: any) {
  // rates
  expect(res.userLimitRate.toNumber()).toBeCloseTo(expected.userLimitRate);
  expect(res.rawLimitRate.toNumber()).toBeCloseTo(expected.rawLimitRate);

  // source
  expect(res.sourceAmount.toNumber()).toBeCloseTo(expected.sourceAmount);
  expect(res.sourceTotal.toNumber()).toBeCloseTo(expected.sourceTotal);
  expect(res.feeInSourceCurrency.toNumber()).toBeCloseTo(expected.feeInSourceCurrency);
  expect(res.sourceCurrency).toBe(expected.sourceCurrency);

  // target
  expect(res.targetAmount.toNumber()).toBeCloseTo(expected.targetAmount);
  expect(res.targetTotal.toNumber()).toBeCloseTo(expected.targetTotal);
  expect(res.feeInTargetCurrency.toNumber()).toBeCloseTo(expected.feeInTargetCurrency);
  expect(res.targetCurrency).toBe(expected.targetCurrency);
}
