import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  ActivityItem,
  money,
  Sheet,
  Tone,
  tonePalette,
  UserProfile,
  Wallet,
} from "../types/wallet";
import { FolderSurface } from "./FolderSurface";
import { Icon } from "./Icon";
import { EdgeFade, ThemeColors, TopBar } from "./SharedUI";
import { WalletFolder, WalletLogoBadge } from "./WalletFolder";
import {
  WalletPreset,
  WalletPresetGroup,
  walletPresets,
} from "../data/walletPresets";
import { supabase } from "../lib/supabase";

const WALLET_CATEGORIES = ["E-wallet", "Bank", "Cash", "Savings"];
const PRESET_GROUPS: ("All" | WalletPresetGroup)[] = [
  "All",
  "E-wallet",
  "Digital Bank",
  "Bank",
  "Cash",
];

export function SheetModal({
  type,
  wallets,
  selected,
  onSaveWallets,
  onRecordActivity,
  onClose,
  onSwitchSheet,
  onDone,
  profile,
  onUpdateProfile,
  userEmail,
  onSyncNow,
  theme,
}: {
  type: Exclude<Sheet, null>;
  wallets: Wallet[];
  selected: Wallet | null;
  onSaveWallets: (next: Wallet[]) => void;
  onRecordActivity: (item: Omit<ActivityItem, "id" | "date">) => void;
  onClose: () => void;
  onSwitchSheet?: (nextType: Exclude<Sheet, null>, wallet?: Wallet) => void;
  onDone: (message: string) => void;
  profile: UserProfile;
  onUpdateProfile: (p: UserProfile) => void;
  userEmail: string | null;
  onSyncNow: () => Promise<void>;
  theme: ThemeColors;
}) {
  const fallback = selected?.id || wallets[0]?.id || 1;
  const editTarget =
    type === "edit" ? selected || wallets[0] : null;
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>(
    editTarget?.logoKey || "custom"
  );
  const [presetGroup, setPresetGroup] = useState<"All" | WalletPresetGroup>("All");
  const [presetSearch, setPresetSearch] = useState("");
  const [logoKey, setLogoKey] = useState<string | undefined>(
    editTarget?.logoKey
  );
  const [recommendedTone, setRecommendedTone] = useState<Tone | null>(() => {
    if (!editTarget?.logoKey) return null;
    return (
      walletPresets.find((p) => p.key === editTarget.logoKey)?.recommendedTone ??
      null
    );
  });
  const [name, setName] = useState(editTarget?.name || "");
  const [category, setCategory] = useState(editTarget?.type || "E-wallet");
  const [accountLabel, setAccountLabel] = useState(editTarget?.account || "");
  const [tone, setTone] = useState<Tone>(editTarget?.tone || "blue");
  const [balance, setBalance] = useState(
    editTarget ? String(editTarget.balance) : ""
  );

  useEffect(() => {
    if (type === "edit" && editTarget) {
      setSelectedPresetKey(editTarget.logoKey || "custom");
      setLogoKey(editTarget.logoKey);
      setRecommendedTone(
        editTarget.logoKey
          ? (walletPresets.find((p) => p.key === editTarget.logoKey)
              ?.recommendedTone ?? null)
          : null
      );
      setName(editTarget.name);
      setCategory(editTarget.type);
      setAccountLabel(editTarget.account);
      setTone(editTarget.tone);
    }
  }, [type, editTarget?.id]);
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState(fallback);
  const [destination, setDestination] = useState(
    wallets.find((w) => w.id !== fallback)?.id || fallback
  );
  const [walletId, setWalletId] = useState(fallback);
  const [entryType, setEntryType] = useState<"expense" | "income">("expense");
  const [entryCategory, setEntryCategory] = useState("Food");
  const [note, setNote] = useState("");

  // Auth / Profile states
  const [fullNameInput, setFullNameInput] = useState(profile.fullName);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const current = wallets.find((w) => w.id === walletId) || wallets[0];
  const sourceWallet = wallets.find((w) => w.id === source) || wallets[0];
  const destWallet = wallets.find((w) => w.id === destination) || wallets[0];

  const selectedPreset = walletPresets.find((p) => p.key === selectedPresetKey);
  const filteredPresets = walletPresets.filter((p) => {
    const matchesGroup = presetGroup === "All" || p.group === presetGroup;
    const q = presetSearch.trim().toLowerCase();
    const matchesQuery =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.type.toLowerCase().includes(q);
    return matchesGroup && matchesQuery;
  });

  const handleSelectPreset = (preset: WalletPreset | "custom") => {
    if (preset === "custom") {
      setSelectedPresetKey("custom");
      setLogoKey(undefined);
      setRecommendedTone(null);
      setName("");
      setAccountLabel("");
      return;
    }
    setSelectedPresetKey(preset.key);
    setLogoKey(preset.key);
    setName(preset.name);
    setCategory(preset.type);
    setTone(preset.recommendedTone);
    setRecommendedTone(preset.recommendedTone);
    setAccountLabel(preset.account);
  };

  const preview: Wallet = {
    id: 0,
    name: name || "New wallet",
    type: category,
    balance: Number(balance) || 0,
    mark: selectedPreset?.mark || (name || "NW").slice(0, 2).toUpperCase(),
    tone,
    account: accountLabel.trim() || "Manual tracking",
    logoKey,
  };

  const transferValue = Number(amount);
  const entryValue = Number(amount);
  const entryWallet = wallets.find((w) => w.id === walletId) || wallets[0];

  const entryCategories: [string, string][] =
    entryType === "expense"
      ? [
          ["Food", "cup"],
          ["Transport", "car"],
          ["Bills", "bolt"],
          ["Shopping", "bag"],
          ["Health", "heart"],
          ["Other", "adjust"],
        ]
      : [
          ["Salary", "briefcase"],
          ["Freelance", "phone"],
          ["Gift", "gift"],
          ["Refund", "arrow-down"],
          ["Other", "plus"],
        ];

  const entryIcon =
    entryCategories.find(([label]) => label === entryCategory)?.[1] || "adjust";

  const entryInvalid =
    !entryValue ||
    (entryType === "expense" && entryValue > (entryWallet?.balance || 0));

  const transferInvalid =
    !transferValue ||
    source === destination ||
    transferValue > (sourceWallet?.balance || 0);

  const save = () => {
    const now = new Date().toISOString();
    if (type === "entry" && entryWallet && !entryInvalid) {
      const signedValue = entryType === "expense" ? -entryValue : entryValue;
      const nextWallets = wallets.map((w) =>
        w.id === entryWallet.id
          ? {
              ...w,
              balance: Number((w.balance + signedValue).toFixed(2)),
              updatedAt: now,
              synced: false,
            }
          : w
      );
      onSaveWallets(nextWallets);
      onRecordActivity({
        localId: `tx-${Date.now()}`,
        walletLocalId: entryWallet.localId || `wallet-${entryWallet.id}`,
        title: note.trim() || entryCategory,
        wallet: entryWallet.name,
        amount: signedValue,
        icon: entryIcon,
        kind: entryType === "expense" ? entryCategory : "Money in",
        occurredAt: now,
        updatedAt: now,
        synced: false,
      });
      onDone(
        `${entryType === "expense" ? "Expense" : "Money"} ${money(entryValue)} saved`
      );
    }

    if (type === "add" && name.trim()) {
      const newId = Date.now();
      const newWallet: Wallet = {
        ...preview,
        id: newId,
        localId: `wallet-${newId}`,
        name: name.trim(),
        updatedAt: now,
        synced: false,
      };
      onSaveWallets([...wallets, newWallet]);
      onDone(`${name.trim()} added`);
    }

    if (type === "edit" && editTarget && name.trim()) {
      const trimmedName = name.trim();
      const nextWallets = wallets.map((w) =>
        w.id === editTarget.id
          ? {
              ...w,
              name: trimmedName,
              type: category,
              mark:
                selectedPreset?.mark ||
                (w.logoKey === logoKey && w.name === trimmedName
                  ? w.mark
                  : trimmedName.slice(0, 2).toUpperCase()),
              tone,
              account: accountLabel.trim() || "Personal",
              logoKey,
              updatedAt: now,
              synced: false,
            }
          : w
      );
      onSaveWallets(nextWallets);
      onDone(`${trimmedName} updated`);
    }

    if (type === "update" && amount && current) {
      const newBal = Number(amount);
      const difference = Number((newBal - current.balance).toFixed(2));
      const nextWallets = wallets.map((w) =>
        w.id === walletId
          ? { ...w, balance: newBal, updatedAt: now, synced: false }
          : w
      );
      onSaveWallets(nextWallets);
      if (difference !== 0) {
        onRecordActivity({
          localId: `tx-${Date.now()}`,
          walletLocalId: current.localId || `wallet-${current.id}`,
          title: "Balance adjustment",
          wallet: current.name,
          amount: difference,
          icon: "adjust",
          kind: "Updated",
          occurredAt: now,
          updatedAt: now,
          synced: false,
        });
      }
      onDone(`${current.name} balance updated`);
    }

    if (type === "transfer" && !transferInvalid && sourceWallet && destWallet) {
      const nextWallets = wallets.map((w) =>
        w.id === source
          ? {
              ...w,
              balance: Number((w.balance - transferValue).toFixed(2)),
              updatedAt: now,
              synced: false,
            }
          : w.id === destination
            ? {
                ...w,
                balance: Number((w.balance + transferValue).toFixed(2)),
                updatedAt: now,
                synced: false,
              }
            : w
      );
      onSaveWallets(nextWallets);
      onRecordActivity({
        localId: `tx-${Date.now()}`,
        walletLocalId: sourceWallet.localId || `wallet-${sourceWallet.id}`,
        title: `${sourceWallet.name} to ${destWallet.name}`,
        wallet: sourceWallet.name,
        amount: -transferValue,
        icon: "swap",
        kind: "Transfer",
        occurredAt: now,
        updatedAt: now,
        synced: false,
      });
      onDone(`${money(transferValue)} transferred`);
    }
  };

  const handleAuthSubmit = async () => {
    setAuthError("");
    if (!email.trim() || !password.trim()) {
      setAuthError("Please enter both email and password.");
      return;
    }
    setAuthLoading(true);
    try {
      if (authMode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        onDone("Account ready & syncing with Supabase");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        onDone("Signed in & synced with Supabase");
      }
    } catch (err: any) {
      setAuthError(err?.message || "Authentication failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    setAuthLoading(true);
    await supabase.auth.signOut();
    setAuthLoading(false);
    onDone("Signed out · Offline SQLite active");
  };

  const handleSaveProfileName = () => {
    const trimmed = fullNameInput.trim() || "Justin Santos";
    const parts = trimmed.split(/\s+/);
    const initials =
      parts.length >= 2
        ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
        : trimmed.slice(0, 2).toUpperCase();
    onUpdateProfile({ fullName: trimmed, initials });
    onDone("Profile updated");
  };

  const sheetTitle =
    type === "add"
      ? "New Wallet"
      : type === "edit"
        ? "Edit Wallet"
        : type === "entry"
          ? "Add Transaction"
          : type === "update"
            ? "Update Balance"
            : type === "transfer"
              ? "Transfer"
              : "Account & Cloud Sync";

  const heroTone: Tone = entryType === "expense" ? "blue" : "yellow";
  const heroPal = tonePalette[heroTone];

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.sheetLayer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.bottomSheet,
            {
              backgroundColor: theme.page,
              maxHeight: type === "add" || type === "entry" || type === "auth" ? "92%" : "86%",
            },
          ]}
        >
          <View
            style={[styles.sheetHandle, { backgroundColor: theme.soft2 }]}
          />
          <TopBar title={sheetTitle} onBack={onClose} theme={theme} />

          <View style={{ flexShrink: 1, position: "relative" }}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingTop: 6, paddingBottom: 32 }}
            >
            {/* ==================== ADD / EDIT WALLET SHEET ==================== */}
            {(type === "add" || type === "edit") && (
              <View>
                <WalletFolder wallet={preview} hidden={false} compact />

                <View style={styles.presetHeaderRow}>
                  <Text style={[styles.formTitle, { color: theme.ink, marginTop: 18, marginBottom: 8 }]}>
                    Choose bank or e-wallet
                  </Text>
                </View>

                {/* Search + Group Filter */}
                <View
                  style={[
                    styles.presetSearchBox,
                    { backgroundColor: theme.soft, borderColor: theme.line },
                  ]}
                >
                  <Icon name="search" size={16} color={theme.muted} />
                  <TextInput
                    value={presetSearch}
                    onChangeText={setPresetSearch}
                    placeholder="Search GCash, BPI, SeaBank..."
                    placeholderTextColor={theme.muted}
                    style={[styles.presetSearchInput, { color: theme.ink }]}
                  />
                  {presetSearch ? (
                    <Pressable onPress={() => setPresetSearch("")} hitSlop={8}>
                      <Icon name="close" size={14} color={theme.muted} />
                    </Pressable>
                  ) : null}
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 7, marginBottom: 10 }}
                >
                  {PRESET_GROUPS.map((grp) => {
                    const active = presetGroup === grp;
                    return (
                      <Pressable
                        key={grp}
                        onPress={() => setPresetGroup(grp)}
                        style={[
                          styles.miniPill,
                          {
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            backgroundColor: active ? theme.accent : theme.soft,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.miniPillText,
                            { color: active ? "#ffffff" : theme.ink },
                          ]}
                        >
                          {grp}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {/* Horizontal Preset Cards + Custom Option */}
                <View style={{ position: "relative" }}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 9, paddingVertical: 2, paddingHorizontal: 4 }}
                  >
                  <Pressable
                    onPress={() => handleSelectPreset("custom")}
                    style={[
                      styles.presetCard,
                      {
                        backgroundColor:
                          selectedPresetKey === "custom"
                            ? theme.surface
                            : theme.soft,
                        borderColor:
                          selectedPresetKey === "custom"
                            ? theme.accent
                            : theme.line,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.presetCustomIcon,
                        { backgroundColor: theme.accentSoft },
                      ]}
                    >
                      <Icon name="plus" size={18} color={theme.accentText} />
                    </View>
                    <Text
                      style={[styles.presetName, { color: theme.ink }]}
                      numberOfLines={1}
                    >
                      Custom
                    </Text>
                    <Text
                      style={[styles.presetSub, { color: theme.muted }]}
                      numberOfLines={1}
                    >
                      Any name
                    </Text>
                  </Pressable>

                  {filteredPresets.map((preset) => {
                    const active = selectedPresetKey === preset.key;
                    const pPal = tonePalette[preset.recommendedTone];
                    return (
                      <Pressable
                        key={preset.key}
                        onPress={() => handleSelectPreset(preset)}
                        style={[
                          styles.presetCard,
                          {
                            backgroundColor: active ? theme.surface : theme.soft,
                            borderColor: active ? theme.accent : theme.line,
                          },
                        ]}
                      >
                        <WalletLogoBadge
                          logoKey={preset.key}
                          name={preset.name}
                          mark={preset.mark}
                          size={34}
                          radius={11}
                          ink={pPal.ink}
                          fontSize={10}
                        />
                        <Text
                          style={[styles.presetName, { color: theme.ink }]}
                          numberOfLines={1}
                        >
                          {preset.name}
                        </Text>
                        <Text
                          style={[styles.presetSub, { color: theme.muted }]}
                          numberOfLines={1}
                        >
                          {preset.type}
                        </Text>
                      </Pressable>
                    );
                  })}
                  </ScrollView>
                  <EdgeFade position="left" color={theme.page} size={14} />
                  <EdgeFade position="right" color={theme.page} size={14} />
                </View>

                <Text style={[styles.formTitle, { color: theme.ink }]}>
                  Wallet detail
                </Text>

                <View
                  style={[
                    styles.softField,
                    { backgroundColor: theme.soft, borderColor: theme.line },
                  ]}
                >
                  <Text style={[styles.fieldLabel, { color: theme.muted }]}>
                    Wallet name
                  </Text>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g. UnionBank"
                    placeholderTextColor={theme.muted}
                    style={[styles.fieldInput, { color: theme.ink }]}
                  />
                </View>

                <View
                  style={[
                    styles.softField,
                    { backgroundColor: theme.soft, borderColor: theme.line },
                  ]}
                >
                  <Text style={[styles.fieldLabel, { color: theme.muted }]}>
                    Label (optional)
                  </Text>
                  <TextInput
                    value={accountLabel}
                    onChangeText={setAccountLabel}
                    placeholder="e.g. Personal, Payroll, Savings"
                    placeholderTextColor={theme.muted}
                    style={[styles.fieldInput, { color: theme.ink }]}
                  />
                </View>

                <View style={styles.fieldRow}>
                  <View
                    style={[
                      styles.softField,
                      {
                        flex: 1,
                        backgroundColor: theme.soft,
                        borderColor: theme.line,
                      },
                    ]}
                  >
                    <Text style={[styles.fieldLabel, { color: theme.muted }]}>
                      Category
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 6, paddingTop: 4 }}
                    >
                      {WALLET_CATEGORIES.map((cat) => {
                        const active = category === cat;
                        return (
                          <Pressable
                            key={cat}
                            onPress={() => setCategory(cat)}
                            style={[
                              styles.miniPill,
                              {
                                backgroundColor: active
                                  ? theme.accent
                                  : theme.soft2,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.miniPillText,
                                {
                                  color: active ? "#ffffff" : theme.ink,
                                },
                              ]}
                            >
                              {cat}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>

                  {type === "add" ? (
                    <View
                      style={[
                        styles.softField,
                        {
                          flex: 1,
                          backgroundColor: theme.soft,
                          borderColor: theme.line,
                        },
                      ]}
                    >
                      <Text style={[styles.fieldLabel, { color: theme.muted }]}>
                        Opening balance
                      </Text>
                      <TextInput
                        value={balance}
                        onChangeText={(t) =>
                          setBalance(t.replace(/[^\d.]/g, ""))
                        }
                        keyboardType="decimal-pad"
                        placeholder="₱0.00"
                        placeholderTextColor={theme.muted}
                        style={[styles.fieldInput, { color: theme.ink }]}
                      />
                    </View>
                  ) : null}
                </View>

                {/* 12-Tone Color Picker */}
                <View style={styles.colorHeaderRow}>
                  <Text style={[styles.fieldLabel, { color: theme.muted }]}>
                    Card color
                  </Text>
                  {recommendedTone ? (
                    <Text style={[styles.recommendedHint, { color: theme.accentText }]}>
                      Recommended: {tonePalette[recommendedTone].label}
                      {tone !== recommendedTone ? " (customized)" : ""}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.tonePicker}>
                  {(Object.keys(tonePalette) as Tone[]).map((t) => {
                    const pal = tonePalette[t];
                    const active = tone === t;
                    return (
                      <Pressable
                        key={t}
                        onPress={() => setTone(t)}
                        style={[
                          styles.toneSwatchWrapper,
                          {
                            borderColor: active ? theme.accent : theme.page,
                          },
                        ]}
                      >
                        <LinearGradient
                          colors={[pal.from, pal.to]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.toneSwatch}
                        >
                          {active && (
                            <Icon name="check" size={15} color={pal.ink} />
                          )}
                        </LinearGradient>
                      </Pressable>
                    );
                  })}
                </View>

                <PrimaryButton
                  label={type === "edit" ? "Save changes" : "Save wallet"}
                  disabled={!name.trim()}
                  onPress={save}
                  theme={theme}
                />
              </View>
            )}

            {/* ==================== ENTRY (ADD TRANSACTION) SHEET ==================== */}
            {type === "entry" && entryWallet && (
              <View>
                {/* Expense / Money in Toggle */}
                <View
                  style={[
                    styles.entryToggle,
                    { backgroundColor: theme.soft, borderColor: theme.line },
                  ]}
                >
                  {(["expense", "income"] as const).map((kind) => {
                    const active = entryType === kind;
                    return (
                      <Pressable
                        key={kind}
                        onPress={() => {
                          setEntryType(kind);
                          setEntryCategory(
                            kind === "expense" ? "Food" : "Salary"
                          );
                        }}
                        style={[
                          styles.entryToggleBtn,
                          active && { backgroundColor: theme.surface },
                        ]}
                      >
                        <LinearGradient
                          colors={
                            active
                              ? kind === "income"
                                ? ["#fff58a", "#f2c715"]
                                : theme.accentGradient
                              : [theme.soft2, theme.soft2]
                          }
                          style={styles.entryToggleIcon}
                        >
                          <Icon
                            name={
                              kind === "expense" ? "arrow-up" : "arrow-down"
                            }
                            size={14}
                            color={
                              active
                                ? kind === "income"
                                  ? "#241c03"
                                  : "#ffffff"
                                : theme.muted
                            }
                          />
                        </LinearGradient>
                        <Text
                          style={[
                            styles.entryToggleText,
                            { color: active ? theme.ink : theme.muted },
                          ]}
                        >
                          {kind === "expense" ? "Expense" : "Money in"}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Folder Hero Card */}
                <FolderSurface
                  tab={0.58}
                  tabHeight={42}
                  radius={28}
                  notch
                  fromColor={heroPal.from}
                  toColor={heroPal.to}
                  minHeight={205}
                >
                  {({ notchX, notchHeight }) => (
                    <View style={{ minHeight: 205 }}>
                      <View style={[styles.entryHeroTab, { height: 42 }]}>
                        <View style={styles.entryHeroIcon}>
                          <Icon
                            name={entryIcon}
                            size={16}
                            color={heroPal.ink}
                          />
                        </View>
                        <Text
                          style={[
                            styles.entryHeroCat,
                            { color: heroPal.ink },
                          ]}
                          numberOfLines={1}
                        >
                          {entryCategory}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.entryHeroBadge,
                          { left: notchX, height: notchHeight },
                        ]}
                      >
                        <Text
                          style={[
                            styles.entryHeroBadgeText,
                            { color: heroPal.ink },
                          ]}
                        >
                          {entryType === "expense" ? "SPEND" : "RECEIVE"}
                        </Text>
                      </View>

                      <View style={styles.entryHeroBody}>
                        <Text
                          style={[
                            styles.entryHeroLabel,
                            { color: heroPal.ink },
                          ]}
                        >
                          {entryType === "expense"
                            ? "Amount spent"
                            : "Amount received"}
                        </Text>

                        <View style={styles.entryAmountInputRow}>
                          <Text
                            style={[
                              styles.entryCurrencySign,
                              { color: heroPal.ink },
                            ]}
                          >
                            ₱
                          </Text>
                          <TextInput
                            value={amount}
                            onChangeText={(t) =>
                              setAmount(t.replace(/[^\d.]/g, ""))
                            }
                            keyboardType="decimal-pad"
                            placeholder="0.00"
                            placeholderTextColor={
                              entryType === "expense"
                                ? "rgba(255,255,255,0.45)"
                                : "rgba(33,27,7,0.4)"
                            }
                            style={[
                              styles.entryBigInput,
                              { color: heroPal.ink },
                            ]}
                          />
                        </View>

                        <View
                          style={[
                            styles.entryBalanceRow,
                            {
                              borderTopColor:
                                entryType === "income"
                                  ? "rgba(36, 28, 3, 0.14)"
                                  : "rgba(255, 255, 255, 0.24)",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.entryBalanceLabel,
                              { color: heroPal.ink },
                            ]}
                          >
                            {entryWallet.name} after
                          </Text>
                          <Text
                            style={[
                              styles.entryBalanceVal,
                              { color: heroPal.ink },
                            ]}
                          >
                            {money(
                              entryWallet.balance +
                                (entryType === "expense" ? -1 : 1) *
                                  (entryValue || 0)
                            )}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}
                </FolderSurface>

                {/* Quick Amounts */}
                <View style={styles.entryQuickRow}>
                  {[100, 500, 1000, 5000].map((v) => (
                    <Pressable
                      key={v}
                      onPress={() =>
                        setAmount(String((entryValue || 0) + v))
                      }
                      style={[
                        styles.entryQuickBtn,
                        {
                          backgroundColor: theme.soft,
                          borderColor: theme.line,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.entryQuickText, { color: theme.ink }]}
                      >
                        +{money(v, true)}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* From Wallet Horizontal Scroll */}
                <View style={styles.entrySection}>
                  <View style={styles.entrySectionHead}>
                    <Text
                      style={[styles.entrySectionTitle, { color: theme.ink }]}
                    >
                      From wallet
                    </Text>
                    <Text
                      style={[styles.entrySectionSub, { color: theme.muted }]}
                    >
                      {wallets.length} wallets
                    </Text>
                  </View>
                  <View style={{ position: "relative" }}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 9, paddingHorizontal: 4 }}
                    >
                    {wallets.map((w) => {
                      const active = walletId === w.id;
                      const wPal = tonePalette[w.tone] || tonePalette.blue;
                      return (
                        <Pressable
                          key={w.id}
                          onPress={() => setWalletId(w.id)}
                          style={[
                            styles.entryWalletCard,
                            {
                              backgroundColor: active
                                ? theme.surface
                                : theme.soft,
                              borderColor: active
                                ? theme.accent
                                : theme.line,
                            },
                          ]}
                        >
                          <LinearGradient
                            colors={[wPal.from, wPal.to]}
                            style={styles.entryWalletMark}
                          >
                            <WalletLogoBadge
                              logoKey={w.logoKey}
                              name={w.name}
                              mark={w.mark}
                              size={40}
                              radius={14}
                              ink={wPal.ink}
                              fontSize={10}
                            />
                          </LinearGradient>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                styles.entryWalletName,
                                { color: theme.ink },
                              ]}
                              numberOfLines={1}
                            >
                              {w.name}
                            </Text>
                            <Text
                              style={[
                                styles.entryWalletBal,
                                { color: theme.muted },
                              ]}
                              numberOfLines={1}
                            >
                              {money(w.balance)}
                            </Text>
                          </View>
                        </Pressable>
                      );
                      })}
                    </ScrollView>
                    <EdgeFade position="left" color={theme.page} size={14} />
                    <EdgeFade position="right" color={theme.page} size={14} />
                  </View>
                </View>

                {/* Category Grid */}
                <View style={styles.entrySection}>
                  <View style={styles.entrySectionHead}>
                    <Text
                      style={[styles.entrySectionTitle, { color: theme.ink }]}
                    >
                      Category
                    </Text>
                    <Text
                      style={[styles.entrySectionSub, { color: theme.muted }]}
                    >
                      {entryType === "expense" ? "Where it went" : "Source"}
                    </Text>
                  </View>
                  <View style={styles.categoryPickerGrid}>
                    {entryCategories.map(([label, icon]) => {
                      const active = entryCategory === label;
                      return (
                        <Pressable
                          key={label}
                          onPress={() => setEntryCategory(label)}
                          style={[
                            styles.categoryChip,
                            {
                              backgroundColor: active
                                ? theme.surface
                                : theme.soft,
                              borderColor: active
                                ? theme.accent
                                : theme.line,
                            },
                          ]}
                        >
                          <LinearGradient
                            colors={
                              active
                                ? theme.accentGradient
                                : [theme.accentSoft, theme.accentSoft]
                            }
                            style={styles.categoryChipIcon}
                          >
                            <Icon
                              name={icon}
                              size={16}
                              color={
                                active ? theme.accentInk : theme.accentText
                              }
                            />
                          </LinearGradient>
                          <Text
                            style={[
                              styles.categoryChipText,
                              { color: theme.ink },
                            ]}
                            numberOfLines={1}
                          >
                            {label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Note Input */}
                <View
                  style={[
                    styles.entryNoteBox,
                    { backgroundColor: theme.soft, borderColor: theme.line },
                  ]}
                >
                  <View
                    style={[
                      styles.entryNoteIcon,
                      { backgroundColor: theme.accentSoft },
                    ]}
                  >
                    <Icon name="edit" size={16} color={theme.accentText} />
                  </View>
                  <TextInput
                    value={note}
                    onChangeText={setNote}
                    placeholder={
                      entryType === "expense"
                        ? "Add a note, e.g. lunch with team"
                        : "Add a note, e.g. client payout"
                    }
                    placeholderTextColor={theme.muted}
                    style={[styles.entryNoteInput, { color: theme.ink }]}
                  />
                </View>

                {entryType === "expense" &&
                  entryValue > entryWallet.balance && (
                    <Text style={styles.errorText}>
                      This is higher than the wallet balance.
                    </Text>
                  )}

                {/* Entry Footer */}
                <View
                  style={[
                    styles.entryFooter,
                    { borderTopColor: theme.line },
                  ]}
                >
                  <View style={{ minWidth: 90 }}>
                    <Text
                      style={[
                        styles.entryFooterLabel,
                        { color: theme.muted },
                      ]}
                    >
                      {entryType === "expense" ? "Expense" : "Money in"}
                    </Text>
                    <Text
                      style={[styles.entryFooterVal, { color: theme.ink }]}
                    >
                      {entryValue ? money(entryValue) : "₱0.00"}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <PrimaryButton
                      label={
                        entryType === "expense" ? "Save expense" : "Add money"
                      }
                      disabled={entryInvalid}
                      onPress={save}
                      incomeStyle={entryType === "income"}
                      theme={theme}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* ==================== UPDATE BALANCE SHEET ==================== */}
            {type === "update" && current && (
              <View>
                <WalletFolder wallet={current} hidden={false} compact />

                {onSwitchSheet ? (
                  <Pressable
                    onPress={() => onSwitchSheet("edit", current)}
                    style={[
                      styles.editCardLinkBtn,
                      { backgroundColor: theme.soft, borderColor: theme.line },
                    ]}
                  >
                    <Icon name="edit" size={15} color={theme.accentText} />
                    <Text
                      style={[
                        styles.editCardLinkText,
                        { color: theme.accentText },
                      ]}
                    >
                      Edit card name, logo & color
                    </Text>
                  </Pressable>
                ) : null}

                {/* Wallet Selector */}
                <View style={{ marginTop: 14, marginBottom: 4 }}>
                  <Text
                    style={[
                      styles.fieldLabel,
                      { color: theme.muted, marginLeft: 4, marginBottom: 6 },
                    ]}
                  >
                    Select Wallet
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8 }}
                  >
                    {wallets.map((w) => {
                      const active = w.id === walletId;
                      return (
                        <Pressable
                          key={w.id}
                          onPress={() => setWalletId(w.id)}
                          style={[
                            styles.walletSelectChip,
                            {
                              backgroundColor: active
                                ? theme.accent
                                : theme.soft,
                              borderColor: active
                                ? theme.accent
                                : theme.line,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.walletSelectChipText,
                              { color: active ? "#ffffff" : theme.ink },
                            ]}
                          >
                            {w.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>

                <View
                  style={[
                    styles.amountEntryBox,
                    { backgroundColor: theme.soft, borderColor: theme.line },
                  ]}
                >
                  <Text style={[styles.fieldLabel, { color: theme.muted }]}>
                    New balance
                  </Text>
                  <View style={styles.amountEntryRow}>
                    <Text style={[styles.amountEntrySign, { color: theme.ink }]}>
                      ₱
                    </Text>
                    <TextInput
                      value={amount}
                      onChangeText={(t) =>
                        setAmount(t.replace(/[^\d.]/g, ""))
                      }
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor={theme.muted}
                      style={[styles.amountEntryInput, { color: theme.ink }]}
                    />
                  </View>
                  <Text style={[styles.fieldLabel, { color: theme.muted }]}>
                    Current: {money(current.balance)}
                  </Text>
                </View>

                <View style={styles.quickAmountsGrid}>
                  {[500, 1000, 5000].map((v) => (
                    <Pressable
                      key={v}
                      onPress={() => setAmount(String(current.balance + v))}
                      style={[
                        styles.quickAmountBtn,
                        { backgroundColor: theme.soft2 },
                      ]}
                    >
                      <Text
                        style={[styles.entryQuickText, { color: theme.ink }]}
                      >
                        + {money(v, true)}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <PrimaryButton
                  label="Save new balance"
                  disabled={!amount}
                  onPress={save}
                  theme={theme}
                />
              </View>
            )}

            {/* ==================== TRANSFER SHEET ==================== */}
            {type === "transfer" && sourceWallet && destWallet && (
              <View>
                <View style={styles.transferRoute}>
                  {/* From Wallet */}
                  <View
                    style={[
                      styles.transferBox,
                      { backgroundColor: theme.soft, borderColor: theme.line },
                    ]}
                  >
                    <Text style={[styles.fieldLabel, { color: theme.muted }]}>
                      From
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 8, marginTop: 6 }}
                    >
                      {wallets.map((w) => {
                        const active = w.id === source;
                        return (
                          <Pressable
                            key={w.id}
                            onPress={() => setSource(w.id)}
                            style={[
                              styles.walletSelectChip,
                              {
                                backgroundColor: active
                                  ? theme.accent
                                  : theme.soft2,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.walletSelectChipText,
                                { color: active ? "#ffffff" : theme.ink },
                              ]}
                            >
                              {w.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>

                  {/* Swap Button */}
                  <Pressable
                    onPress={() => {
                      setSource(destination);
                      setDestination(source);
                    }}
                    style={[
                      styles.transferSwapBtn,
                      { borderColor: theme.page },
                    ]}
                  >
                    <LinearGradient
                      colors={theme.accentGradient}
                      style={styles.transferSwapInner}
                    >
                      <Icon name="swap" size={18} color={theme.accentInk} />
                    </LinearGradient>
                  </Pressable>

                  {/* To Wallet */}
                  <View
                    style={[
                      styles.transferBox,
                      { backgroundColor: theme.soft, borderColor: theme.line },
                    ]}
                  >
                    <Text style={[styles.fieldLabel, { color: theme.muted }]}>
                      To
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 8, marginTop: 6 }}
                    >
                      {wallets.map((w) => {
                        const active = w.id === destination;
                        return (
                          <Pressable
                            key={w.id}
                            onPress={() => setDestination(w.id)}
                            style={[
                              styles.walletSelectChip,
                              {
                                backgroundColor: active
                                  ? theme.accent
                                  : theme.soft2,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.walletSelectChipText,
                                { color: active ? "#ffffff" : theme.ink },
                              ]}
                            >
                              {w.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                </View>

                <View
                  style={[
                    styles.amountEntryBox,
                    { backgroundColor: theme.soft, borderColor: theme.line },
                  ]}
                >
                  <Text style={[styles.fieldLabel, { color: theme.muted }]}>
                    Amount to transfer
                  </Text>
                  <View style={styles.amountEntryRow}>
                    <Text style={[styles.amountEntrySign, { color: theme.ink }]}>
                      ₱
                    </Text>
                    <TextInput
                      value={amount}
                      onChangeText={(t) =>
                        setAmount(t.replace(/[^\d.]/g, ""))
                      }
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor={theme.muted}
                      style={[styles.amountEntryInput, { color: theme.ink }]}
                    />
                  </View>
                  <Text style={[styles.fieldLabel, { color: theme.muted }]}>
                    Available: {money(sourceWallet.balance)}
                  </Text>
                </View>

                {source === destination && (
                  <Text style={styles.errorText}>
                    Choose two different wallets.
                  </Text>
                )}
                {transferValue > sourceWallet.balance && (
                  <Text style={styles.errorText}>
                    Amount is higher than the available balance.
                  </Text>
                )}

                <LinearGradient
                  colors={["#22385f", "#101827"]}
                  style={styles.confirmPanel}
                >
                  <Text style={styles.confirmSub}>You will send</Text>
                  <Text style={styles.confirmAmount}>
                    {transferValue ? money(transferValue) : "₱0.00"}
                  </Text>
                  <Text style={styles.confirmSub}>
                    {sourceWallet.name} → {destWallet.name}
                  </Text>
                </LinearGradient>

                <PrimaryButton
                  label="Confirm transfer"
                  disabled={transferInvalid}
                  onPress={save}
                  theme={theme}
                />
              </View>
            )}

            {/* ==================== SUPABASE AUTH & PROFILE SHEET ==================== */}
            {type === "auth" && (
              <View>
                {/* Local Profile Customization */}
                <Text
                  style={[
                    styles.formTitle,
                    { color: theme.ink, marginTop: 4 },
                  ]}
                >
                  Wallet Profile
                </Text>
                <View
                  style={[
                    styles.softField,
                    { backgroundColor: theme.soft, borderColor: theme.line },
                  ]}
                >
                  <Text style={[styles.fieldLabel, { color: theme.muted }]}>
                    Display Name
                  </Text>
                  <TextInput
                    value={fullNameInput}
                    onChangeText={setFullNameInput}
                    placeholder="Justin Santos"
                    placeholderTextColor={theme.muted}
                    style={[styles.fieldInput, { color: theme.ink }]}
                  />
                </View>
                <Pressable
                  onPress={handleSaveProfileName}
                  style={[
                    styles.secondaryButton,
                    { backgroundColor: theme.soft2 },
                  ]}
                >
                  <Text
                    style={[styles.secondaryButtonText, { color: theme.ink }]}
                  >
                    Update Display Name
                  </Text>
                </Pressable>

                {/* Supabase Cloud Sync Section */}
                <Text style={[styles.formTitle, { color: theme.ink }]}>
                  Supabase Cloud Backup & Auth
                </Text>

                {userEmail ? (
                  <View>
                    <LinearGradient
                      colors={["#22385f", "#101827"]}
                      style={styles.confirmPanel}
                    >
                      <Text style={styles.confirmSub}>Signed in as</Text>
                      <Text
                        style={[
                          styles.confirmAmount,
                          { fontSize: 18, marginVertical: 4 },
                        ]}
                      >
                        {userEmail}
                      </Text>
                      <Text style={styles.confirmSub}>
                        PostgreSQL RLS + Local SQLite dual-storage active
                      </Text>
                    </LinearGradient>

                    <PrimaryButton
                      label="Sync Now with Supabase"
                      disabled={authLoading}
                      onPress={async () => {
                        setAuthLoading(true);
                        await onSyncNow();
                        setAuthLoading(false);
                        onClose();
                      }}
                      theme={theme}
                    />

                    <Pressable
                      onPress={handleSignOut}
                      style={[
                        styles.secondaryButton,
                        { backgroundColor: theme.soft, marginTop: 10 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.secondaryButtonText,
                          { color: "#c04444" },
                        ]}
                      >
                        Sign Out
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <View>
                    <View
                      style={[
                        styles.entryToggle,
                        {
                          backgroundColor: theme.soft,
                          borderColor: theme.line,
                        },
                      ]}
                    >
                      {(["signin", "signup"] as const).map((m) => {
                        const active = authMode === m;
                        return (
                          <Pressable
                            key={m}
                            onPress={() => {
                              setAuthMode(m);
                              setAuthError("");
                            }}
                            style={[
                              styles.entryToggleBtn,
                              active && { backgroundColor: theme.surface },
                            ]}
                          >
                            <Text
                              style={[
                                styles.entryToggleText,
                                { color: active ? theme.ink : theme.muted },
                              ]}
                            >
                              {m === "signin" ? "Sign In" : "Create Account"}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    <View
                      style={[
                        styles.softField,
                        {
                          backgroundColor: theme.soft,
                          borderColor: theme.line,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.fieldLabel, { color: theme.muted }]}
                      >
                        Email address
                      </Text>
                      <TextInput
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        placeholder="you@example.com"
                        placeholderTextColor={theme.muted}
                        style={[styles.fieldInput, { color: theme.ink }]}
                      />
                    </View>

                    <View
                      style={[
                        styles.softField,
                        {
                          backgroundColor: theme.soft,
                          borderColor: theme.line,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.fieldLabel, { color: theme.muted }]}
                      >
                        Password
                      </Text>
                      <TextInput
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        placeholder="••••••••"
                        placeholderTextColor={theme.muted}
                        style={[styles.fieldInput, { color: theme.ink }]}
                      />
                    </View>

                    {authError ? (
                      <Text style={styles.errorText}>{authError}</Text>
                    ) : null}

                    {authLoading ? (
                      <ActivityIndicator
                        size="small"
                        color={theme.accent}
                        style={{ marginVertical: 14 }}
                      />
                    ) : (
                      <PrimaryButton
                        label={
                          authMode === "signin"
                            ? "Sign In & Sync Wallets"
                            : "Create Account & Backup"
                        }
                        disabled={!email.trim() || !password.trim()}
                        onPress={handleAuthSubmit}
                        theme={theme}
                      />
                    )}
                  </View>
                )}
              </View>
            )}
            </ScrollView>
            <EdgeFade position="top" color={theme.page} size={18} />
            <EdgeFade position="bottom" color={theme.page} size={28} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function PrimaryButton({
  label,
  disabled,
  onPress,
  incomeStyle = false,
  theme,
}: {
  label: string;
  disabled?: boolean;
  onPress: () => void;
  incomeStyle?: boolean;
  theme: ThemeColors;
}) {
  const colors: [string, string] = disabled
    ? [theme.soft2, theme.soft2]
    : incomeStyle
      ? ["#fff58a", "#f2c715"]
      : theme.accentGradient;

  const textColor = disabled
    ? theme.muted
    : incomeStyle
      ? "#241c03"
      : theme.accentInk;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        { marginTop: 10, transform: [{ scale: pressed && !disabled ? 0.98 : 1 }] },
      ]}
    >
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.saveButton}
      >
        <Text style={[styles.saveButtonText, { color: textColor }]}>
          {label}
        </Text>
        <Icon name="check" size={18} color={textColor} />
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sheetLayer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(10, 15, 26, 0.5)",
  },
  bottomSheet: {
    width: "100%",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 9,
    paddingBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 20,
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 7,
  },
  formTitle: {
    fontFamily: "Urbanist_800ExtraBold",
    fontWeight: "800",
    fontSize: 18,
    marginTop: 22,
    marginBottom: 10,
  },
  softField: {
    minHeight: 62,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 19,
    borderWidth: 1,
    marginBottom: 10,
  },
  fieldLabel: {
    fontFamily: "Urbanist_700Bold",
    fontWeight: "700",
    fontSize: 10.5,
    marginBottom: 3,
  },
  fieldInput: {
    fontFamily: "Urbanist_700Bold",
    fontWeight: "700",
    fontSize: 15,
    paddingVertical: 2,
  },
  fieldRow: {
    flexDirection: "row",
    gap: 10,
  },
  miniPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  miniPillText: {
    fontFamily: "Urbanist_700Bold",
    fontWeight: "700",
    fontSize: 11,
  },
  presetHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  presetSearchBox: {
    height: 44,
    borderRadius: 15,
    borderWidth: 1,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  presetSearchInput: {
    flex: 1,
    fontFamily: "Urbanist_600SemiBold",
    fontWeight: "600",
    fontSize: 13,
    paddingVertical: 0,
  },
  presetCard: {
    width: 84,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: "center",
    gap: 5,
  },
  presetCustomIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  presetName: {
    fontFamily: "Urbanist_700Bold",
    fontWeight: "700",
    fontSize: 11.5,
  },
  presetSub: {
    fontFamily: "Urbanist_600SemiBold",
    fontWeight: "600",
    fontSize: 9.5,
  },
  colorHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    marginHorizontal: 2,
  },
  recommendedHint: {
    fontFamily: "Urbanist_700Bold",
    fontWeight: "700",
    fontSize: 10.5,
  },
  editCardLinkBtn: {
    marginTop: 12,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  editCardLinkText: {
    fontFamily: "Urbanist_700Bold",
    fontWeight: "700",
    fontSize: 12.5,
  },
  tonePicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
    marginVertical: 14,
  },
  toneSwatchWrapper: {
    width: "14%",
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 3,
    overflow: "hidden",
  },
  toneSwatch: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButton: {
    height: 56,
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveButtonText: {
    fontFamily: "Urbanist_800ExtraBold",
    fontWeight: "800",
    fontSize: 15,
  },
  secondaryButton: {
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    fontFamily: "Urbanist_800ExtraBold",
    fontWeight: "800",
    fontSize: 13,
  },
  entryToggle: {
    height: 56,
    padding: 5,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    marginBottom: 16,
  },
  entryToggleBtn: {
    flex: 1,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  entryToggleIcon: {
    width: 25,
    height: 25,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  entryToggleText: {
    fontFamily: "Urbanist_800ExtraBold",
    fontWeight: "800",
    fontSize: 13,
  },
  entryHeroTab: {
    position: "absolute",
    left: 20,
    top: 0,
    maxWidth: "54%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 3,
  },
  entryHeroIcon: {
    width: 30,
    height: 30,
    borderRadius: 11,
    backgroundColor: "rgba(255, 255, 255, 0.24)",
    alignItems: "center",
    justifyContent: "center",
  },
  entryHeroCat: {
    fontFamily: "Urbanist_800ExtraBold",
    fontWeight: "900",
    fontStyle: "italic",
    fontSize: 17,
  },
  entryHeroBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 6,
  },
  entryHeroBadgeText: {
    fontFamily: "Urbanist_800ExtraBold",
    fontWeight: "900",
    fontSize: 10.5,
    letterSpacing: 1,
  },
  entryHeroBody: {
    paddingTop: 66,
    paddingHorizontal: 22,
    paddingBottom: 20,
  },
  entryHeroLabel: {
    fontFamily: "Urbanist_800ExtraBold",
    fontWeight: "800",
    fontSize: 11,
    opacity: 0.68,
  },
  entryAmountInputRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 5,
    marginVertical: 6,
  },
  entryCurrencySign: {
    fontFamily: "Urbanist_800ExtraBold",
    fontWeight: "900",
    fontSize: 25,
    opacity: 0.75,
  },
  entryBigInput: {
    flex: 1,
    fontFamily: "Urbanist_800ExtraBold",
    fontWeight: "900",
    fontSize: 42,
    paddingVertical: 0,
  },
  entryBalanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
  },
  entryBalanceLabel: {
    fontFamily: "Urbanist_700Bold",
    fontWeight: "700",
    fontSize: 11,
    opacity: 0.7,
  },
  entryBalanceVal: {
    fontFamily: "Urbanist_800ExtraBold",
    fontWeight: "800",
    fontSize: 13,
  },
  entryQuickRow: {
    flexDirection: "row",
    gap: 7,
    marginTop: 12,
    marginBottom: 22,
  },
  entryQuickBtn: {
    flex: 1,
    height: 38,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  entryQuickText: {
    fontFamily: "Urbanist_800ExtraBold",
    fontWeight: "800",
    fontSize: 11,
  },
  entrySection: {
    marginBottom: 20,
  },
  entrySectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  entrySectionTitle: {
    fontFamily: "Urbanist_800ExtraBold",
    fontWeight: "800",
    fontSize: 17,
  },
  entrySectionSub: {
    fontFamily: "Urbanist_700Bold",
    fontWeight: "700",
    fontSize: 11,
  },
  entryWalletCard: {
    width: 158,
    minHeight: 66,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  entryWalletMark: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  entryWalletMarkText: {
    fontFamily: "Urbanist_800ExtraBold",
    fontWeight: "900",
    fontSize: 10,
  },
  entryWalletName: {
    fontFamily: "Urbanist_700Bold",
    fontWeight: "700",
    fontSize: 13,
  },
  entryWalletBal: {
    fontFamily: "Urbanist_700Bold",
    fontWeight: "700",
    fontSize: 10.5,
    marginTop: 2,
  },
  categoryPickerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    width: "31%",
    minHeight: 50,
    borderRadius: 17,
    borderWidth: 1.5,
    paddingVertical: 7,
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  categoryChipIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryChipText: {
    flex: 1,
    fontFamily: "Urbanist_800ExtraBold",
    fontWeight: "800",
    fontSize: 11,
  },
  entryNoteBox: {
    minHeight: 56,
    borderRadius: 19,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  entryNoteIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  entryNoteInput: {
    flex: 1,
    fontFamily: "Urbanist_700Bold",
    fontWeight: "700",
    fontSize: 13,
  },
  errorText: {
    color: "#c04444",
    fontFamily: "Urbanist_700Bold",
    fontWeight: "700",
    fontSize: 11.5,
    marginVertical: 4,
    marginLeft: 4,
  },
  entryFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 14,
    marginTop: 8,
    borderTopWidth: 1,
  },
  entryFooterLabel: {
    fontFamily: "Urbanist_800ExtraBold",
    fontWeight: "800",
    fontSize: 10.5,
  },
  entryFooterVal: {
    fontFamily: "Urbanist_800ExtraBold",
    fontWeight: "800",
    fontSize: 16,
  },
  walletSelectChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  walletSelectChipText: {
    fontFamily: "Urbanist_800ExtraBold",
    fontWeight: "800",
    fontSize: 12.5,
  },
  amountEntryBox: {
    marginVertical: 14,
    padding: 18,
    borderRadius: 25,
    borderWidth: 1,
    alignItems: "center",
  },
  amountEntryRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    marginVertical: 4,
  },
  amountEntrySign: {
    fontFamily: "Urbanist_800ExtraBold",
    fontWeight: "800",
    fontSize: 27,
  },
  amountEntryInput: {
    minWidth: 140,
    textAlign: "center",
    fontFamily: "Urbanist_800ExtraBold",
    fontWeight: "800",
    fontSize: 38,
    paddingVertical: 0,
  },
  quickAmountsGrid: {
    flexDirection: "row",
    gap: 7,
    marginBottom: 8,
  },
  quickAmountBtn: {
    flex: 1,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  transferRoute: {
    position: "relative",
    gap: 8,
  },
  transferBox: {
    minHeight: 74,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  transferSwapBtn: {
    position: "absolute",
    zIndex: 5,
    right: 22,
    top: "50%",
    marginTop: -23,
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 4,
    overflow: "hidden",
  },
  transferSwapInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmPanel: {
    marginTop: 10,
    marginBottom: 6,
    padding: 16,
    borderRadius: 20,
  },
  confirmSub: {
    color: "rgba(255, 255, 255, 0.65)",
    fontFamily: "Urbanist_600SemiBold",
    fontWeight: "600",
    fontSize: 11,
  },
  confirmAmount: {
    color: "#ffffff",
    fontFamily: "Urbanist_800ExtraBold",
    fontWeight: "800",
    fontSize: 24,
    marginVertical: 2,
  },
});
