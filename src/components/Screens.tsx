import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  ActivityItem,
  getActivityDate,
  isActivityForWallet,
  isAdjustmentActivity,
  isExpenseActivity,
  isIncomeActivity,
  isTransferActivity,
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
  EdgeFade,
  SectionTitle,
  SwitchControl,
  ThemeColors,
  TopBar,
  TxRow,
} from "./SharedUI";
import { Amount, WalletFolder, WalletLogoBadge } from "./WalletFolder";

export function TabHeader({
  tab,
  profile,
  setTab,
  onAddWallet,
  onActivityFilter,
  activityFilterActive,
  theme,
}: {
  tab: Tab;
  profile: UserProfile;
  setTab: (t: Tab) => void;
  onAddWallet: () => void;
  onActivityFilter?: () => void;
  activityFilterActive?: boolean;
  theme: ThemeColors;
}) {
  const firstName = profile.fullName.split(" ")[0] || "Justin";

  if (tab === "home") {
    return (
      <View style={styles.fixedHomeHeader}>
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
      </View>
    );
  }

  return (
    <View style={styles.fixedTopBarHeader}>
      {tab === "wallets" && (
        <TopBar
          title="My Wallets"
          theme={theme}
          noMargin
          right={
            <Pressable
              onPress={onAddWallet}
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
      )}
      {tab === "activity" && (
        <TopBar
          title="Activity"
          theme={theme}
          noMargin
          right={
            <Pressable
              onPress={onActivityFilter}
              style={({ pressed }) => [
                styles.roundBtn,
                {
                  backgroundColor: activityFilterActive
                    ? theme.accentSoft
                    : theme.card,
                  transform: [{ scale: pressed ? 0.94 : 1 }],
                },
                bevelStyle(theme.dark),
                cardShadow(theme.dark),
              ]}
            >
              <Icon
                name="more"
                size={20}
                color={activityFilterActive ? theme.accentText : theme.ink}
              />
            </Pressable>
          }
        />
      )}
      {tab === "settings" && <TopBar title="Settings" theme={theme} noMargin />}
    </View>
  );
}

export function HomeScreen({
  wallets,
  activities,
  total,
  hidden,
  setHidden,
  onWallet,
  onTransaction,
  onSheet,
  setTab,
  onStackDragChange,
  theme,
}: {
  wallets: Wallet[];
  activities: ActivityItem[];
  total: number;
  hidden: boolean;
  setHidden: (v: boolean) => void;
  onWallet: (w: Wallet) => void;
  onTransaction?: (item: ActivityItem) => void;
  onSheet: (s: Sheet, w?: Wallet) => void;
  setTab: (t: Tab) => void;
  onStackDragChange?: (dragging: boolean) => void;
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
          title="Recent transactions"
          action="View all"
          actionIcon="chevron"
          actionColor={theme.accentText}
          onPress={() => setTab("activity")}
          theme={theme}
        />
        <View style={styles.txList}>
          {activities.slice(0, 10).map((item) => (
            <TxRow
              key={item.id}
              item={item}
              hidden={hidden}
              onPress={onTransaction ? () => onTransaction(item) : undefined}
              theme={theme}
            />
          ))}
        </View>
        {activities.length > 10 ? (
          <Pressable
            onPress={() => setTab("activity")}
            style={({ pressed }) => [
              styles.viewAllBtn,
              {
                backgroundColor: theme.card,
                transform: [{ scale: pressed ? 0.985 : 1 }],
              },
              bevelStyle(theme.dark),
              cardShadow(theme.dark),
            ]}
          >
            <Text style={[styles.viewAllText, { color: theme.accentText }]}>
              View all transactions ({activities.length})
            </Text>
            <Icon name="chevron" size={15} color={theme.accentText} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const WALLET_TILE_HEIGHT = 80;
const WALLET_TILE_GAP = 9;
const WALLET_SLOT_HEIGHT = WALLET_TILE_HEIGHT + WALLET_TILE_GAP;

export function WalletsScreen({
  wallets,
  total,
  hidden,
  onWallet,
  onReorderWallets,
  onAddWallet,
  onDragChange,
  isCloudSynced,
  theme,
}: {
  wallets: Wallet[];
  total: number;
  hidden: boolean;
  onWallet: (w: Wallet) => void;
  onReorderWallets?: (next: Wallet[]) => void;
  onAddWallet?: () => void;
  onDragChange?: (dragging: boolean) => void;
  isCloudSynced: boolean;
  theme: ThemeColors;
}) {
  const [reordering, setReordering] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const dragOffsetY = useRef(new Animated.Value(0)).current;
  const liftAnim = useRef(new Animated.Value(0)).current;
  const shiftMapRef = useRef<Map<number, Animated.Value>>(new Map());
  const dragIndexRef = useRef<number | null>(null);
  const hoverIndexRef = useRef<number | null>(null);
  const isDroppingRef = useRef(false);
  const reorderingRef = useRef(reordering);
  reorderingRef.current = reordering;
  const walletsRef = useRef(wallets);
  walletsRef.current = wallets;

  const getShiftAnim = (id: number) => {
    let anim = shiftMapRef.current.get(id);
    if (!anim) {
      anim = new Animated.Value(0);
      shiftMapRef.current.set(id, anim);
    }
    return anim;
  };

  useLayoutEffect(() => {
    dragOffsetY.setValue(0);
    liftAnim.setValue(0);
    dragIndexRef.current = null;
    hoverIndexRef.current = null;
    isDroppingRef.current = false;
    setDragIndex(null);
    setHoverIndex(null);
    for (const anim of shiftMapRef.current.values()) {
      anim.setValue(0);
    }
  }, [wallets, dragOffsetY, liftAnim]);

  useEffect(() => {
    if (dragIndex === null || hoverIndex === null) return;
    wallets.forEach((w, idx) => {
      if (idx === dragIndex) return;
      let targetShift = 0;
      if (dragIndex < hoverIndex && idx > dragIndex && idx <= hoverIndex) {
        targetShift = -WALLET_SLOT_HEIGHT;
      } else if (dragIndex > hoverIndex && idx >= hoverIndex && idx < dragIndex) {
        targetShift = WALLET_SLOT_HEIGHT;
      }
      Animated.spring(getShiftAnim(w.id), {
        toValue: targetShift,
        useNativeDriver: true,
        speed: 26,
        bounciness: 4,
      }).start();
    });
  }, [dragIndex, hoverIndex, wallets]);

  const startDrag = (index: number) => {
    if (isDroppingRef.current || !onReorderWallets || walletsRef.current.length <= 1) {
      return;
    }
    dragIndexRef.current = index;
    hoverIndexRef.current = index;
    setDragIndex(index);
    setHoverIndex(index);
    dragOffsetY.setValue(0);
    onDragChange?.(true);
    Animated.spring(liftAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 28,
      bounciness: 6,
    }).start();
  };

  const updateDrag = (dy: number) => {
    const startIdx = dragIndexRef.current;
    if (startIdx === null || isDroppingRef.current) return;
    const list = walletsRef.current;
    const minDy = -startIdx * WALLET_SLOT_HEIGHT;
    const maxDy = (list.length - 1 - startIdx) * WALLET_SLOT_HEIGHT;
    const clampedDy = Math.max(minDy, Math.min(maxDy, dy));
    dragOffsetY.setValue(clampedDy);

    const nextHover = Math.max(
      0,
      Math.min(
        list.length - 1,
        Math.round(startIdx + clampedDy / WALLET_SLOT_HEIGHT)
      )
    );
    if (nextHover !== hoverIndexRef.current) {
      hoverIndexRef.current = nextHover;
      setHoverIndex(nextHover);
    }
  };

  const finishDrag = () => {
    const startIdx = dragIndexRef.current;
    const endIdx = hoverIndexRef.current;
    onDragChange?.(false);
    if (startIdx === null || endIdx === null || isDroppingRef.current) return;
    isDroppingRef.current = true;

    const snapDelta = (endIdx - startIdx) * WALLET_SLOT_HEIGHT;
    Animated.parallel([
      Animated.spring(dragOffsetY, {
        toValue: snapDelta,
        useNativeDriver: true,
        speed: 30,
        bounciness: 4,
      }),
      Animated.spring(liftAnim, {
        toValue: 0,
        useNativeDriver: true,
        speed: 30,
        bounciness: 4,
      }),
    ]).start(() => {
      const list = walletsRef.current;
      if (startIdx !== endIdx && onReorderWallets && startIdx < list.length && endIdx < list.length) {
        const next = [...list];
        const [moved] = next.splice(startIdx, 1);
        next.splice(endIdx, 0, moved);
        onReorderWallets(next);
      } else {
        dragOffsetY.setValue(0);
        liftAnim.setValue(0);
        dragIndexRef.current = null;
        hoverIndexRef.current = null;
        isDroppingRef.current = false;
        setDragIndex(null);
        setHoverIndex(null);
        for (const anim of shiftMapRef.current.values()) {
          anim.setValue(0);
        }
      }
    });
  };

  const startDragRef = useRef(startDrag);
  startDragRef.current = startDrag;
  const updateDragRef = useRef(updateDrag);
  updateDragRef.current = updateDrag;
  const finishDragRef = useRef(finishDrag);
  finishDragRef.current = finishDrag;

  const rowPanResponders = useMemo(
    () =>
      Array.from({ length: wallets.length }, (_, index) =>
        PanResponder.create({
          onStartShouldSetPanResponder: () =>
            reorderingRef.current && !isDroppingRef.current,
          onStartShouldSetPanResponderCapture: () =>
            reorderingRef.current && !isDroppingRef.current,
          onMoveShouldSetPanResponder: () =>
            reorderingRef.current && !isDroppingRef.current,
          onMoveShouldSetPanResponderCapture: () =>
            reorderingRef.current && !isDroppingRef.current,
          onPanResponderTerminationRequest: () => false,
          onPanResponderGrant: () => {
            startDragRef.current(index);
          },
          onPanResponderMove: (_evt, g) => {
            updateDragRef.current(g.dy);
          },
          onPanResponderRelease: () => {
            finishDragRef.current();
          },
          onPanResponderTerminate: () => {
            finishDragRef.current();
          },
        })
      ),
    [wallets.length]
  );

  return (
    <View style={styles.page}>
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
            {wallets.length} {wallets.length === 1 ? "wallet" : "wallets"}
          </Text>
        </View>
      </View>

      {wallets.length > 1 && onReorderWallets ? (
        <SectionTitle
          title={reordering ? "Drag to reorder" : "Your wallets"}
          action={reordering ? "Done" : "Reorder"}
          actionIcon={reordering ? "check" : "grip"}
          actionColor={theme.accentText}
          onPress={() => {
            if (dragIndexRef.current !== null) return;
            setReordering((prev) => !prev);
          }}
          theme={theme}
        />
      ) : null}

      {wallets.length === 0 ? (
        <View
          style={[
            styles.emptyState,
            { backgroundColor: theme.card },
            bevelStyle(theme.dark),
            cardShadow(theme.dark),
          ]}
        >
          <LinearGradient
            colors={theme.accentGradient}
            style={styles.emptyStateIcon}
          >
            <Icon name="wallet" size={22} color={theme.accentInk} />
          </LinearGradient>
          <Text style={[styles.emptyStateTitle, { color: theme.ink }]}>
            No wallets yet
          </Text>
          <Text style={[styles.emptyStateSub, { color: theme.muted }]}>
            Tap below to add your first e-wallet, bank, or cash card.
          </Text>
          {onAddWallet ? (
            <Pressable
              onPress={onAddWallet}
              style={[
                styles.viewAllBtn,
                {
                  backgroundColor: theme.accentSoft,
                  paddingHorizontal: 18,
                  marginTop: 14,
                },
              ]}
            >
              <Icon name="plus" size={15} color={theme.accentText} />
              <Text style={[styles.viewAllText, { color: theme.accentText }]}>
                Add wallet
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={styles.walletList}>
          {wallets.map((wallet, idx) => {
            const pal = tonePalette[wallet.tone] || tonePalette.blue;
            const isDragged = dragIndex === idx;
            const shiftAnim = getShiftAnim(wallet.id);
            const rowPan = rowPanResponders[idx];

            return (
              <Animated.View
                key={wallet.id}
                style={[
                  {
                    zIndex: isDragged ? 20 : 1,
                    transform: [
                      { translateY: isDragged ? dragOffsetY : shiftAnim },
                      {
                        scale: isDragged
                          ? liftAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [1, 1.03],
                            })
                          : 1,
                      },
                    ],
                  },
                ]}
              >
                <Pressable
                  onPress={reordering ? undefined : () => onWallet(wallet)}
                  style={({ pressed }) => [
                    styles.walletTile,
                    {
                      height: WALLET_TILE_HEIGHT,
                      backgroundColor: theme.card,
                      borderColor: isDragged ? theme.accent : undefined,
                      transform: [
                        { scale: !reordering && pressed ? 0.985 : 1 },
                      ],
                    },
                    bevelStyle(theme.dark),
                    cardShadow(theme.dark),
                    isDragged && {
                      borderColor: theme.accent,
                      shadowOpacity: theme.dark ? 0.55 : 0.24,
                      shadowRadius: 20,
                      elevation: 12,
                    },
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

                  {reordering ? (
                    <View
                      {...(rowPan ? rowPan.panHandlers : {})}
                      style={styles.dragHandleHitArea}
                    >
                      <View
                        style={[
                          styles.dragHandleBox,
                          {
                            backgroundColor: isDragged
                              ? theme.accentSoft
                              : theme.soft,
                          },
                        ]}
                      >
                        <Icon
                          name="grip"
                          size={18}
                          color={isDragged ? theme.accentText : theme.muted}
                        />
                      </View>
                    </View>
                  ) : (
                    <View style={styles.tileValueRow}>
                      <Amount
                        value={wallet.balance}
                        hidden={hidden}
                        size="sm"
                        color={theme.ink}
                      />
                      <Icon name="chevron" size={16} color={theme.muted} />
                    </View>
                  )}
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      )}
    </View>
  );
}

type ActivityTypeFilter = "All" | "Expenses" | "Income" | "Transfers" | "Adjusted";

const DEFAULT_EXPENSE_CATEGORIES: { label: string; icon: string }[] = [
  { label: "Food", icon: "cup" },
  { label: "Bills", icon: "bolt" },
  { label: "Shopping", icon: "bag" },
  { label: "Transport", icon: "car" },
  { label: "Health", icon: "heart" },
  { label: "Transfers", icon: "swap" },
];

const DEFAULT_INCOME_CATEGORIES: { label: string; icon: string }[] = [
  { label: "Salary", icon: "briefcase" },
  { label: "Freelance", icon: "phone" },
  { label: "Gift", icon: "gift" },
  { label: "Refund", icon: "arrow-down" },
  { label: "Other", icon: "plus" },
];

export function ActivityScreen({
  activities,
  wallets = [],
  hidden,
  onTransaction,
  onShowToast,
  showFilters = false,
  theme,
}: {
  activities: ActivityItem[];
  wallets?: Wallet[];
  hidden: boolean;
  onTransaction?: (item: ActivityItem) => void;
  onShowToast?: (msg: string) => void;
  showFilters?: boolean;
  theme: ThemeColors;
}) {
  const [range, setRange] = useState<"Month" | "Week">("Month");
  const [categoryMode, setCategoryMode] = useState<"Expense" | "Income">("Expense");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedWalletFilter, setSelectedWalletFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<ActivityTypeFilter>("All");
  const [selectedBucketIdx, setSelectedBucketIdx] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const barProgress = useRef(new Animated.Value(0)).current;

  const filteredActivities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return activities.filter((item) => {
      if (typeFilter === "Expenses" && !isExpenseActivity(item)) return false;
      if (typeFilter === "Income" && !isIncomeActivity(item)) return false;
      if (typeFilter === "Transfers" && !isTransferActivity(item)) return false;
      if (typeFilter === "Adjusted" && !isAdjustmentActivity(item)) return false;

      if (selectedCategory) {
        if (selectedCategory === "Transfers") {
          if (!isTransferActivity(item)) return false;
        } else if (item.kind !== selectedCategory) {
          return false;
        }
      }

      if (selectedWalletFilter) {
        const matchedW = wallets.find(
          (w) => (w.localId || `wallet-${w.id}`) === selectedWalletFilter
        );
        if (matchedW) {
          if (!isActivityForWallet(item, matchedW).matched) return false;
        } else if (item.walletLocalId !== selectedWalletFilter) {
          return false;
        }
      }

      if (q) {
        const haystack =
          `${item.title} ${item.wallet} ${item.kind} ${item.date}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [
    activities,
    wallets,
    typeFilter,
    selectedCategory,
    selectedWalletFilter,
    searchQuery,
  ]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredActivities.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageEnd = Math.min(filteredActivities.length, pageStart + pageSize);
  const pageItems = filteredActivities.slice(pageStart, pageEnd);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    barProgress.setValue(0);
    Animated.timing(barProgress, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [range, barProgress, activities.length]);

  const visiblePages = useMemo<(number | "dots-l" | "dots-r")[]>(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const list: (number | "dots-l" | "dots-r")[] = [1];
    if (safePage > 3) list.push("dots-l");
    const start = Math.max(2, safePage - 1);
    const end = Math.min(totalPages - 1, safePage + 1);
    for (let p = start; p <= end; p++) list.push(p);
    if (safePage < totalPages - 2) list.push("dots-r");
    list.push(totalPages);
    return list;
  }, [safePage, totalPages]);

  const totalOut = useMemo(
    () =>
      activities
        .filter(isExpenseActivity)
        .reduce((sum, a) => sum + Math.abs(a.amount), 0),
    [activities]
  );

  const totalIn = useMemo(
    () =>
      activities
        .filter(isIncomeActivity)
        .reduce((sum, a) => sum + a.amount, 0),
    [activities]
  );

  const chartData = useMemo(() => {
    const now = new Date();
    const buckets: { key: string; label: string; income: number; expense: number }[] = [];

    if (range === "Month") {
      for (let offset = 5; offset >= 0; offset--) {
        const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        const label = d.toLocaleDateString("en-US", { month: "short" });
        buckets.push({ key, label, income: 0, expense: 0 });
      }
      for (const item of activities) {
        if (!isIncomeActivity(item) && !isExpenseActivity(item)) continue;
        const d = getActivityDate(item, now);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        const bucket = buckets.find((b) => b.key === key);
        if (!bucket) continue;
        if (isIncomeActivity(item)) bucket.income += item.amount;
        else bucket.expense += Math.abs(item.amount);
      }
    } else {
      for (let offset = 5; offset >= 0; offset--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        const label =
          offset === 0
            ? "Today"
            : d.toLocaleDateString("en-US", { weekday: "short" });
        buckets.push({ key, label, income: 0, expense: 0 });
      }
      for (const item of activities) {
        if (!isIncomeActivity(item) && !isExpenseActivity(item)) continue;
        const d = getActivityDate(item, now);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        const bucket = buckets.find((b) => b.key === key);
        if (!bucket) continue;
        if (isIncomeActivity(item)) bucket.income += item.amount;
        else bucket.expense += Math.abs(item.amount);
      }
    }

    const rawMax = Math.max(
      0,
      ...buckets.map((b) => Math.max(b.income, b.expense))
    );
    const stepBase = rawMax <= 3000 ? 1000 : rawMax <= 15000 ? 5000 : 10000;
    const yMax = Math.max(3000, Math.ceil(rawMax / (stepBase * 3)) * (stepBase * 3));
    const gridLabels = [
      money(yMax, true),
      money((yMax * 2) / 3, true),
      money(yMax / 3, true),
      "₱0",
    ];
    const bars = buckets.map((b) => ({
      ...b,
      inPct: b.income > 0 ? Math.max(5, Math.round((b.income / yMax) * 100)) : 0,
      outPct: b.expense > 0 ? Math.max(5, Math.round((b.expense / yMax) * 100)) : 0,
    }));
    return { gridLabels, bars };
  }, [activities, range]);

  const categoryCards = useMemo(() => {
    const totals = new Map<string, { icon: string; label: string; amount: number }>();

    if (categoryMode === "Expense") {
      for (const def of DEFAULT_EXPENSE_CATEGORIES) {
        totals.set(def.label, { icon: def.icon, label: def.label, amount: 0 });
      }
      for (const item of activities) {
        if (isTransferActivity(item)) {
          const cur = totals.get("Transfers")!;
          cur.amount += Math.abs(item.amount);
        } else if (isExpenseActivity(item)) {
          const label = item.kind || "Other";
          const existing = totals.get(label);
          if (existing) {
            existing.amount += Math.abs(item.amount);
          } else {
            totals.set(label, {
              icon: item.icon || "bag",
              label,
              amount: Math.abs(item.amount),
            });
          }
        }
      }
    } else {
      for (const def of DEFAULT_INCOME_CATEGORIES) {
        totals.set(def.label, { icon: def.icon, label: def.label, amount: 0 });
      }
      for (const item of activities) {
        if (isIncomeActivity(item)) {
          const label = item.kind || "Other";
          const existing = totals.get(label);
          if (existing) {
            existing.amount += item.amount;
          } else {
            totals.set(label, {
              icon: item.icon || "arrow-down",
              label,
              amount: item.amount,
            });
          }
        }
      }
    }

    return Array.from(totals.values()).sort((a, b) => b.amount - a.amount);
  }, [activities, categoryMode]);

  const activeBucket =
    selectedBucketIdx !== null ? chartData.bars[selectedBucketIdx] : undefined;
  const hasFilter =
    typeFilter !== "All" ||
    selectedCategory !== null ||
    selectedWalletFilter !== null ||
    searchQuery.trim().length > 0;

  const handleExportCsv = async () => {
    if (!filteredActivities.length) {
      onShowToast?.("No transactions to export");
      return;
    }
    const esc = (v: string | number) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = "Date,Title,Wallet,Category,Direction,Amount,Synced";
    const rows = filteredActivities.map((item) => {
      const dateStr = item.occurredAt || item.date;
      const dir = isTransferActivity(item)
        ? "Transfer"
        : item.amount >= 0
          ? "Money in"
          : "Expense";
      return [
        esc(dateStr),
        esc(item.title),
        esc(item.wallet),
        esc(item.kind),
        esc(dir),
        esc(item.amount.toFixed(2)),
        esc(item.synced ? "Supabase" : "Local"),
      ].join(",");
    });
    const csv = [header, ...rows].join("\n");

    try {
      if (Platform.OS === "web" && typeof document !== "undefined") {
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const stamp = new Date().toISOString().slice(0, 10);
        link.href = url;
        link.download = `my-wallet-activity-${stamp}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        onShowToast?.(`Exported ${filteredActivities.length} transactions`);
        return;
      }
      await Share.share({
        title: "My Wallet Activity (CSV)",
        message: csv,
      });
    } catch {
      onShowToast?.("Could not share CSV export");
    }
  };

  return (
    <View style={styles.page}>
      <View style={styles.spendingHead}>
        <Text style={[styles.walletsTotalSub, { color: theme.muted }]}>
          Total spending
        </Text>
        <Amount
          value={totalOut}
          hidden={hidden}
          size="lg"
          color={theme.ink}
        />
      </View>

      {showFilters ? (
        <View
          style={[
            styles.activityFilterPanel,
            { backgroundColor: theme.card, borderColor: theme.line },
            bevelStyle(theme.dark),
            cardShadow(theme.dark),
          ]}
        >
          <View style={styles.activityFilterHeader}>
            <Text style={[styles.activityFilterTitle, { color: theme.muted }]}>
              FILTER & EXPORT
            </Text>
            <Pressable
              onPress={handleExportCsv}
              style={({ pressed }) => [
                styles.exportCsvPill,
                {
                  backgroundColor: theme.accentSoft,
                  opacity: pressed ? 0.78 : 1,
                },
              ]}
            >
              <Icon name="arrow-out" size={12} color={theme.accentText} />
              <Text
                style={[styles.exportCsvText, { color: theme.accentText }]}
              >
                Export CSV ({filteredActivities.length})
              </Text>
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChipRow}
          >
            {(["All", "Expenses", "Income", "Transfers", "Adjusted"] as const).map(
              (opt) => {
                const active = typeFilter === opt;
                return (
                  <Pressable
                    key={opt}
                    onPress={() => {
                      setTypeFilter(opt);
                      setPage(1);
                    }}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: active ? theme.accent : theme.soft,
                        borderColor: active ? theme.accent : theme.line,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        { color: active ? theme.accentInk : theme.ink },
                      ]}
                    >
                      {opt}
                    </Text>
                  </Pressable>
                );
              }
            )}
          </ScrollView>

          {wallets.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.filterChipRow, { paddingTop: 8 }]}
            >
              <Pressable
                onPress={() => {
                  setSelectedWalletFilter(null);
                  setPage(1);
                }}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor:
                      selectedWalletFilter === null ? theme.accent : theme.soft,
                    borderColor:
                      selectedWalletFilter === null ? theme.accent : theme.line,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color:
                        selectedWalletFilter === null
                          ? theme.accentInk
                          : theme.ink,
                    },
                  ]}
                >
                  All wallets
                </Text>
              </Pressable>
              {wallets.map((w) => {
                const wKey = w.localId || `wallet-${w.id}`;
                const active = selectedWalletFilter === wKey;
                return (
                  <Pressable
                    key={w.id}
                    onPress={() => {
                      setSelectedWalletFilter(active ? null : wKey);
                      setPage(1);
                    }}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: active ? theme.accent : theme.soft,
                        borderColor: active ? theme.accent : theme.line,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        { color: active ? theme.accentInk : theme.ink },
                      ]}
                    >
                      {w.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}
        </View>
      ) : null}

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
              {/* Chart Legend / Selected Bucket Summary in Folder Tab */}
              <View style={[styles.chartTabLegend, { height: 42 }]}>
                {activeBucket ? (
                  <Text style={styles.chartTabSummary} numberOfLines={1}>
                    {activeBucket.label}: +
                    {hidden ? "••" : money(activeBucket.income, true)} / -
                    {hidden ? "••" : money(activeBucket.expense, true)}
                  </Text>
                ) : (
                  <View style={styles.chartLegendPills}>
                    <View style={styles.chartLegendItem}>
                      <View
                        style={[
                          styles.chartLegendDot,
                          { backgroundColor: "#f5c414" },
                        ]}
                      />
                      <Text style={styles.chartLegendText}>Money in</Text>
                    </View>
                    <View style={styles.chartLegendItem}>
                      <View
                        style={[
                          styles.chartLegendDot,
                          { backgroundColor: "#60a5fa" },
                        ]}
                      />
                      <Text style={styles.chartLegendText}>Spending</Text>
                    </View>
                  </View>
                )}
              </View>

              <Pressable
                onPress={() => {
                  setSelectedBucketIdx(null);
                  setRange(range === "Month" ? "Week" : "Month");
                }}
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
                  {chartData.gridLabels.map((lvl, idx) => (
                    <View key={`${idx}-${lvl}`} style={styles.chartGridLine}>
                      <Text style={styles.chartGridText}>{lvl}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.barsContainer}>
                  {chartData.bars.map((b, i) => {
                    const isSelected = selectedBucketIdx === i;
                    return (
                      <Pressable
                        key={b.key}
                        onPress={() =>
                          setSelectedBucketIdx(isSelected ? null : i)
                        }
                        style={[
                          styles.barGroup,
                          isSelected && styles.barGroupActive,
                        ]}
                      >
                        <View style={styles.barPair}>
                          <Animated.View
                            style={[
                              styles.bar,
                              {
                                height: barProgress.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: ["0%", `${b.inPct}%`],
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
                                  outputRange: ["0%", `${b.outPct}%`],
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
                        <Text
                          style={[
                            styles.barLabel,
                            isSelected && { color: "#ffffff", fontWeight: "800" },
                          ]}
                        >
                          {b.label}
                        </Text>
                      </Pressable>
                    );
                  })}
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
              {hidden ? "••••" : money(totalIn)}
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
              {hidden ? "••••" : money(totalOut)}
            </Text>
          </View>
        </LinearGradient>
      </View>

      {/* Categories Horizontal Folder Cards */}
      <SectionTitle
        title="Categories"
        action={categoryMode}
        actionColor={theme.accentText}
        onPress={() => {
          setCategoryMode((prev) => (prev === "Expense" ? "Income" : "Expense"));
          setSelectedCategory(null);
          setPage(1);
        }}
        theme={theme}
      />
      <View style={{ position: "relative", marginHorizontal: -18 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.categoryScroll,
            { paddingHorizontal: 18 },
          ]}
        >
          {categoryCards.map(({ icon, label, amount }) => {
            const active = selectedCategory === label;
            return (
              <Pressable
                key={label}
                onPress={() => {
                  setSelectedCategory(active ? null : label);
                  setPage(1);
                }}
                style={({ pressed }) => [
                  styles.categoryCardWrapper,
                  pressed ? { transform: [{ scale: 0.97 }] } : null,
                ]}
              >
                <FolderSurface
                  tab={0.58}
                  tabHeight={18}
                  radius={20}
                  fromColor={
                    active
                      ? theme.accentGradient[0]
                      : theme.dark
                        ? "#1b2531"
                        : theme.card
                  }
                  toColor={
                    active
                      ? theme.accentGradient[1]
                      : theme.dark
                        ? "#121922"
                        : "#edf3fc"
                  }
                  minHeight={108}
                >
                  <View style={styles.categoryContent}>
                    <View style={styles.categoryIconPos}>
                      <Icon
                        name={icon}
                        size={20}
                        color={active ? theme.accentInk : theme.accentText}
                      />
                    </View>
                    <Text
                      style={[
                        styles.categoryLabel,
                        { color: active ? theme.accentInk : theme.muted },
                      ]}
                      numberOfLines={1}
                    >
                      {label}
                    </Text>
                    <Text
                      style={[
                        styles.categoryAmount,
                        { color: active ? theme.accentInk : theme.ink },
                      ]}
                      numberOfLines={1}
                    >
                      {hidden ? "••••" : money(amount)}
                    </Text>
                  </View>
                </FolderSurface>
              </Pressable>
            );
          })}
        </ScrollView>
        <EdgeFade
          position="left"
          color={theme.dark ? "#0b1018" : "#e4edf8"}
          size={18}
        />
        <EdgeFade
          position="right"
          color={theme.dark ? "#0b1018" : "#e4edf8"}
          size={18}
        />
      </View>

      {/* All Transactions List (10 per page) */}
      <View style={styles.section}>
        <SectionTitle
          title={
            selectedCategory
              ? `${selectedCategory} transactions`
              : typeFilter !== "All"
                ? `${typeFilter}`
                : "All transactions"
          }
          action={
            hasFilter
              ? "Clear filter"
              : filteredActivities.length
                ? `${pageStart + 1}–${pageEnd} of ${filteredActivities.length}`
                : undefined
          }
          actionIcon={hasFilter ? "close" : null}
          actionColor={hasFilter ? theme.accentText : undefined}
          onPress={
            hasFilter
              ? () => {
                  setSelectedCategory(null);
                  setSelectedWalletFilter(null);
                  setSearchQuery("");
                  setTypeFilter("All");
                  setPage(1);
                }
              : undefined
          }
          theme={theme}
        />

        {/* Always-accessible Search Bar */}
        <View
          style={[
            styles.activitySearchBox,
            { backgroundColor: theme.card, borderColor: theme.line },
            bevelStyle(theme.dark),
            cardShadow(theme.dark),
          ]}
        >
          <Icon name="search" size={16} color={theme.muted} />
          <TextInput
            value={searchQuery}
            onChangeText={(t) => {
              setSearchQuery(t);
              setPage(1);
            }}
            placeholder="Search merchant, category, or wallet..."
            placeholderTextColor={theme.muted}
            style={[styles.activitySearchInput, { color: theme.ink }]}
          />
          {searchQuery ? (
            <Pressable
              onPress={() => {
                setSearchQuery("");
                setPage(1);
              }}
              hitSlop={8}
            >
              <Icon name="close" size={14} color={theme.muted} />
            </Pressable>
          ) : null}
        </View>
        {pageItems.length ? (
          <View style={styles.txList}>
            {pageItems.map((item) => (
              <TxRow
                key={item.id}
                item={item}
                hidden={hidden}
                onPress={onTransaction ? () => onTransaction(item) : undefined}
                theme={theme}
              />
            ))}
          </View>
        ) : (
          <View
            style={[
              styles.emptyState,
              { backgroundColor: theme.card },
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
              No matching transactions
            </Text>
            <Text style={[styles.emptyStateSub, { color: theme.muted }]}>
              Try clearing the filter or add a new transaction.
            </Text>
          </View>
        )}

        {totalPages > 1 ? (
          <View style={styles.paginationBar}>
            <Pressable
              onPress={() => setPage(Math.max(1, safePage - 1))}
              disabled={safePage === 1}
              style={({ pressed }) => [
                styles.pageNavBtn,
                {
                  backgroundColor: theme.card,
                  opacity: safePage === 1 ? 0.4 : pressed ? 0.8 : 1,
                },
                bevelStyle(theme.dark),
                cardShadow(theme.dark),
              ]}
            >
              <Icon name="back" size={16} color={theme.ink} />
            </Pressable>

            <View style={styles.pageNumsRow}>
              {visiblePages.map((entry) => {
                if (entry === "dots-l" || entry === "dots-r") {
                  return (
                    <Text
                      key={entry}
                      style={[styles.pageDots, { color: theme.muted }]}
                    >
                      …
                    </Text>
                  );
                }
                const active = entry === safePage;
                if (active) {
                  return (
                    <LinearGradient
                      key={entry}
                      colors={theme.accentGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.pageNumBtn}
                    >
                      <Text
                        style={[
                          styles.pageNumText,
                          { color: theme.accentInk },
                        ]}
                      >
                        {entry}
                      </Text>
                    </LinearGradient>
                  );
                }
                return (
                  <Pressable
                    key={entry}
                    onPress={() => setPage(entry)}
                    style={({ pressed }) => [
                      styles.pageNumBtn,
                      {
                        backgroundColor: theme.card,
                        transform: [{ scale: pressed ? 0.94 : 1 }],
                      },
                      bevelStyle(theme.dark),
                      cardShadow(theme.dark),
                    ]}
                  >
                    <Text style={[styles.pageNumText, { color: theme.ink }]}>
                      {entry}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={() => setPage(Math.min(totalPages, safePage + 1))}
              disabled={safePage === totalPages}
              style={({ pressed }) => [
                styles.pageNavBtn,
                {
                  backgroundColor: theme.card,
                  opacity: safePage === totalPages ? 0.4 : pressed ? 0.8 : 1,
                },
                bevelStyle(theme.dark),
                cardShadow(theme.dark),
              ]}
            >
              <Icon name="chevron" size={16} color={theme.ink} />
            </Pressable>
          </View>
        ) : null}
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
  appLockEnabled,
  onToggleAppLock,
  onChangeAppLockPin,
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
  appLockEnabled: boolean;
  onToggleAppLock: () => void;
  onChangeAppLockPin: () => void;
  onOpenAuth: () => void;
  onSyncNow: () => void;
  theme: ThemeColors;
}) {
  return (
    <View style={styles.page}>
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
          subtitle={
            appLockEnabled
              ? "4-digit PIN active on launch & resume"
              : "Protect with a 4-digit PIN"
          }
          onPress={onToggleAppLock}
          control={
            <SwitchControl
              on={appLockEnabled}
              onPress={onToggleAppLock}
              theme={theme}
            />
          }
          theme={theme}
        />
        {appLockEnabled ? (
          <SettingRow
            icon="edit"
            title="Change PIN"
            subtitle="Update your 4-digit passcode"
            onPress={onChangeAppLockPin}
            theme={theme}
          />
        ) : null}
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
  onEdit,
  onTransaction,
  theme,
}: {
  wallet: Wallet;
  activities: ActivityItem[];
  hidden: boolean;
  onBack: () => void;
  onUpdate: () => void;
  onTransfer: () => void;
  onEdit: () => void;
  onTransaction?: (item: ActivityItem) => void;
  theme: ThemeColors;
}) {
  const [detailFilter, setDetailFilter] = useState<
    "Recent" | "Money in" | "Money out" | "Transfers"
  >("Recent");

  const related = useMemo(() => {
    return activities
      .map((item) => {
        const match = isActivityForWallet(item, wallet);
        if (!match.matched) return null;
        const displayItem: ActivityItem = match.isIncomingTransfer
          ? {
              ...item,
              amount: Math.abs(item.amount),
              kind: "Transfer in",
            }
          : item;
        return { original: item, display: displayItem, isIncomingTransfer: match.isIncomingTransfer };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
      .filter(({ display, original }) => {
        if (detailFilter === "Recent") return true;
        if (detailFilter === "Money in") return display.amount > 0;
        if (detailFilter === "Money out") return display.amount < 0;
        return isTransferActivity(original);
      });
  }, [activities, wallet, detailFilter]);

  const cycleDetailFilter = () => {
    const order: ("Recent" | "Money in" | "Money out" | "Transfers")[] = [
      "Recent",
      "Money in",
      "Money out",
      "Transfers",
    ];
    const nextIdx = (order.indexOf(detailFilter) + 1) % order.length;
    setDetailFilter(order[nextIdx]);
  };

  const slideAnim = useRef(new Animated.Value(0)).current;
  const detailScrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setDetailFilter("Recent");
    detailScrollY.setValue(0);
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [wallet.id, slideAnim, detailScrollY]);

  return (
    <Animated.View
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
    >
      <View style={styles.fixedTopBarHeader}>
        <TopBar
          title={wallet.name}
          onBack={onBack}
          theme={theme}
          noMargin
          right={
            <Pressable
              onPress={onEdit}
              style={[
                styles.roundBtn,
                {
                  backgroundColor: theme.card,
                },
                bevelStyle(theme.dark),
                cardShadow(theme.dark),
              ]}
            >
              <Icon name="edit" size={18} color={theme.ink} />
            </Pressable>
          }
        />
      </View>

      <View style={{ flex: 1 }}>
        <Animated.ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.detailScreen}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: detailScrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        >

      <WalletFolder wallet={wallet} hidden={hidden} onMenu={onEdit} />

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

      <SectionTitle
        title="Wallet activity"
        action={detailFilter}
        actionColor={detailFilter !== "Recent" ? theme.accentText : undefined}
        onPress={cycleDetailFilter}
        theme={theme}
      />

      {related.length ? (
        <View style={styles.txList}>
          {related.map(({ original, display }) => (
            <TxRow
              key={original.id}
              item={display}
              hidden={hidden}
              onPress={onTransaction ? () => onTransaction(original) : undefined}
              theme={theme}
            />
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
      <EdgeFade
        position="top"
        color={theme.dark ? "#17243a" : "#f6f9fd"}
        size={24}
        opacity={detailScrollY.interpolate({
          inputRange: [0, 16],
          outputRange: [0, 1],
          extrapolate: "clamp",
        })}
      />
      <EdgeFade
        position="bottom"
        color={theme.dark ? "#090d12" : "#dce6f5"}
        size={48}
      />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 105,
  },
  fixedHomeHeader: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 4,
  },
  fixedTopBarHeader: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 4,
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
    marginTop: 2,
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
  dragHandleHitArea: {
    width: 48,
    height: 56,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  dragHandleBox: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  spendingHead: {
    alignItems: "center",
    marginTop: -4,
    marginBottom: 6,
  },
  filterChipRow: {
    gap: 8,
    paddingTop: 4,
    paddingBottom: 2,
  },
  activityFilterPanel: {
    marginTop: 8,
    padding: 13,
    borderRadius: 20,
    borderWidth: 1,
  },
  activityFilterHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  activityFilterTitle: {
    fontFamily: "Urbanist_800ExtraBold",
    fontWeight: "800",
    fontSize: 10,
    letterSpacing: 0.6,
  },
  exportCsvPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 11,
  },
  exportCsvText: {
    fontFamily: "Urbanist_800ExtraBold",
    fontWeight: "800",
    fontSize: 11,
  },
  activitySearchBox: {
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 12,
  },
  activitySearchInput: {
    flex: 1,
    fontFamily: "Urbanist_600SemiBold",
    fontWeight: "600",
    fontSize: 13,
    paddingVertical: 0,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
  },
  filterChipText: {
    fontFamily: "Urbanist_700Bold",
    fontWeight: "700",
    fontSize: 12,
  },
  chartTabLegend: {
    position: "absolute",
    left: 18,
    top: 0,
    maxWidth: "56%",
    justifyContent: "center",
  },
  chartLegendPills: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  chartLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  chartLegendDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  chartLegendText: {
    color: "rgba(255, 255, 255, 0.78)",
    fontFamily: "Urbanist_700Bold",
    fontWeight: "700",
    fontSize: 10.5,
  },
  chartTabSummary: {
    color: "#ffffff",
    fontFamily: "Urbanist_700Bold",
    fontWeight: "700",
    fontSize: 10.5,
  },
  barGroupActive: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 8,
    paddingHorizontal: 5,
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
    paddingTop: 12,
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
  viewAllBtn: {
    marginTop: 12,
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  viewAllText: {
    fontFamily: "Urbanist_700Bold",
    fontWeight: "700",
    fontSize: 13,
  },
  paginationBar: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  pageNavBtn: {
    width: 38,
    height: 38,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pageNumsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  pageNumBtn: {
    minWidth: 36,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  pageNumText: {
    fontFamily: "Urbanist_800ExtraBold",
    fontWeight: "800",
    fontSize: 13,
  },
  pageDots: {
    fontFamily: "Urbanist_700Bold",
    fontWeight: "700",
    fontSize: 14,
    paddingHorizontal: 2,
  },
});
