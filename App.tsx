import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  AppState,
  Easing,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import * as LocalAuthentication from "expo-local-authentication";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
} from "@expo-google-fonts/poppins";
import Svg, {
  Defs,
  RadialGradient as SvgRadialGradient,
  Rect as SvgRect,
  Stop,
} from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import {
  ActivityItem,
  EXPENSE_CATEGORIES,
  getActivityDate,
  getWalletLocalId,
  INCOME_CATEGORIES,
  initialActivities,
  initialWallets,
  isTransferActivity,
  Sheet,
  Tab,
  UserProfile,
  Wallet,
} from "./src/types/wallet";
import { firstFutureMonthlyDate, getDueSchedules, localDateKey, occurrenceId } from "./src/types/schedule";
import type { DueSchedule, Schedule } from "./src/types/schedule";
import { categoryLimitKey, getMonthlySpending } from "./src/types/budget";
import type { CategoryLimits } from "./src/types/budget";
import { favoriteKey } from "./src/types/favorite";
import type { Favorite, FavoriteDraft } from "./src/types/favorite";
import { refreshReminders } from "./src/lib/scheduleReminders";
import {
  loadLocalState,
  loadSchedules,
  deleteSchedule,
  recordWalletActivity,
  saveSchedule,
  queueDeletedActivityIds,
  queueDeletedWalletIds,
  saveActivitiesToSQLite,
  saveSettingToSQLite,
  saveWalletsToSQLite,
  syncWithSupabase,
} from "./src/lib/sqlite";
import { supabase } from "./src/lib/supabase";
import {
  LeatherFinishId,
  resolveLeatherFinish,
  BottomNav,
  EdgeFade,
  getThemeColors,
} from "./src/components/SharedUI";
import {
  ActivityScreen,
  HomeScreen,
  SettingsScreen,
  WalletDetailScreen,
  WalletsScreen,
} from "./src/components/Screens";
import { SheetModal } from "./src/components/SheetModal";
import { AppLockModal, AppLockMode } from "./src/components/AppLockModal";
import { LaunchIntro } from "./src/components/LaunchIntro";
import { Icon } from "./src/components/Icon";

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });

  const [tab, setTab] = useState<Tab>("home");
  const [visitedTabs, setVisitedTabs] = useState<Record<Tab, boolean>>({
    home: true,
    wallets: false,
    activity: false,
    overview: false,
    settings: false,
  });
  const [transactionCategory, setTransactionCategory] = useState<{ category: string } | null>(null);
  const [wallets, setWallets] = useState<Wallet[]>(initialWallets);
  const [activityItems, setActivityItems] =
    useState<ActivityItem[]>(initialActivities);
  const [hidden, setHidden] = useState(false);
  const dark = false;
  const [leatherFinish, setLeatherFinish] = useState<LeatherFinishId>("navy");
  const [profile, setProfile] = useState<UserProfile>({
    fullName: "Justin Santos",
    initials: "JS",
  });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sheetWalletId, setSheetWalletId] = useState<number | null>(null);
  const [sheetActivity, setSheetActivity] = useState<ActivityItem | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [scheduleSeed, setScheduleSeed] = useState<Schedule | null>(null);
  const [scheduledEntry, setScheduledEntry] = useState<DueSchedule | null>(null);
  const [today, setToday] = useState(localDateKey);
  const [showActivityFilters, setShowActivityFilters] = useState(false);
  const [toast, setToast] = useState("");
  const [dbReady, setDbReady] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const handleFinishIntro = useCallback(() => setShowIntro(false), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [appLockPin, setAppLockPin] = useState<string | null>(null);
  const [biometricsSupported, setBiometricsSupported] = useState(false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [monthlyBudget, setMonthlyBudget] = useState<number | null>(null);
  const [categoryLimits, setCategoryLimits] = useState<CategoryLimits>({});
  const [budgetCategory, setBudgetCategory] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [favoriteSeed, setFavoriteSeed] = useState<FavoriteDraft | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [lockModalMode, setLockModalMode] = useState<AppLockMode | null>(null);
  const appLockPinRef = useRef<string | null>(null);
  appLockPinRef.current = appLockPin;
  const skipInitialPersistRef = useRef({
    wallets: false,
    activities: false,
    dark: false,
    hidden: false,
  });

  const selected = useMemo(
    () => wallets.find((w) => w.id === selectedId) || null,
    [wallets, selectedId]
  );

  const sheetWallet = useMemo(
    () => wallets.find((w) => w.id === sheetWalletId) || selected,
    [wallets, sheetWalletId, selected]
  );

  const total = useMemo(
    () => wallets.reduce((sum, w) => sum + w.balance, 0),
    [wallets]
  );

  const theme = useMemo(
    () => {
      const finish = resolveLeatherFinish(leatherFinish);
      return {
        ...getThemeColors(false, "indigo"),
        leather: finish,
        accent: finish.accent,
        accentText: finish.accent,
        accentInk: "#ffffff",
        accentSoft: finish.soft,
        accentGradient: [finish.colors[0], finish.colors[1]] as [string, string],
        heroGradient: [...finish.colors] as [string, string, string],
        heroGlow: finish.soft,
      };
    },
    [leatherFinish]
  );
  const dueSchedules = useMemo(() => getDueSchedules(schedules, activityItems, today), [schedules, activityItems, today]);
  const monthlySpending = useMemo(() => getMonthlySpending(activityItems, new Date(`${today}T12:00:00`)), [activityItems, today]);

  // Scroll-reactive bottom navbar & screen/toast animations
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const navVisibleRef = useRef(true);
  const [navVisible, setNavVisible] = useState(true);
  const [headerAtTop, setHeaderAtTop] = useState(true);
  const [heroHeights, setHeroHeights] = useState<Record<Tab, number>>({
    home: 290,
    wallets: 220,
    activity: 170,
    overview: 170,
    settings: 170,
  });
  const activeHeroHeight = heroHeights[tab];
  const heroClearY = Math.max(56, activeHeroHeight - 48);
  const heroFadeOutStart = Math.max(
    24,
    Math.min(heroClearY - 24, activeHeroHeight - 76)
  );
  const [stackDragging, setStackDragging] = useState(false);
  const stackDraggingRef = useRef(false);
  const navAnim = useRef(new Animated.Value(1)).current;
  const tabAnim = useRef(new Animated.Value(1)).current;
  const toastAnim = useRef(new Animated.Value(0)).current;
  const walletsRef = useRef(wallets);
  walletsRef.current = wallets;
  const activitiesRef = useRef(activityItems);
  activitiesRef.current = activityItems;
  const syncScheduledRef = useRef(false);

  const handleStackDragChange = useCallback((dragging: boolean) => {
    if (stackDraggingRef.current === dragging) return;
    stackDraggingRef.current = dragging;
    setStackDragging(dragging);
    const nativeScroll = (scrollRef.current as any)?.getNativeScrollRef?.();
    nativeScroll?.setNativeProps?.({ scrollEnabled: !dragging });
  }, []);

  const setNavbarVisible = useCallback(
    (show: boolean) => {
      if (navVisibleRef.current === show) return;
      navVisibleRef.current = show;
      setNavVisible(show);
      Animated.timing(navAnim, {
        toValue: show ? 1 : 0,
        duration: show ? 240 : 210,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    },
    [navAnim]
  );

  const handleTabChange = useCallback(
    (nextTab: Tab) => {
      setTab(nextTab);
      setVisitedTabs((prev) =>
        prev[nextTab] ? prev : { ...prev, [nextTab]: true }
      );
      lastScrollY.current = 0;
      setHeaderAtTop(true);
      scrollY.setValue(0);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      setNavbarVisible(true);
    },
    [setNavbarVisible, scrollY]
  );

  const showingTabs = fontsLoaded && dbReady && !isLocked && !selected;

  useEffect(() => {
    if (!showingTabs) {
      tabAnim.setValue(1);
      lastScrollY.current = 0;
      setHeaderAtTop(true);
      scrollY.setValue(0);
      setNavbarVisible(true);
      return;
    }
    tabAnim.setValue(0);
    const anim = Animated.timing(tabAnim, {
      toValue: 1,
      duration: 210,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [tab, showingTabs, tabAnim, scrollY, setNavbarVisible]);

  useEffect(() => {
    if (toast) {
      toastAnim.setValue(0);
      Animated.spring(toastAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 20,
        bounciness: 6,
      }).start();
    }
  }, [toast, toastAnim]);

  const updateHeroHeight = useCallback((forTab: Tab, height: number) => {
    setHeroHeights((prev) =>
      prev[forTab] === height ? prev : { ...prev, [forTab]: height }
    );
  }, []);
  const handleHomeHeroHeight = useCallback(
    (h: number) => updateHeroHeight("home", h),
    [updateHeroHeight]
  );
  const handleWalletsHeroHeight = useCallback(
    (h: number) => updateHeroHeight("wallets", h),
    [updateHeroHeight]
  );
  const handleActivityHeroHeight = useCallback(
    (h: number) => updateHeroHeight("activity", h),
    [updateHeroHeight]
  );
  const handleOverviewHeroHeight = useCallback(
    (h: number) => updateHeroHeight("overview", h),
    [updateHeroHeight]
  );
  const handleSettingsHeroHeight = useCallback(
    (h: number) => updateHeroHeight("settings", h),
    [updateHeroHeight]
  );

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      setHeaderAtTop(y < 30);
      if (y <= 12) {
        lastScrollY.current = y;
        setNavbarVisible(true);
        return;
      }
      const delta = y - lastScrollY.current;
      if (delta > 6 && y > 24) {
        setNavbarVisible(false);
        lastScrollY.current = y;
      } else if (delta < -6) {
        setNavbarVisible(true);
        lastScrollY.current = y;
      }
    },
    [setNavbarVisible]
  );

  // 1. Load offline-first state from SQLite on mount
  useEffect(() => {
    let mounted = true;
    loadLocalState()
      .then(async (state) => {
        const localSchedules = await loadSchedules().catch(() => []);
        if (!mounted) return;
        setSchedules(localSchedules);
        setWallets(state.wallets);
        setActivityItems(state.activities);
        setLeatherFinish(resolveLeatherFinish(state.leatherFinish).id);
        setHidden(state.hidden);
        setProfile(state.profile);
        setLastSyncedAt(state.lastSyncedAt);
        setAppLockPin(state.appLockPin);
        setBiometricsEnabled(state.biometricsEnabled);
        setMonthlyBudget(state.monthlyBudget);
        setCategoryLimits(state.categoryLimits);
        setFavorites(state.favorites);
        if (state.appLockPin) {
          setIsLocked(true);
        }
        skipInitialPersistRef.current = {
          wallets: true,
          activities: true,
          dark: true,
          hidden: true,
        };
        setDbReady(true);
      })
      .catch(() => {
        if (mounted) setDbReady(true);
      });

    (async () => {
      try {
        const hasHw = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        if (mounted) setBiometricsSupported(hasHw && enrolled);
      } catch {
        if (mounted) setBiometricsSupported(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!dbReady) return;
    const updateDay = () => setToday(localDateKey());
    const timer = setInterval(updateDay, 60_000);
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") updateDay();
    });
    return () => { clearInterval(timer); listener.remove(); };
  }, [dbReady]);

  useEffect(() => {
    if (!dbReady) return;
    const sync = () => refreshReminders(schedules, activityItems).catch(() => {
      if (schedules.some(({ reminder }) => reminder)) setToast("Could not update phone reminders");
    });
    void sync();
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") void sync();
    });
    return () => listener.remove();
  }, [dbReady, schedules, activityItems]);

  // 2. Listen to Supabase Auth session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
      setUserEmail(session?.user?.email ?? null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUserId(session?.user?.id ?? null);
        setUserEmail(session?.user?.email ?? null);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // 2b. Re-lock when app goes to background while App Lock PIN is active
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "background" && appLockPinRef.current) {
        setIsLocked(true);
      }
    });
    return () => {
      sub.remove();
    };
  }, []);

  // 3. Persist changes to SQLite
  useEffect(() => {
    if (!dbReady) return;
    if (skipInitialPersistRef.current.wallets) {
      skipInitialPersistRef.current.wallets = false;
      return;
    }
    saveWalletsToSQLite(wallets).catch(() => {});
  }, [wallets, dbReady]);

  useEffect(() => {
    if (!dbReady) return;
    if (skipInitialPersistRef.current.activities) {
      skipInitialPersistRef.current.activities = false;
      return;
    }
    saveActivitiesToSQLite(activityItems).catch(() => {});
  }, [activityItems, dbReady]);

  useEffect(() => {
    if (!dbReady) return;
    if (skipInitialPersistRef.current.dark) {
      skipInitialPersistRef.current.dark = false;
      return;
    }
    saveSettingToSQLite("dark_mode", dark ? "true" : "false").catch(() => {});
  }, [dark, dbReady]);

  useEffect(() => {
    if (!dbReady) return;
    if (skipInitialPersistRef.current.hidden) {
      skipInitialPersistRef.current.hidden = false;
      return;
    }
    saveSettingToSQLite("hide_balances", hidden ? "true" : "false").catch(
      () => {}
    );
  }, [hidden, dbReady]);

  useEffect(() => {
    if (dbReady) saveSettingToSQLite("leather_finish", leatherFinish).catch(() => {});
  }, [leatherFinish, dbReady]);

  // 4. Cloud Sync helper with Supabase PostgreSQL
  const handleSyncNow = useCallback(async () => {
    if (!userId) return;
    const res = await syncWithSupabase({
      userId,
      wallets,
      activities: activityItems,
      dark,
      hidden,
      profile,
    });
    if (res.ok) {
      if (res.wallets) setWallets(res.wallets);
      if (res.activities) setActivityItems(res.activities);
      if (res.syncedAt) setLastSyncedAt(res.syncedAt);
      setToast(res.message);
    } else {
      setToast(res.message);
    }
  }, [userId, wallets, activityItems, dark, hidden, profile]);

  // Trigger sync automatically when user signs in
  useEffect(() => {
    if (dbReady && userId) {
      syncWithSupabase({
        userId,
        wallets,
        activities: activityItems,
        dark,
        hidden,
        profile,
      }).then((res) => {
        if (res.ok) {
          if (res.wallets) setWallets(res.wallets);
          if (res.activities) setActivityItems(res.activities);
          if (res.syncedAt) setLastSyncedAt(res.syncedAt);
        }
      });
    }
  }, [userId, dbReady]);

  // 5. Auto-hide Toast after 2.4s
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2400);
    return () => clearTimeout(timer);
  }, [toast]);

  const openSheet = useCallback((next: Sheet, wallet?: Wallet) => {
    if (next && (next === "entry" || next === "update") && walletsRef.current.length === 0) {
      setToast("Add a wallet first");
      return;
    }
    if (next === "transfer" && walletsRef.current.length < 2) {
      setToast("Add at least 2 wallets to transfer");
      return;
    }
    setSheetActivity(null);
    setScheduleSeed(null);
    setScheduledEntry(null);
    setSheetWalletId(wallet ? wallet.id : null);
    setSheet(next);
  }, []);

  const openTransactionSheet = useCallback((item: ActivityItem) => {
    setScheduledEntry(null);
    setSheetActivity(item);
    setSheetWalletId(null);
    setSheet("tx");
  }, []);

  const handleSelectWallet = useCallback((w: Wallet) => {
    setSelectedId(w.id);
  }, []);

  const scheduleCloudSync = useCallback(() => {
    if (!userId || syncScheduledRef.current) return;
    syncScheduledRef.current = true;
    Promise.resolve().then(() => {
      syncScheduledRef.current = false;
      syncWithSupabase({
        userId,
        wallets: walletsRef.current,
        activities: activitiesRef.current,
        dark,
        hidden,
        profile,
      }).catch(() => {});
    });
  }, [userId, dark, hidden, profile]);

  const buildActivity = (item: Omit<ActivityItem, "id" | "date">): ActivityItem => {
    const nowIso = item.occurredAt || new Date().toISOString();
    const timeStr = new Intl.DateTimeFormat("en-PH", {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(nowIso));
    const date = `Today, ${timeStr}`;
    const maxId = activitiesRef.current.reduce(
      (max, a) => (a.id > max ? a.id : max),
      0
    );
    return {
      ...item,
      id: Math.max(Date.now(), maxId + 1),
      date,
      occurredAt: nowIso,
    };
  };

  const prependActivity = (item: ActivityItem) => {
    const nextActivities = [item, ...activitiesRef.current];
    activitiesRef.current = nextActivities;
    setActivityItems(nextActivities);
    scheduleCloudSync();
  };

  const recordActivity = (item: Omit<ActivityItem, "id" | "date">) => {
    prependActivity(buildActivity(item));
  };

  const handleScheduleFromActivity = (item: ActivityItem) => {
    const wallet = walletsRef.current.find((entry) => item.walletLocalId
      ? item.walletLocalId === getWalletLocalId(entry)
      : item.wallet === entry.name);
    const direction = item.amount > 0 ? "income" : "expense";
    const categories = direction === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    setScheduleSeed({
      id: `plan-${Date.now()}`, title: item.title, amount: Math.abs(item.amount), direction,
      category: categories.some(([label]) => label === item.kind) ? item.kind : "Other",
      walletLocalId: wallet ? getWalletLocalId(wallet) : "",
      firstDue: firstFutureMonthlyDate(localDateKey(getActivityDate(item)), localDateKey()),
      repeat: "monthly", reminder: false,
    });
    setSheet("schedule");
  };

  const handleOpenScheduledEntry = useCallback((item: DueSchedule) => {
    if (!walletsRef.current.length) { setToast("Add a wallet first"); return; }
    const wallet = walletsRef.current.find((entry) => getWalletLocalId(entry) === item.walletLocalId);
    if (!wallet) { setToast("Choose a wallet in Manage schedules first"); return; }
    setScheduledEntry(item);
    setSheetActivity(null);
    setSheetWalletId(wallet.id);
    setSheet("entry");
  }, []);

  const handleRecordWalletEntry = async (item: Omit<ActivityItem, "id" | "date">) => {
    const localId = scheduledEntry
      ? occurrenceId(scheduledEntry.id, scheduledEntry.dueDate)
      : item.localId;
    if (activitiesRef.current.some((entry) => entry.localId === localId)) throw new Error("Already recorded");
    const activity = buildActivity({ ...item, localId });
    const balance = await recordWalletActivity(activity);
    const nextWallets = walletsRef.current.map((wallet) => getWalletLocalId(wallet) === activity.walletLocalId
      ? { ...wallet, balance, updatedAt: activity.updatedAt, synced: false }
      : wallet);
    walletsRef.current = nextWallets;
    setWallets(nextWallets);
    prependActivity(activity);
  };

  const handleSaveSchedule = async (next: Schedule) => {
    await saveSchedule(next);
    setSchedules((current) => [...current.filter((item) => item.id !== next.id), next]);
  };

  const handleDeleteSchedule = async (id: string) => {
    await deleteSchedule(id);
    setSchedules((current) => current.filter((item) => item.id !== id));
  };

  const handleRenameWalletActivities = (targetWallet: Wallet, newName: string) => {
    const targetId = getWalletLocalId(targetWallet);
    const oldName = targetWallet.name;
    const nowIso = new Date().toISOString();
    const nextActivities = activitiesRef.current.map((a) => {
      const matchesSource = a.walletLocalId
        ? a.walletLocalId === targetId
        : a.wallet === oldName;
      const matchesDest =
        isTransferActivity(a) &&
        (a.destWalletLocalId
          ? a.destWalletLocalId === targetId
          : a.title.endsWith(` to ${oldName}`));

      if (!matchesSource && !matchesDest) return a;

      let nextTitle = a.title;
      if (isTransferActivity(a)) {
        if (matchesSource && a.title.startsWith(`${oldName} to `)) {
          nextTitle = `${newName} to ${a.title.slice(oldName.length + 4)}`;
        } else if (matchesDest && a.title.endsWith(` to ${oldName}`)) {
          nextTitle = `${a.title.slice(0, a.title.length - (oldName.length + 4))} to ${newName}`;
        }
      }

      return {
        ...a,
        walletLocalId: matchesSource ? targetId : a.walletLocalId,
        destWalletLocalId: matchesDest ? targetId : a.destWalletLocalId,
        wallet: matchesSource ? newName : a.wallet,
        title: nextTitle,
        updatedAt: nowIso,
        synced: false,
      };
    });
    activitiesRef.current = nextActivities;
    setActivityItems(nextActivities);
    scheduleCloudSync();
  };

  const handleUpdateActivity = (
    updatedItem: ActivityItem,
    nextWallets: Wallet[]
  ) => {
    walletsRef.current = nextWallets;
    setWallets(nextWallets);
    const nextActivities = activitiesRef.current.map((a) =>
      a.id === updatedItem.id ? updatedItem : a
    );
    activitiesRef.current = nextActivities;
    setActivityItems(nextActivities);
    scheduleCloudSync();
  };

  const handleDeleteActivity = (
    deletedItem: ActivityItem,
    nextWallets: Wallet[]
  ) => {
    walletsRef.current = nextWallets;
    setWallets(nextWallets);
    const nextActivities = activitiesRef.current.filter(
      (a) => a.id !== deletedItem.id
    );
    activitiesRef.current = nextActivities;
    setActivityItems(nextActivities);
    const localId = deletedItem.localId || `tx-${deletedItem.id}`;
    queueDeletedActivityIds([localId]).catch(() => {});
    scheduleCloudSync();
  };

  const handleDeleteWallet = (targetWallet: Wallet) => {
    const nextWallets = walletsRef.current.filter(
      (w) => w.id !== targetWallet.id
    );
    walletsRef.current = nextWallets;
    setWallets(nextWallets);
    if (selectedId === targetWallet.id) {
      setSelectedId(null);
    }
    queueDeletedWalletIds([getWalletLocalId(targetWallet)]).catch(() => {});
    scheduleCloudSync();
  };

  const handleReorderWallets = useCallback((nextWallets: Wallet[]) => {
    const nowIso = new Date().toISOString();
    const stamped = nextWallets.map((w) => ({
      ...w,
      updatedAt: nowIso,
      synced: false,
    }));
    walletsRef.current = stamped;
    setWallets(stamped);
    scheduleCloudSync();
  }, [scheduleCloudSync]);

  const handleToggleHidden = useCallback(
    () => setHidden((prev) => !prev),
    []
  );
  const handleAddWalletSheet = useCallback(() => openSheet("add"), [openSheet]);
  const handleAddEntrySheet = useCallback(() => openSheet("entry"), [openSheet]);
  const handleOpenBudgetSheet = useCallback(() => openSheet("budget"), [openSheet]);
  const handleOpenCategoryBudget = useCallback((category: string | null) => {
    setBudgetCategory(category);
    openSheet("category-budget");
  }, [openSheet]);

  const handleSaveCategoryLimit = async (category: string, limit: number | null) => {
    await saveSettingToSQLite(categoryLimitKey(category), limit === null ? "" : String(limit));
    setCategoryLimits((current) => {
      const next = { ...current };
      if (limit === null) delete next[category];
      else next[category] = limit;
      return next;
    });
    setToast(limit === null ? `${category} limit removed` : `${category} limit saved`);
  };

  const handleFavoriteFromActivity = (draft: FavoriteDraft) => {
    setFavoriteSeed(draft);
    setSheet("favorite");
  };

  const handleSaveFavorite = async (favorite: Favorite) => {
    await saveSettingToSQLite(favoriteKey(favorite.id), JSON.stringify(favorite));
    setFavorites((current) => current.some(({ id }) => id === favorite.id)
      ? current.map((item) => item.id === favorite.id ? favorite : item)
      : [favorite, ...current]);
    setToast("Favorite saved");
  };

  const handleRemoveFavorite = async (id: string) => {
    await saveSettingToSQLite(favoriteKey(id), "");
    setFavorites((current) => current.filter((item) => item.id !== id));
    setToast("Favorite removed");
  };
  const handleOpenAuthSheet = useCallback(() => openSheet("auth"), [openSheet]);
  const handleToggleActivityFilter = useCallback(
    () => setShowActivityFilters((prev) => !prev),
    []
  );
  const handleToggleAppLock = useCallback(
    () => setLockModalMode(appLockPinRef.current ? "disable" : "setup"),
    []
  );
  const handleChangeAppLockPin = useCallback(
    () => setLockModalMode("change"),
    []
  );
  const handleCloseSheet = useCallback(() => {
    setSheet(null);
    setScheduledEntry(null);
    setSheetWalletId(null);
    setSheetActivity(null);
  }, []);
  const handleSwitchSheet = useCallback(
    (nextType: Exclude<Sheet, null>, nextWallet?: Wallet) => {
      if ((nextType === "entry" || nextType === "update") && walletsRef.current.length === 0) {
        setToast("Add a wallet first");
        return;
      }
      if (nextType === "transfer" && walletsRef.current.length < 2) {
        setToast("Add at least 2 wallets to transfer");
        return;
      }
      setSheetActivity(null);
      setScheduledEntry(null);
      if (nextWallet) setSheetWalletId(nextWallet.id);
      setSheet(nextType);
    },
    []
  );
  const handleSheetDone = useCallback((message: string) => {
    setSheet(null);
    setScheduledEntry(null);
    setSheetWalletId(null);
    setSheetActivity(null);
    setToast(message);
  }, []);
  const handleOpenWalletFromSheet = useCallback((w: Wallet) => {
    setSheet(null);
    setSheetWalletId(null);
    setSheetActivity(null);
    setSelectedId(w.id);
  }, []);

  const handleToggleBiometrics = async () => {
    if (!appLockPin) return;
    if (biometricsEnabled) {
      setBiometricsEnabled(false);
      saveSettingToSQLite("app_lock_biometrics", "false").catch(() => {});
      setToast("Biometric unlock disabled");
      return;
    }
    try {
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: "Enable biometric unlock",
        promptSubtitle: "Verify Fingerprint or Face ID",
        cancelLabel: "Cancel",
        disableDeviceFallback: true,
      });
      if (res.success) {
        setBiometricsEnabled(true);
        saveSettingToSQLite("app_lock_biometrics", "true").catch(() => {});
        setToast("Biometric unlock enabled");
      } else {
        setToast("Biometric verification cancelled");
      }
    } catch {
      setToast("Biometrics unavailable on this device");
    }
  };

  const handleUpdateProfile = (nextProfile: UserProfile) => {
    setProfile(nextProfile);
    saveSettingToSQLite("full_name", nextProfile.fullName).catch(() => {});
    saveSettingToSQLite("initials", nextProfile.initials).catch(() => {});
  };

  if (!fontsLoaded || !dbReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.page }]}
        edges={["left", "right", "bottom"]}
      >
        {/* Warm surfaces continue beneath the copper header. */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {!dark && (
            <Svg width="100%" height="100%">
              <Defs>
                <SvgRadialGradient
                  id="bgRadial"
                  cx="50%"
                  cy="0%"
                  rx="85%"
                  ry="48%"
                >
                  <Stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                  <Stop offset="50%" stopColor={theme.surface} stopOpacity="1" />
                  <Stop offset="100%" stopColor={theme.page} stopOpacity="1" />
                </SvgRadialGradient>
              </Defs>
              <SvgRect x="0" y="0" width="100%" height="100%" fill="url(#bgRadial)" />
            </Svg>
          )}
        </View>

        <StatusBar style={dark || (!isLocked && !selected && headerAtTop) ? "light" : "dark"} />

        {isLocked ? (
          <AppLockModal
            visible
            inline
            mode="unlock"
            expectedPin={appLockPin}
            biometricsEnabled={
              !showIntro && biometricsSupported && biometricsEnabled
            }
            onUnlock={() => setIsLocked(false)}
            theme={theme}
          />
        ) : (
          <>
            {selected ? (
          <WalletDetailScreen
            wallet={selected}
            activities={activityItems}
            hidden={hidden}
            onBack={() => setSelectedId(null)}
            onUpdate={() => openSheet("update", selected)}
            onTransfer={() => openSheet("transfer", selected)}
            onEdit={() => openSheet("edit", selected)}
            onTransaction={openTransactionSheet}
            theme={theme}
          />
        ) : (
          <View style={{ flex: 1 }}>
            <View style={{ flex: 1 }}>
              <Animated.ScrollView
                ref={scrollRef}
                style={{ flex: 1 }}
                scrollEnabled={!stackDragging}
                bounces={false}
                overScrollMode="never"
                showsVerticalScrollIndicator={false}
                onScroll={Animated.event(
                  [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                  { useNativeDriver: true, listener: handleScroll }
                )}
                scrollEventThrottle={16}
              >
              <Animated.View
                style={{
                  opacity: tabAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.35, 1],
                  }),
                  transform: [
                    {
                      translateY: tabAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [10, 0],
                      }),
                    },
                  ],
                }}
              >
                {visitedTabs.home ? (
                  <View style={{ display: tab === "home" ? "flex" : "none" }}>
                    <HomeScreen
                      wallets={wallets}
                      activities={activityItems}
                      total={total}
                      hidden={hidden}
                      setHidden={setHidden}
                      onWallet={handleSelectWallet}
                      onTransaction={openTransactionSheet}
                      onSheet={openSheet}
                      schedules={dueSchedules}
                      onRecordScheduled={handleOpenScheduledEntry}
                      setTab={handleTabChange}
                      onSettings={() => handleTabChange("settings")}
                      onStackDragChange={handleStackDragChange}
                      walletOpen={headerAtTop}
                      onHeroHeight={handleHomeHeroHeight}
                      theme={theme}
                    />
                  </View>
                ) : null}

                {visitedTabs.wallets ? (
                  <View style={{ display: tab === "wallets" ? "flex" : "none" }}>
                    <WalletsScreen
                      wallets={wallets}
                      activities={activityItems}
                      total={total}
                      hidden={hidden}
                      onToggleHidden={handleToggleHidden}
                      onWallet={handleSelectWallet}
                      onReorderWallets={handleReorderWallets}
                      onAddWallet={handleAddWalletSheet}
                      onDragChange={handleStackDragChange}
                      onHeroHeight={handleWalletsHeroHeight}
                      theme={theme}
                    />
                  </View>
                ) : null}

                {visitedTabs.activity ? (
                  <View style={{ display: tab === "activity" ? "flex" : "none" }}>
                    <ActivityScreen
                      mode="transactions"
                      activities={activityItems}
                      wallets={wallets}
                      hidden={hidden}
                      onToggleHidden={handleToggleHidden}
                      monthlyBudget={monthlyBudget}
                      monthlySpending={monthlySpending}
                      categoryLimits={categoryLimits}
                      onOpenCategoryBudget={handleOpenCategoryBudget}
                      onEditBudget={handleOpenBudgetSheet}
                      onTransaction={openTransactionSheet}
                      onShowToast={setToast}
                      showFilters={showActivityFilters}
                      onToggleFilters={handleToggleActivityFilter}
                      isActive={tab === "activity"}
                      categoryFilter={transactionCategory}
                      onClearCategory={() => setTransactionCategory(null)}
                      onHeroHeight={handleActivityHeroHeight}
                      theme={theme}
                    />
                  </View>
                ) : null}

                {visitedTabs.overview ? (
                  <View style={{ display: tab === "overview" ? "flex" : "none" }}>
                    <ActivityScreen
                      mode="overview"
                      activities={activityItems}
                      wallets={wallets}
                      hidden={hidden}
                      onToggleHidden={handleToggleHidden}
                      monthlyBudget={monthlyBudget}
                      monthlySpending={monthlySpending}
                      categoryLimits={categoryLimits}
                      onOpenCategoryBudget={handleOpenCategoryBudget}
                      onEditBudget={handleOpenBudgetSheet}
                      onCategorySelect={(category) => {
                        setTransactionCategory({ category });
                        handleTabChange("activity");
                      }}
                      isActive={tab === "overview"}
                      onHeroHeight={handleOverviewHeroHeight}
                      theme={theme}
                    />
                  </View>
                ) : null}

                {visitedTabs.settings ? (
                  <View style={{ display: tab === "settings" ? "flex" : "none" }}>
                    <SettingsScreen
                      leatherFinish={leatherFinish}
                      setLeatherFinish={setLeatherFinish}
                      hidden={hidden}
                      setHidden={setHidden}
                      showToast={setToast}
                      profile={profile}
                      userEmail={userEmail}
                      lastSyncedAt={lastSyncedAt}
                      appLockEnabled={Boolean(appLockPin)}
                      biometricsSupported={biometricsSupported}
                      biometricsEnabled={biometricsEnabled}
                      onToggleAppLock={handleToggleAppLock}
                      onChangeAppLockPin={handleChangeAppLockPin}
                      onToggleBiometrics={handleToggleBiometrics}
                      onOpenAuth={handleOpenAuthSheet}
                      onSyncNow={handleSyncNow}
                      onHeroHeight={handleSettingsHeroHeight}
                      theme={theme}
                    />
                  </View>
                ) : null}
              </Animated.View>
            </Animated.ScrollView>

            {/* Adaptive Top Edge Fade: blends into hero accent while over hero, then page background once scrolled past */}
            <EdgeFade
              position="top"
              color={theme.heroGradient[0]}
              size={76}
              opacity={scrollY.interpolate({
                inputRange: [0, 18, heroFadeOutStart, heroClearY],
                outputRange: [0, 1, 1, 0],
                extrapolate: "clamp",
              })}
            />

            <EdgeFade
              position="top"
              color={theme.page}
              size={76}
              opacity={scrollY.interpolate({
                inputRange: [heroFadeOutStart, heroClearY],
                outputRange: [0, 1],
                extrapolate: "clamp",
              })}
            />

            <EdgeFade
              position="bottom"
              color={theme.page}
              size={108}
            />

            <BottomNav
              tab={tab}
              setTab={handleTabChange}
              onAdd={handleAddEntrySheet}
              navAnim={navAnim}
              visible={navVisible}
              theme={theme}
            />
            </View>
          </View>
        )}

        {toast ? (
          <Animated.View
            style={[
              styles.toast,
              {
                backgroundColor: theme.navy,
                borderColor: theme.line,
                opacity: toastAnim,
                transform: [
                  {
                    translateY: toastAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [14, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={theme.accentGradient}
              style={styles.toastBadge}
            >
              <Icon name="check" size={14} color={theme.accentInk} />
            </LinearGradient>
            <Text style={styles.toastText}>{toast}</Text>
          </Animated.View>
        ) : null}

            <AppLockModal
              visible={lockModalMode !== null}
              mode={lockModalMode ?? "setup"}
              expectedPin={appLockPin}
              biometricsEnabled={biometricsSupported && biometricsEnabled}
              onSavePin={(pin) => {
                setAppLockPin(pin);
                saveSettingToSQLite("app_lock_pin", pin).catch(() => {});
                const wasChange = lockModalMode === "change";
                setLockModalMode(null);
                setToast(wasChange ? "App Lock PIN updated" : "App Lock enabled");
              }}
              onDisable={() => {
                setAppLockPin(null);
                setBiometricsEnabled(false);
                setIsLocked(false);
                saveSettingToSQLite("app_lock_pin", "").catch(() => {});
                saveSettingToSQLite("app_lock_biometrics", "false").catch(() => {});
                setLockModalMode(null);
                setToast("App Lock disabled");
              }}
              onCancel={() => setLockModalMode(null)}
              theme={theme}
            />
          </>
        )}
      </SafeAreaView>

      {!isLocked && sheet && (
        <SheetModal
          key={scheduledEntry ? occurrenceId(scheduledEntry.id, scheduledEntry.dueDate)
            : sheet === "schedule" || sheet === "category-budget" || sheet === "favorite" ? sheet : "sheet"}
          type={sheet}
          wallets={wallets}
          activities={activityItems}
          selected={sheetWallet}
          activity={sheetActivity}
          schedules={dueSchedules}
          scheduleSeed={scheduleSeed}
          scheduledEntry={scheduledEntry}
          onScheduleFromActivity={handleScheduleFromActivity}
          onSaveSchedule={handleSaveSchedule}
          onDeleteSchedule={handleDeleteSchedule}
          onOpenScheduledEntry={handleOpenScheduledEntry}
          onRecordWalletEntry={handleRecordWalletEntry}
          favorites={favorites}
          favoriteSeed={favoriteSeed}
          onFavoriteFromActivity={handleFavoriteFromActivity}
          onSaveFavorite={handleSaveFavorite}
          onRemoveFavorite={handleRemoveFavorite}
          hidden={hidden}
          onSaveWallets={(nextWallets) => {
            walletsRef.current = nextWallets;
            setWallets(nextWallets);
            scheduleCloudSync();
          }}
          onDeleteWallet={handleDeleteWallet}
          onRecordActivity={(item) => {
            recordActivity(item);
          }}
          onUpdateActivity={handleUpdateActivity}
          onDeleteActivity={handleDeleteActivity}
          onRenameWalletActivities={handleRenameWalletActivities}
          onOpenWallet={handleOpenWalletFromSheet}
          onOpenTransaction={openTransactionSheet}
          onNavigateTab={handleTabChange}
          onClose={handleCloseSheet}
          onSwitchSheet={handleSwitchSheet}
          onDone={handleSheetDone}
          profile={profile}
          onUpdateProfile={handleUpdateProfile}
          monthlyBudget={monthlyBudget}
          monthlySpending={monthlySpending}
          categoryLimits={categoryLimits}
          budgetCategory={budgetCategory}
          onSaveCategoryLimit={handleSaveCategoryLimit}
          onSaveMonthlyBudget={(next) => {
            setMonthlyBudget(next);
            saveSettingToSQLite(
              "monthly_budget",
              next && next > 0 ? String(next) : ""
            ).catch(() => {});
          }}
          userEmail={userEmail}
          onSyncNow={handleSyncNow}
          theme={theme}
        />
      )}
      {showIntro && (
        <LaunchIntro
          theme={theme}
          onFinish={handleFinishIntro}
        />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toast: {
    position: "absolute",
    zIndex: 90,
    alignSelf: "center",
    bottom: 92,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 14,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  toastBadge: {
    width: 25,
    height: 25,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  toastText: {
    color: "#ffffff",
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 12,
  },
});
