import React, { useState } from "react";
import { Keyboard, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { requestReminderPermission, supportsReminders } from "../lib/scheduleReminders";
import { displayDueDate, dueLabel, isDateKey, localDateKey, REPEAT_OPTIONS } from "../types/schedule";
import type { DueSchedule, Schedule } from "../types/schedule";
import { EXPENSE_CATEGORIES, getWalletLocalId, INCOME_CATEGORIES, money } from "../types/wallet";
import type { Wallet } from "../types/wallet";
import { Icon } from "./Icon";
import { LightLeatherSurface, SectionTitle, ThemeColors } from "./SharedUI";

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

  const primary = (label: string, onPress: () => void, disabled = false) => (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled}
      style={[styles.button, { backgroundColor: disabled ? theme.soft : theme.accent }]}>
      <Text style={[styles.label, { color: disabled ? theme.muted : theme.accentInk }]}>{label}</Text>
    </Pressable>
  );

  if (!draft) return (
    <View style={styles.manager}>
      {schedules.length > 0 && (
        <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.line }]}>
          {schedules.map((item) => (
            <ScheduleRow key={item.id} item={item} wallets={wallets} hidden={hidden} theme={theme} onPress={() => edit(item)} />
          ))}
        </View>
      )}
      {wallets.length ? primary("Add schedule", () => edit(newSchedule(wallets))) : (
        <Text style={[styles.meta, { color: theme.muted }]}>Add a wallet before creating a schedule.</Text>
      )}
    </View>
  );

  const existing = schedules.find(({ id }) => id === draft.id);
  const categories = draft.direction === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const inputStyle = [styles.input, { backgroundColor: theme.card, borderColor: theme.line, color: theme.ink }];
  const fieldLabel = (label: string) => <Text style={[styles.label, { color: theme.ink }]}>{label}</Text>;
  const choice = (label: string, active: boolean, onPress: () => void, key = label) => (
    <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress}
      style={[styles.choice, { backgroundColor: active ? theme.accentSoft : theme.card, borderColor: active ? theme.accentText : theme.line }]}>
      <Text style={[styles.meta, { color: active ? theme.accentText : theme.ink }]}>{label}</Text>
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
        <View style={[styles.summary, { backgroundColor: theme.accentSoft }]}>
          {fieldLabel(`Next due ${displayDueDate(existing.dueDate)}`)}
          {primary("Record transaction", () => onRecord(existing), busy)}
        </View>
      )}
      <View style={styles.field}>
        {fieldLabel("Name")}
        <TextInput accessibilityLabel="Schedule name" style={inputStyle} placeholder="Meralco, rent, or payday"
          placeholderTextColor={theme.muted} value={draft.title} maxLength={70}
          onChangeText={(title) => setDraft({ ...draft, title })} />
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
          <TextInput accessibilityLabel="Amount in pesos" style={inputStyle} inputMode="decimal" placeholder="0.00"
            placeholderTextColor={theme.muted} value={amount} maxLength={12} onChangeText={setAmount} />
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
              <Text style={[styles.meta, { color: theme.accentText }]}>Tomorrow</Text>
            </Pressable>
          </View>
          <TextInput accessibilityLabel="First due date, YYYY-MM-DD" style={inputStyle} placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.muted} value={draft.firstDue} maxLength={10} autoCorrect={false}
            onChangeText={(firstDue) => setDraft({ ...draft, firstDue })} />
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
          {wallets.map((wallet) => choice(wallet.name, draft.walletLocalId === getWalletLocalId(wallet),
            () => setDraft({ ...draft, walletLocalId: getWalletLocalId(wallet) }), getWalletLocalId(wallet)))}
        </View>
      </View>
      <View style={styles.field}>
        {fieldLabel("Category")}
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: showCategories }}
          onPress={() => setShowCategories(!showCategories)}
          style={[styles.categoryPicker, { backgroundColor: theme.card, borderColor: theme.line }]}>
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
        <View style={styles.row}>
          <View style={styles.rowMain}>
            {fieldLabel("Phone reminder")}
            <Text style={[styles.meta, { color: theme.muted }]}>On the due date, around 9 AM</Text>
          </View>
          <Switch accessibilityLabel="Phone reminder" value={draft.reminder} disabled={busy}
            trackColor={{ false: theme.soft2, true: theme.accent }}
            onValueChange={(reminder) => setDraft({ ...draft, reminder })} />
        </View>
      )}
      {error ? <Text accessibilityRole="alert" style={[styles.meta, { color: theme.ink }]}>{error}</Text> : null}
      {primary(busy ? "Saving…" : "Save schedule", save, busy)}
      <View style={styles.choices}>
        {choice("Back to schedules", false, () => { if (!busy) edit(null); })}
        {existing && choice(confirmDelete ? "Confirm removal" : "Remove schedule", false,
          () => { if (confirmDelete) void remove(); else setConfirmDelete(true); })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  upcoming: { marginTop: 14, marginBottom: 16 },
  manager: { gap: 16, paddingBottom: 8 },
  panel: { borderWidth: 1, borderRadius: 16, overflow: "hidden" },
  summary: { borderRadius: 16, padding: 12, gap: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 58, paddingHorizontal: 12, paddingVertical: 8 },
  rowMain: { flex: 1, gap: 1 },
  label: { fontFamily: "Poppins_600SemiBold", fontSize: 13 },
  meta: { fontFamily: "Poppins_500Medium", fontSize: 12 },
  empty: { fontFamily: "Poppins_500Medium", fontSize: 13, padding: 14 },
  icon: { width: 34, height: 34, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  sideBySide: { flexDirection: "row", gap: 12 },
  field: { gap: 6 },
  column: { flex: 1 },
  dateLabel: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 4 },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  choice: { minHeight: 44, justifyContent: "center", paddingHorizontal: 11, borderWidth: 1, borderRadius: 12 },
  categoryPicker: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 11, borderWidth: 1, borderRadius: 12 },
  input: { minHeight: 46, borderRadius: 12, borderWidth: 1, paddingHorizontal: 11, fontFamily: "Poppins_500Medium", fontSize: 14 },
  button: { minHeight: 46, borderRadius: 13, alignItems: "center", justifyContent: "center" },
});
