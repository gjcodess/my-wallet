import { EXPENSE_CATEGORIES, getWalletLocalId, INCOME_CATEGORIES, isExpenseActivity, isIncomeActivity } from "./wallet";
import type { ActivityItem, Wallet } from "./wallet";

export type Favorite = {
  id: string;
  name: string;
  direction: "expense" | "income";
  category: string;
  walletLocalId: string;
  defaultAmount: number | null;
};

export type FavoriteDraft = {
  favorite: Favorite;
  suggestedAmount: number | null;
};

const PREFIX = "transaction_favorite:";
export const favoriteKey = (id: string) => `${PREFIX}${id}`;

export function createFavoriteDraft(
  fields: Omit<Favorite, "id" | "defaultAmount">,
  suggestedAmount: number | null,
): FavoriteDraft {
  return { favorite: { ...fields, id: `favorite-${Date.now()}`, defaultAmount: null }, suggestedAmount };
}

export function favoriteFromActivity(item: ActivityItem, wallets: Wallet[]): FavoriteDraft | null {
  const direction = isIncomeActivity(item) ? "income" : isExpenseActivity(item) ? "expense" : null;
  if (!direction) return null;
  const wallet = wallets.find((entry) => item.walletLocalId
    ? getWalletLocalId(entry) === item.walletLocalId
    : entry.name === item.wallet);
  if (!wallet) return null;
  const categories = direction === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return createFavoriteDraft({
    name: item.title.trim().slice(0, 70),
    direction,
    category: categories.some(([label]) => label === item.kind) ? item.kind : "Other",
    walletLocalId: getWalletLocalId(wallet),
  }, Math.abs(item.amount));
}

export function readFavorites(settings: ReadonlyMap<string, string>): Favorite[] {
  const favorites: Favorite[] = [];
  for (const [key, raw] of settings) {
    if (!key.startsWith(PREFIX) || !raw) continue;
    try {
      const item = JSON.parse(raw) as Favorite;
      if (
        typeof item?.id === "string" && favoriteKey(item.id) === key &&
        typeof item.name === "string" && item.name.trim() &&
        (item.direction === "expense" || item.direction === "income") &&
        typeof item.category === "string" && typeof item.walletLocalId === "string" &&
        (item.defaultAmount === null || (Number.isFinite(item.defaultAmount) && item.defaultAmount > 0))
      ) favorites.push(item);
    } catch {
      // Ignore a damaged favorite and keep loading the others.
    }
  }
  return favorites.sort((a, b) => b.id.localeCompare(a.id));
}
