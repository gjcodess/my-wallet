import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Defs, Pattern, Path, Rect } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ActivityItem,
  EXPENSE_CATEGORIES,
  getActivityDate,
  INCOME_CATEGORIES,
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
import { PhysicalWallet } from "./PhysicalWallet";
import {
  LEATHER_FINISHES,
  LeatherFinishId,
  AccentSurfaceGlow,
  ActionButton,
  bevelStyle,
  cardShadow,
  EdgeFade,
  heroControlStyle,
  SectionTitle,
  SwitchControl,
  ThemeColors,
  TxRow,
} from "./SharedUI";
import { Amount, WalletFolder, WalletLogoBadge } from "./WalletFolder";
import { Upcoming } from "./Schedules";
import type { DueSchedule } from "../types/schedule";
import type { CategoryLimits, MonthlySpending } from "../types/budget";
import { CategoryBudgetOverview } from "./CategoryBudgets";

const PITAKA_TITLE_ASSETS = {
  dark: require("../../assets/brand/pitaka-title-white.png"),
  light: require("../../assets/brand/pitaka-title-dark.png"),
};

const HeroHeaderSurface = React.memo(function HeroHeaderSurface({
  theme,
  compact = false,
  fullBleed = true,
  onHeight,
  style,
  children,
}: {
  theme: ThemeColors;
  compact?: boolean;
  fullBleed?: boolean;
  onHeight?: (height: number) => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const gradientId = React.useId().replace(/:/g, "");
  const [headerSize, setHeaderSize] = useState({ width: 0, height: 0 });
  return (
    <View
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setHeaderSize((previous) => previous.width === width && previous.height === height ? previous : { width, height });
        onHeight?.(Math.round(height));
      }}
      style={[
        styles.heroHeaderCard,
        {
          marginHorizontal: fullBleed ? -18 : 0,
          paddingTop: insets.top + (compact ? 10 : 14),
          paddingBottom: compact ? 16 : 22,
          backgroundColor: theme.heroGradient[0],
          shadowColor: theme.dark ? "#000000" : theme.accent,
        },
        !theme.dark && styles.lightHeroLift,
        style,
      ]}
    >
      <LinearGradient pointerEvents="none" colors={theme.leather.colors} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%">
          <Defs>
            <Pattern id={gradientId} width={6} height={6} patternUnits="userSpaceOnUse">
              <Path d="M1 1l1.4 .5m2 3l1 .6M1 5l.6 -.3" stroke="#071522" strokeWidth=".7" opacity=".45" />
              <Path d="M2 2l1 .5m-2 3l1 .4M4 2l.9 -.3" stroke="#a2b0bd" strokeWidth=".65" opacity=".26" />
            </Pattern>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${gradientId})`} />
          {headerSize.width > 30 && headerSize.height > 30 && (
            <>
              <Path d={`M2 0 V${headerSize.height - 32} Q2 ${headerSize.height - 2} 32 ${headerSize.height - 2} H${headerSize.width - 32} Q${headerSize.width - 2} ${headerSize.height - 2} ${headerSize.width - 2} ${headerSize.height - 32} V0`} fill="none" stroke={theme.leather.edge} strokeWidth="3" />
              <Path d={`M8 0 V${headerSize.height - 32} Q8 ${headerSize.height - 8} 32 ${headerSize.height - 8} H${headerSize.width - 32} Q${headerSize.width - 8} ${headerSize.height - 8} ${headerSize.width - 8} ${headerSize.height - 32} V0`} fill="none" stroke={theme.leather.thread} strokeWidth="1.05" strokeDasharray="3.5 3" strokeLinecap="round" opacity=".82" />
              <Path d={`M13 0 V${headerSize.height - 32} Q13 ${headerSize.height - 13} 32 ${headerSize.height - 13} H${headerSize.width - 32} Q${headerSize.width - 13} ${headerSize.height - 13} ${headerSize.width - 13} ${headerSize.height - 32} V0`} fill="none" stroke={theme.leather.thread} strokeWidth=".8" strokeDasharray="3.5 3" strokeLinecap="round" opacity=".43" />
            </>
          )}
        </Svg>
      </View>
      {children}
    </View>
  );
});

const HeroMonthlyFlowRow = React.memo(function HeroMonthlyFlowRow({
  monthLabel,
  earned,
  spent,
  hidden,
  onPress,
  theme,
}: {
  monthLabel: string;
  earned: number;
  spent: number;
  hidden: boolean;
  onPress?: () => void;
  theme: ThemeColors;
}) {
  const inner = (
    <>
      <View style={styles.walletsHeroFlowHalf}>
        <Icon
          name="arrow-down"
          size={18}
          strokeWidth={2.4}
          color="#45cd92"
        />
        <View style={styles.walletsHeroFlowMeta}>
          <Text style={[styles.walletsHeroFlowLabel, { color: theme.heroMuted, opacity: 1 }]} numberOfLines={1}>
            {monthLabel} in
          </Text>
          <Text
            style={[styles.walletsHeroFlowVal, { color: theme.heroInk }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.78}
          >
            {hidden ? "••••" : money(earned)}
          </Text>
        </View>
      </View>

      <View style={[styles.walletsHeroFlowDivider, { backgroundColor: theme.heroLine }]} />

      <View style={styles.walletsHeroFlowHalf}>
        <Icon
          name="arrow-up"
          size={18}
          strokeWidth={2.4}
          color="#fda4af"
        />
        <View style={styles.walletsHeroFlowMeta}>
          <Text style={[styles.walletsHeroFlowLabel, { color: theme.heroMuted, opacity: 1 }]} numberOfLines={1}>
            {monthLabel} out
          </Text>
          <Text
            style={[styles.walletsHeroFlowVal, { color: theme.heroInk }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.78}
          >
            {hidden ? "••••" : money(spent)}
          </Text>
        </View>
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.walletsHeroFlowRow,
          { borderTopColor: theme.heroLine },
          { opacity: pressed ? 0.8 : 1 },
        ]}
      >
        {inner}
      </Pressable>
    );
  }

  return <View style={[styles.walletsHeroFlowRow, { borderTopColor: theme.heroLine }]}>{inner}</View>;
});

export const HomeScreen = React.memo(function HomeScreen({
  wallets,
  activities,
  total,
  hidden,
  setHidden,
  onWallet,
  onTransaction,
  onSheet,
  onSettings,
  schedules,
  onRecordScheduled,
  setTab,
  onStackDragChange,
  walletOpen,
  onHeroHeight,
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
  onSettings: () => void;
  schedules: DueSchedule[];
  onRecordScheduled: (schedule: DueSchedule) => void;
  setTab: (t: Tab) => void;
  onStackDragChange?: (dragging: boolean) => void;
  walletOpen: boolean;
  onHeroHeight?: (height: number) => void;
  theme: ThemeColors;
}) {
  const [frontIndex, setFrontIndex] = useState(0);
  const safeFront = wallets.length ? frontIndex % wallets.length : 0;
  const featured = wallets.length ? wallets[safeFront] : undefined;

  const handleOpenAdd = useCallback(() => onSheet("add"), [onSheet]);
  const handleOpenSearch = useCallback(() => onSheet("search"), [onSheet]);
  const handleOpenMenu = useCallback(
    (w: Wallet) => onSheet("update", w),
    [onSheet]
  );
  const handleToggleHidden = useCallback(
    () => setHidden(!hidden),
    [setHidden, hidden]
  );
  const handleOpenUpdate = useCallback(
    () => onSheet("update", featured),
    [onSheet, featured]
  );
  const handleOpenTransfer = useCallback(
    () => onSheet("transfer", featured),
    [onSheet, featured]
  );
  const handleGoWallets = useCallback(() => setTab("wallets"), [setTab]);
  const handleGoActivity = useCallback(() => setTab("activity"), [setTab]);
  const recentActivities = useMemo(
    () => activities.slice(0, 10),
    [activities]
  );

  const monthlySummary = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    const monthLabel = now.toLocaleDateString("en-US", { month: "long" });
    let earned = 0;
    let spent = 0;
    for (const item of activities) {
      const isInc = isIncomeActivity(item);
      const isExp = isExpenseActivity(item);
      if (!isInc && !isExp) continue;
      const d = getActivityDate(item, now);
      if (d.getFullYear() !== curYear || d.getMonth() !== curMonth) continue;
      if (isInc) earned += item.amount;
      else spent += Math.abs(item.amount);
    }
    return { monthLabel, earned, spent };
  }, [activities]);

  const titleAsset = PITAKA_TITLE_ASSETS.dark;

  return (
    <View style={[styles.page, { paddingTop: 0 }]}>
      {/* Net Worth Hero Header */}
      <HeroHeaderSurface
        theme={theme}
        onHeight={onHeroHeight}
        style={{ marginBottom: 18 }}
      >
        <View style={styles.heroTopRow}>
          <View
            style={styles.heroBrandRow}
            accessible
            accessibilityRole="header"
            accessibilityLabel="Pitaka"
          >
            <Image
              source={titleAsset}
              style={styles.heroBrandTitle}
              resizeMode="contain"
            />
          </View>
          <View style={styles.heroHeaderActions}>
            <Pressable onPress={handleToggleHidden} accessibilityRole="button" accessibilityLabel={hidden ? "Show balances" : "Hide balances"} style={[styles.heroIconBtn, heroControlStyle(theme)]}>
              <Icon name={hidden ? "eye-off" : "eye"} size={17} color={theme.heroInk} />
            </Pressable>
            <Pressable
              onPress={handleOpenSearch}
              accessibilityLabel="Search"
              style={({ pressed }) => [
                styles.heroIconBtn,
                heroControlStyle(theme),
                { transform: [{ scale: pressed ? 0.92 : 1 }] },
              ]}
            >
              <Icon name="search" size={17} color={theme.heroInk} />
            </Pressable>
            <Pressable
              onPress={onSettings}
              accessibilityRole="button"
              accessibilityLabel="Settings"
              style={({ pressed }) => [
                styles.heroIconBtn,
                heroControlStyle(theme),
                { transform: [{ scale: pressed ? 0.92 : 1 }] },
              ]}
            >
              <Icon name="settings" size={17} color={theme.heroInk} />
            </Pressable>
          </View>
        </View>

        {/* 4-Column Glass Quick Action Pills */}
        <View style={styles.actionGrid}>
          <ActionButton
            theme={theme}
            icon="edit"
            label="Update"
            onPress={handleOpenUpdate}
          />
          <ActionButton
            theme={theme}
            icon="swap"
            label="Transfer"
            onPress={handleOpenTransfer}
          />
          <ActionButton
            theme={theme}
            icon="plus"
            label="Add"
            onPress={handleOpenAdd}
          />
          <ActionButton
            theme={theme}
            icon="grid"
            label="Wallets"
            onPress={handleGoWallets}
          />
        </View>
      </HeroHeaderSurface>

      <PhysicalWallet
        shouldOpen={walletOpen}
        wallets={wallets}
        total={total}
        hidden={hidden}
        monthlySummary={monthlySummary}
        onWallet={onWallet}
        onOpenAdd={handleOpenAdd}
        onOpenMenu={handleOpenMenu}
        onFrontChange={setFrontIndex}
        onStackDragChange={onStackDragChange}
        theme={theme}
      />

      <Upcoming schedules={schedules} wallets={wallets} hidden={hidden} theme={theme}
        onRecord={onRecordScheduled} onManage={() => onSheet("schedule")} />

      {/* Recent Transactions */}
      <View style={[styles.section, { marginTop: 10 }]}>
        <SectionTitle
          title="Recent Transactions"
          action="View all"
          actionIcon="chevron"
          actionColor={theme.accentText}
          onPress={handleGoActivity}
          theme={theme}
        />
        <View style={styles.txList}>
          {recentActivities.map((item) => (
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
            onPress={handleGoActivity}
            style={({ pressed }) => [
              styles.viewAllBtn,
              {
                backgroundColor: theme.card,
                overflow: "hidden",
                transform: [{ scale: pressed ? 0.985 : 1 }],
              },
              bevelStyle(theme.dark),
              cardShadow(theme.dark),
            ]}
          >
            <AccentSurfaceGlow theme={theme} intensity="medium" />
            <Text style={[styles.viewAllText, { color: theme.accentText }]}>
              View all transactions ({activities.length})
            </Text>
            <Icon name="chevron" size={15} color={theme.accentText} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
});

const WALLET_TILE_HEIGHT = 90;
const WALLET_TILE_GAP = 9;
const WALLET_SLOT_HEIGHT = WALLET_TILE_HEIGHT + WALLET_TILE_GAP;

export const WalletsScreen = React.memo(function WalletsScreen({
  wallets,
  activities = [],
  total,
  hidden,
  onToggleHidden,
  onWallet,
  onReorderWallets,
  onAddWallet,
  onDragChange,
  onHeroHeight,
  theme,
}: {
  wallets: Wallet[];
  activities?: ActivityItem[];
  total: number;
  hidden: boolean;
  onToggleHidden?: () => void;
  onWallet: (w: Wallet) => void;
  onReorderWallets?: (next: Wallet[]) => void;
  onAddWallet?: () => void;
  onDragChange?: (dragging: boolean) => void;
  onHeroHeight?: (height: number) => void;
  theme: ThemeColors;
}) {
  const { monthLabel, fullMonthLabel, totalEarned, totalSpent, walletFlows } =
    useMemo(() => {
      const now = new Date();
      const curYear = now.getFullYear();
      const curMonth = now.getMonth();
      const shortMonth = now.toLocaleDateString("en-US", { month: "short" });
      const longMonth = now.toLocaleDateString("en-US", { month: "long" });
      let earnedSum = 0;
      let spentSum = 0;
      const flows = new Map<number, { earned: number; spent: number }>();
      for (const w of wallets) {
        flows.set(w.id, { earned: 0, spent: 0 });
      }
      for (const item of activities) {
        if (isAdjustmentActivity(item)) continue;
        const d = getActivityDate(item, now);
        if (d.getFullYear() !== curYear || d.getMonth() !== curMonth) continue;
        if (!isTransferActivity(item)) {
          if (item.amount > 0) earnedSum += item.amount;
          else if (item.amount < 0) spentSum += Math.abs(item.amount);
        }
        for (const w of wallets) {
          const match = isActivityForWallet(item, w);
          if (!match.matched) continue;
          const entry = flows.get(w.id)!;
          if (isTransferActivity(item)) {
            if (match.isIncomingTransfer) {
              entry.earned += Math.abs(item.amount);
            } else {
              entry.spent += Math.abs(item.amount);
            }
          } else if (item.amount > 0) {
            entry.earned += item.amount;
          } else if (item.amount < 0) {
            entry.spent += Math.abs(item.amount);
          }
        }
      }
      return {
        monthLabel: shortMonth,
        fullMonthLabel: longMonth,
        totalEarned: earnedSum,
        totalSpent: spentSum,
        walletFlows: flows,
      };
    }, [wallets, activities]);
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
    <View style={[styles.page, { paddingTop: 0 }]}>
      {/* Hero Balance Container */}
      <HeroHeaderSurface
        theme={theme}
        onHeight={onHeroHeight}
        style={{ marginBottom: 22 }}
      >
        <View style={styles.heroTopRow}>
          <Text style={[styles.heroHeaderTitle, { color: theme.heroInk }]}>My Wallets</Text>
          <View style={styles.heroHeaderActions}>
            {onToggleHidden ? (
              <Pressable
                onPress={onToggleHidden}
                style={({ pressed }) => [
                  styles.heroIconBtn,
                  heroControlStyle(theme),
                  { transform: [{ scale: pressed ? 0.92 : 1 }] },
                ]}
              >
                <Icon
                  name={hidden ? "eye-off" : "eye"}
                  size={17}
                  color={theme.heroInk}
                />
              </Pressable>
            ) : null}
            {onAddWallet ? (
              <Pressable
                onPress={onAddWallet}
                style={({ pressed }) => [
                  styles.heroIconBtn,
                  heroControlStyle(theme),
                  { transform: [{ scale: pressed ? 0.92 : 1 }] },
                ]}
              >
                <Icon name="plus" size={18} color={theme.heroInk} />
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={styles.heroBalanceBlock}>
          <Text style={[styles.heroHeaderLabel, { color: theme.heroMuted, opacity: 1 }]}>Combined balance</Text>
          <Amount value={total} hidden={hidden} size="lg" color={theme.heroInk} />
        </View>

        <HeroMonthlyFlowRow
          theme={theme}
          monthLabel={fullMonthLabel}
          earned={totalEarned}
          spent={totalSpent}
          hidden={hidden}
        />
      </HeroHeaderSurface>

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
            { backgroundColor: theme.card, overflow: "hidden" },
            bevelStyle(theme.dark),
            cardShadow(theme.dark),
          ]}
        >
          <AccentSurfaceGlow theme={theme} />
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
            const flow = walletFlows.get(wallet.id) ?? { earned: 0, spent: 0 };

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
                      overflow: "hidden",
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
                  <AccentSurfaceGlow theme={theme} />
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
                    <View style={styles.tileFlowRow}>
                      <Text
                        style={[styles.tileFlowMonth, { color: theme.muted }]}
                      >
                        {monthLabel}
                      </Text>
                      <View style={styles.tileFlowStat}>
                        <Icon
                          name="arrow-down"
                          size={11}
                          strokeWidth={2.5}
                          color={theme.dark ? "#34d399" : "#059669"}
                        />
                        <Text
                          style={[
                            styles.tileFlowVal,
                            { color: theme.dark ? "#34d399" : "#059669" },
                          ]}
                          numberOfLines={1}
                        >
                          {hidden ? "••" : money(flow.earned, true)}
                        </Text>
                      </View>
                      <View style={styles.tileFlowStat}>
                        <Icon
                          name="arrow-up"
                          size={11}
                          strokeWidth={2.5}
                          color={theme.dark ? "#fb7185" : "#e11d48"}
                        />
                        <Text
                          style={[
                            styles.tileFlowVal,
                            { color: theme.dark ? "#fb7185" : "#e11d48" },
                          ]}
                          numberOfLines={1}
                        >
                          {hidden ? "••" : money(flow.spent, true)}
                        </Text>
                      </View>
                    </View>
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
});

type ActivityTypeFilter = "All" | "Expenses" | "Income" | "Transfers" | "Adjusted";

const DEFAULT_EXPENSE_CATEGORIES: { label: string; icon: string }[] = [
  ...EXPENSE_CATEGORIES.map(([label, icon]) => ({ label, icon })),
  { label: "Transfers", icon: "swap" },
];

const DEFAULT_INCOME_CATEGORIES: { label: string; icon: string }[] =
  INCOME_CATEGORIES.map(([label, icon]) => ({ label, icon }));

export const ActivityScreen = React.memo(function ActivityScreen({
  mode,
  activities,
  wallets = [],
  hidden,
  onToggleHidden,
  monthlyBudget = null,
  monthlySpending: monthSpending,
  categoryLimits,
  onOpenCategoryBudget,
  onEditBudget,
  onTransaction,
  onShowToast,
  showFilters = false,
  onToggleFilters,
  categoryFilter,
  onCategorySelect,
  isActive = true,
  onHeroHeight,
  theme,
}: {
  mode: "transactions" | "statistics";
  activities: ActivityItem[];
  wallets?: Wallet[];
  hidden: boolean;
  onToggleHidden?: () => void;
  monthlyBudget?: number | null;
  monthlySpending: MonthlySpending;
  categoryLimits: CategoryLimits;
  onOpenCategoryBudget: (category: string | null) => void;
  onEditBudget?: () => void;
  onTransaction?: (item: ActivityItem) => void;
  onShowToast?: (msg: string) => void;
  showFilters?: boolean;
  onToggleFilters?: () => void;
  categoryFilter?: { category: string } | null;
  onCategorySelect?: (category: string) => void;
  isActive?: boolean;
  onHeroHeight?: (height: number) => void;
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

  useEffect(() => {
    if (mode === "transactions") setSelectedCategory(categoryFilter?.category ?? null);
  }, [categoryFilter, mode]);

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
    if (!isActive) return;
    barProgress.setValue(0);
    const anim = Animated.timing(barProgress, {
      toValue: 1,
      duration: 380,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    anim.start();
    return () => anim.stop();
  }, [isActive, range, barProgress, activities.length]);

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
    <View style={[styles.page, { paddingTop: 0 }]}>
      <HeroHeaderSurface
        theme={theme}
        onHeight={onHeroHeight}
        style={{ marginBottom: 14 }}
      >
        <View style={styles.heroTopRow}>
          <Text style={[styles.heroHeaderTitle, { color: theme.heroInk }]}>{mode === "statistics" ? "Statistics" : "Transactions"}</Text>
          <View style={styles.heroHeaderActions}>
            {onToggleHidden ? (
              <Pressable
                onPress={onToggleHidden}
                style={({ pressed }) => [
                  styles.heroIconBtn,
                  heroControlStyle(theme),
                  { transform: [{ scale: pressed ? 0.92 : 1 }] },
                ]}
              >
                <Icon
                  name={hidden ? "eye-off" : "eye"}
                  size={17}
                  color={theme.heroInk}
                />
              </Pressable>
            ) : null}
            {mode === "transactions" && onToggleFilters ? (
              <Pressable
                onPress={onToggleFilters}
                style={({ pressed }) => [
                  styles.heroIconBtn,
                  heroControlStyle(theme),
                  showFilters && styles.heroIconBtnActive,
                  { transform: [{ scale: pressed ? 0.92 : 1 }] },
                ]}
              >
                <Icon name="more" size={18} color={theme.heroInk} />
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={styles.heroBalanceBlock}>
          <Text style={[styles.heroHeaderLabel, { color: theme.heroMuted, opacity: 1 }]}>{mode === "statistics" ? "Total spending" : "Your activity"}</Text>
          {mode === "statistics" ? <Amount value={totalOut} hidden={hidden} size="lg" color={theme.heroInk} /> : <Text style={[styles.heroHeaderTitle, { color: theme.heroInk }]}>{activities.length} transactions</Text>}
        </View>
      </HeroHeaderSurface>

      {mode === "transactions" && showFilters ? (
        <View
          style={[
            styles.activityFilterPanel,
            { backgroundColor: theme.card, overflow: "hidden" },
            bevelStyle(theme.dark),
            cardShadow(theme.dark),
          ]}
        >
          <AccentSurfaceGlow theme={theme} />
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

      {mode === "statistics" ? <>
      {/* Navy Folder Chart */}
      <View style={{ marginTop: 14 }}>
        <FolderSurface
          tab={0.62}
          tabHeight={42}
          radius={28}
          notch
          fromColor={theme.heroGradient[0]}
          toColor={theme.heroGradient[2]}
          minHeight={232}
        >
          {({ notchX, notchHeight }) => (
            <View style={{ minHeight: 232 }}>
              {/* Chart Legend / Selected Bucket Summary in Folder Tab */}
              <View style={[styles.chartTabLegend, { height: 42 }]}>
                {activeBucket ? (
                  <Text style={[styles.chartTabSummary, { color: theme.heroInk }]} numberOfLines={1}>
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
                          { backgroundColor: theme.positive },
                        ]}
                      />
                      <Text style={[styles.chartLegendText, { color: theme.heroMuted, opacity: 1 }]}>Money in</Text>
                    </View>
                    <View style={styles.chartLegendItem}>
                      <View
                        style={[
                          styles.chartLegendDot,
                          { backgroundColor: theme.dark ? theme.accent : theme.accentText },
                        ]}
                      />
                      <Text style={[styles.chartLegendText, { color: theme.heroMuted, opacity: 1 }]}>Spending</Text>
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
                <Text style={[styles.rangePillText, { color: theme.heroInk }]}>{range}</Text>
                <Icon name="down" size={13} color={theme.heroInk} />
              </Pressable>

              {/* Chart Grid & Bars */}
              <View style={styles.chartBody}>
                <View style={styles.chartGrid}>
                  {chartData.gridLabels.map((lvl, idx) => (
                    <View
                      key={`${idx}-${lvl}`}
                      style={[styles.chartGridLine, !theme.dark && { borderBottomColor: theme.heroLine }]}
                    >
                      <Text style={[styles.chartGridText, { color: theme.heroMuted, opacity: 1 }]}>{lvl}</Text>
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
                              colors={[theme.positive, theme.positive]}
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
                              colors={theme.dark ? theme.accentGradient : [theme.accentText, theme.accentInk]}
                              style={StyleSheet.absoluteFill}
                            />
                          </Animated.View>
                        </View>
                        <Text
                          style={[
                            styles.barLabel,
                            { color: theme.heroMuted },
                            isSelected && { color: theme.heroInk, fontWeight: "800" },
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
          colors={[theme.card, theme.surface]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.flowCard, cardShadow(theme.dark)]}
        >
          <View style={styles.flowCardBevel} pointerEvents="none" />
          <View style={styles.flowIconBox}>
            <Icon name="arrow-down" size={16} color={theme.positive} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.flowLabel, { color: theme.muted }]}>Money in</Text>
            <Text style={[styles.flowValue, { color: theme.positive }]} numberOfLines={1}>
              {hidden ? "••••" : money(totalIn)}
            </Text>
          </View>
        </LinearGradient>

        <LinearGradient
          colors={[theme.card, theme.surface]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.flowCard, cardShadow(theme.dark)]}
        >
          <View style={styles.flowCardBevel} pointerEvents="none" />
          <View style={styles.flowIconBox}>
            <Icon name="arrow-up" size={16} color={theme.accentText} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.flowLabel, { color: theme.muted }]}>
              Money out
            </Text>
            <Text
              style={[styles.flowValue, { color: theme.accentText }]}
              numberOfLines={1}
            >
              {hidden ? "••••" : money(totalOut)}
            </Text>
          </View>
        </LinearGradient>
      </View>

      {/* Monthly Spending Budget Target Card */}
      {onEditBudget ? (
        <Pressable
          onPress={onEditBudget}
          style={({ pressed }) => [
            styles.budgetCard,
            {
              backgroundColor: theme.card,
              overflow: "hidden",
              transform: [{ scale: pressed ? 0.99 : 1 }],
            },
            bevelStyle(theme.dark),
            cardShadow(theme.dark),
          ]}
        >
          <AccentSurfaceGlow theme={theme} />
          {monthlyBudget && monthlyBudget > 0 ? (() => {
            const pct = Math.min(
              100,
              Math.round((monthSpending.spent / monthlyBudget) * 100)
            );
            const rawRatio = monthSpending.spent / monthlyBudget;
            const remaining = monthlyBudget - monthSpending.spent;
            const overBudget = remaining < 0;
            const barColors: [string, string] = overBudget
              ? ["#f87171", "#c04444"]
              : rawRatio >= 0.75
                ? ["#fbbf24", "#d97706"]
                : theme.accentGradient;

            return (
              <View>
                <View style={styles.budgetTopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.budgetTitle, { color: theme.ink }]}>
                      {monthSpending.monthLabel} spending budget
                    </Text>
                    <Text style={[styles.budgetSub, { color: theme.muted }]}>
                      {hidden
                        ? "•••• spent of ••••"
                        : `${money(monthSpending.spent)} spent of ${money(monthlyBudget)}`}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.budgetEditPill,
                      {
                        backgroundColor: overBudget
                          ? theme.dark
                            ? "rgba(192, 68, 68, 0.2)"
                            : "#fdeaea"
                          : theme.accentSoft,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.budgetEditText,
                        { color: overBudget ? "#c04444" : theme.accentText },
                      ]}
                    >
                      {pct}% · Edit
                    </Text>
                  </View>
                </View>

                <View
                  style={[styles.budgetTrack, { backgroundColor: theme.soft2 }]}
                >
                  <LinearGradient
                    colors={barColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.budgetFill, { width: `${pct}%` }]}
                  />
                </View>

                <Text
                  style={[
                    styles.budgetFootText,
                    { color: overBudget ? "#c04444" : theme.muted },
                  ]}
                >
                  {hidden
                    ? "••••"
                    : overBudget
                      ? `${money(Math.abs(remaining))} over monthly target`
                      : `${money(remaining)} remaining this month`}
                </Text>
              </View>
            );
          })() : (
            <View style={styles.budgetTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.budgetTitle, { color: theme.ink }]}>
                  Monthly spending budget
                </Text>
                <Text style={[styles.budgetSub, { color: theme.muted }]}>
                  Set a {monthSpending.monthLabel} spending target to track pace
                </Text>
              </View>
              <View
                style={[
                  styles.budgetEditPill,
                  { backgroundColor: theme.accentSoft },
                ]}
              >
                <Text
                  style={[styles.budgetEditText, { color: theme.accentText }]}
                >
                  Set target
                </Text>
              </View>
            </View>
          )}
        </Pressable>
      ) : null}

      <CategoryBudgetOverview limits={categoryLimits} spending={monthSpending} hidden={hidden}
        theme={theme} onOpen={onOpenCategoryBudget} />

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
                  if (onCategorySelect) onCategorySelect(label);
                  else {
                    setSelectedCategory(active ? null : label);
                    setPage(1);
                  }
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
                        ? theme.soft
                        : theme.card
                  }
                  toColor={
                    active
                      ? theme.accentGradient[1]
                      : theme.dark
                        ? theme.surface
                        : theme.soft
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
          color={theme.page}
          size={18}
        />
        <EdgeFade
          position="right"
          color={theme.page}
          size={18}
        />
      </View>

      </> : null}

      {mode === "transactions" ? <>
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
              { backgroundColor: theme.card, overflow: "hidden" },
              bevelStyle(theme.dark),
              cardShadow(theme.dark),
            ]}
          >
            <AccentSurfaceGlow theme={theme} />
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
                  overflow: "hidden",
                  opacity: safePage === 1 ? 0.4 : pressed ? 0.8 : 1,
                },
                bevelStyle(theme.dark),
                cardShadow(theme.dark),
              ]}
            >
              <AccentSurfaceGlow theme={theme} intensity="medium" />
              <Icon name="back" size={16} color={theme.accentText} />
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
                        overflow: "hidden",
                        transform: [{ scale: pressed ? 0.94 : 1 }],
                      },
                      bevelStyle(theme.dark),
                      cardShadow(theme.dark),
                    ]}
                  >
                    <AccentSurfaceGlow theme={theme} />
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
                  overflow: "hidden",
                  opacity: safePage === totalPages ? 0.4 : pressed ? 0.8 : 1,
                },
                bevelStyle(theme.dark),
                cardShadow(theme.dark),
              ]}
            >
              <AccentSurfaceGlow theme={theme} intensity="medium" />
              <Icon name="chevron" size={16} color={theme.accentText} />
            </Pressable>
          </View>
        ) : null}
      </View>
      </> : null}
    </View>
  );
});

export const SettingsScreen = React.memo(function SettingsScreen({
  leatherFinish,
  setLeatherFinish,
  hidden,
  setHidden,
  showToast,
  profile,
  userEmail,
  lastSyncedAt,
  appLockEnabled,
  biometricsSupported,
  biometricsEnabled,
  onToggleAppLock,
  onChangeAppLockPin,
  onToggleBiometrics,
  onOpenAuth,
  onSyncNow,
  onHeroHeight,
  theme,
}: {
  leatherFinish: LeatherFinishId;
  setLeatherFinish: (v: LeatherFinishId) => void;
  hidden: boolean;
  setHidden: (v: boolean) => void;
  showToast: (s: string) => void;
  profile: UserProfile;
  userEmail: string | null;
  lastSyncedAt: string | null;
  appLockEnabled: boolean;
  biometricsSupported: boolean;
  biometricsEnabled: boolean;
  onToggleAppLock: () => void;
  onChangeAppLockPin: () => void;
  onToggleBiometrics: () => void;
  onOpenAuth: () => void;
  onSyncNow: () => void;
  onHeroHeight?: (height: number) => void;
  theme: ThemeColors;
}) {


  return (
    <View style={[styles.page, { paddingTop: 0 }]}>
      <HeroHeaderSurface
        theme={theme}
        onHeight={onHeroHeight}
        style={{ marginBottom: 20 }}
      >
        <View style={styles.heroTopRow}>
          <Text style={[styles.heroHeaderTitle, { color: theme.heroInk }]}>Settings</Text>
        </View>

        <Pressable
          onPress={onOpenAuth}
          style={({ pressed }) => [
            styles.settingsHeroProfileRow,
            { opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <View style={[styles.profileCardAvatar, { backgroundColor: theme.heroControl }]}>
            <Text style={[styles.profileCardInitials, { color: theme.heroInk }]}>{profile.initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.profileCardName, { color: theme.heroInk }]} numberOfLines={1}>
              {profile.fullName}
            </Text>
            <Text style={[styles.profileCardSub, { color: theme.heroMuted, opacity: 1 }]} numberOfLines={1}>
              {userEmail
                ? `${userEmail} · Cloud Synced`
                : "Offline-first wallet profile · Tap to sign in"}
            </Text>
          </View>
          <Icon name="chevron" size={18} color={theme.heroInk} />
        </Pressable>
      </HeroHeaderSurface>

      {/* Appearance Group */}
      <SettingsGroup title="Appearance" theme={theme}>
        <View style={[styles.accentPickerBlock, { borderBottomWidth: 1, borderBottomColor: theme.line }]}>
          <View style={styles.accentPickerHeader}>
            <LinearGradient colors={theme.accentGradient} style={styles.settingIconBox}><Icon name="palette" size={18} color={theme.accentInk} /></LinearGradient>
            <View style={styles.rowMain}>
              <Text style={[styles.rowTitle, { color: theme.ink }]}>Leather finish</Text>
              <Text style={[styles.rowSub, { color: theme.muted }]}>Wallet, header, and app accents</Text>
            </View>
          </View>
          <View style={styles.accentGrid}>
            {[LEATHER_FINISHES.slice(0, 3), LEATHER_FINISHES.slice(3, 6)].map((row, index) => (
              <View key={index} style={styles.accentGridRow}>
                {row.map((item) => (
                  <Pressable key={item.id} accessibilityRole="radio" accessibilityState={{ checked: item.id === leatherFinish }} accessibilityLabel={item.label} onPress={() => { setLeatherFinish(item.id); showToast(`Leather finish set to ${item.label}`); }} style={[styles.accentTile, { borderColor: item.id === leatherFinish ? item.accent : item.edge }]}>
                    <LinearGradient colors={item.colors} style={StyleSheet.absoluteFill} />
                    <Svg pointerEvents="none" width="100%" height="100%" viewBox="0 0 100 72" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
                      <Defs>
                        <Pattern id={`finishGrain${item.id}`} width={6} height={6} patternUnits="userSpaceOnUse">
                          <Path d="M1 1l1.4 .5m2 3l1 .6M1 5l.6 -.3" stroke="#071522" strokeWidth=".7" opacity=".45" />
                          <Path d="M2 2l1 .5m-2 3l1 .4M4 2l.9 -.3" stroke={item.thread} strokeWidth=".65" opacity=".26" />
                        </Pattern>
                      </Defs>
                      <Rect width="100" height="72" fill={`url(#finishGrain${item.id})`} />
                      <Rect x="5" y="5" width="90" height="62" rx="10" fill="none" stroke={item.thread} strokeWidth="1" strokeDasharray="3.5 3" opacity=".85" />
                      <Rect x="9" y="9" width="82" height="54" rx="7" fill="none" stroke={item.thread} strokeWidth=".7" strokeDasharray="2 3" opacity=".48" />
                    </Svg>
                    {item.id === leatherFinish && <View style={styles.accentTileCheck}><Icon name="check" size={14} color="#ffffff" /></View>}
                    <Text style={styles.accentTileLabel} numberOfLines={1}>{item.label}</Text>
                  </Pressable>
                ))}
              </View>
            ))}
          </View>
        </View>

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
        {appLockEnabled && biometricsSupported ? (
          <SettingRow
            icon="fingerprint"
            title="Biometric unlock"
            subtitle={
              biometricsEnabled
                ? "Fingerprint or Face ID active"
                : "Unlock faster with biometrics"
            }
            onPress={onToggleBiometrics}
            control={
              <SwitchControl
                on={biometricsEnabled}
                onPress={onToggleBiometrics}
                theme={theme}
              />
            }
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
          subtitle="Version 1.0 · Expo + SQLite + Supabase"
          onPress={() => showToast("You have the latest version")}
          isLast
          theme={theme}
        />
      </SettingsGroup>
    </View>
  );
});

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
            overflow: "hidden",
          },
          bevelStyle(theme.dark),
          cardShadow(theme.dark),
        ]}
      >
        <AccentSurfaceGlow theme={theme} />
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
  const insets = useSafeAreaInsets();
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
      <HeroHeaderSurface theme={theme} compact fullBleed={false}>
        <View style={styles.heroDetailBar}>
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [
              styles.heroIconBtn,
              heroControlStyle(theme),
              { transform: [{ scale: pressed ? 0.92 : 1 }] },
            ]}
          >
            <Icon name="back" size={19} color={theme.heroInk} />
          </Pressable>
          <Text style={[styles.heroDetailTitle, { color: theme.heroInk }]} numberOfLines={1}>
            {wallet.name}
          </Text>
          <Pressable
            onPress={onEdit}
            style={({ pressed }) => [
              styles.heroIconBtn,
              heroControlStyle(theme),
              { transform: [{ scale: pressed ? 0.92 : 1 }] },
            ]}
          >
            <Icon name="edit" size={17} color={theme.heroInk} />
          </Pressable>
        </View>
      </HeroHeaderSurface>

      <View style={{ flex: 1 }}>
        <Animated.ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.detailScreen}
          bounces={false}
          overScrollMode="never"
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: detailScrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        >

          <WalletFolder wallet={wallet} hidden={hidden} onMenu={onEdit} raised={!theme.dark} />

          <View style={styles.detailActions}>
            <Pressable
              onPress={onUpdate}
              style={({ pressed }) => [
                styles.detailActionBtn,
                {
                  backgroundColor: theme.card,
                  overflow: "hidden",
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
                bevelStyle(theme.dark),
                cardShadow(theme.dark),
              ]}
            >
              <AccentSurfaceGlow theme={theme} intensity="medium" />
              <Icon name="edit" size={18} color={theme.accentText} />
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
                  overflow: "hidden",
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
                bevelStyle(theme.dark),
                cardShadow(theme.dark),
              ]}
            >
              <AccentSurfaceGlow theme={theme} intensity="medium" />
              <Icon name="swap" size={18} color={theme.accentText} />
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
          color={theme.surface}
          size={24}
          opacity={detailScrollY.interpolate({
            inputRange: [0, 16],
            outputRange: [0, 1],
            extrapolate: "clamp",
          })}
        />
        <EdgeFade
          position="bottom"
          color={theme.page}
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
  fixedTopBarHeader: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 4,
  },
  totalStrip: {
    marginTop: 6,
    marginBottom: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalTextCol: {
    flex: 1,
    paddingRight: 12,
  },
  totalLabel: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 13,
    letterSpacing: 0.1,
    marginBottom: 4,
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
  actionGrid: {
    marginTop: 16,
    flexDirection: "row",
    gap: 10,
  },
  section: {
    marginTop: 26,
  },
  txList: {
    gap: 10,
  },
  heroHeaderCard: {
    position: "relative",
    overflow: "hidden",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingHorizontal: 20,
    borderBottomWidth: 0,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.24,
    shadowRadius: 20,
    elevation: 8,
  },
  lightHeroLift: Platform.OS === "android" && Platform.Version < 28
    ? { shadowColor: "#182036" }
    : {
        elevation: 0,
        shadowOpacity: 0,
        boxShadow: "0px 7px 16px rgba(24, 32, 54, 0.17)",
      },
  heroSingleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  heroBrandRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  heroBrandTitle: {
    width: 103,
    height: 36,
  },
  heroBalanceValueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroEyeBtnSmall: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.09)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroHeaderTitle: {
    fontFamily: "Poppins_800ExtraBold",
    fontWeight: "800",
    fontSize: 20,
    letterSpacing: -0.5,
    color: "#ffffff",
  },
  heroHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  heroIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.09)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroIconBtnActive: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderColor: "rgba(255, 255, 255, 0.45)",
  },
  heroBalanceBlock: {
    marginTop: 18,
    gap: 4,
  },
  heroHeaderLabel: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 12.5,
    color: "rgba(255, 255, 255, 0.78)",
    marginBottom: 2,
  },
  settingsHeroProfileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
  },
  heroDetailBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  heroDetailTitle: {
    flex: 1,
    textAlign: "center",
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 20,
    letterSpacing: -0.5,
    color: "#ffffff",
  },
  walletsHeroFlowRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.09)",
  },
  walletsHeroFlowHalf: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  walletsHeroFlowDivider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    marginHorizontal: 12,
    marginVertical: 2,
  },
  walletsHeroFlowMeta: {
    flex: 1,
    gap: 1,
  },
  walletsHeroFlowLabel: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 11.5,
    color: "rgba(255, 255, 255, 0.74)",
  },
  walletsHeroFlowVal: {
    fontFamily: "Poppins_800ExtraBold",
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0,
    color: "#ffffff",
  },
  walletsTotalSub: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 12,
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
    fontFamily: "Poppins_800ExtraBold",
    fontWeight: "900",
    fontSize: 11,
  },
  tileMain: {
    flex: 1,
    gap: 2,
  },
  tileName: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 14,
  },
  tileSub: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 11,
  },
  tileFlowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  tileFlowMonth: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 10.5,
  },
  tileFlowStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  tileFlowVal: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 10.5,
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
    fontFamily: "Poppins_800ExtraBold",
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
    fontFamily: "Poppins_800ExtraBold",
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
    fontFamily: "Poppins_600SemiBold",
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
    fontFamily: "Poppins_700Bold",
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
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 10.5,
  },
  chartTabSummary: {
    color: "#ffffff",
    fontFamily: "Poppins_700Bold",
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
    fontFamily: "Poppins_800ExtraBold",
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
    fontFamily: "Poppins_600SemiBold",
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
    fontFamily: "Poppins_600SemiBold",
  },
  flowCards: {
    flexDirection: "row",
    gap: 10,
    marginTop: 15,
    marginBottom: 14,
  },
  budgetCard: {
    padding: 15,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 22,
  },
  budgetTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  budgetTitle: {
    fontFamily: "Poppins_800ExtraBold",
    fontWeight: "800",
    fontSize: 14,
  },
  budgetSub: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 11.5,
    marginTop: 2,
  },
  budgetEditPill: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 12,
  },
  budgetEditText: {
    fontFamily: "Poppins_800ExtraBold",
    fontWeight: "800",
    fontSize: 11,
  },
  budgetTrack: {
    height: 9,
    borderRadius: 6,
    overflow: "hidden",
    marginTop: 12,
    marginBottom: 8,
  },
  budgetFill: {
    height: "100%",
    borderRadius: 6,
  },
  budgetFootText: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 11,
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
    backgroundColor: "rgba(128, 128, 128, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  flowLabel: {
    color: "#172442",
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 10,
  },
  flowValue: {
    color: "#172442",
    fontFamily: "Poppins_800ExtraBold",
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
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 10.5,
  },
  categoryAmount: {
    fontFamily: "Poppins_800ExtraBold",
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
    color: "#fff6f0",
    fontFamily: "Poppins_800ExtraBold",
    fontWeight: "900",
    fontSize: 16,
  },
  profileCardName: {
    color: "#fff6f0",
    fontFamily: "Poppins_800ExtraBold",
    fontWeight: "800",
    fontSize: 16,
  },
  profileCardSub: {
    color: "#fff6f0",
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 11,
    opacity: 0.78,
    marginTop: 2,
  },
  settingsGroup: {
    marginBottom: 19,
  },
  settingsGroupTitle: {
    fontFamily: "Poppins_700Bold",
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
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 13.5,
  },
  rowSub: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 11,
  },
  accentPickerBlock: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  accentPickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  accentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  accentBadgeText: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 11,
  },
  accentGrid: {
    gap: 8,
  },
  accentGridRow: {
    flexDirection: "row",
    gap: 8,
  },
  accentTile: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    height: 72,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  accentTileLabel: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 10.5,
    color: "#ffffff",
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowRadius: 4,
  },
  accentTileCheck: {
    position: "absolute",
    top: 11,
    right: 11,
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
    fontFamily: "Poppins_800ExtraBold",
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
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 16,
    marginTop: 12,
    marginBottom: 4,
  },
  emptyStateSub: {
    fontFamily: "Poppins_600SemiBold",
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
    fontFamily: "Poppins_700Bold",
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
    fontFamily: "Poppins_800ExtraBold",
    fontWeight: "800",
    fontSize: 13,
  },
  pageDots: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 14,
    paddingHorizontal: 2,
  },
});
