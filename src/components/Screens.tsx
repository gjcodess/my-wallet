import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  ActivityItem,
  money,
  Sheet,
  Tab,
  tonePalette,
  UserProfile,
  Wallet,
} from "../types/wallet";
import { FolderSurface } from "./FolderSurface";
import { Icon } from "./Icon";
import {
  ActionButton,
  bevelStyle,
  cardShadow,
  SectionTitle,
  SwitchControl,
  ThemeColors,
  TopBar,
  TxRow,
} from "./SharedUI";
import { Amount, WalletFolder, WalletLogoBadge } from "./WalletFolder";

export function HomeScreen({
  wallets,
  activities,
  total,
  hidden,
  setHidden,
  onWallet,
  onSheet,
  setTab,
  onStackDragChange,
  profile,
  theme,
}: {
  wallets: Wallet[];
  activities: ActivityItem[];
  total: number;
  hidden: boolean;
  setHidden: (v: boolean) => void;
  onWallet: (w: Wallet) => void;
  onSheet: (s: Sheet, w?: Wallet) => void;
  setTab: (t: Tab) => void;
  onStackDragChange?: (dragging: boolean) => void;
  profile: UserProfile;
  theme: ThemeColors;
}) {
  const [front, setFront] = useState(0);
  const safeFront = wallets.length ? front % wallets.length : 0;
  const ordered = [
    ...wallets.slice(safeFront),
    ...wallets.slice(0, safeFront),
  ];
  const featured = ordered[0];
  const peekWallet = ordered[1];
  const thirdWallet = wallets.length > 2 ? ordered[2] : undefined;
  const fourthWallet = wallets.length > 3 ? ordered[3] : undefined;
  const prevWallet =
    wallets.length > 1 ? ordered[wallets.length - 1] : undefined;
  const firstName = profile.fullName.split(" ")[0] || "Justin";
  const addFrom = theme.dark ? "#354052" : "#4c586b";
  const addTo = theme.dark ? "#1e2531" : "#2d3645";
  const addInk = "#ffffff";

  const cardAnim = useRef(new Animated.Value(1)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const walletsLenRef = useRef(wallets.length);
  walletsLenRef.current = wallets.length;
  const featuredRef = useRef(featured);
  featuredRef.current = featured;
  const onWalletRef = useRef(onWallet);
  onWalletRef.current = onWallet;
  const isAnimatingRef = useRef(false);
  const skipNextCardAnimRef = useRef(false);
  const pendingStepsRef = useRef(0);

  const cycleWallet = (direction: 1 | -1, duration = 280) => {
    const len = walletsLenRef.current;
    if (len <= 1 || isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    Animated.timing(dragY, {
      toValue: direction === 1 ? 130 : -120,
      duration,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) {
        isAnimatingRef.current = false;
        pendingStepsRef.current = 0;
        return;
      }
      skipNextCardAnimRef.current = true;
      setFront((prev) => (prev + direction + len) % len);
    });
  };

  const cycleSteps = (steps: number) => {
    if (steps <= 0 || isAnimatingRef.current || walletsLenRef.current <= 1) return;
    pendingStepsRef.current = steps - 1;
    cycleWallet(1, steps > 1 ? 150 : 230);
  };

  // Reset dragY atomically in the same React commit as safeFront changing
  // so the old card never flashes back at opacity 1 for a frame.
  useLayoutEffect(() => {
    dragY.setValue(0);
    isAnimatingRef.current = false;
    if (pendingStepsRef.current > 0) {
      pendingStepsRef.current -= 1;
      const nextDuration = pendingStepsRef.current > 0 ? 150 : 175;
      requestAnimationFrame(() => cycleWallet(1, nextDuration));
    }
  }, [safeFront, dragY]);

  useEffect(() => {
    if (skipNextCardAnimRef.current) {
      skipNextCardAnimRef.current = false;
      cardAnim.setValue(1);
      return;
    }
    cardAnim.setValue(0);
    Animated.spring(cardAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 5,
    }).start();
  }, [safeFront, cardAnim]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !isAnimatingRef.current,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: (_evt, g) =>
          walletsLenRef.current > 1 &&
          !isAnimatingRef.current &&
          Math.abs(g.dy) > 3 &&
          Math.abs(g.dy) >= Math.abs(g.dx),
        onMoveShouldSetPanResponderCapture: (_evt, g) =>
          walletsLenRef.current > 1 &&
          !isAnimatingRef.current &&
          Math.abs(g.dy) > 4 &&
          Math.abs(g.dy) >= Math.abs(g.dx),
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          onStackDragChange?.(true);
        },
        onPanResponderMove: (_evt, g) => {
          if (walletsLenRef.current <= 1) return;
          const clamped = Math.max(-120, Math.min(130, g.dy));
          dragY.setValue(clamped);
        },
        onPanResponderRelease: (_evt, g) => {
          onStackDragChange?.(false);
          if (
            Math.abs(g.dx) < 8 &&
            Math.abs(g.dy) < 8 &&
            Math.abs(g.vy) < 0.25
          ) {
            Animated.spring(dragY, {
              toValue: 0,
              useNativeDriver: true,
            }).start();
            if (featuredRef.current) {
              onWalletRef.current(featuredRef.current);
            }
            return;
          }

          const len = walletsLenRef.current;
          if (len <= 1) {
            Animated.spring(dragY, {
              toValue: 0,
              useNativeDriver: true,
            }).start();
            return;
          }

          if (g.dy > 32 || g.vy > 0.25) {
            cycleWallet(1);
          } else if (g.dy < -32 || g.vy < -0.25) {
            cycleWallet(-1);
          } else {
            Animated.spring(dragY, {
              toValue: 0,
              useNativeDriver: true,
              speed: 22,
              bounciness: 6,
            }).start();
          }
        },
        onPanResponderTerminate: () => {
          onStackDragChange?.(false);
          Animated.spring(dragY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        },
      }),
    [dragY, onStackDragChange]
  );

  return (
    <View style={styles.page}>
      {/* Home Header */}
      <View style={styles.homeHeader}>
        <View>
          <Text style={[styles.greetingSub, { color: theme.ink }]}>
            Hi, {firstName}
          </Text>
          <Text style={[styles.greetingTitle, { color: theme.ink }]}>
            Welcome back!
          </Text>
        </View>
        <Pressable
          onPress={() => setTab("settings")}
          style={styles.profileOrbWrapper}
        >
          <LinearGradient
            colors={theme.accentGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.profileOrb}
          >
            <Text style={[styles.profileOrbText, { color: theme.accentInk }]}>
              {profile.initials}
            </Text>
          </LinearGradient>
          <View
            style={[
              styles.profileOrbBadge,
              { backgroundColor: theme.page },
            ]}
          >
            <Icon name="grid" size={13} color={theme.ink} />
          </View>
        </Pressable>
      </View>

      {/* Total Strip */}
      <View style={styles.totalStrip}>
        <View>
          <Text style={[styles.totalLabel, { color: theme.muted }]}>
            Total money
          </Text>
          <Amount
            value={total}
            hidden={hidden}
            size="sm"
            color={theme.ink}
          />
        </View>
        <Pressable
          onPress={() => setHidden(!hidden)}
          style={[
            styles.roundBtn,
            {
              backgroundColor: theme.card,
            },
            bevelStyle(theme.dark),
            cardShadow(theme.dark),
          ]}
        >
          <Icon
            name={hidden ? "eye-off" : "eye"}
            size={18}
            color={theme.ink}
          />
        </Pressable>
      </View>

      {/* 3-Layer Wallet Folder Stack */}
      <View style={styles.walletStack}>
        {/* Back Layer: Add new wallet */}
        <Pressable
          onPress={() => onSheet("add")}
          style={styles.stackAddLayer}
        >
          <FolderSurface
            tab={0.6}
            tabHeight={42}
            radius={25}
            notch
            fromColor={addFrom}
            toColor={addTo}
            minHeight={112}
          >
            {({ notchX, notchHeight }) => (
              <View style={{ minHeight: 112 }}>
                <View style={[styles.stackLabelRow, { height: 42 }]}>
                  <Text
                    style={[styles.stackAddText, { color: addInk }]}
                    numberOfLines={1}
                  >
                    Add new wallet
                  </Text>
                </View>
                <View
                  style={[
                    styles.stackNotchSlot,
                    { left: notchX, height: notchHeight },
                  ]}
                >
                  <Icon name="plus" size={16} color={addInk} />
                </View>
              </View>
            )}
          </FolderSurface>
        </Pressable>

        {/* 4th Card Layer: Pre-mounted behind 3rd card, emerges smoothly on swipe */}
        {fourthWallet ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.stackThirdFolderLayer,
              {
                zIndex: 1,
                opacity: dragY.interpolate({
                  inputRange: [0, 35, 130],
                  outputRange: [0, 0.35, 1],
                  extrapolate: "clamp",
                }),
                transform: [
                  {
                    translateY: dragY.interpolate({
                      inputRange: [0, 130],
                      outputRange: [-18, 0],
                      extrapolate: "clamp",
                    }),
                  },
                  {
                    scale: dragY.interpolate({
                      inputRange: [0, 130],
                      outputRange: [0.83, 0.89],
                      extrapolate: "clamp",
                    }),
                  },
                ],
              },
            ]}
          >
            <WalletFolder
              wallet={fourthWallet}
              hidden={hidden}
              topShadow
              menuIcon="swap"
            />
          </Animated.View>
        ) : null}

        {/* 3rd Card Layer: Visible in resting stack behind 2nd card, steps into 2nd slot on swipe down or tucks back on swipe up */}
        {thirdWallet ? (
          <Animated.View
            style={[
              styles.stackThirdFolderLayer,
              {
                zIndex: 2,
                opacity: dragY.interpolate({
                  inputRange: [-120, -35, 0, 130],
                  outputRange: [0, 0.45, 1, 1],
                  extrapolate: "clamp",
                }),
                transform: [
                  {
                    translateY: dragY.interpolate({
                      inputRange: [-120, 0, 130],
                      outputRange: [-18, 0, 44],
                      extrapolate: "clamp",
                    }),
                  },
                  {
                    scale: dragY.interpolate({
                      inputRange: [-120, 0, 130],
                      outputRange: [0.83, 0.89, 0.945],
                      extrapolate: "clamp",
                    }),
                  },
                ],
              },
            ]}
          >
            <WalletFolder
              wallet={thirdWallet}
              hidden={hidden}
              topShadow
              menuIcon="swap"
              onPress={() => cycleSteps(2)}
              onMenu={() => cycleSteps(2)}
            />
          </Animated.View>
        ) : null}

        {/* Middle Layer: 2nd Wallet (moves to front on swipe down, or to 3rd slot on swipe up) */}
        {peekWallet ? (
          <Animated.View
            style={[
              styles.stackPeekFolderLayer,
              {
                transform: [
                  {
                    translateY: dragY.interpolate({
                      inputRange: [-120, 0, 130],
                      outputRange: [-44, 0, 46],
                      extrapolate: "clamp",
                    }),
                  },
                  {
                    scale: dragY.interpolate({
                      inputRange: [-120, 0, 130],
                      outputRange: [0.89, 0.945, 1],
                      extrapolate: "clamp",
                    }),
                  },
                ],
              },
            ]}
          >
            <WalletFolder
              wallet={peekWallet}
              hidden={hidden}
              topShadow
              notchProgress={dragY.interpolate({
                inputRange: [-120, 0, 130],
                outputRange: [0, 0, 1],
                extrapolate: "clamp",
              })}
              onPress={() => cycleWallet(1)}
              onMenu={() => cycleWallet(1)}
            />
          </Animated.View>
        ) : null}

        {/* Front Layer: Active Featured Wallet (Swipe down/up to cycle) */}
        {featured ? (
          <Animated.View
            {...panResponder.panHandlers}
            onTouchStart={() => onStackDragChange?.(true)}
            onTouchEnd={() => onStackDragChange?.(false)}
            onTouchCancel={() => onStackDragChange?.(false)}
            style={[
              styles.stackFrontLayer,
              {
                opacity: Animated.multiply(
                  cardAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.65, 1],
                  }),
                  dragY.interpolate({
                    inputRange: [-120, 0, 75, 130],
                    outputRange: [1, 1, 0.72, 0],
                    extrapolate: "clamp",
                  })
                ),
                transform: [
                  {
                    translateY: Animated.add(
                      cardAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [12, 0],
                      }),
                      dragY.interpolate({
                        inputRange: [-120, 0, 130],
                        outputRange: [-46, 0, 70],
                        extrapolate: "clamp",
                      })
                    ),
                  },
                  {
                    scale: Animated.multiply(
                      cardAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.97, 1],
                      }),
                      dragY.interpolate({
                        inputRange: [-120, 0, 130],
                        outputRange: [0.945, 1, 0.92],
                        extrapolate: "clamp",
                      })
                    ),
                  },
                ],
              },
            ]}
          >
            <WalletFolder
              wallet={featured}
              hidden={hidden}
              topShadow
              notchProgress={dragY.interpolate({
                inputRange: [-120, 0, 130],
                outputRange: [0, 1, 1],
                extrapolate: "clamp",
              })}
              onMenu={() => onSheet("update", featured)}
            />
          </Animated.View>
        ) : null}

        {/* Previous Card Layer: Rises smoothly into the front slot when swiping upward */}
        {prevWallet ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.stackFrontLayer,
              {
                zIndex: 5,
                opacity: dragY.interpolate({
                  inputRange: [-120, -55, -8, 0],
                  outputRange: [1, 0.82, 0.15, 0],
                  extrapolate: "clamp",
                }),
                transform: [
                  {
                    translateY: dragY.interpolate({
                      inputRange: [-120, 0],
                      outputRange: [0, 62],
                      extrapolate: "clamp",
                    }),
                  },
                  {
                    scale: dragY.interpolate({
                      inputRange: [-120, 0],
                      outputRange: [1, 0.93],
                      extrapolate: "clamp",
                    }),
                  },
                ],
              },
            ]}
          >
            <WalletFolder wallet={prevWallet} hidden={hidden} topShadow />
          </Animated.View>
        ) : null}
      </View>

      {/* Stack Pagination Dots (driven live by dragY on the UI thread) */}
      <View style={styles.stackDots}>
        {wallets.map((w, i) => {
          const len = wallets.length;
          const nextIdx = (safeFront + 1) % len;
          const prevIdx = (safeFront - 1 + len) % len;
          const isCurrent = i === safeFront;
          const isNext = len > 1 && i === nextIdx;
          const isPrev = len > 1 && i === prevIdx;

          const dotScaleX = isCurrent
            ? dragY.interpolate({
                inputRange: [-120, 0, 130],
                outputRange: [0.75, 2.0, 0.75],
                extrapolate: "clamp",
              })
            : isNext && isPrev
              ? dragY.interpolate({
                  inputRange: [-120, 0, 130],
                  outputRange: [2.0, 0.75, 2.0],
                  extrapolate: "clamp",
                })
              : isNext
                ? dragY.interpolate({
                    inputRange: [-120, 0, 130],
                    outputRange: [0.75, 0.75, 2.0],
                    extrapolate: "clamp",
                  })
                : isPrev
                  ? dragY.interpolate({
                      inputRange: [-120, 0, 130],
                      outputRange: [2.0, 0.75, 0.75],
                      extrapolate: "clamp",
                    })
                  : 0.75;

          const dotOpacity = isCurrent
            ? dragY.interpolate({
                inputRange: [-120, 0, 130],
                outputRange: [0.22, 1, 0.22],
                extrapolate: "clamp",
              })
            : isNext && isPrev
              ? dragY.interpolate({
                  inputRange: [-120, 0, 130],
                  outputRange: [1, 0.22, 1],
                  extrapolate: "clamp",
                })
              : isNext
                ? dragY.interpolate({
                    inputRange: [-120, 0, 130],
                    outputRange: [0.22, 0.22, 1],
                    extrapolate: "clamp",
                  })
                : isPrev
                  ? dragY.interpolate({
                      inputRange: [-120, 0, 130],
                      outputRange: [1, 0.22, 0.22],
                      extrapolate: "clamp",
                    })
                  : 0.22;

          return (
            <Pressable
              key={w.id}
              onPress={() => {
                if (i === safeFront || isAnimatingRef.current) return;
                const forward = (i - safeFront + len) % len;
                const backward = (safeFront - i + len) % len;
                if (forward <= 2) {
                  cycleSteps(forward);
                } else if (backward === 1) {
                  cycleWallet(-1);
                } else {
                  setFront(i);
                }
              }}
              hitSlop={6}
            >
              <Animated.View
                style={[
                  styles.dot,
                  {
                    backgroundColor: theme.ink,
                    opacity: dotOpacity,
                    transform: [{ scaleX: dotScaleX }],
                  },
                ]}
              />
            </Pressable>
          );
        })}
      </View>

      {/* 4-Column Quick Action Grid */}
      <View style={styles.actionGrid}>
        <ActionButton
          icon="edit"
          label="Update"
          tone="blue"
          onPress={() => onSheet("update", featured)}
          theme={theme}
        />
        <ActionButton
          icon="swap"
          label="Transfer"
          tone="yellow"
          onPress={() => onSheet("transfer", featured)}
          theme={theme}
        />
        <ActionButton
          icon="plus"
          label="Add"
          tone="navy"
          onPress={() => onSheet("add")}
          theme={theme}
        />
        <ActionButton
          icon="grid"
          label="Wallets"
          tone="mint"
          onPress={() => setTab("wallets")}
          theme={theme}
        />
      </View>

      {/* Recent Transactions */}
      <View style={styles.section}>
        <SectionTitle
          title="All transactions"
          action="Today"
          onPress={() => setTab("activity")}
          theme={theme}
        />
        <View style={styles.txList}>
          {activities.slice(0, 4).map((item) => (
            <TxRow key={item.id} item={item} hidden={hidden} theme={theme} />
          ))}
        </View>
      </View>
    </View>
  );
}

export function WalletsScreen({
  wallets,
  total,
  hidden,
  onWallet,
  onAdd,
  isCloudSynced,
  theme,
}: {
  wallets: Wallet[];
  total: number;
  hidden: boolean;
  onWallet: (w: Wallet) => void;
  onAdd: () => void;
  isCloudSynced: boolean;
  theme: ThemeColors;
}) {
  return (
    <View style={styles.page}>
      <TopBar
        title="My Wallets"
        theme={theme}
        right={
          <Pressable
            onPress={onAdd}
            style={[
              styles.roundBtn,
              {
                backgroundColor: theme.card,
              },
              bevelStyle(theme.dark),
              cardShadow(theme.dark),
            ]}
          >
            <Icon name="plus" size={20} color={theme.ink} />
          </Pressable>
        }
      />

      <View style={styles.walletsTotal}>
        <Text style={[styles.walletsTotalSub, { color: theme.muted }]}>
          Combined balance
        </Text>
        <View style={{ marginVertical: 4 }}>
          <Amount
            value={total}
            hidden={hidden}
            size="lg"
            color={theme.ink}
          />
        </View>
        <View style={styles.syncBadgeRow}>
          <Icon name="sync" size={14} color={theme.accentText} />
          <Text style={[styles.syncBadgeText, { color: theme.accentText }]}>
            {isCloudSynced ? "Synced with Supabase" : "Synced locally"} ·{" "}
            {wallets.length} wallets
          </Text>
        </View>
      </View>

      <View style={styles.walletList}>
        {wallets.map((wallet) => {
          const pal = tonePalette[wallet.tone] || tonePalette.blue;
          return (
            <Pressable
              key={wallet.id}
              onPress={() => onWallet(wallet)}
              style={({ pressed }) => [
                styles.walletTile,
                {
                  backgroundColor: theme.card,
                  transform: [{ scale: pressed ? 0.985 : 1 }],
                },
                bevelStyle(theme.dark),
                cardShadow(theme.dark),
              ]}
            >
              <LinearGradient
                colors={[pal.from, pal.to]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.tileBadge}
              >
                <WalletLogoBadge
                  logoKey={wallet.logoKey}
                  name={wallet.name}
                  mark={wallet.mark}
                  size={48}
                  radius={16}
                  ink={pal.ink}
                  fontSize={11}
                />
              </LinearGradient>

              <View style={styles.tileMain}>
                <Text
                  style={[styles.tileName, { color: theme.ink }]}
                  numberOfLines={1}
                >
                  {wallet.name}
                </Text>
                <Text
                  style={[styles.tileSub, { color: theme.muted }]}
                  numberOfLines={1}
                >
                  {wallet.type} · {wallet.account}
                </Text>
              </View>

              <View style={styles.tileValueRow}>
                <Amount
                  value={wallet.balance}
                  hidden={hidden}
                  size="sm"
                  color={theme.ink}
                />
                <Icon name="chevron" size={16} color={theme.muted} />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function ActivityScreen({
  activities,
  hidden,
  theme,
}: {
  activities: ActivityItem[];
  hidden: boolean;
  theme: ThemeColors;
}) {
  const [range, setRange] = useState<"Month" | "Week">("Month");
  const barProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    barProgress.setValue(0);
    Animated.timing(barProgress, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [range, barProgress]);

  const bars: [number, number][] =
    range === "Month"
      ? [
          [42, 58],
          [62, 50],
          [48, 85],
          [38, 55],
          [71, 66],
          [56, 74],
        ]
      : [
          [55, 40],
          [35, 68],
          [64, 52],
          [48, 79],
          [60, 44],
          [75, 62],
        ];
  const labels =
    range === "Month"
      ? ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]
      : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const totalOut = activities
    .filter((a) => a.amount < 0)
    .reduce((sum, a) => sum + Math.abs(a.amount), 0);
  const totalIn = activities
    .filter((a) => a.amount > 0)
    .reduce((sum, a) => sum + a.amount, 0);

  return (
    <View style={styles.page}>
      <TopBar
        title="Activity"
        theme={theme}
        right={
          <View
            style={[
              styles.roundBtn,
              {
                backgroundColor: theme.card,
              },
              bevelStyle(theme.dark),
              cardShadow(theme.dark),
            ]}
          >
            <Icon name="more" size={20} color={theme.ink} />
          </View>
        }
      />

      <View style={styles.spendingHead}>
        <Text style={[styles.walletsTotalSub, { color: theme.muted }]}>
          Total spending
        </Text>
        <Amount
          value={totalOut || 11376.9}
          hidden={hidden}
          size="lg"
          color={theme.ink}
        />
      </View>

      {/* Navy Folder Chart */}
      <View style={{ marginTop: 14 }}>
        <FolderSurface
          tab={0.62}
          tabHeight={42}
          radius={28}
          notch
          fromColor={theme.dark ? "#263c69" : "#3c5c9a"}
          toColor={theme.dark ? "#0d1528" : "#111b34"}
          minHeight={232}
        >
          {({ notchX, notchHeight }) => (
            <View style={{ minHeight: 232 }}>
              <Pressable
                onPress={() => setRange(range === "Month" ? "Week" : "Month")}
                style={[
                  styles.rangePill,
                  { left: notchX, height: notchHeight },
                ]}
              >
                <Text style={styles.rangePillText}>{range}</Text>
                <Icon name="down" size={13} color="#ffffff" />
              </Pressable>

              {/* Chart Grid & Bars */}
              <View style={styles.chartBody}>
                <View style={styles.chartGrid}>
                  {["₱30k", "₱20k", "₱10k", "₱0"].map((lvl) => (
                    <View key={lvl} style={styles.chartGridLine}>
                      <Text style={styles.chartGridText}>{lvl}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.barsContainer}>
                  {bars.map(([a, b], i) => (
                    <View key={i} style={styles.barGroup}>
                      <View style={styles.barPair}>
                        <Animated.View
                          style={[
                            styles.bar,
                            {
                              height: barProgress.interpolate({
                                inputRange: [0, 1],
                                outputRange: ["0%", `${a}%`],
                              }),
                              overflow: "hidden",
                            },
                          ]}
                        >
                          <LinearGradient
                            colors={["#fff99a", "#f5c414"]}
                            style={StyleSheet.absoluteFill}
                          />
                        </Animated.View>
                        <Animated.View
                          style={[
                            styles.bar,
                            {
                              height: barProgress.interpolate({
                                inputRange: [0, 1],
                                outputRange: ["0%", `${b}%`],
                              }),
                              overflow: "hidden",
                            },
                          ]}
                        >
                          <LinearGradient
                            colors={["#a8ddff", "#3b82f6"]}
                            style={StyleSheet.absoluteFill}
                          />
                        </Animated.View>
                      </View>
                      <Text style={styles.barLabel}>{labels[i]}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}
        </FolderSurface>
      </View>

      {/* Money In / Money Out Flow Cards */}
      <View style={styles.flowCards}>
        <LinearGradient
          colors={["#fff58a", "#f2c715"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.flowCard, cardShadow(theme.dark)]}
        >
          <View style={styles.flowCardBevel} pointerEvents="none" />
          <View style={styles.flowIconBox}>
            <Icon name="arrow-down" size={16} color="#172442" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.flowLabel}>Money in</Text>
            <Text style={styles.flowValue} numberOfLines={1}>
              {hidden ? "••••" : money(totalIn || 36007)}
            </Text>
          </View>
        </LinearGradient>

        <LinearGradient
          colors={theme.accentGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.flowCard, cardShadow(theme.dark)]}
        >
          <View style={styles.flowCardBevel} pointerEvents="none" />
          <View style={styles.flowIconBox}>
            <Icon name="arrow-up" size={16} color={theme.accentInk} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.flowLabel, { color: theme.accentInk }]}>
              Money out
            </Text>
            <Text
              style={[styles.flowValue, { color: theme.accentInk }]}
              numberOfLines={1}
            >
              {hidden ? "••••" : money(totalOut || 18070)}
            </Text>
          </View>
        </LinearGradient>
      </View>

      {/* Categories Horizontal Folder Cards */}
      <SectionTitle title="Categories" action="Expense" theme={theme} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}
      >
        {(
          [
            ["bag", "Groceries", 4207],
            ["bolt", "Bills", 3241.6],
            ["cup", "Food", 2185],
            ["swap", "Transfers", 6200],
          ] as const
        ).map(([icon, label, amount]) => (
          <View key={label} style={styles.categoryCardWrapper}>
            <FolderSurface
              tab={0.58}
              tabHeight={18}
              radius={20}
              fromColor={theme.dark ? "#1b2531" : theme.card}
              toColor={theme.dark ? "#121922" : "#edf3fc"}
              minHeight={108}
            >
              <View style={styles.categoryContent}>
                <View style={styles.categoryIconPos}>
                  <Icon name={icon} size={20} color={theme.accentText} />
                </View>
                <Text style={[styles.categoryLabel, { color: theme.muted }]}>
                  {label}
                </Text>
                <Text
                  style={[styles.categoryAmount, { color: theme.ink }]}
                  numberOfLines={1}
                >
                  {hidden ? "••••" : money(amount)}
                </Text>
              </View>
            </FolderSurface>
          </View>
        ))}
      </ScrollView>

      {/* Recent Activity List */}
      <View style={styles.section}>
        <SectionTitle title="Recent activity" action="Today" theme={theme} />
        <View style={styles.txList}>
          {activities.map((item) => (
            <TxRow key={item.id} item={item} hidden={hidden} theme={theme} />
          ))}
        </View>
      </View>
    </View>
  );
}

export function SettingsScreen({
  dark,
  setDark,
  hidden,
  setHidden,
  showToast,
  profile,
  userEmail,
  lastSyncedAt,
  onOpenAuth,
  onSyncNow,
  theme,
}: {
  dark: boolean;
  setDark: (v: boolean) => void;
  hidden: boolean;
  setHidden: (v: boolean) => void;
  showToast: (s: string) => void;
  profile: UserProfile;
  userEmail: string | null;
  lastSyncedAt: string | null;
  onOpenAuth: () => void;
  onSyncNow: () => void;
  theme: ThemeColors;
}) {
  return (
    <View style={styles.page}>
      <TopBar title="Settings" theme={theme} />

      {/* Profile Card (Opens Supabase Auth / Cloud Sync Sheet) */}
      <Pressable onPress={onOpenAuth}>
        <LinearGradient
          colors={theme.accentGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profileCard}
        >
          <View style={styles.profileCardAvatar}>
            <Text
              style={[styles.profileCardInitials, { color: theme.accentInk }]}
            >
              {profile.initials}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.profileCardName, { color: theme.accentInk }]}>
              {profile.fullName}
            </Text>
            <Text style={[styles.profileCardSub, { color: theme.accentInk }]}>
              {userEmail
                ? `${userEmail} · Cloud Synced`
                : "Offline-first wallet profile · Tap to sign in"}
            </Text>
          </View>
          <Icon name="chevron" size={18} color={theme.accentInk} />
        </LinearGradient>
      </Pressable>

      {/* Appearance Group */}
      <SettingsGroup title="Appearance" theme={theme}>
        <SettingRow
          icon={dark ? "moon" : "sun"}
          title="Dark theme"
          subtitle={dark ? "Enabled" : "Light mode"}
          onPress={() => setDark(!dark)}
          control={
            <SwitchControl
              on={dark}
              onPress={() => setDark(!dark)}
              theme={theme}
            />
          }
          theme={theme}
        />
        <SettingRow
          icon="eye"
          title="Hide balances"
          subtitle="Mask money across screens"
          onPress={() => setHidden(!hidden)}
          control={
            <SwitchControl
              on={hidden}
              onPress={() => setHidden(!hidden)}
              theme={theme}
            />
          }
          isLast
          theme={theme}
        />
      </SettingsGroup>

      {/* Security Group */}
      <SettingsGroup title="Security" theme={theme}>
        <SettingRow
          icon="lock"
          title="App lock"
          subtitle="Fingerprint or screen lock"
          onPress={() => showToast("App lock is ready")}
          theme={theme}
        />
        <SettingRow
          icon="shield"
          title="Privacy"
          subtitle="Stored privately in SQLite & Supabase RLS"
          onPress={() => showToast("Your data stays protected with RLS")}
          isLast
          theme={theme}
        />
      </SettingsGroup>

      {/* Sync & Data Group */}
      <SettingsGroup title="Sync & data" theme={theme}>
        <SettingRow
          icon="cloud"
          title="Backup & sync"
          subtitle={
            userEmail
              ? `Supabase synced · ${lastSyncedAt || "Just now"}`
              : "Saved in local SQLite · Tap to sync with Supabase"
          }
          onPress={userEmail ? onSyncNow : onOpenAuth}
          theme={theme}
        />
        <SettingRow
          icon="info"
          title="About My Wallet"
          subtitle="Version 2.0 · Expo + SQLite + Supabase"
          onPress={() => showToast("You have the latest version")}
          isLast
          theme={theme}
        />
      </SettingsGroup>
    </View>
  );
}

function SettingsGroup({
  title,
  children,
  theme,
}: {
  title: string;
  children: React.ReactNode;
  theme: ThemeColors;
}) {
  return (
    <View style={styles.settingsGroup}>
      <Text style={[styles.settingsGroupTitle, { color: theme.muted }]}>
        {title}
      </Text>
      <View
        style={[
          styles.settingsGroupBox,
          {
            backgroundColor: theme.card,
          },
          bevelStyle(theme.dark),
          cardShadow(theme.dark),
        ]}
      >
        {children}
      </View>
    </View>
  );
}

function SettingRow({
  icon,
  title,
  subtitle,
  control,
  onPress,
  isLast = false,
  theme,
}: {
  icon: string;
  title: string;
  subtitle: string;
  control?: React.ReactNode;
  onPress?: () => void;
  isLast?: boolean;
  theme: ThemeColors;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.settingRow,
        !isLast && {
          borderBottomWidth: 1,
          borderBottomColor: theme.line,
        },
      ]}
    >
      <LinearGradient
        colors={theme.accentGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.settingIconBox}
      >
        <Icon name={icon} size={18} color={theme.accentInk} />
      </LinearGradient>
      <View style={styles.rowMain}>
        <Text style={[styles.rowTitle, { color: theme.ink }]}>{title}</Text>
        <Text style={[styles.rowSub, { color: theme.muted }]}>{subtitle}</Text>
      </View>
      {control || <Icon name="chevron" size={16} color={theme.muted} />}
    </Pressable>
  );
}

export function WalletDetailScreen({
  wallet,
  activities,
  hidden,
  onBack,
  onUpdate,
  onTransfer,
  theme,
}: {
  wallet: Wallet;
  activities: ActivityItem[];
  hidden: boolean;
  onBack: () => void;
  onUpdate: () => void;
  onTransfer: () => void;
  theme: ThemeColors;
}) {
  const related = activities.filter((item) => item.wallet === wallet.name);
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [wallet.id, slideAnim]);

  return (
    <Animated.ScrollView
      style={{
        flex: 1,
        opacity: slideAnim,
        transform: [
          {
            translateX: slideAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [22, 0],
            }),
          },
        ],
      }}
      contentContainerStyle={styles.detailScreen}
      showsVerticalScrollIndicator={false}
    >
      <TopBar
        title={wallet.name}
        onBack={onBack}
        theme={theme}
        right={
          <Pressable
            onPress={onUpdate}
            style={[
              styles.roundBtn,
              {
                backgroundColor: theme.card,
              },
              bevelStyle(theme.dark),
              cardShadow(theme.dark),
            ]}
          >
            <Icon name="more" size={20} color={theme.ink} />
          </Pressable>
        }
      />

      <WalletFolder wallet={wallet} hidden={hidden} onMenu={onUpdate} />

      <View style={styles.detailActions}>
        <Pressable
          onPress={onUpdate}
          style={({ pressed }) => [
            styles.detailActionBtn,
            {
              backgroundColor: theme.card,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            },
            bevelStyle(theme.dark),
            cardShadow(theme.dark),
          ]}
        >
          <Icon name="edit" size={18} color={theme.ink} />
          <Text style={[styles.detailActionText, { color: theme.ink }]}>
            Update balance
          </Text>
        </Pressable>

        <Pressable
          onPress={onTransfer}
          style={({ pressed }) => [
            styles.detailActionBtn,
            {
              backgroundColor: theme.card,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            },
            bevelStyle(theme.dark),
            cardShadow(theme.dark),
          ]}
        >
          <Icon name="swap" size={18} color={theme.ink} />
          <Text style={[styles.detailActionText, { color: theme.ink }]}>
            Transfer
          </Text>
        </Pressable>
      </View>

      <SectionTitle title="Wallet activity" action="Recent" theme={theme} />

      {related.length ? (
        <View style={styles.txList}>
          {related.map((item) => (
            <TxRow key={item.id} item={item} hidden={hidden} theme={theme} />
          ))}
        </View>
      ) : (
        <View
          style={[
            styles.emptyState,
            {
              backgroundColor: theme.card,
            },
            bevelStyle(theme.dark),
            cardShadow(theme.dark),
          ]}
        >
          <LinearGradient
            colors={theme.accentGradient}
            style={styles.emptyStateIcon}
          >
            <Icon name="activity" size={22} color={theme.accentInk} />
          </LinearGradient>
          <Text style={[styles.emptyStateTitle, { color: theme.ink }]}>
            No activity yet
          </Text>
          <Text style={[styles.emptyStateSub, { color: theme.muted }]}>
            Balance updates and transfers for this wallet will appear here.
          </Text>
        </View>
      )}
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 105,
  },
  homeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  greetingSub: {
    fontFamily: "Urbanist_600SemiBold",
    fontWeight: "600",
    fontSize: 15,
    marginBottom: 2,
  },
  greetingTitle: {
    fontFamily: "Urbanist_800ExtraBold",
    fontWeight: "800",
    fontSize: 25,
    letterSpacing: -0.8,
  },
  profileOrbWrapper: {
    position: "relative",
    width: 52,
    height: 52,
  },
  profileOrb: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  profileOrbText: {
    fontFamily: "Urbanist_800ExtraBold",
    fontWeight: "800",
    fontSize: 15,
  },
  profileOrbBadge: {
    position: "absolute",
    right: -6,
    bottom: -6,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  totalStrip: {
    marginTop: 17,
    marginBottom: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontFamily: "Urbanist_700Bold",
    fontWeight: "700",
    fontSize: 11,
    marginBottom: 2,
  },
  roundBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#121a2d",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  walletStack: {
    position: "relative",
    height: 336,
    marginTop: 10,
  },
  stackAddLayer: {
    position: "absolute",
    zIndex: 0,
    top: 0,
    left: 34,
    right: 34,
    height: 112,
  },
  stackThirdFolderLayer: {
    position: "absolute",
    zIndex: 2,
    top: 40,
    left: 0,
    right: 0,
  },
  stackPeekLayer: {
    position: "absolute",
    zIndex: 3,
    top: 84,
    left: 13,
    right: 13,
    height: 112,
  },
  stackPeekFolderLayer: {
    position: "absolute",
    zIndex: 3,
    top: 84,
    left: 0,
    right: 0,
  },
  stackFrontLayer: {
    position: "absolute",
    zIndex: 4,
    top: 130,
    left: 0,
    right: 0,
  },
  stackLabelRow: {
    position: "absolute",
    left: 20,
    top: 0,
    maxWidth: "55%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 3,
  },
  stackAddText: {
    fontFamily: "Urbanist_800ExtraBold",
    fontWeight: "800",
    fontSize: 14,
  },
  stackNotchSlot: {
    position: "absolute",
    top: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 6,
  },
  peekLogo: {
    width: 30,
    height: 30,
    borderRadius: 11,
    backgroundColor: "rgba(255, 255, 255, 0.28)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  peekLogoText: {
    fontFamily: "Urbanist_800ExtraBold",
    fontWeight: "900",
    fontSize: 9.5,
  },
  peekName: {
    fontFamily: "Urbanist_800ExtraBold",
    fontWeight: "900",
    fontStyle: "italic",
    fontSize: 15,
  },
  stackDots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 6,
    borderRadius: 3,
  },
  actionGrid: {
    flexDirection: "row",
    gap: 9,
  },
  section: {
    marginTop: 26,
  },
  txList: {
    gap: 10,
  },
  walletsTotal: {
    alignItems: "center",
    marginBottom: 22,
  },
  walletsTotalSub: {
    fontFamily: "Urbanist_700Bold",
    fontWeight: "700",
    fontSize: 12,
  },
  syncBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  syncBadgeText: {
    fontFamily: "Urbanist_700Bold",
    fontWeight: "700",
    fontSize: 11,
  },
  walletList: {
    gap: 9,
  },
  walletTile: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: "#121a2d",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
  },
  tileBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  tileBadgeText: {
    fontFamily: "Urbanist_800ExtraBold",
    fontWeight: "900",
    fontSize: 11,
  },
  tileMain: {
    flex: 1,
    gap: 2,
  },
  tileName: {
    fontFamily: "Urbanist_700Bold",
    fontWeight: "700",
    fontSize: 14,
  },
  tileSub: {
    fontFamily: "Urbanist_600SemiBold",
    fontWeight: "600",
    fontSize: 11,
  },
  tileValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  spendingHead: {
    alignItems: "center",
    marginTop: -4,
    marginBottom: 6,
  },
  rangePill: {
    position: "absolute",
    top: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingLeft: 6,
  },
  rangePillText: {
    color: "#ffffff",
    fontFamily: "Urbanist_800ExtraBold",
    fontWeight: "800",
    fontSize: 11,
  },
  chartBody: {
    height: 232,
    paddingTop: 64,
    paddingBottom: 14,
    paddingLeft: 46,
    paddingRight: 16,
  },
  chartGrid: {
    position: "absolute",
    top: 64,
    bottom: 34,
    left: 15,
    right: 15,
    justifyContent: "space-between",
  },
  chartGridLine: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
    paddingBottom: 2,
  },
  chartGridText: {
    color: "rgba(255, 255, 255, 0.45)",
    fontSize: 9,
    fontFamily: "Urbanist_600SemiBold",
  },
  barsContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    paddingBottom: 20,
  },
  barGroup: {
    height: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  barPair: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
  },
  bar: {
    width: 9,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  barLabel: {
    position: "absolute",
    bottom: -18,
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 9,
    fontFamily: "Urbanist_600SemiBold",
  },
  flowCards: {
    flexDirection: "row",
    gap: 10,
    marginTop: 15,
    marginBottom: 25,
  },
  flowCard: {
    position: "relative",
    overflow: "hidden",
    flex: 1,
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    padding: 13,
    borderRadius: 18,
  },
  flowCardBevel: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 18,
    borderTopWidth: 1.5,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1.5,
    borderTopColor: "rgba(255, 255, 255, 0.45)",
    borderLeftColor: "rgba(255, 255, 255, 0.25)",
    borderRightColor: "rgba(18, 26, 45, 0.08)",
    borderBottomColor: "rgba(18, 26, 45, 0.12)",
  },
  flowIconBox: {
    width: 35,
    height: 35,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.38)",
    alignItems: "center",
    justifyContent: "center",
  },
  flowLabel: {
    color: "#172442",
    fontFamily: "Urbanist_700Bold",
    fontWeight: "700",
    fontSize: 10,
  },
  flowValue: {
    color: "#172442",
    fontFamily: "Urbanist_800ExtraBold",
    fontWeight: "800",
    fontSize: 13,
    marginTop: 1,
  },
  categoryScroll: {
    gap: 10,
    paddingTop: 6,
    paddingBottom: 20,
    paddingHorizontal: 2,
  },
  categoryCardWrapper: {
    width: 120,
    height: 108,
  },
  categoryContent: {
    height: 108,
    justifyContent: "flex-end",
    paddingHorizontal: 13,
    paddingBottom: 13,
  },
  categoryIconPos: {
    position: "absolute",
    top: 30,
    left: 13,
  },
  categoryLabel: {
    fontFamily: "Urbanist_700Bold",
    fontWeight: "700",
    fontSize: 10.5,
  },
  categoryAmount: {
    fontFamily: "Urbanist_800ExtraBold",
    fontWeight: "800",
    fontSize: 13,
    marginTop: 2,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 15,
    borderRadius: 24,
    marginBottom: 20,
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 5,
  },
  profileCardAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  profileCardInitials: {
    fontFamily: "Urbanist_800ExtraBold",
    fontWeight: "900",
    fontSize: 16,
  },
  profileCardName: {
    fontFamily: "Urbanist_800ExtraBold",
    fontWeight: "800",
    fontSize: 16,
  },
  profileCardSub: {
    fontFamily: "Urbanist_600SemiBold",
    fontWeight: "600",
    fontSize: 11,
    opacity: 0.78,
    marginTop: 2,
  },
  settingsGroup: {
    marginBottom: 19,
  },
  settingsGroupTitle: {
    fontFamily: "Urbanist_700Bold",
    fontWeight: "700",
    fontSize: 12,
    marginHorizontal: 4,
    marginBottom: 8,
  },
  settingsGroupBox: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#121a2d",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.11,
    shadowRadius: 14,
    elevation: 4,
  },
  settingRow: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  settingIconBox: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  rowMain: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontFamily: "Urbanist_700Bold",
    fontWeight: "700",
    fontSize: 13.5,
  },
  rowSub: {
    fontFamily: "Urbanist_600SemiBold",
    fontWeight: "600",
    fontSize: 11,
  },
  detailScreen: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 40,
  },
  detailActions: {
    flexDirection: "row",
    gap: 9,
    marginTop: 14,
    marginBottom: 25,
  },
  detailActionBtn: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    shadowColor: "#121a2d",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
  },
  detailActionText: {
    fontFamily: "Urbanist_800ExtraBold",
    fontWeight: "800",
    fontSize: 12.5,
  },
  emptyState: {
    paddingVertical: 34,
    paddingHorizontal: 25,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
  },
  emptyStateIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyStateTitle: {
    fontFamily: "Urbanist_700Bold",
    fontWeight: "700",
    fontSize: 16,
    marginTop: 12,
    marginBottom: 4,
  },
  emptyStateSub: {
    fontFamily: "Urbanist_600SemiBold",
    fontWeight: "600",
    fontSize: 12,
    textAlign: "center",
  },
});
