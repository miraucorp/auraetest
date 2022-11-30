import { Trade } from "@aucorp/bc-trade-service-model";
import { AppCtx, CryptoWallet } from "../../types/types";
import { bcWalletService, bcCryptoService } from "../../variables";

/**
 * Gets the wallet
 */
export const getWallet = async (
  appCtx: AppCtx,
  walletId: string,
  contactId: string,
  partnerId: string
): Promise<CryptoWallet> => {
  const config = {
    headers: { contactId, partnerId },
  };
  const result = await appCtx.API.get(`${bcWalletService}/wallets/${walletId}`, config);
  return result.data.data;
};

export const getAvailableDepositCryptoCurrencies = async (appCtx: AppCtx, partnerId: string): Promise<any> => {
  return appCtx.API.get(`${bcCryptoService}/available-currencies/DEPOSIT`, {
    headers: {
      "Content-Type": "application/json",
      partnerid: partnerId,
    },
  }).then((response) => response.data.data);
};

export const validateAmount = async (appCtx: AppCtx, trade: Trade): Promise<void> => {
  const data = {
    amount: trade.tradeType === "BUY" ? trade.targetAmount : trade.sourceTotal,
    currency: trade.tradeType === "BUY" ? trade.targetCurrency : trade.sourceCurrency,
    ticker: trade.tradeType === "BUY" ? `${trade.targetCurrency}_USD` : `${trade.sourceCurrency}_USD`,
  };

  await appCtx.API.post(`${bcCryptoService}/validatetrade`, data);
};
