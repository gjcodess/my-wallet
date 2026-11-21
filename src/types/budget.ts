import { EXPENSE_CATEGORIES, getActivityDate, isExpenseActivity } from "./wallet";
import type { ActivityItem } from "./wallet";

export type CategoryLimits = Record<string, number>;

export type CategorySpending = {
  cents: number;
  transactions: ActivityItem[];
};

export const categoryLimitKey = (category: string) => `category_limit:${category}`;

export function readCategoryLimits(settings: ReadonlyMap<string, string>): CategoryLimits {
  const limits: CategoryLimits = {};
  for (const [category] of EXPENSE_CATEGORIES) {
    const limit = Number(settings.get(categoryLimitKey(category)));
    if (Number.isFinite(limit) && limit > 0) limits[category] = limit;
  }
  return limits;
}

export function getMonthlySpending(activities: ActivityItem[], month: Date) {
  const categories = new Map<string, CategorySpending>();
  let totalCents = 0;
  for (const item of activities) {
    if (!isExpenseActivity(item)) continue;
    const date = getActivityDate(item, month);
    if (date.getFullYear() !== month.getFullYear() || date.getMonth() !== month.getMonth()) continue;
    const cents = Math.round(Math.abs(item.amount) * 100);
    if (!Number.isFinite(cents)) continue;
    const category = categories.get(item.kind) ?? { cents: 0, transactions: [] };
    category.cents += cents;
    category.transactions.push(item);
    categories.set(item.kind, category);
    totalCents += cents;
  }
  return { categories, spent: totalCents / 100, referenceDate: month,
    monthLabel: month.toLocaleDateString("en-PH", { month: "short" }) };
}

export type MonthlySpending = ReturnType<typeof getMonthlySpending>;

export function getCategoryProgress(limit: number, spending?: CategorySpending) {
  const limitCents = Math.round(limit * 100);
  const spentCents = spending?.cents ?? 0;
  const remainingCents = limitCents - spentCents;
  return {
    spent: spentCents / 100,
    remaining: remainingCents / 100,
    percent: Math.min(100, limitCents > 0 ? (spentCents / limitCents) * 100 : 0),
  };
}
