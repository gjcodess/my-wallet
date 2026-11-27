import React, { useCallback, useRef, useState } from "react";
import {
  Animated,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient as SvgLinearGradient, Path, Pattern, Rect, Stop } from "react-native-svg";
import { MOTION_EASE, ScalePressable } from "../lib/motion";
import { Icon } from "./Icon";
import {
  cardShadow,
  DarkLeatherSurface,
  hexToRgba,
  LEATHER_FINISHES,
  LeatherFinishId,
  LightLeatherSurface,
  ThemeColors,
} from "./SharedUI";

const PITAKA_TITLE_WHITE = require("../../assets/brand/pitaka-title-white.webp");
const CARD_CASH = require("../../assets/cards/cash.webp");
const CARD_GCASH = require("../../assets/cards/gcash.webp");
const CARD_BPI = require("../../assets/cards/bpi.webp");

type SlideFeature = {
  icon: string;
  text: string;
};

type SlideSpec = {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  features: SlideFeature[];
};

const SLIDES: SlideSpec[] = [
  {
    id: "wallets",
    eyebrow: "DIGITAL LEATHER WALLET",
    title: "All your accounts in one pocket",
    subtitle:
      "Group your cash, e-wallets, and bank cards inside tactile leather pockets with real-time combined balances.",
    features: [
      { icon: "wallet", text: "Organize Cash, E-Wallets & Bank accounts" },
      { icon: "eye", text: "One-tap privacy mode to hide balances" },
      { icon: "grip", text: "Reorder cards and hide accounts anytime" },
    ],
  },
  {
    id: "tracking",
    eyebrow: "EFFORTLESS DAILY LOGGING",
    title: "Track every peso in seconds",
    subtitle:
      "Record expenses, income, and wallet-to-wallet transfers fast—with receipts, recurring bills, and PayLater tracking.",
    features: [
      { icon: "swap", text: "Instant expense, income & transfer entry" },
      { icon: "paperclip", text: "Attach receipt photos to transactions" },
      { icon: "card", text: "Track schedules & PayLater due dates" },
    ],
  },
  {
    id: "insights",
    eyebrow: "BUDGETS & INSIGHTS",
    title: "See where your money goes",
    subtitle:
      "Stay ahead of monthly spending with visual category treemaps, wallet shares, and per-category budget limits.",
    features: [
      { icon: "pie", text: "Visual category & wallet distribution" },
      { icon: "trend", text: "Monthly cashflow & savings overview" },
      { icon: "tag", text: "Custom monthly & category budget limits" },
    ],
  },
  {
    id: "privacy",
    eyebrow: "CRAFTED & PRIVATE",
    title: "100% offline, tailored to you",
    subtitle:
      "Your finances never leave your device. Pick your favorite leather finish, lock with PIN or biometrics, and back up anytime.",
    features: [
      { icon: "shield", text: "Stored locally on device—no cloud required" },
      { icon: "fingerprint", text: "4-digit PIN & biometric app lock" },
      { icon: "download", text: "One-tap JSON backup & restore" },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* Slide 1 Visual: Miniature Stitched Leather Wallet Pocket with Cards        */
/* -------------------------------------------------------------------------- */
const WalletShowcase = React.memo(function WalletShowcase({
  theme,
}: {
  theme: ThemeColors;
}) {
  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const gradId = `obWalletGrad${uid}`;
  const grainId = `obWalletGrain${uid}`;

  return (
    <View style={styles.visualStage}>
      <View
        style={[
          styles.showcaseCard,
          {
            backgroundColor: theme.leather.colors[1],
            borderColor: theme.leather.edge,
          },
          cardShadow(theme.dark),
        ]}
      >
        <DarkLeatherSurface theme={theme} radius={26} />

        {/* Mini stacked cards peeking from top */}
        <View style={styles.miniCardStack}>
          <View style={[styles.miniCard, styles.miniCardBack, { backgroundColor: "#14532d" }]}>
            <Image source={CARD_CASH} style={StyleSheet.absoluteFill} resizeMode="cover" />
            <View style={styles.miniCardRow}>
              <Text style={styles.miniCardName}>Cash</Text>
              <Text style={styles.miniCardAmt}>₱ 6,350</Text>
            </View>
          </View>
          <View style={[styles.miniCard, styles.miniCardMid, { backgroundColor: "#0057e7" }]}>
            <Image source={CARD_GCASH} style={StyleSheet.absoluteFill} resizeMode="cover" />
            <View style={styles.miniCardRow}>
              <Text style={styles.miniCardName}>GCash</Text>
              <Text style={styles.miniCardAmt}>₱ 18,139</Text>
            </View>
          </View>
          <View style={[styles.miniCard, styles.miniCardFront, { backgroundColor: "#7f1d1d" }]}>
            <Image source={CARD_BPI} style={StyleSheet.absoluteFill} resizeMode="cover" />
            <View style={styles.miniCardRow}>
              <Text style={styles.miniCardName}>BPI Savings</Text>
              <Text style={styles.miniCardAmt}>₱ 37,840</Text>
            </View>
          </View>
        </View>

        {/* Stitched leather pocket lip overlapping bottom of cards */}
        <View style={styles.miniPocketWrap}>
          <Svg width="100%" height={106} viewBox="0 0 300 106" preserveAspectRatio="none">
            <Defs>
              <SvgLinearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0" stopColor={theme.leather.colors[1]} />
                <Stop offset="1" stopColor={theme.leather.colors[2]} />
              </SvgLinearGradient>
              <Pattern id={grainId} width={6} height={6} patternUnits="userSpaceOnUse">
                <Path d="M1 1l1.4 .5m2 3l1 .6M1 5l.6 -.3" stroke="#071522" strokeWidth="0.7" opacity="0.45" />
                <Path d="M2 2l1 .5m-2 3l1 .4M4 2l.9 -.3" stroke={theme.leather.thread} strokeWidth="0.65" opacity="0.22" />
              </Pattern>
            </Defs>
            <Path
              d="M0 18Q0 2 18 2C38 2 45 14 66 14H234C255 14 262 2 282 2Q300 2 300 18V88Q300 106 282 106H18Q0 106 0 88Z"
              fill={`url(#${gradId})`}
            />
            <Path
              d="M0 18Q0 2 18 2C38 2 45 14 66 14H234C255 14 262 2 282 2Q300 2 300 18V88Q300 106 282 106H18Q0 106 0 88Z"
              fill={`url(#${grainId})`}
            />
            <Path
              d="M7 18Q7 8 18 8C37 8 45 20 66 20H234C255 20 263 8 282 8Q293 8 293 18V87Q293 99 281 99H19Q7 99 7 87Z"
              fill="none"
              stroke={theme.leather.thread}
              strokeWidth="1.1"
              strokeDasharray="3.5 3"
              opacity="0.78"
            />
          </Svg>
          <View style={styles.miniPocketContent}>
            <Text style={styles.miniPocketLabel}>COMBINED BALANCE</Text>
            <Text style={styles.miniPocketBalance}>₱ 89,598.50</Text>
            <View style={styles.miniPocketFlowRow}>
              <View style={styles.miniPocketFlowChip}>
                <Icon name="arrow-down" size={11} color="#45cd92" strokeWidth={2.5} />
                <Text style={[styles.miniPocketFlowText, { color: "#6ee7b7" }]}>+₱36.3K</Text>
              </View>
              <View style={styles.miniPocketFlowChip}>
                <Icon name="arrow-up" size={11} color="#fda4af" strokeWidth={2.5} />
                <Text style={[styles.miniPocketFlowText, { color: "#fda4af" }]}>-₱10.6K</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
});

/* -------------------------------------------------------------------------- */
/* Slide 2 Visual: Quick Entry Pills + Activity Preview                       */
/* -------------------------------------------------------------------------- */
const TrackingShowcase = React.memo(function TrackingShowcase({
  theme,
}: {
  theme: ThemeColors;
}) {
  return (
    <View style={styles.visualStage}>
      <View
        style={[
          styles.showcaseCard,
          styles.showcasePad,
          {
            backgroundColor: theme.leather.colors[1],
            borderColor: theme.leather.edge,
          },
          cardShadow(theme.dark),
        ]}
      >
        <DarkLeatherSurface theme={theme} radius={26} />

        {/* Action pills */}
        <View style={styles.quickPillRow}>
          {[
            { icon: "arrow-up", label: "Expense", tint: "#fda4af" },
            { icon: "arrow-down", label: "Income", tint: "#6ee7b7" },
            { icon: "swap", label: "Transfer", tint: "#93c5fd" },
          ].map((pill) => (
            <View key={pill.label} style={styles.quickPill}>
              <Icon name={pill.icon} size={13} color={pill.tint} strokeWidth={2.4} />
              <Text style={styles.quickPillText}>{pill.label}</Text>
            </View>
          ))}
        </View>

        {/* Sample transaction rows */}
        <View style={styles.txPreviewList}>
          <View style={styles.txPreviewRow}>
            <View style={[styles.txIconCircle, { backgroundColor: "rgba(253, 164, 175, 0.16)" }]}>
              <Icon name="cup" size={15} color="#fda4af" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.txTitle}>Morning Coffee</Text>
              <View style={styles.txMetaRow}>
                <Text style={styles.txMeta}>GCash · Today</Text>
                <View style={styles.receiptTag}>
                  <Icon name="paperclip" size={9} color="#e2e8f0" />
                  <Text style={styles.receiptTagText}>Receipt</Text>
                </View>
              </View>
            </View>
            <Text style={[styles.txAmount, { color: "#fda4af" }]}>-₱185.00</Text>
          </View>

          <View style={styles.txDivider} />

          <View style={styles.txPreviewRow}>
            <View style={[styles.txIconCircle, { backgroundColor: "rgba(110, 231, 183, 0.16)" }]}>
              <Icon name="briefcase" size={15} color="#6ee7b7" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.txTitle}>Monthly Salary</Text>
              <Text style={styles.txMeta}>BPI Savings · Scheduled</Text>
            </View>
            <Text style={[styles.txAmount, { color: "#6ee7b7" }]}>+₱35,000</Text>
          </View>

          <View style={styles.txDivider} />

          <View style={styles.txPreviewRow}>
            <View style={[styles.txIconCircle, { backgroundColor: "rgba(147, 197, 253, 0.16)" }]}>
              <Icon name="bolt" size={15} color="#93c5fd" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.txTitle}>Electric Bill</Text>
              <Text style={styles.txMeta}>Maya · Due in 3 days</Text>
            </View>
            <Text style={[styles.txAmount, { color: "#e2e8f0" }]}>₱2,450</Text>
          </View>
        </View>
      </View>
    </View>
  );
});

/* -------------------------------------------------------------------------- */
/* Slide 3 Visual: Mini Stitched Treemap & Budget Meter                       */
/* -------------------------------------------------------------------------- */
const InsightsShowcase = React.memo(function InsightsShowcase({
  theme,
}: {
  theme: ThemeColors;
}) {
  return (
    <View style={styles.visualStage}>
      <View
        style={[
          styles.showcaseCard,
          styles.showcasePad,
          {
            backgroundColor: theme.leather.colors[1],
            borderColor: theme.leather.edge,
          },
          cardShadow(theme.dark),
        ]}
      >
        <DarkLeatherSurface theme={theme} radius={26} />

        {/* Mini Budget Progress Bar */}
        <View style={styles.miniBudgetCard}>
          <View style={styles.miniBudgetTop}>
            <Text style={styles.miniBudgetLabel}>Monthly budget</Text>
            <Text style={styles.miniBudgetPct}>68% used</Text>
          </View>
          <View style={styles.miniBudgetTrack}>
            <View
              style={[
                styles.miniBudgetFill,
                { width: "68%", backgroundColor: "#6ee7b7" },
              ]}
            />
          </View>
        </View>

        {/* Mini Treemap Grid */}
        <View style={styles.miniTreemap}>
          <View
            style={[
              styles.miniTileLarge,
              {
                backgroundColor: hexToRgba(theme.leather.colors[0], 0.42),
                borderColor: hexToRgba(theme.leather.thread, 0.42),
              },
            ]}
          >
            <View style={styles.miniTileTop}>
              <Icon name="bolt" size={14} color="#f6f7fb" />
              <View style={styles.miniPctBadge}>
                <Text style={styles.miniPctText}>58%</Text>
              </View>
            </View>
            <View>
              <Text style={styles.miniTileLabel}>Bills</Text>
              <Text style={styles.miniTileVal}>₱8,241</Text>
            </View>
          </View>

          <View style={styles.miniTileCol}>
            <View
              style={[
                styles.miniTileSmall,
                {
                  backgroundColor: hexToRgba(theme.leather.colors[0], 0.28),
                  borderColor: hexToRgba(theme.leather.thread, 0.34),
                },
              ]}
            >
              <View style={styles.miniTileTop}>
                <Icon name="cup" size={12} color="#f6f7fb" />
                <Text style={styles.miniPctText}>26%</Text>
              </View>
              <Text style={styles.miniTileSmallVal}>Food · ₱3.6K</Text>
            </View>
            <View
              style={[
                styles.miniTileSmall,
                {
                  backgroundColor: hexToRgba(theme.leather.colors[0], 0.18),
                  borderColor: hexToRgba(theme.leather.thread, 0.28),
                },
              ]}
            >
              <View style={styles.miniTileTop}>
                <Icon name="car" size={12} color="#f6f7fb" />
                <Text style={styles.miniPctText}>16%</Text>
              </View>
              <Text style={styles.miniTileSmallVal}>Transport · ₱2.1K</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
});

/* -------------------------------------------------------------------------- */
/* Slide 4 Visual: Interactive Leather Swatches + Privacy Badges              */
/* -------------------------------------------------------------------------- */
const PrivacyCraftShowcase = React.memo(function PrivacyCraftShowcase({
  theme,
  selectedFinish,
  onSelectLeatherFinish,
}: {
  theme: ThemeColors;
  selectedFinish: LeatherFinishId;
  onSelectLeatherFinish?: (id: LeatherFinishId) => void;
}) {
  return (
    <View style={styles.visualStage}>
      <View
        style={[
          styles.showcaseCard,
          styles.showcasePad,
          {
            backgroundColor: theme.leather.colors[1],
            borderColor: theme.leather.edge,
          },
          cardShadow(theme.dark),
        ]}
      >
        <DarkLeatherSurface theme={theme} radius={26} />

        {/* Privacy status pills */}
        <View style={styles.privacyBadgesRow}>
          <View style={styles.privacyBadge}>
            <Icon name="shield" size={14} color="#6ee7b7" />
            <Text style={styles.privacyBadgeText}>Offline-first</Text>
          </View>
          <View style={styles.privacyBadge}>
            <Icon name="lock" size={14} color="#93c5fd" />
            <Text style={styles.privacyBadgeText}>PIN & Biometrics</Text>
          </View>
        </View>

        {/* Interactive leather finish picker */}
        <View style={styles.leatherPickerBox}>
          <View style={styles.leatherPickerHeader}>
            <Icon name="palette" size={13} color="rgba(246, 247, 251, 0.8)" />
            <Text style={styles.leatherPickerLabel}>
              Pick your leather finish · {theme.leather.label}
            </Text>
          </View>
          <View style={styles.swatchRow}>
            {LEATHER_FINISHES.map((finish) => {
              const active = finish.id === selectedFinish;
              return (
                <Pressable
                  key={finish.id}
                  onPress={() => onSelectLeatherFinish?.(finish.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${finish.label} leather finish`}
                  accessibilityState={{ selected: active }}
                  style={({ pressed }) => [
                    styles.swatchBtn,
                    {
                      backgroundColor: finish.colors[1],
                      borderColor: active
                        ? "#ffffff"
                        : hexToRgba(finish.thread, 0.5),
                      borderWidth: active ? 2.2 : 1.2,
                      transform: [{ scale: pressed ? 0.9 : active ? 1.08 : 1 }],
                    },
                  ]}
                >
                  {active ? (
                    <Icon name="check" size={13} color="#ffffff" strokeWidth={2.6} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
});

/* -------------------------------------------------------------------------- */
/* Top Stitched Leather Header (matches HeroHeaderSurface in Screens.tsx)     */
/* -------------------------------------------------------------------------- */
const OnboardingLeatherHeader = React.memo(function OnboardingLeatherHeader({
  theme,
  paddingTop,
  children,
}: {
  theme: ThemeColors;
  paddingTop: number;
  children: React.ReactNode;
}) {
  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const gradId = `obHdrGrad${uid}`;
  const grainId = `obHdrGrain${uid}`;
  const [size, setSize] = useState({ width: 0, height: 0 });
  const W = size.width;
  const H = size.height;

  const makePath = (inset: number, yShift = 0, closed = false) => {
    const xL = inset;
    const xR = W - inset;
    const yB = H - inset + yShift;
    const r = Math.max(8, 32 - inset);
    const cmds = [
      `M${xL} 0`,
      `V${yB - r}`,
      `Q${xL} ${yB} ${xL + r} ${yB}`,
      `H${xR - r}`,
      `Q${xR} ${yB} ${xR} ${yB - r}`,
      `V0`,
    ];
    if (closed) cmds.push("Z");
    return cmds.join(" ");
  };

  return (
    <View
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setSize((prev) =>
          prev.width === width && prev.height === height ? prev : { width, height }
        );
      }}
      style={[
        styles.leatherHeader,
        { paddingTop, paddingBottom: 18 },
      ]}
    >
      <View
        pointerEvents="none"
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: H + 8 }}
      >
        <Svg width="100%" height="100%">
          <Defs>
            <SvgLinearGradient id={gradId} x1="10%" y1="0%" x2="90%" y2="100%">
              <Stop offset="0" stopColor={theme.leather.colors[1]} />
              <Stop offset="0.55" stopColor={theme.leather.colors[1]} />
              <Stop offset="1" stopColor={theme.leather.colors[2]} />
            </SvgLinearGradient>
            <Pattern id={grainId} width={6} height={6} patternUnits="userSpaceOnUse">
              <Path d="M1 1l1.4 .5m2 3l1 .6M1 5l.6 -.3" stroke="#071522" strokeWidth="0.7" opacity="0.45" />
              <Path d="M2 2l1 .5m-2 3l1 .4M4 2l.9 -.3" stroke="#a2b0bd" strokeWidth="0.65" opacity="0.26" />
            </Pattern>
          </Defs>
          {W > 64 && H > 40 ? (
            <>
              <Path d={makePath(0, 4, true)} fill="rgba(24, 32, 54, 0.14)" />
              <Path d={makePath(0, 0, true)} fill={`url(#${gradId})`} />
              <Path d={makePath(0, 0, true)} fill={`url(#${grainId})`} />
              <Path d={makePath(2)} fill="none" stroke={theme.leather.edge} strokeWidth="3" />
              <Path
                d={makePath(8)}
                fill="none"
                stroke={theme.leather.thread}
                strokeWidth="1.05"
                strokeDasharray="3.5 3"
                strokeLinecap="round"
                opacity="0.82"
              />
              <Path
                d={makePath(13)}
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

/* -------------------------------------------------------------------------- */
/* Main OnboardingSlides Component                                            */
/* -------------------------------------------------------------------------- */
export const OnboardingSlides = React.memo(function OnboardingSlides({
  theme,
  leatherFinish,
  onSelectLeatherFinish,
  onFinish,
}: {
  theme: ThemeColors;
  leatherFinish: LeatherFinishId;
  onSelectLeatherFinish?: (id: LeatherFinishId) => void;
  onFinish: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const scrollRef = useRef<React.ComponentRef<typeof Animated.ScrollView>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const exitAnim = useRef(new Animated.Value(1)).current;
  const exitingRef = useRef(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const isLast = activeIndex === SLIDES.length - 1;

  const handleComplete = useCallback(() => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    Animated.timing(exitAnim, {
      toValue: 0,
      duration: 210,
      easing: MOTION_EASE,
      useNativeDriver: true,
    }).start(() => {
      onFinish();
    });
  }, [exitAnim, onFinish]);

  const goToIndex = useCallback(
    (nextIndex: number) => {
      const clamped = Math.max(0, Math.min(SLIDES.length - 1, nextIndex));
      scrollRef.current?.scrollTo({ x: clamped * windowWidth, animated: true });
      setActiveIndex(clamped);
    },
    [windowWidth]
  );

  const handleNext = useCallback(() => {
    if (isLast) {
      handleComplete();
    } else {
      goToIndex(activeIndex + 1);
    }
  }, [activeIndex, goToIndex, handleComplete, isLast]);

  const handleBack = useCallback(() => {
    if (activeIndex > 0) {
      goToIndex(activeIndex - 1);
    }
  }, [activeIndex, goToIndex]);

  const handleScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const idx = Math.round(x / Math.max(windowWidth, 1));
      setActiveIndex(Math.max(0, Math.min(SLIDES.length - 1, idx)));
    },
    [windowWidth]
  );

  const onScroll = useRef(
    Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
      useNativeDriver: false,
    })
  ).current;

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.root,
        {
          backgroundColor: theme.page,
          paddingBottom: Math.max(insets.bottom, 16) + 8,
          opacity: exitAnim,
          transform: [
            {
              scale: exitAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [1.03, 1],
              }),
            },
          ],
        },
      ]}
    >
      {/* Top Stitched Leather Header: Embroidered Pitaka Wordmark + Skip */}
      <OnboardingLeatherHeader theme={theme} paddingTop={insets.top + 10}>
        <View style={styles.topBar}>
          <Image
            source={PITAKA_TITLE_WHITE}
            style={styles.topWordmark}
            resizeMode="contain"
            accessibilityLabel="Pitaka"
          />
          {!isLast ? (
            <ScalePressable
              onPress={handleComplete}
              accessibilityRole="button"
              accessibilityLabel="Skip onboarding"
              scaleTo={0.95}
              style={styles.skipBtn}
            >
              <Text style={styles.skipText}>Skip</Text>
            </ScalePressable>
          ) : (
            <View style={styles.stepPill}>
              <Text style={styles.skipText}>
                {activeIndex + 1} / {SLIDES.length}
              </Text>
            </View>
          )}
        </View>
      </OnboardingLeatherHeader>

      {/* Swipeable Slides */}
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={onScroll}
        onMomentumScrollEnd={handleScrollEnd}
        style={styles.pager}
      >
        {SLIDES.map((slide, idx) => (
          <View key={slide.id} style={[styles.slidePage, { width: windowWidth }]}>
            <ScrollView
              bounces={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.slideInner}
            >
              {/* Bespoke Leather Feature Showcase */}
              {idx === 0 && <WalletShowcase theme={theme} />}
              {idx === 1 && <TrackingShowcase theme={theme} />}
              {idx === 2 && <InsightsShowcase theme={theme} />}
              {idx === 3 && (
                <PrivacyCraftShowcase
                  theme={theme}
                  selectedFinish={leatherFinish}
                  onSelectLeatherFinish={onSelectLeatherFinish}
                />
              )}

              {/* Copy Block */}
              <View style={styles.copyBlock}>
                <Text style={[styles.eyebrow, { color: theme.leather.accent }]}>
                  {slide.eyebrow}
                </Text>
                <Text style={[styles.title, { color: theme.ink }]}>
                  {slide.title}
                </Text>
                <Text style={[styles.subtitle, { color: theme.muted }]}>
                  {slide.subtitle}
                </Text>
              </View>

              {/* Feature Highlights Card */}
              <View
                style={[
                  styles.featureCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: hexToRgba(theme.leather.accent, 0.22),
                  },
                  cardShadow(theme.dark),
                ]}
              >
                <LightLeatherSurface theme={theme} radius={20} />
                {slide.features.map((feat, fIdx) => (
                  <View
                    key={feat.text}
                    style={[
                      styles.featureRow,
                      fIdx > 0 && {
                        borderTopWidth: StyleSheet.hairlineWidth,
                        borderTopColor: hexToRgba(theme.leather.accent, 0.14),
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.featureIconWrap,
                        { backgroundColor: hexToRgba(theme.leather.accent, 0.12) },
                      ]}
                    >
                      <Icon name={feat.icon} size={14} color={theme.leather.accent} />
                    </View>
                    <Text style={[styles.featureText, { color: theme.ink }]}>
                      {feat.text}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        ))}
      </Animated.ScrollView>

      {/* Bottom Controls: Pagination Dots + Stitched Leather CTA */}
      <View style={styles.footer}>
        <View style={styles.dotsRow}>
          {SLIDES.map((slide, idx) => {
            const inputRange = [
              (idx - 1) * windowWidth,
              idx * windowWidth,
              (idx + 1) * windowWidth,
            ];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [7, 24, 7],
              extrapolate: "clamp",
            });
            const dotOpacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.28, 1, 0.28],
              extrapolate: "clamp",
            });
            return (
              <Pressable
                key={slide.id}
                onPress={() => goToIndex(idx)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Go to slide ${idx + 1}`}
              >
                <Animated.View
                  style={[
                    styles.dot,
                    {
                      width: dotWidth,
                      opacity: dotOpacity,
                      backgroundColor: theme.leather.accent,
                    },
                  ]}
                />
              </Pressable>
            );
          })}
        </View>

        <View style={styles.ctaRow}>
          {activeIndex > 0 ? (
            <ScalePressable
              onPress={handleBack}
              accessibilityRole="button"
              accessibilityLabel="Previous slide"
              scaleTo={0.95}
              style={[
                styles.backBtn,
                {
                  backgroundColor: theme.card,
                  borderColor: hexToRgba(theme.leather.accent, 0.24),
                },
                cardShadow(theme.dark),
              ]}
            >
              <LightLeatherSurface theme={theme} radius={18} />
              <Icon name="back" size={18} color={theme.leather.accent} />
            </ScalePressable>
          ) : null}

          <ScalePressable
            onPress={handleNext}
            accessibilityRole="button"
            accessibilityLabel={isLast ? "Get started" : "Next slide"}
            scaleTo={0.97}
            style={[
              styles.primaryCta,
              {
                borderColor: theme.leather.edge,
              },
              cardShadow(theme.dark),
            ]}
          >
            <DarkLeatherSurface theme={theme} radius={18} />
            <Text style={styles.primaryCtaText}>
              {isLast ? "Get started" : "Continue"}
            </Text>
            <Icon
              name={isLast ? "check" : "chevron"}
              size={16}
              color="#f6f7fb"
              strokeWidth={2.4}
            />
          </ScalePressable>
        </View>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  root: {
    zIndex: 950,
    flex: 1,
  },
  leatherHeader: {
    position: "relative",
    overflow: "visible",
    paddingHorizontal: 26,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topWordmark: {
    width: 122,
    height: 42,
  },
  skipBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 99,
    borderWidth: 1,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderColor: "rgba(255, 255, 255, 0.18)",
  },
  stepPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 99,
    borderWidth: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderColor: "rgba(255, 255, 255, 0.14)",
  },
  skipText: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 12,
    color: "#f6f7fb",
  },
  pager: {
    flex: 1,
  },
  slidePage: {
    flex: 1,
  },
  slideInner: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 14,
    flexGrow: 1,
    justifyContent: "center",
  },
  visualStage: {
    marginBottom: 20,
  },
  showcaseCard: {
    borderRadius: 26,
    borderWidth: 1,
    overflow: "hidden",
    minHeight: 224,
    justifyContent: "flex-end",
  },
  showcasePad: {
    padding: 18,
    justifyContent: "center",
    gap: 12,
  },
  /* Slide 1: Mini Wallet */
  miniCardStack: {
    paddingHorizontal: 18,
    paddingTop: 18,
    height: 136,
    position: "relative",
  },
  miniCard: {
    position: "absolute",
    left: 20,
    right: 20,
    height: 82,
    borderRadius: 15,
    overflow: "hidden",
    paddingHorizontal: 14,
    paddingTop: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
  },
  miniCardBack: {
    top: 16,
  },
  miniCardMid: {
    top: 44,
  },
  miniCardFront: {
    top: 72,
  },
  miniCardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  miniCardName: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 12,
    color: "#ffffff",
  },
  miniCardAmt: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 12,
    color: "#ffffff",
  },
  miniPocketWrap: {
    marginTop: -12,
    height: 106,
    position: "relative",
    justifyContent: "center",
  },
  miniPocketContent: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 10,
  },
  miniPocketLabel: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 9.5,
    letterSpacing: 1.4,
    color: "rgba(246, 247, 251, 0.68)",
  },
  miniPocketBalance: {
    fontFamily: "Poppins_800ExtraBold",
    fontWeight: "800",
    fontSize: 22,
    letterSpacing: -0.5,
    color: "#f6f7fb",
    marginTop: 1,
  },
  miniPocketFlowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 2,
  },
  miniPocketFlowChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  miniPocketFlowText: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 11,
  },
  /* Slide 2: Tracking */
  quickPillRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  quickPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  quickPillText: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 11,
    color: "#f6f7fb",
  },
  txPreviewList: {
    borderRadius: 16,
    backgroundColor: "rgba(7, 14, 24, 0.34)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  txPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 7,
  },
  txDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  txIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  txTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 12.5,
    color: "#f6f7fb",
  },
  txMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  txMeta: {
    fontFamily: "Poppins_400Regular",
    fontWeight: "400",
    fontSize: 10.5,
    color: "rgba(246, 247, 251, 0.68)",
  },
  receiptTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  receiptTagText: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 9,
    color: "#e2e8f0",
  },
  txAmount: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 12.5,
  },
  /* Slide 3: Insights */
  miniBudgetCard: {
    borderRadius: 14,
    padding: 12,
    backgroundColor: "rgba(7, 14, 24, 0.34)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    gap: 7,
  },
  miniBudgetTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  miniBudgetLabel: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 11.5,
    color: "rgba(246, 247, 251, 0.8)",
  },
  miniBudgetPct: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 11.5,
    color: "#6ee7b7",
  },
  miniBudgetTrack: {
    height: 7,
    borderRadius: 99,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    overflow: "hidden",
  },
  miniBudgetFill: {
    height: "100%",
    borderRadius: 99,
  },
  miniTreemap: {
    flexDirection: "row",
    gap: 8,
    height: 118,
  },
  miniTileLarge: {
    flex: 1.15,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    padding: 12,
    justifyContent: "space-between",
  },
  miniTileCol: {
    flex: 1,
    gap: 8,
  },
  miniTileSmall: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: "space-between",
  },
  miniTileTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  miniPctBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 99,
    backgroundColor: "rgba(255, 255, 255, 0.14)",
  },
  miniPctText: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 10,
    color: "#f6f7fb",
  },
  miniTileLabel: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 11.5,
    color: "rgba(246, 247, 251, 0.78)",
  },
  miniTileVal: {
    fontFamily: "Poppins_800ExtraBold",
    fontWeight: "800",
    fontSize: 16,
    color: "#f6f7fb",
  },
  miniTileSmallVal: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 11,
    color: "#f6f7fb",
  },
  /* Slide 4: Privacy & Leather Picker */
  privacyBadgesRow: {
    flexDirection: "row",
    gap: 10,
  },
  privacyBadge: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "rgba(7, 14, 24, 0.34)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  privacyBadgeText: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 11.5,
    color: "#f6f7fb",
  },
  leatherPickerBox: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: "rgba(7, 14, 24, 0.34)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    gap: 12,
  },
  leatherPickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  leatherPickerLabel: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 11.5,
    color: "rgba(246, 247, 251, 0.85)",
  },
  swatchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  swatchBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  /* Copy & Feature Highlights */
  copyBlock: {
    marginBottom: 14,
  },
  eyebrow: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  title: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: "Poppins_400Regular",
    fontWeight: "400",
    fontSize: 13.5,
    lineHeight: 20,
  },
  featureCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  featureIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    flex: 1,
    fontFamily: "Poppins_500Medium",
    fontWeight: "500",
    fontSize: 12.5,
    lineHeight: 17,
  },
  /* Bottom Footer */
  footer: {
    paddingHorizontal: 22,
    paddingTop: 10,
    gap: 14,
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  dot: {
    height: 7,
    borderRadius: 99,
  },
  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backBtn: {
    width: 52,
    height: 52,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryCta: {
    flex: 1,
    height: 52,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryCtaText: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 15,
    color: "#f6f7fb",
    letterSpacing: -0.2,
  },
});
