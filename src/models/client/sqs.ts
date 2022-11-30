import { TradeStatus } from "@aucorp/bc-trade-service-model";
import * as crypto from "crypto";
import { AppCtx } from "../../types/types";
import { sqsBcTradeServiceWorkerClient } from "../../awsClient";

/**
 * Sends `FULFILL_TRADE` to worker
 * @param appCtx
 * @param tradeId The trade id
 */
export const sendMessageFulfillTrade = async (appCtx: AppCtx, tradeId: string, isRetry = false): Promise<void> => {
  return sqsBcTradeServiceWorkerClient.sendMessage(
    appCtx,
    "FULFILL_TRADE",
    // we should be fine just placing the tradeId here
    "bc-trade-service",
    JSON.stringify({ tradeId, isRetry })
  );
};

/**
 * Sends `UPDATE_TRADE_STATUS` to worker
 * @param appCtx
 * @param tradeId The trade id
 */
export const sendMessageUpdateTradeStatus = async (
  appCtx: AppCtx,
  tradeId: string,
  tradeStatus: TradeStatus
): Promise<void> => {
  return sqsBcTradeServiceWorkerClient.sendMessage(
    appCtx,
    "UPDATE_TRADE_STATUS",
    "bc-trade-service",
    JSON.stringify({ tradeId, tradeStatus })
  );
};

/**
 * Sends `LIMIT_TRADE_PROCESS_NEW` to worker
 * @param appCtx
 * @param tradeId The trade id
 */
export const sendMessageFulfillLimitTrade = async (appCtx: AppCtx, tradeId: string, isRetry = false): Promise<void> => {
  return sqsBcTradeServiceWorkerClient.sendMessage(
    appCtx,
    "LIMIT_TRADE_PROCESS_NEW",
    tradeId,
    JSON.stringify({ tradeId, isRetry })
  );
};

/**
 * Sends `LIMIT_TRADE_CANCEL` to worker
 * @param appCtx
 * @param tradeId The trade id
 */
export const sendMessageCancelLimitTrade = async (
  appCtx: AppCtx,
  contactId: string,
  partnerId: string,
  tradeId: string
): Promise<void> => {
  return sqsBcTradeServiceWorkerClient.sendMessage(
    appCtx,
    "LIMIT_TRADE_CANCEL",
    tradeId,
    JSON.stringify({ tradeId, contactId, partnerId })
  );
};

/**
 * Sends the `KRAKEN_ORDER_UPDATE` message to worker for updating the order when changed
 * @param appCtx
 * @param orders
 * @returns
 */
export const sendMessageCallbackKrakenOrder = async (appCtx: AppCtx, order: any): Promise<void> => {
  const deduplicationStr = `${order.orderId}#${order.userRef}#${order.status}#${order.volumeExecuted}`;
  const deduplicationId = crypto.createHash("md5").update(deduplicationStr).digest("hex");
  return sqsBcTradeServiceWorkerClient.sendMessage(
    appCtx,
    "KRAKEN_ORDER_UPDATE",
    order.orderId || "bc-trade-service",
    JSON.stringify({ order }),
    deduplicationId
  );
};
