import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { getCategoryProgress } from "../types/budget";
import type { CategoryLimits, CategorySpending, MonthlySpending } from "../types/budget";
import { EXPENSE_CATEGORIES, getActivityDate, money } from "../types/wallet";
import type { ActivityItem } from "../types/wallet";
import { AmountKeypad, formatAmountInput } from "./AmountKeypad";
import { Icon } from "./Icon";
import {
  cardShadow,
  DarkLeatherSurface,
  hexToRgba,
  LightLeatherSurface,
  SectionTitle,
  TxRow,
} from "./SharedUI";
import type { ThemeColors } from "./SharedUI";

type BudgetProps = {
  limits: CategoryLimits;
  spending: MonthlySpending;
  hidden: boolean;
  theme: ThemeColors;
};

const expenseDate = new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric" });

function BudgetProgress({ limit, spending, hidden, theme }: {
  limit: number;
  spending?: CategorySpending;
  hidden: boolean;
  theme: ThemeColors;
}) {
  const progress = getCategoryProgress(limit, spending);
  const over = progress.remaining < 0;
  const danger = theme.dark ? "#ffadad" : "#9e343c";
  const status = over ? `${money(-progress.remaining)} over budget`
    : progress.remaining === 0 ? "Limit reached" : `${money(progress.remaining)} left`;
  return (
    <View style={styles.progress}>
      <View style={styles.figures}>
        <Text style={[styles.caption, { color: theme.muted }]}>
          {hidden ? "Amounts hidden" : `${money(progress.spent)} of ${money(limit)} spent`}
        </Text>
        {!hidden && <Text style={[styles.label, { color: over ? danger : theme.ink }]}>{status}</Text>}
      </View>
      {!hidden && (
        <View
          style={[
            styles.track,
            {
              backgroundColor: hexToRgba(
                theme.leather.accent,
                theme.dark ? 0.22 : 0.12
              ),
            },
          ]}
        >
          <View
            style={[
              styles.fill,
              {
                width: `${progress.percent}%`,
                backgroundColor: over ? danger : theme.leather.accent,
              },
            ]}
          />
        </View>
      )}
    </View>
  );
}

export function CategoryBudgetOverview({ limits, spending, hidden, theme, onOpen }: BudgetProps & {
  onOpen: (category: string | null) => void;
}) {
  const configured = EXPENSE_CATEGORIES.filter(([category]) => limits[category] > 0);
  return (
    <View style={styles.overview}>
      <SectionTitle title="Category budgets" action={configured.length ? "Manage" : "Add limit"}
        actionIcon={configured.length ? "chevron" : "plus"} actionColor={theme.accentText}
        onPress={() => onOpen(null)} theme={theme} />
      <View
        style={[
          styles.panel,
          {
            backgroundColor: theme.card,
            borderColor: hexToRgba(theme.leather.accent, 0.24),
          },
          cardShadow(theme.dark),
        ]}
      >
        <LightLeatherSurface theme={theme} radius={18} />
        {configured.length ? configured.map(([category, icon], index) => (
          <Pressable key={category} accessibilityRole="button" accessibilityHint="Shows the expenses counted toward this budget"
            onPress={() => onOpen(category)} style={({ pressed }) => [styles.entry,
              { backgroundColor: pressed ? hexToRgba(theme.leather.accent, 0.06) : "transparent", borderTopColor: hexToRgba(theme.leather.accent, 0.14) },
              index > 0 && styles.separator]}>
            <View style={styles.entryHeading}>
              <Icon name={icon} size={17} color={theme.accentText} />
              <Text style={[styles.label, styles.grow, { color: theme.ink }]}>{category}</Text>
              <Icon name="chevron" size={16} color={theme.muted} />
            </View>
            <BudgetProgress limit={limits[category]} spending={spending.categories.get(category)} hidden={hidden} theme={theme} />
          </Pressable>
        )) : (
          <Text style={[styles.empty, { color: theme.muted }]}>Set monthly limits for food, transport, or other expenses.</Text>
        )}
      </View>
    </View>
  );
}

export function CategoryBudgetSheet({ limits, spending, hidden, theme, selectedCategory, onSave, onTransaction, onScrollToTop }: BudgetProps & {
  selectedCategory: string | null;
  onSave: (category: string, amount: number | null) => Promise<void>;
  onTransaction?: (item: ActivityItem) => void;
  onScrollToTop: () => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(10);
  const showEditor = (category: string | null) => {
    onScrollToTop();
    setEditing(category);
  };
  if (editing) {
    return <LimitEditor key={editing} category={editing} limit={limits[editing]} theme={theme}
      onSave={onSave} onCancel={() => showEditor(null)} />;
  }

  if (selectedCategory) {
    const categorySpending = spending.categories.get(selectedCategory);
    const transactions = categorySpending?.transactions ?? [];
    const limit = limits[selectedCategory];
    return (
      <View style={styles.sheet}>
        <View
          style={[
            styles.panel,
            styles.summary,
            {
              backgroundColor: theme.card,
              borderColor: hexToRgba(theme.leather.accent, 0.24),
            },
            cardShadow(theme.dark),
          ]}
        >
          <LightLeatherSurface theme={theme} radius={18} />
          <SectionTitle title={`${spending.monthLabel} budget`} action={limit ? "Edit limit" : "Add limit"}
            actionIcon={limit ? "edit" : "plus"} actionColor={theme.leather.accent}
            onPress={() => showEditor(selectedCategory)} theme={theme} />
          {limit
            ? <BudgetProgress limit={limit} spending={categorySpending} hidden={hidden} theme={theme} />
            : <Text style={[styles.caption, { color: theme.muted }]}>No monthly limit for {selectedCategory}.</Text>}
        </View>
        <SectionTitle title={`${spending.monthLabel} expenses`} theme={theme} />
        {transactions.length ? transactions.slice(0, visibleCount).map((item) => (
          <TxRow key={item.id} item={item} hidden={hidden} theme={theme}
            dateLabel={expenseDate.format(getActivityDate(item, spending.referenceDate))}
            onPress={onTransaction ? () => onTransaction(item) : undefined} />
        )) : (
          <View
            style={[
              styles.panel,
              {
                backgroundColor: theme.card,
                borderColor: hexToRgba(theme.leather.accent, 0.2),
              },
            ]}
          >
            <LightLeatherSurface theme={theme} radius={18} />
            <Text style={[styles.empty, { color: theme.muted }]}>No {selectedCategory.toLowerCase()} expenses this month.</Text>
          </View>
        )}
        {visibleCount < transactions.length && (
          <BudgetButton label="Show more expenses" theme={theme} onPress={() => setVisibleCount((count) => count + 10)} />
        )}
      </View>
    );
  }

  return (
    <View style={styles.sheet}>
      <Text style={[styles.caption, { color: theme.muted }]}>Choose a category. Its limit repeats each month.</Text>
      <View
        style={[
          styles.panel,
          {
            backgroundColor: theme.card,
            borderColor: hexToRgba(theme.leather.accent, 0.24),
          },
          cardShadow(theme.dark),
        ]}
      >
        <LightLeatherSurface theme={theme} radius={18} />
        {EXPENSE_CATEGORIES.map(([category, icon], index) => {
          const hasLimit = Boolean(limits[category]);
          return (
            <Pressable
              key={category}
              accessibilityRole="button"
              onPress={() => showEditor(category)}
              style={({ pressed }) => [
                styles.pickerRow,
                {
                  borderTopColor: hexToRgba(theme.leather.accent, 0.14),
                  backgroundColor: pressed
                    ? hexToRgba(theme.leather.accent, 0.06)
                    : "transparent",
                },
                index > 0 && styles.separator,
              ]}
            >
              <Icon name={icon} size={18} color={theme.leather.accent} />
              <Text style={[styles.label, styles.grow, { color: theme.ink }]}>{category}</Text>
              <View
                style={[
                  styles.limitPill,
                  {
                    backgroundColor: hasLimit
                      ? theme.leather.colors[1]
                      : hexToRgba(theme.leather.accent, theme.dark ? 0.2 : 0.1),
                    borderColor: hasLimit
                      ? theme.leather.edge
                      : hexToRgba(theme.leather.accent, 0.22),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.limitPillText,
                    { color: hasLimit ? "#ffffff" : theme.leather.accent },
                  ]}
                >
                  {hasLimit ? (hidden ? "••••" : money(limits[category])) : "Set limit"}
                </Text>
              </View>
              <Icon name="chevron" size={15} color={theme.muted} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function LimitEditor({ category, limit, theme, onSave, onCancel }: {
  category: string;
  limit?: number;
  theme: ThemeColors;
  onSave: (category: string, amount: number | null) => Promise<void>;
  onCancel: () => void;
}) {
  const [amount, setAmount] = useState(limit ? String(limit) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const value = Number(amount);
  const valid = Number.isFinite(value) && value > 0 && value <= 999_999_999;

  const save = async (next: number | null) => {
    if (saving) return;
    setSaving(true);
    setError(false);
    try {
      await onSave(category, next);
      onCancel();
    } catch {
      setError(true);
      setSaving(false);
    }
  };

  return (
    <View style={styles.sheet}>
      <View
        style={[
          styles.heroAmountCard,
          {
            backgroundColor: theme.leather.colors[1],
            borderColor: theme.leather.edge,
          },
          cardShadow(theme.dark),
        ]}
      >
        <DarkLeatherSurface theme={theme} radius={20} />
        <View style={styles.figures}>
          <Text style={[styles.label, { color: theme.heroMuted }]}>
            {category} monthly limit
          </Text>
          {amount && !saving ? (
            <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setAmount("")}>
              <Text style={[styles.caption, { color: "rgba(255, 255, 255, 0.82)" }]}>
                Clear
              </Text>
            </Pressable>
          ) : null}
        </View>
        <Text
          style={[styles.amount, { color: "#ffffff" }]}
          accessibilityLabel={`Limit ${amount || "0"} pesos`}
        >
          ₱{formatAmountInput(amount) || "0.00"}
        </Text>
      </View>
      <AmountKeypad
        value={amount}
        onChange={setAmount}
        quickAmounts={[1000, 2500, 5000, 10000]}
        compact
        stitched
        theme={theme}
      />
      {error && <Text accessibilityRole="alert" style={[styles.caption, { color: "#c04444" }]}>Could not save the limit. Try again.</Text>}
      <BudgetButton
        label={saving ? "Saving…" : "Save limit"}
        variant="primary"
        icon="check"
        disabled={!valid || saving}
        onPress={() => { void save(value); }}
        theme={theme}
      />
      {Boolean(limit) && (
        <BudgetButton
          label="Remove limit"
          variant="danger"
          icon="trash"
          disabled={saving}
          onPress={() => { void save(null); }}
          theme={theme}
        />
      )}
      <BudgetButton label="Back" disabled={saving} onPress={onCancel} theme={theme} />
    </View>
  );
}

function BudgetButton({ label, variant = "secondary", icon, disabled, onPress, theme }: {
  label: string;
  variant?: "primary" | "secondary" | "danger";
  icon?: string;
  disabled?: boolean;
  onPress: () => void;
  theme: ThemeColors;
}) {
  const isPrimary = variant === "primary" && !disabled;
  const isDanger = variant === "danger";
  const dangerColor = theme.dark ? "#f28b82" : "#9e3c42";
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          overflow: "hidden",
          backgroundColor: disabled
            ? theme.soft
            : isPrimary
              ? theme.leather.colors[1]
              : theme.card,
          borderColor: disabled
            ? theme.line
            : isPrimary
              ? theme.leather.edge
              : isDanger
                ? hexToRgba("#9e3c42", 0.34)
                : hexToRgba(theme.leather.accent, 0.26),
          opacity: disabled ? 0.65 : 1,
          transform: [{ scale: pressed && !disabled ? 0.98 : 1 }],
        },
        !disabled && cardShadow(theme.dark),
      ]}
    >
      {isPrimary ? (
        <DarkLeatherSurface theme={theme} radius={16} />
      ) : !disabled ? (
        <LightLeatherSurface theme={theme} radius={16} />
      ) : null}
      {icon ? (
        <Icon
          name={icon}
          size={15}
          color={
            disabled
              ? theme.muted
              : isPrimary
                ? "#ffffff"
                : isDanger
                  ? dangerColor
                  : theme.ink
          }
        />
      ) : null}
      <Text
        style={[
          styles.buttonLabel,
          {
            color: disabled
              ? theme.muted
              : isPrimary
                ? "#ffffff"
                : isDanger
                  ? dangerColor
                  : theme.ink,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overview: { marginBottom: 24 },
  sheet: { gap: 10 },
  panel: { borderWidth: 1, borderRadius: 18, overflow: "hidden" },
  heroAmountCard: { borderWidth: 1, borderRadius: 20, padding: 16, gap: 6, overflow: "hidden" },
  summary: { padding: 14, gap: 4 },
  entry: { padding: 14, gap: 7 },
  separator: { borderTopWidth: 1 },
  entryHeading: { flexDirection: "row", alignItems: "center", gap: 8 },
  pickerRow: { minHeight: 50, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  limitPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  limitPillText: {
    fontSize: 11,
    fontFamily: "Poppins_700Bold",
    lineHeight: 14,
    includeFontPadding: false,
    marginTop: 1.5,
  },
  progress: { gap: 8 },
  figures: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 5 },
  track: { height: 7, borderRadius: 4, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 4 },
  empty: { padding: 14, fontSize: 13, fontFamily: "Poppins_500Medium" },
  caption: { fontSize: 12, fontFamily: "Poppins_500Medium", includeFontPadding: false },
  label: { fontSize: 13, fontFamily: "Poppins_600SemiBold", includeFontPadding: false },
  buttonLabel: { fontSize: 13.5, fontFamily: "Poppins_700Bold", lineHeight: 18, includeFontPadding: false, marginTop: 1.5 },
  amount: { fontSize: 29, fontFamily: "Poppins_700Bold", fontVariant: ["tabular-nums"] },
  grow: { flex: 1 },
  button: { minHeight: 48, borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center" },
});
