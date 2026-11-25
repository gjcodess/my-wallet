import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Easing,
  ImageSourcePropType,
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
import Svg, { Image as SvgImage } from "react-native-svg";
import { AmountKeypad, formatAmountInput } from "./AmountKeypad";
import {
  ActivityItem,
  EXPENSE_CATEGORIES,
  getDisplayActivityWallet,
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
import { Icon } from "./Icon";
import {
  AccentSurfaceGlow,
  bevelStyle,
  cardShadow,
  DarkLeatherSurface,
  EdgeFade,
  hexToRgba,
  LightLeatherSurface,
  SaffianoSheetSurface,
  TexturedGradientSurface,
  ThemeColors,
  TopBar,
  TxRow,
} from "./SharedUI";
import { WalletLogoBadge } from "./WalletFolder";
import { ScheduleManager } from "./Schedules";
import { FavoriteEditor, FavoriteList, FavoriteStrip } from "./Favorites";
import { createFavoriteDraft, favoriteFromActivity } from "../types/favorite";
import type { Favorite, FavoriteDraft } from "../types/favorite";
import { CategoryBudgetSheet } from "./CategoryBudgets";
import type { CategoryLimits, MonthlySpending } from "../types/budget";
import { displayDueDate } from "../types/schedule";
import type { DueSchedule, Schedule } from "../types/schedule";
import {
  encodeWalletLogoAndBg,
  parseWalletLogoAndBg,
  resolveWalletCardDesign,
  walletCardBackgroundAssets,
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
  schedules,
  scheduleSeed,
  scheduledEntry,
  onScheduleFromActivity,
  onSaveSchedule,
  onDeleteSchedule,
  onOpenScheduledEntry,
  onRecordWalletEntry,
  favorites,
  favoriteSeed,
  onFavoriteFromActivity,
  onSaveFavorite,
  onRemoveFavorite,
  hidden = false,
  onSaveWallets,
  onDeleteWallet,
  onToggleWalletHidden,
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
  monthlySpending,
  categoryLimits,
  budgetCategory,
  onSaveCategoryLimit,
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
  schedules: DueSchedule[];
  scheduleSeed: Schedule | null;
  scheduledEntry: DueSchedule | null;
  onScheduleFromActivity: (item: ActivityItem) => void;
  onSaveSchedule: (schedule: Schedule) => Promise<void>;
  onDeleteSchedule: (id: string) => Promise<void>;
  onOpenScheduledEntry: (schedule: DueSchedule) => void;
  onRecordWalletEntry: (item: Omit<ActivityItem, "id" | "date">) => Promise<void>;
  favorites: Favorite[];
  favoriteSeed: FavoriteDraft | null;
  onFavoriteFromActivity: (draft: FavoriteDraft) => void;
  onSaveFavorite: (item: Favorite) => Promise<void>;
  onRemoveFavorite: (id: string) => Promise<void>;
  hidden?: boolean;
  onSaveWallets: (next: Wallet[]) => void;
  onDeleteWallet?: (wallet: Wallet) => void;
  onToggleWalletHidden?: (wallet: Wallet) => void;
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
  monthlySpending: MonthlySpending;
  categoryLimits: CategoryLimits;
  budgetCategory: string | null;
  onSaveCategoryLimit: (category: string, limit: number | null) => Promise<void>;
  onSaveMonthlyBudget?: (next: number | null) => void;
  userEmail: string | null;
  onSyncNow: () => Promise<void>;
  theme: ThemeColors;
}) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const sheetStartY = Math.min(Math.max(windowHeight, 560), 760);
  const openAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(1)).current;
  const transitionDirAnim = useRef(new Animated.Value(1)).current;
  const transitionDirRef = useRef<-1 | 0 | 1>(0);
  const prevTypeRef = useRef<Sheet>(type);
  const closingRef = useRef(false);
  const entrySavingRef = useRef(false);
  const sheetScrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const [managingFavorites, setManagingFavorites] = useState(false);
  const [favoriteDraft, setFavoriteDraft] = useState<FavoriteDraft | null>(null);

  const scrollToTop = useCallback(() => sheetScrollRef.current?.scrollTo({ y: 0, animated: false }), []);
  const closeFavoriteEditor = useCallback(() => {
    Keyboard.dismiss();
    scrollToTop();
    setFavoriteDraft(null);
  }, [scrollToTop]);

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
    () => {
      if (entrySavingRef.current) return;
      if (type === "entry" && favoriteDraft) { closeFavoriteEditor(); return; }
      if (type === "entry" && managingFavorites) {
        scrollToTop();
        setManagingFavorites(false);
        return;
      }
      closeWith(onCloseProp);
    },
    [closeWith, onCloseProp, type, favoriteDraft, managingFavorites, closeFavoriteEditor, scrollToTop]
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
  const initialParsedWallet = parseWalletLogoAndBg(editTarget?.logoKey);
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>(
    initialParsedWallet.logoPresetKey || "custom"
  );
  const [presetGroup, setPresetGroup] = useState<"All" | WalletPresetGroup>("All");
  const [presetSearch, setPresetSearch] = useState("");
  const [logoKey, setLogoKey] = useState<string | undefined>(
    editTarget?.logoKey
  );
  const [recommendedTone, setRecommendedTone] = useState<Tone | null>(() => {
    if (!initialParsedWallet.logoPresetKey) return null;
    return (
      walletPresets.find((p) => p.key === initialParsedWallet.logoPresetKey)
        ?.recommendedTone ?? null
    );
  });
  const [name, setName] = useState(editTarget?.name || "");
  const [category, setCategory] = useState(editTarget?.type || "E-wallet");
  const [accountLabel, setAccountLabel] = useState(editTarget?.account || "");
  const [tone, setTone] = useState<Tone>(editTarget?.tone || "blue");
  const [showCustomTone, setShowCustomTone] = useState(false);
  const [customBgTab, setCustomBgTab] = useState<"presets" | "gradient">(
    resolveWalletCardDesign(editTarget?.logoKey, editTarget?.name)
      ? "presets"
      : "gradient"
  );
  const [balance, setBalance] = useState(
    editTarget ? String(editTarget.balance) : ""
  );
  const [walletStep, setWalletStep] = useState(type === "edit" ? 1 : 0);
  const [editReturnTarget, setEditReturnTarget] = useState<Wallet | null>(null);
  const [walletConfirmDelete, setWalletConfirmDelete] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const sheetScrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const typeChanged = prevTypeRef.current !== type;
    prevTypeRef.current = type;

    sheetScrollY.setValue(0);
    setWalletStep(type === "edit" ? 1 : 0);
    if (type !== "edit") {
      setEditReturnTarget(null);
    }
    setWalletConfirmDelete(false);
    setShowCustomTone(false);
    setGlobalSearch("");
    setTransferFee(0);
    setPickingTransferSide(null);
    setUpdateMode("set");
    setEntryStep(scheduledEntry ? 1 : 0);
    setEntryType(scheduledEntry?.direction ?? "expense");
    setEntryError("");
    if (type === "budget") {
      setAmount(monthlyBudget && monthlyBudget > 0 ? String(monthlyBudget) : "");
    }
    if (type === "edit" && editTarget) {
      const parsedEdit = parseWalletLogoAndBg(editTarget.logoKey);
      setSelectedPresetKey(parsedEdit.logoPresetKey || "custom");
      setLogoKey(editTarget.logoKey);
      setRecommendedTone(
        parsedEdit.logoPresetKey
          ? (walletPresets.find((p) => p.key === parsedEdit.logoPresetKey)
              ?.recommendedTone ?? null)
          : null
      );
      setCustomBgTab(
        resolveWalletCardDesign(editTarget.logoKey, editTarget.name)
          ? "presets"
          : "gradient"
      );
      setName(editTarget.name);
      setCategory(editTarget.type);
      setAccountLabel(editTarget.account);
      setTone(editTarget.tone);
    }

    if (typeChanged) {
      const dir = transitionDirRef.current || 1;
      transitionDirRef.current = 0;
      transitionDirAnim.setValue(dir);
      contentAnim.setValue(0);
      scrollToTop();
      const raf = requestAnimationFrame(() => {
        Animated.timing(contentAnim, {
          toValue: 1,
          duration: 210,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [type, editTarget?.id]);
  const [amount, setAmount] = useState(scheduledEntry ? String(scheduledEntry.amount) : "");
  const [source, setSource] = useState(fallback);
  const [destination, setDestination] = useState(
    wallets.find((w) => w.id !== fallback)?.id || fallback
  );
  const [walletId, setWalletId] = useState(fallback);
  const [entryStep, setEntryStep] = useState(scheduledEntry ? 1 : 0);
  const [entryType, setEntryType] = useState<"expense" | "income" | "transfer">(
    scheduledEntry?.direction ?? "expense"
  );
  const [entryCategory, setEntryCategory] = useState(scheduledEntry?.category ?? "Food");
  const [note, setNote] = useState(scheduledEntry?.title ?? "");
  const [entrySaving, setEntrySaving] = useState(false);
  const [entryError, setEntryError] = useState("");
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

  const activeWallets = useMemo(() => {
    const visible = wallets.filter((w) => !w.isHidden);
    return visible.length > 0 ? visible : wallets;
  }, [wallets]);
  const current = wallets.find((w) => w.id === walletId) || wallets[0];
  const sourceWallet = activeWallets.find((w) => w.id === source) || activeWallets[0];
  const destWallet = activeWallets.find((w) => w.id === destination) || activeWallets[0];

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

    const searchableWallets = wallets.filter((w) => !w.isHidden);
    const q = globalSearch.trim().toLowerCase();
    if (!q) {
      return {
        wallets: searchableWallets.slice(0, 4),
        activities: activities.slice(0, 6),
        actions: quickItems.slice(0, 4),
      };
    }

    const matchedWallets = searchableWallets.filter((w) =>
      `${w.name} ${w.type} ${w.account} ${w.balance}`
        .toLowerCase()
        .includes(q)
    );
    const matchedActivities = activities
      .filter((item) => {
        const displayWallet = getDisplayActivityWallet(item, wallets).label;
        return `${item.title} ${displayWallet} ${item.kind} ${item.date} ${Math.abs(item.amount)}`
          .toLowerCase()
          .includes(q);
      })
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
    setShowCustomTone(false);
    if (preset === "custom") {
      setSelectedPresetKey("custom");
      setLogoKey("none");
      setCustomBgTab("gradient");
      setRecommendedTone(null);
      setName("");
      setAccountLabel("");
      return;
    }
    setSelectedPresetKey(preset.key);
    setLogoKey(preset.key);
    setCustomBgTab("presets");
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

  const handleHeaderBack = useCallback(() => {
    if (entrySavingRef.current) return;
    if (type === "entry" && favoriteDraft) {
      closeFavoriteEditor();
      return;
    }
    if (type === "entry" && managingFavorites) {
      scrollToTop();
      setManagingFavorites(false);
      return;
    }
    const minStep = scheduledEntry ? 1 : 0;
    if (type === "entry" && entryStep > minStep) {
      setEntryStep((prev) => Math.max(minStep, prev - 1));
      scrollToTop();
      return;
    }
    if (
      type === "edit" &&
      walletStep <= 1 &&
      editReturnTarget &&
      onSwitchSheet
    ) {
      const target = editReturnTarget;
      transitionDirRef.current = -1;
      setEditReturnTarget(null);
      setAmount("");
      onSwitchSheet("update", target);
      return;
    }
    if ((type === "add" || type === "edit") && walletStep > 0) {
      setWalletStep((prev) => Math.max(0, prev - 1));
      scrollToTop();
      return;
    }
    onClose();
  }, [
    closeFavoriteEditor,
    editReturnTarget,
    entryStep,
    favoriteDraft,
    managingFavorites,
    onClose,
    onSwitchSheet,
    scheduledEntry,
    scrollToTop,
    type,
    walletStep,
  ]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      handleHeaderBack();
      return true;
    });
    return () => sub.remove();
  }, [handleHeaderBack]);

  const transferValue = Number(amount);
  const transferTotalDebit = Number(
    ((transferValue || 0) + transferFee).toFixed(2)
  );
  const entryValue = Number(amount);
  const entryWallet = activeWallets.find((w) => w.id === walletId) || activeWallets[0];

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

  const save = async () => {
    const now = new Date().toISOString();
    if (type === "entry" && entryType === "transfer") {
      if (
        transferInvalid ||
        !sourceWallet ||
        !destWallet ||
        entrySavingRef.current ||
        closingRef.current
      ) {
        return;
      }
      entrySavingRef.current = true;
      setEntrySaving(true);
      setEntryError("");
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
        title: note.trim() || `${sourceWallet.name} to ${destWallet.name}`,
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
      return;
    }

    if (type === "entry" && entryWallet && !entryInvalid) {
      if (entrySavingRef.current || closingRef.current) return;
      entrySavingRef.current = true;
      setEntrySaving(true);
      setEntryError("");
      const signedValue = entryType === "expense" ? -entryValue : entryValue;
      const item = {
        localId: `tx-${Date.now()}`,
        walletLocalId: getWalletLocalId(entryWallet),
        title: note.trim() || entryCategory,
        wallet: entryWallet.name,
        amount: signedValue,
        icon: entryIcon,
        kind: entryCategory,
        occurredAt: now,
        updatedAt: now,
        synced: false,
      };
      try {
        await onRecordWalletEntry(item);
        const message = scheduledEntry
          ? `${scheduledEntry.direction === "expense" ? "Bill" : "Income"} recorded`
          : `${entryType === "expense" ? "Expense" : "Money"} ${money(entryValue)} saved`;
        onDone(message);
      } catch {
        setEntryError("Could not record this transaction. Check the wallet balance and try again.");
        entrySavingRef.current = false;
        setEntrySaving(false);
      }
      return;
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
    type === "favorite" || (type === "entry" && favoriteDraft)
      ? (managingFavorites ? "Edit favorite" : "New favorite")
      : type === "entry" && managingFavorites
        ? "Favorites"
        : type === "category-budget"
      ? (budgetCategory ? `${budgetCategory} budget` : "Category budgets")
      : type === "add"
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
                    : type === "schedule" ? "Bills & paydays" : "Account & Cloud Sync";

  const renderCategoryGrid = (
    items: [string, string][],
    selectedLabel: string,
    onSelect: (label: string) => void,
    stitched = false
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
                    stitched && { paddingHorizontal: 12, gap: 7 },
                    {
                      overflow: "hidden",
                      backgroundColor: stitched
                        ? active
                          ? theme.leather.edge
                          : theme.card
                        : active
                          ? theme.surface
                          : theme.soft,
                      borderColor: stitched
                        ? active
                          ? theme.leather.edge
                          : hexToRgba(theme.leather.accent, 0.22)
                        : active
                          ? theme.accent
                          : theme.line,
                    },
                  ]}
                >
                  {stitched ? (
                    active ? (
                      <DarkLeatherSurface theme={theme} radius={15} />
                    ) : (
                      <LightLeatherSurface theme={theme} radius={15} />
                    )
                  ) : null}
                  {stitched ? (
                    <Icon
                      name={icon}
                      size={15}
                      color={active ? "#ffffff" : theme.leather.accent}
                    />
                  ) : (
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
                  )}
                  <Text
                    style={[
                      styles.categoryChipText,
                      { color: stitched && active ? "#ffffff" : theme.ink },
                    ]}
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

  type StepFooterConfig = {
    onBack?: () => void;
    primaryLabel: string;
    primaryIcon: "chevron" | "check";
    primaryDisabled?: boolean;
    onPrimary: () => void;
  };

  const stepFooterConfig: StepFooterConfig | null = (() => {
    if (type === "add" || type === "edit") {
      const isEdit = type === "edit";
      const totalSteps = isEdit ? 3 : 4;
      const currentWalletStep = Math.min(walletStep, totalSteps - 1);
      const goWallet = (next: number) => {
        Keyboard.dismiss();
        scrollToTop();
        setWalletStep(Math.max(0, Math.min(totalSteps - 1, next)));
      };

      if (currentWalletStep === 0) {
        return {
          primaryLabel: "Next: Wallet details",
          primaryIcon: "chevron",
          onPrimary: () => goWallet(1),
        };
      }
      if (currentWalletStep === 1) {
        return {
          onBack: () => {
            if (isEdit && editReturnTarget && onSwitchSheet) {
              const target = editReturnTarget;
              transitionDirRef.current = -1;
              setEditReturnTarget(null);
              setAmount("");
              onSwitchSheet("update", target);
              return;
            }
            goWallet(0);
          },
          primaryLabel: isEdit ? "Next: Confirm" : "Next: Balance",
          primaryIcon: "chevron",
          primaryDisabled: !name.trim(),
          onPrimary: () => goWallet(2),
        };
      }
      if (!isEdit && currentWalletStep === 2) {
        return {
          onBack: () => goWallet(1),
          primaryLabel: "Next: Confirm",
          primaryIcon: "chevron",
          onPrimary: () => goWallet(3),
        };
      }
      return {
        onBack: () => goWallet(isEdit ? 1 : 2),
        primaryLabel: isEdit ? "Save changes" : "Save wallet",
        primaryIcon: "check",
        primaryDisabled: !name.trim(),
        onPrimary: save,
      };
    }

    if (type === "entry" && entryWallet && !managingFavorites && !favoriteDraft) {
      const isTransferMode = entryType === "transfer";
      const transferPossible =
        wallets.length >= 2 && Boolean(sourceWallet && destWallet);
      const totalSteps = isTransferMode ? 3 : 4;
      const minStep = scheduledEntry ? 1 : 0;
      const currentStep = Math.min(entryStep, totalSteps - 1);
      const goEntry = (next: number) => {
        Keyboard.dismiss();
        scrollToTop();
        setEntryStep(Math.max(minStep, Math.min(totalSteps - 1, next)));
      };

      if (currentStep === 0) {
        return {
          primaryLabel: "Next: Enter amount",
          primaryIcon: "chevron",
          primaryDisabled: isTransferMode && !transferPossible,
          onPrimary: () => goEntry(1),
        };
      }
      if (currentStep === 1) {
        return {
          onBack: !scheduledEntry ? () => goEntry(0) : undefined,
          primaryLabel: isTransferMode ? "Next: Review" : "Next: Wallet",
          primaryIcon: "chevron",
          primaryDisabled: isTransferMode
            ? transferInvalid
            : !entryValue || entryValue <= 0,
          onPrimary: () => goEntry(2),
        };
      }
      if (!isTransferMode && currentStep === 2) {
        return {
          onBack: () => goEntry(1),
          primaryLabel: "Next: Confirm",
          primaryIcon: "chevron",
          primaryDisabled: entryInvalid,
          onPrimary: () => goEntry(3),
        };
      }
      return {
        onBack: () => goEntry(currentStep - 1),
        primaryLabel: entrySaving
          ? "Saving…"
          : entryType === "expense"
            ? "Save expense"
            : entryType === "income"
              ? "Add income"
              : "Confirm transfer",
        primaryIcon: "check",
        primaryDisabled:
          entrySaving || (isTransferMode ? transferInvalid : entryInvalid),
        onPrimary: save,
      };
    }

    if (type === "update" && current) {
      return {
        primaryLabel: hasUpdateInput
          ? `Save ${money(Math.max(0, updateProjectedBalance))}`
          : "Save new balance",
        primaryIcon: "check",
        primaryDisabled: updateInvalid,
        onPrimary: save,
      };
    }

    if (type === "budget") {
      const budgetVal = Number(amount);
      return {
        primaryLabel: "Save monthly budget",
        primaryIcon: "check",
        primaryDisabled: !budgetVal || budgetVal <= 0,
        onPrimary: () => {
          const nextVal = Number(Number(amount).toFixed(2));
          if (!nextVal || nextVal <= 0) return;
          onSaveMonthlyBudget?.(nextVal);
          onDone(`Monthly budget set to ${money(nextVal)}`);
        },
      };
    }

    return null;
  })();

  return (
    <View style={[styles.overlayRoot, { paddingTop: insets.top }]}>
      <Animated.View
        style={[styles.backdrop, { opacity: openAnim }]}
        pointerEvents="none"
      />
      <KeyboardAvoidingView
        style={styles.sheetLayer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[
            styles.bottomSheet,
            {
              backgroundColor: theme.page,
              paddingBottom: Math.max(20, insets.bottom + 8),
              maxHeight:
                type === "add" ||
                type === "edit" ||
                type === "entry" ||
                type === "update" ||
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
          <View pointerEvents="none" style={styles.sheetTextureClip}>
            <SaffianoSheetSurface theme={theme} radius={32} />
          </View>
          <View
            style={[
              styles.sheetHandle,
              { backgroundColor: hexToRgba(theme.leather.accent, 0.25) },
            ]}
          />
          <Animated.View
            style={{
              flexShrink: 1,
              opacity: contentAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.35, 1],
              }),
              transform: [
                {
                  translateX: Animated.multiply(
                    transitionDirAnim,
                    contentAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    })
                  ),
                },
              ],
            }}
          >
          <TopBar
            title={sheetTitle}
            onBack={handleHeaderBack}
            right={
              type === "update" && current && onToggleWalletHidden ? (
                <Pressable
                  onPress={() => onToggleWalletHidden(current)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    current.isHidden ? "Unhide card" : "Hide card"
                  }
                  style={({ pressed }) => [
                    styles.closeRoundBtn,
                    {
                      backgroundColor: current.isHidden
                        ? theme.leather.edge
                        : theme.card,
                      overflow: "hidden",
                      borderWidth: 1,
                      borderColor: current.isHidden
                        ? theme.leather.edge
                        : hexToRgba(theme.leather.accent, 0.28),
                      transform: [{ scale: pressed ? 0.94 : 1 }],
                    },
                    cardShadow(theme.dark),
                  ]}
                >
                  {current.isHidden ? (
                    <DarkLeatherSurface theme={theme} radius={21} />
                  ) : (
                    <LightLeatherSurface theme={theme} radius={21} />
                  )}
                  <Icon
                    name={current.isHidden ? "eye" : "eye-off"}
                    size={17}
                    color={current.isHidden ? "#ffffff" : theme.leather.accent}
                  />
                </Pressable>
              ) : (type === "entry" &&
                  entryStep > (scheduledEntry ? 1 : 0) &&
                  !managingFavorites &&
                  !favoriteDraft) ||
                ((type === "add" || type === "edit") && walletStep > 0) ? (
                <Pressable
                  onPress={onClose}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  style={({ pressed }) => [
                    styles.closeRoundBtn,
                    {
                      backgroundColor: theme.card,
                      overflow: "hidden",
                      borderWidth: 1,
                      borderColor: hexToRgba(theme.leather.accent, 0.28),
                      transform: [{ scale: pressed ? 0.94 : 1 }],
                    },
                    cardShadow(theme.dark),
                  ]}
                >
                  <LightLeatherSurface theme={theme} radius={21} />
                  <Icon
                    name="close"
                    size={17}
                    strokeWidth={2.3}
                    color={theme.leather.accent}
                  />
                </Pressable>
              ) : undefined
            }
            theme={theme}
          />

          <View style={{ flexShrink: 1, position: "relative" }}>
            <Animated.ScrollView
              ref={sheetScrollRef}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{
                paddingTop: 6,
                paddingBottom: stepFooterConfig ? 20 : 32,
              }}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { y: sheetScrollY } } }],
                { useNativeDriver: true }
              )}
              scrollEventThrottle={16}
            >
            {type === "favorite" && favoriteSeed && (
              <FavoriteEditor draft={favoriteSeed} wallets={wallets} hidden={hidden} theme={theme}
                onSave={onSaveFavorite} onDone={onClose} />
            )}
            {type === "schedule" && (
              <ScheduleManager schedules={schedules} wallets={wallets} hidden={hidden} theme={theme}
                seed={scheduleSeed} onSave={onSaveSchedule} onDelete={onDeleteSchedule} onRecord={onOpenScheduledEntry} />
            )}
            {type === "category-budget" && (
              <CategoryBudgetSheet limits={categoryLimits} spending={monthlySpending} hidden={hidden}
                theme={theme} selectedCategory={budgetCategory} onSave={onSaveCategoryLimit} onTransaction={onOpenTransaction}
                onScrollToTop={scrollToTop} />
            )}
            {/* ==================== ADD / EDIT WALLET SHEET ==================== */}
            {(type === "add" || type === "edit") && (() => {
              const isEdit = type === "edit";
              const isEditFromUpdate = isEdit && Boolean(editReturnTarget);
              const walletSteps = isEditFromUpdate
                ? (["Details", "Confirm"] as const)
                : isEdit
                  ? (["Provider", "Details", "Confirm"] as const)
                  : (["Provider", "Details", "Balance", "Confirm"] as const);
              const rawWalletStep = Math.min(walletStep, isEdit ? 2 : 3);
              const currentWalletStep = isEditFromUpdate
                ? Math.max(0, rawWalletStep - 1)
                : rawWalletStep;
              const goWalletStep = (next: number) => {
                Keyboard.dismiss();
                scrollToTop();
                setWalletStep(
                  Math.max(
                    isEditFromUpdate ? 1 : 0,
                    Math.min(isEdit ? 2 : 3, next)
                  )
                );
              };
              const isProviderStep = !isEditFromUpdate && rawWalletStep === 0;
              const isDetailsStep = rawWalletStep === 1;
              const isBalanceStep = !isEdit && rawWalletStep === 2;
              const isConfirmWalletStep =
                (isEdit && rawWalletStep === 2) ||
                (!isEdit && rawWalletStep === 3);
              const brandCardDesign = resolveWalletCardDesign(logoKey, name);
              const hasBrandCardArt = Boolean(brandCardDesign);
              const parsedWalletLogoBg = parseWalletLogoAndBg(logoKey);
              const activeBgKey = !parsedWalletLogoBg.explicitNoBg
                ? (parsedWalletLogoBg.bgPresetKey ||
                  (hasBrandCardArt ? selectedPreset?.key : undefined))
                : undefined;
              const activeBgPreset = activeBgKey
                ? walletPresets.find((p) => p.key === activeBgKey)
                : undefined;
              const hasProviderPreset = selectedPresetKey !== "custom";
              const previewPalette = tonePalette[tone] || tonePalette.blue;
              const bgDesignLabel = hasBrandCardArt
                ? `${activeBgPreset?.name || selectedPreset?.name || "Preset"} bg`
                : `${previewPalette.label} gradient`;
              const cardInk = brandCardDesign
                ? brandCardDesign.ink
                : previewPalette.ink;
              const isLightCardInk = cardInk === "#ffffff";
              const cardSubInk = isLightCardInk
                ? "rgba(255, 255, 255, 0.78)"
                : "rgba(20, 32, 26, 0.68)";
              const cardBadgeBg = isLightCardInk
                ? "rgba(0, 0, 0, 0.26)"
                : "rgba(20, 32, 26, 0.10)";
              const cardBorder = isLightCardInk
                ? "rgba(255, 255, 255, 0.20)"
                : "rgba(20, 32, 26, 0.14)";
              const cardDivider = isLightCardInk
                ? "rgba(255, 255, 255, 0.22)"
                : "rgba(20, 32, 26, 0.14)";
              const presetEntries: (WalletPreset | "custom")[] = [
                "custom",
                ...filteredPresets,
              ];
              const presetRows: (WalletPreset | "custom")[][] = [];
              for (let i = 0; i < presetEntries.length; i += 3) {
                presetRows.push(presetEntries.slice(i, i + 3));
              }

              return (
              <View>
                {/* Slim Step Progress Indicator */}
                <View pointerEvents="none" style={styles.entryProgressWrap}>
                  <View style={styles.entryProgressMeta}>
                    <Text style={[styles.entryProgressCount, { color: theme.muted }]}>
                      Step {currentWalletStep + 1} of {walletSteps.length}
                    </Text>
                    <Text
                      style={[
                        styles.entryProgressCurrent,
                        { color: theme.leather.accent },
                      ]}
                    >
                      {walletSteps[currentWalletStep]}
                    </Text>
                  </View>
                  <View style={styles.entryProgressTrackRow}>
                    {walletSteps.map((stepLabel, idx) => (
                      <View
                        key={stepLabel}
                        style={[
                          styles.entryProgressSegment,
                          {
                            backgroundColor:
                              idx <= currentWalletStep
                                ? theme.leather.colors[1]
                                : hexToRgba(theme.leather.accent, 0.16),
                          },
                        ]}
                      />
                    ))}
                  </View>
                </View>

                {/* ==================== STEP 0: CHOOSE BANK OR E-WALLET ==================== */}
                {isProviderStep && (
                  <View>
                    <View style={styles.entrySectionHead}>
                      <Text style={[styles.entrySectionTitle, { color: theme.ink }]}>
                        Choose bank or e-wallet
                      </Text>
                      <Text style={[styles.entrySectionSub, { color: theme.muted }]}>
                        {filteredPresets.length} presets
                      </Text>
                    </View>

                    {/* Stitched Search Input */}
                    <View
                      style={[
                        styles.presetSearchBox,
                        {
                          overflow: "hidden",
                          backgroundColor: theme.card,
                          borderColor: hexToRgba(theme.leather.accent, 0.24),
                        },
                      ]}
                    >
                      <LightLeatherSurface theme={theme} radius={16} />
                      <Icon name="search" size={16} color={theme.leather.accent} />
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

                    {/* Stitched Group Filter Pills */}
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 7, marginBottom: 12 }}
                    >
                      {PRESET_GROUPS.map((grp) => {
                        const active = presetGroup === grp;
                        return (
                          <Pressable
                            key={grp}
                            onPress={() => setPresetGroup(grp)}
                            style={[
                              styles.stitchedGroupPill,
                              {
                                overflow: "hidden",
                                backgroundColor: active
                                  ? theme.leather.edge
                                  : theme.card,
                                borderColor: active
                                  ? theme.leather.edge
                                  : hexToRgba(theme.leather.accent, 0.22),
                              },
                            ]}
                          >
                            {active ? (
                              <DarkLeatherSurface theme={theme} radius={13} />
                            ) : (
                              <LightLeatherSurface theme={theme} radius={13} />
                            )}
                            <Text
                              style={[
                                styles.stitchedGroupPillText,
                                { color: active ? "#ffffff" : theme.ink },
                              ]}
                            >
                              {grp}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>

                    {/* 3-Column Stitched Provider Grid */}
                    <View style={styles.presetGrid}>
                      {presetRows.map((row, rowIdx) => (
                        <View key={rowIdx} style={styles.categoryGridRow}>
                          {row.map((entry) => {
                            if (entry === "custom") {
                              const active = selectedPresetKey === "custom";
                              return (
                                <Pressable
                                  key="custom"
                                  onPress={() => handleSelectPreset("custom")}
                                  style={[
                                    styles.presetGridCard,
                                    {
                                      overflow: "hidden",
                                      backgroundColor: active
                                        ? theme.leather.edge
                                        : theme.card,
                                      borderColor: active
                                        ? theme.leather.edge
                                        : hexToRgba(theme.leather.accent, 0.22),
                                    },
                                  ]}
                                >
                                  {active ? (
                                    <DarkLeatherSurface theme={theme} radius={16} />
                                  ) : (
                                    <LightLeatherSurface theme={theme} radius={16} />
                                  )}
                                  <View style={styles.presetGridIconSlot}>
                                    <Icon
                                      name="plus"
                                      size={20}
                                      color={active ? "#ffffff" : theme.leather.accent}
                                    />
                                  </View>
                                  <Text
                                    style={[
                                      styles.presetName,
                                      { color: active ? "#ffffff" : theme.ink },
                                    ]}
                                    numberOfLines={1}
                                  >
                                    Custom
                                  </Text>
                                  <Text
                                    style={[
                                      styles.presetSub,
                                      {
                                        color: active
                                          ? theme.leather.thread
                                          : theme.muted,
                                      },
                                    ]}
                                    numberOfLines={1}
                                  >
                                    Any name
                                  </Text>
                                </Pressable>
                              );
                            }

                            const active = selectedPresetKey === entry.key;
                            const pPal = tonePalette[entry.recommendedTone];
                            return (
                              <Pressable
                                key={entry.key}
                                onPress={() => handleSelectPreset(entry)}
                                style={[
                                  styles.presetGridCard,
                                  {
                                    overflow: "hidden",
                                    backgroundColor: active
                                      ? theme.leather.edge
                                      : theme.card,
                                    borderColor: active
                                      ? theme.leather.edge
                                      : hexToRgba(theme.leather.accent, 0.22),
                                  },
                                ]}
                              >
                                {active ? (
                                  <DarkLeatherSurface theme={theme} radius={16} />
                                ) : (
                                  <LightLeatherSurface theme={theme} radius={16} />
                                )}
                                <WalletLogoBadge
                                  logoKey={entry.key}
                                  name={entry.name}
                                  mark={entry.mark}
                                  size={32}
                                  radius={10}
                                  ink={pPal.ink}
                                  fontSize={9}
                                />
                                <Text
                                  style={[
                                    styles.presetName,
                                    { color: active ? "#ffffff" : theme.ink },
                                  ]}
                                  numberOfLines={1}
                                  adjustsFontSizeToFit
                                  minimumFontScale={0.82}
                                >
                                  {entry.name}
                                </Text>
                                <Text
                                  style={[
                                    styles.presetSub,
                                    {
                                      color: active
                                        ? theme.leather.thread
                                        : theme.muted,
                                    },
                                  ]}
                                  numberOfLines={1}
                                >
                                  {entry.type}
                                </Text>
                              </Pressable>
                            );
                          })}
                          {row.length < 3
                            ? Array.from({ length: 3 - row.length }).map((_, emptyIdx) => (
                                <View key={`empty-p-${emptyIdx}`} style={{ flex: 1 }} />
                              ))
                            : null}
                        </View>
                      ))}
                    </View>

                    {!filteredPresets.length ? (
                      <View
                        style={[
                          styles.stitchedNotice,
                          {
                            overflow: "hidden",
                            borderColor: hexToRgba(theme.leather.accent, 0.24),
                            marginTop: 10,
                          },
                        ]}
                      >
                        <LightLeatherSurface theme={theme} radius={16} />
                        <Icon name="info" size={15} color={theme.leather.accent} />
                        <Text style={[styles.stitchedNoticeText, { color: theme.ink }]}>
                          No matching preset — tap Custom above
                        </Text>
                      </View>
                    ) : null}
                  </View>
                )}

                {/* ==================== STEP 1: WALLET DETAILS ==================== */}
                {isDetailsStep && (
                  <View>
                    {/* Live Card Background Preview */}
                    <WalletCardPreviewBox
                      cardDesign={brandCardDesign}
                      palette={previewPalette}
                      borderColor={cardBorder}
                      bottomScrim
                    >
                      <View style={styles.walletHeroTopRow}>
                        <View style={styles.walletPreviewIdentity}>
                          <WalletLogoBadge
                            logoKey={preview.logoKey}
                            name={preview.name}
                            mark={preview.mark}
                            size={30}
                            radius={9}
                            ink={cardInk}
                            fontSize={10}
                          />
                          <Text
                            style={[styles.walletPreviewName, { color: cardInk }]}
                            numberOfLines={1}
                          >
                            {preview.name}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.walletHeroModeBadge,
                            { backgroundColor: cardBadgeBg },
                          ]}
                        >
                          <Text
                            style={[
                              styles.walletHeroModeText,
                              { color: cardInk },
                            ]}
                          >
                            {category.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.walletHeroBottomRow, { marginTop: 14 }]}>
                        <View style={styles.confirmMetaRow}>
                          <Text
                            style={[
                              styles.walletHeroSubText,
                              { color: cardSubInk },
                            ]}
                          >
                            {preview.account}
                          </Text>
                          <View style={styles.walletPreviewColorChip}>
                            <View
                              style={[
                                styles.walletPreviewColorDot,
                                { backgroundColor: previewPalette.from },
                              ]}
                            />
                            <Text
                              style={[
                                styles.walletPreviewColorText,
                                { color: cardInk },
                              ]}
                            >
                              {bgDesignLabel}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </WalletCardPreviewBox>

                    {/* Stitched Wallet Name Input */}
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
                      <LightLeatherSurface theme={theme} radius={19} />
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

                    {/* Stitched Label Input */}
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
                      <LightLeatherSurface theme={theme} radius={19} />
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

                    {/* Stitched Category Pills */}
                    <View style={{ marginTop: 4, marginBottom: 10 }}>
                      <Text
                        style={[
                          styles.fieldLabel,
                          { color: theme.muted, marginLeft: 2, marginBottom: 6 },
                        ]}
                      >
                        Category
                      </Text>
                      <View style={styles.walletCategoryRow}>
                        {WALLET_CATEGORIES.map((cat) => {
                          const active = category === cat;
                          return (
                            <Pressable
                              key={cat}
                              onPress={() => setCategory(cat)}
                              style={[
                                styles.walletCategoryChip,
                                {
                                  overflow: "hidden",
                                  backgroundColor: active
                                    ? theme.leather.edge
                                    : theme.card,
                                  borderColor: active
                                    ? theme.leather.edge
                                    : hexToRgba(theme.leather.accent, 0.22),
                                },
                              ]}
                            >
                              {active ? (
                                <DarkLeatherSurface theme={theme} radius={13} />
                              ) : (
                                <LightLeatherSurface theme={theme} radius={13} />
                              )}
                              <Text
                                style={[
                                  styles.walletCategoryChipText,
                                  { color: active ? "#ffffff" : theme.ink },
                                ]}
                                numberOfLines={1}
                              >
                                {cat}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>

                    {/* Card Background Section (automatic for presets unless customizing; always open for Custom) */}
                    {hasProviderPreset ? (
                      <View
                        style={[
                          styles.stitchedPresetBgRow,
                          {
                            overflow: "hidden",
                            backgroundColor: theme.card,
                            borderColor: hexToRgba(theme.leather.accent, 0.24),
                          },
                        ]}
                      >
                        <LightLeatherSurface theme={theme} radius={16} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.fieldLabel, { color: theme.muted }]}>
                            Card background
                          </Text>
                          <Text
                            style={[
                              styles.recommendedHint,
                              { color: theme.ink, fontSize: 13, marginTop: 2 },
                            ]}
                            numberOfLines={1}
                          >
                            {activeBgKey === selectedPresetKey && hasBrandCardArt
                              ? `Uses ${selectedPreset?.name || preview.name} preset`
                              : `Custom: ${bgDesignLabel}`}
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => setShowCustomTone((v) => !v)}
                          style={({ pressed }) => [
                            styles.presetBgToggleBtn,
                            {
                              overflow: "hidden",
                              backgroundColor: showCustomTone
                                ? theme.leather.edge
                                : theme.page,
                              borderColor: showCustomTone
                                ? theme.leather.edge
                                : hexToRgba(theme.leather.accent, 0.28),
                              transform: [{ scale: pressed ? 0.96 : 1 }],
                            },
                          ]}
                        >
                          {showCustomTone ? (
                            <DarkLeatherSurface theme={theme} radius={12} />
                          ) : null}
                          <Text
                            style={[
                              styles.presetBgToggleText,
                              {
                                color: showCustomTone
                                  ? "#ffffff"
                                  : theme.leather.accent,
                              },
                            ]}
                          >
                            {showCustomTone ? "Done" : "Customize"}
                          </Text>
                        </Pressable>
                      </View>
                    ) : (
                      <View style={styles.colorHeaderRow}>
                        <Text style={[styles.fieldLabel, { color: theme.muted }]}>
                          Card background
                        </Text>
                        <Text
                          style={[
                            styles.recommendedHint,
                            { color: theme.leather.accent },
                          ]}
                        >
                          {bgDesignLabel}
                        </Text>
                      </View>
                    )}

                    {(!hasProviderPreset || showCustomTone) && (
                      <View style={{ marginTop: hasProviderPreset ? 2 : 8 }}>
                        <View style={styles.bgCustomizeTabsRow}>
                          {(["presets", "gradient"] as const).map((tabKey) => {
                            const active = customBgTab === tabKey;
                            return (
                              <Pressable
                                key={tabKey}
                                onPress={() => setCustomBgTab(tabKey)}
                                style={[
                                  styles.bgCustomizeTabBtn,
                                  {
                                    overflow: "hidden",
                                    backgroundColor: active
                                      ? theme.leather.edge
                                      : theme.card,
                                    borderColor: active
                                      ? theme.leather.edge
                                      : hexToRgba(theme.leather.accent, 0.22),
                                  },
                                ]}
                              >
                                {active ? (
                                  <DarkLeatherSurface theme={theme} radius={12} />
                                ) : (
                                  <LightLeatherSurface theme={theme} radius={12} />
                                )}
                                <Text
                                  style={[
                                    styles.bgCustomizeTabText,
                                    { color: active ? "#ffffff" : theme.ink },
                                  ]}
                                >
                                  {tabKey === "presets"
                                    ? "Preset bgs"
                                    : "Gradient colors"}
                                </Text>
                              </Pressable>
                            );
                          })}
                          {hasProviderPreset &&
                          (activeBgKey !== selectedPresetKey || !hasBrandCardArt) ? (
                            <Pressable
                              onPress={() => {
                                const presetTone =
                                  selectedPreset?.recommendedTone || tone;
                                setLogoKey(selectedPresetKey);
                                setTone(presetTone);
                                setCustomBgTab("presets");
                              }}
                              style={[
                                styles.bgResetBtn,
                                {
                                  borderColor: hexToRgba(
                                    theme.leather.accent,
                                    0.25
                                  ),
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.bgResetText,
                                  { color: theme.leather.accent },
                                ]}
                              >
                                Reset
                              </Text>
                            </Pressable>
                          ) : null}
                        </View>

                        {customBgTab === "presets" ? (
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.bgPresetThumbStrip}
                          >
                            {walletPresets.map((p) => {
                              const bgAsset = walletCardBackgroundAssets[p.key];
                              if (!bgAsset) return null;
                              const active = activeBgKey === p.key;
                              return (
                                <Pressable
                                  key={p.key}
                                  onPress={() => {
                                    setLogoKey(
                                      encodeWalletLogoAndBg(
                                        selectedPresetKey,
                                        p.key
                                      )
                                    );
                                    setTone(p.recommendedTone);
                                  }}
                                  style={({ pressed }) => [
                                    styles.bgPresetThumbCard,
                                    {
                                      borderColor: active
                                        ? theme.leather.accent
                                        : hexToRgba(theme.leather.accent, 0.2),
                                      borderWidth: active ? 2.5 : 1,
                                      transform: [{ scale: pressed ? 0.96 : 1 }],
                                    },
                                  ]}
                                >
                                  <View
                                    pointerEvents="none"
                                    style={StyleSheet.absoluteFill}
                                  >
                                    <Svg width={96} height={60}>
                                      <SvgImage
                                        href={bgAsset}
                                        x={0}
                                        y={0}
                                        width={96}
                                        height={60}
                                        preserveAspectRatio="xMaxYMid slice"
                                      />
                                    </Svg>
                                  </View>
                                  <LinearGradient
                                    pointerEvents="none"
                                    colors={["rgba(8, 12, 20, 0)", "rgba(8, 12, 20, 0.56)"]}
                                    start={{ x: 0, y: 0.35 }}
                                    end={{ x: 0, y: 1 }}
                                    style={StyleSheet.absoluteFill}
                                  />
                                  <View style={styles.bgPresetThumbInner}>
                                    {active ? (
                                      <View
                                        style={[
                                          styles.bgPresetThumbCheck,
                                          { backgroundColor: theme.leather.edge },
                                        ]}
                                      >
                                        <Icon name="check" size={10} color="#ffffff" />
                                      </View>
                                    ) : null}
                                    <Text
                                      style={styles.bgPresetThumbLabel}
                                      numberOfLines={1}
                                    >
                                      {p.name}
                                    </Text>
                                  </View>
                                </Pressable>
                              );
                            })}
                          </ScrollView>
                        ) : (
                          <View style={styles.tonePicker}>
                            {([
                              (Object.keys(tonePalette) as Tone[]).slice(0, 6),
                              (Object.keys(tonePalette) as Tone[]).slice(6, 12),
                            ]).map((toneRow, rIdx) => (
                              <View key={rIdx} style={styles.tonePickerRow}>
                                {toneRow.map((t) => {
                                  const pal = tonePalette[t];
                                  const active = !hasBrandCardArt && tone === t;
                                  return (
                                    <Pressable
                                      key={t}
                                      onPress={() => {
                                        setLogoKey(
                                          encodeWalletLogoAndBg(
                                            selectedPresetKey,
                                            "none"
                                          )
                                        );
                                        setTone(t);
                                      }}
                                      style={[
                                        styles.toneSwatchWrapper,
                                        {
                                          borderStyle: active ? "dashed" : "solid",
                                          borderColor: active
                                            ? theme.leather.accent
                                            : "transparent",
                                        },
                                      ]}
                                    >
                                      <View style={styles.toneSwatch}>
                                        <TexturedGradientSurface
                                          fromColor={pal.from}
                                          toColor={pal.to}
                                          subtle
                                        />
                                        {active && (
                                          <Icon name="check" size={15} color={pal.ink} />
                                        )}
                                      </View>
                                    </Pressable>
                                  );
                                })}
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                )}

                {/* ==================== STEP 2 (ADD ONLY): OPENING BALANCE ==================== */}
                {isBalanceStep && (
                  <View>
                    <WalletCardPreviewBox
                      cardDesign={brandCardDesign}
                      palette={previewPalette}
                      borderColor={cardBorder}
                      bottomScrim
                    >
                      <View style={styles.walletHeroTopRow}>
                        <View style={styles.walletHeroTag}>
                          <WalletLogoBadge
                            logoKey={preview.logoKey}
                            name={preview.name}
                            mark={preview.mark}
                            size={18}
                            radius={5}
                            ink={cardInk}
                            fontSize={7}
                          />
                          <Text
                            style={[styles.walletHeroTagText, { color: cardInk }]}
                            numberOfLines={1}
                          >
                            {preview.name}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.walletHeroModeBadge,
                            { backgroundColor: cardBadgeBg },
                          ]}
                        >
                          <Text
                            style={[
                              styles.walletHeroModeText,
                              { color: cardInk },
                            ]}
                          >
                            STARTING BALANCE
                          </Text>
                        </View>
                      </View>

                      <View style={styles.walletHeroAmountWrap}>
                        <Text
                          style={[
                            styles.walletHeroLabel,
                            { color: cardSubInk },
                          ]}
                        >
                          Opening balance
                        </Text>
                        <HeroAmountDisplay
                          value={balance}
                          color={cardInk}
                          muted={!balance}
                        />
                      </View>

                      <View style={styles.walletHeroBottomRow}>
                        <Text
                          style={[
                            styles.walletHeroSubText,
                            { color: cardSubInk },
                          ]}
                          numberOfLines={1}
                        >
                          {preview.type} · {preview.account}
                        </Text>
                      </View>
                    </WalletCardPreviewBox>

                    <AmountKeypad
                      value={balance}
                      onChange={setBalance}
                      quickAmounts={[500, 1000, 5000]}
                      compact
                      stitched
                      theme={theme}
                    />
                  </View>
                )}

                {/* ==================== CONFIRM WALLET STEP ==================== */}
                {isConfirmWalletStep && (
                  <View>
                    <WalletCardPreviewBox
                      cardDesign={brandCardDesign}
                      palette={previewPalette}
                      borderColor={cardBorder}
                      bottomScrim
                    >
                      <View style={styles.walletHeroTopRow}>
                        <View style={styles.walletPreviewIdentity}>
                          <WalletLogoBadge
                            logoKey={preview.logoKey}
                            name={preview.name}
                            mark={preview.mark}
                            size={30}
                            radius={9}
                            ink={cardInk}
                            fontSize={10}
                          />
                          <Text
                            style={[styles.walletPreviewName, { color: cardInk }]}
                            numberOfLines={1}
                          >
                            {preview.name}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.walletHeroModeBadge,
                            { backgroundColor: cardBadgeBg },
                          ]}
                        >
                          <Text
                            style={[
                              styles.walletHeroModeText,
                              { color: cardInk },
                            ]}
                          >
                            {isEdit ? "EDIT WALLET" : "NEW WALLET"}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.walletHeroAmountWrap}>
                        <Text
                          style={[
                            styles.walletHeroLabel,
                            { color: cardSubInk },
                          ]}
                        >
                          {isEdit ? "Current balance" : "Opening balance"}
                        </Text>
                        <HeroAmountDisplay value={balance} color={cardInk} />
                      </View>

                      <View
                        style={[
                          styles.confirmMetaList,
                          { borderTopColor: cardDivider },
                        ]}
                      >
                        <View style={styles.confirmMetaRow}>
                          <Text
                            style={[
                              styles.confirmMetaKey,
                              { color: cardSubInk },
                            ]}
                          >
                            Category
                          </Text>
                          <Text style={[styles.confirmMetaVal, { color: cardInk }]}>
                            {preview.type}
                          </Text>
                        </View>
                        <View style={styles.confirmMetaRow}>
                          <Text
                            style={[
                              styles.confirmMetaKey,
                              { color: cardSubInk },
                            ]}
                          >
                            Label
                          </Text>
                          <Text style={[styles.confirmMetaVal, { color: cardInk }]}>
                            {preview.account}
                          </Text>
                        </View>
                        <View style={styles.confirmMetaRow}>
                          <Text
                            style={[
                              styles.confirmMetaKey,
                              { color: cardSubInk },
                            ]}
                          >
                            Card design
                          </Text>
                          <View style={styles.walletPreviewColorChip}>
                            <View
                              style={[
                                styles.walletPreviewColorDot,
                                { backgroundColor: previewPalette.from },
                              ]}
                            />
                            <Text style={[styles.confirmMetaVal, { color: cardInk }]}>
                              {bgDesignLabel}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </WalletCardPreviewBox>

                    {isEdit && editTarget && onDeleteWallet ? (
                      (() => {
                        const deleteInk = theme.dark ? "#f28b88" : "#9e3c42";
                        return walletConfirmDelete ? (
                          <View
                            style={[
                              styles.stitchedDeleteBox,
                              {
                                overflow: "hidden",
                                backgroundColor: theme.card,
                                borderColor: hexToRgba("#9e3c42", 0.36),
                              },
                            ]}
                          >
                            <LightLeatherSurface theme={theme} radius={18} />
                            <View style={styles.stitchedDeleteHead}>
                              <View style={styles.stitchedDeleteTitleRow}>
                                <Icon name="trash" size={15} color={deleteInk} />
                                <Text
                                  style={[
                                    styles.stitchedDeleteTitle,
                                    { color: theme.ink },
                                  ]}
                                >
                                  Delete "{editTarget.name}"?
                                </Text>
                              </View>
                              <Text
                                style={[
                                  styles.stitchedDeleteSub,
                                  { color: theme.muted },
                                ]}
                              >
                                Past transactions will stay in Activity.
                              </Text>
                            </View>
                            <View style={styles.txActionPair}>
                              <Pressable
                                onPress={() => setWalletConfirmDelete(false)}
                                style={({ pressed }) => [
                                  styles.stitchedDeleteActionBtn,
                                  {
                                    overflow: "hidden",
                                    backgroundColor: theme.page,
                                    borderColor: hexToRgba(theme.leather.accent, 0.25),
                                    transform: [{ scale: pressed ? 0.97 : 1 }],
                                  },
                                ]}
                              >
                                <LightLeatherSurface theme={theme} radius={14} />
                                <Text
                                  style={[
                                    styles.stitchedDeleteCancelText,
                                    { color: theme.ink },
                                  ]}
                                >
                                  Cancel
                                </Text>
                              </Pressable>
                              <Pressable
                                onPress={() => {
                                  onDeleteWallet(editTarget);
                                  onDone(`${editTarget.name} deleted`);
                                }}
                                style={({ pressed }) => [
                                  styles.stitchedDeleteActionBtn,
                                  {
                                    overflow: "hidden",
                                    backgroundColor: "#c04444",
                                    borderColor: "#a23434",
                                    transform: [{ scale: pressed ? 0.97 : 1 }],
                                  },
                                ]}
                              >
                                <View
                                  pointerEvents="none"
                                  style={styles.oxbloodInnerStitch}
                                />
                                <Icon name="trash" size={14} color="#ffffff" />
                                <Text style={styles.stitchedDeleteConfirmText}>
                                  Confirm delete
                                </Text>
                              </Pressable>
                            </View>
                          </View>
                        ) : (
                          <Pressable
                            onPress={() => setWalletConfirmDelete(true)}
                            style={({ pressed }) => [
                              styles.stitchedDeleteTriggerBtn,
                              {
                                overflow: "hidden",
                                backgroundColor: theme.card,
                                borderColor: hexToRgba("#9e3c42", 0.34),
                                transform: [{ scale: pressed ? 0.985 : 1 }],
                              },
                            ]}
                          >
                            <LightLeatherSurface theme={theme} radius={16} />
                            <Icon name="trash" size={15} color={deleteInk} />
                            <Text
                              style={[
                                styles.stitchedDeleteTriggerText,
                                { color: deleteInk },
                              ]}
                            >
                              Delete wallet
                            </Text>
                          </Pressable>
                        );
                      })()
                    ) : null}
                  </View>
                )}
              </View>
              );
            })()}

            {/* ==================== ENTRY (ADD TRANSACTION) SHEET ==================== */}
            {type === "entry" && favoriteDraft && (
              <FavoriteEditor key={favoriteDraft.favorite.id} draft={favoriteDraft} wallets={wallets} hidden={hidden} theme={theme}
                onSave={onSaveFavorite} onRemove={managingFavorites ? onRemoveFavorite : undefined} onDone={closeFavoriteEditor} />
            )}
            {type === "entry" && managingFavorites && !favoriteDraft && (
              <FavoriteList favorites={favorites} wallets={wallets} hidden={hidden} theme={theme} onEdit={(item) => {
                scrollToTop();
                setFavoriteDraft({ favorite: item, suggestedAmount: item.defaultAmount });
              }} />
            )}
            {type === "entry" && entryWallet && !managingFavorites && !favoriteDraft && (() => {
              const isTransferMode = entryType === "transfer";
              const transferPossible = wallets.length >= 2 && Boolean(sourceWallet && destWallet);
              const steps = isTransferMode
                ? (["Wallets", "Amount", "Confirm"] as const)
                : (["Category", "Amount", "Wallet", "Confirm"] as const);
              const minStep = scheduledEntry ? 1 : 0;
              const currentStep = Math.min(entryStep, steps.length - 1);
              const goStep = (next: number) => {
                Keyboard.dismiss();
                scrollToTop();
                setEntryStep(Math.max(minStep, Math.min(steps.length - 1, next)));
              };
              const isAmountStep = currentStep === 1;
              const isWalletPickStep = !isTransferMode && currentStep === 2;
              const isConfirmStep =
                (isTransferMode && currentStep === 2) ||
                (!isTransferMode && currentStep === 3);
              const entryAfterBalance =
                entryWallet.balance +
                (entryType === "expense" ? -1 : 1) * (entryValue || 0);
              const transferAfterSource = sourceWallet
                ? Number((sourceWallet.balance - transferTotalDebit).toFixed(2))
                : 0;
              const transferAfterDest = destWallet
                ? Number((destWallet.balance + (transferValue || 0)).toFixed(2))
                : 0;

              return (
              <View>
                {/* Step Progress Indicator */}
                <View pointerEvents="none" style={styles.entryProgressWrap}>
                  <View style={styles.entryProgressMeta}>
                    <Text
                      style={[styles.entryProgressCount, { color: theme.muted }]}
                    >
                      Step {currentStep + 1} of {steps.length}
                    </Text>
                    <Text
                      style={[
                        styles.entryProgressCurrent,
                        { color: theme.leather.accent },
                      ]}
                    >
                      {steps[currentStep]}
                    </Text>
                  </View>
                  <View style={styles.entryProgressTrackRow}>
                    {steps.map((stepLabel, idx) => {
                      const filled = idx <= currentStep;
                      return (
                        <View
                          key={stepLabel}
                          style={[
                            styles.entryProgressSegment,
                            {
                              backgroundColor: filled
                                ? theme.leather.colors[1]
                                : hexToRgba(theme.leather.accent, 0.16),
                            },
                          ]}
                        />
                      );
                    })}
                  </View>
                </View>

                {scheduledEntry && (
                  <View
                    style={[
                      styles.stitchedNotice,
                      {
                        overflow: "hidden",
                        borderColor: hexToRgba(theme.leather.accent, 0.25),
                      },
                    ]}
                  >
                    <LightLeatherSurface theme={theme} radius={16} />
                    <Icon name="info" size={15} color={theme.leather.accent} />
                    <Text
                      style={[styles.stitchedNoticeText, { color: theme.ink }]}
                      numberOfLines={1}
                    >
                      {scheduledEntry.title} · Due {displayDueDate(scheduledEntry.dueDate)}
                    </Text>
                  </View>
                )}

                {/* ==================== STEP 0: TYPE + CATEGORY / TRANSFER ROUTE ==================== */}
                {currentStep === 0 && (
                  <View>
                    {!scheduledEntry && (
                      <FavoriteStrip
                        favorites={favorites}
                        wallets={wallets}
                        hidden={hidden}
                        theme={theme}
                        onManage={() => {
                          scrollToTop();
                          setManagingFavorites(true);
                        }}
                        onApply={(item) => {
                          const wallet = wallets.find(
                            (w) => getWalletLocalId(w) === item.walletLocalId
                          );
                          if (!wallet) return;
                          setWalletId(wallet.id);
                          setEntryType(item.direction);
                          setEntryCategory(item.category);
                          setNote(item.name);
                          setAmount(
                            item.defaultAmount === null
                              ? ""
                              : String(item.defaultAmount)
                          );
                          goStep(item.defaultAmount ? 3 : 1);
                        }}
                      />
                    )}

                    {/* 3-Way Expense / Income / Transfer Stitched Toggle */}
                    <View style={styles.entrySectionHead}>
                      <Text
                        style={[styles.entrySectionTitle, { color: theme.ink }]}
                      >
                        Transaction type
                      </Text>
                      <Text
                        style={[styles.entrySectionSub, { color: theme.muted }]}
                      >
                        Pick one
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.entryToggle,
                        {
                          overflow: "hidden",
                          backgroundColor: theme.card,
                          borderColor: hexToRgba(theme.leather.accent, 0.24),
                        },
                      ]}
                    >
                      <LightLeatherSurface theme={theme} radius={20} />
                      {(["expense", "income", "transfer"] as const).map((kind) => {
                        const active = entryType === kind;
                        const disabledKind =
                          Boolean(scheduledEntry) && kind !== scheduledEntry?.direction;
                        const label =
                          kind === "expense"
                            ? "Expense"
                            : kind === "income"
                              ? "Income"
                              : "Transfer";
                        const iconName =
                          kind === "expense"
                            ? "arrow-up"
                            : kind === "income"
                              ? "arrow-down"
                              : "swap";
                        return (
                          <Pressable
                            key={kind}
                            disabled={disabledKind}
                            onPress={() => {
                              setEntryType(kind);
                              setEntryError("");
                              if (kind === "expense") {
                                setEntryCategory("Food");
                              } else if (kind === "income") {
                                setEntryCategory("Salary");
                              } else {
                                setPickingTransferSide("from");
                                if (source === destination && wallets.length >= 2) {
                                  const alt = wallets.find((w) => w.id !== source);
                                  if (alt) setDestination(alt.id);
                                }
                              }
                            }}
                            style={[
                              styles.entryToggleBtn,
                              {
                                overflow: "hidden",
                                opacity: disabledKind ? 0.4 : 1,
                              },
                              active && {
                                borderWidth: 1,
                                borderColor: theme.leather.edge,
                              },
                            ]}
                          >
                            {active ? (
                              <DarkLeatherSurface theme={theme} radius={15} />
                            ) : null}
                            <Icon
                              name={iconName}
                              size={15}
                              color={
                                active
                                  ? kind === "income"
                                    ? "#6ee7b7"
                                    : "#ffffff"
                                  : theme.leather.accent
                              }
                            />
                            <Text
                              style={[
                                styles.entryToggleText,
                                {
                                  color: active ? "#ffffff" : theme.ink,
                                },
                              ]}
                              numberOfLines={1}
                            >
                              {label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    {!isTransferMode ? (
                      <View style={styles.entrySection}>
                        <View style={styles.entrySectionHead}>
                          <Text
                            style={[styles.entrySectionTitle, { color: theme.ink }]}
                          >
                            Choose category
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
                          (cat) => setEntryCategory(cat),
                          true
                        )}
                      </View>
                    ) : !transferPossible ? (
                      <View
                        style={[
                          styles.stitchedNotice,
                          {
                            overflow: "hidden",
                            borderColor: hexToRgba(theme.leather.accent, 0.25),
                            marginBottom: 16,
                          },
                        ]}
                      >
                        <LightLeatherSurface theme={theme} radius={16} />
                        <Icon name="info" size={16} color={theme.leather.accent} />
                        <Text style={[styles.stitchedNoticeText, { color: theme.ink }]}>
                          Add at least 2 wallets to transfer funds between them.
                        </Text>
                      </View>
                    ) : (() => {
                      const activeSide = pickingTransferSide ?? "from";
                      const selectableWallets = wallets.filter((w) =>
                        activeSide === "from"
                          ? w.id !== destination
                          : w.id !== source
                      );
                      return (
                      <View style={styles.entrySection}>
                        <View style={styles.entrySectionHead}>
                          <Text
                            style={[styles.entrySectionTitle, { color: theme.ink }]}
                          >
                            Select wallets
                          </Text>
                          <Text
                            style={[styles.entrySectionSub, { color: theme.muted }]}
                          >
                            Tap From or To to edit
                          </Text>
                        </View>

                        <View style={styles.transferSideRow}>
                          <Pressable
                            onPress={() => setPickingTransferSide("from")}
                            style={[
                              styles.transferSideCard,
                              {
                                overflow: "hidden",
                                borderColor:
                                  activeSide === "from"
                                    ? theme.leather.edge
                                    : hexToRgba(theme.leather.accent, 0.25),
                              },
                            ]}
                          >
                            {activeSide === "from" ? (
                              <DarkLeatherSurface theme={theme} radius={18} />
                            ) : (
                              <LightLeatherSurface theme={theme} radius={18} />
                            )}
                            <Text
                              style={[
                                styles.transferSideRole,
                                {
                                  color:
                                    activeSide === "from"
                                      ? theme.leather.thread
                                      : theme.muted,
                                },
                              ]}
                            >
                              {activeSide === "from"
                                ? "FROM · SELECTING"
                                : "FROM · TAP TO EDIT"}
                            </Text>
                            <View style={styles.transferSideIdentity}>
                              <WalletLogoBadge
                                logoKey={sourceWallet.logoKey}
                                name={sourceWallet.name}
                                mark={sourceWallet.mark}
                                size={28}
                                radius={9}
                                ink={
                                  activeSide === "from"
                                    ? "#ffffff"
                                    : theme.ink
                                }
                                fontSize={9}
                              />
                              <Text
                                style={[
                                  styles.transferSideName,
                                  {
                                    color:
                                      activeSide === "from"
                                        ? "#ffffff"
                                        : theme.ink,
                                  },
                                ]}
                                numberOfLines={1}
                              >
                                {sourceWallet.name}
                              </Text>
                            </View>
                            <Text
                              style={[
                                styles.transferSideBal,
                                {
                                  color:
                                    activeSide === "from"
                                      ? theme.leather.thread
                                      : theme.muted,
                                },
                              ]}
                              numberOfLines={1}
                            >
                              {money(sourceWallet.balance)}
                            </Text>
                          </Pressable>

                          <Pressable
                            onPress={() => setPickingTransferSide("to")}
                            style={[
                              styles.transferSideCard,
                              {
                                overflow: "hidden",
                                borderColor:
                                  activeSide === "to"
                                    ? theme.leather.edge
                                    : hexToRgba(theme.leather.accent, 0.25),
                              },
                            ]}
                          >
                            {activeSide === "to" ? (
                              <DarkLeatherSurface theme={theme} radius={18} />
                            ) : (
                              <LightLeatherSurface theme={theme} radius={18} />
                            )}
                            <Text
                              style={[
                                styles.transferSideRole,
                                {
                                  color:
                                    activeSide === "to"
                                      ? theme.leather.thread
                                      : theme.muted,
                                },
                              ]}
                            >
                              {activeSide === "to"
                                ? "TO · SELECTING"
                                : "TO · TAP TO EDIT"}
                            </Text>
                            <View style={styles.transferSideIdentity}>
                              <WalletLogoBadge
                                logoKey={destWallet.logoKey}
                                name={destWallet.name}
                                mark={destWallet.mark}
                                size={28}
                                radius={9}
                                ink={
                                  activeSide === "to"
                                    ? "#ffffff"
                                    : theme.ink
                                }
                                fontSize={9}
                              />
                              <Text
                                style={[
                                  styles.transferSideName,
                                  {
                                    color:
                                      activeSide === "to"
                                        ? "#ffffff"
                                        : theme.ink,
                                  },
                                ]}
                                numberOfLines={1}
                              >
                                {destWallet.name}
                              </Text>
                            </View>
                            <Text
                              style={[
                                styles.transferSideBal,
                                {
                                  color:
                                    activeSide === "to"
                                      ? theme.leather.thread
                                      : theme.muted,
                                },
                              ]}
                              numberOfLines={1}
                            >
                              {money(destWallet.balance)}
                            </Text>
                          </Pressable>

                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Swap source and destination wallets"
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
                              colors={[
                                theme.leather.colors[0],
                                theme.leather.colors[1],
                              ]}
                              style={styles.transferSwapInner}
                            >
                              <Icon name="swap" size={16} color="#ffffff" />
                            </LinearGradient>
                          </Pressable>
                        </View>

                        <View style={styles.walletVerticalList}>
                          <View
                            style={[
                              styles.entrySectionHead,
                              { marginTop: 12, marginBottom: 4 },
                            ]}
                          >
                            <Text
                              style={[
                                styles.fieldLabel,
                                { color: theme.ink, marginBottom: 0 },
                              ]}
                            >
                              {activeSide === "from"
                                ? "Choose source wallet"
                                : "Choose destination wallet"}
                            </Text>
                            <Text
                              style={[
                                styles.entrySectionSub,
                                { color: theme.muted },
                              ]}
                            >
                              {activeSide === "from"
                                ? `Excludes ${destWallet.name}`
                                : `Excludes ${sourceWallet.name}`}
                            </Text>
                          </View>
                          {selectableWallets.map((w) => {
                            const active =
                              activeSide === "from"
                                ? w.id === source
                                : w.id === destination;
                            return (
                              <Pressable
                                key={w.id}
                                onPress={() => {
                                  if (activeSide === "from") {
                                    setSource(w.id);
                                    setPickingTransferSide("to");
                                  } else {
                                    setDestination(w.id);
                                  }
                                }}
                                style={[
                                  styles.stitchedWalletRow,
                                  {
                                    overflow: "hidden",
                                    borderColor: active
                                      ? theme.leather.edge
                                      : hexToRgba(theme.leather.accent, 0.22),
                                  },
                                ]}
                              >
                                {active ? (
                                  <DarkLeatherSurface theme={theme} radius={16} />
                                ) : (
                                  <LightLeatherSurface theme={theme} radius={16} />
                                )}
                                <WalletLogoBadge
                                  logoKey={w.logoKey}
                                  name={w.name}
                                  mark={w.mark}
                                  size={34}
                                  radius={10}
                                  ink={active ? "#ffffff" : theme.ink}
                                  fontSize={9}
                                />
                                <View style={{ flex: 1 }}>
                                  <Text
                                    style={[
                                      styles.entryWalletName,
                                      { color: active ? "#ffffff" : theme.ink },
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {w.name}
                                  </Text>
                                  <Text
                                    style={[
                                      styles.entryWalletBal,
                                      {
                                        color: active
                                          ? theme.leather.thread
                                          : theme.muted,
                                      },
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {w.type}
                                  </Text>
                                </View>
                                <Text
                                  style={[
                                    styles.stitchedWalletAmount,
                                    { color: active ? "#ffffff" : theme.ink },
                                  ]}
                                >
                                  {money(w.balance)}
                                </Text>
                              </Pressable>
                            );
                          })}
                          {wallets.length === 2 ? (
                            <Text
                              style={[
                                styles.entryWalletBal,
                                {
                                  color: theme.muted,
                                  textAlign: "center",
                                  marginTop: 2,
                                },
                              ]}
                            >
                              Tap ⇄ above to swap source and destination
                            </Text>
                          ) : null}
                        </View>
                      </View>
                      );
                    })()}
                  </View>
                )}

                {/* ==================== STEP 1: TEXTURED WALLET AMOUNT + KEYPAD ==================== */}
                {isAmountStep && (
                  <View>
                    {/* Dark Stitched Leather Wallet Amount Panel (replaces FolderSurface card) */}
                    <View
                      style={[
                        styles.walletHeroPanel,
                        {
                          overflow: "hidden",
                          borderColor: theme.leather.edge,
                        },
                      ]}
                    >
                      <DarkLeatherSurface theme={theme} radius={22} />
                      <View style={styles.walletHeroTopRow}>
                        <View style={styles.walletHeroTag}>
                          <Icon
                            name={isTransferMode ? "swap" : entryIcon}
                            size={14}
                            color="#ffffff"
                          />
                          <Text
                            style={styles.walletHeroTagText}
                            numberOfLines={1}
                          >
                            {isTransferMode && sourceWallet && destWallet
                              ? `${sourceWallet.name} → ${destWallet.name}`
                              : entryCategory}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.walletHeroModeBadge,
                            entryType === "income" && {
                              backgroundColor: "rgba(52, 211, 153, 0.22)",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.walletHeroModeText,
                              {
                                color:
                                  entryType === "income"
                                    ? "#6ee7b7"
                                    : theme.leather.thread,
                              },
                            ]}
                          >
                            {entryType === "expense"
                              ? "EXPENSE"
                              : entryType === "income"
                                ? "INCOME"
                                : "TRANSFER"}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.walletHeroAmountWrap}>
                        <View style={styles.walletHeroLabelRow}>
                          <Text
                            style={[
                              styles.walletHeroLabel,
                              { color: theme.leather.thread },
                            ]}
                          >
                            {entryType === "expense"
                              ? "Amount spent"
                              : entryType === "income"
                                ? "Amount received"
                                : "Amount to transfer"}
                          </Text>
                          {isTransferMode &&
                          sourceWallet &&
                          sourceWallet.balance > transferFee ? (
                            <Pressable
                              onPress={() =>
                                setAmount(
                                  String(
                                    Math.max(
                                      0,
                                      Number(
                                        (
                                          sourceWallet.balance - transferFee
                                        ).toFixed(2)
                                      )
                                    )
                                  )
                                )
                              }
                              style={styles.walletHeroMaxChip}
                            >
                              <Text style={styles.walletHeroMaxText}>
                                Send max
                              </Text>
                            </Pressable>
                          ) : null}
                        </View>
                        <HeroAmountDisplay
                          value={amount}
                          color="#ffffff"
                          muted={!amount}
                        />
                      </View>

                      <View style={styles.walletHeroBottomRow}>
                        <Text
                          style={[
                            styles.walletHeroSubText,
                            { color: theme.leather.thread },
                          ]}
                          numberOfLines={1}
                        >
                          {isTransferMode && sourceWallet
                            ? transferFee > 0
                              ? `Total debit: ${money(transferTotalDebit)} (incl. ${money(transferFee)} fee)`
                              : `Available in ${sourceWallet.name}: ${money(sourceWallet.balance)}`
                            : scheduledEntry
                              ? `Wallet: ${entryWallet.name}`
                              : "Next step: Choose wallet"}
                        </Text>
                      </View>
                    </View>

                    {isTransferMode && (
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
                                  overflow: "hidden",
                                  backgroundColor: active
                                    ? theme.leather.edge
                                    : theme.card,
                                  borderColor: active
                                    ? theme.leather.edge
                                    : hexToRgba(theme.leather.accent, 0.24),
                                },
                              ]}
                            >
                              {active ? (
                                <DarkLeatherSurface theme={theme} radius={12} />
                              ) : (
                                <LightLeatherSurface theme={theme} radius={12} />
                              )}
                              <Text
                                style={[
                                  styles.feeChipText,
                                  { color: active ? "#ffffff" : theme.ink },
                                ]}
                              >
                                {feeAmt === 0 ? "Free" : `₱${feeAmt}`}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    )}

                    <AmountKeypad
                      value={amount}
                      onChange={setAmount}
                      quickAmounts={[100, 500, 1000, 5000]}
                      compact
                      stitched
                      theme={theme}
                    />

                    {isTransferMode &&
                    sourceWallet &&
                    transferValue > 0 &&
                    transferTotalDebit > sourceWallet.balance ? (
                      <Text style={styles.errorText}>
                        Total exceeds {sourceWallet.name} balance ({money(sourceWallet.balance)}).
                      </Text>
                    ) : null}
                  </View>
                )}

                {/* ==================== STEP 2 (EXPENSE/INCOME): CHOOSE WALLET ==================== */}
                {isWalletPickStep && (
                  <View>
                    <View style={styles.entrySectionHead}>
                      <Text style={[styles.entrySectionTitle, { color: theme.ink }]}>
                        {entryType === "expense" ? "Pay from wallet" : "Deposit to wallet"}
                      </Text>
                      <Text style={[styles.entrySectionSub, { color: theme.muted }]}>
                        {money(entryValue)}
                      </Text>
                    </View>

                    <View style={styles.walletVerticalList}>
                      {activeWallets.map((w) => {
                        const active = walletId === w.id;
                        const insufficient =
                          entryType === "expense" && entryValue > w.balance;
                        const projected =
                          w.balance +
                          (entryType === "expense" ? -entryValue : entryValue);
                        return (
                          <Pressable
                            key={w.id}
                            onPress={() => setWalletId(w.id)}
                            style={[
                              styles.stitchedWalletRow,
                              {
                                overflow: "hidden",
                                borderColor: active
                                  ? theme.leather.edge
                                  : hexToRgba(theme.leather.accent, 0.22),
                                opacity: insufficient && !active ? 0.65 : 1,
                              },
                            ]}
                          >
                            {active ? (
                              <DarkLeatherSurface theme={theme} radius={16} />
                            ) : (
                              <LightLeatherSurface theme={theme} radius={16} />
                            )}
                            <WalletLogoBadge
                              logoKey={w.logoKey}
                              name={w.name}
                              mark={w.mark}
                              size={36}
                              radius={11}
                              ink={active ? "#ffffff" : theme.ink}
                              fontSize={9}
                            />
                            <View style={{ flex: 1 }}>
                              <Text
                                style={[
                                  styles.entryWalletName,
                                  { color: active ? "#ffffff" : theme.ink },
                                ]}
                                numberOfLines={1}
                              >
                                {w.name}
                              </Text>
                              <Text
                                style={[
                                  styles.entryWalletBal,
                                  {
                                    color: insufficient
                                      ? active
                                        ? "#fca5a5"
                                        : "#c04444"
                                      : active
                                        ? theme.leather.thread
                                        : theme.muted,
                                  },
                                ]}
                                numberOfLines={1}
                              >
                                {insufficient
                                  ? "Insufficient balance"
                                  : `After: ${money(projected)}`}
                              </Text>
                            </View>
                            <View style={{ alignItems: "flex-end" }}>
                              <Text
                                style={[
                                  styles.stitchedWalletAmount,
                                  { color: active ? "#ffffff" : theme.ink },
                                ]}
                              >
                                {money(w.balance)}
                              </Text>
                              {active ? (
                                <Icon
                                  name="check"
                                  size={14}
                                  color={theme.leather.thread}
                                />
                              ) : null}
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>

                    {entryType === "expense" &&
                    entryValue > entryWallet.balance ? (
                      <Text style={styles.errorText}>
                        Amount exceeds {entryWallet.name} balance. Choose another wallet or adjust the amount.
                      </Text>
                    ) : null}
                  </View>
                )}

                {/* ==================== CONFIRMATION STEP ==================== */}
                {isConfirmStep && (
                  <View>
                    <View
                      style={[
                        styles.walletHeroPanel,
                        {
                          overflow: "hidden",
                          borderColor: theme.leather.edge,
                        },
                      ]}
                    >
                      <DarkLeatherSurface theme={theme} radius={22} />
                      <View style={styles.walletHeroTopRow}>
                        <View style={styles.walletHeroTag}>
                          <Icon
                            name={isTransferMode ? "swap" : entryIcon}
                            size={14}
                            color="#ffffff"
                          />
                          <Text style={styles.walletHeroTagText} numberOfLines={1}>
                            {isTransferMode && sourceWallet && destWallet
                              ? `${sourceWallet.name} → ${destWallet.name}`
                              : entryCategory}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.walletHeroModeBadge,
                            entryType === "income" && {
                              backgroundColor: "rgba(52, 211, 153, 0.22)",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.walletHeroModeText,
                              {
                                color:
                                  entryType === "income"
                                    ? "#6ee7b7"
                                    : theme.leather.thread,
                              },
                            ]}
                          >
                            {entryType === "expense"
                              ? "EXPENSE"
                              : entryType === "income"
                                ? "INCOME"
                                : "TRANSFER"}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.walletHeroAmountWrap}>
                        <Text
                          style={[
                            styles.walletHeroLabel,
                            { color: theme.leather.thread },
                          ]}
                        >
                          Confirm transaction
                        </Text>
                        <HeroAmountDisplay value={amount} color="#ffffff" />
                      </View>

                      <View style={styles.confirmMetaList}>
                        {isTransferMode && sourceWallet && destWallet ? (
                          <>
                            <View style={styles.confirmMetaRow}>
                              <Text style={[styles.confirmMetaKey, { color: theme.leather.thread }]}>
                                From ({sourceWallet.name})
                              </Text>
                              <Text style={styles.confirmMetaVal}>
                                {money(sourceWallet.balance)} → {money(transferAfterSource)}
                              </Text>
                            </View>
                            <View style={styles.confirmMetaRow}>
                              <Text style={[styles.confirmMetaKey, { color: theme.leather.thread }]}>
                                To ({destWallet.name})
                              </Text>
                              <Text style={styles.confirmMetaVal}>
                                {money(destWallet.balance)} → {money(transferAfterDest)}
                              </Text>
                            </View>
                            {transferFee > 0 ? (
                              <View style={styles.confirmMetaRow}>
                                <Text style={[styles.confirmMetaKey, { color: theme.leather.thread }]}>
                                  Transfer fee
                                </Text>
                                <Text style={styles.confirmMetaVal}>
                                  {money(transferFee)} (Total {money(transferTotalDebit)})
                                </Text>
                              </View>
                            ) : null}
                          </>
                        ) : (
                          <>
                            <View style={styles.confirmMetaRow}>
                              <Text style={[styles.confirmMetaKey, { color: theme.leather.thread }]}>
                                Wallet
                              </Text>
                              <Text style={styles.confirmMetaVal}>
                                {entryWallet.name}
                              </Text>
                            </View>
                            <View style={styles.confirmMetaRow}>
                              <Text style={[styles.confirmMetaKey, { color: theme.leather.thread }]}>
                                Balance after
                              </Text>
                              <Text style={styles.confirmMetaVal}>
                                {money(entryWallet.balance)} → {money(entryAfterBalance)}
                              </Text>
                            </View>
                          </>
                        )}
                      </View>
                    </View>

                    {/* Stitched Note Input */}
                    <View
                      style={[
                        styles.entryNoteBox,
                        {
                          overflow: "hidden",
                          backgroundColor: theme.card,
                          borderColor: hexToRgba(theme.leather.accent, 0.24),
                          marginTop: 12,
                          paddingHorizontal: 14,
                        },
                      ]}
                    >
                      <LightLeatherSurface theme={theme} radius={18} />
                      <Icon name="edit" size={16} color={theme.leather.accent} />
                      <TextInput
                        value={note}
                        onChangeText={setNote}
                        placeholder={
                          isTransferMode
                            ? "Add a transfer note (optional)"
                            : entryType === "expense"
                              ? "Add a note, e.g. lunch with team"
                              : "Add a note, e.g. client payout"
                        }
                        placeholderTextColor={theme.muted}
                        style={[styles.entryNoteInput, { color: theme.ink }]}
                      />
                    </View>

                    {!scheduledEntry && !isTransferMode && (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => {
                          Keyboard.dismiss();
                          scrollToTop();
                          setFavoriteDraft(
                            createFavoriteDraft(
                              {
                                name: (note.trim() || entryCategory).slice(0, 70),
                                direction: entryType,
                                category: entryCategory,
                                walletLocalId: getWalletLocalId(entryWallet),
                              },
                              entryValue > 0 ? entryValue : null
                            )
                          );
                        }}
                        style={[
                          styles.secondaryButton,
                          {
                            overflow: "hidden",
                            backgroundColor: theme.card,
                            borderWidth: 1,
                            borderColor: hexToRgba(theme.leather.accent, 0.24),
                            marginTop: 4,
                          },
                        ]}
                      >
                        <LightLeatherSurface theme={theme} radius={16} />
                        <Icon name="star" size={16} color={theme.leather.accent} />
                        <Text
                          style={[
                            styles.secondaryButtonText,
                            { color: theme.leather.accent },
                          ]}
                        >
                          Save as favorite
                        </Text>
                      </Pressable>
                    )}

                    {entryError ? (
                      <Text accessibilityRole="alert" style={styles.errorText}>
                        {entryError}
                      </Text>
                    ) : null}
                  </View>
                )}
              </View>
              );
            })()}

            {/* ==================== UPDATE BALANCE SHEET ==================== */}
            {type === "update" && current && (() => {
              const pal = tonePalette[current.tone] || tonePalette.blue;
              const cardDesign = resolveWalletCardDesign(
                current.logoKey,
                current.name
              );
              const cardInk = cardDesign ? cardDesign.ink : pal.ink;
              const isLightInk = cardInk === "#ffffff";
              const cardSubInk = isLightInk
                ? "rgba(255, 255, 255, 0.78)"
                : "rgba(20, 32, 26, 0.68)";
              const cardBadgeBg = isLightInk
                ? "rgba(0, 0, 0, 0.28)"
                : "rgba(20, 32, 26, 0.10)";
              const cardBorder = isLightInk
                ? "rgba(255, 255, 255, 0.2)"
                : "rgba(20, 32, 26, 0.14)";

              return (
                <View>
                  {/* Live Textured Wallet Card Hero + Amount Display */}
                  <WalletCardPreviewBox
                    cardDesign={cardDesign}
                    palette={pal}
                    borderColor={cardBorder}
                  >
                    <View style={styles.walletHeroTopRow}>
                      <View style={styles.walletPreviewIdentity}>
                        <WalletLogoBadge
                          logoKey={current.logoKey}
                          name={current.name}
                          mark={current.mark}
                          size={30}
                          radius={9}
                          ink={cardInk}
                          fontSize={10}
                        />
                        <Text
                          style={[styles.walletPreviewName, { color: cardInk }]}
                          numberOfLines={1}
                        >
                          {current.name}
                        </Text>
                      </View>
                        <View
                          style={[
                            styles.walletHeroModeBadge,
                            { backgroundColor: cardBadgeBg },
                          ]}
                        >
                          <Text
                            style={[styles.walletHeroModeText, { color: cardInk }]}
                          >
                            {current.type.toUpperCase()}
                          </Text>
                        </View>
                    </View>

                    <View style={styles.walletHeroAmountWrap}>
                      <Text
                        style={[styles.walletHeroLabel, { color: cardSubInk }]}
                      >
                        {updateMode === "set"
                          ? "New exact balance"
                          : updateMode === "add"
                            ? "Amount to add"
                            : "Amount to subtract"}
                      </Text>
                      <HeroAmountDisplay
                        prefix={
                          updateMode === "add"
                            ? "+₱"
                            : updateMode === "sub"
                              ? "-₱"
                              : "₱"
                        }
                        value={amount}
                        color={cardInk}
                        muted={!amount}
                      />
                    </View>

                    <View style={styles.walletHeroBottomRow}>
                      <Text
                        style={[styles.walletHeroSubText, { color: cardSubInk }]}
                        numberOfLines={1}
                      >
                        {hasUpdateInput && updateDifference !== 0
                          ? updateMode === "set"
                            ? `Current: ${money(current.balance)} · Change: ${
                                updateDifference >= 0 ? "+" : "-"
                              }${money(Math.abs(updateDifference))}`
                            : `New balance: ${money(
                                Math.max(0, updateProjectedBalance)
                              )} (from ${money(current.balance)})`
                          : current.isHidden
                            ? `Hidden from totals · Current: ${money(current.balance)}`
                            : `Current: ${money(current.balance)} · ${current.account}`}
                      </Text>
                    </View>
                  </WalletCardPreviewBox>

                  {/* Quick Stitched Actions: Edit card & Use current */}
                  {onSwitchSheet || updateMode === "set" ? (
                    <View style={styles.updateQuickActionsRow}>
                      {onSwitchSheet ? (
                        <Pressable
                          onPress={() => {
                            transitionDirRef.current = 1;
                            setEditReturnTarget(current);
                            onSwitchSheet("edit", current);
                          }}
                          style={({ pressed }) => [
                            styles.updateActionBtn,
                            {
                              overflow: "hidden",
                              backgroundColor: theme.card,
                              borderColor: hexToRgba(theme.leather.accent, 0.26),
                              transform: [{ scale: pressed ? 0.97 : 1 }],
                            },
                            cardShadow(theme.dark),
                          ]}
                        >
                          <LightLeatherSurface theme={theme} radius={15} />
                          <Icon
                            name="edit"
                            size={14}
                            color={theme.leather.accent}
                          />
                          <Text
                            style={[
                              styles.updateActionBtnText,
                              { color: theme.ink },
                            ]}
                          >
                            Edit card
                          </Text>
                        </Pressable>
                      ) : null}
                      {updateMode === "set" ? (
                        <Pressable
                          onPress={() =>
                            setAmount(String(Number(current.balance.toFixed(2))))
                          }
                          style={({ pressed }) => [
                            styles.updateActionBtn,
                            {
                              overflow: "hidden",
                              backgroundColor: theme.card,
                              borderColor: hexToRgba(theme.leather.accent, 0.26),
                              transform: [{ scale: pressed ? 0.97 : 1 }],
                            },
                            cardShadow(theme.dark),
                          ]}
                        >
                          <LightLeatherSurface theme={theme} radius={15} />
                          <Icon
                            name="sync"
                            size={14}
                            color={theme.leather.accent}
                          />
                          <Text
                            style={[
                              styles.updateActionBtnText,
                              { color: theme.ink },
                            ]}
                          >
                            Use current
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}

                  {/* Stitched Update Mode Toggle: Set exact | Add (+) | Subtract (-) */}
                  <View
                    style={[
                      styles.updateModeBar,
                      {
                        overflow: "hidden",
                        backgroundColor: theme.card,
                        borderColor: hexToRgba(theme.leather.accent, 0.24),
                      },
                    ]}
                  >
                    <LightLeatherSurface theme={theme} radius={16} />
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
                            { overflow: "hidden" },
                          ]}
                        >
                          {active ? (
                            <DarkLeatherSurface theme={theme} radius={12} />
                          ) : null}
                          <Text
                            style={[
                              styles.updateModeText,
                              { color: active ? "#ffffff" : theme.ink },
                            ]}
                          >
                            {modeLabel}
                          </Text>
                        </Pressable>
                      );
                    })}
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
                    stitched
                    theme={theme}
                  />
                </View>
              );
            })()}

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
                      {wallets
                        .filter((w) =>
                          pickingTransferSide === "from"
                            ? w.id !== destination
                            : w.id !== source
                        )
                        .map((w) => {
                        const active =
                          pickingTransferSide === "from"
                            ? w.id === source
                            : w.id === destination;
                        return (
                          <Pressable
                            key={w.id}
                            onPress={() => {
                              if (pickingTransferSide === "from") {
                                setSource(w.id);
                              } else {
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
                              ink={active ? theme.accentInk : theme.ink}
                              fontSize={7}
                            />
                            <Text
                              style={[
                                styles.walletSelectChipText,
                                { color: active ? theme.accentInk : theme.ink },
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
                                  { color: active ? theme.accentInk : theme.ink },
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
                                    { color: active ? theme.accentInk : theme.ink },
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
                      {
                        overflow: "hidden",
                        backgroundColor: theme.leather.colors[1],
                        borderColor: theme.leather.edge,
                      },
                      cardShadow(theme.dark),
                    ]}
                  >
                    <DarkLeatherSurface theme={theme} radius={22} />
                    <View
                      style={[
                        styles.txDetailIconBox,
                        {
                          backgroundColor: isPositive
                            ? "rgba(110, 231, 183, 0.16)"
                            : "rgba(255, 255, 255, 0.12)",
                          borderColor: isPositive
                            ? "rgba(110, 231, 183, 0.28)"
                            : "rgba(255, 255, 255, 0.18)",
                        },
                      ]}
                    >
                      <Icon
                        name={activity.icon}
                        size={23}
                        color={isPositive ? "#6ee7b7" : "#ffffff"}
                      />
                    </View>
                    <Text
                      style={[
                        styles.txDetailTitle,
                        { color: "rgba(255, 255, 255, 0.88)" },
                      ]}
                      numberOfLines={2}
                    >
                      {activity.title}
                    </Text>
                    <Text
                      style={[
                        styles.txDetailAmount,
                        { color: isPositive ? "#6ee7b7" : "#ffffff" },
                      ]}
                    >
                      {hidden
                        ? "₱ ••••••"
                        : `${isPositive ? "+" : "-"} ${money(Math.abs(activity.amount))}`}
                    </Text>
                    <View
                      style={[
                        styles.txTypePill,
                        {
                          backgroundColor: isPositive
                            ? "rgba(110, 231, 183, 0.16)"
                            : "rgba(255, 255, 255, 0.12)",
                          borderColor: isPositive
                            ? "rgba(110, 231, 183, 0.28)"
                            : "rgba(255, 255, 255, 0.18)",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.txTypePillText,
                          {
                            color: isPositive
                              ? "#6ee7b7"
                              : "rgba(255, 255, 255, 0.9)",
                          },
                        ]}
                      >
                        {isPositive ? "Money in" : "Money out"} · {activity.kind}
                      </Text>
                    </View>
                  </View>

                  {/* Breakdown Details Card */}
                  <View
                    style={[
                      styles.txDetailCard,
                      {
                        overflow: "hidden",
                        backgroundColor: theme.card,
                        borderColor: hexToRgba(theme.leather.accent, 0.24),
                      },
                      cardShadow(theme.dark),
                    ]}
                  >
                    <LightLeatherSurface theme={theme} radius={20} />
                    <View
                      style={[
                        styles.txDetailRow,
                        {
                          borderBottomWidth: 1,
                          borderBottomColor: hexToRgba(theme.leather.accent, 0.14),
                        },
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
                        {
                          borderBottomWidth: 1,
                          borderBottomColor: hexToRgba(theme.leather.accent, 0.14),
                        },
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
                        {
                          borderBottomWidth: 1,
                          borderBottomColor: hexToRgba(theme.leather.accent, 0.14),
                        },
                      ]}
                    >
                      <Text style={[styles.txDetailKey, { color: theme.muted }]}>
                        {isTransfer ? "From wallet" : "Wallet"}
                      </Text>
                      <View style={styles.txWalletValRow}>
                        {matchedWallet && !matchedWallet.isHidden ? (
                          <WalletLogoBadge
                            logoKey={matchedWallet.logoKey}
                            name={matchedWallet.name}
                            mark={matchedWallet.mark}
                            size={22}
                            radius={7}
                            ink={theme.ink}
                            fontSize={8}
                          />
                        ) : matchedWallet?.isHidden ? (
                          <Icon name="eye-off" size={14} color={theme.muted} />
                        ) : null}
                        <Text style={[styles.txDetailVal, { color: theme.ink }]}>
                          {matchedWallet?.isHidden
                            ? "Hidden wallet"
                            : matchedWallet
                              ? `${matchedWallet.name} · ${matchedWallet.type}`
                              : activity.wallet}
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
                          {matchedDestWallet.isHidden ? (
                            <Icon name="eye-off" size={14} color={theme.muted} />
                          ) : (
                            <WalletLogoBadge
                              logoKey={matchedDestWallet.logoKey}
                              name={matchedDestWallet.name}
                              mark={matchedDestWallet.mark}
                              size={22}
                              radius={7}
                              ink={theme.ink}
                              fontSize={8}
                            />
                          )}
                          <Text style={[styles.txDetailVal, { color: theme.ink }]}>
                            {matchedDestWallet.isHidden
                              ? "Hidden wallet"
                              : `${matchedDestWallet.name} · ${matchedDestWallet.type}`}
                          </Text>
                        </View>
                      </View>
                    ) : null}

                    <View style={styles.txDetailRow}>
                      <Text style={[styles.txDetailKey, { color: theme.muted }]}>
                        Category
                      </Text>
                      <Text style={[styles.txDetailVal, { color: theme.ink }]}>
                        {activity.kind}
                      </Text>
                    </View>
                  </View>

                  {txConfirmDelete ? (
                    <View
                      style={[
                        styles.stitchedDeleteBox,
                        {
                          overflow: "hidden",
                          backgroundColor: theme.card,
                          borderColor: hexToRgba("#9e3c42", 0.36),
                          marginTop: 0,
                        },
                      ]}
                    >
                      <LightLeatherSurface theme={theme} radius={18} />
                      <View style={styles.stitchedDeleteHead}>
                        <View style={styles.stitchedDeleteTitleRow}>
                          <Icon
                            name="trash"
                            size={15}
                            color={theme.dark ? "#f28b82" : "#9e3c42"}
                          />
                          <Text
                            style={[
                              styles.stitchedDeleteTitle,
                              { color: theme.ink },
                            ]}
                          >
                            Delete this transaction?
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.stitchedDeleteSub,
                            { color: theme.muted },
                          ]}
                        >
                          Wallet balance will be restored.
                        </Text>
                      </View>
                      <View style={styles.txActionPair}>
                        <Pressable
                          onPress={() => setTxConfirmDelete(false)}
                          style={({ pressed }) => [
                            styles.stitchedDeleteActionBtn,
                            {
                              overflow: "hidden",
                              backgroundColor: theme.page,
                              borderColor: hexToRgba(theme.leather.accent, 0.25),
                              transform: [{ scale: pressed ? 0.97 : 1 }],
                            },
                          ]}
                        >
                          <LightLeatherSurface theme={theme} radius={14} />
                          <Text
                            style={[
                              styles.stitchedDeleteCancelText,
                              { color: theme.ink },
                            ]}
                          >
                            Cancel
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={handleConfirmDeleteTx}
                          style={({ pressed }) => [
                            styles.stitchedDeleteActionBtn,
                            {
                              overflow: "hidden",
                              backgroundColor: "#c04444",
                              borderColor: "#a23434",
                              transform: [{ scale: pressed ? 0.97 : 1 }],
                            },
                          ]}
                        >
                          <View
                            pointerEvents="none"
                            style={styles.oxbloodInnerStitch}
                          />
                          <Icon name="trash" size={14} color="#ffffff" />
                          <Text style={styles.stitchedDeleteConfirmText}>
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
                          style={({ pressed }) => [
                            styles.txActionHalfBtn,
                            {
                              overflow: "hidden",
                              backgroundColor: theme.card,
                              borderColor: hexToRgba(theme.leather.accent, 0.28),
                              transform: [{ scale: pressed ? 0.97 : 1 }],
                            },
                            cardShadow(theme.dark),
                          ]}
                        >
                          <LightLeatherSurface theme={theme} radius={16} />
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
                          style={({ pressed }) => [
                            styles.txActionHalfBtn,
                            {
                              overflow: "hidden",
                              backgroundColor: theme.card,
                              borderColor: hexToRgba("#9e3c42", 0.34),
                              transform: [{ scale: pressed ? 0.97 : 1 }],
                            },
                            cardShadow(theme.dark),
                          ]}
                        >
                          <LightLeatherSurface theme={theme} radius={16} />
                          <Icon
                            name="trash"
                            size={15}
                            color={theme.dark ? "#f28b82" : "#9e3c42"}
                          />
                          <Text
                            style={[
                              styles.stitchedDeleteTriggerText,
                              { color: theme.dark ? "#f28b82" : "#9e3c42" },
                            ]}
                          >
                            Delete
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  )}

                  {matchedWallet && !matchedWallet.isHidden && onOpenWallet ? (
                    <Pressable
                      onPress={() => onOpenWallet(matchedWallet)}
                      style={({ pressed }) => [
                        styles.txWalletCtaBtn,
                        {
                          overflow: "hidden",
                          backgroundColor: theme.leather.colors[1],
                          borderColor: theme.leather.edge,
                          transform: [{ scale: pressed ? 0.98 : 1 }],
                        },
                        cardShadow(theme.dark),
                      ]}
                    >
                      <DarkLeatherSurface theme={theme} radius={16} />
                      <Icon name="wallet" size={16} color="#ffffff" />
                      <Text
                        style={[styles.secondaryButtonText, { color: "#ffffff" }]}
                      >
                        View {matchedWallet.name} wallet
                      </Text>
                    </Pressable>
                  ) : null}

                  {matchedWallet && !isTransfer && !isAdjustment && activity.amount !== 0 ? (
                    <>
                      <Pressable accessibilityRole="button"
                        onPress={() => {
                          const draft = favoriteFromActivity(activity, wallets);
                          if (draft) onFavoriteFromActivity(draft);
                        }}
                        style={({ pressed }) => [
                          styles.txWalletCtaBtn,
                          {
                            overflow: "hidden",
                            backgroundColor: theme.card,
                            borderColor: hexToRgba(theme.leather.accent, 0.28),
                            transform: [{ scale: pressed ? 0.98 : 1 }],
                          },
                        ]}>
                        <LightLeatherSurface theme={theme} radius={16} />
                        <Icon name="star" size={16} color={theme.leather.accent} />
                        <Text style={[styles.secondaryButtonText, { color: theme.ink }]}>Save as favorite</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => onScheduleFromActivity(activity)}
                        style={({ pressed }) => [
                          styles.txWalletCtaBtn,
                          {
                            overflow: "hidden",
                            backgroundColor: theme.card,
                            borderColor: hexToRgba(theme.leather.accent, 0.28),
                            transform: [{ scale: pressed ? 0.98 : 1 }],
                          },
                        ]}
                      >
                        <LightLeatherSurface theme={theme} radius={16} />
                        <Icon name="clock" size={16} color={theme.leather.accent} />
                        <Text style={[styles.secondaryButtonText, { color: theme.ink }]}>
                          Make recurring
                        </Text>
                      </Pressable>
                    </>
                  ) : null}
                  <Pressable
                    onPress={onClose}
                    style={({ pressed }) => [
                      styles.txWalletCtaBtn,
                      {
                        overflow: "hidden",
                        backgroundColor: theme.leather.colors[1],
                        borderColor: theme.leather.edge,
                        marginTop: 12,
                        transform: [{ scale: pressed ? 0.98 : 1 }],
                      },
                      cardShadow(theme.dark),
                    ]}
                  >
                    <DarkLeatherSurface theme={theme} radius={16} />
                    <Text style={[styles.secondaryButtonText, { color: "#ffffff" }]}>
                      Done
                    </Text>
                    <Icon name="check" size={16} color="#ffffff" />
                  </Pressable>
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
                      colors={theme.heroGradient}
                      style={styles.confirmPanel}
                    >
                      <Text style={[styles.confirmSub, { color: theme.heroMuted }]}>Signed in as</Text>
                      <Text
                        style={[
                          styles.confirmAmount,
                          { fontSize: 18, marginVertical: 4, color: theme.heroInk },
                        ]}
                      >
                        {userEmail}
                      </Text>
                      <Text style={[styles.confirmSub, { color: theme.heroMuted }]}>
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
                    styles.walletHeroPanel,
                    {
                      overflow: "hidden",
                      borderColor: theme.leather.edge,
                    },
                  ]}
                >
                  <DarkLeatherSurface theme={theme} radius={22} />
                  <View style={styles.walletHeroTopRow}>
                    <View style={styles.walletHeroTag}>
                      <Icon name="pie" size={14} color={theme.leather.thread} />
                      <Text style={styles.walletHeroTagText}>
                        Spending Target
                      </Text>
                    </View>
                    <View style={styles.walletHeroModeBadge}>
                      <Text
                        style={[
                          styles.walletHeroModeText,
                          { color: theme.leather.thread },
                        ]}
                      >
                        MONTHLY
                      </Text>
                    </View>
                  </View>

                  <View style={styles.walletHeroAmountWrap}>
                    <Text
                      style={[
                        styles.walletHeroLabel,
                        { color: theme.leather.thread },
                      ]}
                    >
                      Monthly spending target
                    </Text>
                    <HeroAmountDisplay
                      value={amount}
                      color="#ffffff"
                      muted={!amount}
                    />
                  </View>

                  <View style={styles.walletHeroBottomRow}>
                    <Text
                      style={[
                        styles.walletHeroSubText,
                        { color: theme.leather.thread },
                      ]}
                      numberOfLines={1}
                    >
                      {monthlyBudget && monthlyBudget > 0
                        ? `Current target: ${money(monthlyBudget)}`
                        : "Tracks your monthly spending pace"}
                    </Text>
                  </View>
                </View>

                <AmountKeypad
                  value={amount}
                  onChange={setAmount}
                  quickAmounts={[2000, 5000, 10000, 25000]}
                  compact
                  stitched
                  theme={theme}
                />

                {monthlyBudget && monthlyBudget > 0 ? (
                  <Pressable
                    onPress={() => {
                      onSaveMonthlyBudget?.(null);
                      onDone("Monthly budget cleared");
                    }}
                    style={({ pressed }) => [
                      styles.stitchedDeleteTriggerBtn,
                      {
                        overflow: "hidden",
                        backgroundColor: theme.card,
                        borderColor: hexToRgba("#9e3c42", 0.34),
                        transform: [{ scale: pressed ? 0.985 : 1 }],
                      },
                    ]}
                  >
                    <LightLeatherSurface theme={theme} radius={16} />
                    <Icon
                      name="trash"
                      size={15}
                      color={theme.dark ? "#f28b88" : "#9e3c42"}
                    />
                    <Text
                      style={[
                        styles.stitchedDeleteTriggerText,
                        { color: theme.dark ? "#f28b88" : "#9e3c42" },
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
                          walletLabel={getDisplayActivityWallet(item, wallets).label}
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

          {stepFooterConfig ? (
            <View style={styles.floatingFooterWrap}>
              <View style={styles.stepFooterRow}>
                {stepFooterConfig.onBack ? (
                  <View style={[{ borderRadius: 18 }, cardShadow(theme.dark)]}>
                    <Pressable
                      onPress={stepFooterConfig.onBack}
                      style={({ pressed }) => [
                        styles.stitchedBackBtn,
                        {
                          overflow: "hidden",
                          borderColor: hexToRgba(theme.leather.accent, 0.26),
                          transform: [{ scale: pressed ? 0.97 : 1 }],
                        },
                      ]}
                    >
                      <LightLeatherSurface theme={theme} radius={18} />
                      <Icon name="back" size={16} color={theme.ink} />
                      <Text style={[styles.stitchedBackBtnText, { color: theme.ink }]}>
                        Back
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
                <View
                  style={[
                    { flex: 1, borderRadius: 18 },
                    !stepFooterConfig.primaryDisabled && cardShadow(theme.dark),
                  ]}
                >
                  <Pressable
                    disabled={stepFooterConfig.primaryDisabled}
                    onPress={stepFooterConfig.onPrimary}
                    style={({ pressed }) => [
                      styles.stitchedPrimaryBtn,
                      {
                        overflow: "hidden",
                        borderColor: theme.leather.edge,
                        opacity: stepFooterConfig.primaryDisabled ? 0.45 : 1,
                        transform: [{ scale: pressed ? 0.985 : 1 }],
                      },
                    ]}
                  >
                    <DarkLeatherSurface theme={theme} radius={18} />
                    <Text style={styles.stitchedPrimaryBtnText}>
                      {stepFooterConfig.primaryLabel}
                    </Text>
                    <Icon
                      name={stepFooterConfig.primaryIcon}
                      size={17}
                      color="#ffffff"
                    />
                  </Pressable>
                </View>
              </View>
            </View>
          ) : null}
          </Animated.View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

function HeroAmountDisplay({
  value,
  color,
  muted = false,
  prefix = "₱",
}: {
  value: string;
  color: string;
  muted?: boolean;
  prefix?: string;
}) {
  return (
    <Text
      style={[
        styles.entryBigInput,
        {
          color,
          opacity: muted ? 0.82 : 1,
        },
      ]}
      numberOfLines={1}
      adjustsFontSizeToFit
    >
      <Text style={[styles.entryCurrencySign, { color }]}>
        {prefix}
        {"\u2009"}
      </Text>
      {value ? formatAmountInput(value) : "0.00"}
    </Text>
  );
}

function WalletCardPreviewBox({
  cardDesign,
  palette,
  borderColor,
  bottomScrim = false,
  children,
}: {
  cardDesign?: { source: ImageSourcePropType; ink: string; isDark: boolean };
  palette: { from: string; to: string };
  borderColor: string;
  bottomScrim?: boolean;
  children: React.ReactNode;
}) {
  const { width: windowWidth } = useWindowDimensions();
  const [size, setSize] = useState({
    width: Math.max(260, windowWidth - 47),
    height: 154,
  });

  return (
    <View
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (
          width > 0 &&
          height > 0 &&
          (Math.abs(width - size.width) > 1 ||
            Math.abs(height - size.height) > 1)
        ) {
          setSize({ width, height });
        }
      }}
      style={[
        styles.walletCardPreviewShell,
        {
          borderColor,
          backgroundColor: palette.to,
        },
      ]}
    >
      {cardDesign ? (
        size.width > 0 && size.height > 0 ? (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Svg width={size.width} height={size.height}>
              <SvgImage
                href={cardDesign.source}
                x={0}
                y={0}
                width={size.width}
                height={size.height}
                preserveAspectRatio="xMaxYMid slice"
              />
            </Svg>
          </View>
        ) : null
      ) : (
        <TexturedGradientSurface
          fromColor={palette.from}
          toColor={palette.to}
        />
      )}
      {bottomScrim && cardDesign ? (
        <LinearGradient
          pointerEvents="none"
          colors={
            cardDesign.isDark
              ? ["rgba(8, 12, 20, 0)", "rgba(8, 12, 20, 0.54)", "rgba(8, 12, 20, 0.8)"]
              : ["rgba(244, 248, 243, 0)", "rgba(232, 238, 230, 0.68)", "rgba(224, 232, 222, 0.88)"]
          }
          locations={[0.35, 0.68, 1]}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View style={styles.walletCardPreviewInner}>{children}</View>
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
      ? theme.incomeGradient
      : theme.accentGradient;

  const textColor = disabled
    ? theme.muted
    : incomeStyle
      ? theme.incomeInk
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
    fontFamily: "Poppins_700Bold",
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
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 13.5,
  },
  searchItemSub: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 11,
  },
  searchWalletBal: {
    fontFamily: "Poppins_800ExtraBold",
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
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 15,
    marginTop: 4,
  },
  searchEmptySub: {
    fontFamily: "Poppins_600SemiBold",
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
    backgroundColor: "rgba(0, 0, 0, 0.64)",
  },
  bottomSheet: {
    width: "100%",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 20,
  },
  sheetTextureClip: {
    ...StyleSheet.absoluteFill,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: "hidden",
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 8,
  },
  formTitle: {
    fontFamily: "Poppins_800ExtraBold",
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
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 10.5,
    marginBottom: 3,
  },
  fieldInput: {
    fontFamily: "Poppins_700Bold",
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
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 11,
  },
  presetSearchBox: {
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  presetSearchInput: {
    flex: 1,
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 13,
    lineHeight: 17,
    includeFontPadding: false,
    paddingVertical: 0,
  },
  stitchedGroupPill: {
    height: 34,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  stitchedGroupPillText: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 11.5,
    lineHeight: 15,
    includeFontPadding: false,
    marginTop: 1,
  },
  presetGrid: {
    gap: 8,
  },
  presetGridCard: {
    flex: 1,
    minHeight: 88,
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  presetGridIconSlot: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  presetName: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 11.5,
    lineHeight: 15,
    includeFontPadding: false,
    marginTop: 1,
  },
  presetSub: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 9.5,
    lineHeight: 13,
    includeFontPadding: false,
  },
  walletPreviewIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    paddingRight: 8,
  },
  walletPreviewName: {
    color: "#ffffff",
    fontFamily: "Poppins_800ExtraBold",
    fontWeight: "800",
    fontSize: 16,
    lineHeight: 20,
    includeFontPadding: false,
    marginTop: 1.5,
    flexShrink: 1,
  },
  walletPreviewColorChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  walletPreviewColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.45)",
  },
  walletPreviewColorText: {
    color: "#ffffff",
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 11.5,
    lineHeight: 15,
    includeFontPadding: false,
    marginTop: 1,
  },
  walletCategoryRow: {
    flexDirection: "row",
    gap: 7,
  },
  walletCategoryChip: {
    flex: 1,
    height: 40,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  walletCategoryChipText: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 11.5,
    lineHeight: 15,
    includeFontPadding: false,
    marginTop: 1,
  },
  updateModeBar: {
    height: 46,
    padding: 4,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    marginBottom: 4,
  },
  updateModeBtn: {
    flex: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  updateModeText: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 12,
    lineHeight: 16,
    includeFontPadding: false,
    marginTop: 1.5,
  },
  updateQuickActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  updateActionBtn: {
    flex: 1,
    height: 40,
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  updateActionBtnText: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 12.5,
    lineHeight: 16,
    includeFontPadding: false,
    marginTop: 1.5,
  },
  colorHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    marginHorizontal: 2,
  },
  stitchedPresetBgRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginTop: 6,
    marginBottom: 8,
  },
  presetBgToggleBtn: {
    height: 32,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  presetBgToggleText: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 11.5,
    includeFontPadding: false,
  },
  bgCustomizeTabsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
    marginBottom: 10,
  },
  bgCustomizeTabBtn: {
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  bgCustomizeTabText: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 11.5,
    includeFontPadding: false,
  },
  bgResetBtn: {
    marginLeft: "auto",
    height: 32,
    borderRadius: 11,
    borderWidth: 1,
    paddingHorizontal: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  bgResetText: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 11,
    includeFontPadding: false,
  },
  bgPresetThumbStrip: {
    gap: 9,
    paddingVertical: 4,
    paddingRight: 4,
    marginBottom: 6,
  },
  bgPresetThumbCard: {
    width: 96,
    height: 60,
    borderRadius: 14,
    overflow: "hidden",
  },
  bgPresetThumbInner: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  bgPresetThumbCheck: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  bgPresetThumbLabel: {
    color: "#ffffff",
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 10.5,
    includeFontPadding: false,
  },
  recommendedHint: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 10.5,
  },
  tonePicker: {
    gap: 6,
    marginVertical: 12,
  },
  tonePickerRow: {
    flexDirection: "row",
    gap: 6,
  },
  toneSwatchWrapper: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 17,
    borderWidth: 1.5,
    padding: 3.5,
  },
  toneSwatch: {
    flex: 1,
    borderRadius: 12.5,
    overflow: "hidden",
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
    fontFamily: "Poppins_800ExtraBold",
    fontWeight: "800",
    fontSize: 15,
  },
  secondaryButton: {
    height: 46,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  secondaryButtonText: {
    fontFamily: "Poppins_800ExtraBold",
    fontWeight: "800",
    fontSize: 13,
    lineHeight: 16,
    includeFontPadding: false,
    marginTop: 1,
  },
  closeRoundBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  entryProgressWrap: {
    marginBottom: 16,
    gap: 7,
  },
  entryProgressMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  entryProgressCount: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 11.5,
  },
  entryProgressCurrent: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 12,
  },
  entryProgressTrackRow: {
    flexDirection: "row",
    gap: 6,
  },
  entryProgressSegment: {
    flex: 1,
    height: 4.5,
    borderRadius: 3,
  },
  stitchedNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  stitchedNoticeText: {
    flex: 1,
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 12,
    lineHeight: 16,
    includeFontPadding: false,
    marginTop: 1,
  },
  entryToggle: {
    height: 54,
    padding: 5,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    marginBottom: 18,
  },
  entryToggleBtn: {
    flex: 1,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 6,
  },
  entryToggleText: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 12.5,
    lineHeight: 16,
    includeFontPadding: false,
    marginTop: 1.5,
    flexShrink: 1,
  },
  walletCardPreviewShell: {
    borderRadius: 22,
    borderWidth: 1.5,
    overflow: "hidden",
    marginBottom: 12,
  },
  walletCardPreviewInner: {
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  walletHeroPanel: {
    borderRadius: 22,
    borderWidth: 1.5,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 12,
  },
  walletHeroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  walletHeroTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: "68%",
  },
  walletHeroTagText: {
    color: "#ffffff",
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 12,
    lineHeight: 15,
    includeFontPadding: false,
    marginTop: 1,
  },
  walletHeroModeBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.10)",
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  walletHeroModeText: {
    fontFamily: "Poppins_800ExtraBold",
    fontWeight: "800",
    fontSize: 10,
    letterSpacing: 0.9,
  },
  walletHeroAmountWrap: {
    marginTop: 14,
    marginBottom: 10,
  },
  walletHeroLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  walletHeroLabel: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 11,
  },
  walletHeroMaxChip: {
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  walletHeroMaxText: {
    color: "#ffffff",
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 10.5,
  },
  walletHeroBottomRow: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.14)",
  },
  walletHeroSubText: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 11.5,
  },
  entryCurrencySign: {
    fontFamily: "Poppins_800ExtraBold",
    fontWeight: "800",
    fontSize: 23,
    opacity: 0.78,
  },
  entryBigInput: {
    fontFamily: "Poppins_800ExtraBold",
    fontWeight: "800",
    fontSize: 38,
    lineHeight: 44,
    letterSpacing: 0.2,
    includeFontPadding: false,
    marginTop: 4,
  },
  entrySection: {
    marginBottom: 16,
  },
  entrySectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  entrySectionTitle: {
    fontFamily: "Poppins_800ExtraBold",
    fontWeight: "800",
    fontSize: 16,
  },
  entrySectionSub: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 11,
  },
  walletVerticalList: {
    gap: 9,
    marginBottom: 14,
  },
  stitchedWalletRow: {
    minHeight: 62,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stitchedWalletAmount: {
    fontFamily: "Poppins_800ExtraBold",
    fontWeight: "800",
    fontSize: 13.5,
  },
  entryWalletName: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 13,
  },
  entryWalletBal: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 11,
    marginTop: 2,
  },
  floatingFooterWrap: {
    paddingTop: 10,
  },
  stepFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stitchedBackBtn: {
    height: 52,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  stitchedBackBtnText: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 13.5,
    lineHeight: 17,
    includeFontPadding: false,
    marginTop: 1.5,
  },
  stitchedPrimaryBtn: {
    height: 52,
    borderRadius: 18,
    borderWidth: 1.5,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  stitchedPrimaryBtnText: {
    color: "#ffffff",
    fontFamily: "Poppins_800ExtraBold",
    fontWeight: "800",
    fontSize: 14.5,
    lineHeight: 18,
    includeFontPadding: false,
    marginTop: 1.5,
  },
  confirmMetaList: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.14)",
    gap: 8,
  },
  confirmMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  confirmMetaKey: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 11.5,
  },
  confirmMetaVal: {
    color: "#ffffff",
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 12.5,
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
    fontFamily: "Poppins_800ExtraBold",
    fontWeight: "800",
    fontSize: 10.5,
    lineHeight: 14,
    includeFontPadding: false,
    marginTop: 1.5,
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
  entryNoteInput: {
    flex: 1,
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 13,
  },
  errorText: {
    color: "#c04444",
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 11.5,
    marginVertical: 4,
    marginLeft: 4,
  },
  walletSelectChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  walletSelectChipText: {
    fontFamily: "Poppins_800ExtraBold",
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
    fontFamily: "Poppins_800ExtraBold",
    fontWeight: "800",
    fontSize: 27,
  },
  amountEntryInput: {
    minWidth: 140,
    textAlign: "center",
    fontFamily: "Poppins_800ExtraBold",
    fontWeight: "800",
    fontSize: 38,
    letterSpacing: 0.3,
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
    fontFamily: "Poppins_800ExtraBold",
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
    fontFamily: "Poppins_800ExtraBold",
    fontWeight: "800",
    fontSize: 14,
  },
  transferSideBal: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 11,
  },
  transferSideAfter: {
    fontFamily: "Poppins_800ExtraBold",
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
    fontFamily: "Poppins_800ExtraBold",
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
    fontFamily: "Poppins_700Bold",
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
    fontFamily: "Poppins_800ExtraBold",
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
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 11,
  },
  confirmAmount: {
    color: "#ffffff",
    fontFamily: "Poppins_800ExtraBold",
    fontWeight: "800",
    fontSize: 24,
    marginVertical: 2,
  },
  txDetailHero: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    marginTop: 4,
    marginBottom: 14,
  },
  txDetailIconBox: {
    width: 50,
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  txDetailTitle: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 16.5,
    textAlign: "center",
    marginBottom: 4,
  },
  txDetailAmount: {
    fontFamily: "Poppins_800ExtraBold",
    fontWeight: "800",
    fontSize: 30,
    letterSpacing: 0.2,
    marginBottom: 10,
  },
  txTypePill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 99,
    borderWidth: 1,
  },
  txTypePillText: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 11.5,
  },
  txDetailCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  txDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 13.5,
  },
  txDetailKey: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 12.5,
  },
  txDetailVal: {
    fontFamily: "Poppins_700Bold",
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
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  txWalletCtaBtn: {
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  txConfirmDeleteBox: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
  },
  txConfirmDeleteTitle: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 12.5,
    textAlign: "center",
  },
  stitchedDeleteTriggerBtn: {
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  stitchedDeleteTriggerText: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 13.5,
    lineHeight: 17,
    includeFontPadding: false,
    marginTop: 1.5,
  },
  stitchedDeleteBox: {
    marginTop: 6,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
  },
  stitchedDeleteHead: {
    gap: 2,
    paddingHorizontal: 2,
  },
  stitchedDeleteTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  stitchedDeleteTitle: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 13,
    lineHeight: 17,
    includeFontPadding: false,
    marginTop: 1,
  },
  stitchedDeleteSub: {
    fontFamily: "Poppins_500Medium",
    fontWeight: "500",
    fontSize: 11.5,
    marginTop: 1,
  },
  stitchedDeleteActionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  stitchedDeleteCancelText: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 13,
    lineHeight: 17,
    includeFontPadding: false,
    marginTop: 1.5,
  },
  stitchedDeleteConfirmText: {
    color: "#ffffff",
    fontFamily: "Poppins_800ExtraBold",
    fontWeight: "800",
    fontSize: 13,
    lineHeight: 17,
    includeFontPadding: false,
    marginTop: 1.5,
  },
  oxbloodInnerStitch: {
    ...StyleSheet.absoluteFill,
    top: 3,
    right: 3,
    bottom: 3,
    left: 3,
    borderRadius: 11,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(255, 255, 255, 0.28)",
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
