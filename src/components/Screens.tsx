import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  AppState,
  Easing,
  Image,
  LayoutAnimation,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, {
  Circle as SvgCircle,
  Defs,
  Image as SvgImage,
  LinearGradient as SvgLinearGradient,
  Pattern,
  Path,
  Rect,
  Stop,
} from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ActivityItem,
  EXPENSE_CATEGORIES,
  getActivityDate,
  getDisplayActivityWallet,
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
import {
  AnimatedBarFill,
  MOTION_EASE,
  ScalePressable,
  StaggerReveal,
} from "../lib/motion";
import {
  getWalletScale,
  GroupedPhysicalWallet,
  PhysicalWallet,
  WALLET_CLOSE_SCROLL_DISTANCE,
  WALLET_COMPACT_SHIFT_Y,
  WALLET_FLAP_SCROLL_START,
} from "./PhysicalWallet";
import { ReorderWalletsModal } from "./ReorderWalletsModal";
import {
  LEATHER_FINISHES,
  LeatherFinishId,
  AccentSurfaceGlow,
  bevelStyle,
  cardShadow,
  DarkLeatherSurface,
  EdgeFade,
  heroControlStyle,
  hexToRgba,
  LightLeatherSurface,
  SectionTitle,
  SwitchControl,
  TexturedGradientSurface,
  ThemeColors,
  TxRow,
} from "./SharedUI";
import { resolveWalletCardDesign } from "../data/walletPresets";
import { Amount, WalletFolder, WalletLogoBadge } from "./WalletFolder";
import { Upcoming } from "./Schedules";
import type { DueSchedule } from "../types/schedule";
import type { CategoryLimits, MonthlySpending } from "../types/budget";
import {
  DEFAULT_HOME_SECTIONS,
  type HomeSectionConfig,
  type HomeSectionId,
} from "../types/homeLayout";
import {
  getPayLaterDueStatus,
  getPayLaterPreset,
  type PayLaterAccount,
} from "../types/paylater";
import { CategoryBudgetOverview } from "./CategoryBudgets";
import { CategoryTreemap, WalletTreemap } from "./WalletTreemap";
import { CustomizeHomeModal } from "./CustomizeHomeModal";

const PITAKA_TITLE_ASSETS = {
  dark: require("../../assets/brand/pitaka-title-white.webp"),
  light: require("../../assets/brand/pitaka-title-dark.webp"),
};

const PITAKA_HEADER_TITLE_ASSETS = {
  wallets: {
    source: require("../../assets/brand/pitaka-header-wallets.webp"),
    aspect: 1455 / 460,
    label: "Wallets",
  },
  activity: {
    source: require("../../assets/brand/pitaka-header-activity.webp"),
    aspect: 1562 / 460,
    label: "Activity",
  },
  overview: {
    source: require("../../assets/brand/pitaka-header-overview.webp"),
    aspect: 1828 / 460,
    label: "Overview",
  },
  settings: {
    source: require("../../assets/brand/pitaka-header-settings.webp"),
    aspect: 1631 / 460,
    label: "Settings",
  },
} as const;

function HeroEmbroideredTitle({
  kind,
  height = 44,
}: {
  kind: keyof typeof PITAKA_HEADER_TITLE_ASSETS;
  height?: number;
}) {
  const asset = PITAKA_HEADER_TITLE_ASSETS[kind];
  return (
    <View
      style={styles.heroBrandRow}
      accessible
      accessibilityRole="header"
      accessibilityLabel={asset.label}
    >
      <Image
        source={asset.source}
        style={{ width: Math.round(height * asset.aspect), height }}
        resizeMode="contain"
      />
    </View>
  );
}

function getTimeGreeting(date: Date): {
  greeting: string;
  weekdayLabel: string;
  monthDayLabel: string;
  dateLabel: string;
} {
  const hour = date.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const weekdayLabel = date.toLocaleDateString("en-US", { weekday: "long" });
  const monthDayLabel = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return {
    greeting,
    weekdayLabel,
    monthDayLabel,
    dateLabel: `${weekdayLabel}, ${monthDayLabel}`,
  };
}

const HeroHeaderSurface = React.memo(function HeroHeaderSurface({
  theme,
  compact = false,
  fullBleed = true,
  archBottom = false,
  onHeight,
  style,
  children,
}: {
  theme: ThemeColors;
  compact?: boolean;
  fullBleed?: boolean;
  archBottom?: boolean;
  onHeight?: (height: number) => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const grainId = `heroGrain${uid}`;
  const leatherGradId = `heroLeather${uid}`;
  const [headerSize, setHeaderSize] = useState({ width: 0, height: 0 });
  const W = headerSize.width;
  const H = headerSize.height;
  const scale = getWalletScale(W || 390);
  const archH = 22 * scale;
  const cx = W / 2;
  const hw = 59 * scale;
  const c1 = 35 * scale;
  const c2 = 26 * scale;
  const makeHeaderPath = (inset: number, yShift = 0, closed = false) => {
    const xL = inset;
    const xR = W - inset;
    const yB = H - inset + yShift;
    const yP = yB - archH;
    const r = Math.max(8, 32 - inset);
    const cmds = [
      `M${xL} 0`,
      `V${yB - r}`,
      `Q${xL} ${yB} ${xL + r} ${yB}`,
    ];
    if (archBottom) {
      cmds.push(
        `H${cx - hw}`,
        `C${cx - c1} ${yB} ${cx - c2} ${yP} ${cx} ${yP}`,
        `C${cx + c2} ${yP} ${cx + c1} ${yB} ${cx + hw} ${yB}`,
      );
    }
    cmds.push(
      `H${xR - r}`,
      `Q${xR} ${yB} ${xR} ${yB - r}`,
      `V0`,
    );
    if (closed) cmds.push("Z");
    return cmds.join(" ");
  };

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
          paddingBottom: archBottom
            ? compact
              ? 24
              : 27
            : compact
              ? 20
              : 26,
          backgroundColor: "transparent",
          overflow: "visible",
          elevation: 0,
          shadowOpacity: 0,
        },
        style,
      ]}
    >
      <View
        pointerEvents="none"
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: H + 10 }}
      >
        <Svg width="100%" height="100%">
          <Defs>
            <SvgLinearGradient id={leatherGradId} x1="10%" y1="0%" x2="90%" y2="100%">
              <Stop offset="0" stopColor={theme.leather.colors[1]} />
              <Stop offset="0.55" stopColor={theme.leather.colors[1]} />
              <Stop offset="1" stopColor={theme.leather.colors[2]} />
            </SvgLinearGradient>
            <Pattern id={grainId} width={6} height={6} patternUnits="userSpaceOnUse">
              <Path d="M1 1l1.4 .5m2 3l1 .6M1 5l.6 -.3" stroke="#071522" strokeWidth="0.7" opacity="0.45" />
              <Path d="M2 2l1 .5m-2 3l1 .4M4 2l.9 -.3" stroke="#a2b0bd" strokeWidth="0.65" opacity="0.26" />
            </Pattern>
          </Defs>
          {W > 64 && H > 64 ? (
            <>
              <Path
                d={makeHeaderPath(0, 4, true)}
                fill="rgba(24, 32, 54, 0.14)"
              />
              <Path
                d={makeHeaderPath(0, 0, true)}
                fill={`url(#${leatherGradId})`}
              />
              <Path
                d={makeHeaderPath(0, 0, true)}
                fill={`url(#${grainId})`}
              />
              <Path
                d={makeHeaderPath(2)}
                fill="none"
                stroke={theme.leather.edge}
                strokeWidth="3"
              />
              <Path
                d={makeHeaderPath(8)}
                fill="none"
                stroke={theme.leather.thread}
                strokeWidth="1.05"
                strokeDasharray="3.5 3"
                strokeLinecap="round"
                opacity="0.82"
              />
              <Path
                d={makeHeaderPath(13)}
                fill="none"
                stroke={theme.leather.thread}
                strokeWidth="0.8"
                strokeDasharray="3.5 3"
                strokeLinecap="round"
                opacity="0.43"
              />
            </>
          ) : null}
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
  compact = false,
  onPress,
  theme,
}: {
  monthLabel: string;
  earned: number;
  spent: number;
  hidden: boolean;
  compact?: boolean;
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
          compact && { marginTop: 10, paddingTop: 10 },
          { borderTopColor: theme.heroLine },
          { opacity: pressed ? 0.8 : 1 },
        ]}
      >
        {inner}
      </Pressable>
    );
  }

  return (
    <View
      style={[
        styles.walletsHeroFlowRow,
        compact && { marginTop: 10, paddingTop: 10 },
        { borderTopColor: theme.heroLine },
      ]}
    >
      {inner}
    </View>
  );
});

export const HomeScreen = React.memo(function HomeScreen({
  wallets,
  activities,
  total,
  hidden,
  setHidden,
  onWallet,
  onReorderWallets,
  onTransaction,
  onSheet,
  onSettings,
  schedules,
  onRecordScheduled,
  monthlyBudget = 0,
  monthlySpending,
  categoryLimits,
  onEditBudget,
  onOpenCategoryBudget,
  setTab,
  onStackDragChange,
  walletOpen,
  walletScrollY,
  onHeroHeight,
  entranceActive = true,
  entranceReplayKey = 0,
  homeSections = DEFAULT_HOME_SECTIONS,
  payLaterAccounts = [],
  onOpenPayLater,
  userName,
  theme,
}: {
  wallets: Wallet[];
  activities: ActivityItem[];
  total: number;
  hidden: boolean;
  setHidden: (v: boolean) => void;
  onWallet: (w: Wallet) => void;
  onReorderWallets?: (orderedVisible: Wallet[]) => void;
  onTransaction?: (item: ActivityItem) => void;
  onSheet: (s: Sheet, w?: Wallet) => void;
  onSettings: () => void;
  schedules: DueSchedule[];
  onRecordScheduled: (schedule: DueSchedule) => void;
  monthlyBudget?: number | null;
  monthlySpending?: MonthlySpending;
  categoryLimits?: CategoryLimits;
  onEditBudget?: () => void;
  onOpenCategoryBudget?: (category: string | null) => void;
  setTab: (t: Tab) => void;
  onStackDragChange?: (dragging: boolean) => void;
  walletOpen: boolean;
  walletScrollY: Animated.Value;
  onHeroHeight?: (height: number) => void;
  entranceActive?: boolean;
  entranceReplayKey?: number;
  homeSections?: HomeSectionConfig[];
  payLaterAccounts?: PayLaterAccount[];
  onOpenPayLater?: () => void;
  userName?: string;
  theme: ThemeColors;
}) {
  const { width: windowWidth } = useWindowDimensions();
  const [hingeOffset, setHingeOffset] = useState(
    () => WALLET_COMPACT_SHIFT_Y * getWalletScale(windowWidth)
  );
  const handleHingeOffset = useCallback((offset: number) => {
    setHingeOffset((prev) => (Math.abs(offset - prev) > 0.5 ? offset : prev));
  }, []);
  const belowWalletTranslateY = useMemo(
    () =>
      walletScrollY.interpolate({
        inputRange: [WALLET_FLAP_SCROLL_START, WALLET_CLOSE_SCROLL_DISTANCE],
        outputRange: [0, -hingeOffset],
        extrapolate: "clamp",
      }),
    [walletScrollY, hingeOffset]
  );
  const handleOpenAdd = useCallback(() => onSheet("add"), [onSheet]);
  const handleOpenSearch = useCallback(() => onSheet("search"), [onSheet]);
  const handleOpenSchedules = useCallback(() => onSheet("schedule"), [onSheet]);
  const handleOpenMenu = useCallback(
    (w: Wallet) => onSheet("update", w),
    [onSheet]
  );
  const handleToggleHidden = useCallback(
    () => setHidden(!hidden),
    [setHidden, hidden]
  );
  const handleGoActivity = useCallback(() => setTab("activity"), [setTab]);
  const handleGoOverview = useCallback(() => setTab("overview"), [setTab]);
  const handleOpenBudget = useCallback(
    () => (onEditBudget ? onEditBudget() : onSheet("budget")),
    [onEditBudget, onSheet]
  );
  const [reorderModalOpen, setReorderModalOpen] = useState(false);
  const [headerClock, setHeaderClock] = useState(() =>
    getTimeGreeting(new Date())
  );

  useEffect(() => {
    const refreshGreeting = () => {
      const next = getTimeGreeting(new Date());
      setHeaderClock((prev) =>
        prev.greeting === next.greeting && prev.dateLabel === next.dateLabel
          ? prev
          : next
      );
    };
    const timer = setInterval(refreshGreeting, 60_000);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshGreeting();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, []);

  const recentActivities = useMemo(
    () => activities.slice(0, 5),
    [activities]
  );

  const monthlySummary = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    const curDate = now.getDate();
    const monthLabel = now.toLocaleDateString("en-US", { month: "long" });
    const monthShortLabel = now.toLocaleDateString("en-US", { month: "short" });
    let earned = 0;
    let spent = 0;
    let todaySpent = 0;
    for (const item of activities) {
      const isInc = isIncomeActivity(item);
      const isExp = isExpenseActivity(item);
      if (!isInc && !isExp) continue;
      const d = getActivityDate(item, now);
      if (d.getFullYear() !== curYear || d.getMonth() !== curMonth) continue;
      if (isInc) earned += item.amount;
      else {
        const abs = Math.abs(item.amount);
        spent += abs;
        if (d.getDate() === curDate) todaySpent += abs;
      }
    }
    return { monthLabel, monthShortLabel, earned, spent, todaySpent };
  }, [activities]);

  const walletFlows = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    const flows: Record<number, { earned: number; spent: number }> = {};
    for (const w of wallets) {
      flows[w.id] = { earned: 0, spent: 0 };
    }
    for (const item of activities) {
      if (isAdjustmentActivity(item)) continue;
      const d = getActivityDate(item, now);
      if (d.getFullYear() !== curYear || d.getMonth() !== curMonth) continue;
      for (const w of wallets) {
        const match = isActivityForWallet(item, w);
        if (!match.matched) continue;
        const entry = flows[w.id];
        if (isTransferActivity(item)) {
          if (match.isIncomingTransfer) entry.earned += Math.abs(item.amount);
          else entry.spent += Math.abs(item.amount);
        } else if (item.amount > 0) {
          entry.earned += item.amount;
        } else if (item.amount < 0) {
          entry.spent += Math.abs(item.amount);
        }
      }
    }
    return flows;
  }, [wallets, activities]);

  const topCategories = useMemo(() => {
    if (!monthlySpending) return [];
    return Array.from(monthlySpending.categories.entries())
      .map(([category, info]) => ({
        category,
        amount: info.cents / 100,
        icon: EXPENSE_CATEGORIES.find(([label]) => label === category)?.[1] || "tag",
        limit: categoryLimits?.[category] ?? 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);
  }, [monthlySpending, categoryLimits]);

  const netMonth = monthlySummary.earned - monthlySummary.spent;
  const savedRate =
    monthlySummary.earned > 0
      ? Math.max(0, Math.round((netMonth / monthlySummary.earned) * 100))
      : null;
  const budgetLimit = monthlyBudget ?? 0;
  const budgetPct =
    budgetLimit > 0
      ? Math.round((monthlySummary.spent / budgetLimit) * 100)
      : 0;
  const budgetRemaining = budgetLimit - monthlySummary.spent;

  const firstName = useMemo(() => {
    const trimmed = (userName ?? "").trim();
    if (!trimmed) return "";
    return trimmed.split(/\s+/)[0];
  }, [userName]);

  const titleAsset = PITAKA_TITLE_ASSETS.dark;

  return (
    <View style={[styles.page, { paddingTop: 0 }]}>
      {/* Net Worth Hero Header */}
      <HeroHeaderSurface
        theme={theme}
        archBottom
        onHeight={onHeroHeight}
        style={{ marginBottom: -18, zIndex: 2 }}
      >
        <StaggerReveal
          active={entranceActive}
          replayKey={entranceReplayKey}
          index={0}
          offsetY={8}
          duration={220}
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
              <ScalePressable
                onPress={handleToggleHidden}
                accessibilityRole="button"
                accessibilityLabel={hidden ? "Show balances" : "Hide balances"}
                scaleTo={0.91}
                style={[styles.heroIconBtn, heroControlStyle(theme)]}
              >
                <Icon name={hidden ? "eye-off" : "eye"} size={17} color={theme.heroInk} />
              </ScalePressable>
              <ScalePressable
                onPress={handleOpenSearch}
                accessibilityLabel="Search"
                scaleTo={0.91}
                style={[styles.heroIconBtn, heroControlStyle(theme)]}
              >
                <Icon name="search" size={17} color={theme.heroInk} />
              </ScalePressable>
              <ScalePressable
                onPress={onSettings}
                accessibilityRole="button"
                accessibilityLabel="Settings"
                scaleTo={0.91}
                style={[styles.heroIconBtn, heroControlStyle(theme)]}
              >
                <Icon name="settings" size={17} color={theme.heroInk} />
              </ScalePressable>
            </View>
          </View>

          <View style={styles.heroGreetingBlock}>
            {firstName ? (
              <>
                <View style={styles.heroGreetingRow}>
                  <Text
                    style={[styles.heroGreetingTitle, { color: theme.heroMuted, opacity: 1 }]}
                    numberOfLines={1}
                  >
                    {headerClock.greeting}
                  </Text>
                  <Text
                    style={[styles.heroGreetingWeekday, { color: theme.heroMuted, opacity: 1 }]}
                    numberOfLines={1}
                  >
                    {headerClock.weekdayLabel}
                  </Text>
                </View>
                <View style={styles.heroGreetingRow}>
                  <Text
                    style={[styles.heroGreetingName, { color: theme.heroInk }]}
                    numberOfLines={1}
                  >
                    {firstName}
                  </Text>
                  <Text
                    style={[styles.heroGreetingDate, { color: theme.heroInk }]}
                    numberOfLines={1}
                  >
                    {headerClock.monthDayLabel}
                  </Text>
                </View>
              </>
            ) : (
              <View style={[styles.heroGreetingRow, { alignItems: "baseline" }]}>
                <Text
                  style={[styles.heroGreetingName, { color: theme.heroInk }]}
                  numberOfLines={1}
                >
                  {headerClock.greeting}
                </Text>
                <Text
                  style={[styles.heroGreetingSub, { color: theme.heroMuted, opacity: 1 }]}
                  numberOfLines={1}
                >
                  {headerClock.dateLabel}
                </Text>
              </View>
            )}
          </View>
        </StaggerReveal>
      </HeroHeaderSurface>

      <StaggerReveal
        active={entranceActive}
        replayKey={entranceReplayKey}
        index={0.5}
        offsetY={8}
        startOpacity={1}
        duration={220}
      >
        <PhysicalWallet
          shouldOpen={walletOpen}
          scrollY={walletScrollY}
          wallets={wallets}
          total={total}
          hidden={hidden}
          monthlySummary={monthlySummary}
          walletFlows={walletFlows}
          onWallet={onWallet}
          onOpenAdd={handleOpenAdd}
          onOpenReorder={
            onReorderWallets && wallets.length > 1
              ? () => setReorderModalOpen(true)
              : undefined
          }
          onOpenMenu={handleOpenMenu}
          onStackDragChange={onStackDragChange}
          onHingeOffset={handleHingeOffset}
          theme={theme}
        />
      </StaggerReveal>

      <Animated.View style={{ transform: [{ translateY: belowWalletTranslateY }] }}>
        {homeSections
          .filter((sec) => sec.visible)
          .map((sec) => {
            const renderSection: Record<HomeSectionId, () => React.ReactNode> = {
              pulse: () => (
                <StaggerReveal
                  key="pulse"
                  active={entranceActive}
                  replayKey={entranceReplayKey}
                  index={1.5}
                  offsetY={10}
                  startOpacity={0.72}
                  duration={240}
                >
                  <View
                    style={[
                      styles.homeDashCard,
                      {
                        overflow: "hidden",
                        backgroundColor: theme.leather.edge,
                        borderColor: theme.leather.edge,
                      },
                      cardShadow(theme.dark),
                    ]}
                  >
                    <DarkLeatherSurface theme={theme} radius={20} />
                    <View style={styles.homePulseRow}>
                      <View style={styles.homePulseCell}>
                        <Text
                          style={[styles.homePulseLabel, { color: theme.leather.thread }]}
                        >
                          Spent today
                        </Text>
                        <Text
                          style={[styles.homePulseVal, { color: "#ffffff" }]}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                        >
                          {hidden ? (
                            "₱•••"
                          ) : monthlySummary.todaySpent > 0 ? (
                            <>
                              <Text style={{ color: "#fda4af" }}>-</Text>
                              {money(monthlySummary.todaySpent)}
                            </>
                          ) : (
                            money(0)
                          )}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.homePulseDivider,
                          { backgroundColor: "rgba(255, 255, 255, 0.16)" },
                        ]}
                      />
                      <View style={styles.homePulseCell}>
                        <Text
                          style={[styles.homePulseLabel, { color: theme.leather.thread }]}
                        >
                          {monthlySummary.monthLabel} net
                        </Text>
                        <Text
                          style={[styles.homePulseVal, { color: "#ffffff" }]}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                        >
                          {hidden ? (
                            "₱•••"
                          ) : (
                            <>
                              <Text style={{ color: netMonth >= 0 ? "#6ee7b7" : "#fda4af" }}>
                                {netMonth >= 0 ? "+" : "-"}
                              </Text>
                              {money(Math.abs(netMonth))}
                            </>
                          )}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.homePulseDivider,
                          { backgroundColor: "rgba(255, 255, 255, 0.16)" },
                        ]}
                      />
                      <View style={styles.homePulseCell}>
                        <Text
                          style={[styles.homePulseLabel, { color: theme.leather.thread }]}
                        >
                          Saved
                        </Text>
                        <Text
                          style={[
                            styles.homePulseVal,
                            {
                              color:
                                savedRate !== null ? "#ffffff" : theme.leather.thread,
                            },
                          ]}
                        >
                          {hidden ? "••" : savedRate !== null ? `${savedRate}%` : "—"}
                        </Text>
                      </View>
                    </View>

                    <ScalePressable
                      onPress={handleOpenBudget}
                      scaleTo={0.985}
                      pressOpacity={0.86}
                      style={[
                        styles.homeBudgetSection,
                        {
                          borderTopColor: "rgba(255, 255, 255, 0.14)",
                        },
                      ]}
                    >
                      {budgetLimit > 0 ? (
                        <>
                          <View style={styles.homeBudgetTopRow}>
                            <View style={styles.homeBudgetTitleGroup}>
                              <Text style={[styles.homeBudgetLabel, { color: "#ffffff" }]}>
                                Monthly budget
                              </Text>
                              <Text
                                style={[
                                  styles.homeBudgetPct,
                                  {
                                    color:
                                      budgetPct >= 100
                                        ? "#fda4af"
                                        : budgetPct >= 80
                                          ? "#fcd34d"
                                          : "#6ee7b7",
                                  },
                                ]}
                              >
                                {budgetPct}%
                              </Text>
                            </View>
                            <Text
                              style={[
                                styles.homeBudgetRatio,
                                { color: theme.leather.thread },
                              ]}
                            >
                              {hidden ? "₱•••" : money(monthlySummary.spent, true)} /{" "}
                              {hidden ? "₱•••" : money(budgetLimit, true)}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.homeProgressTrack,
                              { backgroundColor: "rgba(255, 255, 255, 0.14)" },
                            ]}
                          >
                            <AnimatedBarFill
                              pct={budgetPct}
                              active={entranceActive}
                              animateKey={`${entranceReplayKey}-${budgetPct}`}
                              delayMs={180}
                              style={[
                                styles.homeProgressFill,
                                {
                                  backgroundColor:
                                    budgetPct >= 100
                                      ? "#fb7185"
                                      : budgetPct >= 80
                                        ? "#fbbf24"
                                        : "#34d399",
                                },
                              ]}
                            />
                          </View>
                          <View style={styles.homeBudgetSubRow}>
                            <Text
                              style={[
                                styles.homeBudgetSub,
                                { color: theme.leather.thread },
                              ]}
                            >
                              {budgetRemaining >= 0
                                ? `${hidden ? "₱•••" : money(budgetRemaining)} left this month`
                                : `Over budget by ${hidden ? "₱•••" : money(Math.abs(budgetRemaining))}`}
                            </Text>
                            <Text
                              style={[
                                styles.homeBudgetEditHint,
                                { color: "#ffffff" },
                              ]}
                            >
                              Edit
                            </Text>
                          </View>
                        </>
                      ) : (
                        <View style={styles.homeBudgetEmptyRow}>
                          <View style={styles.homeBudgetTitleGroup}>
                            <Icon name="pie" size={15} color={theme.leather.thread} />
                            <Text style={[styles.homeBudgetLabel, { color: "#ffffff" }]}>
                              Set monthly budget
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.homeBudgetEditHint,
                              { color: theme.leather.thread },
                            ]}
                          >
                            Tap to set ›
                          </Text>
                        </View>
                      )}
                    </ScalePressable>
                  </View>
                </StaggerReveal>
              ),
              payLater: () => {
                if (payLaterAccounts.length === 0) return null;
                const now = new Date();
                const sorted = [...payLaterAccounts].sort((a, b) => {
                  const sa = getPayLaterDueStatus(a, now);
                  const sb = getPayLaterDueStatus(b, now);
                  if (sa.paid !== sb.paid) return sa.paid ? 1 : -1;
                  return sa.daysUntil - sb.daysUntil;
                });
                const unpaidSum = sorted.reduce((acc, item) => {
                  const st = getPayLaterDueStatus(item, now);
                  return st.paid ? acc : acc + item.dueAmount;
                }, 0);
                return (
                  <StaggerReveal
                    key="payLater"
                    active={entranceActive}
                    replayKey={entranceReplayKey}
                    index={2.0}
                    offsetY={10}
                    startOpacity={0.72}
                    duration={240}
                  >
                    <View style={[styles.section, { marginTop: 14 }]}>
                      <SectionTitle
                        title="PayLater Bills"
                        action={
                          unpaidSum > 0
                            ? `${hidden ? "₱•••" : money(unpaidSum)} due`
                            : "Manage"
                        }
                        actionIcon="chevron"
                        actionColor={theme.accentText}
                        onPress={onOpenPayLater}
                        theme={theme}
                      />
                      <View
                        style={[
                          styles.homeDashCard,
                          {
                            overflow: "hidden",
                            backgroundColor: theme.card,
                            borderColor: hexToRgba(theme.leather.accent, 0.22),
                            gap: 10,
                          },
                          cardShadow(theme.dark),
                        ]}
                      >
                        <LightLeatherSurface theme={theme} radius={20} />
                        {sorted.slice(0, 3).map((item) => {
                          const preset = getPayLaterPreset(item.providerKey);
                          const st = getPayLaterDueStatus(item, now);
                          const stColor =
                            st.tone === "paid"
                              ? "#10b981"
                              : st.tone === "overdue"
                                ? "#e11d48"
                                : st.tone === "soon"
                                  ? "#d97706"
                                  : theme.muted;
                          return (
                            <ScalePressable
                              key={item.id}
                              onPress={onOpenPayLater}
                              scaleTo={0.985}
                              pressOpacity={0.82}
                              style={styles.homeCatTop}
                            >
                              <View style={[styles.homeCatLeft, { gap: 10 }]}>
                                <View
                                  style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: 9,
                                    backgroundColor: preset.accent,
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  <Text
                                    style={{
                                      color: preset.ink,
                                      fontFamily: "Poppins_800ExtraBold",
                                      fontWeight: "800",
                                      fontSize: 10,
                                      includeFontPadding: false,
                                    }}
                                  >
                                    {preset.short}
                                  </Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                  <Text
                                    style={[styles.homeCatName, { color: theme.ink }]}
                                    numberOfLines={1}
                                  >
                                    {item.name}
                                  </Text>
                                  <Text
                                    style={[styles.homeCatShare, { color: stColor }]}
                                    numberOfLines={1}
                                  >
                                    {st.label}
                                    {item.totalMonths
                                      ? ` · ${item.paidMonthsCount ?? 0}/${item.totalMonths} mos`
                                      : ""}
                                  </Text>
                                </View>
                              </View>
                              <Text
                                style={[
                                  styles.homeCatAmount,
                                  {
                                    color: st.paid ? theme.muted : theme.ink,
                                    textDecorationLine: st.paid ? "line-through" : "none",
                                  },
                                ]}
                              >
                                {hidden ? "₱•••" : money(item.dueAmount)}
                              </Text>
                            </ScalePressable>
                          );
                        })}
                      </View>
                    </View>
                  </StaggerReveal>
                );
              },
              topSpending: () =>
                topCategories.length > 0 ? (
                  <StaggerReveal
                    key="topSpending"
                    active={entranceActive}
                    replayKey={entranceReplayKey}
                    index={2.4}
                    offsetY={10}
                    startOpacity={0.72}
                    duration={240}
                  >
                    <View style={[styles.section, { marginTop: 14 }]}>
                      <SectionTitle
                        title="Top Spending"
                        action="Overview"
                        actionIcon="chevron"
                        actionColor={theme.accentText}
                        onPress={handleGoOverview}
                        theme={theme}
                      />
                      <View
                        style={[
                          styles.homeDashCard,
                          {
                            overflow: "hidden",
                            backgroundColor: theme.card,
                            borderColor: hexToRgba(theme.leather.accent, 0.22),
                            gap: 11,
                          },
                          cardShadow(theme.dark),
                        ]}
                      >
                        <LightLeatherSurface theme={theme} radius={20} />
                        {topCategories.map((cat, idx) => {
                          const maxAmt = topCategories[0]?.amount || 1;
                          const fillPct =
                            cat.limit > 0
                              ? Math.min(100, (cat.amount / cat.limit) * 100)
                              : Math.min(100, (cat.amount / maxAmt) * 100);
                          const overLimit = cat.limit > 0 && cat.amount > cat.limit;
                          const sharePct =
                            monthlySummary.spent > 0
                              ? Math.round((cat.amount / monthlySummary.spent) * 100)
                              : 0;
                          const catTint = overLimit ? "#e11d48" : theme.leather.accent;
                          return (
                            <ScalePressable
                              key={cat.category}
                              onPress={() =>
                                onOpenCategoryBudget
                                  ? onOpenCategoryBudget(cat.category)
                                  : handleGoOverview()
                              }
                              scaleTo={0.985}
                              pressOpacity={0.82}
                              style={styles.homeCatRow}
                            >
                              <View style={styles.homeCatTop}>
                                <View style={styles.homeCatLeft}>
                                  <Icon name={cat.icon} size={15} color={catTint} />
                                  <Text
                                    style={[styles.homeCatName, { color: theme.ink }]}
                                    numberOfLines={1}
                                  >
                                    {cat.category}
                                  </Text>
                                  <Text
                                    style={[styles.homeCatShare, { color: catTint }]}
                                  >
                                    {cat.limit > 0
                                      ? `of ${hidden ? "₱••" : money(cat.limit, true)}`
                                      : `${sharePct}%`}
                                  </Text>
                                </View>
                                <Text
                                  style={[
                                    styles.homeCatAmount,
                                    { color: overLimit ? "#e11d48" : theme.ink },
                                  ]}
                                >
                                  {hidden ? "₱•••" : money(cat.amount)}
                                </Text>
                              </View>
                              <View
                                style={[
                                  styles.homeProgressTrack,
                                  {
                                    height: 5,
                                    backgroundColor: hexToRgba(catTint, 0.16),
                                  },
                                ]}
                              >
                                <AnimatedBarFill
                                  pct={Math.max(4, fillPct)}
                                  active={entranceActive}
                                  animateKey={`${entranceReplayKey}-${cat.category}-${fillPct}`}
                                  delayMs={200 + idx * 45}
                                  style={[
                                    styles.homeProgressFill,
                                    { backgroundColor: catTint },
                                  ]}
                                />
                              </View>
                            </ScalePressable>
                          );
                        })}
                      </View>
                    </View>
                  </StaggerReveal>
                ) : null,
              upcoming: () => (
                <StaggerReveal
                  key="upcoming"
                  active={entranceActive}
                  replayKey={entranceReplayKey}
                  index={4}
                  offsetY={12}
                  duration={260}
                >
                  <Upcoming
                    schedules={schedules}
                    wallets={wallets}
                    hidden={hidden}
                    theme={theme}
                    onRecord={onRecordScheduled}
                    onManage={handleOpenSchedules}
                  />
                </StaggerReveal>
              ),
              recent: () => (
                <StaggerReveal
                  key="recent"
                  active={entranceActive}
                  replayKey={entranceReplayKey}
                  index={4.5}
                  offsetY={12}
                  duration={260}
                >
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
                      {recentActivities.map((item, idx) => (
                        <StaggerReveal
                          key={item.id}
                          active={entranceActive}
                          replayKey={entranceReplayKey}
                          index={4.7 + idx * 0.45}
                          offsetY={10}
                          duration={240}
                        >
                          <TxRow
                            item={item}
                            hidden={hidden}
                            onPress={onTransaction ? () => onTransaction(item) : undefined}
                            theme={theme}
                          />
                        </StaggerReveal>
                      ))}
                    </View>
                  </View>
                </StaggerReveal>
              ),
            };
            return renderSection[sec.id]();
          })}
      </Animated.View>

      <ReorderWalletsModal
        visible={reorderModalOpen}
        wallets={wallets}
        hidden={hidden}
        theme={theme}
        onSaveOrder={(ordered) => onReorderWallets?.(ordered)}
        onClose={() => setReorderModalOpen(false)}
      />
    </View>
  );
});

const WALLET_FULL_HEIGHT = 130;
const WALLET_COMPACT_HEIGHT = 58;
const WALLET_TILE_GAP = 10;

export const WalletsScreen = React.memo(function WalletsScreen({
  wallets,
  activities = [],
  total,
  hidden,
  onToggleHidden,
  onToggleWalletHidden,
  onWallet,
  onUpdateWallet,
  onReorderWallets,
  onAddWallet,
  onSearch,
  onSettings,
  onDragChange,
  onHeroHeight,
  theme,
}: {
  wallets: Wallet[];
  activities?: ActivityItem[];
  total: number;
  hidden: boolean;
  onToggleHidden?: () => void;
  onToggleWalletHidden?: (wallet: Wallet) => void;
  onWallet: (w: Wallet) => void;
  onUpdateWallet?: (w: Wallet) => void;
  onReorderWallets?: (next: Wallet[]) => void;
  onAddWallet?: () => void;
  onSearch?: () => void;
  onSettings?: () => void;
  onDragChange?: (dragging: boolean) => void;
  onHeroHeight?: (height: number) => void;
  theme: ThemeColors;
}) {
  void onToggleWalletHidden;
  void onDragChange;
  const visibleWallets = useMemo(
    () => wallets.filter((w) => !w.isHidden),
    [wallets]
  );
  const hiddenWallets = useMemo(
    () => wallets.filter((w) => Boolean(w.isHidden)),
    [wallets]
  );
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [reorderGroup, setReorderGroup] = useState<{
    label: string;
    wallets: Wallet[];
  } | null>(null);

  const { monthLabel, fullMonthLabel, totalEarned, totalSpent, walletFlows, walletFlowsRecord } =
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
      const flowRec: Record<number, { earned: number; spent: number }> = {};
      for (const [id, val] of flows.entries()) {
        flowRec[id] = val;
      }
      return {
        monthLabel: shortMonth,
        fullMonthLabel: longMonth,
        totalEarned: earnedSum,
        totalSpent: spentSum,
        walletFlows: flows,
        walletFlowsRecord: flowRec,
      };
    }, [wallets, activities]);

  const walletGroups = useMemo(() => {
    const byType = new Map<string, Wallet[]>();
    for (const w of visibleWallets) {
      const label = (w.type || "").trim() || "Other";
      const list = byType.get(label) ?? [];
      list.push(w);
      byType.set(label, list);
    }
    const preferred = ["Cash", "E-wallet", "E-wallets", "Bank"];
    const orderedKeys = [
      ...preferred.filter((k) => byType.has(k)),
      ...Array.from(byType.keys()).filter((k) => !preferred.includes(k)),
    ];
    return orderedKeys.map((label) => {
      const groupWallets = byType.get(label)!;
      let groupTotal = 0;
      let groupEarned = 0;
      let groupSpent = 0;
      for (const w of groupWallets) {
        groupTotal += w.balance;
        const f = walletFlows.get(w.id);
        if (f) {
          groupEarned += f.earned;
          groupSpent += f.spent;
        }
      }
      return {
        key: label,
        label,
        wallets: groupWallets,
        total: groupTotal,
        earned: groupEarned,
        spent: groupSpent,
      };
    });
  }, [visibleWallets, walletFlows]);

  const hiddenGroupSummary = useMemo(() => {
    let groupTotal = 0;
    let groupEarned = 0;
    let groupSpent = 0;
    for (const w of hiddenWallets) {
      groupTotal += w.balance;
      const f = walletFlows.get(w.id);
      if (f) {
        groupEarned += f.earned;
        groupSpent += f.spent;
      }
    }
    return {
      total: groupTotal,
      earned: groupEarned,
      spent: groupSpent,
    };
  }, [hiddenWallets, walletFlows]);

  const toggleGroupOpen = useCallback((key: string, defaultOpen: boolean) => {
    setOpenGroups((prev) => {
      const current = prev[key] ?? defaultOpen;
      return { ...prev, [key]: !current };
    });
  }, []);

  const handleSaveReorder = useCallback(
    (orderedGroup: Wallet[]) => {
      const groupIds = new Set(orderedGroup.map((w) => w.id));
      let cursor = 0;
      const nextVisible = visibleWallets.map((w) =>
        groupIds.has(w.id) ? orderedGroup[cursor++] : w
      );
      onReorderWallets?.([...nextVisible, ...hiddenWallets]);
    },
    [hiddenWallets, onReorderWallets, visibleWallets]
  );

  return (
    <View style={[styles.page, { paddingTop: 0 }]}>
      {/* Hero Balance Container */}
      <HeroHeaderSurface
        theme={theme}
        compact
        onHeight={onHeroHeight}
        style={{ marginBottom: 14 }}
      >
        <View style={styles.heroTopRow}>
          <HeroEmbroideredTitle kind="wallets" height={42} />
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
                accessibilityRole="button"
                accessibilityLabel="Add wallet"
                style={({ pressed }) => [
                  styles.heroIconBtn,
                  heroControlStyle(theme),
                  { transform: [{ scale: pressed ? 0.92 : 1 }] },
                ]}
              >
                <Icon name="plus" size={18} color={theme.heroInk} />
              </Pressable>
            ) : null}
            {onSearch ? (
              <Pressable
                onPress={onSearch}
                accessibilityRole="button"
                accessibilityLabel="Search"
                style={({ pressed }) => [
                  styles.heroIconBtn,
                  heroControlStyle(theme),
                  { transform: [{ scale: pressed ? 0.92 : 1 }] },
                ]}
              >
                <Icon name="search" size={17} color={theme.heroInk} />
              </Pressable>
            ) : null}
            {onSettings ? (
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
            ) : null}
          </View>
        </View>

        <View style={[styles.heroBalanceBlock, { marginTop: 10, gap: 2 }]}>
          <Text style={[styles.heroHeaderLabel, { color: theme.heroMuted, opacity: 1 }]}>Combined balance</Text>
          <Amount value={total} hidden={hidden} size="md" color={theme.heroInk} />
        </View>

        <HeroMonthlyFlowRow
          theme={theme}
          monthLabel={fullMonthLabel}
          earned={totalEarned}
          spent={totalSpent}
          hidden={hidden}
          compact
        />
      </HeroHeaderSurface>

      {visibleWallets.length === 0 ? (
        <View
          style={[
            styles.emptyState,
            {
              backgroundColor: theme.card,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: hexToRgba(theme.leather.accent, 0.24),
            },
            cardShadow(theme.dark),
          ]}
        >
          <LightLeatherSurface theme={theme} radius={22} />
          <Icon name="wallet" size={28} color={theme.leather.accent} />
          <Text style={[styles.emptyStateTitle, { color: theme.ink, marginTop: 10 }]}>
            No wallets yet
          </Text>
          <Text style={[styles.emptyStateSub, { color: theme.muted }]}>
            Tap below to add your first e-wallet, bank, or cash card.
          </Text>
          {onAddWallet ? (
            <Pressable
              onPress={onAddWallet}
              style={({ pressed }) => [
                styles.stitchedEmptyCta,
                {
                  overflow: "hidden",
                  borderColor: theme.leather.edge,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
                cardShadow(theme.dark),
              ]}
            >
              <DarkLeatherSurface theme={theme} radius={16} />
              <Icon name="plus" size={15} color="#ffffff" />
              <Text style={styles.stitchedEmptyCtaText}>Add wallet</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={{ gap: 14 }}>
          {walletGroups.map((group) => (
            <View key={group.key}>
              <SectionTitle
                title={group.label}
                subtitle={`${group.wallets.length} ${group.wallets.length === 1 ? "card" : "cards"}`}
                style={{ marginBottom: 4 }}
                theme={theme}
              />
              <GroupedPhysicalWallet
                groupLabel={group.label}
                wallets={group.wallets}
                total={group.total}
                hidden={hidden}
                isOpen
                collapsible={false}
                monthlySummary={{
                  monthLabel: fullMonthLabel,
                  monthShortLabel: monthLabel,
                  earned: group.earned,
                  spent: group.spent,
                }}
                walletFlows={walletFlowsRecord}
                theme={theme}
                onWallet={onWallet}
                onOpenMenu={onUpdateWallet ?? onWallet}
                onOpenAdd={onAddWallet}
                onOpenReorder={
                  group.wallets.length > 1 && onReorderWallets
                    ? () => setReorderGroup({ label: group.label, wallets: group.wallets })
                    : undefined
                }
              />
            </View>
          ))}
        </View>
      )}

      {hiddenWallets.length > 0 ? (
        <View style={{ marginTop: 14 }}>
          <SectionTitle
            title="Hidden"
            subtitle={`${hiddenWallets.length} ${hiddenWallets.length === 1 ? "card" : "cards"}`}
            style={{ marginBottom: 4 }}
            theme={theme}
          />
          <GroupedPhysicalWallet
            groupLabel="Hidden"
            wallets={hiddenWallets}
            total={hiddenGroupSummary.total}
            hidden={hidden}
            isOpen={openGroups.__hidden__ ?? false}
            onToggleOpen={() => toggleGroupOpen("__hidden__", false)}
            monthlySummary={{
              monthLabel: fullMonthLabel,
              monthShortLabel: monthLabel,
              earned: hiddenGroupSummary.earned,
              spent: hiddenGroupSummary.spent,
            }}
            walletFlows={walletFlowsRecord}
            theme={theme}
            onWallet={onWallet}
            onOpenMenu={onUpdateWallet ?? onWallet}
          />
        </View>
      ) : null}

      <ReorderWalletsModal
        visible={reorderGroup !== null}
        wallets={reorderGroup?.wallets ?? []}
        hidden={hidden}
        title={reorderGroup ? `Reorder ${reorderGroup.label} cards` : "Reorder cards"}
        subtitle={
          reorderGroup
            ? `Drag handles to arrange your ${reorderGroup.label} cards`
            : undefined
        }
        theme={theme}
        onSaveOrder={handleSaveReorder}
        onClose={() => setReorderGroup(null)}
      />
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
  onSearch,
  onSettings,
  monthlyBudget = null,
  monthlySpending: monthSpending,
  categoryLimits,
  onOpenCategoryBudget,
  onEditBudget,
  onOpenWallet,
  onViewAllWallets,
  onTransaction,
  onShowToast,
  showFilters = false,
  onToggleFilters,
  categoryFilter,
  onClearCategory,
  onCategorySelect,
  onViewAllCategories,
  isActive = true,
  onHeroHeight,
  theme,
}: {
  mode: "transactions" | "overview";
  activities: ActivityItem[];
  wallets?: Wallet[];
  hidden: boolean;
  onToggleHidden?: () => void;
  onSearch?: () => void;
  onSettings?: () => void;
  monthlyBudget?: number | null;
  monthlySpending: MonthlySpending;
  categoryLimits: CategoryLimits;
  onOpenCategoryBudget: (category: string | null) => void;
  onEditBudget?: () => void;
  onOpenWallet?: (wallet: Wallet) => void;
  onViewAllWallets?: () => void;
  onTransaction?: (item: ActivityItem) => void;
  onShowToast?: (msg: string) => void;
  showFilters?: boolean;
  onToggleFilters?: () => void;
  categoryFilter?: { category: string } | null;
  onClearCategory?: () => void;
  onCategorySelect?: (category: string) => void;
  onViewAllCategories?: () => void;
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
  const activeCategory = categoryFilter?.category ?? selectedCategory;

  const visibleWalletChips = useMemo(
    () => wallets.filter((w) => !w.isHidden),
    [wallets]
  );

  const filteredActivities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return activities.filter((item) => {
      if (typeFilter === "Expenses" && !isExpenseActivity(item)) return false;
      if (typeFilter === "Income" && !isIncomeActivity(item)) return false;
      if (typeFilter === "Transfers" && !isTransferActivity(item)) return false;
      if (typeFilter === "Adjusted" && !isAdjustmentActivity(item)) return false;

      if (activeCategory) {
        if (activeCategory === "Transfers") {
          if (!isTransferActivity(item)) return false;
        } else if (item.kind !== activeCategory) {
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
        const displayWallet = getDisplayActivityWallet(item, wallets).label;
        const haystack =
          `${item.title} ${displayWallet} ${item.kind} ${item.date}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [
    activities,
    wallets,
    typeFilter,
    activeCategory,
    selectedWalletFilter,
    searchQuery,
  ]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredActivities.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageEnd = Math.min(filteredActivities.length, pageStart + pageSize);
  const pageItems = filteredActivities.slice(pageStart, pageEnd);

  const groupedPageItems = useMemo(() => {
    const groups: { dateLabel: string; dayNet: number; items: ActivityItem[] }[] = [];
    const byDate = new Map<string, { dateLabel: string; dayNet: number; items: ActivityItem[] }>();
    for (const item of pageItems) {
      const dateLabel = (item.date || "Recent").split(",")[0].trim() || "Recent";
      let group = byDate.get(dateLabel);
      if (!group) {
        group = { dateLabel, dayNet: 0, items: [] };
        byDate.set(dateLabel, group);
        groups.push(group);
      }
      group.items.push(item);
      group.dayNet += item.amount;
    }
    return groups;
  }, [pageItems]);

  const filteredNetTotal = useMemo(
    () => filteredActivities.reduce((sum, item) => sum + item.amount, 0),
    [filteredActivities]
  );

  const activityMonthFlow = useMemo(() => {
    const now = monthSpending.referenceDate;
    const month = now.getMonth();
    const year = now.getFullYear();
    let earned = 0;
    for (const item of activities) {
      if (!isIncomeActivity(item)) continue;
      if (getDisplayActivityWallet(item, wallets).isHidden) continue;
      const d = getActivityDate(item, now);
      if (d.getMonth() === month && d.getFullYear() === year) {
        earned += item.amount;
      }
    }
    return {
      earned,
      spent: monthSpending.spent,
      label: monthSpending.monthLabel,
    };
  }, [activities, wallets, monthSpending]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    if (!isActive) {
      barProgress.setValue(0);
      return;
    }
    barProgress.setValue(0);
    const anim = Animated.timing(barProgress, {
      toValue: 1,
      duration: 420,
      easing: MOTION_EASE,
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
        const label = d.toLocaleDateString("en-US", { weekday: "short" });
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

  const breakdownDonut = useMemo(() => {
    const isIncome = categoryMode === "Income";
    const byCat = new Map<string, number>();
    let total = 0;
    for (const item of activities) {
      if (isIncome ? !isIncomeActivity(item) : !isExpenseActivity(item)) continue;
      const amt = Math.abs(item.amount);
      total += amt;
      const label = item.kind || "Other";
      byCat.set(label, (byCat.get(label) ?? 0) + amt);
    }
    const sorted = Array.from(byCat.entries()).sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 3);
    const rest = sorted.slice(3).reduce((sum, [, v]) => sum + v, 0);
    const slices = rest > 0 ? [...top, ["Other", rest] as [string, number]] : top;
    const baseHex = isIncome ? theme.positive : theme.leather.accent;
    const shades = [
      baseHex,
      hexToRgba(baseHex, 0.68),
      hexToRgba(baseHex, 0.42),
      hexToRgba(baseHex, 0.24),
    ];
    return {
      total,
      isIncome,
      segments: slices.map(([label, amount], idx) => ({
        label,
        amount,
        pct: total > 0 ? Math.round((amount / total) * 100) : 0,
        color: shades[idx] ?? shades[3],
      })),
    };
  }, [activities, categoryMode, theme.leather.accent, theme.positive]);

  const activeBucket =
    selectedBucketIdx !== null ? chartData.bars[selectedBucketIdx] : undefined;
  const hasFilter =
    typeFilter !== "All" ||
    activeCategory !== null ||
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
        esc(getDisplayActivityWallet(item, wallets).label),
        esc(item.kind),
        esc(dir),
        esc(item.amount.toFixed(2)),
        esc("Local"),
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
        compact
        onHeight={onHeroHeight}
        style={{ marginBottom: 14 }}
      >
        <View style={styles.heroTopRow}>
          <HeroEmbroideredTitle kind={mode === "overview" ? "overview" : "activity"} height={44} />
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
            {onSearch ? (
              <Pressable
                onPress={onSearch}
                accessibilityRole="button"
                accessibilityLabel="Search"
                style={({ pressed }) => [
                  styles.heroIconBtn,
                  heroControlStyle(theme),
                  { transform: [{ scale: pressed ? 0.92 : 1 }] },
                ]}
              >
                <Icon name="search" size={17} color={theme.heroInk} />
              </Pressable>
            ) : null}
            {onSettings ? (
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
            ) : null}
          </View>
        </View>

        <View style={[styles.heroBalanceBlock, { marginTop: 10, gap: 2 }]}>
          <Text style={[styles.heroHeaderLabel, { color: theme.heroMuted, opacity: 1 }]}>{mode === "overview" ? "Total expenses" : "Your activity"}</Text>
          {mode === "overview" ? <Amount value={totalOut} hidden={hidden} size="md" color={theme.heroInk} /> : <Text style={[styles.heroHeaderTitle, { color: theme.heroInk, fontSize: 21 }]}>{activities.length} {activities.length === 1 ? "transaction" : "transactions"}</Text>}
        </View>

        <HeroMonthlyFlowRow
          theme={theme}
          monthLabel={activityMonthFlow.label}
          earned={activityMonthFlow.earned}
          spent={activityMonthFlow.spent}
          hidden={hidden}
          compact
        />
      </HeroHeaderSurface>

      {mode === "overview" ? <>
        {/* Stitched Dark Leather Cashflow Chart */}
        <View
          style={[
            styles.overviewChartCard,
            {
              overflow: "hidden",
              backgroundColor: theme.leather.colors[1],
              borderColor: theme.leather.edge,
            },
            cardShadow(theme.dark),
          ]}
        >
          <DarkLeatherSurface theme={theme} radius={22} />
          <View style={styles.overviewChartHeader}>
            <View style={{ flex: 1 }}>
              {activeBucket ? (
                <Text style={[styles.chartTabSummary, { color: "#ffffff" }]} numberOfLines={1}>
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
                        { backgroundColor: "#6ee7b7" },
                      ]}
                    />
                    <Text style={[styles.chartLegendText, { color: theme.heroMuted, opacity: 1 }]}>Income</Text>
                  </View>
                  <View style={styles.chartLegendItem}>
                    <View
                      style={[
                        styles.chartLegendDot,
                        { backgroundColor: "rgba(255, 255, 255, 0.88)" },
                      ]}
                    />
                    <Text style={[styles.chartLegendText, { color: theme.heroMuted, opacity: 1 }]}>Expense</Text>
                  </View>
                </View>
              )}
            </View>
            <Pressable
              onPress={() => {
                setSelectedBucketIdx(null);
                setRange(range === "Month" ? "Week" : "Month");
              }}
              style={({ pressed }) => [
                styles.overviewRangeChip,
                {
                  backgroundColor: "rgba(255, 255, 255, 0.12)",
                  borderColor: "rgba(255, 255, 255, 0.18)",
                  opacity: pressed ? 0.78 : 1,
                },
              ]}
            >
              <Text style={[styles.rangePillText, { color: "#ffffff" }]}>{range}</Text>
              <Icon name="down" size={12} color="rgba(255, 255, 255, 0.85)" />
            </Pressable>
          </View>

          {/* Chart Grid & Bars */}
          <View style={[styles.chartBody, { marginTop: 10 }]}>
            <View style={styles.chartGrid}>
              {chartData.gridLabels.map((lvl, idx) => (
                <View
                  key={`${idx}-${lvl}`}
                  style={[
                    styles.chartGridLine,
                    { borderBottomColor: "rgba(255, 255, 255, 0.1)" },
                  ]}
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
                            backgroundColor: "#6ee7b7",
                          },
                        ]}
                      />
                      <Animated.View
                        style={[
                          styles.bar,
                          {
                            height: barProgress.interpolate({
                              inputRange: [0, 1],
                              outputRange: ["0%", `${b.outPct}%`],
                            }),
                            backgroundColor: "rgba(255, 255, 255, 0.88)",
                          },
                        ]}
                      />
                    </View>
                    <Text
                      style={[
                        styles.barLabel,
                        { color: theme.heroMuted },
                        isSelected && { color: "#ffffff", fontWeight: "800" },
                      ]}
                      numberOfLines={1}
                    >
                      {b.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* Expense / Income Breakdown Donut Chart */}
        <View
          style={[
            styles.donutCard,
            {
              overflow: "hidden",
              backgroundColor: theme.card,
              borderColor: hexToRgba(theme.leather.accent, 0.24),
            },
            cardShadow(theme.dark),
          ]}
        >
          <LightLeatherSurface theme={theme} radius={20} />
          <View style={styles.donutHeader}>
            <Text style={[styles.donutTitle, { color: theme.ink }]}>
              {categoryMode} breakdown
            </Text>
            <View
              style={[
                styles.walletOverviewRangePill,
                {
                  overflow: "hidden",
                  backgroundColor: theme.page,
                  borderColor: hexToRgba(theme.leather.accent, 0.24),
                },
              ]}
            >
              {(["Expense", "Income"] as const).map((m) => {
                const active = categoryMode === m;
                return (
                  <Pressable
                    key={m}
                    onPress={() => {
                      setCategoryMode(m);
                      setSelectedCategory(null);
                      setPage(1);
                    }}
                    style={[
                      styles.walletOverviewRangeChip,
                      active && {
                        backgroundColor:
                          m === "Income" ? theme.positive : theme.leather.accent,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.walletOverviewRangeText,
                        { color: active ? "#ffffff" : theme.muted },
                      ]}
                    >
                      {m}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          {breakdownDonut.segments.length > 0 ? (
            <View style={styles.donutRow}>
              <View style={styles.donutRingWrap}>
                {(() => {
                  const size = 96;
                  const stroke = 11;
                  const r = (size - stroke) / 2;
                  const c = 2 * Math.PI * r;
                  let offsetAcc = 0;
                  return (
                    <Svg width={size} height={size}>
                      <SvgCircle
                        cx={size / 2}
                        cy={size / 2}
                        r={r}
                        stroke={hexToRgba(
                          breakdownDonut.isIncome
                            ? theme.positive
                            : theme.leather.accent,
                          0.12
                        )}
                        strokeWidth={stroke}
                        fill="none"
                      />
                      {breakdownDonut.segments.map((seg) => {
                        const len =
                          breakdownDonut.total > 0
                            ? (seg.amount / breakdownDonut.total) * c
                            : 0;
                        const dashOffset = -offsetAcc;
                        offsetAcc += len;
                        return (
                          <SvgCircle
                            key={seg.label}
                            cx={size / 2}
                            cy={size / 2}
                            r={r}
                            stroke={seg.color}
                            strokeWidth={stroke}
                            strokeDasharray={`${len} ${c}`}
                            strokeDashoffset={dashOffset}
                            strokeLinecap="butt"
                            rotation={-90}
                            origin={`${size / 2}, ${size / 2}`}
                            fill="none"
                          />
                        );
                      })}
                    </Svg>
                  );
                })()}
                <View style={styles.donutCenter}>
                  <Text style={[styles.donutCenterLabel, { color: theme.muted }]}>
                    {categoryMode}
                  </Text>
                  <Text
                    style={[styles.donutCenterVal, { color: theme.ink }]}
                    numberOfLines={1}
                  >
                    {hidden ? "••••" : money(breakdownDonut.total, true)}
                  </Text>
                </View>
              </View>

              <View style={styles.donutLegend}>
                {breakdownDonut.segments.map((seg) => (
                  <View key={seg.label} style={styles.donutLegendRow}>
                    <View
                      style={[styles.donutDot, { backgroundColor: seg.color }]}
                    />
                    <Text
                      style={[styles.donutLegendName, { color: theme.ink }]}
                      numberOfLines={1}
                    >
                      {seg.label}
                    </Text>
                    <Text style={[styles.donutLegendPct, { color: theme.muted }]}>
                      {seg.pct}%
                    </Text>
                    <Text style={[styles.donutLegendAmt, { color: theme.ink }]}>
                      {hidden ? "••" : money(seg.amount, true)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <Text style={[styles.donutSub, { color: theme.muted }]}>
              No {categoryMode.toLowerCase()} transactions recorded yet.
            </Text>
          )}
        </View>

        {/* Monthly Spending Budget Target Card */}
        {onEditBudget ? (
          <Pressable
            onPress={onEditBudget}
            style={({ pressed }) => [
              styles.budgetCard,
              {
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: hexToRgba(theme.leather.accent, 0.24),
                overflow: "hidden",
                transform: [{ scale: pressed ? 0.99 : 1 }],
              },
              cardShadow(theme.dark),
            ]}
          >
            <LightLeatherSurface theme={theme} radius={18} />
            {monthlyBudget && monthlyBudget > 0 ? (() => {
              const pct = Math.min(
                100,
                Math.round((monthSpending.spent / monthlyBudget) * 100)
              );
              const rawRatio = monthSpending.spent / monthlyBudget;
              const remaining = monthlyBudget - monthSpending.spent;
              const overBudget = remaining < 0;

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
                          overflow: "hidden",
                          backgroundColor: overBudget
                            ? "#c04444"
                            : theme.leather.colors[1],
                          borderWidth: 1,
                          borderColor: overBudget
                            ? "#a23434"
                            : theme.leather.edge,
                        },
                      ]}
                    >
                      {!overBudget && <DarkLeatherSurface theme={theme} radius={12} />}
                      <Text
                        style={[styles.budgetEditText, { color: "#ffffff" }]}
                      >
                        {pct}% · Edit
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.budgetTrack,
                      {
                        backgroundColor: hexToRgba(
                          theme.leather.accent,
                          theme.dark ? 0.22 : 0.12
                        ),
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.budgetFill,
                        {
                          width: `${pct}%`,
                          backgroundColor: overBudget
                            ? "#c04444"
                            : rawRatio >= 0.75
                              ? "#d97706"
                              : theme.leather.accent,
                        },
                      ]}
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
                    {
                      overflow: "hidden",
                      backgroundColor: theme.leather.colors[1],
                      borderWidth: 1,
                      borderColor: theme.leather.edge,
                    },
                  ]}
                >
                  <DarkLeatherSurface theme={theme} radius={12} />
                  <Text style={[styles.budgetEditText, { color: "#ffffff" }]}>
                    Set target
                  </Text>
                </View>
              </View>
            )}
          </Pressable>
        ) : null}

        <CategoryBudgetOverview limits={categoryLimits} spending={monthSpending} hidden={hidden}
          theme={theme} onOpen={onOpenCategoryBudget} />

        {/* Squarified Categories Treemap */}
        <CategoryTreemap
          categories={categoryCards}
          mode={categoryMode}
          selectedCategory={selectedCategory}
          hidden={hidden}
          onSelectCategory={(label) => {
            if (onCategorySelect) onCategorySelect(label);
            else {
              setSelectedCategory(selectedCategory === label ? null : label);
              setPage(1);
            }
          }}
          onToggleMode={() => {
            setCategoryMode((prev) => (prev === "Expense" ? "Income" : "Expense"));
            setSelectedCategory(null);
            setPage(1);
          }}
          onViewAll={onViewAllCategories}
          theme={theme}
        />

        {/* Squarified Wallet Distribution Treemap */}
        <WalletTreemap
          wallets={wallets}
          hidden={hidden}
          onSelectWallet={onOpenWallet}
          onViewAll={onViewAllWallets}
          theme={theme}
        />

      </> : null}

      {mode === "transactions" ? <>
        {/* All Transactions List (10 per page) */}
        <View style={{ marginTop: 2 }}>
          <SectionTitle
            title={
              activeCategory
                ? `${activeCategory} transactions`
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
                  onClearCategory?.();
                  setSelectedWalletFilter(null);
                  setSearchQuery("");
                  setTypeFilter("All");
                  setPage(1);
                }
                : undefined
            }
            theme={theme}
          />

          {/* Stitched Search Bar + Filter Button */}
          <View style={styles.activitySearchRow}>
            <View
              style={[
                styles.activitySearchBox,
                {
                  flex: 1,
                  marginBottom: 0,
                  overflow: "hidden",
                  backgroundColor: theme.card,
                  borderColor: hexToRgba(theme.leather.accent, 0.24),
                },
                cardShadow(theme.dark),
              ]}
            >
              <LightLeatherSurface theme={theme} radius={16} />
              <Icon name="search" size={16} color={theme.leather.accent} />
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
            {onToggleFilters ? (
              <Pressable
                onPress={onToggleFilters}
                accessibilityRole="button"
                accessibilityLabel="Wallet filters and export"
                style={({ pressed }) => [
                  styles.activityFilterBtn,
                  {
                    overflow: "hidden",
                    backgroundColor:
                      showFilters || selectedWalletFilter !== null
                        ? theme.leather.colors[1]
                        : theme.card,
                    borderColor:
                      showFilters || selectedWalletFilter !== null
                        ? theme.leather.edge
                        : hexToRgba(theme.leather.accent, 0.24),
                    transform: [{ scale: pressed ? 0.95 : 1 }],
                  },
                  cardShadow(theme.dark),
                ]}
              >
                {showFilters || selectedWalletFilter !== null ? (
                  <DarkLeatherSurface theme={theme} radius={16} />
                ) : (
                  <LightLeatherSurface theme={theme} radius={16} />
                )}
                <Icon
                  name="more"
                  size={18}
                  color={
                    showFilters || selectedWalletFilter !== null
                      ? "#ffffff"
                      : theme.leather.accent
                  }
                />
              </Pressable>
            ) : null}
          </View>

          {showFilters ? (
            <View
              style={[
                styles.activityFilterPanel,
                {
                  backgroundColor: theme.leather.colors[1],
                  borderWidth: 1,
                  borderColor: theme.leather.edge,
                  overflow: "hidden",
                  marginBottom: 10,
                },
                cardShadow(theme.dark),
              ]}
            >
              <DarkLeatherSurface theme={theme} radius={18} />
              <View style={styles.activityFilterHeader}>
                <Text style={[styles.activityFilterTitle, { color: theme.heroMuted }]}>
                  WALLETS & EXPORT
                </Text>
                <Pressable
                  onPress={handleExportCsv}
                  style={({ pressed }) => [
                    styles.exportCsvPill,
                    {
                      overflow: "hidden",
                      backgroundColor: theme.card,
                      borderWidth: 1,
                      borderColor: hexToRgba(theme.leather.accent, 0.28),
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <LightLeatherSurface theme={theme} radius={12} />
                  <Icon name="arrow-out" size={12} color={theme.leather.accent} />
                  <Text style={[styles.exportCsvText, { color: theme.ink }]}>
                    Export CSV ({filteredActivities.length})
                  </Text>
                </Pressable>
              </View>

              {visibleWalletChips.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filterChipRow}
                >
                  <Pressable
                    onPress={() => {
                      setSelectedWalletFilter(null);
                      setPage(1);
                    }}
                    style={[
                      styles.filterChip,
                      {
                        overflow: "hidden",
                        backgroundColor:
                          selectedWalletFilter === null
                            ? theme.card
                            : "rgba(255, 255, 255, 0.1)",
                        borderColor:
                          selectedWalletFilter === null
                            ? hexToRgba(theme.leather.accent, 0.28)
                            : "rgba(255, 255, 255, 0.18)",
                      },
                    ]}
                  >
                    {selectedWalletFilter === null ? (
                      <LightLeatherSurface theme={theme} radius={12} />
                    ) : null}
                    <Text
                      style={[
                        styles.filterChipText,
                        {
                          color:
                            selectedWalletFilter === null
                              ? theme.ink
                              : "rgba(255, 255, 255, 0.88)",
                        },
                      ]}
                    >
                      All wallets
                    </Text>
                  </Pressable>
                  {visibleWalletChips.map((w) => {
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
                            overflow: "hidden",
                            backgroundColor: active
                              ? theme.card
                              : "rgba(255, 255, 255, 0.1)",
                            borderColor: active
                              ? hexToRgba(theme.leather.accent, 0.28)
                              : "rgba(255, 255, 255, 0.18)",
                          },
                        ]}
                      >
                        {active ? (
                          <LightLeatherSurface theme={theme} radius={12} />
                        ) : null}
                        <Text
                          style={[
                            styles.filterChipText,
                            {
                              color: active
                                ? theme.ink
                                : "rgba(255, 255, 255, 0.88)",
                            },
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

          {/* Always-visible Quick Type Filter Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.activityQuickFilterRow}
          >
            {(["All", "Expenses", "Income", "Transfers", "Adjusted"] as const).map(
              (opt) => {
                const active = typeFilter === opt;
                return (
                  <ScalePressable
                    key={opt}
                    onPress={() => {
                      setTypeFilter(opt);
                      setPage(1);
                    }}
                    scaleTo={0.955}
                    style={[
                      styles.filterChip,
                      {
                        overflow: "hidden",
                        backgroundColor: active
                          ? theme.leather.colors[1]
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
                        styles.filterChipText,
                        { color: active ? "#ffffff" : theme.ink },
                      ]}
                    >
                      {opt}
                    </Text>
                  </ScalePressable>
                );
              }
            )}
          </ScrollView>

          {hasFilter && filteredActivities.length > 0 ? (
            <View
              style={[
                styles.activityFilteredSummary,
                {
                  overflow: "hidden",
                  backgroundColor: theme.card,
                  borderColor: hexToRgba(theme.leather.accent, 0.2),
                },
              ]}
            >
              <LightLeatherSurface theme={theme} radius={14} />
              <Text style={[styles.activityFilteredCount, { color: theme.muted }]}>
                {filteredActivities.length}{" "}
                {filteredActivities.length === 1 ? "match" : "matches"}
              </Text>
              <Text
                style={[
                  styles.activityFilteredTotal,
                  {
                    color:
                      filteredNetTotal > 0 ? theme.positive : theme.ink,
                  },
                ]}
              >
                {hidden
                  ? "••••"
                  : `${filteredNetTotal >= 0 ? "+" : "-"}${money(Math.abs(filteredNetTotal))}`}
              </Text>
            </View>
          ) : null}

          {groupedPageItems.length ? (
            <View style={styles.activityDateGroups}>
              {groupedPageItems.map((group) => (
                <View key={group.dateLabel} style={styles.activityDateGroup}>
                  <View style={styles.activityDateHeader}>
                    <Text style={[styles.activityDateTitle, { color: theme.muted }]}>
                      {group.dateLabel}
                    </Text>
                    <Text
                      style={[
                        styles.activityDateTotal,
                        {
                          color:
                            group.dayNet > 0 ? theme.positive : theme.muted,
                        },
                      ]}
                    >
                      {hidden
                        ? "••••"
                        : `${group.dayNet >= 0 ? "+" : "-"}${money(Math.abs(group.dayNet))}`}
                    </Text>
                  </View>
                  <View style={styles.txList}>
                    {group.items.map((item) => (
                      <TxRow
                        key={item.id}
                        item={item}
                        walletLabel={getDisplayActivityWallet(item, wallets).label}
                        hidden={hidden}
                        onPress={onTransaction ? () => onTransaction(item) : undefined}
                        theme={theme}
                      />
                    ))}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View
              style={[
                styles.emptyState,
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
                  styles.emptyStateIcon,
                  {
                    backgroundColor: hexToRgba(
                      theme.leather.accent,
                      theme.dark ? 0.2 : 0.1
                    ),
                    borderWidth: 1,
                    borderColor: hexToRgba(theme.leather.accent, 0.22),
                  },
                ]}
              >
                <Icon name="activity" size={22} color={theme.leather.accent} />
              </View>
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
  appLockEnabled,
  biometricsSupported,
  biometricsEnabled,
  onToggleAppLock,
  onChangeAppLockPin,
  onToggleBiometrics,
  onOpenProfile,
  onRequestExportBackup,
  onRequestRestoreBackup,
  onRequestEraseData,
  monthlyBudget = null,
  walletCount = 0,
  activityCount = 0,
  scheduleCount = 0,
  onOpenBudget,
  onOpenCategoryBudgets,
  onOpenSchedules,
  payLaterCount = 0,
  payLaterUnpaidTotal = 0,
  onOpenPayLater,
  homeSections = DEFAULT_HOME_SECTIONS,
  onOpenCustomizeHome,
  onReplayOnboarding,
  onOpenAbout,
  onHeroHeight,
  theme,
}: {
  leatherFinish: LeatherFinishId;
  setLeatherFinish: (v: LeatherFinishId) => void;
  hidden: boolean;
  setHidden: (v: boolean) => void;
  showToast: (s: string) => void;
  profile: UserProfile;
  appLockEnabled: boolean;
  biometricsSupported: boolean;
  biometricsEnabled: boolean;
  onToggleAppLock: () => void;
  onChangeAppLockPin: () => void;
  onToggleBiometrics: () => void;
  onOpenProfile: () => void;
  onRequestExportBackup: () => void;
  onRequestRestoreBackup: () => void;
  onRequestEraseData: () => void;
  monthlyBudget?: number | null;
  walletCount?: number;
  activityCount?: number;
  scheduleCount?: number;
  onOpenBudget?: () => void;
  onOpenCategoryBudgets?: () => void;
  onOpenSchedules?: () => void;
  payLaterCount?: number;
  payLaterUnpaidTotal?: number;
  onOpenPayLater?: () => void;
  homeSections?: HomeSectionConfig[];
  onOpenCustomizeHome?: () => void;
  onReplayOnboarding?: () => void;
  onOpenAbout?: () => void;
  onHeroHeight?: (height: number) => void;
  theme: ThemeColors;
}) {
  const visibleHomeCount = homeSections.filter((s) => s.visible).length;


  return (
    <View style={[styles.page, { paddingTop: 0 }]}>
      <HeroHeaderSurface
        theme={theme}
        compact
        onHeight={onHeroHeight}
        style={{ marginBottom: 16 }}
      >
        <View style={styles.heroTopRow}>
          <HeroEmbroideredTitle kind="settings" height={44} />
        </View>

        <ScalePressable
          onPress={onOpenProfile}
          scaleTo={0.985}
          pressOpacity={0.86}
          style={[styles.settingsHeroProfileRow, { marginTop: 12 }]}
        >
          <View style={[styles.profileCardAvatar, { backgroundColor: theme.heroControl }]}>
            <Icon name="user" size={22} color={theme.heroInk} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.profileCardName, { color: theme.heroInk }]} numberOfLines={1}>
              {profile.fullName}
            </Text>
            <Text style={[styles.profileCardSub, { color: theme.heroMuted, opacity: 1 }]} numberOfLines={1}>
              Tap to edit name
            </Text>
          </View>
          <Icon name="chevron" size={18} color={theme.heroInk} />
        </ScalePressable>
      </HeroHeaderSurface>

      {/* Appearance Group */}
      <StaggerReveal index={0} offsetY={10} duration={230}>
        <SettingsGroup title="Appearance" theme={theme}>
          <View
            style={[
              styles.accentPickerBlock,
              {
                borderBottomWidth: 1,
                borderBottomColor: hexToRgba(theme.leather.accent, 0.14),
              },
            ]}
          >
            <View style={styles.accentPickerHeader}>
              <Icon name="palette" size={19} color={theme.leather.accent} />
              <View style={styles.rowMain}>
                <Text style={[styles.rowTitle, { color: theme.ink }]}>Leather finish</Text>
                <Text style={[styles.rowSub, { color: theme.muted }]}>Wallet and app theme</Text>
              </View>
            </View>
            <View style={styles.accentGrid}>
              {[LEATHER_FINISHES.slice(0, 3), LEATHER_FINISHES.slice(3, 6)].map((row, index) => (
                <View key={index} style={styles.accentGridRow}>
                  {row.map((item) => (
                    <ScalePressable key={item.id} scaleTo={0.94} accessibilityRole="radio" accessibilityState={{ checked: item.id === leatherFinish }} accessibilityLabel={item.label} onPress={() => { setLeatherFinish(item.id); showToast(`Leather finish set to ${item.label}`); }} style={[styles.accentTile, { borderColor: item.id === leatherFinish ? item.accent : item.edge }]}>
                      <LinearGradient colors={item.colors} style={StyleSheet.absoluteFill} />
                      <Svg pointerEvents="none" width="100%" height="100%" viewBox="0 0 100 72" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
                        <Defs>
                          <Pattern id={`finishGrain${item.id}`} width={6} height={6} patternUnits="userSpaceOnUse">
                            <Path d="M1 1l1.4 .5m2 3l1 .6M1 5l.6 -.3" stroke="#071522" strokeWidth="0.7" opacity="0.45" />
                            <Path d="M2 2l1 .5m-2 3l1 .4M4 2l.9 -.3" stroke={item.thread} strokeWidth="0.65" opacity="0.26" />
                          </Pattern>
                        </Defs>
                        <Rect width="100" height="72" fill={`url(#finishGrain${item.id})`} />
                        <Rect x="5" y="5" width="90" height="62" rx="10" fill="none" stroke={item.thread} strokeWidth="1" strokeDasharray="3.5 3" opacity="0.85" />
                        <Rect x="9" y="9" width="82" height="54" rx="7" fill="none" stroke={item.thread} strokeWidth="0.7" strokeDasharray="2 3" opacity="0.48" />
                      </Svg>
                      {item.id === leatherFinish && <View style={styles.accentTileCheck}><Icon name="check" size={14} color="#ffffff" /></View>}
                      <Text style={styles.accentTileLabel} numberOfLines={1}>{item.label}</Text>
                    </ScalePressable>
                  ))}
                </View>
              ))}
            </View>
          </View>

          <SettingRow
            icon="eye"
            title="Hide balances"
            subtitle="Mask amounts across screens"
            onPress={() => setHidden(!hidden)}
            control={
              <SwitchControl
                on={hidden}
                onPress={() => setHidden(!hidden)}
                theme={theme}
              />
            }
            isLast={!onOpenCustomizeHome}
            theme={theme}
          />
          {onOpenCustomizeHome ? (
            <SettingRow
              icon="sliders"
              title="Customize Home"
              subtitle={`${visibleHomeCount} of ${homeSections.length} sections visible`}
              onPress={onOpenCustomizeHome}
              isLast
              theme={theme}
            />
          ) : null}
        </SettingsGroup>
      </StaggerReveal>

      {/* Planning Group */}
      <StaggerReveal index={1} offsetY={10} duration={230}>
        <SettingsGroup title="Planning" theme={theme}>
          {onOpenBudget ? (
            <SettingRow
              icon="trend"
              title="Monthly budget"
              subtitle={
                monthlyBudget && monthlyBudget > 0
                  ? `${hidden ? "••••" : money(monthlyBudget)} per month`
                  : "Not set"
              }
              onPress={onOpenBudget}
              theme={theme}
            />
          ) : null}
          {onOpenCategoryBudgets ? (
            <SettingRow
              icon="tag"
              title="Category budgets"
              subtitle="Monthly spending limits"
              onPress={onOpenCategoryBudgets}
              theme={theme}
            />
          ) : null}
          {onOpenSchedules ? (
            <SettingRow
              icon="clock"
              title="Bills & paydays"
              subtitle={
                scheduleCount > 0
                  ? `${scheduleCount} ${scheduleCount === 1 ? "schedule" : "schedules"} active`
                  : "No schedules yet"
              }
              onPress={onOpenSchedules}
              isLast={!onOpenPayLater}
              theme={theme}
            />
          ) : null}
          {onOpenPayLater ? (
            <SettingRow
              icon="card"
              title="PayLater bills"
              subtitle={
                payLaterCount > 0
                  ? `${payLaterCount} ${payLaterCount === 1 ? "account" : "accounts"} · ${hidden ? "••••" : money(payLaterUnpaidTotal)} unpaid`
                  : "SPayLater, LazPayLater, Atome"
              }
              onPress={onOpenPayLater}
              isLast
              theme={theme}
            />
          ) : null}
        </SettingsGroup>
      </StaggerReveal>

      {/* Security Group */}
      <StaggerReveal index={2} offsetY={10} duration={230}>
        <SettingsGroup title="Security" theme={theme}>
          <SettingRow
            icon="lock"
            title="App lock"
            subtitle={
              appLockEnabled
                ? "4-digit PIN enabled"
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
            isLast={!appLockEnabled}
            theme={theme}
          />
          {appLockEnabled ? (
            <SettingRow
              icon="edit"
              title="Change PIN"
              subtitle="Update 4-digit PIN"
              onPress={onChangeAppLockPin}
              isLast={!biometricsSupported}
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
              isLast
              theme={theme}
            />
          ) : null}
        </SettingsGroup>
      </StaggerReveal>

      {/* Data & Backup Group */}
      <StaggerReveal index={3} offsetY={10} duration={230}>
        <SettingsGroup title="Data & backup" theme={theme}>
          <SettingRow
            icon="download"
            title="Export JSON backup"
            subtitle="Save wallets, transactions & budgets"
            onPress={onRequestExportBackup}
            theme={theme}
          />
          <SettingRow
            icon="upload"
            title="Restore from backup"
            subtitle="Import a saved JSON backup file"
            onPress={onRequestRestoreBackup}
            theme={theme}
          />
          <SettingRow
            icon="wallet"
            title="Stored data"
            subtitle={`${walletCount} ${walletCount === 1 ? "wallet" : "wallets"} · ${activityCount} ${activityCount === 1 ? "transaction" : "transactions"} · On device`}
            onPress={() => showToast("All data saved locally on device")}
            theme={theme}
          />
          <SettingRow
            icon="trash"
            title="Erase all data"
            subtitle="Reset app and delete all local records"
            destructive
            onPress={onRequestEraseData}
            theme={theme}
          />
          {onReplayOnboarding ? (
            <SettingRow
              icon="book"
              title="App tour"
              subtitle="View Pitaka onboarding slides"
              onPress={onReplayOnboarding}
              theme={theme}
            />
          ) : null}
          <SettingRow
            icon="info"
            title="About Pitaka"
            subtitle="Version 1.0.0 · Patch notes & legal"
            onPress={
              onOpenAbout ??
              (() => showToast("Offline-first · Data stays on your device"))
            }
            isLast
            theme={theme}
          />
        </SettingsGroup>
      </StaggerReveal>
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
      <Text style={[styles.settingsGroupTitle, { color: theme.ink }]}>
        {title}
      </Text>
      <View
        style={[
          styles.settingsGroupBox,
          {
            backgroundColor: theme.card,
            borderWidth: 1,
            borderColor: hexToRgba(theme.leather.accent, 0.24),
            overflow: "hidden",
          },
          cardShadow(theme.dark),
        ]}
      >
        <LightLeatherSurface theme={theme} radius={20} />
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
  destructive = false,
  isLast = false,
  theme,
}: {
  icon: string;
  title: string;
  subtitle: string;
  control?: React.ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  isLast?: boolean;
  theme: ThemeColors;
}) {
  const dangerColor = theme.dark ? "#f28b82" : "#9e3c42";
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.settingRow,
        !isLast && {
          borderBottomWidth: 1,
          borderBottomColor: hexToRgba(theme.leather.accent, 0.14),
        },
        pressed && onPress
          ? { backgroundColor: hexToRgba(destructive ? "#9e3c42" : theme.leather.accent, 0.06) }
          : null,
      ]}
    >
      <Icon name={icon} size={19} color={destructive ? dangerColor : theme.leather.accent} />
      <View style={styles.rowMain}>
        <Text style={[styles.rowTitle, { color: destructive ? dangerColor : theme.ink }]}>{title}</Text>
        <Text style={[styles.rowSub, { color: theme.muted }]}>{subtitle}</Text>
      </View>
      {control || <Icon name="chevron" size={16} color={destructive ? dangerColor : theme.muted} />}
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
  onToggleWalletHidden,
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
  onToggleWalletHidden?: (wallet: Wallet) => void;
  onTransaction?: (item: ActivityItem) => void;
  theme: ThemeColors;
}) {
  const insets = useSafeAreaInsets();
  const [detailFilter, setDetailFilter] = useState<
    "Recent" | "Money in" | "Money out" | "Transfers"
  >("Recent");
  const [overviewRange, setOverviewRange] = useState<"month" | "all">("month");

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

  const detailScrollY = useRef(new Animated.Value(0)).current;
  const [detailCardWidth, setDetailCardWidth] = useState(340);

  const detailNow = useMemo(() => new Date(), []);
  const detailMonthLabel = detailNow.toLocaleDateString("en-US", {
    month: "short",
  });
  const detailFlow = useMemo(() => {
    const month = detailNow.getMonth();
    const year = detailNow.getFullYear();
    let earned = 0;
    let spent = 0;
    for (const item of activities) {
      const d = getActivityDate(item, detailNow);
      if (d.getMonth() !== month || d.getFullYear() !== year) continue;
      const match = isActivityForWallet(item, wallet);
      if (!match.matched) continue;
      if (match.isIncomingTransfer) {
        earned += Math.abs(item.amount);
      } else if (item.amount > 0) {
        earned += item.amount;
      } else if (item.amount < 0) {
        spent += Math.abs(item.amount);
      }
    }
    return { earned, spent };
  }, [activities, wallet, detailNow]);

  const walletOverview = useMemo(() => {
    const month = detailNow.getMonth();
    const year = detailNow.getFullYear();
    let moneyIn = 0;
    let moneyOut = 0;
    let expenseTotal = 0;
    let txCount = 0;
    const catTotals = new Map<string, number>();

    for (const item of activities) {
      if (overviewRange === "month") {
        const d = getActivityDate(item, detailNow);
        if (d.getMonth() !== month || d.getFullYear() !== year) continue;
      }
      const match = isActivityForWallet(item, wallet);
      if (!match.matched) continue;
      txCount += 1;

      if (match.isIncomingTransfer) {
        moneyIn += Math.abs(item.amount);
      } else if (item.amount > 0) {
        moneyIn += item.amount;
      } else if (item.amount < 0) {
        const abs = Math.abs(item.amount);
        moneyOut += abs;
        if (!isTransferActivity(item) && !isAdjustmentActivity(item)) {
          expenseTotal += abs;
          catTotals.set(item.kind, (catTotals.get(item.kind) ?? 0) + abs);
        }
      }
    }

    const iconMap = new Map(EXPENSE_CATEGORIES.map(([label, icon]) => [label, icon]));
    const topCategories = Array.from(catTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([label, amount]) => ({
        label,
        icon: iconMap.get(label) ?? "tag",
        amount,
        pct: expenseTotal > 0 ? Math.round((amount / expenseTotal) * 100) : 0,
      }));

    return {
      moneyIn,
      moneyOut,
      net: moneyIn - moneyOut,
      txCount,
      topCategories,
    };
  }, [activities, wallet, detailNow, overviewRange]);

  const cardDesign = resolveWalletCardDesign(wallet.logoKey, wallet.name);
  const pal = tonePalette[wallet.tone] || tonePalette.blue;
  const cardInk = cardDesign ? cardDesign.ink : pal.ink;
  const isLightCardInk = cardInk === "#ffffff";
  const cardSubInk = isLightCardInk
    ? "rgba(255, 255, 255, 0.8)"
    : "rgba(20, 32, 26, 0.72)";
  const cardBorder = isLightCardInk
    ? "rgba(255, 255, 255, 0.2)"
    : "rgba(20, 32, 26, 0.14)";
  const flowPillBg = isLightCardInk
    ? "rgba(8, 12, 20, 0.34)"
    : "rgba(255, 255, 255, 0.65)";
  const inColor = isLightCardInk ? "#6ee7b7" : "#047857";
  const outColor = isLightCardInk ? "#fda4af" : "#be123c";

  useEffect(() => {
    setDetailFilter("Recent");
    setOverviewRange("month");
    detailScrollY.setValue(0);
  }, [wallet.id, detailScrollY]);

  return (
    <View style={{ flex: 1 }}>
      <HeroHeaderSurface theme={theme} compact fullBleed={false}>
        <View style={styles.heroDetailBar}>
          <ScalePressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Back"
            scaleTo={0.91}
            style={[styles.heroIconBtn, heroControlStyle(theme)]}
          >
            <Icon name="back" size={19} color={theme.heroInk} />
          </ScalePressable>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={[styles.heroDetailTitle, { color: theme.heroInk }]} numberOfLines={1}>
              {wallet.name}
            </Text>
            {wallet.isHidden ? (
              <Text
                style={{
                  fontFamily: "Poppins_600SemiBold",
                  fontSize: 10.5,
                  color: theme.heroMuted,
                }}
                numberOfLines={1}
              >
                Hidden from totals
              </Text>
            ) : null}
          </View>
          <ScalePressable
            onPress={onEdit}
            accessibilityRole="button"
            accessibilityLabel="Edit wallet"
            scaleTo={0.91}
            style={[styles.heroIconBtn, heroControlStyle(theme)]}
          >
            <Icon name="edit" size={17} color={theme.heroInk} />
          </ScalePressable>
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

          <View
            onLayout={(e) => {
              const w = Math.round(e.nativeEvent.layout.width);
              if (w > 0 && Math.abs(w - detailCardWidth) > 1) {
                setDetailCardWidth(w);
              }
            }}
            style={[
              styles.walletTile,
              {
                height: 162,
                borderRadius: 22,
                backgroundColor: cardDesign
                  ? cardDesign.isDark
                    ? "#090e17"
                    : "#edf3ec"
                  : pal.to,
                borderColor: cardBorder,
                overflow: "hidden",
              },
              cardShadow(theme.dark),
            ]}
          >
            {cardDesign ? (
              <>
                <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                  <Svg width={detailCardWidth} height={162}>
                    <SvgImage
                      href={cardDesign.source}
                      x={0}
                      y={0}
                      width={detailCardWidth}
                      height={162}
                      preserveAspectRatio="xMaxYMid slice"
                    />
                  </Svg>
                </View>
                <LinearGradient
                  pointerEvents="none"
                  colors={
                    cardDesign.isDark
                      ? ["rgba(8, 12, 20, 0.08)", "rgba(8, 12, 20, 0.42)", "rgba(8, 12, 20, 0.72)"]
                      : ["rgba(244, 248, 243, 0.08)", "rgba(232, 238, 230, 0.52)", "rgba(224, 232, 222, 0.8)"]
                  }
                  locations={[0.22, 0.65, 1]}
                  style={StyleSheet.absoluteFill}
                />
              </>
            ) : (
              <TexturedGradientSurface
                fromColor={pal.from}
                toColor={pal.to}
              />
            )}

            <View style={[styles.walletCardFullInner, { paddingVertical: 16 }]}>
              <View style={styles.walletCardFullTopRow}>
                <View style={styles.walletCardIdentity}>
                  <WalletLogoBadge
                    logoKey={wallet.logoKey}
                    name={wallet.name}
                    mark={wallet.mark}
                    size={36}
                    radius={11}
                    ink={cardInk}
                    fontSize={11}
                  />
                  <Text
                    style={[
                      styles.tileName,
                      { color: cardInk, fontSize: 16, flexShrink: 1 },
                    ]}
                    numberOfLines={1}
                  >
                    {wallet.name}
                  </Text>
                </View>
                <Text
                  style={[styles.tileSub, { color: cardSubInk, maxWidth: 145 }]}
                  numberOfLines={1}
                >
                  {wallet.type} · {wallet.account}
                </Text>
              </View>

              <View style={styles.walletCardFullBottomRow}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text
                    style={{
                      fontFamily: "Poppins_600SemiBold",
                      fontSize: 10.5,
                      color: cardSubInk,
                    }}
                  >
                    Available balance
                  </Text>
                  <Amount
                    value={wallet.balance}
                    hidden={hidden}
                    size="md"
                    color={cardInk}
                  />
                </View>
                <View
                  style={[
                    styles.walletCardFlowPill,
                    { backgroundColor: flowPillBg },
                  ]}
                >
                  <Text style={[styles.tileFlowMonth, { color: cardSubInk }]}>
                    {detailMonthLabel}
                  </Text>
                  <View style={styles.tileFlowStat}>
                    <Icon
                      name="arrow-down"
                      size={10.5}
                      strokeWidth={2.5}
                      color={inColor}
                    />
                    <Text
                      style={[styles.tileFlowVal, { color: inColor }]}
                      numberOfLines={1}
                    >
                      {hidden ? "••" : money(detailFlow.earned, true)}
                    </Text>
                  </View>
                  <View style={styles.tileFlowStat}>
                    <Icon
                      name="arrow-up"
                      size={10.5}
                      strokeWidth={2.5}
                      color={outColor}
                    />
                    <Text
                      style={[styles.tileFlowVal, { color: outColor }]}
                      numberOfLines={1}
                    >
                      {hidden ? "••" : money(detailFlow.spent, true)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.detailActions}>
            <ScalePressable
              onPress={onUpdate}
              scaleTo={0.965}
              style={[
                styles.detailActionBtn,
                {
                  backgroundColor: theme.leather.colors[1],
                  borderColor: theme.leather.edge,
                  overflow: "hidden",
                },
                cardShadow(theme.dark),
              ]}
            >
              <DarkLeatherSurface theme={theme} radius={16} />
              <Icon name="edit" size={17} color="#ffffff" />
              <Text style={[styles.detailActionText, { color: "#ffffff" }]}>
                Update balance
              </Text>
            </ScalePressable>

            <ScalePressable
              onPress={onTransfer}
              scaleTo={0.965}
              style={[
                styles.detailActionBtn,
                {
                  backgroundColor: theme.card,
                  borderColor: hexToRgba(theme.leather.accent, 0.28),
                  overflow: "hidden",
                },
                cardShadow(theme.dark),
              ]}
            >
              <LightLeatherSurface theme={theme} radius={16} />
              <Icon name="swap" size={17} color={theme.leather.accent} />
              <Text style={[styles.detailActionText, { color: theme.ink }]}>
                Transfer
              </Text>
            </ScalePressable>
          </View>

          {onToggleWalletHidden ? (
            <Pressable
              onPress={() => onToggleWalletHidden(wallet)}
              accessibilityRole="button"
              accessibilityLabel={
                wallet.isHidden ? "Unhide card from totals" : "Hide card from totals"
              }
              style={({ pressed }) => [
                styles.detailHideBtn,
                {
                  overflow: "hidden",
                  backgroundColor: wallet.isHidden
                    ? theme.leather.colors[1]
                    : theme.card,
                  borderColor: wallet.isHidden
                    ? theme.leather.edge
                    : hexToRgba(theme.leather.accent, 0.24),
                  transform: [{ scale: pressed ? 0.985 : 1 }],
                },
                cardShadow(theme.dark),
              ]}
            >
              {wallet.isHidden ? (
                <DarkLeatherSurface theme={theme} radius={14} />
              ) : (
                <LightLeatherSurface theme={theme} radius={14} />
              )}
              <Icon
                name={wallet.isHidden ? "eye" : "eye-off"}
                size={15}
                color={wallet.isHidden ? "#ffffff" : theme.leather.accent}
              />
              <Text
                style={[
                  styles.detailHideBtnText,
                  { color: wallet.isHidden ? "#ffffff" : theme.ink },
                ]}
              >
                {wallet.isHidden
                  ? "Hidden from totals · Tap to unhide"
                  : "Hide card from totals"}
              </Text>
            </Pressable>
          ) : null}

          {/* Wallet Overview */}
          <View style={styles.walletOverviewHead}>
            <Text style={[styles.walletOverviewTitle, { color: theme.ink }]}>
              Wallet overview
            </Text>
            <View
              style={[
                styles.walletOverviewRangePill,
                {
                  overflow: "hidden",
                  backgroundColor: theme.card,
                  borderColor: hexToRgba(theme.leather.accent, 0.24),
                },
              ]}
            >
              <LightLeatherSurface theme={theme} radius={12} />
              {(["month", "all"] as const).map((r) => {
                const active = overviewRange === r;
                return (
                  <Pressable
                    key={r}
                    onPress={() => setOverviewRange(r)}
                    style={[
                      styles.walletOverviewRangeChip,
                      active && { backgroundColor: theme.leather.accent },
                    ]}
                  >
                    <Text
                      style={[
                        styles.walletOverviewRangeText,
                        { color: active ? "#ffffff" : theme.muted },
                      ]}
                    >
                      {r === "month" ? detailMonthLabel : "All time"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View
            style={[
              styles.walletOverviewCard,
              {
                overflow: "hidden",
                backgroundColor: theme.leather.colors[1],
                borderColor: theme.leather.edge,
              },
              cardShadow(theme.dark),
            ]}
          >
            <DarkLeatherSurface theme={theme} radius={20} />
            <View style={styles.walletOverviewStatsRow}>
              <View style={styles.walletOverviewStatCol}>
                <Text
                  style={[
                    styles.walletOverviewStatLabel,
                    { color: theme.heroMuted },
                  ]}
                >
                  Money in
                </Text>
                <Text
                  style={[styles.walletOverviewStatVal, { color: "#6ee7b7" }]}
                  numberOfLines={1}
                >
                  {hidden ? "••••" : `+${money(walletOverview.moneyIn)}`}
                </Text>
              </View>
              <View
                style={[
                  styles.walletOverviewStatDivider,
                  { backgroundColor: "rgba(255, 255, 255, 0.14)" },
                ]}
              />
              <View style={styles.walletOverviewStatCol}>
                <Text
                  style={[
                    styles.walletOverviewStatLabel,
                    { color: theme.heroMuted },
                  ]}
                >
                  Money out
                </Text>
                <Text
                  style={[styles.walletOverviewStatVal, { color: "#ffffff" }]}
                  numberOfLines={1}
                >
                  {hidden ? "••••" : `-${money(walletOverview.moneyOut)}`}
                </Text>
              </View>
              <View
                style={[
                  styles.walletOverviewStatDivider,
                  { backgroundColor: "rgba(255, 255, 255, 0.14)" },
                ]}
              />
              <View style={styles.walletOverviewStatCol}>
                <Text
                  style={[
                    styles.walletOverviewStatLabel,
                    { color: theme.heroMuted },
                  ]}
                >
                  Net
                </Text>
                <Text
                  style={[
                    styles.walletOverviewStatVal,
                    {
                      color:
                        walletOverview.net >= 0 ? "#6ee7b7" : "#fda4af",
                    },
                  ]}
                  numberOfLines={1}
                >
                  {hidden
                    ? "••••"
                    : `${walletOverview.net >= 0 ? "+" : "-"}${money(Math.abs(walletOverview.net))}`}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.walletOverviewDivider,
                { backgroundColor: "rgba(255, 255, 255, 0.14)" },
              ]}
            />

            {walletOverview.topCategories.length > 0 ? (
              <View style={styles.walletOverviewCats}>
                <View style={styles.walletOverviewCatsHead}>
                  <Text
                    style={[
                      styles.walletOverviewSubLabel,
                      { color: theme.heroMuted },
                    ]}
                  >
                    Top spending
                  </Text>
                  <Text
                    style={[
                      styles.walletOverviewSubLabel,
                      { color: theme.heroMuted },
                    ]}
                  >
                    {walletOverview.txCount}{" "}
                    {walletOverview.txCount === 1 ? "transaction" : "transactions"}
                  </Text>
                </View>
                {walletOverview.topCategories.map((cat, idx) => (
                  <View key={cat.label} style={styles.walletOverviewCatRow}>
                    <View style={styles.walletOverviewCatTop}>
                      <View style={styles.walletOverviewCatLeft}>
                        <Icon
                          name={cat.icon}
                          size={14}
                          color="rgba(255, 255, 255, 0.82)"
                        />
                        <Text
                          style={[
                            styles.walletOverviewCatName,
                            { color: "#ffffff" },
                          ]}
                          numberOfLines={1}
                        >
                          {cat.label}
                        </Text>
                        <Text
                          style={[
                            styles.walletOverviewCatPct,
                            { color: theme.heroMuted },
                          ]}
                        >
                          {cat.pct}%
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.walletOverviewCatAmt,
                          { color: "#ffffff" },
                        ]}
                      >
                        {hidden ? "••••" : money(cat.amount)}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.walletOverviewBarTrack,
                        { backgroundColor: "rgba(255, 255, 255, 0.16)" },
                      ]}
                    >
                      <AnimatedBarFill
                        pct={Math.max(6, cat.pct)}
                        animateKey={`${wallet.id}-${overviewRange}-${cat.label}`}
                        delayMs={100 + idx * 45}
                        style={[
                          styles.walletOverviewBarFill,
                          {
                            backgroundColor: "rgba(255, 255, 255, 0.88)",
                          },
                        ]}
                      />
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.walletOverviewEmptyFoot}>
                <Text
                  style={[
                    styles.walletOverviewSubLabel,
                    { color: theme.heroMuted },
                  ]}
                >
                  {walletOverview.txCount > 0
                    ? `${walletOverview.txCount} ${walletOverview.txCount === 1 ? "transaction" : "transactions"} · No expenses recorded`
                    : "No activity in this period yet"}
                </Text>
              </View>
            )}
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
                  styles.emptyStateIcon,
                  {
                    backgroundColor: hexToRgba(
                      theme.leather.accent,
                      theme.dark ? 0.2 : 0.1
                    ),
                    borderWidth: 1,
                    borderColor: hexToRgba(theme.leather.accent, 0.22),
                  },
                ]}
              >
                <Icon name="activity" size={22} color={theme.leather.accent} />
              </View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  homeDashCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  homePulseRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  homePulseCell: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  homePulseDivider: {
    width: 1,
    height: 28,
  },
  homePulseLabel: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 10.5,
  },
  homePulseVal: {
    fontFamily: "Poppins_800ExtraBold",
    fontWeight: "800",
    fontSize: 14,
  },
  homeBudgetSection: {
    marginTop: 12,
    paddingTop: 11,
    borderTopWidth: 1,
    gap: 6,
  },
  homeBudgetTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  homeBudgetTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  homeBudgetLabel: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 12.5,
  },
  homeBudgetPct: {
    fontFamily: "Poppins_800ExtraBold",
    fontWeight: "800",
    fontSize: 12,
  },
  homeBudgetRatio: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 11.5,
  },
  homeProgressTrack: {
    height: 7,
    borderRadius: 4,
    overflow: "hidden",
  },
  homeProgressFill: {
    height: "100%",
    borderRadius: 4,
  },
  homeBudgetSubRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  homeBudgetSub: {
    fontFamily: "Poppins_500Medium",
    fontWeight: "500",
    fontSize: 11,
  },
  homeBudgetEditHint: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 11,
  },
  homeBudgetEmptyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  homeCatRow: {
    gap: 5,
  },
  homeCatTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  homeCatLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  homeCatName: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 12.5,
    flexShrink: 1,
  },
  homeCatShare: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 11,
  },
  homeCatAmount: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 12.5,
  },
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
    paddingHorizontal: 26,
    borderBottomWidth: 0,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.24,
    shadowRadius: 20,
    elevation: 8,
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
    width: 132,
    height: 46,
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
  heroGreetingBlock: {
    marginTop: 12,
    gap: 1,
  },
  heroGreetingRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
  },
  heroGreetingSub: {
    fontFamily: "Poppins_500Medium",
    fontWeight: "500",
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.72)",
    textAlign: "right",
  },
  heroGreetingTitle: {
    flexShrink: 1,
    fontFamily: "Poppins_400Regular",
    fontWeight: "400",
    fontSize: 14,
    lineHeight: 19,
    letterSpacing: -0.1,
    color: "rgba(255, 255, 255, 0.78)",
  },
  heroGreetingWeekday: {
    fontFamily: "Poppins_400Regular",
    fontWeight: "400",
    fontSize: 14,
    lineHeight: 19,
    letterSpacing: -0.1,
    color: "rgba(255, 255, 255, 0.78)",
    textAlign: "right",
  },
  heroGreetingName: {
    flexShrink: 1,
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: -0.2,
    color: "#ffffff",
  },
  heroGreetingDate: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.2,
    color: "#ffffff",
    textAlign: "right",
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
  walletLimitBanner: {
    height: 36,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  walletLimitBannerText: {
    flex: 1,
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 11.5,
    lineHeight: 15,
    includeFontPadding: false,
    marginTop: 1,
  },
  walletsSectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  walletsSectionTitleGroup: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  walletsSectionTitle: {
    fontFamily: "Poppins_800ExtraBold",
    fontWeight: "800",
    fontSize: 17,
  },
  walletsSectionCount: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 12,
  },
  stitchedReorderBtn: {
    height: 34,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stitchedReorderText: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 12,
    lineHeight: 15,
    includeFontPadding: false,
    marginTop: 1,
  },
  stitchedEmptyCta: {
    marginTop: 16,
    height: 44,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  stitchedEmptyCtaText: {
    color: "#ffffff",
    fontFamily: "Poppins_800ExtraBold",
    fontWeight: "800",
    fontSize: 13.5,
    lineHeight: 17,
    includeFontPadding: false,
    marginTop: 1.5,
  },
  walletTile: {
    borderRadius: 22,
    borderWidth: 1.5,
    shadowColor: "#121a2d",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 4,
  },
  walletCardFullInner: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: "space-between",
  },
  walletCardFullTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  walletCardIdentity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  walletCardFullBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  walletCardFlowPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  walletCompactRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 10,
  },
  walletCompactBalance: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 12.5,
    includeFontPadding: false,
  },
  hiddenWalletsCard: {
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  hiddenWalletsToggle: {
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  hiddenWalletsTitle: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 13,
    includeFontPadding: false,
    marginTop: 1,
  },
  hiddenWalletsHint: {
    flex: 1,
    fontFamily: "Poppins_500Medium",
    fontWeight: "500",
    fontSize: 11,
    textAlign: "right",
    includeFontPadding: false,
    marginTop: 1,
  },
  hiddenWalletsList: {
    paddingBottom: 4,
  },
  hiddenWalletsDivider: {
    height: 1,
    marginHorizontal: 14,
  },
  hiddenWalletRow: {
    minHeight: 58,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  hiddenWalletName: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 13.5,
  },
  hiddenWalletBal: {
    fontFamily: "Poppins_500Medium",
    fontWeight: "500",
    fontSize: 11.5,
  },
  unhideBtn: {
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  unhideBtnText: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 11.5,
    lineHeight: 15,
    includeFontPadding: false,
    marginTop: 1,
  },
  tileBadge: {
    width: 48,
    height: 48,
    borderRadius: 15,
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
  activitySearchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  activityFilterBtn: {
    width: 46,
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  activitySearchBox: {
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 10,
  },
  activitySearchInput: {
    flex: 1,
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 13,
    paddingVertical: 0,
    includeFontPadding: false,
  },
  activityQuickFilterRow: {
    gap: 7,
    paddingBottom: 12,
  },
  activityFilteredSummary: {
    height: 38,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  activityFilteredCount: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 12,
    includeFontPadding: false,
  },
  activityFilteredTotal: {
    fontFamily: "Poppins_800ExtraBold",
    fontWeight: "800",
    fontSize: 12.5,
    includeFontPadding: false,
  },
  activityDateGroups: {
    gap: 14,
  },
  activityDateGroup: {
    gap: 8,
  },
  activityDateHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  activityDateTitle: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 12,
    includeFontPadding: false,
  },
  activityDateTotal: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 11.5,
    includeFontPadding: false,
  },
  filterChip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  filterChipText: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 12,
    lineHeight: 16,
    includeFontPadding: false,
    marginTop: 1,
  },
  overviewChartCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  overviewChartHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  overviewRangeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  donutCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  donutHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  donutTitle: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 14,
  },
  donutSub: {
    fontFamily: "Poppins_500Medium",
    fontWeight: "500",
    fontSize: 11.5,
  },
  donutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  donutRingWrap: {
    width: 96,
    height: 96,
    alignItems: "center",
    justifyContent: "center",
  },
  donutCenter: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  donutCenterLabel: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 9.5,
  },
  donutCenterVal: {
    fontFamily: "Poppins_800ExtraBold",
    fontWeight: "800",
    fontSize: 12,
  },
  donutLegend: {
    flex: 1,
    gap: 8,
  },
  donutLegendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  donutDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  donutLegendName: {
    flex: 1,
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 12,
  },
  donutLegendPct: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 11,
  },
  donutLegendAmt: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 12,
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  stitchedCategoryGridCard: {
    flexBasis: "47.5%",
    flexGrow: 1,
    minWidth: 145,
    height: 98,
    borderRadius: 18,
    borderWidth: 1,
    padding: 13,
    justifyContent: "space-between",
  },
  stitchedCategoryTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stitchedCategoryPct: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 11,
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
    lineHeight: 14,
    includeFontPadding: false,
    marginTop: 1.5,
  },
  chartBody: {
    height: 162,
    paddingTop: 14,
    paddingBottom: 10,
    paddingLeft: 42,
    paddingRight: 8,
  },
  chartGrid: {
    position: "absolute",
    top: 14,
    bottom: 30,
    left: 2,
    right: 2,
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
    alignItems: "center",
    justifyContent: "center",
  },
  budgetEditText: {
    fontFamily: "Poppins_800ExtraBold",
    fontWeight: "800",
    fontSize: 11,
    lineHeight: 14,
    includeFontPadding: false,
    marginTop: 1.5,
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
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 19,
    letterSpacing: -0.4,
    marginHorizontal: 2,
    marginBottom: 10,
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
    marginBottom: 10,
  },
  detailHideBtn: {
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 20,
  },
  detailHideBtnText: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 12,
  },
  walletOverviewHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  walletOverviewTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 19,
    letterSpacing: -0.4,
  },
  walletOverviewRangePill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    gap: 2,
  },
  walletOverviewRangeChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  walletOverviewRangeText: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 11,
    lineHeight: 14,
    includeFontPadding: false,
    marginTop: 1.5,
  },
  walletOverviewCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    marginBottom: 22,
  },
  walletOverviewStatsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  walletOverviewStatCol: {
    flex: 1,
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 4,
  },
  walletOverviewStatDivider: {
    width: 1,
    height: 28,
  },
  walletOverviewStatLabel: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 10.5,
  },
  walletOverviewStatVal: {
    fontFamily: "Poppins_800ExtraBold",
    fontWeight: "800",
    fontSize: 12.5,
  },
  walletOverviewDivider: {
    height: 1,
    marginVertical: 12,
  },
  walletOverviewCats: {
    gap: 10,
  },
  walletOverviewCatsHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  walletOverviewSubLabel: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 11,
  },
  walletOverviewCatRow: {
    gap: 5,
  },
  walletOverviewCatTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  walletOverviewCatLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  walletOverviewCatName: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 12.5,
  },
  walletOverviewCatPct: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 11,
  },
  walletOverviewCatAmt: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 12.5,
  },
  walletOverviewBarTrack: {
    height: 5,
    borderRadius: 99,
    overflow: "hidden",
  },
  walletOverviewBarFill: {
    height: "100%",
    borderRadius: 99,
  },
  walletOverviewEmptyFoot: {
    alignItems: "center",
    paddingVertical: 2,
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
