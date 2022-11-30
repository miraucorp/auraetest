import { AppCtx, RateResp } from "../../types/types";
import { fsFXService } from "../../variables";

// TODO replace this altogether, this endpoint does calls to CRM, has rounding errors and the code is a bit cryptic
export const getMarketTradeRate = async (
  appCtx: AppCtx,
  contactId: string,
  ticker: string,
  currency: string,
  amount: number,
  action: string
): Promise<RateResp> => {
  const config = {
    headers: { contactId },
  };
  const data = {
    ticker,
    currency,
    amount: Number(amount),
    action,
  };
  const result = await appCtx.API.post(`${fsFXService}/internal/crypto/trade/rate`, data, config);
  return result.data.data;
};
