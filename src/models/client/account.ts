import { AppCtx, FiatAccount } from "../../types/types";
import { fsAccountService } from "../../variables";

export const getAccount = async (appCtx: AppCtx, accountId: string, contactId: string): Promise<FiatAccount> => {
  const config = {
    headers: { contactId },
  };
  const result = await appCtx.API.get(`${fsAccountService}/details/${accountId}`, config);
  return result.data.data;
};

export const listActiveAccounts = async (appCtx: AppCtx, contactId: string): Promise<any[]> => {
  return appCtx.API.get(`${fsAccountService}/list/${contactId}`, {
    headers: { "Content-Type": "application/json" },
  })
    .then((result) => result.data.data.filter((acc: FiatAccount) => acc.accountType === "eWallet"))
    .catch((e) => {
      if (e.response.status === 404) {
        return [];
      }
      throw e;
    });
};
