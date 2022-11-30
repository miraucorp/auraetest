LOGGER_NAME=tst-bc-trade-service
LOG_LEVEL=info
APP_PORT=8081
SERVICE_DOMAIN=bc
SERVICE_NAME=bc-trade-service


BC_CRM_ADAPTER=ssm:///tst-bc/bc-crm-adapter/URL
BC_CRYPTO_SERVICE=ssm:///tst-bc/bc-crypto-service/URL
BC_WALLET_SERVICE=ssm:///tst-bc/bc-wallet-service/URL
BC_BITGO_ADAPTER=ssm:///tst-bc/bc-bitgo-adapter/URL
BC_TX_SERVICE=ssm:///tst-bc/bc-tx-service/URL
FS_ACCOUNTS_SERVICE=ssm:///tst-bc/vpc-endpoint/fs-account-service/URL
FS_FX_SERVICE=ssm:///tst-bc/vpc-endpoint/fs-fx-service/URL
# Fee
LS_USER_SUBSCRIPTION_TABLE=ssm:///tst-bc/platform/USER_SUBSCRIPTIONS_TABLE
LS_MEMBERSHIP_PLAN_TABLE=ssm:///tst-bc/platform/MEMBERSHIP_PLAN_TABLE

# SQS
BC_TRADE_SERVICE_WORKER_SQS=ssm:///tst-bc/bc-trade-service-worker/WORKER_SQS

# Testnet Workaround
IS_TEST_NET = true
BC_SIMPLEX_BTC_ADDRESS_FOR_DEV_TST=18TFdeDeQcctL1eMXD2JzNzv9McfkyHdBy

# DDB
BC_CRYPTO_PAYMENTS_TABLE=ssm:///tst-bc/bc-trade-service/DDB_CRYPTO_PAYMENTS_TABLE
BC_CRYPTO_PAYMENTS_BALANCES_TABLE=ssm:///tst-bc/bc-trade-service/DDB_CRYPTO_PAYMENTS_BALANCES_TABLE
BC_CRYPTO_PAYMENTS_CONFIRMATIONS_TABLE=ssm:///tst-bc/bc-trade-service/DDB_CRYPTO_PAYMENTS_CONFIRMATIONS_TABLE
BC_CRYPTO_PAYMENTS_FXS_TABLE=ssm:///tst-bc/bc-trade-service/DDB_CRYPTO_PAYMENTS_FXS_TABLE

# RDS
DB_HOST=ssm:///tst-bc/bc-trade-service-worker/DB_HOST
DB_PORT=3306
DB_NAME=ssm:///tst-bc/bc-trade-service-worker/DB_NAME
DB_USER=ssm:///tst-bc/bc-trade-service/DB_USER
DB_PASS=ssm:///tst-bc/bc-trade-service/DB_PASSWORD

# Variables used to buy crypto and send directly to GSB wallet instead of to the member's wallet
GSB_WALLET_ID_BTC=b4d756d3-42c8-eb11-bacc-000d3ad69b46
GSB_WALLET_ID_ETH=18151a97-43c8-eb11-bacc-000d3ad69433
GSB_CONTACT_ID=04619073-192f-4e5e-9b83-ef772ab9b459
GSB_PARTNER_ID=1f97a55b-1941-eb11-a813-0022484099a7
GSB_PARTNER_ID_US=aee4a61e-6a00-4ac6-a36d-40de205b005a

LIMIT_TRADE_EXPIRATION_IN_DAYS=1
