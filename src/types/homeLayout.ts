export type HomeSectionId =
  | "pulse"
  | "payLater"
  | "topSpending"
  | "upcoming"
  | "recent";

export type HomeSectionConfig = {
  id: HomeSectionId;
  visible: boolean;
};

export const DEFAULT_HOME_SECTIONS: HomeSectionConfig[] = [
  { id: "pulse", visible: true },
  { id: "payLater", visible: true },
  { id: "topSpending", visible: true },
  { id: "upcoming", visible: true },
  { id: "recent", visible: true },
];

export const HOME_SECTION_META: Record<
  HomeSectionId,
  { label: string; description: string; icon: string }
> = {
  pulse: {
    label: "Cashflow & Budget",
    description: "Spent today, monthly net, savings & budget bar",
    icon: "trend",
  },
  payLater: {
    label: "PayLater Bills",
    description: "Upcoming SPayLater, LazPayLater & Atome dues",
    icon: "card",
  },
  topSpending: {
    label: "Top Spending",
    description: "Highest spending categories this month",
    icon: "pie",
  },
  upcoming: {
    label: "Upcoming",
    description: "Scheduled bills & recurring reminders",
    icon: "calendar",
  },
  recent: {
    label: "Recent Transactions",
    description: "Latest 5 recorded activities",
    icon: "list",
  },
};

const VALID_IDS = new Set<HomeSectionId>([
  "pulse",
  "payLater",
  "topSpending",
  "upcoming",
  "recent",
]);

export function normalizeHomeSections(raw: unknown): HomeSectionConfig[] {
  if (!Array.isArray(raw)) {
    return DEFAULT_HOME_SECTIONS.map((s) => ({ ...s }));
  }
  const seen = new Set<HomeSectionId>();
  const out: HomeSectionConfig[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const id = (item as { id?: unknown }).id as HomeSectionId;
    if (!VALID_IDS.has(id) || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      visible: (item as { visible?: unknown }).visible !== false,
    });
  }
  for (const def of DEFAULT_HOME_SECTIONS) {
    if (!seen.has(def.id)) {
      out.push({ ...def });
    }
  }
  return out;
}
