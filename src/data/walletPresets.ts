import { ImageSourcePropType } from "react-native";
import { Tone } from "../types/wallet";

export type WalletPresetGroup = "E-wallet" | "Bank" | "Digital Bank" | "Cash";

export type WalletPreset = {
  key: string;
  name: string;
  type: "E-wallet" | "Bank" | "Cash" | "Savings";
  mark: string;
  recommendedTone: Tone;
  account: string;
  group: WalletPresetGroup;
};

export const walletLogoAssets: Record<string, ImageSourcePropType> = {
  gcash: require("../../assets/logos/gcash.webp"),
  maya: require("../../assets/logos/maya.webp"),
  shopeepay: require("../../assets/logos/shopeepay.webp"),
  grabpay: require("../../assets/logos/grabpay.webp"),
  coinsph: require("../../assets/logos/coinsph.webp"),
  paypal: require("../../assets/logos/paypal.webp"),
  wise: require("../../assets/logos/wise.webp"),
  bpi: require("../../assets/logos/bpi.webp"),
  bdo: require("../../assets/logos/bdo.webp"),
  unionbank: require("../../assets/logos/unionbank.webp"),
  metrobank: require("../../assets/logos/metrobank.webp"),
  rcbc: require("../../assets/logos/rcbc.webp"),
  landbank: require("../../assets/logos/landbank.webp"),
  securitybank: require("../../assets/logos/securitybank.webp"),
  chinabank: require("../../assets/logos/chinabank.webp"),
  pnb: require("../../assets/logos/pnb.webp"),
  eastwest: require("../../assets/logos/eastwest.webp"),
  psbank: require("../../assets/logos/psbank.webp"),
  gotyme: require("../../assets/logos/gotyme.webp"),
  maribank: require("../../assets/logos/maribank.webp"),
  cimb: require("../../assets/logos/cimb.webp"),
  tonik: require("../../assets/logos/tonik.webp"),
  unobank: require("../../assets/logos/unobank.webp"),
  ownbank: require("../../assets/logos/ownbank.webp"),
};

export const walletPrintmarkAssets: Record<string, ImageSourcePropType> = {
  gcash: require("../../assets/printmarks/gcash.webp"),
  maya: require("../../assets/printmarks/maya.webp"),
  shopeepay: require("../../assets/printmarks/shopeepay.webp"),
  grabpay: require("../../assets/printmarks/grabpay.webp"),
  coinsph: require("../../assets/printmarks/coinsph.webp"),
  paypal: require("../../assets/printmarks/paypal.webp"),
  wise: require("../../assets/printmarks/wise.webp"),
  bpi: require("../../assets/printmarks/bpi.webp"),
  bdo: require("../../assets/printmarks/bdo.webp"),
  unionbank: require("../../assets/printmarks/unionbank.webp"),
  metrobank: require("../../assets/printmarks/metrobank.webp"),
  rcbc: require("../../assets/printmarks/rcbc.webp"),
  landbank: require("../../assets/printmarks/landbank.webp"),
  securitybank: require("../../assets/printmarks/securitybank.webp"),
  chinabank: require("../../assets/printmarks/chinabank.webp"),
  pnb: require("../../assets/printmarks/pnb.webp"),
  eastwest: require("../../assets/printmarks/eastwest.webp"),
  psbank: require("../../assets/printmarks/psbank.webp"),
  gotyme: require("../../assets/printmarks/gotyme.webp"),
  maribank: require("../../assets/printmarks/maribank.webp"),
  cimb: require("../../assets/printmarks/cimb.webp"),
  tonik: require("../../assets/printmarks/tonik.webp"),
  unobank: require("../../assets/printmarks/unobank.webp"),
  ownbank: require("../../assets/printmarks/ownbank.webp"),
};

export const walletPresets: WalletPreset[] = [
  // E-Wallets
  { key: "gcash", name: "GCash", type: "E-wallet", mark: "G", recommendedTone: "blue", account: "Personal", group: "E-wallet" },
  { key: "maya", name: "Maya", type: "E-wallet", mark: "M", recommendedTone: "lime", account: "Savings", group: "E-wallet" },
  { key: "shopeepay", name: "ShopeePay", type: "E-wallet", mark: "SP", recommendedTone: "coral", account: "Shopping", group: "E-wallet" },
  { key: "grabpay", name: "GrabPay", type: "E-wallet", mark: "GP", recommendedTone: "mint", account: "Wallet", group: "E-wallet" },
  { key: "coinsph", name: "Coins.ph", type: "E-wallet", mark: "CO", recommendedTone: "ocean", account: "Crypto & PHP", group: "E-wallet" },
  { key: "paypal", name: "PayPal", type: "E-wallet", mark: "PP", recommendedTone: "navy", account: "Global", group: "E-wallet" },
  { key: "wise", name: "Wise", type: "E-wallet", mark: "W", recommendedTone: "lime", account: "Multi-currency", group: "E-wallet" },

  // Digital Banks
  { key: "gotyme", name: "GoTyme", type: "Bank", mark: "GT", recommendedTone: "lilac", account: "Emergency fund", group: "Digital Bank" },
  { key: "maribank", name: "MariBank", type: "Bank", mark: "MB", recommendedTone: "sunset", account: "Daily interest", group: "Digital Bank" },
  { key: "cimb", name: "CIMB Bank", type: "Bank", mark: "CB", recommendedTone: "coral", account: "GSave", group: "Digital Bank" },
  { key: "tonik", name: "Tonik", type: "Savings", mark: "TK", recommendedTone: "plum", account: "Stash", group: "Digital Bank" },
  { key: "unobank", name: "UNO Bank", type: "Bank", mark: "UN", recommendedTone: "plum", account: "Savings", group: "Digital Bank" },
  { key: "ownbank", name: "OwnBank", type: "Savings", mark: "OB", recommendedTone: "yellow", account: "Time deposit", group: "Digital Bank" },

  // Traditional Banks
  { key: "bpi", name: "BPI", type: "Bank", mark: "BPI", recommendedTone: "coral", account: "Primary bank", group: "Bank" },
  { key: "bdo", name: "BDO", type: "Bank", mark: "BDO", recommendedTone: "navy", account: "Savings", group: "Bank" },
  { key: "unionbank", name: "UnionBank", type: "Bank", mark: "UB", recommendedTone: "sunset", account: "Payroll", group: "Bank" },
  { key: "metrobank", name: "Metrobank", type: "Bank", mark: "MB", recommendedTone: "blue", account: "Savings", group: "Bank" },
  { key: "rcbc", name: "RCBC", type: "Bank", mark: "RC", recommendedTone: "ocean", account: "Checking", group: "Bank" },
  { key: "landbank", name: "LandBank", type: "Bank", mark: "LB", recommendedTone: "mint", account: "Savings", group: "Bank" },
  { key: "securitybank", name: "Security Bank", type: "Bank", mark: "SE", recommendedTone: "navy", account: "AllAccess", group: "Bank" },
  { key: "chinabank", name: "Chinabank", type: "Bank", mark: "CBC", recommendedTone: "rose", account: "Savings", group: "Bank" },
  { key: "pnb", name: "PNB", type: "Bank", mark: "PNB", recommendedTone: "navy", account: "Savings", group: "Bank" },
  { key: "eastwest", name: "EastWest", type: "Bank", mark: "EW", recommendedTone: "plum", account: "Savings", group: "Bank" },
  { key: "psbank", name: "PSBank", type: "Bank", mark: "PSB", recommendedTone: "blue", account: "Savings", group: "Bank" },

  // Cash
  { key: "cash", name: "Cash", type: "Cash", mark: "₱", recommendedTone: "mint", account: "On hand", group: "Cash" },
];

export function resolveWalletLogo(
  logoKey?: string,
  walletName?: string
): ImageSourcePropType | undefined {
  return resolveFromMap(walletLogoAssets, logoKey, walletName);
}

export function resolveWalletPrintmark(
  logoKey?: string,
  walletName?: string
): ImageSourcePropType | undefined {
  return resolveFromMap(walletPrintmarkAssets, logoKey, walletName);
}

function resolveFromMap(
  map: Record<string, ImageSourcePropType>,
  logoKey?: string,
  walletName?: string
): ImageSourcePropType | undefined {
  const aliasKey = logoKey === "seabank" ? "maribank" : logoKey;
  if (aliasKey && map[aliasKey]) {
    return map[aliasKey];
  }
  if (!walletName) return undefined;
  const normalized = walletName.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (normalized.includes("seabank") && map.maribank) return map.maribank;
  if (map[normalized]) return map[normalized];
  const matched = walletPresets.find(
    (p) =>
      normalized.includes(p.key) ||
      p.name.toLowerCase().replace(/[^a-z0-9]/g, "") === normalized
  );
  return matched ? map[matched.key] : undefined;
}
