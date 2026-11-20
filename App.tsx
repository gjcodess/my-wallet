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
  useColorScheme,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import * as LocalAuthentication from "expo-local-authentication";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import {
  useFonts,
  Urbanist_400Regular,
  Urbanist_500Medium,
  Urbanist_600SemiBold,
  Urbanist_700Bold,
  Urbanist_800ExtraBold,
} from "@expo-google-fonts/urbanist";
import Svg, {
  Defs,
  RadialGradient as SvgRadialGradient,
  Rect as SvgRect,
  Stop,
} from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import {
  ActivityItem,
  getWalletLocalId,
  initialActivities,
  initialWallets,
  isTransferActivity,
  Sheet,
  Tab,
  UserProfile,
  Wallet,
} from "./src/types/wallet";
import {
  loadLocalState,
  queueDeletedActivityIds,
  queueDeletedWalletIds,
  saveActivitiesToSQLite,
  saveSettingToSQLite,
  saveWalletsToSQLite,
  syncWithSupabase,
} from "./src/lib/sqlite";
import { supabase } from "./src/lib/supabase";
import {
  AccentPaletteId,
  BottomNav,
  EdgeFade,
  getThemeColors,
} from "./src/components/SharedUI";
import {
  ActivityScreen,
  HomeScreen,
  SettingsScreen,
  TabHeader,
  WalletDetailScreen,
  WalletsScreen,
} from "./src/components/Screens";
import { SheetModal } from "./src/components/SheetModal";
import { AppLockModal, AppLockMode } from "./src/components/AppLockModal";
import { Icon } from "./src/components/Icon";

export default function App() {
  const systemColorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    Urbanist_400Regular,
    Urbanist_500Medium,
    Urbanist_600SemiBold,
    Urbanist_700Bold,
    Urbanist_800ExtraBold,
  });

  const [tab, setTab] = useState<Tab>("home");
  const [visitedTabs, setVisitedTabs] = useState<Record<Tab, boolean>>({
    home: true,
    wallets: false,
    activity: false,
    settings: false,
  });
  const [wallets, setWallets] = useState<Wallet[]>(initialWallets);
  const [activityItems, setActivityItems] =
    useState<ActivityItem[]>(initialActivities);
  const [hidden, setHidden] = useState(false);
  const [dark, setDark] = useState(false);
  const [accentColor, setAccentColor] = useState<AccentPaletteId>("blue");
  const [profile, setProfile] = useState<UserProfile>({
    fullName: "Justin Santos",
    initials: "JS",
  });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sheetWalletId, setSheetWalletId] = useState<number | null>(null);
  const [sheetActivity, setSheetActivity] = useState<ActivityItem | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [showActivityFilters, setShowActivityFilters] = useState(false);
  const [toast, setToast] = useState("");
  const [dbReady, setDbReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [appLockPin, setAppLockPin] = useState<string | null>(null);
  const [biometricsSupported, setBiometricsSupported] = useState(false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [monthlyBudget, setMonthlyBudget] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [lockModalMode, setLockModalMode] = useState<AppLockMode | null>(null);
  const appLockPinRef = useRef<string | null>(null);
  appLockPinRef.current = appLockPin;
  const skipInitialPersistRef = useRef({
    wallets: false,
    activities: false,
    dark: false,
    hidden: false,
    accent: false,
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
    () => getThemeColors(dark, accentColor),
    [dark, accentColor]
  );

  // Scroll-reactive bottom navbar & screen/toast animations
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const navVisibleRef = useRef(true);
  const [navVisible, setNavVisible] = useState(true);
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

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
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
      .then((state) => {
        if (!mounted) return;
        setWallets(state.wallets);
        setActivityItems(state.activities);
        setDark(state.dark);
        setHidden(state.hidden);
        setAccentColor(state.accentColor);
        setProfile(state.profile);
        setLastSyncedAt(state.lastSyncedAt);
        setAppLockPin(state.appLockPin);
        setBiometricsEnabled(state.biometricsEnabled);
        setMonthlyBudget(state.monthlyBudget);
        if (state.appLockPin) {
          setIsLocked(true);
        }
        skipInitialPersistRef.current = {
          wallets: true,
          activities: true,
          dark: true,
          hidden: true,
          accent: true,
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
    if (!dbReady) return;
    if (skipInitialPersistRef.current.accent) {
      skipInitialPersistRef.current.accent = false;
      return;
    }
    saveSettingToSQLite("accent_color", accentColor).catch(() => {});
  }, [accentColor, dbReady]);

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
    setSheetWalletId(wallet ? wallet.id : null);
    setSheet(next);
  }, []);

  const openTransactionSheet = useCallback((item: ActivityItem) => {
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

  const recordActivity = (item: Omit<ActivityItem, "id" | "date">) => {
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
    const newItem: ActivityItem = {
      ...item,
      id: Math.max(Date.now(), maxId + 1),
      date,
      occurredAt: nowIso,
    };
    const nextActivities = [newItem, ...activitiesRef.current];
    activitiesRef.current = nextActivities;
    setActivityItems(nextActivities);
    scheduleCloudSync();
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
    setSheetWalletId(null);
    setSheetActivity(null);
  }, []);
  const handleSwitchSheet = useCallback(
    (nextType: Exclude<Sheet, null>, nextWallet?: Wallet) => {
      setSheetActivity(null);
      if (nextWallet) setSheetWalletId(nextWallet.id);
      setSheet(nextType);
    },
    []
  );
  const handleSheetDone = useCallback((message: string) => {
    setSheet(null);
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
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: systemColorScheme === "dark" ? "#090d12" : "#e8eff8",
        }}
      />
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.page }]}
        edges={["left", "right", "bottom"]}
      >
        {/* Top Background Gradient (clean vertical wash in dark mode, soft radial in light mode) */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {dark ? (
            <LinearGradient
              colors={["#121923", "#0c1118", "#090d12"]}
              locations={[0, 0.5, 1]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          ) : (
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
                  <Stop offset="50%" stopColor="#eef3fa" stopOpacity="1" />
                  <Stop offset="100%" stopColor="#dbe6f5" stopOpacity="1" />
                </SvgRadialGradient>
              </Defs>
              <SvgRect x="0" y="0" width="100%" height="100%" fill="url(#bgRadial)" />
            </Svg>
          )}
        </View>

        <StatusBar
          style={
            dark || (tab === "wallets" && !isLocked && !selected)
              ? "light"
              : "dark"
          }
        />

        {isLocked ? (
          <AppLockModal
            visible
            inline
            mode="unlock"
            expectedPin={appLockPin}
            biometricsEnabled={biometricsSupported && biometricsEnabled}
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
            <TabHeader
              tab={tab}
              onAddWallet={handleAddWalletSheet}
              onActivityFilter={handleToggleActivityFilter}
              activityFilterActive={showActivityFilters}
              theme={theme}
            />
            <View style={{ flex: 1 }}>
              <Animated.ScrollView
                ref={scrollRef}
                style={{ flex: 1 }}
                scrollEnabled={!stackDragging}
                bounces={tab !== "wallets"}
                overScrollMode={tab === "wallets" ? "never" : "auto"}
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
                      setTab={handleTabChange}
                      onStackDragChange={handleStackDragChange}
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
                      theme={theme}
                    />
                  </View>
                ) : null}

                {visitedTabs.activity ? (
                  <View style={{ display: tab === "activity" ? "flex" : "none" }}>
                    <ActivityScreen
                      activities={activityItems}
                      wallets={wallets}
                      hidden={hidden}
                      monthlyBudget={monthlyBudget}
                      onEditBudget={handleOpenBudgetSheet}
                      onTransaction={openTransactionSheet}
                      onShowToast={setToast}
                      showFilters={showActivityFilters}
                      isActive={tab === "activity"}
                      theme={theme}
                    />
                  </View>
                ) : null}

                {visitedTabs.settings ? (
                  <View style={{ display: tab === "settings" ? "flex" : "none" }}>
                    <SettingsScreen
                      dark={dark}
                      setDark={setDark}
                      accentColor={accentColor}
                      setAccentColor={setAccentColor}
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
                      theme={theme}
                    />
                  </View>
                ) : null}
              </Animated.View>
            </Animated.ScrollView>

            {tab !== "wallets" ? (
              <EdgeFade
                position="top"
                color={dark ? "#121923" : "#f6f9fd"}
                size={26}
                opacity={scrollY.interpolate({
                  inputRange: [0, 16],
                  outputRange: [0, 1],
                  extrapolate: "clamp",
                })}
              />
            ) : null}
            <EdgeFade
              position="bottom"
              color={dark ? "#090d12" : "#dce6f5"}
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
                backgroundColor: dark ? "#1b2633" : "#172442",
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
          type={sheet}
          wallets={wallets}
          selected={sheetWallet}
          activity={sheetActivity}
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
          onClose={handleCloseSheet}
          onSwitchSheet={handleSwitchSheet}
          onDone={handleSheetDone}
          profile={profile}
          onUpdateProfile={handleUpdateProfile}
          monthlyBudget={monthlyBudget}
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
    fontFamily: "Urbanist_700Bold",
    fontWeight: "700",
    fontSize: 12,
  },
});
