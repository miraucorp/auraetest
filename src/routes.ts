import { Middleware } from "koa";
import * as Router from "koa-router";
import * as healthController from "./controllers/health";
import * as tradeController from "./controllers/trade";
import * as depositController from "./controllers/deposit";
import * as mw from "./middleware/middleware";

const router = new Router();

router.get("/health", healthController.health as Middleware);

// Deposit
router.post("/deposit", depositController.createDeposit);
router.get("/deposit/:id", depositController.getDeposit);
router.get("/deposit/account/:accountId", depositController.getAllDeposits);
router.put("/deposit/cancel/:id", depositController.cancelDeposit);
// Partner deposit endpoints
router.get("/partner/available-currencies", depositController.getPartnerCurrencies);
router.get("/partner/deposit-quote", depositController.getPartnerDepositQuote);
router.post("/partner/deposit", depositController.createPartnerDeposit);
router.get("/partner/deposit/:id", depositController.getPartnerDeposit);
router.put("/partner/deposit/:id/cancel", depositController.cancelPartnerDeposit);

// Trade (buy/sell)
router.post("/v2/gsb/buy", mw.disabled, tradeController.createBuyTradePayableToGsb);
router.post("/v2/trade", tradeController.createTradeMarket as Middleware);
router.post("/v2/rate/tradelimit", mw.checkContact, tradeController.getLimitRateRange as Middleware);
router.post("/v2/draft/tradelimit", mw.checkContact, tradeController.getDraftTradeLimit as Middleware);
router.post("/v2/tradelimit", mw.checkContact, tradeController.createTradeLimit);
router.delete("/v2/tradelimit/:tradeId", mw.checkContact, tradeController.cancelTradeLimit);
router.get("/v2/trades", tradeController.getTrades as Middleware);
router.post("/v2/internal/retry-trade", tradeController.retryTrade as Middleware);
router.patch("/v2/internal/trade", tradeController.updateTradeStatus as Middleware);

// callback on updated orders from kraken (for limit trades)
router.post("/v2/callback/krakenorder", tradeController.callbackKrakenOrder as Middleware);

// Internal endpoints
router.post("/internal/deposit/liquidate", depositController.liquidateCrypto);

module.exports = router;
