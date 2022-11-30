import { isTestNet } from "../variables";

const coins = {
  BTC: {
    decimals: 8,
    type: "CRYPTO",
  },
  ETH: {
    decimals: 18,
    type: "CRYPTO",
  },
  BCH: {
    decimals: 8,
    type: "CRYPTO",
  },
  LTC: {
    decimals: 8,
    type: "CRYPTO",
  },
  TRX: {
    decimals: 6,
    type: "CRYPTO",
  },
  USD: {
    decimals: 2,
    type: "FIAT",
  },
} as Record<string, { decimals: number; type: "CRYPTO" | "FIAT" }>;

const testnetCoins = {
  TBTC: {
    decimals: 8,
    type: "CRYPTO",
  },
  TETH: {
    decimals: 18,
    type: "CRYPTO",
  },
  TBCH: {
    decimals: 8,
    type: "CRYPTO",
  },
  TLTC: {
    decimals: 8,
    type: "CRYPTO",
  },
  TRX: {
    decimals: 6,
    type: "CRYPTO",
  },
  USD: {
    decimals: 2,
    type: "FIAT",
  },
} as Record<string, { decimals: number; type: "CRYPTO" | "FIAT" }>;

export const getDecimals = (coin: string): number => {
  return getCoin(coin).decimals;
};

export const getType = (coin: string): "CRYPTO" | "FIAT" => {
  return getCoin(coin).type;
};

function getCoin(coin: string) {
  const cs = isTestNet ? testnetCoins : coins;
  const c = cs[coin];
  if (!c) {
    throw new Error(`Unknown coin: ${coin}`);
  }
  return c;
}
