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
  initialActivities,
  initialWallets,
  Sheet,
  Tab,
  UserProfile,
  Wallet,
} from "./src/types/wallet";
import {
  loadLocalState,
  saveActivitiesToSQLite,
  saveSettingToSQLite,
  saveWalletsToSQLite,
  syncWithSupabase,
} from "./src/lib/sqlite";
import { supabase } from "./src/lib/supabase";
import { BottomNav, getThemeColors } from "./src/components/SharedUI";
import {
  ActivityScreen,
  HomeScreen,
  SettingsScreen,
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
  const [sheet, setSheet] = useState<Sheet>(null);
  const [toast, setToast] = useState("");
  const [dbReady, setDbReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const selected = useMemo(
    () => wallets.find((w) => w.id === selectedId) || null,
    [wallets, selectedId]
  );

  const total = useMemo(
    () => wallets.reduce((sum, w) => sum + w.balance, 0),
    [wallets]
  );

  const theme = useMemo(() => getThemeColors(dark), [dark]);

  // Scroll-reactive bottom navbar & screen/toast animations
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const lastScrollY = useRef(0);
  const navVisibleRef = useRef(true);
  const [navVisible, setNavVisible] = useState(true);
  const navAnim = useRef(new Animated.Value(1)).current;
  const tabAnim = useRef(new Animated.Value(1)).current;
  const toastAnim = useRef(new Animated.Value(0)).current;

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
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      setNavbarVisible(true);
    },
    [setNavbarVisible]
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
    if (wallet) setSelectedId(wallet.id);
    setSheet(next);
  };

  const recordActivity = (item: Omit<ActivityItem, "id" | "date">) => {
    const timeStr = new Intl.DateTimeFormat("en-PH", {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date());
    const date = `Today, ${timeStr}`;
    const newItem: ActivityItem = {
      ...item,
      id: Date.now(),
      date,
    };
    setActivityItems((prev) => [newItem, ...prev]);
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

        {selected && !sheet ? (
          <WalletDetailScreen
            wallet={selected}
            activities={activityItems}
            hidden={hidden}
            onBack={() => setSelectedId(null)}
            onUpdate={() => openSheet("update", selected)}
            onTransfer={() => openSheet("transfer", selected)}
            theme={theme}
          />
        ) : (
          <View style={{ flex: 1 }}>
            <ScrollView
              ref={scrollRef}
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              onScroll={handleScroll}
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
                    onSheet={openSheet}
                    setTab={handleTabChange}
                    profile={profile}
                    theme={theme}
                  />
                )}

                {tab === "wallets" && (
                  <WalletsScreen
                    wallets={wallets}
                    total={total}
                    hidden={hidden}
                    onWallet={(w) => setSelectedId(w.id)}
                    onAdd={() => openSheet("add")}
                    isCloudSynced={Boolean(userEmail)}
                    theme={theme}
                  />
                )}

                {tab === "activity" && (
                  <ActivityScreen
                    activities={activityItems}
                    hidden={hidden}
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
            </ScrollView>

            <BottomNav
              tab={tab}
              setTab={handleTabChange}
              onAdd={() => openSheet("entry")}
              navAnim={navAnim}
              visible={navVisible}
              theme={theme}
            />
          </View>
        )}

        {sheet && (
          <SheetModal
            type={sheet}
            wallets={wallets}
            selected={selected}
            onSaveWallets={(nextWallets) => {
              setWallets(nextWallets);
              if (userId) {
                syncWithSupabase({
                  userId,
                  wallets: nextWallets,
                  activities: activityItems,
                  dark,
                  hidden,
                  profile,
                }).catch(() => {});
              }
            }}
            onRecordActivity={(item) => {
              recordActivity(item);
            }}
            onClose={() => setSheet(null)}
            onDone={(message) => {
              setSheet(null);
              setSelectedId(null);
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
