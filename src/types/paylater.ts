export type PayLaterPresetKey =
  | "spaylater"
  | "lazpaylater"
  | "tiktokpaylater"
  | "atome"
  | "ggives"
  | "billease"
  | "luvit"
  | "salmon"
  | "custom";

export type PayLaterPreset = {
  key: PayLaterPresetKey;
  name: string;
  short: string;
  accent: string;
  ink: string;
};

export const PAYLATER_PRESETS: PayLaterPreset[] = [
  { key: "spaylater", name: "SPayLater", short: "SP", accent: "#ee4d2d", ink: "#ffffff" },
  { key: "lazpaylater", name: "LazPayLater", short: "LZ", accent: "#1a237e", ink: "#ffffff" },
  { key: "tiktokpaylater", name: "TikTok PayLater", short: "TT", accent: "#111827", ink: "#ffffff" },
  { key: "atome", name: "Atome", short: "AT", accent: "#b4e300", ink: "#14201a" },
  { key: "ggives", name: "GGives", short: "GG", accent: "#007dfe", ink: "#ffffff" },
  { key: "billease", name: "BillEase", short: "BE", accent: "#0284c7", ink: "#ffffff" },
  { key: "luvit", name: "Luvit", short: "LV", accent: "#e11d48", ink: "#ffffff" },
  { key: "salmon", name: "Salmon", short: "SM", accent: "#fa7268", ink: "#ffffff" },
  { key: "custom", name: "Custom", short: "PL", accent: "#475569", ink: "#ffffff" },
];

export type PayLaterAccount = {
  id: string;
  providerKey: PayLaterPresetKey;
  name: string;
  dueAmount: number;
  dueDay: number;
  totalMonths?: number;
  paidMonthsCount?: number;
  note?: string;
  paidMonth?: string;
  lastPaidAt?: string;
  updatedAt: string;
};

export function getPayLaterPreset(key: PayLaterPresetKey): PayLaterPreset {
  return (
    PAYLATER_PRESETS.find((p) => p.key === key) ||
    PAYLATER_PRESETS[PAYLATER_PRESETS.length - 1]
  );
}

export function currentMonthKey(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function isPayLaterPaidForMonth(
  item: PayLaterAccount,
  now = new Date()
): boolean {
  return item.paidMonth === currentMonthKey(now);
}

export function getPayLaterDueStatus(
  item: PayLaterAccount,
  now = new Date()
): {
  paid: boolean;
  dueDate: Date;
  daysUntil: number;
  label: string;
  tone: "paid" | "overdue" | "soon" | "upcoming";
} {
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const clampedDay = Math.max(1, Math.min(daysInMonth, Math.round(item.dueDay || 1)));
  const dueDate = new Date(year, month, clampedDay);
  const todayStart = new Date(year, month, now.getDate());
  const daysUntil = Math.round(
    (dueDate.getTime() - todayStart.getTime()) / (24 * 60 * 60 * 1000)
  );
  const dateLabel = dueDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  if (isPayLaterPaidForMonth(item, now)) {
    const mon = now.toLocaleDateString("en-US", { month: "short" });
    return {
      paid: true,
      dueDate,
      daysUntil,
      label: `Paid for ${mon}`,
      tone: "paid",
    };
  }

  if (daysUntil < 0) {
    const abs = Math.abs(daysUntil);
    return {
      paid: false,
      dueDate,
      daysUntil,
      label: `${abs}d overdue · ${dateLabel}`,
      tone: "overdue",
    };
  }
  if (daysUntil === 0) {
    return {
      paid: false,
      dueDate,
      daysUntil,
      label: `Due today · ${dateLabel}`,
      tone: "soon",
    };
  }
  if (daysUntil <= 5) {
    return {
      paid: false,
      dueDate,
      daysUntil,
      label: `Due in ${daysUntil}d · ${dateLabel}`,
      tone: "soon",
    };
  }
  return {
    paid: false,
    dueDate,
    daysUntil,
    label: `Due ${dateLabel}`,
    tone: "upcoming",
  };
}

export function normalizePayLaterAccounts(raw: unknown): PayLaterAccount[] {
  if (!Array.isArray(raw)) return [];
  const out: PayLaterAccount[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    if (typeof e.id !== "string" || typeof e.name !== "string") continue;
    const amt = Number(e.dueAmount);
    const day = Number(e.dueDay);
    const totalM = Number(e.totalMonths);
    const paidM = Number(e.paidMonthsCount);
    const key = (typeof e.providerKey === "string"
      ? e.providerKey
      : "custom") as PayLaterPresetKey;
    const validTotalM =
      Number.isFinite(totalM) && totalM > 0 ? Math.round(totalM) : undefined;
    const validPaidM =
      validTotalM && Number.isFinite(paidM) && paidM >= 0
        ? Math.min(validTotalM, Math.round(paidM))
        : validTotalM
          ? 0
          : undefined;
    out.push({
      id: e.id,
      providerKey: PAYLATER_PRESETS.some((p) => p.key === key) ? key : "custom",
      name: e.name.trim() || "PayLater",
      dueAmount: Number.isFinite(amt) && amt >= 0 ? amt : 0,
      dueDay: Number.isFinite(day) ? Math.max(1, Math.min(31, Math.round(day))) : 15,
      totalMonths: validTotalM,
      paidMonthsCount: validPaidM,
      note: typeof e.note === "string" && e.note.trim() ? e.note.trim() : undefined,
      paidMonth: typeof e.paidMonth === "string" ? e.paidMonth : undefined,
      lastPaidAt: typeof e.lastPaidAt === "string" ? e.lastPaidAt : undefined,
      updatedAt:
        typeof e.updatedAt === "string" ? e.updatedAt : new Date().toISOString(),
    });
  }
  return out;
}

export function readPayLaterAccounts(
  settingsMap: Map<string, string>
): PayLaterAccount[] {
  const raw = settingsMap.get("paylater_accounts");
  if (!raw) return [];
  try {
    return normalizePayLaterAccounts(JSON.parse(raw));
  } catch {
    return [];
  }
}
