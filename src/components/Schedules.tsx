import React, { useState } from "react";
import { Keyboard, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { requestReminderPermission, supportsReminders } from "../lib/scheduleReminders";
import { displayDueDate, dueLabel, isDateKey, localDateKey, REPEAT_OPTIONS } from "../types/schedule";
import type { DueSchedule, Schedule } from "../types/schedule";
import { EXPENSE_CATEGORIES, getWalletLocalId, INCOME_CATEGORIES, money } from "../types/wallet";
import type { Wallet } from "../types/wallet";
import { Icon } from "./Icon";
import {
  cardShadow,
  DarkLeatherSurface,
  hexToRgba,
  LightLeatherSurface,
  SectionTitle,
  ThemeColors,
} from "./SharedUI";

type ScheduleListProps = {
  schedules: DueSchedule[];
  wallets: Wallet[];
  hidden: boolean;
  theme: ThemeColors;
  onRecord: (schedule: DueSchedule) => void;
};

export function Upcoming({ schedules, wallets, hidden, theme, onRecord, onManage }: ScheduleListProps & {
  onManage: () => void;
}) {
  const upcoming = schedules.filter((item) => item.daysAway <= 30).slice(0, 3);
  return (
    <View style={styles.upcoming}>
      <SectionTitle
        title="Upcoming"
        action={schedules.length ? "Manage" : "Add schedule"}
        actionIcon={schedules.length ? "chevron" : "plus"}
        actionColor={theme.accentText}
        onPress={onManage}
        theme={theme}
      />
      <View style={[styles.panel, { backgroundColor: theme.leather.soft, borderColor: theme.leather.accent + "33" }]}>
        <LightLeatherSurface theme={theme} />
        {upcoming.length ? upcoming.map((item) => (
          <ScheduleRow key={item.id} item={item} wallets={wallets} hidden={hidden} theme={theme} onPress={() => onRecord(item)} />
        )) : (
          <Text style={[styles.empty, { color: theme.muted }]}>
            {schedules.length ? "Nothing due in the next 30 days." : "Plan your bills and paydays here."}
          </Text>
        )}
      </View>
    </View>
  );
}

function ScheduleRow({ item, wallets, hidden, theme, onPress }: {
  item: DueSchedule;
  wallets: Wallet[];
  hidden: boolean;
  theme: ThemeColors;
  onPress: () => void;
}) {
  const wallet = wallets.find((value) => getWalletLocalId(value) === item.walletLocalId);
  const income = item.direction === "income";
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.soft }]}>
      <View style={[styles.icon, { backgroundColor: theme.accentSoft }]}>
        <Icon name={income ? "arrow-down" : "arrow-up"} size={17} color={income ? theme.positive : theme.accentText} />
      </View>
      <View style={styles.rowMain}>
        <Text style={[styles.label, { color: theme.ink }]} numberOfLines={1}>{item.title}</Text>
        <Text style={[styles.meta, { color: theme.muted }]} numberOfLines={1}>
          {item.daysAway > 30 ? displayDueDate(item.dueDate) : dueLabel(item.daysAway)} · {wallet?.name ?? "Choose a wallet"}
        </Text>
      </View>
      <Text style={[styles.label, { color: income ? theme.positive : theme.ink }]}>{hidden ? "••••" : money(item.amount)}</Text>
      <Icon name="chevron" size={15} color={theme.muted} />
    </Pressable>
  );
}

function newSchedule(wallets: Wallet[]): Schedule {
  return {
    id: `plan-${Date.now()}`,
    title: "", amount: 0, direction: "expense", category: "Bills",
    walletLocalId: wallets[0] ? getWalletLocalId(wallets[0]) : "",
    firstDue: localDateKey(), repeat: "monthly", reminder: false,
  };
}

export function ScheduleManager({ schedules, wallets, hidden, theme, onRecord, seed, onSave, onDelete }: ScheduleListProps & {
  seed?: Schedule | null;
  onSave: (schedule: Schedule) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Schedule | null>(() => seed ??
    (schedules.length === 0 && wallets.length ? newSchedule(wallets) : null));
  const [amount, setAmount] = useState(seed?.amount ? String(seed.amount) : "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showCategories, setShowCategories] = useState(false);

  const edit = (item: Schedule | null) => {
    setDraft(item);
    setAmount(item?.amount ? String(item.amount) : "");
    setError("");
    setConfirmDelete(false);
    setShowCategories(false);
  };

  const primary = (label: string, onPress: () => void, disabled = false, icon?: string) => (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        {
          overflow: "hidden",
          backgroundColor: disabled ? theme.soft : theme.leather.colors[1],
          borderColor: disabled ? theme.line : theme.leather.edge,
          opacity: disabled ? 0.65 : 1,
          transform: [{ scale: pressed && !disabled ? 0.98 : 1 }],
        },
        !disabled && cardShadow(theme.dark),
      ]}
    >
      {!disabled && <DarkLeatherSurface theme={theme} radius={16} />}
      {icon ? <Icon name={icon} size={15} color={disabled ? theme.muted : "#ffffff"} /> : null}
      <Text style={[styles.buttonText, { color: disabled ? theme.muted : "#ffffff" }]}>
        {label}
      </Text>
    </Pressable>
  );

  if (!draft) return (
    <View style={styles.manager}>
      {schedules.length > 0 && (
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
          {schedules.map((item, idx) => (
            <View key={item.id}>
              {idx > 0 ? (
                <View
                  style={[
                    styles.divider,
                    { backgroundColor: hexToRgba(theme.leather.accent, 0.14) },
                  ]}
                />
              ) : null}
              <ScheduleRow
                item={item}
                wallets={wallets}
                hidden={hidden}
                theme={theme}
                onPress={() => edit(item)}
              />
            </View>
          ))}
        </View>
      )}
      {wallets.length ? primary("Add schedule", () => edit(newSchedule(wallets)), false, "plus") : (
        <Text style={[styles.meta, { color: theme.muted }]}>Add a wallet before creating a schedule.</Text>
      )}
    </View>
  );

  const existing = schedules.find(({ id }) => id === draft.id);
  const categories = draft.direction === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const selectableWallets = wallets.some((w) => !w.isHidden)
    ? wallets.filter((w) => !w.isHidden || getWalletLocalId(w) === draft.walletLocalId)
    : wallets;
  const inputBoxStyle = [
    styles.inputWrap,
    {
      backgroundColor: theme.card,
      borderColor: hexToRgba(theme.leather.accent, 0.24),
    },
  ];
  const fieldLabel = (label: string) => <Text style={[styles.label, { color: theme.ink }]}>{label}</Text>;
  const choice = (label: string, active: boolean, onPress: () => void, key = label) => (
    <Pressable
      key={key}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        {
          overflow: "hidden",
          backgroundColor: active ? theme.leather.colors[1] : theme.card,
          borderColor: active
            ? theme.leather.edge
            : hexToRgba(theme.leather.accent, 0.24),
          transform: [{ scale: pressed ? 0.96 : 1 }],
        },
      ]}
    >
      {active ? (
        <DarkLeatherSurface theme={theme} radius={12} />
      ) : (
        <LightLeatherSurface theme={theme} radius={12} />
      )}
      <Text style={[styles.choiceText, { color: active ? "#ffffff" : theme.ink }]}>
        {label}
      </Text>
    </Pressable>
  );

  const save = async () => {
    if (busy) return;
    if (!draft.title.trim()) return setError("Enter a name for this schedule.");
    if (!/^\d+(\.\d{1,2})?$/.test(amount.trim()) || Number(amount) <= 0 || Number(amount) > 999_999_999) {
      return setError("Enter a positive amount with up to two decimal places.");
    }
    const firstDue = draft.firstDue.trim();
    if (!isDateKey(firstDue)) return setError("Enter a valid date in YYYY-MM-DD format.");
    if (!wallets.some((wallet) => getWalletLocalId(wallet) === draft.walletLocalId)) return setError("Choose a wallet.");
    setBusy(true);
    setError("");
    try {
      if (draft.reminder && !await requestReminderPermission()) {
        setError("Phone alerts are unavailable. Turn off the reminder below to save this schedule without alerts.");
        return;
      }
      await onSave({ ...draft, firstDue, title: draft.title.trim(), amount: Number(amount) });
      edit(null);
    } catch {
      setError("Could not save the schedule. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onDelete(draft.id);
      edit(null);
    } catch {
      setError("Could not remove the schedule. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.manager}>
      {existing && (
        <View
          style={[
            styles.summary,
            {
              overflow: "hidden",
              backgroundColor: theme.leather.colors[1],
              borderColor: theme.leather.edge,
            },
            cardShadow(theme.dark),
          ]}
        >
          <DarkLeatherSurface theme={theme} radius={18} />
          <Text style={[styles.summaryTitle, { color: "#ffffff" }]}>
            Next due {displayDueDate(existing.dueDate)}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => onRecord(existing)}
            disabled={busy}
            style={({ pressed }) => [
              styles.summaryCta,
              {
                overflow: "hidden",
                backgroundColor: theme.card,
                borderColor: hexToRgba(theme.leather.accent, 0.28),
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <LightLeatherSurface theme={theme} radius={14} />
            <Icon name="check" size={14} color={theme.leather.accent} />
            <Text style={[styles.label, { color: theme.ink }]}>
              Record transaction
            </Text>
          </Pressable>
        </View>
      )}
      <View style={styles.field}>
        {fieldLabel("Name")}
        <View style={inputBoxStyle}>
          <LightLeatherSurface theme={theme} radius={14} />
          <TextInput
            accessibilityLabel="Schedule name"
            style={[styles.inputField, { color: theme.ink }]}
            placeholder="Meralco, rent, or payday"
            placeholderTextColor={theme.muted}
            value={draft.title}
            maxLength={70}
            onChangeText={(title) => setDraft({ ...draft, title })}
          />
        </View>
      </View>
      <View style={styles.choices}>
        {choice("Bill", draft.direction === "expense", () => {
          if (draft.direction !== "expense") setDraft({ ...draft, direction: "expense", category: "Bills" });
        })}
        {choice("Income", draft.direction === "income", () => {
          if (draft.direction !== "income") setDraft({ ...draft, direction: "income", category: "Salary" });
        })}
      </View>
      <View style={styles.sideBySide}>
        <View style={[styles.field, styles.column]}>
          {fieldLabel("Amount (₱)")}
          <View style={inputBoxStyle}>
            <LightLeatherSurface theme={theme} radius={14} />
            <TextInput
              accessibilityLabel="Amount in pesos"
              style={[styles.inputField, { color: theme.ink }]}
              inputMode="decimal"
              placeholder="0.00"
              placeholderTextColor={theme.muted}
              value={amount}
              maxLength={12}
              onChangeText={setAmount}
            />
          </View>
        </View>
        <View style={[styles.field, styles.column]}>
          <View style={styles.dateLabel}>
            {fieldLabel("First due date")}
            <Pressable accessibilityRole="button" hitSlop={5} onPress={() => {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              setDraft({ ...draft, firstDue: localDateKey(tomorrow) });
              setError("");
              Keyboard.dismiss();
            }}>
              <Text style={[styles.meta, { color: theme.leather.accent }]}>Tomorrow</Text>
            </Pressable>
          </View>
          <View style={inputBoxStyle}>
            <LightLeatherSurface theme={theme} radius={14} />
            <TextInput
              accessibilityLabel="First due date, YYYY-MM-DD"
              style={[styles.inputField, { color: theme.ink }]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.muted}
              value={draft.firstDue}
              maxLength={10}
              autoCorrect={false}
              onChangeText={(firstDue) => setDraft({ ...draft, firstDue })}
            />
          </View>
        </View>
      </View>
      <View style={styles.field}>
        {fieldLabel("Repeats")}
        <View style={styles.choices}>
          {(Object.keys(REPEAT_OPTIONS) as Schedule["repeat"][]).map((repeat) =>
            choice(REPEAT_OPTIONS[repeat], draft.repeat === repeat, () => setDraft({ ...draft, repeat })))}
        </View>
      </View>
      <View style={styles.field}>
        {fieldLabel("Wallet")}
        <View style={styles.choices}>
          {selectableWallets.map((wallet) => choice(wallet.name, draft.walletLocalId === getWalletLocalId(wallet),
            () => setDraft({ ...draft, walletLocalId: getWalletLocalId(wallet) }), getWalletLocalId(wallet)))}
        </View>
      </View>
      <View style={styles.field}>
        {fieldLabel("Category")}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: showCategories }}
          onPress={() => setShowCategories(!showCategories)}
          style={[
            styles.categoryPicker,
            {
              overflow: "hidden",
              backgroundColor: theme.card,
              borderColor: hexToRgba(theme.leather.accent, 0.24),
            },
          ]}
        >
          <LightLeatherSurface theme={theme} radius={14} />
          <Text style={[styles.label, { color: theme.ink }]}>{draft.category}</Text>
          <Icon name="down" size={16} color={theme.muted} />
        </Pressable>
        {showCategories && <View style={styles.choices}>
          {categories.map(([category]) => choice(category, draft.category === category, () => {
            setDraft({ ...draft, category });
            setShowCategories(false);
          }))}
        </View>}
      </View>
      {supportsReminders && (
        <View
          style={[
            styles.reminderCard,
            {
              overflow: "hidden",
              backgroundColor: theme.card,
              borderColor: hexToRgba(theme.leather.accent, 0.22),
            },
          ]}
        >
          <LightLeatherSurface theme={theme} radius={16} />
          <View style={styles.rowMain}>
            {fieldLabel("Phone reminder")}
            <Text style={[styles.meta, { color: theme.muted }]}>On the due date, around 9 AM</Text>
          </View>
          <Switch
            accessibilityLabel="Phone reminder"
            value={draft.reminder}
            disabled={busy}
            trackColor={{
              false: hexToRgba(theme.leather.accent, 0.22),
              true: theme.leather.accent,
            }}
            onValueChange={(reminder) => setDraft({ ...draft, reminder })}
          />
        </View>
      )}
      {error ? <Text accessibilityRole="alert" style={[styles.meta, { color: "#c04444" }]}>{error}</Text> : null}
      {primary(busy ? "Saving…" : "Save schedule", save, busy, "check")}
      <View style={styles.footerActions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => { if (!busy) edit(null); }}
          style={({ pressed }) => [
            styles.footerBtn,
            {
              overflow: "hidden",
              backgroundColor: theme.card,
              borderColor: hexToRgba(theme.leather.accent, 0.24),
              transform: [{ scale: pressed ? 0.97 : 1 }],
            },
          ]}
        >
          <LightLeatherSurface theme={theme} radius={14} />
          <Text style={[styles.choiceText, { color: theme.ink }]}>
            Back to schedules
          </Text>
        </Pressable>
        {existing ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => { if (confirmDelete) void remove(); else setConfirmDelete(true); }}
            style={({ pressed }) => [
              styles.footerBtn,
              {
                overflow: "hidden",
                backgroundColor: confirmDelete ? "#c04444" : theme.card,
                borderColor: confirmDelete
                  ? "#a23434"
                  : hexToRgba("#9e3c42", 0.34),
                transform: [{ scale: pressed ? 0.97 : 1 }],
              },
            ]}
          >
            {!confirmDelete && <LightLeatherSurface theme={theme} radius={14} />}
            <Icon
              name="trash"
              size={14}
              color={
                confirmDelete
                  ? "#ffffff"
                  : theme.dark
                    ? "#f28b82"
                    : "#9e3c42"
              }
            />
            <Text
              style={[
                styles.choiceText,
                {
                  color: confirmDelete
                    ? "#ffffff"
                    : theme.dark
                      ? "#f28b82"
                      : "#9e3c42",
                },
              ]}
            >
              {confirmDelete ? "Confirm removal" : "Remove"}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  upcoming: { marginTop: 14, marginBottom: 16 },
  manager: { gap: 15, paddingBottom: 8 },
  panel: { borderWidth: 1, borderRadius: 18, overflow: "hidden" },
  divider: { height: 1, marginHorizontal: 14 },
  summary: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 10 },
  summaryTitle: { fontFamily: "Poppins_700Bold", fontSize: 13.5 },
  summaryCta: {
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 58, paddingHorizontal: 12, paddingVertical: 8 },
  rowMain: { flex: 1, gap: 1 },
  reminderCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 58,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  label: { fontFamily: "Poppins_700Bold", fontSize: 13, includeFontPadding: false },
  meta: { fontFamily: "Poppins_500Medium", fontSize: 12, includeFontPadding: false },
  empty: { fontFamily: "Poppins_500Medium", fontSize: 13, padding: 14 },
  icon: { width: 34, height: 34, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  sideBySide: { flexDirection: "row", gap: 12 },
  field: { gap: 6 },
  column: { flex: 1 },
  dateLabel: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 4 },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  choice: { minHeight: 40, alignItems: "center", justifyContent: "center", paddingHorizontal: 13, borderWidth: 1, borderRadius: 12 },
  choiceText: { fontFamily: "Poppins_700Bold", fontSize: 12, lineHeight: 16, includeFontPadding: false, marginTop: 1 },
  categoryPicker: { minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 13, borderWidth: 1, borderRadius: 14 },
  inputWrap: { minHeight: 46, borderRadius: 14, borderWidth: 1, justifyContent: "center", overflow: "hidden" },
  inputField: {
    height: 46,
    paddingHorizontal: 13,
    paddingVertical: 0,
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  button: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  buttonText: { fontFamily: "Poppins_700Bold", fontSize: 13.5, lineHeight: 18, includeFontPadding: false, marginTop: 1 },
  footerActions: { flexDirection: "row", gap: 10 },
  footerBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
});
