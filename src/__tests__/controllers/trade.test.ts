import * as request from "supertest";
import { TradeStatus } from "@aucorp/bc-trade-service-model";
import * as server from "../../index";
import * as walletClient from "../../models/client/wallet";
import * as accountClient from "../../models/client/account";
import * as rateClient from "../../models/client/rate";
import * as sqsClient from "../../models/client/sqs";
import * as tradeStore from "../../models/store/trade";
import * as tradeMapper from "../../models/mappers/trade";
import { getAccountResponse, getRateResponse, getWalletResponse } from "../mocks/tradeMocks";

jest.mock("../../models/client/wallet");
jest.mock("../../models/client/account");
jest.mock("../../models/client/rate");
jest.mock("../../models/client/sqs");
jest.mock("../../models/store/trade");
jest.mock("../../models/mappers/trade");

const getWalletMock = walletClient.getWallet as jest.Mock;
const getAccountMock = accountClient.getAccount as jest.Mock;
const getTradeRateMock = rateClient.getMarketTradeRate as jest.Mock;
const toCryptoTradeMock = tradeMapper.toCryptoTrade as jest.Mock;
const getTradeFromDBMock = tradeStore.getTrade as jest.Mock;
const createTradeInRDS = tradeStore.insertTrade as jest.Mock;

const contactId = "76382641-8531-4a0e-bf48-794667da439f";
const partnerId = "6aecd383-ccd1-4e40-afcd-0d630b94bb60";

afterAll((done) => {
  server.close(() => {
    done();
  });
});

describe("Test POST /v2/trade", () => {
  beforeEach(() => {
    getWalletMock.mockResolvedValue(Promise.resolve(getWalletResponse));
    getAccountMock.mockResolvedValue(Promise.resolve(getAccountResponse));
    getTradeRateMock.mockResolvedValue(Promise.resolve(getRateResponse));
    createTradeInRDS.mockResolvedValue(Promise.resolve({ tradeId: "trade-id" }));
    toCryptoTradeMock.mockImplementation(jest.requireActual("../../models/mappers/trade").toCryptoTrade);
  });

  test("create in DB and send fulfill message", async () => {
    const response = await request(server)
      .post("/v2/trade")
      .send({
        walletId: "08bcbba0-aa67-ea11-a811-00224801c499",
        accountId: "67474f6d-0595-ea11-a812-00224801c499",
        action: "BUY",
        amount: "10",
        selectedCurrency: "EUR",
      })
      .set("contactid", contactId)
      .set("partnerid", partnerId);
    expect(response.status).toBe(200);

    expect(tradeMapper.toCryptoTrade).toHaveBeenCalledTimes(1);

    expect(tradeMapper.toCryptoTrade).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Object),
      "BUY",
      contactId,
      partnerId,
      "08bcbba0-aa67-ea11-a811-00224801c499",
      "67474f6d-0595-ea11-a812-00224801c499"
    );
    expect(tradeStore.insertTrade).toHaveBeenCalledTimes(1);
    expect(sqsClient.sendMessageFulfillTrade).toHaveBeenCalledTimes(1);
  });

  test("not enough balance", async () => {
    getAccountMock.mockResolvedValue(
      Promise.resolve({
        ...getAccountResponse,
        ...{
          financialAccount: { currentBalance: 9 },
        },
      })
    );

    const response = await request(server)
      .post("/v2/trade")
      .send({
        walletId: "08bcbba0-aa67-ea11-a811-00224801c499",
        accountId: "67474f6d-0595-ea11-a812-00224801c499",
        action: "BUY",
        amount: "10",
        selectedCurrency: "EUR",
      })
      .set("contactid", contactId)
      .set("partnerid", partnerId);
    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Not enough balance: 9 EUR");
  });
});

describe("POST /v2/internal/retry-trade", () => {
  const tradeId = "08bcbba0-aa67-ea11-a811-00224801c499";
  beforeEach(() => {
    getWalletMock.mockResolvedValue(Promise.resolve(getWalletResponse));
    getAccountMock.mockResolvedValue(Promise.resolve(getAccountResponse));
    getTradeRateMock.mockResolvedValue(Promise.resolve(getRateResponse));
    toCryptoTradeMock.mockImplementation(jest.requireActual("../../models/mappers/trade").toCryptoTrade);
  });

  test("should retry when new", async () => {
    getTradeFromDBMock.mockResolvedValue(Promise.resolve({ tradeStatus: TradeStatus.NEW, contactId, partnerId }));
    const response = await request(server).post("/v2/internal/retry-trade").send({
      contactId,
      partnerId,
      tradeId,
    });
    expect(response.status).toBe(200);
  });

  test("should not retry when not found", async () => {
    getTradeFromDBMock.mockResolvedValue(Promise.resolve(null));
    const response = await request(server).post("/v2/internal/retry-trade").send({
      contactId,
      partnerId,
      tradeId,
    });
    expect(response.status).toBe(404);
    expect(response.body.data.title).toBe("Trade 08bcbba0-aa67-ea11-a811-00224801c499 not found");
  });

  test("should not retry when CREDITED", async () => {
    getTradeFromDBMock.mockResolvedValue(Promise.resolve({ tradeStatus: TradeStatus.CREDITED, contactId, partnerId }));
    const response = await request(server).post("/v2/internal/retry-trade").send({
      contactId,
      partnerId,
      tradeId,
    });
    expect(response.status).toEqual(403);
    expect(response.body.data.title).toBe(
      "Trade 08bcbba0-aa67-ea11-a811-00224801c499 already finalized, status CREDITED"
    );
  });
});
