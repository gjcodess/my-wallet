import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import type { Favorite, FavoriteDraft } from "../types/favorite";
import { getWalletLocalId, money } from "../types/wallet";
import type { Wallet } from "../types/wallet";
import { Icon } from "./Icon";
import type { ThemeColors } from "./SharedUI";

type FavoritesProps = {
  favorites: Favorite[];
  wallets: Wallet[];
  hidden: boolean;
  theme: ThemeColors;
};

export function FavoriteStrip({ favorites, wallets, hidden, theme, onApply, onManage }: FavoritesProps & {
  onApply: (favorite: Favorite) => void;
  onManage: () => void;
}) {
  if (!favorites.length) return null;
  return (
    <View style={styles.strip}>
      <View style={styles.header}>
        <Icon name="star" size={17} color={theme.accentText} />
        <Text style={[styles.label, styles.grow, { color: theme.ink }]}>Favorites</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Manage favorites" hitSlop={8} onPress={onManage}>
          <Text style={[styles.meta, { color: theme.accentText }]}>Manage</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.chips}>
        {favorites.map((item) => {
          const wallet = wallets.find((wallet) => getWalletLocalId(wallet) === item.walletLocalId);
          const summary = wallet && !hidden && item.defaultAmount ? `${wallet.name} · ${money(item.defaultAmount)}`
            : wallet?.name ?? "Wallet unavailable";
          return (
            <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Use ${item.name}, ${summary}`}
              accessibilityState={{ disabled: !wallet }} disabled={!wallet}
              onPress={() => onApply(item)} style={({ pressed }) => [styles.chip, {
                backgroundColor: pressed ? theme.accentSoft : theme.card, borderColor: theme.line,
              }]}>
              <Text style={[styles.label, { color: wallet ? theme.ink : theme.muted }]} numberOfLines={1}>{item.name}</Text>
              <Text style={[styles.meta, { color: theme.muted }]} numberOfLines={1}>{summary}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function FavoriteList({ favorites, wallets, hidden, theme, onEdit }: FavoritesProps & {
  onEdit: (item: Favorite) => void;
}) {
  return (
    <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.line }]}>
      {favorites.length ? favorites.map((item, index) => {
        const wallet = wallets.find((wallet) => getWalletLocalId(wallet) === item.walletLocalId);
        return (
          <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Edit ${item.name}`}
            onPress={() => onEdit(item)} style={({ pressed }) => [styles.row, {
              backgroundColor: pressed ? theme.soft : theme.card, borderTopColor: theme.line,
            }, index > 0 && styles.separator]}>
            <Icon name="star" size={18} color={theme.accentText} />
            <View style={styles.grow}>
              <Text style={[styles.label, { color: theme.ink }]}>{item.name}</Text>
              <Text style={[styles.meta, { color: theme.muted }]}>{item.category} · {wallet?.name ?? "Wallet unavailable"}</Text>
            </View>
            {!hidden && item.defaultAmount !== null && <Text style={[styles.meta, { color: theme.muted }]}>{money(item.defaultAmount)}</Text>}
            <Icon name="chevron" size={16} color={theme.muted} />
          </Pressable>
        );
      }) : (
        <Text style={[styles.empty, { color: theme.muted }]}>Save a favorite from Add Transaction or a past transaction.</Text>
      )}
    </View>
  );
}

export function FavoriteEditor({ draft, wallets, hidden, theme, onSave, onRemove, onDone }: {
  draft: FavoriteDraft;
  wallets: Wallet[];
  hidden: boolean;
  theme: ThemeColors;
  onSave: (item: Favorite) => Promise<void>;
  onRemove?: (id: string) => Promise<void>;
  onDone: () => void;
}) {
  const item = draft.favorite;
  const [name, setName] = useState(item.name);
  const [walletId, setWalletId] = useState(item.walletLocalId);
  const [useAmount, setUseAmount] = useState(item.defaultAmount !== null);
  const [amount, setAmount] = useState(draft.suggestedAmount === null ? "" : String(draft.suggestedAmount));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const value = Number(amount.trim());
  const validAmount = /^\d+(\.\d{1,2})?$/.test(amount.trim()) && value > 0 && value <= 999_999_999;
  const walletAvailable = wallets.some((wallet) => getWalletLocalId(wallet) === walletId);
  const valid = Boolean(name.trim()) && walletAvailable && (!useAmount || validAmount);
  const inputStyle = [styles.input, { borderColor: theme.line, color: theme.ink, backgroundColor: theme.card }];

  const save = async (remove = false) => {
    if (saving || (!remove && !valid)) return;
    setSaving(true);
    setError("");
    try {
      if (remove && onRemove) await onRemove(item.id);
      else await onSave({ ...item, name: name.trim(), walletLocalId: walletId, defaultAmount: useAmount ? value : null });
      onDone();
    } catch {
      setError(remove ? "Could not remove the favorite. Try again." : "Could not save the favorite. Try again.");
      setSaving(false);
    }
  };

  return (
    <View style={styles.editor}>
      <View style={styles.field}>
        <Text style={[styles.label, { color: theme.ink }]}>Favorite name</Text>
        <TextInput accessibilityLabel="Favorite name" value={name} onChangeText={setName} maxLength={70}
          editable={!saving} placeholder="Coffee or commute" placeholderTextColor={theme.muted} style={inputStyle} />
        <Text style={[styles.meta, { color: theme.muted }]}>
          {item.direction === "expense" ? "Expense" : "Money in"} · {item.category}
        </Text>
      </View>
      <View style={styles.field}>
        <Text style={[styles.label, { color: theme.ink }]}>Wallet</Text>
        {!walletAvailable && <Text style={[styles.meta, { color: theme.muted }]}>Choose an available wallet.</Text>}
        <View style={styles.wallets}>
          {wallets.map((wallet) => {
            const id = getWalletLocalId(wallet);
            const active = id === walletId;
            return (
              <Pressable key={id} accessibilityRole="button" accessibilityState={{ selected: active }}
                disabled={saving} onPress={() => setWalletId(id)} style={[styles.walletChip, {
                  backgroundColor: active ? theme.accentSoft : theme.card, borderColor: active ? theme.accentText : theme.line,
                }]}>
                <Text style={[styles.meta, { color: active ? theme.accentText : theme.ink }]}>{wallet.name}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={styles.field}>
        <View style={styles.header}>
          <View style={styles.grow}>
            <Text style={[styles.label, { color: theme.ink }]}>Use a default amount</Text>
            <Text style={[styles.meta, { color: theme.muted }]}>You can change it each time you log it.</Text>
          </View>
          <Switch accessibilityLabel="Use a default amount" value={useAmount} disabled={saving}
            thumbColor="#ffffff" trackColor={{ false: theme.soft2, true: theme.accent }} onValueChange={setUseAmount} />
        </View>
        {useAmount && <TextInput accessibilityLabel="Default amount in pesos" value={amount} onChangeText={setAmount}
          editable={!saving} inputMode="decimal" secureTextEntry={hidden} maxLength={12}
          placeholder="0.00" placeholderTextColor={theme.muted} style={inputStyle} />}
        {useAmount && amount.length > 0 && !validAmount && (
          <Text style={[styles.meta, { color: theme.muted }]}>Enter a positive amount with up to two decimal places.</Text>
        )}
      </View>
      {error ? <Text accessibilityRole="alert" style={[styles.meta, { color: theme.ink }]}>{error}</Text> : null}
      <Pressable accessibilityRole="button" disabled={!valid || saving} onPress={() => { void save(); }}
        style={[styles.button, { backgroundColor: valid && !saving ? theme.accent : theme.soft }]}>
        <Text style={[styles.label, { color: valid && !saving ? theme.accentInk : theme.muted }]}>
          {saving ? "Saving…" : "Save favorite"}
        </Text>
      </Pressable>
      {onRemove && <Pressable accessibilityRole="button" disabled={saving} onPress={() => { void save(true); }}
        style={[styles.button, { backgroundColor: theme.soft }]}>
        <Text style={[styles.label, { color: theme.dark ? "#ffadad" : "#9e343c" }]}>Remove favorite</Text>
      </Pressable>}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { gap: 8, marginBottom: 14 },
  header: { flexDirection: "row", alignItems: "center", gap: 7 },
  chips: { gap: 8 },
  chip: { minHeight: 51, minWidth: 92, maxWidth: 205, borderRadius: 13, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 7 },
  panel: { borderWidth: 1, borderRadius: 16, overflow: "hidden" },
  row: { minHeight: 57, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 12, paddingVertical: 8 },
  separator: { borderTopWidth: StyleSheet.hairlineWidth },
  grow: { flex: 1 },
  empty: { fontFamily: "Poppins_500Medium", fontSize: 13, padding: 14 },
  label: { fontFamily: "Poppins_600SemiBold", fontSize: 13 },
  meta: { fontFamily: "Poppins_500Medium", fontSize: 12 },
  editor: { gap: 16, paddingBottom: 4 },
  field: { gap: 6 },
  input: { minHeight: 46, borderRadius: 12, borderWidth: 1, paddingHorizontal: 11, fontFamily: "Poppins_500Medium", fontSize: 14 },
  wallets: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  walletChip: { minHeight: 44, justifyContent: "center", borderRadius: 12, borderWidth: 1, paddingHorizontal: 10 },
  button: { minHeight: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
