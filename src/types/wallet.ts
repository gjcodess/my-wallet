export type Tab = "home" | "wallets" | "activity" | "settings";

export const EXPENSE_CATEGORIES: [string, string][] = [
  ["Food", "cup"],
  ["Groceries", "cart"],
  ["Transport", "car"],
  ["Bills", "bolt"],
  ["Internet", "wifi"],
  ["Rent", "home"],
  ["Shopping", "bag"],
  ["Health", "heart"],
  ["Debt", "card"],
  ["Loan", "bank"],
  ["Leisure", "film"],
  ["Subs", "sync"],
  ["Education", "book"],
  ["Family", "users"],
  ["Other", "adjust"],
];

export const INCOME_CATEGORIES: [string, string][] = [
  ["Salary", "briefcase"],
  ["Freelance", "phone"],
  ["Business", "cash"],
  ["Bonus", "star"],
  ["Allowance", "wallet"],
  ["Interest", "trend"],
  ["Cashback", "tag"],
  ["Repayment", "swap"],
  ["Loan", "bank"],
  ["Gift", "gift"],
  ["Refund", "arrow-down"],
  ["Other", "plus"],
];
export type Sheet =
  | "add"
  | "entry"
  | "transfer"
  | "update"
  | "edit"
  | "tx"
  | "auth"
  | "budget"
  | "search"
  | null;
export type Tone =
  | "blue"
  | "lime"
  | "yellow"
  | "navy"
  | "mint"
  | "lilac"
  | "coral"
  | "ocean"
  | "plum"
  | "sunset"
  | "graphite"
  | "rose";

export type Wallet = {
  id: number;
  localId?: string;
  name: string;
  type: string;
  balance: number;
  mark: string;
  tone: Tone;
  account: string;
  logoKey?: string;
  updatedAt?: string;
  synced?: boolean;
};

export type ActivityItem = {
  id: number;
  localId?: string;
  walletLocalId?: string;
  destWalletLocalId?: string;
  title: string;
  wallet: string;
  date: string;
  amount: number;
  icon: string;
  kind: string;
  occurredAt?: string;
  updatedAt?: string;
  synced?: boolean;
};

export type UserProfile = {
  fullName: string;
  initials: string;
  email?: string;
};

export const tonePalette: Record<
  Tone,
  { label: string; from: string; to: string; ink: string }
> = {
  blue: { label: "Blue", from: "#8fd0ff", to: "#2563eb", ink: "#ffffff" },
  lime: { label: "Lime", from: "#e3ff86", to: "#8fdd32", ink: "#14201a" },
  yellow: { label: "Sun", from: "#fff58a", to: "#f2c715", ink: "#211b07" },
  mint: { label: "Mint", from: "#d8fff0", to: "#6fd6a8", ink: "#102b22" },
  lilac: { label: "Lilac", from: "#f3edff", to: "#b8a0f2", ink: "#211938" },
  navy: { label: "Navy", from: "#3c5c9a", to: "#111b34", ink: "#ffffff" },
  coral: { label: "Coral", from: "#ffd0bf", to: "#f06f5f", ink: "#341611" },
  ocean: { label: "Ocean", from: "#79efff", to: "#2477d8", ink: "#ffffff" },
  plum: { label: "Plum", from: "#c29aff", to: "#4c2ca8", ink: "#ffffff" },
  sunset: { label: "Sunset", from: "#ffe682", to: "#ff875f", ink: "#30170d" },
  graphite: { label: "Graphite", from: "#788396", to: "#222833", ink: "#ffffff" },
  rose: { label: "Rose", from: "#ffe0ec", to: "#e66b9f", ink: "#35111f" },
};

export const initialWallets: Wallet[] = [
  {
    id: 1,
    localId: "wallet-1",
    name: "GCash",
    type: "E-wallet",
    balance: 18450.75,
    mark: "G",
    tone: "blue",
    account: "Personal",
    logoKey: "gcash",
  },
  {
    id: 2,
    localId: "wallet-2",
    name: "Maya",
    type: "E-wallet",
    balance: 7680.25,
    mark: "M",
    tone: "yellow",
    account: "Savings",
    logoKey: "maya",
  },
  {
    id: 3,
    localId: "wallet-3",
    name: "BPI Savings",
    type: "Bank",
    balance: 42840.5,
    mark: "BPI",
    tone: "navy",
    account: "Primary bank",
    logoKey: "bpi",
  },
  {
    id: 4,
    localId: "wallet-4",
    name: "Cash",
    type: "Cash",
    balance: 6350,
    mark: "₱",
    tone: "mint",
    account: "On hand",
    logoKey: "cash",
  },
  {
    id: 5,
    localId: "wallet-5",
    name: "GoTyme",
    type: "Bank",
    balance: 12700,
    mark: "GT",
    tone: "lilac",
    account: "Emergency fund",
    logoKey: "gotyme",
  },
];

export const initialActivities: ActivityItem[] = [
  {
    id: 1,
    localId: "tx-1",
    walletLocalId: "wallet-1",
    title: "SM Supermarket",
    wallet: "GCash",
    date: "Today, 6:42 PM",
    amount: -1856.35,
    icon: "bag",
    kind: "Payment",
  },
  {
    id: 2,
    localId: "tx-2",
    walletLocalId: "wallet-4",
    title: "Balance adjustment",
    wallet: "Cash",
    date: "Today, 9:15 AM",
    amount: 500,
    icon: "adjust",
    kind: "Updated",
  },
  {
    id: 3,
    localId: "tx-3",
    walletLocalId: "wallet-3",
    title: "Monthly salary",
    wallet: "BPI Savings",
    date: "May 31, 8:00 AM",
    amount: 32500,
    icon: "arrow-down",
    kind: "Received",
  },
  {
    id: 4,
    localId: "tx-4",
    walletLocalId: "wallet-1",
    destWalletLocalId: "wallet-2",
    title: "GCash to Maya",
    wallet: "GCash",
    date: "May 30, 4:21 PM",
    amount: -2000,
    icon: "swap",
    kind: "Transfer",
  },
  {
    id: 5,
    localId: "tx-5",
    walletLocalId: "wallet-2",
    title: "Meralco bill",
    wallet: "Maya",
    date: "May 29, 7:32 PM",
    amount: -3241.6,
    icon: "bolt",
    kind: "Bills",
  },
  {
    id: 6,
    localId: "tx-6",
    walletLocalId: "wallet-4",
    title: "Coffee Project",
    wallet: "Cash",
    date: "May 29, 10:06 AM",
    amount: -285,
    icon: "cup",
    kind: "Food",
  },
];

export const money = (value: number, compact = false): string => {
  if (compact) {
    if (Math.abs(value) >= 1000) {
      const k = value / 1000;
      return `₱${Number.isInteger(k) ? k : k.toFixed(1)}K`;
    }
    return `₱${Math.round(value)}`;
  }
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${value < 0 ? "-" : ""}₱${formatted}`;
};

export const splitMoney = (value: number): { whole: string; cents: string } => {
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const [whole, cents = "00"] = formatted.split(".");
  return { whole: value < 0 ? `-${whole}` : whole, cents };
};

export function getWalletLocalId(wallet: Wallet): string {
  return wallet.localId || `wallet-${wallet.id}`;
}

export function isActivityForWallet(
  item: ActivityItem,
  wallet: Wallet
): { matched: boolean; isIncomingTransfer: boolean } {
  const walletId = getWalletLocalId(wallet);
  const isPrimary = item.walletLocalId
    ? item.walletLocalId === walletId
    : item.wallet === wallet.name;

  const isIncomingTransfer =
    isTransferActivity(item) &&
    !isPrimary &&
    (item.destWalletLocalId
      ? item.destWalletLocalId === walletId
      : item.title.endsWith(` to ${wallet.name}`));

  return {
    matched: isPrimary || isIncomingTransfer,
    isIncomingTransfer,
  };
}

export function isTransferActivity(item: ActivityItem): boolean {
  return item.kind === "Transfer";
}

export function isAdjustmentActivity(item: ActivityItem): boolean {
  return item.kind === "Updated";
}

export function isExpenseActivity(item: ActivityItem): boolean {
  return item.amount < 0 && !isTransferActivity(item) && !isAdjustmentActivity(item);
}

export function isIncomeActivity(item: ActivityItem): boolean {
  return item.amount > 0 && !isTransferActivity(item) && !isAdjustmentActivity(item);
}

const MONTH_INDEX: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

export function getActivityDate(
  item: ActivityItem,
  referenceDate: Date = new Date()
): Date {
  if (item.occurredAt) {
    const parsed = new Date(item.occurredAt);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  const raw = item.date?.trim() || "";
  const lower = raw.toLowerCase();
  if (lower.startsWith("today")) {
    return new Date(referenceDate);
  }
  if (lower.startsWith("yesterday")) {
    const d = new Date(referenceDate);
    d.setDate(d.getDate() - 1);
    return d;
  }
  const match = /^([a-z]{3})\s+(\d{1,2})/i.exec(raw);
  if (match) {
    const month = MONTH_INDEX[match[1].toLowerCase()];
    const day = Number(match[2]);
    if (month !== undefined && day >= 1 && day <= 31) {
      let year = referenceDate.getFullYear();
      const candidate = new Date(year, month, day);
      if (candidate.getTime() - referenceDate.getTime() > 86400000) {
        year -= 1;
      }
      return new Date(year, month, day);
    }
  }
  return new Date(referenceDate);
}
