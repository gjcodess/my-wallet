import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Easing,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { AmountKeypad, formatAmountInput } from "./AmountKeypad";
import {
  ActivityItem,
  EXPENSE_CATEGORIES,
  getWalletLocalId,
  INCOME_CATEGORIES,
  isAdjustmentActivity,
  isTransferActivity,
  money,
  Sheet,
  Tab,
  Tone,
  tonePalette,
  UserProfile,
  Wallet,
} from "../types/wallet";
import { FolderSurface } from "./FolderSurface";
import { Icon } from "./Icon";
import {
  AccentSurfaceGlow,
  bevelStyle,
  cardShadow,
  EdgeFade,
  ThemeColors,
  TopBar,
  TxRow,
} from "./SharedUI";
import { WalletFolder, WalletLogoBadge } from "./WalletFolder";
import {
  resolveWalletCardDesign,
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
  activities = [],
  selected,
  activity,
  hidden = false,
  onSaveWallets,
  onDeleteWallet,
  onRecordActivity,
  onUpdateActivity,
  onDeleteActivity,
  onRenameWalletActivities,
  onOpenWallet: onOpenWalletProp,
  onOpenTransaction,
  onNavigateTab,
  onClose: onCloseProp,
  onSwitchSheet,
  onDone: onDoneProp,
  profile,
  onUpdateProfile,
  monthlyBudget = null,
  onSaveMonthlyBudget,
  userEmail,
  onSyncNow,
  theme,
}: {
  type: Exclude<Sheet, null>;
  wallets: Wallet[];
  activities?: ActivityItem[];
  selected: Wallet | null;
  activity?: ActivityItem | null;
  hidden?: boolean;
  onSaveWallets: (next: Wallet[]) => void;
  onDeleteWallet?: (wallet: Wallet) => void;
  onRecordActivity: (item: Omit<ActivityItem, "id" | "date">) => void;
  onUpdateActivity?: (item: ActivityItem, nextWallets: Wallet[]) => void;
  onDeleteActivity?: (item: ActivityItem, nextWallets: Wallet[]) => void;
  onRenameWalletActivities?: (wallet: Wallet, newName: string) => void;
  onOpenWallet?: (w: Wallet) => void;
  onOpenTransaction?: (item: ActivityItem) => void;
  onNavigateTab?: (tab: Tab) => void;
  onClose: () => void;
  onSwitchSheet?: (nextType: Exclude<Sheet, null>, wallet?: Wallet) => void;
  onDone: (message: string) => void;
  profile: UserProfile;
  onUpdateProfile: (p: UserProfile) => void;
  monthlyBudget?: number | null;
  onSaveMonthlyBudget?: (next: number | null) => void;
  userEmail: string | null;
  onSyncNow: () => Promise<void>;
  theme: ThemeColors;
}) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const sheetStartY = Math.min(Math.max(windowHeight, 560), 760);
  const openAnim = useRef(new Animated.Value(0)).current;
  const closingRef = useRef(false);

  const closeWith = useCallback(
    (cb: () => void) => {
      if (closingRef.current) return;
      closingRef.current = true;
      Keyboard.dismiss();
      Animated.timing(openAnim, {
        toValue: 0,
        duration: 185,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        cb();
      });
    },
    [openAnim]
  );

  const onClose = useCallback(
    () => closeWith(onCloseProp),
    [closeWith, onCloseProp]
  );
  const onDone = useCallback(
    (message: string) => closeWith(() => onDoneProp(message)),
    [closeWith, onDoneProp]
  );
  const onOpenWallet = useMemo(
    () =>
      onOpenWalletProp
        ? (w: Wallet) => closeWith(() => onOpenWalletProp(w))
        : undefined,
    [closeWith, onOpenWalletProp]
  );
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
  const [showOpeningKeypad, setShowOpeningKeypad] = useState(false);
  const [walletConfirmDelete, setWalletConfirmDelete] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const sheetScrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    sheetScrollY.setValue(0);
    setShowOpeningKeypad(false);
    setWalletConfirmDelete(false);
    setGlobalSearch("");
    setTransferFee(0);
    setPickingTransferSide(null);
    setUpdateMode("set");
    if (type === "budget") {
      setAmount(monthlyBudget && monthlyBudget > 0 ? String(monthlyBudget) : "");
    }
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
  const [transferFee, setTransferFee] = useState<number>(0);
  const [pickingTransferSide, setPickingTransferSide] = useState<
    "from" | "to" | null
  >(null);
  const [updateMode, setUpdateMode] = useState<"set" | "add" | "sub">("set");

  // Transaction Detail Edit / Delete states
  const [txEditing, setTxEditing] = useState(false);
  const [txConfirmDelete, setTxConfirmDelete] = useState(false);
  const [txTitle, setTxTitle] = useState("");
  const [txAmount, setTxAmount] = useState("");
  const [txDirection, setTxDirection] = useState<"expense" | "income">("expense");
  const [txCategory, setTxCategory] = useState("Food");
  const [txWalletId, setTxWalletId] = useState(fallback);
  const [txDestWalletId, setTxDestWalletId] = useState(fallback);

  useEffect(() => {
    setTxEditing(false);
    setTxConfirmDelete(false);
    if (type === "tx" && activity) {
      const matchedSrc = wallets.find(
        (w) =>
          (activity.walletLocalId &&
            getWalletLocalId(w) === activity.walletLocalId) ||
          w.name === activity.wallet
      );
      const matchedDest = wallets.find(
        (w) =>
          (activity.destWalletLocalId &&
            getWalletLocalId(w) === activity.destWalletLocalId) ||
          activity.title.endsWith(` to ${w.name}`)
      );
      setTxTitle(activity.title);
      setTxAmount(String(Math.abs(activity.amount)));
      setTxDirection(activity.amount >= 0 ? "income" : "expense");
      setTxCategory(activity.kind || "Other");
      setTxWalletId(matchedSrc?.id ?? wallets[0]?.id ?? fallback);
      setTxDestWalletId(
        matchedDest?.id ??
          wallets.find((w) => w.id !== (matchedSrc?.id ?? fallback))?.id ??
          fallback
      );
    }
  }, [type, activity?.id]);

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

  const isPresetSheet = type === "add" || type === "edit";

  const globalSearchResults = useMemo(() => {
    if (type !== "search") {
      return {
        wallets: [] as Wallet[],
        activities: [] as ActivityItem[],
        actions: [] as {
          id: string;
          label: string;
          sub: string;
          icon: string;
          keywords: string;
          sheet?: Exclude<Sheet, null>;
          tab?: Tab;
        }[],
      };
    }

    const quickItems: {
      id: string;
      label: string;
      sub: string;
      icon: string;
      keywords: string;
      sheet?: Exclude<Sheet, null>;
      tab?: Tab;
    }[] = [
      {
        id: "act-entry",
        label: "Add transaction",
        sub: "Log an expense or money in",
        icon: "plus",
        keywords: "expense income spend earn money in out log record",
        sheet: "entry",
      },
      {
        id: "act-add",
        label: "Add new wallet",
        sub: "Bank, e-wallet, or cash card",
        icon: "wallet",
        keywords: "new card bank ewallet account create",
        sheet: "add",
      },
      {
        id: "act-transfer",
        label: "Transfer between wallets",
        sub: "Move money across cards",
        icon: "swap",
        keywords: "move send transfer fee",
        sheet: "transfer",
      },
      {
        id: "act-update",
        label: "Update balance",
        sub: "Adjust or edit wallet balance",
        icon: "edit",
        keywords: "adjust balance edit wallet",
        sheet: "update",
      },
      {
        id: "act-budget",
        label: "Monthly budget",
        sub: "Set or adjust spending target",
        icon: "trend",
        keywords: "target spending limit budget",
        sheet: "budget",
      },
      {
        id: "tab-wallets",
        label: "My Wallets",
        sub: "View & reorder all cards",
        icon: "wallet",
        keywords: "cards wallets combined balance reorder",
        tab: "wallets",
      },
      {
        id: "tab-activity",
        label: "Activity & analytics",
        sub: "Charts, categories, CSV export",
        icon: "activity",
        keywords: "charts spending history filter export csv",
        tab: "activity",
      },
      {
        id: "tab-settings",
        label: "Settings",
        sub: "Theme, accent color, PIN lock, sync",
        icon: "settings",
        keywords: "dark mode theme accent pin lock biometrics backup supabase",
        tab: "settings",
      },
    ];

    const q = globalSearch.trim().toLowerCase();
    if (!q) {
      return {
        wallets: wallets.slice(0, 4),
        activities: activities.slice(0, 6),
        actions: quickItems.slice(0, 4),
      };
    }

    const matchedWallets = wallets.filter((w) =>
      `${w.name} ${w.type} ${w.account} ${w.balance}`
        .toLowerCase()
        .includes(q)
    );
    const matchedActivities = activities
      .filter((item) =>
        `${item.title} ${item.wallet} ${item.kind} ${item.date} ${Math.abs(item.amount)}`
          .toLowerCase()
          .includes(q)
      )
      .slice(0, 20);
    const matchedActions = quickItems.filter((a) =>
      `${a.label} ${a.sub} ${a.keywords}`.toLowerCase().includes(q)
    );

    return {
      wallets: matchedWallets,
      activities: matchedActivities,
      actions: matchedActions,
    };
  }, [type, globalSearch, wallets, activities]);

  const selectedPreset = useMemo(
    () =>
      isPresetSheet
        ? walletPresets.find((p) => p.key === selectedPresetKey)
        : undefined,
    [isPresetSheet, selectedPresetKey]
  );

  const filteredPresets = useMemo(() => {
    if (!isPresetSheet) return [];
    const q = presetSearch.trim().toLowerCase();
    return walletPresets.filter((p) => {
      const matchesGroup = presetGroup === "All" || p.group === presetGroup;
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.type.toLowerCase().includes(q);
      return matchesGroup && matchesQuery;
    });
  }, [isPresetSheet, presetGroup, presetSearch]);

  const handleSelectPreset = useCallback((preset: WalletPreset | "custom") => {
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
  }, []);

  const preview: Wallet = useMemo(
    () => ({
      id: 0,
      name: name || "New wallet",
      type: category,
      balance: Number(balance) || 0,
      mark: selectedPreset?.mark || (name || "NW").slice(0, 2).toUpperCase(),
      tone,
      account: accountLabel.trim() || "Manual tracking",
      logoKey,
    }),
    [name, category, balance, selectedPreset?.mark, tone, accountLabel, logoKey]
  );

  useEffect(() => {
    closingRef.current = false;
    openAnim.setValue(0);
    const raf = requestAnimationFrame(() => {
      Animated.timing(openAnim, {
        toValue: 1,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
    return () => cancelAnimationFrame(raf);
  }, [openAnim]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [onClose]);

  const transferValue = Number(amount);
  const transferTotalDebit = Number(
    ((transferValue || 0) + transferFee).toFixed(2)
  );
  const entryValue = Number(amount);
  const entryWallet = wallets.find((w) => w.id === walletId) || wallets[0];

  const entryCategories =
    entryType === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const entryIcon =
    entryCategories.find(([label]) => label === entryCategory)?.[1] || "adjust";

  const entryInvalid =
    !entryValue ||
    (entryType === "expense" && entryValue > (entryWallet?.balance || 0));

  const updateNumeric = Number(amount);
  const hasUpdateInput = amount !== "" && Number.isFinite(updateNumeric);
  const updateProjectedBalance = (() => {
    if (!current) return 0;
    if (!hasUpdateInput) return current.balance;
    if (updateMode === "add") {
      return Number((current.balance + updateNumeric).toFixed(2));
    }
    if (updateMode === "sub") {
      return Number((current.balance - updateNumeric).toFixed(2));
    }
    return Number(updateNumeric.toFixed(2));
  })();
  const updateDifference = current
    ? Number((updateProjectedBalance - current.balance).toFixed(2))
    : 0;
  const updateInvalid =
    !current ||
    !hasUpdateInput ||
    (updateMode !== "set" && updateNumeric <= 0) ||
    updateProjectedBalance < 0;

  const transferInvalid =
    !transferValue ||
    transferValue <= 0 ||
    source === destination ||
    transferTotalDebit > (sourceWallet?.balance || 0);

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
        kind: entryCategory,
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
      if (editTarget.name !== trimmedName) {
        onRenameWalletActivities?.(editTarget, trimmedName);
      }
      onSaveWallets(nextWallets);
      onDone(`${trimmedName} updated`);
    }

    if (type === "update" && !updateInvalid && current) {
      const nextWallets = wallets.map((w) =>
        w.id === walletId
          ? { ...w, balance: updateProjectedBalance, updatedAt: now, synced: false }
          : w
      );
      onSaveWallets(nextWallets);
      if (updateDifference !== 0) {
        onRecordActivity({
          localId: `tx-${Date.now()}`,
          walletLocalId: getWalletLocalId(current),
          title:
            updateMode === "add"
              ? "Balance top-up"
              : updateMode === "sub"
                ? "Balance deduction"
                : "Balance adjustment",
          wallet: current.name,
          amount: updateDifference,
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
              balance: Number((w.balance - transferTotalDebit).toFixed(2)),
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
        walletLocalId: getWalletLocalId(sourceWallet),
        destWalletLocalId: getWalletLocalId(destWallet),
        title: `${sourceWallet.name} to ${destWallet.name}`,
        wallet: sourceWallet.name,
        amount: -transferValue,
        icon: "swap",
        kind: "Transfer",
        occurredAt: now,
        updatedAt: now,
        synced: false,
      });
      if (transferFee > 0) {
        onRecordActivity({
          localId: `tx-${Date.now()}-fee`,
          walletLocalId: getWalletLocalId(sourceWallet),
          title: `Transfer fee (${sourceWallet.name} to ${destWallet.name})`,
          wallet: sourceWallet.name,
          amount: -transferFee,
          icon: "bolt",
          kind: "Other",
          occurredAt: now,
          updatedAt: now,
          synced: false,
        });
      }
      onDone(
        transferFee > 0
          ? `${money(transferValue)} transferred (+${money(transferFee)} fee)`
          : `${money(transferValue)} transferred`
      );
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
              : type === "tx"
                ? "Transaction Details"
                : type === "budget"
                  ? "Monthly Budget"
                  : type === "search"
                    ? "Search"
                    : "Account & Cloud Sync";

  const heroTone: Tone = entryType === "expense" ? "blue" : "yellow";
  const heroPal = tonePalette[heroTone];

  const renderCategoryGrid = (
    items: [string, string][],
    selectedLabel: string,
    onSelect: (label: string) => void
  ) => {
    const rows: [string, string][][] = [];
    for (let i = 0; i < items.length; i += 3) {
      rows.push(items.slice(i, i + 3));
    }
    return (
      <View style={styles.categoryPickerGrid}>
        {rows.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.categoryGridRow}>
            {row.map(([label, icon]) => {
              const active = selectedLabel === label;
              return (
                <Pressable
                  key={label}
                  onPress={() => onSelect(label)}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: active ? theme.surface : theme.soft,
                      borderColor: active ? theme.accent : theme.line,
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
                      size={14}
                      color={active ? theme.accentInk : theme.accentText}
                    />
                  </LinearGradient>
                  <Text
                    style={[styles.categoryChipText, { color: theme.ink }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.82}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
            {row.length < 3
              ? Array.from({ length: 3 - row.length }).map((_, emptyIdx) => (
                  <View key={`empty-${emptyIdx}`} style={{ flex: 1 }} />
                ))
              : null}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={[styles.overlayRoot, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={styles.sheetLayer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Animated.View
          style={[styles.backdrop, { opacity: openAnim }]}
          pointerEvents="none"
        />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[
            styles.bottomSheet,
            {
              backgroundColor: theme.page,
              paddingBottom: Math.max(20, insets.bottom + 8),
              maxHeight:
                type === "add" ||
                type === "entry" ||
                type === "auth" ||
                type === "search"
                  ? "92%"
                  : "86%",
              transform: [
                {
                  translateY: openAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [sheetStartY, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View
            style={[styles.sheetHandle, { backgroundColor: theme.soft2 }]}
          />
          <TopBar title={sheetTitle} onBack={onClose} theme={theme} />

          <View style={{ flexShrink: 1, position: "relative" }}>
            <Animated.ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingTop: 6, paddingBottom: 32 }}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { y: sheetScrollY } } }],
                { useNativeDriver: true }
              )}
              scrollEventThrottle={16}
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
                    placeholder="Search GCash, BPI, MariBank..."
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
                  <FlatList
                    horizontal
                    data={filteredPresets}
                    keyExtractor={(item) => item.key}
                    showsHorizontalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    initialNumToRender={6}
                    maxToRenderPerBatch={6}
                    windowSize={3}
                    removeClippedSubviews
                    contentContainerStyle={{ gap: 9, paddingVertical: 2, paddingHorizontal: 4 }}
                    ListHeaderComponent={
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
                    }
                    renderItem={({ item: preset }) => {
                      const active = selectedPresetKey === preset.key;
                      const pPal = tonePalette[preset.recommendedTone];
                      return (
                        <Pressable
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
                    }}
                    ListEmptyComponent={
                      <View
                        style={[
                          styles.presetEmptyNote,
                          { backgroundColor: theme.soft, borderColor: theme.line },
                        ]}
                      >
                        <Text style={[styles.presetSub, { color: theme.muted }]}>
                          No matching preset — tap Custom
                        </Text>
                      </View>
                    }
                  />
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
                    onFocus={() => setShowOpeningKeypad(false)}
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
                    onFocus={() => setShowOpeningKeypad(false)}
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
                    <Pressable
                      onPress={() => {
                        Keyboard.dismiss();
                        setShowOpeningKeypad((prev) => !prev);
                      }}
                      style={[
                        styles.softField,
                        {
                          flex: 1,
                          backgroundColor: showOpeningKeypad
                            ? theme.surface
                            : theme.soft,
                          borderColor: showOpeningKeypad
                            ? theme.accent
                            : theme.line,
                        },
                      ]}
                    >
                      <Text style={[styles.fieldLabel, { color: theme.muted }]}>
                        Opening balance
                      </Text>
                      <Text
                        style={[
                          styles.fieldInput,
                          {
                            color: balance ? theme.ink : theme.muted,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {balance ? `₱${formatAmountInput(balance)}` : "₱0.00"}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>

                {type === "add" && showOpeningKeypad ? (
                  <AmountKeypad
                    value={balance}
                    onChange={setBalance}
                    quickAmounts={[500, 1000, 5000]}
                    compact
                    theme={theme}
                  />
                ) : null}

                {/* 12-Tone Color Picker */}
                {(() => {
                  const hasBrandCardArt = Boolean(
                    resolveWalletCardDesign(logoKey, name)
                  );
                  return (
                    <View style={styles.colorHeaderRow}>
                      <Text style={[styles.fieldLabel, { color: theme.muted }]}>
                        {hasBrandCardArt ? "Accent & chart color" : "Card color"}
                      </Text>
                      {hasBrandCardArt ? (
                        <Text
                          style={[
                            styles.recommendedHint,
                            { color: theme.accentText },
                          ]}
                        >
                          Uses brand card art
                        </Text>
                      ) : recommendedTone ? (
                        <Text
                          style={[
                            styles.recommendedHint,
                            { color: theme.accentText },
                          ]}
                        >
                          Recommended: {tonePalette[recommendedTone].label}
                          {tone !== recommendedTone ? " (customized)" : ""}
                        </Text>
                      ) : null}
                    </View>
                  );
                })()}
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

                {type === "edit" && editTarget && onDeleteWallet ? (
                  walletConfirmDelete ? (
                    <View
                      style={[
                        styles.txConfirmDeleteBox,
                        {
                          marginTop: 12,
                          backgroundColor: theme.dark
                            ? "rgba(192, 68, 68, 0.16)"
                            : "#fdeaea",
                          borderColor: "rgba(192, 68, 68, 0.35)",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.txConfirmDeleteTitle,
                          { color: theme.dark ? "#fca5a5" : "#991b1b" },
                        ]}
                      >
                        Delete "{editTarget.name}"? Past activity logs will stay in Activity.
                      </Text>
                      <View style={styles.txActionPair}>
                        <Pressable
                          onPress={() => setWalletConfirmDelete(false)}
                          style={[
                            styles.txActionHalfBtn,
                            { backgroundColor: theme.card },
                          ]}
                        >
                          <Text
                            style={[styles.secondaryButtonText, { color: theme.ink }]}
                          >
                            Cancel
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => {
                            onDeleteWallet(editTarget);
                            onDone(`${editTarget.name} deleted`);
                          }}
                          style={[
                            styles.txActionHalfBtn,
                            { backgroundColor: "#c04444" },
                          ]}
                        >
                          <Text
                            style={[styles.secondaryButtonText, { color: "#ffffff" }]}
                          >
                            Confirm delete
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => setWalletConfirmDelete(true)}
                      style={[
                        styles.secondaryButton,
                        {
                          marginTop: 10,
                          backgroundColor: theme.dark
                            ? "rgba(192, 68, 68, 0.16)"
                            : "#fdeaea",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.secondaryButtonText,
                          { color: "#c04444" },
                        ]}
                      >
                        Delete wallet
                      </Text>
                    </Pressable>
                  )
                ) : null}
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
                          <Text
                            style={[
                              styles.entryBigInput,
                              {
                                color: heroPal.ink,
                                opacity: amount ? 1 : 0.42,
                              },
                            ]}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                          >
                            {amount ? formatAmountInput(amount) : "0.00"}
                          </Text>
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

                {/* Built-In Amount Keypad */}
                <AmountKeypad
                  value={amount}
                  onChange={setAmount}
                  quickAmounts={[100, 500, 1000, 5000]}
                  compact
                  theme={theme}
                />

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
                  {renderCategoryGrid(
                    entryCategories,
                    entryCategory,
                    setEntryCategory
                  )}
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
                <WalletFolder
                  wallet={
                    hasUpdateInput
                      ? {
                          ...current,
                          balance: Math.max(0, updateProjectedBalance),
                        }
                      : current
                  }
                  hidden={false}
                  compact
                />

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
                <View style={{ marginTop: 14, marginBottom: 10 }}>
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
                          onPress={() => {
                            setWalletId(w.id);
                            setAmount("");
                          }}
                          style={[
                            styles.walletSelectChip,
                            {
                              backgroundColor: active
                                ? theme.accent
                                : theme.soft,
                              borderColor: active
                                ? theme.accent
                                : theme.line,
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 6,
                            },
                          ]}
                        >
                          <WalletLogoBadge
                            logoKey={w.logoKey}
                            name={w.name}
                            mark={w.mark}
                            size={18}
                            radius={6}
                            ink={active ? "#ffffff" : theme.ink}
                            fontSize={7}
                          />
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

                {/* Update Mode Toggle: Set exact | Add (+) | Subtract (-) */}
                <View
                  style={[
                    styles.updateModeBar,
                    { backgroundColor: theme.soft, borderColor: theme.line },
                  ]}
                >
                  {(
                    [
                      ["set", "Set exact"],
                      ["add", "Add (+)"],
                      ["sub", "Subtract (-)"],
                    ] as const
                  ).map(([modeKey, modeLabel]) => {
                    const active = updateMode === modeKey;
                    return (
                      <Pressable
                        key={modeKey}
                        onPress={() => {
                          setUpdateMode(modeKey);
                          setAmount("");
                        }}
                        style={[
                          styles.updateModeBtn,
                          active && { backgroundColor: theme.surface },
                        ]}
                      >
                        <Text
                          style={[
                            styles.updateModeText,
                            { color: active ? theme.ink : theme.muted },
                          ]}
                        >
                          {modeLabel}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View
                  style={[
                    styles.amountEntryBox,
                    {
                      backgroundColor: theme.soft,
                      borderColor: theme.line,
                      marginTop: 10,
                      marginBottom: 8,
                    },
                  ]}
                >
                  <View style={styles.transferAmountHeadRow}>
                    <Text style={[styles.fieldLabel, { color: theme.muted }]}>
                      {updateMode === "set"
                        ? "New exact balance"
                        : updateMode === "add"
                          ? "Amount to add"
                          : "Amount to subtract"}
                    </Text>
                    {updateMode === "set" ? (
                      <Pressable
                        onPress={() =>
                          setAmount(String(Number(current.balance.toFixed(2))))
                        }
                        style={[
                          styles.sendAllChip,
                          { backgroundColor: theme.accentSoft },
                        ]}
                      >
                        <Text
                          style={[
                            styles.sendAllChipText,
                            { color: theme.accentText },
                          ]}
                        >
                          Use current
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                  <View style={styles.amountEntryRow}>
                    <Text style={[styles.amountEntrySign, { color: theme.ink }]}>
                      {updateMode === "add"
                        ? "+₱"
                        : updateMode === "sub"
                          ? "-₱"
                          : "₱"}
                    </Text>
                    <Text
                      style={[
                        styles.amountEntryInput,
                        { color: amount ? theme.ink : theme.muted },
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {amount ? formatAmountInput(amount) : "0.00"}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.fieldLabel,
                      {
                        color:
                          updateProjectedBalance < 0
                            ? "#c04444"
                            : hasUpdateInput && updateDifference !== 0
                              ? theme.accentText
                              : theme.muted,
                      },
                    ]}
                  >
                    {hasUpdateInput
                      ? updateMode === "set"
                        ? `Current: ${money(current.balance)} · Change: ${updateDifference >= 0 ? "+" : "-"}${money(Math.abs(updateDifference))}`
                        : `New balance: ${money(updateProjectedBalance)} (from ${money(current.balance)})`
                      : `Current: ${money(current.balance)}`}
                  </Text>
                </View>

                {updateProjectedBalance < 0 ? (
                  <Text style={styles.errorText}>
                    Resulting balance cannot be negative.
                  </Text>
                ) : null}

                <AmountKeypad
                  value={amount}
                  onChange={setAmount}
                  quickAmounts={
                    updateMode === "set"
                      ? [500, 1000, 5000]
                      : [100, 500, 1000, 5000]
                  }
                  quickBase={updateMode === "set" ? current.balance : 0}
                  compact
                  theme={theme}
                />

                <PrimaryButton
                  label={
                    hasUpdateInput
                      ? `Save ${money(Math.max(0, updateProjectedBalance))}`
                      : "Save new balance"
                  }
                  disabled={updateInvalid}
                  onPress={save}
                  theme={theme}
                />
              </View>
            )}

            {/* ==================== TRANSFER SHEET ==================== */}
            {type === "transfer" && sourceWallet && destWallet && (
              <View>
                {/* Side-by-Side From -> To Wallet Cards with Floating Swap */}
                <View style={styles.transferSideRow}>
                  <Pressable
                    onPress={() =>
                      setPickingTransferSide(
                        pickingTransferSide === "from" ? null : "from"
                      )
                    }
                    style={[
                      styles.transferSideCard,
                      {
                        backgroundColor:
                          pickingTransferSide === "from"
                            ? theme.surface
                            : theme.soft,
                        borderColor:
                          pickingTransferSide === "from"
                            ? theme.accent
                            : theme.line,
                      },
                    ]}
                  >
                    <Text style={[styles.transferSideRole, { color: theme.muted }]}>
                      FROM · TAP TO CHANGE
                    </Text>
                    <View style={styles.transferSideIdentity}>
                      <WalletLogoBadge
                        logoKey={sourceWallet.logoKey}
                        name={sourceWallet.name}
                        mark={sourceWallet.mark}
                        size={28}
                        radius={9}
                        ink={theme.ink}
                        fontSize={9}
                      />
                      <Text
                        style={[styles.transferSideName, { color: theme.ink }]}
                        numberOfLines={1}
                      >
                        {sourceWallet.name}
                      </Text>
                    </View>
                    <Text
                      style={[styles.transferSideBal, { color: theme.muted }]}
                      numberOfLines={1}
                    >
                      {money(sourceWallet.balance)}
                    </Text>
                    {transferValue > 0 ? (
                      <Text
                        style={[
                          styles.transferSideAfter,
                          {
                            color:
                              transferTotalDebit > sourceWallet.balance
                                ? "#c04444"
                                : theme.accentText,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        After:{" "}
                        {money(
                          Number(
                            (sourceWallet.balance - transferTotalDebit).toFixed(2)
                          )
                        )}
                      </Text>
                    ) : null}
                  </Pressable>

                  <Pressable
                    onPress={() =>
                      setPickingTransferSide(
                        pickingTransferSide === "to" ? null : "to"
                      )
                    }
                    style={[
                      styles.transferSideCard,
                      {
                        backgroundColor:
                          pickingTransferSide === "to"
                            ? theme.surface
                            : theme.soft,
                        borderColor:
                          pickingTransferSide === "to"
                            ? theme.accent
                            : theme.line,
                      },
                    ]}
                  >
                    <Text style={[styles.transferSideRole, { color: theme.muted }]}>
                      TO · TAP TO CHANGE
                    </Text>
                    <View style={styles.transferSideIdentity}>
                      <WalletLogoBadge
                        logoKey={destWallet.logoKey}
                        name={destWallet.name}
                        mark={destWallet.mark}
                        size={28}
                        radius={9}
                        ink={theme.ink}
                        fontSize={9}
                      />
                      <Text
                        style={[styles.transferSideName, { color: theme.ink }]}
                        numberOfLines={1}
                      >
                        {destWallet.name}
                      </Text>
                    </View>
                    <Text
                      style={[styles.transferSideBal, { color: theme.muted }]}
                      numberOfLines={1}
                    >
                      {money(destWallet.balance)}
                    </Text>
                    {transferValue > 0 ? (
                      <Text
                        style={[
                          styles.transferSideAfter,
                          { color: theme.accentText },
                        ]}
                        numberOfLines={1}
                      >
                        After:{" "}
                        {money(
                          Number((destWallet.balance + transferValue).toFixed(2))
                        )}
                      </Text>
                    ) : null}
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      setSource(destination);
                      setDestination(source);
                    }}
                    style={[
                      styles.transferCenterSwapBtn,
                      { borderColor: theme.page },
                    ]}
                  >
                    <LinearGradient
                      colors={theme.accentGradient}
                      style={styles.transferSwapInner}
                    >
                      <Icon name="swap" size={16} color={theme.accentInk} />
                    </LinearGradient>
                  </Pressable>
                </View>

                {pickingTransferSide ? (
                  <View
                    style={[
                      styles.transferPickerDrawer,
                      { backgroundColor: theme.soft, borderColor: theme.line },
                    ]}
                  >
                    <Text
                      style={[
                        styles.fieldLabel,
                        { color: theme.muted, marginBottom: 6 },
                      ]}
                    >
                      {pickingTransferSide === "from"
                        ? "Select source wallet"
                        : "Select destination wallet"}
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 8 }}
                    >
                      {wallets.map((w) => {
                        const active =
                          pickingTransferSide === "from"
                            ? w.id === source
                            : w.id === destination;
                        return (
                          <Pressable
                            key={w.id}
                            onPress={() => {
                              if (pickingTransferSide === "from") {
                                if (w.id === destination) {
                                  setDestination(source);
                                }
                                setSource(w.id);
                              } else {
                                if (w.id === source) {
                                  setSource(destination);
                                }
                                setDestination(w.id);
                              }
                              setPickingTransferSide(null);
                            }}
                            style={[
                              styles.walletSelectChip,
                              {
                                backgroundColor: active
                                  ? theme.accent
                                  : theme.card,
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 6,
                              },
                            ]}
                          >
                            <WalletLogoBadge
                              logoKey={w.logoKey}
                              name={w.name}
                              mark={w.mark}
                              size={18}
                              radius={6}
                              ink={active ? "#ffffff" : theme.ink}
                              fontSize={7}
                            />
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
                ) : null}

                {/* Amount Display Box with Send-All Chip */}
                <View
                  style={[
                    styles.amountEntryBox,
                    {
                      backgroundColor: theme.soft,
                      borderColor: theme.line,
                      marginTop: 12,
                      marginBottom: 8,
                    },
                  ]}
                >
                  <View style={styles.transferAmountHeadRow}>
                    <Text style={[styles.fieldLabel, { color: theme.muted }]}>
                      Amount to transfer
                    </Text>
                    {sourceWallet.balance > transferFee ? (
                      <Pressable
                        onPress={() =>
                          setAmount(
                            String(
                              Math.max(
                                0,
                                Number(
                                  (sourceWallet.balance - transferFee).toFixed(2)
                                )
                              )
                            )
                          )
                        }
                        style={[
                          styles.sendAllChip,
                          { backgroundColor: theme.accentSoft },
                        ]}
                      >
                        <Text
                          style={[
                            styles.sendAllChipText,
                            { color: theme.accentText },
                          ]}
                        >
                          Send max
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                  <View style={styles.amountEntryRow}>
                    <Text style={[styles.amountEntrySign, { color: theme.ink }]}>
                      ₱
                    </Text>
                    <Text
                      style={[
                        styles.amountEntryInput,
                        { color: amount ? theme.ink : theme.muted },
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {amount ? formatAmountInput(amount) : "0.00"}
                    </Text>
                  </View>
                  <Text style={[styles.fieldLabel, { color: theme.muted }]}>
                    {transferFee > 0
                      ? `Total deducted: ${money(transferTotalDebit)} (incl. ${money(transferFee)} fee)`
                      : `Available in ${sourceWallet.name}: ${money(sourceWallet.balance)}`}
                  </Text>
                </View>

                {/* Optional Transfer Fee Chips */}
                <View style={styles.feeRow}>
                  <Text style={[styles.feeLabel, { color: theme.muted }]}>
                    Fee
                  </Text>
                  {[0, 10, 15, 25].map((feeAmt) => {
                    const active = transferFee === feeAmt;
                    return (
                      <Pressable
                        key={feeAmt}
                        onPress={() => setTransferFee(feeAmt)}
                        style={[
                          styles.feeChip,
                          {
                            backgroundColor: active
                              ? theme.accent
                              : theme.soft,
                            borderColor: active ? theme.accent : theme.line,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.feeChipText,
                            { color: active ? theme.accentInk : theme.ink },
                          ]}
                        >
                          {feeAmt === 0 ? "Free" : `₱${feeAmt}`}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <AmountKeypad
                  value={amount}
                  onChange={setAmount}
                  quickAmounts={[500, 1000, 5000]}
                  compact
                  theme={theme}
                />

                {source === destination && (
                  <Text style={styles.errorText}>
                    Choose two different wallets.
                  </Text>
                )}
                {transferTotalDebit > sourceWallet.balance && (
                  <Text style={styles.errorText}>
                    {transferFee > 0
                      ? "Amount + fee exceeds the available balance."
                      : "Amount is higher than the available balance."}
                  </Text>
                )}

                <PrimaryButton
                  label={
                    transferValue > 0
                      ? `Send ${money(transferValue)} to ${destWallet.name}`
                      : "Confirm transfer"
                  }
                  disabled={transferInvalid}
                  onPress={save}
                  theme={theme}
                />
              </View>
            )}

            {/* ==================== TRANSACTION DETAILS SHEET ==================== */}
            {type === "tx" && activity && (() => {
              const isTransfer = isTransferActivity(activity);
              const isAdjustment = isAdjustmentActivity(activity);
              const isPositive = activity.amount > 0;
              const matchedWallet = wallets.find(
                (w) =>
                  (activity.walletLocalId &&
                    getWalletLocalId(w) === activity.walletLocalId) ||
                  w.name === activity.wallet
              );
              const matchedDestWallet = isTransfer
                ? wallets.find(
                    (w) =>
                      (activity.destWalletLocalId &&
                        getWalletLocalId(w) === activity.destWalletLocalId) ||
                      activity.title.endsWith(` to ${w.name}`)
                  )
                : undefined;
              const { dateLabel, timeLabel } = formatTransactionDateTime(activity);
              const iconBg = isPositive
                ? theme.dark
                  ? "rgba(250, 204, 21, 0.16)"
                  : "#fef1a8"
                : theme.accentSoft;
              const iconColor = isPositive
                ? theme.dark
                  ? "#fde047"
                  : "#9a6700"
                : theme.accentText;

              const applyWalletDeltas = (deltas: Map<number, number>): Wallet[] => {
                const now = new Date().toISOString();
                return wallets.map((w) => {
                  const delta = deltas.get(w.id);
                  if (!delta) return w;
                  return {
                    ...w,
                    balance: Number((w.balance + delta).toFixed(2)),
                    updatedAt: now,
                    synced: false,
                  };
                });
              };

              const buildRollbackDeltas = (): Map<number, number> => {
                const deltas = new Map<number, number>();
                if (isTransfer) {
                  const absAmt = Math.abs(activity.amount);
                  if (matchedWallet) {
                    deltas.set(matchedWallet.id, absAmt);
                  }
                  if (matchedDestWallet) {
                    deltas.set(
                      matchedDestWallet.id,
                      (deltas.get(matchedDestWallet.id) ?? 0) - absAmt
                    );
                  }
                } else if (matchedWallet) {
                  deltas.set(matchedWallet.id, -activity.amount);
                }
                return deltas;
              };

              const handleConfirmDeleteTx = () => {
                if (!onDeleteActivity) return;
                const nextWallets = applyWalletDeltas(buildRollbackDeltas());
                onDeleteActivity(activity, nextWallets);
                onDone("Transaction deleted · Balance restored");
              };

              const editNum = Number(txAmount);
              const editSrcWallet =
                wallets.find((w) => w.id === txWalletId) || matchedWallet || wallets[0];
              const editDestWallet =
                wallets.find((w) => w.id === txDestWalletId) ||
                matchedDestWallet ||
                wallets.find((w) => w.id !== editSrcWallet?.id) ||
                wallets[0];
              const editCats =
                txDirection === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
              const editInvalid =
                !editNum ||
                editNum <= 0 ||
                (isTransfer &&
                  (!editSrcWallet ||
                    !editDestWallet ||
                    editSrcWallet.id === editDestWallet.id));

              const handleSaveTxEdit = () => {
                if (!onUpdateActivity || editInvalid || !editSrcWallet) return;
                const now = new Date().toISOString();
                const deltas = buildRollbackDeltas();
                const signed = isTransfer
                  ? -editNum
                  : txDirection === "expense"
                    ? -editNum
                    : editNum;

                if (isTransfer && editDestWallet) {
                  deltas.set(
                    editSrcWallet.id,
                    (deltas.get(editSrcWallet.id) ?? 0) - editNum
                  );
                  deltas.set(
                    editDestWallet.id,
                    (deltas.get(editDestWallet.id) ?? 0) + editNum
                  );
                } else {
                  deltas.set(
                    editSrcWallet.id,
                    (deltas.get(editSrcWallet.id) ?? 0) + signed
                  );
                }

                const nextIcon = isTransfer
                  ? "swap"
                  : isAdjustment
                    ? "adjust"
                    : editCats.find(([lbl]) => lbl === txCategory)?.[1] ||
                      activity.icon ||
                      "adjust";
                const nextKind = isTransfer
                  ? "Transfer"
                  : isAdjustment
                    ? activity.kind
                    : txCategory;
                const nextTitle = isTransfer && editDestWallet
                  ? txTitle.trim() &&
                    txTitle.trim() !== `${activity.wallet} to ${matchedDestWallet?.name || ""}`
                    ? txTitle.trim()
                    : `${editSrcWallet.name} to ${editDestWallet.name}`
                  : txTitle.trim() || nextKind;

                const updatedItem: ActivityItem = {
                  ...activity,
                  walletLocalId: getWalletLocalId(editSrcWallet),
                  destWalletLocalId:
                    isTransfer && editDestWallet
                      ? getWalletLocalId(editDestWallet)
                      : undefined,
                  wallet: editSrcWallet.name,
                  title: nextTitle,
                  amount: signed,
                  icon: nextIcon,
                  kind: nextKind,
                  updatedAt: now,
                  synced: false,
                };

                onUpdateActivity(updatedItem, applyWalletDeltas(deltas));
                onDone("Transaction updated");
              };

              if (txEditing) {
                return (
                  <View>
                    {!isTransfer && !isAdjustment ? (
                      <View
                        style={[
                          styles.entryToggle,
                          { backgroundColor: theme.soft, borderColor: theme.line },
                        ]}
                      >
                        {(["expense", "income"] as const).map((kind) => {
                          const active = txDirection === kind;
                          return (
                            <Pressable
                              key={kind}
                              onPress={() => {
                                setTxDirection(kind);
                                setTxCategory(
                                  kind === "expense" ? "Food" : "Salary"
                                );
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
                                {kind === "expense" ? "Expense" : "Money in"}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    ) : null}

                    <View
                      style={[
                        styles.amountEntryBox,
                        { backgroundColor: theme.soft, borderColor: theme.line, marginTop: 4 },
                      ]}
                    >
                      <Text style={[styles.fieldLabel, { color: theme.muted }]}>
                        Amount
                      </Text>
                      <View style={styles.amountEntryRow}>
                        <Text style={[styles.amountEntrySign, { color: theme.ink }]}>
                          ₱
                        </Text>
                        <Text
                          style={[
                            styles.amountEntryInput,
                            { color: txAmount ? theme.ink : theme.muted },
                          ]}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                        >
                          {txAmount ? formatAmountInput(txAmount) : "0.00"}
                        </Text>
                      </View>
                    </View>

                    <AmountKeypad
                      value={txAmount}
                      onChange={setTxAmount}
                      quickAmounts={[100, 500, 1000]}
                      compact
                      theme={theme}
                    />

                    <View
                      style={[
                        styles.softField,
                        { backgroundColor: theme.soft, borderColor: theme.line },
                      ]}
                    >
                      <Text style={[styles.fieldLabel, { color: theme.muted }]}>
                        {isTransfer ? "Transfer note" : "Title / note"}
                      </Text>
                      <TextInput
                        value={txTitle}
                        onChangeText={setTxTitle}
                        placeholder="Enter description"
                        placeholderTextColor={theme.muted}
                        style={[styles.fieldInput, { color: theme.ink }]}
                      />
                    </View>

                    <View style={{ marginBottom: 12 }}>
                      <Text
                        style={[
                          styles.fieldLabel,
                          { color: theme.muted, marginLeft: 4, marginBottom: 6 },
                        ]}
                      >
                        {isTransfer ? "From wallet" : "Wallet"}
                      </Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ gap: 8 }}
                      >
                        {wallets.map((w) => {
                          const active = w.id === txWalletId;
                          return (
                            <Pressable
                              key={w.id}
                              onPress={() => setTxWalletId(w.id)}
                              style={[
                                styles.walletSelectChip,
                                {
                                  backgroundColor: active
                                    ? theme.accent
                                    : theme.soft,
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

                    {isTransfer ? (
                      <View style={{ marginBottom: 12 }}>
                        <Text
                          style={[
                            styles.fieldLabel,
                            { color: theme.muted, marginLeft: 4, marginBottom: 6 },
                          ]}
                        >
                          To wallet
                        </Text>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={{ gap: 8 }}
                        >
                          {wallets.map((w) => {
                            const active = w.id === txDestWalletId;
                            return (
                              <Pressable
                                key={w.id}
                                onPress={() => setTxDestWalletId(w.id)}
                                style={[
                                  styles.walletSelectChip,
                                  {
                                    backgroundColor: active
                                      ? theme.accent
                                      : theme.soft,
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
                        {txWalletId === txDestWalletId ? (
                          <Text style={styles.errorText}>
                            Choose two different wallets.
                          </Text>
                        ) : null}
                      </View>
                    ) : !isAdjustment ? (
                      <View style={{ marginBottom: 14 }}>
                        <Text
                          style={[
                            styles.fieldLabel,
                            { color: theme.muted, marginLeft: 4, marginBottom: 8 },
                          ]}
                        >
                          Category
                        </Text>
                        {renderCategoryGrid(
                          editCats,
                          txCategory,
                          setTxCategory
                        )}
                      </View>
                    ) : null}

                    <PrimaryButton
                      label="Save changes"
                      disabled={editInvalid}
                      onPress={handleSaveTxEdit}
                      theme={theme}
                    />
                    <Pressable
                      onPress={() => setTxEditing(false)}
                      style={[
                        styles.secondaryButton,
                        { backgroundColor: theme.soft, marginTop: 10 },
                      ]}
                    >
                      <Text
                        style={[styles.secondaryButtonText, { color: theme.ink }]}
                      >
                        Cancel
                      </Text>
                    </Pressable>
                  </View>
                );
              }

              return (
                <View>
                  {/* Hero Transaction Summary Card */}
                  <View
                    style={[
                      styles.txDetailHero,
                      { backgroundColor: theme.card },
                      bevelStyle(theme.dark),
                      cardShadow(theme.dark),
                    ]}
                  >
                    <View
                      style={[
                        styles.txDetailIconBox,
                        { backgroundColor: iconBg },
                      ]}
                    >
                      <Icon name={activity.icon} size={24} color={iconColor} />
                    </View>
                    <Text
                      style={[styles.txDetailTitle, { color: theme.ink }]}
                      numberOfLines={2}
                    >
                      {activity.title}
                    </Text>
                    <Text
                      style={[
                        styles.txDetailAmount,
                        { color: isPositive ? theme.accentText : theme.ink },
                      ]}
                    >
                      {hidden
                        ? "₱ ••••••"
                        : `${isPositive ? "+" : "-"} ${money(Math.abs(activity.amount))}`}
                    </Text>
                    <View
                      style={[
                        styles.txTypePill,
                        { backgroundColor: iconBg },
                      ]}
                    >
                      <Text style={[styles.txTypePillText, { color: iconColor }]}>
                        {isPositive ? "Money in" : "Money out"} · {activity.kind}
                      </Text>
                    </View>
                  </View>

                  {/* Breakdown Details Card */}
                  <View
                    style={[
                      styles.txDetailCard,
                      { backgroundColor: theme.card },
                      bevelStyle(theme.dark),
                      cardShadow(theme.dark),
                    ]}
                  >
                    <View
                      style={[
                        styles.txDetailRow,
                        { borderBottomWidth: 1, borderBottomColor: theme.line },
                      ]}
                    >
                      <Text style={[styles.txDetailKey, { color: theme.muted }]}>
                        Date
                      </Text>
                      <Text style={[styles.txDetailVal, { color: theme.ink }]}>
                        {dateLabel}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.txDetailRow,
                        { borderBottomWidth: 1, borderBottomColor: theme.line },
                      ]}
                    >
                      <Text style={[styles.txDetailKey, { color: theme.muted }]}>
                        Time
                      </Text>
                      <Text style={[styles.txDetailVal, { color: theme.ink }]}>
                        {timeLabel}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.txDetailRow,
                        { borderBottomWidth: 1, borderBottomColor: theme.line },
                      ]}
                    >
                      <Text style={[styles.txDetailKey, { color: theme.muted }]}>
                        {isTransfer ? "From wallet" : "Wallet"}
                      </Text>
                      <View style={styles.txWalletValRow}>
                        {matchedWallet ? (
                          <WalletLogoBadge
                            logoKey={matchedWallet.logoKey}
                            name={matchedWallet.name}
                            mark={matchedWallet.mark}
                            size={22}
                            radius={7}
                            ink={theme.ink}
                            fontSize={8}
                          />
                        ) : null}
                        <Text style={[styles.txDetailVal, { color: theme.ink }]}>
                          {matchedWallet ? matchedWallet.name : activity.wallet}
                          {matchedWallet ? ` · ${matchedWallet.type}` : ""}
                        </Text>
                      </View>
                    </View>

                    {matchedDestWallet ? (
                      <View
                        style={[
                          styles.txDetailRow,
                          { borderBottomWidth: 1, borderBottomColor: theme.line },
                        ]}
                      >
                        <Text style={[styles.txDetailKey, { color: theme.muted }]}>
                          To wallet
                        </Text>
                        <View style={styles.txWalletValRow}>
                          <WalletLogoBadge
                            logoKey={matchedDestWallet.logoKey}
                            name={matchedDestWallet.name}
                            mark={matchedDestWallet.mark}
                            size={22}
                            radius={7}
                            ink={theme.ink}
                            fontSize={8}
                          />
                          <Text style={[styles.txDetailVal, { color: theme.ink }]}>
                            {matchedDestWallet.name} · {matchedDestWallet.type}
                          </Text>
                        </View>
                      </View>
                    ) : null}

                    <View
                      style={[
                        styles.txDetailRow,
                        { borderBottomWidth: 1, borderBottomColor: theme.line },
                      ]}
                    >
                      <Text style={[styles.txDetailKey, { color: theme.muted }]}>
                        Category
                      </Text>
                      <Text style={[styles.txDetailVal, { color: theme.ink }]}>
                        {activity.kind}
                      </Text>
                    </View>

                    <View style={styles.txDetailRow}>
                      <Text style={[styles.txDetailKey, { color: theme.muted }]}>
                        Storage
                      </Text>
                      <Text style={[styles.txDetailVal, { color: theme.ink }]}>
                        {activity.synced ? "Synced with Supabase" : "Saved on device"}
                      </Text>
                    </View>
                  </View>

                  {txConfirmDelete ? (
                    <View
                      style={[
                        styles.txConfirmDeleteBox,
                        {
                          backgroundColor: theme.dark
                            ? "rgba(192, 68, 68, 0.16)"
                            : "#fdeaea",
                          borderColor: "rgba(192, 68, 68, 0.35)",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.txConfirmDeleteTitle,
                          { color: theme.dark ? "#fca5a5" : "#991b1b" },
                        ]}
                      >
                        Delete transaction & restore wallet balance?
                      </Text>
                      <View style={styles.txActionPair}>
                        <Pressable
                          onPress={() => setTxConfirmDelete(false)}
                          style={[
                            styles.txActionHalfBtn,
                            { backgroundColor: theme.card },
                          ]}
                        >
                          <Text
                            style={[styles.secondaryButtonText, { color: theme.ink }]}
                          >
                            Cancel
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={handleConfirmDeleteTx}
                          style={[
                            styles.txActionHalfBtn,
                            { backgroundColor: "#c04444" },
                          ]}
                        >
                          <Text
                            style={[styles.secondaryButtonText, { color: "#ffffff" }]}
                          >
                            Confirm delete
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.txActionPair}>
                      {onUpdateActivity ? (
                        <Pressable
                          onPress={() => setTxEditing(true)}
                          style={[
                            styles.txActionHalfBtn,
                            { backgroundColor: theme.soft2 },
                          ]}
                        >
                          <Icon name="edit" size={16} color={theme.ink} />
                          <Text
                            style={[styles.secondaryButtonText, { color: theme.ink }]}
                          >
                            Edit
                          </Text>
                        </Pressable>
                      ) : null}
                      {onDeleteActivity ? (
                        <Pressable
                          onPress={() => setTxConfirmDelete(true)}
                          style={[
                            styles.txActionHalfBtn,
                            {
                              backgroundColor: theme.dark
                                ? "rgba(192, 68, 68, 0.16)"
                                : "#fdeaea",
                            },
                          ]}
                        >
                          <Icon name="close" size={16} color="#c04444" />
                          <Text
                            style={[styles.secondaryButtonText, { color: "#c04444" }]}
                          >
                            Delete
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  )}

                  {matchedWallet && onOpenWallet ? (
                    <Pressable
                      onPress={() => onOpenWallet(matchedWallet)}
                      style={[
                        styles.secondaryButton,
                        { backgroundColor: theme.soft2, marginTop: 10, marginBottom: 0 },
                      ]}
                    >
                      <Text
                        style={[styles.secondaryButtonText, { color: theme.ink }]}
                      >
                        View {matchedWallet.name} wallet
                      </Text>
                    </Pressable>
                  ) : null}

                  <PrimaryButton label="Done" onPress={onClose} theme={theme} />
                </View>
              );
            })()}

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

            {/* ==================== MONTHLY BUDGET SHEET ==================== */}
            {type === "budget" && (
              <View>
                <View
                  style={[
                    styles.amountEntryBox,
                    { backgroundColor: theme.soft, borderColor: theme.line, marginTop: 4 },
                  ]}
                >
                  <Text style={[styles.fieldLabel, { color: theme.muted }]}>
                    Monthly spending target
                  </Text>
                  <View style={styles.amountEntryRow}>
                    <Text style={[styles.amountEntrySign, { color: theme.ink }]}>
                      ₱
                    </Text>
                    <Text
                      style={[
                        styles.amountEntryInput,
                        { color: amount ? theme.ink : theme.muted },
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {amount ? formatAmountInput(amount) : "0.00"}
                    </Text>
                  </View>
                  <Text style={[styles.fieldLabel, { color: theme.muted }]}>
                    {monthlyBudget && monthlyBudget > 0
                      ? `Current target: ${money(monthlyBudget)}`
                      : "Tracks your monthly spending pace in Activity"}
                  </Text>
                </View>

                <AmountKeypad
                  value={amount}
                  onChange={setAmount}
                  quickAmounts={[2000, 5000, 10000, 25000]}
                  compact
                  theme={theme}
                />

                <PrimaryButton
                  label="Save monthly budget"
                  disabled={!Number(amount) || Number(amount) <= 0}
                  onPress={() => {
                    const nextVal = Number(Number(amount).toFixed(2));
                    if (!nextVal || nextVal <= 0) return;
                    onSaveMonthlyBudget?.(nextVal);
                    onDone(`Monthly budget set to ${money(nextVal)}`);
                  }}
                  theme={theme}
                />

                {monthlyBudget && monthlyBudget > 0 ? (
                  <Pressable
                    onPress={() => {
                      onSaveMonthlyBudget?.(null);
                      onDone("Monthly budget cleared");
                    }}
                    style={[
                      styles.secondaryButton,
                      {
                        marginTop: 10,
                        backgroundColor: theme.dark
                          ? "rgba(192, 68, 68, 0.16)"
                          : "#fdeaea",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.secondaryButtonText,
                        { color: "#c04444" },
                      ]}
                    >
                      Clear target
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            )}

            {/* ==================== GLOBAL SEARCH SHEET ==================== */}
            {type === "search" && (
              <View>
                <View
                  style={[
                    styles.presetSearchBox,
                    { backgroundColor: theme.soft, borderColor: theme.line },
                  ]}
                >
                  <Icon name="search" size={16} color={theme.accentText} />
                  <TextInput
                    value={globalSearch}
                    onChangeText={setGlobalSearch}
                    autoFocus
                    placeholder="Search cards, transactions, actions..."
                    placeholderTextColor={theme.muted}
                    style={[styles.presetSearchInput, { color: theme.ink }]}
                  />
                  {globalSearch ? (
                    <Pressable onPress={() => setGlobalSearch("")} hitSlop={8}>
                      <Icon name="close" size={14} color={theme.muted} />
                    </Pressable>
                  ) : null}
                </View>

                {globalSearchResults.wallets.length > 0 ? (
                  <View style={styles.searchSection}>
                    <Text
                      style={[styles.searchSectionLabel, { color: theme.muted }]}
                    >
                      CARDS & WALLETS
                    </Text>
                    <View style={{ gap: 8 }}>
                      {globalSearchResults.wallets.map((w) => {
                        const pal = tonePalette[w.tone] || tonePalette.blue;
                        return (
                          <Pressable
                            key={w.id}
                            onPress={() => onOpenWallet?.(w)}
                            style={({ pressed }) => [
                              styles.searchWalletRow,
                              {
                                backgroundColor: theme.card,
                                overflow: "hidden",
                                transform: [{ scale: pressed ? 0.985 : 1 }],
                              },
                              bevelStyle(theme.dark),
                              cardShadow(theme.dark),
                            ]}
                          >
                            <AccentSurfaceGlow theme={theme} />
                            <LinearGradient
                              colors={[pal.from, pal.to]}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                              style={styles.searchWalletBadge}
                            >
                              <WalletLogoBadge
                                logoKey={w.logoKey}
                                name={w.name}
                                mark={w.mark}
                                size={36}
                                radius={12}
                                ink={pal.ink}
                                fontSize={9}
                              />
                            </LinearGradient>
                            <View style={{ flex: 1, gap: 1 }}>
                              <Text
                                style={[
                                  styles.searchItemTitle,
                                  { color: theme.ink },
                                ]}
                                numberOfLines={1}
                              >
                                {w.name}
                              </Text>
                              <Text
                                style={[
                                  styles.searchItemSub,
                                  { color: theme.muted },
                                ]}
                                numberOfLines={1}
                              >
                                {w.type} · {w.account}
                              </Text>
                            </View>
                            <Text
                              style={[
                                styles.searchWalletBal,
                                { color: theme.ink },
                              ]}
                            >
                              {hidden ? "••••" : money(w.balance)}
                            </Text>
                            <Icon
                              name="chevron"
                              size={15}
                              color={theme.muted}
                            />
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ) : null}

                {globalSearchResults.activities.length > 0 ? (
                  <View style={styles.searchSection}>
                    <Text
                      style={[styles.searchSectionLabel, { color: theme.muted }]}
                    >
                      TRANSACTIONS
                    </Text>
                    <View style={{ gap: 8 }}>
                      {globalSearchResults.activities.map((item) => (
                        <TxRow
                          key={item.id}
                          item={item}
                          hidden={hidden}
                          onPress={() => onOpenTransaction?.(item)}
                          theme={theme}
                        />
                      ))}
                    </View>
                  </View>
                ) : null}

                {globalSearchResults.actions.length > 0 ? (
                  <View style={styles.searchSection}>
                    <Text
                      style={[styles.searchSectionLabel, { color: theme.muted }]}
                    >
                      PAGES & ACTIONS
                    </Text>
                    <View style={{ gap: 8 }}>
                      {globalSearchResults.actions.map((act) => (
                        <Pressable
                          key={act.id}
                          onPress={() => {
                            if (act.sheet) {
                              onSwitchSheet?.(act.sheet);
                            } else if (act.tab && onNavigateTab) {
                              closeWith(() => onNavigateTab(act.tab!));
                            }
                          }}
                          style={({ pressed }) => [
                            styles.searchWalletRow,
                            {
                              backgroundColor: theme.card,
                              overflow: "hidden",
                              transform: [{ scale: pressed ? 0.985 : 1 }],
                            },
                            bevelStyle(theme.dark),
                            cardShadow(theme.dark),
                          ]}
                        >
                          <AccentSurfaceGlow theme={theme} />
                          <View
                            style={[
                              styles.searchActionIcon,
                              { backgroundColor: theme.accentSoft },
                            ]}
                          >
                            <Icon
                              name={act.icon}
                              size={16}
                              color={theme.accentText}
                            />
                          </View>
                          <View style={{ flex: 1, gap: 1 }}>
                            <Text
                              style={[
                                styles.searchItemTitle,
                                { color: theme.ink },
                              ]}
                              numberOfLines={1}
                            >
                              {act.label}
                            </Text>
                            <Text
                              style={[
                                styles.searchItemSub,
                                { color: theme.muted },
                              ]}
                              numberOfLines={1}
                            >
                              {act.sub}
                            </Text>
                          </View>
                          <Icon
                            name="chevron"
                            size={15}
                            color={theme.muted}
                          />
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : null}

                {globalSearch.trim().length > 0 &&
                globalSearchResults.wallets.length === 0 &&
                globalSearchResults.activities.length === 0 &&
                globalSearchResults.actions.length === 0 ? (
                  <View style={styles.searchEmptyBox}>
                    <Icon name="search" size={24} color={theme.muted} />
                    <Text
                      style={[styles.searchEmptyTitle, { color: theme.ink }]}
                    >
                      No matches found
                    </Text>
                    <Text
                      style={[styles.searchEmptySub, { color: theme.muted }]}
                    >
                      Try searching a card name, merchant, category, or action.
                    </Text>
                  </View>
                ) : null}
              </View>
            )}
            </Animated.ScrollView>
            <EdgeFade
              position="top"
              color={theme.page}
              size={18}
              opacity={sheetScrollY.interpolate({
                inputRange: [0, 14],
                outputRange: [0, 1],
                extrapolate: "clamp",
              })}
            />
            <EdgeFade position="bottom" color={theme.page} size={28} />
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
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
  searchSection: {
    marginTop: 14,
  },
  searchSectionLabel: {
    fontFamily: "Urbanist_700Bold",
    fontWeight: "700",
    fontSize: 11,
    letterSpacing: 0.7,
    marginBottom: 8,
    marginLeft: 2,
  },
  searchWalletRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingVertical: 11,
    paddingHorizontal: 13,
    borderRadius: 18,
    borderWidth: 1,
  },
  searchWalletBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  searchActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  searchItemTitle: {
    fontFamily: "Urbanist_700Bold",
    fontWeight: "700",
    fontSize: 13.5,
  },
  searchItemSub: {
    fontFamily: "Urbanist_600SemiBold",
    fontWeight: "600",
    fontSize: 11,
  },
  searchWalletBal: {
    fontFamily: "Urbanist_800ExtraBold",
    fontWeight: "800",
    fontSize: 13,
  },
  searchEmptyBox: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 20,
    gap: 6,
  },
  searchEmptyTitle: {
    fontFamily: "Urbanist_700Bold",
    fontWeight: "700",
    fontSize: 15,
    marginTop: 4,
  },
  searchEmptySub: {
    fontFamily: "Urbanist_600SemiBold",
    fontWeight: "600",
    fontSize: 12,
    textAlign: "center",
  },
  overlayRoot: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 80,
  },
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
  presetEmptyNote: {
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  updateModeBar: {
    height: 44,
    padding: 4,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
  },
  updateModeBtn: {
    flex: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  updateModeText: {
    fontFamily: "Urbanist_800ExtraBold",
    fontWeight: "800",
    fontSize: 12,
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
    gap: 8,
  },
  categoryGridRow: {
    flexDirection: "row",
    gap: 8,
  },
  categoryChip: {
    flex: 1,
    minHeight: 46,
    borderRadius: 15,
    borderWidth: 1.5,
    paddingVertical: 7,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  categoryChipIcon: {
    width: 26,
    height: 26,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryChipText: {
    flex: 1,
    fontFamily: "Urbanist_800ExtraBold",
    fontWeight: "800",
    fontSize: 10.5,
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
  transferSideRow: {
    position: "relative",
    flexDirection: "row",
    gap: 10,
  },
  transferSideCard: {
    flex: 1,
    minHeight: 96,
    padding: 13,
    borderRadius: 20,
    borderWidth: 1.5,
    justifyContent: "space-between",
    gap: 4,
  },
  transferSideRole: {
    fontFamily: "Urbanist_800ExtraBold",
    fontWeight: "800",
    fontSize: 9,
    letterSpacing: 0.4,
  },
  transferSideIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 2,
  },
  transferSideName: {
    flex: 1,
    fontFamily: "Urbanist_800ExtraBold",
    fontWeight: "800",
    fontSize: 14,
  },
  transferSideBal: {
    fontFamily: "Urbanist_600SemiBold",
    fontWeight: "600",
    fontSize: 11,
  },
  transferSideAfter: {
    fontFamily: "Urbanist_800ExtraBold",
    fontWeight: "800",
    fontSize: 11,
  },
  transferCenterSwapBtn: {
    position: "absolute",
    zIndex: 6,
    left: "50%",
    top: "50%",
    marginLeft: -20,
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3.5,
    overflow: "hidden",
  },
  transferPickerDrawer: {
    marginTop: 10,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
  },
  transferAmountHeadRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sendAllChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  sendAllChipText: {
    fontFamily: "Urbanist_800ExtraBold",
    fontWeight: "800",
    fontSize: 10.5,
  },
  feeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 2,
  },
  feeLabel: {
    fontFamily: "Urbanist_700Bold",
    fontWeight: "700",
    fontSize: 11.5,
    marginRight: 2,
  },
  feeChip: {
    flex: 1,
    height: 32,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  feeChipText: {
    fontFamily: "Urbanist_800ExtraBold",
    fontWeight: "800",
    fontSize: 11,
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
  txDetailHero: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    marginTop: 4,
    marginBottom: 14,
  },
  txDetailIconBox: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  txDetailTitle: {
    fontFamily: "Urbanist_800ExtraBold",
    fontWeight: "800",
    fontSize: 19,
    textAlign: "center",
    marginBottom: 4,
  },
  txDetailAmount: {
    fontFamily: "Urbanist_800ExtraBold",
    fontWeight: "800",
    fontSize: 30,
    letterSpacing: -0.8,
    marginBottom: 10,
  },
  txTypePill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 99,
  },
  txTypePillText: {
    fontFamily: "Urbanist_700Bold",
    fontWeight: "700",
    fontSize: 11.5,
  },
  txDetailCard: {
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  txDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 14,
  },
  txDetailKey: {
    fontFamily: "Urbanist_600SemiBold",
    fontWeight: "600",
    fontSize: 12.5,
  },
  txDetailVal: {
    fontFamily: "Urbanist_700Bold",
    fontWeight: "700",
    fontSize: 13,
    textAlign: "right",
  },
  txWalletValRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  txActionPair: {
    flexDirection: "row",
    gap: 10,
  },
  txActionHalfBtn: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  txConfirmDeleteBox: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
  },
  txConfirmDeleteTitle: {
    fontFamily: "Urbanist_700Bold",
    fontWeight: "700",
    fontSize: 12.5,
    textAlign: "center",
  },
});

function formatTransactionDateTime(item: ActivityItem): {
  dateLabel: string;
  timeLabel: string;
} {
  if (item.occurredAt) {
    const parsed = new Date(item.occurredAt);
    if (!Number.isNaN(parsed.getTime())) {
      const dateLabel = new Intl.DateTimeFormat("en-PH", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(parsed);
      const timeLabel = new Intl.DateTimeFormat("en-PH", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(parsed);
      return { dateLabel, timeLabel };
    }
  }
  const parts = item.date.split(",");
  return {
    dateLabel: parts[0]?.trim() || item.date,
    timeLabel: parts[1]?.trim() || "Time not recorded",
  };
}
