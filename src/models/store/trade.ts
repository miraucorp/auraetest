import * as moment from "moment";
import { tracing } from "au-helpers";
import { OrderType, Trade, TradeEntity, TradeFx, TradeStatus } from "@aucorp/bc-trade-service-model";
import { AppCtx } from "../../types/types";
import { newErrWithCode } from "../../utils";
import { maxLimitRates } from "../../variables";

const { TracedService } = tracing;

/**
 * Creates the trade into the DB
 * @param appCtx
 * @param trade The trade
 */
export const insertTrade = async (appCtx: AppCtx, trade: Trade): Promise<Trade> => {
  return appCtx.traced(TracedService.RDS, `Trade::insertTradeAndFx`, async () => {
    return TradeEntity.transaction((trx) =>
      TradeEntity.query(trx).insertGraph({
        ...trade,
        fees: JSON.stringify(trade.fees) as any,
      })
    );
  });
};

/**
 * Gets the trade from DB
 * @param appCtx
 * @param tradeId The trade id
 */
export const getTrade = async (appCtx: AppCtx, tradeId: string): Promise<Trade> => {
  return appCtx.traced(TracedService.RDS, `Trade::findById`, async () => TradeEntity.query().findById(tradeId));
};

/**
 * Inserts only a limit trade per source currency
 * This is to avoid running out of liquidity
 * @param appCtx
 * @param trade The trade
 */
export const insertLimitTrade = async (appCtx: AppCtx, trade: Trade): Promise<Trade> => {
  return appCtx.traced(TracedService.RDS, `Trade::insertLimitTrade`, async () => {
    return TradeEntity.transaction(async (trx) => {
      const limitTradesForCurrency = await TradeEntity.query()
        .where("contact_id", "=", trade.contactId)
        .andWhere("order_type", "=", OrderType.LIMIT)
        .andWhere("trade_status", "=", TradeStatus.ORDER_OPENED)
        .andWhere("source_currency", "=", trade.sourceCurrency)
        .count("id");
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if (limitTradesForCurrency?.[0]?.["count(`id`)"] > maxLimitRates) {
        throw newErrWithCode(`only ${maxLimitRates} open limit trade allowed`, 400);
      }
      await TradeEntity.query(trx).insertGraph({
        ...toDates(trade),
        fees: JSON.stringify(trade.fees) as any,
        fxs: trade.fxs.map(toDates),
      });
      return TradeEntity.query(trx).withGraphFetched("fxs").findById(trade.tradeId);
    });
  });
};

function toDates<T extends Trade | TradeFx>(o: T): T {
  const res: any = o;
  if (o.createdAt) {
    res.createdAt = toDate(o.createdAt);
  }
  if (o.updatedAt) {
    res.updatedAt = toDate(o.updatedAt);
  }
  if (o.expiresAt) {
    res.expiresAt = toDate(o.expiresAt);
  }
  return res;
}

function toDate(d: string) {
  return d.slice(0, 23).replace("T", " ");
}

/**
 * Gets the open limit trades from contact
 */
export const getOpenLimitTrades = async (appCtx: AppCtx, contactId: string, walletId: string): Promise<Trade[]> => {
  return appCtx.traced(TracedService.RDS, `Trade::getOpenLimitTrades`, async () =>
    TradeEntity.query()
      .whereNotIn("trade_status", [TradeStatus.COMPLETED, TradeStatus.FAILED])
      .andWhere("contact_id", "=", contactId)
      .modify((qb) => {
        if (walletId) {
          qb.where((b) => b.where("sourceWalletId", walletId).orWhere("targetWalletId", walletId));
        }
      })
      .andWhere("order_type", "=", OrderType.LIMIT)
      .orderBy("id", "desc")
  );
};

/**
 * Gets the closed limit trades from contact
 */
export const getCloseLimitTrades = async (appCtx: AppCtx, contactId: string, walletId: string): Promise<Trade[]> => {
  return appCtx.traced(TracedService.RDS, `Trade::getOpenLimitTrades`, async () =>
    TradeEntity.query()
      .whereIn("trade_status", [TradeStatus.COMPLETED, TradeStatus.FAILED])
      .andWhere("contact_id", "=", contactId)
      .modify((qb) => {
        if (walletId) {
          qb.where((b) => b.where("sourceWalletId", walletId).orWhere("targetWalletId", walletId));
        }
      })
      .andWhere("order_type", "=", OrderType.LIMIT)
      .orderBy("id", "desc")
  );
};

/**
 * Gets the trades from DB
 */
export const getTradesForContact = async (
  appCtx: AppCtx,
  contactId: string,
  startDate: string,
  endDate: string,
  walletId?: string
): Promise<Trade[]> => {
  const inclusiveEndDate = moment(endDate).add(1, "day").format("YYYY-MM-DD");
  return appCtx.traced(TracedService.RDS, `Trade::findByContactId`, async () =>
    TradeEntity.query()
      .select()
      .where("contactId", contactId)
      .modify((qb) => {
        qb.where((b) => b.whereNull("order_type").orWhere("order_type", "=", OrderType.MARKET));
      })
      .andWhere("createdAt", ">=", startDate)
      .modify((qb) => {
        if (walletId) {
          qb.where((b) => b.where("sourceWalletId", walletId).orWhere("targetWalletId", walletId));
        }
      })
      .whereBetween("createdAt", [startDate, inclusiveEndDate])
      .orderBy("createdAt", "desc")
  );
};
