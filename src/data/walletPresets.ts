import { ImageSourcePropType } from "react-native";
import { CUSTOM_CARD_BG_PREFIX, resolveCardBgUri } from "../lib/attachments";
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
  cash: require("../../assets/logos/cash.webp"),
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

export const walletCardBackgroundAssets: Record<string, ImageSourcePropType> = {
  gcash: require("../../assets/cards/gcash.webp"),
  maya: require("../../assets/cards/maya.webp"),
  shopeepay: require("../../assets/cards/shopeepay.webp"),
  grabpay: require("../../assets/cards/grabpay.webp"),
  coinsph: require("../../assets/cards/coinsph.webp"),
  paypal: require("../../assets/cards/paypal.webp"),
  wise: require("../../assets/cards/wise.webp"),
  gotyme: require("../../assets/cards/gotyme.webp"),
  maribank: require("../../assets/cards/maribank.webp"),
  cimb: require("../../assets/cards/cimb.webp"),
  tonik: require("../../assets/cards/tonik.webp"),
  unobank: require("../../assets/cards/unobank.webp"),
  ownbank: require("../../assets/cards/ownbank.webp"),
  bpi: require("../../assets/cards/bpi.webp"),
  bdo: require("../../assets/cards/bdo.webp"),
  unionbank: require("../../assets/cards/unionbank.webp"),
  metrobank: require("../../assets/cards/metrobank.webp"),
  rcbc: require("../../assets/cards/rcbc.webp"),
  landbank: require("../../assets/cards/landbank.webp"),
  securitybank: require("../../assets/cards/securitybank.webp"),
  chinabank: require("../../assets/cards/chinabank.webp"),
  pnb: require("../../assets/cards/pnb.webp"),
  eastwest: require("../../assets/cards/eastwest.webp"),
  psbank: require("../../assets/cards/psbank.webp"),
  cash: require("../../assets/cards/cash.webp"),
};

const LIGHT_CARD_KEYS = new Set(["wise"]);

export type WalletCardDesign = {
  source: ImageSourcePropType;
  ink: string;
  isDark: boolean;
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

export function parseWalletLogoAndBg(logoKey?: string): {
  logoPresetKey?: string;
  bgPresetKey?: string;
  explicitNoLogo: boolean;
  explicitNoBg: boolean;
} {
  if (!logoKey) {
    return { explicitNoLogo: false, explicitNoBg: false };
  }
  if (logoKey === "none" || logoKey === "custom") {
    return { explicitNoLogo: true, explicitNoBg: true };
  }
  if (logoKey.includes("|")) {
    const [rawLogo, rawBg] = logoKey.split("|", 2);
    const cleanLogo = rawLogo?.trim();
    const cleanBg = rawBg?.trim();
    const explicitNoLogo = !cleanLogo || cleanLogo === "none";
    const explicitNoBg = cleanBg === "none";
    return {
      logoPresetKey: explicitNoLogo ? undefined : cleanLogo,
      bgPresetKey: !cleanBg || explicitNoBg ? undefined : cleanBg,
      explicitNoLogo,
      explicitNoBg,
    };
  }
  return {
    logoPresetKey: logoKey,
    bgPresetKey: logoKey,
    explicitNoLogo: false,
    explicitNoBg: false,
  };
}

export function encodeWalletLogoAndBg(
  logoPresetKey?: string,
  bgPresetKey?: string | "none"
): string | undefined {
  const cleanLogo =
    logoPresetKey && logoPresetKey !== "custom" && logoPresetKey !== "none"
      ? logoPresetKey
      : undefined;

  if (!bgPresetKey) {
    return cleanLogo;
  }
  if (bgPresetKey === "none") {
    return cleanLogo ? `${cleanLogo}|none` : "none";
  }
  if (cleanLogo && cleanLogo === bgPresetKey) {
    return cleanLogo;
  }
  return `${cleanLogo || "none"}|${bgPresetKey}`;
}

export function resolveWalletLogo(
  logoKey?: string,
  walletName?: string
): ImageSourcePropType | undefined {
  const { logoPresetKey, explicitNoLogo } = parseWalletLogoAndBg(logoKey);
  if (explicitNoLogo) return undefined;
  return resolveFromMap(walletLogoAssets, logoPresetKey, walletName);
}

export function resolveWalletPrintmark(
  logoKey?: string,
  walletName?: string
): ImageSourcePropType | undefined {
  const { logoPresetKey, explicitNoLogo } = parseWalletLogoAndBg(logoKey);
  if (explicitNoLogo) return undefined;
  return resolveFromMap(walletPrintmarkAssets, logoPresetKey, walletName);
}

export function resolveWalletCardBackground(
  logoKey?: string,
  walletName?: string
): ImageSourcePropType | undefined {
  const { bgPresetKey, explicitNoBg } = parseWalletLogoAndBg(logoKey);
  if (explicitNoBg) return undefined;
  if (bgPresetKey?.startsWith(CUSTOM_CARD_BG_PREFIX)) {
    const uri = resolveCardBgUri(bgPresetKey);
    return uri ? { uri } : undefined;
  }
  return resolveFromMap(walletCardBackgroundAssets, bgPresetKey, walletName);
}

export function resolveWalletCardDesign(
  logoKey?: string,
  walletName?: string
): WalletCardDesign | undefined {
  const { bgPresetKey, explicitNoBg } = parseWalletLogoAndBg(logoKey);
  if (explicitNoBg) return undefined;
  if (bgPresetKey?.startsWith(CUSTOM_CARD_BG_PREFIX)) {
    const uri = resolveCardBgUri(bgPresetKey);
    if (!uri) return undefined;
    return {
      source: { uri },
      ink: "#ffffff",
      isDark: true,
    };
  }
  const key = resolvePresetKey(
    walletCardBackgroundAssets,
    bgPresetKey,
    walletName
  );
  if (!key) return undefined;
  const isLight = LIGHT_CARD_KEYS.has(key);
  return {
    source: walletCardBackgroundAssets[key],
    ink: isLight ? "#14201a" : "#ffffff",
    isDark: !isLight,
  };
}

export function resolveWalletPreset(
  logoKey?: string,
  walletName?: string
): WalletPreset | undefined {
  const { logoPresetKey, explicitNoLogo } = parseWalletLogoAndBg(logoKey);
  if (explicitNoLogo) return undefined;
  const key = resolvePresetKey(
    Object.fromEntries(walletPresets.map((p) => [p.key, p])),
    logoPresetKey,
    walletName
  );
  return key ? walletPresets.find((p) => p.key === key) : undefined;
}

function resolvePresetKey<T>(
  map: Record<string, T>,
  logoKey?: string,
  walletName?: string
): string | undefined {
  const aliasKey = logoKey === "seabank" ? "maribank" : logoKey;
  if (aliasKey && map[aliasKey]) {
    return aliasKey;
  }
  if (!walletName) return undefined;
  const normalized = walletName.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (normalized.includes("seabank") && map.maribank) return "maribank";
  if (map[normalized]) return normalized;
  const matched = walletPresets.find(
    (p) =>
      normalized.includes(p.key) ||
      p.name.toLowerCase().replace(/[^a-z0-9]/g, "") === normalized
  );
  return matched && map[matched.key] ? matched.key : undefined;
}

function resolveFromMap<T>(
  map: Record<string, T>,
  logoKey?: string,
  walletName?: string
): T | undefined {
  const key = resolvePresetKey(map, logoKey, walletName);
  return key ? map[key] : undefined;
}
