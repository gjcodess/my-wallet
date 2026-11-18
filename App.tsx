import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
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
import { BottomNav, EdgeFade, getThemeColors } from "./src/components/SharedUI";
import {
  ActivityScreen,
  HomeScreen,
  SettingsScreen,
  TabHeader,
  WalletDetailScreen,
  WalletsScreen,
} from "./src/components/Screens";
import { SheetModal } from "./src/components/SheetModal";
import { Icon } from "./src/components/Icon";

export default function App() {
  const [fontsLoaded] = useFonts({
    Urbanist_400Regular,
    Urbanist_500Medium,
    Urbanist_600SemiBold,
    Urbanist_700Bold,
    Urbanist_800ExtraBold,
  });

  const [tab, setTab] = useState<Tab>("home");
  const [wallets, setWallets] = useState<Wallet[]>(initialWallets);
  const [activityItems, setActivityItems] =
    useState<ActivityItem[]>(initialActivities);
  const [hidden, setHidden] = useState(false);
  const [dark, setDark] = useState(false);
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

  const theme = useMemo(() => getThemeColors(dark), [dark]);

  // Scroll-reactive bottom navbar & screen/toast animations
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const navVisibleRef = useRef(true);
  const [navVisible, setNavVisible] = useState(true);
  const navAnim = useRef(new Animated.Value(1)).current;
  const tabAnim = useRef(new Animated.Value(1)).current;
  const toastAnim = useRef(new Animated.Value(0)).current;
  const walletsRef = useRef(wallets);
  walletsRef.current = wallets;
  const activitiesRef = useRef(activityItems);
  activitiesRef.current = activityItems;
  const syncScheduledRef = useRef(false);

  const handleStackDragChange = useCallback((dragging: boolean) => {
    scrollRef.current?.setNativeProps({ scrollEnabled: !dragging });
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
      lastScrollY.current = 0;
      scrollY.setValue(0);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      setNavbarVisible(true);
    },
    [setNavbarVisible, scrollY]
  );

  useEffect(() => {
    tabAnim.setValue(0);
    Animated.timing(tabAnim, {
      toValue: 1,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [tab, tabAnim]);

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
        setProfile(state.profile);
        setLastSyncedAt(state.lastSyncedAt);
        setDbReady(true);
      })
      .catch(() => {
        if (mounted) setDbReady(true);
      });
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

  // 3. Persist changes to SQLite
  useEffect(() => {
    if (!dbReady) return;
    saveWalletsToSQLite(wallets).catch(() => {});
  }, [wallets, dbReady]);

  useEffect(() => {
    if (!dbReady) return;
    saveActivitiesToSQLite(activityItems).catch(() => {});
  }, [activityItems, dbReady]);

  useEffect(() => {
    if (!dbReady) return;
    saveSettingToSQLite("dark_mode", dark ? "true" : "false").catch(() => {});
  }, [dark, dbReady]);

  useEffect(() => {
    if (!dbReady) return;
    saveSettingToSQLite("hide_balances", hidden ? "true" : "false").catch(
      () => {}
    );
  }, [hidden, dbReady]);

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

  const openSheet = (next: Sheet, wallet?: Wallet) => {
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
  };

  const openTransactionSheet = (item: ActivityItem) => {
    setSheetActivity(item);
    setSheetWalletId(null);
    setSheet("tx");
  };

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

  const handleReorderWallets = (nextWallets: Wallet[]) => {
    const nowIso = new Date().toISOString();
    const stamped = nextWallets.map((w) => ({
      ...w,
      updatedAt: nowIso,
      synced: false,
    }));
    walletsRef.current = stamped;
    setWallets(stamped);
    scheduleCloudSync();
  };

  const handleUpdateProfile = (nextProfile: UserProfile) => {
    setProfile(nextProfile);
    saveSettingToSQLite("full_name", nextProfile.fullName).catch(() => {});
    saveSettingToSQLite("initials", nextProfile.initials).catch(() => {});
  };

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: "#edf2e9" }} />;
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.page }]}
        edges={["top", "left", "right", "bottom"]}
      >
        {/* Top Radial Gradient Background */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width="100%" height="100%">
            <Defs>
              <SvgRadialGradient
                id="bgRadial"
                cx="50%"
                cy="0%"
                rx="85%"
                ry="48%"
              >
                <Stop
                  offset="0%"
                  stopColor={dark ? "#1e3250" : "#ffffff"}
                  stopOpacity="1"
                />
                <Stop
                  offset="50%"
                  stopColor={dark ? "#101724" : "#eef3fa"}
                  stopOpacity="1"
                />
                <Stop
                  offset="100%"
                  stopColor={dark ? "#090d12" : "#dbe6f5"}
                  stopOpacity="1"
                />
              </SvgRadialGradient>
            </Defs>
            <SvgRect x="0" y="0" width="100%" height="100%" fill="url(#bgRadial)" />
          </Svg>
        </View>

        <StatusBar style={dark ? "light" : "dark"} />

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
              profile={profile}
              setTab={handleTabChange}
              onAddWallet={() => openSheet("add")}
              onActivityFilter={() =>
                setShowActivityFilters((prev) => !prev)
              }
              activityFilterActive={showActivityFilters}
              theme={theme}
            />
            <View style={{ flex: 1 }}>
              <Animated.ScrollView
                ref={scrollRef}
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                onScroll={Animated.event(
                  [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                  { useNativeDriver: true, listener: handleScroll }
                )}
                scrollEventThrottle={16}
              >
              <Animated.View
                style={{
                  opacity: tabAnim,
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
                {tab === "home" && (
                  <HomeScreen
                    wallets={wallets}
                    activities={activityItems}
                    total={total}
                    hidden={hidden}
                    setHidden={setHidden}
                    onWallet={(w) => setSelectedId(w.id)}
                    onTransaction={openTransactionSheet}
                    onSheet={openSheet}
                    setTab={handleTabChange}
                    onStackDragChange={handleStackDragChange}
                    theme={theme}
                  />
                )}

                {tab === "wallets" && (
                  <WalletsScreen
                    wallets={wallets}
                    total={total}
                    hidden={hidden}
                    onWallet={(w) => setSelectedId(w.id)}
                    onReorderWallets={handleReorderWallets}
                    onAddWallet={() => openSheet("add")}
                    onDragChange={handleStackDragChange}
                    isCloudSynced={Boolean(userEmail)}
                    theme={theme}
                  />
                )}

                {tab === "activity" && (
                  <ActivityScreen
                    activities={activityItems}
                    hidden={hidden}
                    onTransaction={openTransactionSheet}
                    showFilters={showActivityFilters}
                    theme={theme}
                  />
                )}

                {tab === "settings" && (
                  <SettingsScreen
                    dark={dark}
                    setDark={setDark}
                    hidden={hidden}
                    setHidden={setHidden}
                    showToast={setToast}
                    profile={profile}
                    userEmail={userEmail}
                    lastSyncedAt={lastSyncedAt}
                    onOpenAuth={() => openSheet("auth")}
                    onSyncNow={handleSyncNow}
                    theme={theme}
                  />
                )}
              </Animated.View>
            </Animated.ScrollView>

            <EdgeFade
              position="top"
              color={dark ? "#17243a" : "#f6f9fd"}
              size={26}
              opacity={scrollY.interpolate({
                inputRange: [0, 16],
                outputRange: [0, 1],
                extrapolate: "clamp",
              })}
            />
            <EdgeFade
              position="bottom"
              color={dark ? "#090d12" : "#dce6f5"}
              size={108}
            />

            <BottomNav
              tab={tab}
              setTab={handleTabChange}
              onAdd={() => openSheet("entry")}
              navAnim={navAnim}
              visible={navVisible}
              theme={theme}
            />
            </View>
          </View>
        )}

        {sheet && (
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
            onOpenWallet={(w) => {
              setSheet(null);
              setSheetWalletId(null);
              setSheetActivity(null);
              setSelectedId(w.id);
            }}
            onClose={() => {
              setSheet(null);
              setSheetWalletId(null);
              setSheetActivity(null);
            }}
            onSwitchSheet={(nextType, nextWallet) => {
              setSheetActivity(null);
              if (nextWallet) setSheetWalletId(nextWallet.id);
              setSheet(nextType);
            }}
            onDone={(message) => {
              setSheet(null);
              setSheetWalletId(null);
              setSheetActivity(null);
              setToast(message);
            }}
            profile={profile}
            onUpdateProfile={handleUpdateProfile}
            userEmail={userEmail}
            onSyncNow={handleSyncNow}
            theme={theme}
          />
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
      </SafeAreaView>
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
