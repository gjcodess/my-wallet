import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  currentMonthKey,
  getPayLaterDueStatus,
  getPayLaterPreset,
  PAYLATER_PRESETS,
  type PayLaterAccount,
  type PayLaterPresetKey,
} from "../types/paylater";
import { money, type Wallet } from "../types/wallet";
import { ScalePressable } from "../lib/motion";
import { Icon } from "./Icon";
import {
  cardShadow,
  DarkLeatherSurface,
  hexToRgba,
  LightLeatherSurface,
  SaffianoSheetSurface,
  type ThemeColors,
} from "./SharedUI";
import { WalletLogoBadge } from "./WalletFolder";

type EditorMode =
  | { type: "list" }
  | { type: "edit"; editingId: string | null }
  | { type: "pay"; item: PayLaterAccount };

export const PayLaterModal = React.memo(function PayLaterModal({
  visible,
  accounts,
  wallets,
  hidden,
  theme,
  onSaveAccount,
  onDeleteAccount,
  onPayAccount,
  onTogglePaid,
  onClose,
}: {
  visible: boolean;
  accounts: PayLaterAccount[];
  wallets: Wallet[];
  hidden: boolean;
  theme: ThemeColors;
  onSaveAccount: (item: PayLaterAccount) => void;
  onDeleteAccount: (id: string) => void;
  onPayAccount: (item: PayLaterAccount, wallet: Wallet) => void;
  onTogglePaid: (id: string) => void;
  onClose: () => void;
}) {
  const [renderedVisible, setRenderedVisible] = useState(visible);
  const [mode, setMode] = useState<EditorMode>({ type: "list" });

  // Editor state
  const [providerKey, setProviderKey] = useState<PayLaterPresetKey>("spaylater");
  const [name, setName] = useState("SPayLater");
  const [amountText, setAmountText] = useState("");
  const [dueDayText, setDueDayText] = useState("15");
  const [totalMonthsText, setTotalMonthsText] = useState("");
  const [paidMonthsText, setPaidMonthsText] = useState("");
  const [note, setNote] = useState("");
  const [selectedWalletId, setSelectedWalletId] = useState<number | null>(null);

  const sheetAnim = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const closingRef = useRef(false);

  const visibleWallets = useMemo(
    () => wallets.filter((w) => !w.isHidden),
    [wallets]
  );

  useEffect(() => {
    if (visible) {
      closingRef.current = false;
      setRenderedVisible(true);
      setMode({ type: "list" });
      sheetAnim.stopAnimation();
      sheetAnim.setValue(0);
      Animated.timing(sheetAnim, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else if (renderedVisible && !closingRef.current) {
      closingRef.current = true;
      sheetAnim.stopAnimation();
      Animated.timing(sheetAnim, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          closingRef.current = false;
          setRenderedVisible(false);
        }
      });
    }
  }, [visible, renderedVisible, sheetAnim]);

  const dismiss = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    sheetAnim.stopAnimation();
    Animated.timing(sheetAnim, {
      toValue: 0,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      closingRef.current = false;
      if (finished) {
        setRenderedVisible(false);
        onClose();
      }
    });
  }, [onClose, sheetAnim]);

  const sortedAccounts = useMemo(() => {
    const now = new Date();
    return [...accounts].sort((a, b) => {
      const sa = getPayLaterDueStatus(a, now);
      const sb = getPayLaterDueStatus(b, now);
      if (sa.paid !== sb.paid) return sa.paid ? 1 : -1;
      return sa.daysUntil - sb.daysUntil;
    });
  }, [accounts]);

  const unpaidTotal = useMemo(() => {
    const now = new Date();
    return accounts.reduce((sum, item) => {
      const st = getPayLaterDueStatus(item, now);
      return st.paid ? sum : sum + item.dueAmount;
    }, 0);
  }, [accounts]);

  const openAdd = useCallback(() => {
    const firstUnused =
      PAYLATER_PRESETS.find(
        (p) => p.key !== "custom" && !accounts.some((a) => a.providerKey === p.key)
      ) || PAYLATER_PRESETS[0];
    setProviderKey(firstUnused.key);
    setName(firstUnused.key === "custom" ? "" : firstUnused.name);
    setAmountText("");
    setDueDayText("15");
    setTotalMonthsText("");
    setPaidMonthsText("");
    setNote("");
    setMode({ type: "edit", editingId: null });
  }, [accounts]);

  const openEdit = useCallback((item: PayLaterAccount) => {
    setProviderKey(item.providerKey);
    setName(item.name);
    setAmountText(item.dueAmount > 0 ? String(item.dueAmount) : "");
    setDueDayText(String(item.dueDay));
    setTotalMonthsText(item.totalMonths ? String(item.totalMonths) : "");
    setPaidMonthsText(
      item.totalMonths && item.paidMonthsCount !== undefined
        ? String(item.paidMonthsCount)
        : ""
    );
    setNote(item.note || "");
    setMode({ type: "edit", editingId: item.id });
  }, []);

  const openPay = useCallback(
    (item: PayLaterAccount) => {
      setSelectedWalletId(visibleWallets[0]?.id ?? null);
      setMode({ type: "pay", item });
    },
    [visibleWallets]
  );

  const handleSubmitEdit = useCallback(() => {
    if (mode.type !== "edit") return;
    const cleanName = name.trim() || getPayLaterPreset(providerKey).name;
    const parsedAmt = Math.max(0, Number(amountText.replace(/,/g, "")) || 0);
    const parsedDay = Math.max(
      1,
      Math.min(31, Math.round(Number(dueDayText) || 15))
    );
    const rawTotalM = Math.round(Number(totalMonthsText) || 0);
    const validTotalM = rawTotalM > 0 ? rawTotalM : undefined;
    const rawPaidM = Math.round(Number(paidMonthsText) || 0);
    const validPaidM = validTotalM
      ? Math.max(0, Math.min(validTotalM, rawPaidM))
      : undefined;
    const existing = mode.editingId
      ? accounts.find((a) => a.id === mode.editingId)
      : undefined;

    const nextItem: PayLaterAccount = {
      id: existing?.id ?? `pl-${Date.now()}`,
      providerKey,
      name: cleanName,
      dueAmount: parsedAmt,
      dueDay: parsedDay,
      totalMonths: validTotalM,
      paidMonthsCount: validPaidM,
      note: note.trim() || undefined,
      paidMonth: existing?.paidMonth,
      lastPaidAt: existing?.lastPaidAt,
      updatedAt: new Date().toISOString(),
    };
    onSaveAccount(nextItem);
    setMode({ type: "list" });
  }, [accounts, amountText, dueDayText, mode, name, note, onSaveAccount, paidMonthsText, providerKey, totalMonthsText]);

  const handleConfirmPay = useCallback(() => {
    if (mode.type !== "pay") return;
    const wallet = visibleWallets.find((w) => w.id === selectedWalletId);
    if (!wallet) return;
    onPayAccount(mode.item, wallet);
    setMode({ type: "list" });
  }, [mode, onPayAccount, selectedWalletId, visibleWallets]);

  return (
    <Modal
      transparent
      visible={renderedVisible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => {
        if (mode.type !== "list") {
          setMode({ type: "list" });
        } else {
          dismiss();
        }
      }}
    >
      <View style={styles.root}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: "rgba(8, 12, 20, 0.56)",
              opacity: sheetAnim,
            },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
        </Animated.View>
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: theme.page,
              borderColor: hexToRgba(theme.leather.accent, 0.24),
              transform: [
                {
                  translateY: sheetAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [560, 0],
                  }),
                },
              ],
            },
            cardShadow(theme.dark),
          ]}
        >
          <SaffianoSheetSurface theme={theme} radius={28} />
          <View
            style={[
              styles.handle,
              { backgroundColor: hexToRgba(theme.leather.accent, 0.26) },
            ]}
          />

          {mode.type === "list" ? (
            <>
              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.title, { color: theme.ink }]}>
                    PayLater bills
                  </Text>
                  <Text style={[styles.subtitle, { color: theme.muted }]}>
                    {accounts.length === 0
                      ? "Track SPayLater, LazPayLater, Atome & more"
                      : `Unpaid this month: ${hidden ? "₱••••" : money(unpaidTotal)}`}
                  </Text>
                </View>
                <ScalePressable
                  onPress={openAdd}
                  scaleTo={0.94}
                  style={[
                    styles.addPill,
                    {
                      overflow: "hidden",
                      backgroundColor: theme.leather.colors[1],
                      borderColor: theme.leather.edge,
                    },
                    cardShadow(theme.dark),
                  ]}
                >
                  <DarkLeatherSurface theme={theme} radius={13} />
                  <Icon name="plus" size={14} color="#ffffff" />
                  <Text style={styles.addPillText}>Add</Text>
                </ScalePressable>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
              >
                {sortedAccounts.length === 0 ? (
                  <View
                    style={[
                      styles.emptyBox,
                      {
                        backgroundColor: theme.card,
                        borderColor: hexToRgba(theme.leather.accent, 0.22),
                      },
                    ]}
                  >
                    <LightLeatherSurface theme={theme} radius={18} />
                    <Icon name="card" size={26} color={theme.leather.accent} />
                    <Text style={[styles.emptyTitle, { color: theme.ink }]}>
                      No PayLater bills yet
                    </Text>
                    <Text style={[styles.emptySub, { color: theme.muted }]}>
                      Add your SPayLater, LazPayLater, TikTok PayLater, or Atome
                      account and update your monthly bill anytime.
                    </Text>
                    <ScalePressable
                      onPress={openAdd}
                      scaleTo={0.96}
                      style={[
                        styles.emptyBtn,
                        {
                          overflow: "hidden",
                          backgroundColor: theme.leather.colors[1],
                          borderColor: theme.leather.edge,
                        },
                      ]}
                    >
                      <DarkLeatherSurface theme={theme} radius={14} />
                      <Icon name="plus" size={14} color="#ffffff" />
                      <Text style={styles.emptyBtnText}>Add PayLater</Text>
                    </ScalePressable>
                  </View>
                ) : (
                  sortedAccounts.map((item) => {
                    const preset = getPayLaterPreset(item.providerKey);
                    const status = getPayLaterDueStatus(item);
                    const statusColor =
                      status.tone === "paid"
                        ? "#10b981"
                        : status.tone === "overdue"
                          ? "#e11d48"
                          : status.tone === "soon"
                            ? "#d97706"
                            : theme.muted;

                    return (
                      <View
                        key={item.id}
                        style={[
                          styles.itemCard,
                          {
                            overflow: "hidden",
                            backgroundColor: theme.card,
                            borderColor: hexToRgba(theme.leather.accent, 0.22),
                            opacity: status.paid ? 0.78 : 1,
                          },
                          cardShadow(theme.dark),
                        ]}
                      >
                        <LightLeatherSurface theme={theme} radius={18} />
                        <View style={styles.itemTop}>
                          <View
                            style={[
                              styles.badge,
                              { backgroundColor: preset.accent },
                            ]}
                          >
                            <Text style={[styles.badgeText, { color: preset.ink }]}>
                              {preset.short}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[styles.itemName, { color: theme.ink }]}
                              numberOfLines={1}
                            >
                              {item.name}
                            </Text>
                            <Text
                              style={[styles.itemStatus, { color: statusColor }]}
                              numberOfLines={1}
                            >
                              {status.label}
                              {item.totalMonths
                                ? ` · ${item.paidMonthsCount ?? 0}/${item.totalMonths} mos`
                                : ""}
                              {item.note ? ` · ${item.note}` : ""}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.itemAmount,
                              {
                                color: status.paid ? theme.muted : theme.ink,
                                textDecorationLine: status.paid
                                  ? "line-through"
                                  : "none",
                              },
                            ]}
                          >
                            {hidden ? "₱••••" : money(item.dueAmount)}
                          </Text>
                        </View>

                        <View style={styles.itemActions}>
                          <Pressable
                            onPress={() => openEdit(item)}
                            style={({ pressed }) => [
                              styles.actionChip,
                              {
                                backgroundColor: hexToRgba(
                                  theme.leather.accent,
                                  theme.dark ? 0.16 : 0.08
                                ),
                                opacity: pressed ? 0.72 : 1,
                              },
                            ]}
                          >
                            <Icon name="edit" size={12.5} color={theme.ink} />
                            <Text style={[styles.actionChipText, { color: theme.ink }]}>
                              Update bill
                            </Text>
                          </Pressable>

                          {status.paid ? (
                            <Pressable
                              onPress={() => onTogglePaid(item.id)}
                              style={({ pressed }) => [
                                styles.actionChip,
                                {
                                  backgroundColor: hexToRgba("#10b981", 0.16),
                                  opacity: pressed ? 0.72 : 1,
                                },
                              ]}
                            >
                              <Icon name="check" size={12.5} color="#10b981" />
                              <Text
                                style={[
                                  styles.actionChipText,
                                  { color: "#10b981" },
                                ]}
                              >
                                Paid · Undo
                              </Text>
                            </Pressable>
                          ) : item.dueAmount > 0 && visibleWallets.length > 0 ? (
                            <Pressable
                              onPress={() => openPay(item)}
                              style={({ pressed }) => [
                                styles.payChip,
                                {
                                  overflow: "hidden",
                                  backgroundColor: theme.leather.colors[1],
                                  opacity: pressed ? 0.85 : 1,
                                },
                              ]}
                            >
                              <DarkLeatherSurface theme={theme} radius={10} />
                              <Icon name="check" size={12.5} color="#ffffff" />
                              <Text style={styles.payChipText}>Pay bill</Text>
                            </Pressable>
                          ) : (
                            <Pressable
                              onPress={() => onTogglePaid(item.id)}
                              style={({ pressed }) => [
                                styles.actionChip,
                                {
                                  backgroundColor: hexToRgba(
                                    theme.leather.accent,
                                    theme.dark ? 0.16 : 0.08
                                  ),
                                  opacity: pressed ? 0.72 : 1,
                                },
                              ]}
                            >
                              <Icon name="check" size={12.5} color={theme.ink} />
                              <Text style={[styles.actionChipText, { color: theme.ink }]}>
                                Mark paid
                              </Text>
                            </Pressable>
                          )}
                        </View>
                      </View>
                    );
                  })
                )}
              </ScrollView>

              <ScalePressable
                onPress={dismiss}
                scaleTo={0.97}
                style={[
                  styles.closeBtn,
                  {
                    overflow: "hidden",
                    backgroundColor: theme.card,
                    borderColor: hexToRgba(theme.leather.accent, 0.26),
                  },
                ]}
              >
                <LightLeatherSurface theme={theme} radius={16} />
                <Text style={[styles.closeBtnText, { color: theme.ink }]}>
                  Done
                </Text>
              </ScalePressable>
            </>
          ) : mode.type === "edit" ? (
            <>
              <View style={styles.header}>
                <ScalePressable
                  onPress={() => setMode({ type: "list" })}
                  scaleTo={0.92}
                  accessibilityRole="button"
                  accessibilityLabel="Back to PayLater list"
                  style={[
                    styles.backBtn,
                    {
                      overflow: "hidden",
                      backgroundColor: theme.leather.edge,
                      borderColor: theme.leather.edge,
                    },
                    cardShadow(theme.dark),
                  ]}
                >
                  <DarkLeatherSurface theme={theme} radius={20} />
                  <Icon name="back" size={18} color="#ffffff" />
                </ScalePressable>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.title, { color: theme.ink }]}>
                    {mode.editingId ? "Update PayLater" : "Add PayLater"}
                  </Text>
                  <Text style={[styles.subtitle, { color: theme.muted }]}>
                    Set your monthly bill, due day & term
                  </Text>
                </View>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.scroll}
                contentContainerStyle={styles.editorContent}
              >
                <Text style={[styles.fieldLabel, { color: theme.muted, marginLeft: 2 }]}>
                  Provider
                </Text>
                <View style={styles.presetGrid}>
                  {[0, 3, 6].map((rowStart) => (
                    <View key={rowStart} style={styles.presetRow}>
                      {PAYLATER_PRESETS.slice(rowStart, rowStart + 3).map((p) => {
                        const active = providerKey === p.key;
                        return (
                          <Pressable
                            key={p.key}
                            onPress={() => {
                              setProviderKey(p.key);
                              if (!mode.editingId || PAYLATER_PRESETS.some((x) => x.name === name)) {
                                setName(p.key === "custom" ? "" : p.name);
                              }
                            }}
                            style={({ pressed }) => [
                              styles.presetChip,
                              {
                                overflow: "hidden",
                                backgroundColor: active
                                  ? theme.leather.colors[1]
                                  : theme.card,
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
                            <View
                              style={[
                                styles.presetDot,
                                { backgroundColor: p.accent },
                              ]}
                            />
                            <Text
                              style={[
                                styles.presetChipText,
                                { color: active ? "#ffffff" : theme.ink },
                              ]}
                              numberOfLines={1}
                              adjustsFontSizeToFit
                            >
                              {p.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ))}
                </View>

                <View
                  style={[
                    styles.softField,
                    {
                      overflow: "hidden",
                      backgroundColor: theme.card,
                      borderColor: hexToRgba(theme.leather.accent, 0.24),
                    },
                  ]}
                >
                  <LightLeatherSurface theme={theme} radius={18} />
                  <Text style={[styles.fieldLabel, { color: theme.muted }]}>
                    Display name
                  </Text>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g. SPayLater"
                    placeholderTextColor={theme.muted}
                    style={[styles.fieldInput, { color: theme.ink }]}
                  />
                </View>

                <View style={styles.twoCol}>
                  <View
                    style={[
                      styles.softField,
                      {
                        flex: 1.4,
                        overflow: "hidden",
                        backgroundColor: theme.card,
                        borderColor: hexToRgba(theme.leather.accent, 0.24),
                      },
                    ]}
                  >
                    <LightLeatherSurface theme={theme} radius={18} />
                    <Text style={[styles.fieldLabel, { color: theme.muted }]}>
                      Monthly bill (₱)
                    </Text>
                    <TextInput
                      value={amountText}
                      onChangeText={setAmountText}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor={theme.muted}
                      style={[styles.fieldInput, { color: theme.ink }]}
                    />
                  </View>
                  <View
                    style={[
                      styles.softField,
                      {
                        flex: 1,
                        overflow: "hidden",
                        backgroundColor: theme.card,
                        borderColor: hexToRgba(theme.leather.accent, 0.24),
                      },
                    ]}
                  >
                    <LightLeatherSurface theme={theme} radius={18} />
                    <Text style={[styles.fieldLabel, { color: theme.muted }]}>
                      Due day (1-31)
                    </Text>
                    <TextInput
                      value={dueDayText}
                      onChangeText={setDueDayText}
                      keyboardType="number-pad"
                      placeholder="15"
                      placeholderTextColor={theme.muted}
                      maxLength={2}
                      style={[styles.fieldInput, { color: theme.ink }]}
                    />
                  </View>
                </View>

                <View style={styles.twoCol}>
                  <View
                    style={[
                      styles.softField,
                      {
                        flex: 1,
                        overflow: "hidden",
                        backgroundColor: theme.card,
                        borderColor: hexToRgba(theme.leather.accent, 0.24),
                      },
                    ]}
                  >
                    <LightLeatherSurface theme={theme} radius={18} />
                    <Text style={[styles.fieldLabel, { color: theme.muted }]}>
                      Months (optional)
                    </Text>
                    <TextInput
                      value={totalMonthsText}
                      onChangeText={setTotalMonthsText}
                      keyboardType="number-pad"
                      placeholder="e.g. 6"
                      placeholderTextColor={theme.muted}
                      maxLength={2}
                      style={[styles.fieldInput, { color: theme.ink }]}
                    />
                  </View>
                  <View
                    style={[
                      styles.softField,
                      {
                        flex: 1,
                        overflow: "hidden",
                        backgroundColor: theme.card,
                        borderColor: hexToRgba(theme.leather.accent, 0.24),
                      },
                    ]}
                  >
                    <LightLeatherSurface theme={theme} radius={18} />
                    <Text style={[styles.fieldLabel, { color: theme.muted }]}>
                      Paid months (opt.)
                    </Text>
                    <TextInput
                      value={paidMonthsText}
                      onChangeText={setPaidMonthsText}
                      keyboardType="number-pad"
                      placeholder="0"
                      placeholderTextColor={theme.muted}
                      maxLength={2}
                      style={[styles.fieldInput, { color: theme.ink }]}
                    />
                  </View>
                </View>

                <View
                  style={[
                    styles.softField,
                    {
                      overflow: "hidden",
                      backgroundColor: theme.card,
                      borderColor: hexToRgba(theme.leather.accent, 0.24),
                    },
                  ]}
                >
                  <LightLeatherSurface theme={theme} radius={18} />
                  <Text style={[styles.fieldLabel, { color: theme.muted }]}>
                    Note (optional)
                  </Text>
                  <TextInput
                    value={note}
                    onChangeText={setNote}
                    placeholder="e.g. 5th of every month"
                    placeholderTextColor={theme.muted}
                    style={[styles.fieldInput, { color: theme.ink }]}
                  />
                </View>
              </ScrollView>

              <View style={styles.footer}>
                {mode.editingId ? (
                  <ScalePressable
                    onPress={() => {
                      onDeleteAccount(mode.editingId!);
                      setMode({ type: "list" });
                    }}
                    scaleTo={0.96}
                    style={[
                      styles.deleteBtn,
                      {
                        backgroundColor: hexToRgba("#e11d48", 0.12),
                        borderColor: hexToRgba("#e11d48", 0.3),
                      },
                    ]}
                  >
                    <Icon name="trash" size={16} color="#e11d48" />
                  </ScalePressable>
                ) : null}
                <ScalePressable
                  onPress={() => setMode({ type: "list" })}
                  scaleTo={0.965}
                  style={[
                    styles.footerBtn,
                    {
                      overflow: "hidden",
                      backgroundColor: theme.card,
                      borderColor: hexToRgba(theme.leather.accent, 0.26),
                    },
                  ]}
                >
                  <LightLeatherSurface theme={theme} radius={16} />
                  <Text style={[styles.closeBtnText, { color: theme.ink }]}>
                    Cancel
                  </Text>
                </ScalePressable>
                <ScalePressable
                  onPress={handleSubmitEdit}
                  scaleTo={0.965}
                  style={[
                    styles.footerBtn,
                    {
                      overflow: "hidden",
                      backgroundColor: theme.leather.colors[1],
                      borderColor: theme.leather.edge,
                    },
                    cardShadow(theme.dark),
                  ]}
                >
                  <DarkLeatherSurface theme={theme} radius={16} />
                  <Text style={styles.saveBtnText}>Save</Text>
                </ScalePressable>
              </View>
            </>
          ) : (
            <>
              <View style={styles.header}>
                <ScalePressable
                  onPress={() => setMode({ type: "list" })}
                  scaleTo={0.92}
                  accessibilityRole="button"
                  accessibilityLabel="Back to PayLater list"
                  style={[
                    styles.backBtn,
                    {
                      overflow: "hidden",
                      backgroundColor: theme.leather.edge,
                      borderColor: theme.leather.edge,
                    },
                    cardShadow(theme.dark),
                  ]}
                >
                  <DarkLeatherSurface theme={theme} radius={20} />
                  <Icon name="back" size={18} color="#ffffff" />
                </ScalePressable>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.title, { color: theme.ink }]}>
                    Pay {mode.item.name}
                  </Text>
                  <Text style={[styles.subtitle, { color: theme.muted }]}>
                    Amount: {hidden ? "₱••••" : money(mode.item.dueAmount)} ·{" "}
                    {currentMonthKey()}
                  </Text>
                </View>
              </View>

              <Text style={[styles.fieldLabel, { color: theme.muted }]}>
                Pay using wallet
              </Text>
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.scroll}
                contentContainerStyle={{ gap: 8, paddingBottom: 6 }}
              >
                {visibleWallets.map((w) => {
                  const selected = w.id === selectedWalletId;
                  return (
                    <Pressable
                      key={w.id}
                      onPress={() => setSelectedWalletId(w.id)}
                      style={[
                        styles.walletPickRow,
                        {
                          backgroundColor: theme.card,
                          borderColor: selected
                            ? theme.leather.accent
                            : hexToRgba(theme.leather.accent, 0.22),
                        },
                      ]}
                    >
                      <WalletLogoBadge
                        logoKey={w.logoKey}
                        name={w.name}
                        mark={w.mark}
                        size={30}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.itemName, { color: theme.ink }]}>
                          {w.name}
                        </Text>
                        <Text style={[styles.itemStatus, { color: theme.muted }]}>
                          {hidden ? "₱••••" : money(w.balance)}
                        </Text>
                      </View>
                      {selected ? (
                        <Icon name="check" size={16} color={theme.leather.accent} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>

              <View style={styles.footer}>
                <ScalePressable
                  onPress={() => setMode({ type: "list" })}
                  scaleTo={0.965}
                  style={[
                    styles.footerBtn,
                    {
                      overflow: "hidden",
                      backgroundColor: theme.card,
                      borderColor: hexToRgba(theme.leather.accent, 0.26),
                    },
                  ]}
                >
                  <LightLeatherSurface theme={theme} radius={16} />
                  <Text style={[styles.closeBtnText, { color: theme.ink }]}>
                    Cancel
                  </Text>
                </ScalePressable>
                <ScalePressable
                  onPress={handleConfirmPay}
                  scaleTo={0.965}
                  style={[
                    styles.footerBtn,
                    {
                      overflow: "hidden",
                      backgroundColor: theme.leather.colors[1],
                      borderColor: theme.leather.edge,
                    },
                    cardShadow(theme.dark),
                  ]}
                >
                  <DarkLeatherSurface theme={theme} radius={16} />
                  <Text style={styles.saveBtnText}>Confirm payment</Text>
                </ScalePressable>
              </View>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  card: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
    maxHeight: "86%",
    overflow: "hidden",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 99,
    alignSelf: "center",
    marginBottom: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 19,
    lineHeight: 24,
    letterSpacing: -0.3,
    includeFontPadding: false,
  },
  subtitle: {
    fontFamily: "Poppins_500Medium",
    fontWeight: "500",
    fontSize: 12,
    lineHeight: 16,
    includeFontPadding: false,
    marginTop: 2,
  },
  addPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 13,
    borderWidth: 1,
  },
  addPillText: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 12.5,
    lineHeight: 16,
    includeFontPadding: false,
    marginTop: 1,
    color: "#ffffff",
  },
  scroll: {
    maxHeight: 410,
  },
  scrollContent: {
    gap: 10,
    paddingBottom: 6,
  },
  editorContent: {
    gap: 10,
    paddingBottom: 8,
  },
  emptyBox: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    gap: 8,
    overflow: "hidden",
  },
  emptyTitle: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 15,
    marginTop: 4,
  },
  emptySub: {
    fontFamily: "Poppins_500Medium",
    fontWeight: "500",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 17,
  },
  emptyBtn: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
  },
  emptyBtnText: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 13,
    color: "#ffffff",
  },
  itemCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  itemTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontFamily: "Poppins_800ExtraBold",
    fontWeight: "800",
    fontSize: 12,
    lineHeight: 15,
    includeFontPadding: false,
    marginTop: 1,
  },
  itemName: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 14,
    lineHeight: 18,
    includeFontPadding: false,
  },
  itemStatus: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 11.5,
    lineHeight: 15,
    includeFontPadding: false,
    marginTop: 1,
  },
  itemAmount: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 14.5,
    lineHeight: 18,
    includeFontPadding: false,
  },
  itemActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
  },
  actionChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 10,
    height: 30,
    borderRadius: 10,
  },
  actionChipText: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 11.5,
    lineHeight: 15,
    includeFontPadding: false,
    marginTop: 1,
  },
  payChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 12,
    height: 30,
    borderRadius: 10,
  },
  payChipText: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 11.5,
    lineHeight: 15,
    includeFontPadding: false,
    marginTop: 1,
    color: "#ffffff",
  },
  softField: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  fieldLabel: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 11,
    lineHeight: 14,
    includeFontPadding: false,
    marginBottom: 4,
  },
  fieldInput: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 15,
    lineHeight: 20,
    paddingVertical: 2,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  presetGrid: {
    gap: 7,
    marginBottom: 4,
  },
  presetRow: {
    flexDirection: "row",
    gap: 7,
  },
  presetChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 8,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
  },
  presetDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  presetChipText: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 12,
    lineHeight: 15,
    includeFontPadding: false,
    marginTop: 1.5,
  },
  twoCol: {
    flexDirection: "row",
    gap: 10,
  },
  walletPickRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 15,
    borderWidth: 1,
  },
  closeBtn: {
    marginTop: 14,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 14,
    lineHeight: 18,
    includeFontPadding: false,
    marginTop: 1,
  },
  footer: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  deleteBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  footerBtn: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 14,
    lineHeight: 18,
    includeFontPadding: false,
    marginTop: 1,
    color: "#ffffff",
  },
});
