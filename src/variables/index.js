"use strict";

const { toBoolean } = require("au-helpers").stringHelpers;

const awsRegion = process.env.AWS_REGION;
const loggerName = process.env.LOGGER_NAME;
const env = process.env.APP_ENV || "dev";
const appPort = process.env.APP_PORT;
const logLevel = process.env.LOG_LEVEL;
const serviceDomain = process.env.SERVICE_DOMAIN;
const serviceName = process.env.SERVICE_NAME;
const host = process.env.HOST || "localhost";
const cryptoCurrencies = [
  "BTC",
  "ETH",
  "BCH",
  "LTC",
  "TBTC",
  "TETH",
  "TBCH",
  "TLTC",
  "TERC",
  "TEOS",
  "EOS",
  "USDT",
  "PAXG",
  "TRX",
  "USDT_TRX",
];
const bcCrmAdapter = process.env.BC_CRM_ADAPTER;
const fsAccountService = process.env.FS_ACCOUNTS_SERVICE;
const bcWalletService = process.env.BC_WALLET_SERVICE;
const bcTxService = process.env.BC_TX_SERVICE;
const bcCryptoService = process.env.BC_CRYPTO_SERVICE;
const bcBitgoAdapter = process.env.BC_BITGO_ADAPTER;
const fsFXService = process.env.FS_FX_SERVICE;
const bcTradeServiceWorkerSQS = process.env.BC_TRADE_SERVICE_WORKER_SQS;
const bcFakeBTCAddress = process.env.BC_SIMPLEX_BTC_ADDRESS_FOR_DEV_TST;
const isTestNet = toBoolean(process.env.IS_TEST_NET);
const bcCryptoPaymentsTable = process.env.BC_CRYPTO_PAYMENTS_TABLE;
const bcCryptoPaymentsBalancesTable =
  process.env.BC_CRYPTO_PAYMENTS_BALANCES_TABLE;
const bcCryptoPaymentsConfirmationsTable =
  process.env.BC_CRYPTO_PAYMENTS_CONFIRMATIONS_TABLE;
const bcCryptoPaymentsFXsTable = process.env.BC_CRYPTO_PAYMENTS_FXS_TABLE;

const lsUserSubscriptionTable = process.env.LS_USER_SUBSCRIPTION_TABLE;
const lsMembershipPlanTable = process.env.LS_MEMBERSHIP_PLAN_TABLE;

const limitTradeExpirationInDays = Number(process.env.LIMIT_TRADE_EXPIRATION_IN_DAYS || 15);
const maxLimitRates = Number(process.env.MAX_LIMIT_RATES || 3);

const rds = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  name: process.env.DB_NAME,
  user: process.env.DB_USER,
  pass: process.env.DB_PASS,
};

const testNetTickersCurrencies = {
  TBTC: "BTC",
  TETH: "ETH",
  TBCH: "BCH",
  TLTC: "LTC",
  TBT: "BTC",
  TET: "ETH",
  TBC: "BCH",
  TLT: "LTC",
  TER: "USDC",
  USC: "USDC",
  TUS: "TUSD",
  TRX: "TRX",
  URX: "USDT_TRX",
};

const testNetTickers = {
  TBTC_USD: "BTC_USD",
  TETH_USD: "ETH_USD",
  TBCH_USD: "BCH_USD",
  TLTC_USD: "LTC_USD",
  TERC_USD: "USDC_USD",
  TBT_USD: "BTC_USD",
  TET_USD: "ETH_USD",
  TBC_USD: "BCH_USD",
  TLT_USD: "LTC_USD",
  TER_USD: "USDC_USD",
  TUS_USD: "TUSD_USD",
  USC_USD: "USDC_USD",
};
const eosCurrencies = ["TEOS", "EOS"];
const testERCTokens = ["TERC"];
const ercTokens = ["BAT", "PAX", "USDT", "TUSD", "USDC", "PAXG"];

const bankTransferType = {
  Payment: 827080000,
  Withdrawal: 827080001,
  Deposit: 827080002,
  W2W: 827080003,
  M2M: 827080004
};

const fxType = {
  deposit: 827080000,
  liquidation: 827080001,
  outboundTransfer: 827080002
};

const currencies = {
  USD: "d22db4d5-0238-e811-a8a8-0022480173bb",
  GBP: "1ba587ec-672a-e811-a958-002248018b80",
  EUR: "91882582-494d-e811-a958-0022480187f0",
  BTC: "fa87c004-5b4c-e811-a956-0022480149c2",
  ETH: "010d0517-66cc-e811-a96f-0022480187f0",
  BCH: "3c98f04a-37dc-e811-a89c-00224801a4ba",
  LTC: "3ae688d5-4313-e911-a8bc-00224801a4ba",
  JPY: "973b3846-dee0-e811-a8be-0022480173bb",
  CNY: "e63ad09c-2d74-ea11-a811-00224801cecd",
  BAT: "d97271e6-3be4-e911-a812-00224801b559",
  PAX: "b1fbbdd3-3be4-e911-a812-00224801b559",
  TRX: "593ab491-4ac2-ec11-983e-002248425473",
  USDT_TRX: "4d146cb8-4ac2-ec11-983e-002248425473",
  PAXG: "f76eff5f-74c4-eb11-bacc-0022484068ed",
  USDC: "13b0c1ff-3be4-e911-a812-00224801b559",
  TUSD: "97705432-3ce4-e911-a812-00224801b559",
  TETH: "58ca5ebf-d418-e911-a8bf-00224801a03a",
  TBTC: "0d81b5f0-d418-e911-a8bf-00224801a03a",
  TBCH: "b2d21604-d518-e911-a8bf-00224801a03a",
  TLTC: "5609e88b-37ce-e911-a812-00224801cecd",
  TERC: "e2c27d20-82d8-e911-a812-00224801c242",
  TEOS: "bf434020-9478-ea11-a811-00224801cecd",
  EOS: "1873f0c3-bb7f-ea11-a811-00224801cecd",
  USDT: "4fee43cc-bb7f-ea11-a811-00224801cecd"
};

const fiatCurrencies = [ "EUR", "GBP", "USD", "CNY", "JPY" ];

const transactionType = {
  DEPOSIT: 827080000,
  PAYMENT: 827080001,
  SUBSCRIPTION: 827080002,
  BUY: 827080003,
  SELL: 827080004,
  SUBSCRIPTION_UPGRADE: 827080005,
  SIMPLEX_DEPOSIT: 827080006,
  SIMPLEX_SUBSCRIPTION: 827080007,
  SIMPLEX_BUY: 827080008,
  FEE: 827080009
};

const simplexFiatCurrencies = ["EUR", "USD"];
const simplexCryptoCurrencies = ["BTC", "ETH", "EOS", "USDT"];
const simplexTestCryptoCurrencies = ["TBTC", "TETH", "TEOS"];

const fxSuppliers = {
  moneyCorp: 827080000,
  cumberland: 827080001,
  wellsFargo: 827080002,
  simplex: 827080003,
  kraken: 827080004,
};

const fxStatus = {
  new: 827080000
};
const transactionStatus = {
  pending: 827080000,
  confirmed: 827080001
};

const gsbBtcWalletId = process.env.GSB_WALLET_ID_BTC;
const gsbEthWalletId = process.env.GSB_WALLET_ID_ETH;

const getGsbWalletId = (coin) => {
  if (coin === "BTC" || coin === "TBTC") {
    return gsbBtcWalletId;
  } else if (coin === "ETH" || coin === "TETH") {
    return gsbEthWalletId;
  }
  throw { status: 400, message: `${coin} not recognised for GSB`};
};

const gsb = {
  contactId: process.env.GSB_CONTACT_ID,
  partnerId: process.env.GSB_PARTNER_ID,
  partnerIdUS: process.env.GSB_PARTNER_ID_US,
  coins: isTestNet ? ["TBTC", "TETH"] : ["BTC", "ETH"],
  getGsbWalletId,
};

const variables = {
  awsRegion,
  appPort,
  env,
  loggerName,
  logLevel,
  serviceDomain,
  serviceName,
  host,
  cryptoCurrencies,
  bcCrmAdapter,
  bcCryptoService,
  bcBitgoAdapter,
  fsAccountService,
  bcWalletService,
  bcTxService,
  fsFXService,
  testNetTickersCurrencies,
  isTestNet,
  testNetTickers,
  bankTransferType,
  fxType,
  currencies,
  fxSuppliers,
  transactionType,
  fxStatus,
  transactionStatus,
  bcTradeServiceWorkerSQS,
  bcFakeBTCAddress,
  simplexFiatCurrencies,
  simplexCryptoCurrencies,
  simplexTestCryptoCurrencies,
  bcCryptoPaymentsTable,
  bcCryptoPaymentsBalancesTable,
  bcCryptoPaymentsConfirmationsTable,
  bcCryptoPaymentsFXsTable,
  ercTokens: isTestNet ? testERCTokens : ercTokens,
  eth: isTestNet ? "TETH" : "ETH",
  eosCurrencies,
  fiatCurrencies,
  rds,
  gsb,
  lsUserSubscriptionTable,
  lsMembershipPlanTable,
  limitTradeExpirationInDays,
  maxLimitRates,
};

module.exports = variables;
