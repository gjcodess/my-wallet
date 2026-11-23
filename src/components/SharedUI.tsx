import React, { useEffect, useRef } from "react";
import { Animated, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, {
  Circle as SvgCircle,
  Defs,
  Pattern,
  Path as SvgPath,
  Rect,
} from "react-native-svg";
import { ActivityItem, money, Tab, Tone } from "../types/wallet";
import { Icon } from "./Icon";

export type AccentPaletteId =
  | "blue"
  | "emerald"
  | "violet"
  | "rose"
  | "amber"
  | "teal"
  | "coral"
  | "indigo";

export type AccentPaletteSpec = {
  id: AccentPaletteId;
  label: string;
  swatch: [string, string];
  light: {
    accent: string;
    accentSoft: string;
    accentInk: string;
    accentText: string;
    accentGradient: [string, string];
  };
  dark: {
    accent: string;
    accentSoft: string;
    accentInk: string;
    accentText: string;
    accentGradient: [string, string];
  };
};

export const ACCENT_PALETTES: AccentPaletteSpec[] = [
  {
    id: "blue",
    label: "Blue",
    swatch: ["#8fd0ff", "#2563eb"],
    light: {
      accent: "#5594f5",
      accentSoft: "#dcebff",
      accentInk: "#102440",
      accentText: "#1d4ed8",
      accentGradient: ["#b1d9ff", "#75aaff"],
    },
    dark: {
      accent: "#60a5fa",
      accentSoft: "rgba(96, 165, 250, 0.14)",
      accentInk: "#06111f",
      accentText: "#93c5fd",
      accentGradient: ["#93ddff", "#3b82f6"],
    },
  },
  {
    id: "emerald",
    label: "Emerald",
    swatch: ["#6ee7b7", "#059669"],
    light: {
      accent: "#34c88b",
      accentSoft: "#d1fae5",
      accentInk: "#073523",
      accentText: "#047857",
      accentGradient: ["#a2efd0", "#60dba6"],
    },
    dark: {
      accent: "#34d399",
      accentSoft: "rgba(52, 211, 153, 0.15)",
      accentInk: "#042317",
      accentText: "#6ee7b7",
      accentGradient: ["#6ee7b7", "#10b981"],
    },
  },
  {
    id: "violet",
    label: "Violet",
    swatch: ["#c4b5fd", "#7c3aed"],
    light: {
      accent: "#a78bfa",
      accentSoft: "#ede9fe",
      accentInk: "#28164d",
      accentText: "#6d28d9",
      accentGradient: ["#ddd1ff", "#b6a0fa"],
    },
    dark: {
      accent: "#a78bfa",
      accentSoft: "rgba(167, 139, 250, 0.16)",
      accentInk: "#160a2e",
      accentText: "#c4b5fd",
      accentGradient: ["#ddd6fe", "#a78bfa"],
    },
  },
  {
    id: "rose",
    label: "Rose",
    swatch: ["#fda4af", "#e11d48"],
    light: {
      accent: "#fb8da7",
      accentSoft: "#ffe4e6",
      accentInk: "#4b1527",
      accentText: "#be123c",
      accentGradient: ["#ffc5d3", "#fb9bb2"],
    },
    dark: {
      accent: "#fb7185",
      accentSoft: "rgba(251, 113, 133, 0.15)",
      accentInk: "#2b0712",
      accentText: "#fda4af",
      accentGradient: ["#fecdd3", "#fb7185"],
    },
  },
  {
    id: "amber",
    label: "Amber",
    swatch: ["#fcd34d", "#d97706"],
    light: {
      accent: "#edb849",
      accentSoft: "#fef3c7",
      accentInk: "#422a08",
      accentText: "#b45309",
      accentGradient: ["#ffe3a0", "#f5c76b"],
    },
    dark: {
      accent: "#fbbf24",
      accentSoft: "rgba(251, 191, 36, 0.15)",
      accentInk: "#261602",
      accentText: "#fde68a",
      accentGradient: ["#fde68a", "#f59e0b"],
    },
  },
  {
    id: "teal",
    label: "Teal",
    swatch: ["#5eead4", "#0d9488"],
    light: {
      accent: "#39c8b6",
      accentSoft: "#ccfbf1",
      accentInk: "#07382f",
      accentText: "#0f766e",
      accentGradient: ["#a6eee3", "#65d8c8"],
    },
    dark: {
      accent: "#2dd4bf",
      accentSoft: "rgba(45, 212, 191, 0.15)",
      accentInk: "#042320",
      accentText: "#5eead4",
      accentGradient: ["#5eead4", "#14b8a6"],
    },
  },
  {
    id: "coral",
    label: "Copper",
    swatch: ["#ffad87", "#d64b20"],
    light: {
      accent: "#f18b65",
      accentSoft: "#fce7dd",
      accentInk: "#472014",
      accentText: "#a53619",
      accentGradient: ["#ffd1ba", "#ffa582"],
    },
    dark: {
      accent: "#ff865c",
      accentSoft: "rgba(255, 134, 92, 0.13)",
      accentInk: "#260d05",
      accentText: "#ffad87",
      accentGradient: ["#ffad87", "#ec6035"],
    },
  },
  {
    id: "indigo",
    label: "Indigo",
    swatch: ["#a5b4fc", "#4f46e5"],
    light: {
      accent: "#929cf5",
      accentSoft: "#e0e7ff",
      accentInk: "#20244c",
      accentText: "#4338ca",
      accentGradient: ["#d1d6ff", "#a4affb"],
    },
    dark: {
      accent: "#818cf8",
      accentSoft: "rgba(129, 140, 248, 0.16)",
      accentInk: "#0c0f33",
      accentText: "#c7d2fe",
      accentGradient: ["#c7d2fe", "#818cf8"],
    },
  },
];

export function isAccentPaletteId(val?: string | null): val is AccentPaletteId {
  return ACCENT_PALETTES.some((p) => p.id === val);
}

export function getAccentPalette(id: AccentPaletteId): AccentPaletteSpec {
  return ACCENT_PALETTES.find((p) => p.id === id) || ACCENT_PALETTES[0];
}

export const LEATHER_FINISHES = [
  { id: "navy", label: "Midnight", colors: ["#486077", "#243b50", "#142638"], edge: "#132536", thread: "#a2b0bd", accent: "#243b50", soft: "#e7edf2" },
  { id: "brown", label: "Saddle", colors: ["#ab7c55", "#835638", "#45291b"], edge: "#45291b", thread: "#e0c3a6", accent: "#75462c", soft: "#f4eae1" },
  { id: "black", label: "Onyx", colors: ["#55595c", "#292b2c", "#121414"], edge: "#121414", thread: "#b7b9b6", accent: "#292b2c", soft: "#ebeded" },
  { id: "green", label: "Evergreen", colors: ["#5d725c", "#354b3d", "#1d2d23"], edge: "#1d2d23", thread: "#bdc9b6", accent: "#354b3d", soft: "#e8efe8" },
  { id: "red", label: "Oxblood", colors: ["#a64f4f", "#702729", "#3c1518"], edge: "#3c1518", thread: "#e1babc", accent: "#842f34", soft: "#f5e8e8" },
  { id: "tan", label: "Cognac", colors: ["#c9a273", "#a67443", "#694227"], edge: "#694227", thread: "#f0d7b6", accent: "#80532f", soft: "#f6eddf" },
] as const;
export type LeatherFinishId = (typeof LEATHER_FINISHES)[number]["id"];
export function resolveLeatherFinish(value?: string | null) {
  return LEATHER_FINISHES.find((finish) => finish.id === value) ?? LEATHER_FINISHES[0];
}

export type ThemeColors = {
  dark: boolean;
  leather: (typeof LEATHER_FINISHES)[number];
  accentId: AccentPaletteId;
  page: string;
  surface: string;
  card: string;
  soft: string;
  soft2: string;
  ink: string;
  muted: string;
  line: string;
  navy: string;
  accent: string;
  accentSoft: string;
  accentInk: string;
  accentText: string;
  accentGradient: [string, string];
  heroGradient: [string, string, string];
  heroGlow: string;
  heroInk: string;
  heroMuted: string;
  heroLine: string;
  heroControl: string;
  positive: string;
  incomeGradient: [string, string];
  incomeInk: string;
};

function mixHex(color: string, base: string, weight: number): string {
  const channels = [1, 3, 5].map((offset) => {
    const value = Math.round(
      parseInt(color.slice(offset, offset + 2), 16) * weight +
      parseInt(base.slice(offset, offset + 2), 16) * (1 - weight)
    );
    return value.toString(16).padStart(2, "0");
  });
  return `#${channels.join("")}`;
}

export function getThemeColors(
  dark: boolean,
  accentId: AccentPaletteId = "coral"
): ThemeColors {
  const spec = getAccentPalette(accentId);
  const accentSet = dark ? spec.dark : spec.light;

  if (dark) {
    return {
      dark: true,
      leather: LEATHER_FINISHES[0],
      accentId: spec.id,
      page: mixHex(accentSet.accent, "#08090b", 0.02),
      surface: mixHex(accentSet.accent, "#141519", 0.04),
      card: mixHex(accentSet.accent, "#1a1b20", 0.04),
      soft: mixHex(accentSet.accent, "#22242a", 0.05),
      soft2: mixHex(accentSet.accent, "#30323a", 0.08),
      ink: "#f6f7fb",
      muted: "#b4b7c2",
      line: "rgba(255, 255, 255, 0.10)",
      navy: mixHex(accentSet.accent, "#17191e", 0.12),
      heroGradient: [
        mixHex(accentSet.accent, "#08090b", 0.20),
        mixHex(accentSet.accent, "#08090b", 0.09),
        mixHex(accentSet.accent, "#101114", 0.05),
      ],
      heroGlow: mixHex(accentSet.accentGradient[1], "#08090b", 0.62),
      heroInk: "#f6f7fb",
      heroMuted: "#d5d7df",
      heroLine: "rgba(255, 255, 255, 0.13)",
      heroControl: "rgba(255, 255, 255, 0.07)",
      positive: "#45cd92",
      incomeGradient: ["#214a35", "#122a1e"],
      incomeInk: "#ddf5e7",
      ...accentSet,
    };
  }
  return {
    dark: false,
    leather: LEATHER_FINISHES[0],
    accentId: spec.id,
    page: mixHex(accentSet.accent, "#f7f8fa", 0.025),
    surface: "#ffffff",
    card: "#ffffff",
    soft: mixHex(accentSet.accent, "#f0f2f6", 0.06),
    soft2: mixHex(accentSet.accent, "#e2e6ed", 0.10),
    ink: "#181c25",
    muted: "#606573",
    line: "rgba(24, 28, 37, 0.10)",
    navy: "#242936",
    heroGradient: ["#486077", "#243b50", "#142638"],
    heroGlow: mixHex(accentSet.accent, "#ffffff", 0.82),
    heroInk: "#f6f7fb",
    heroMuted: "#d5d7df",
    heroLine: "rgba(255, 255, 255, 0.18)",
    heroControl: "rgba(255, 255, 255, 0.12)",
    positive: "#13613c",
    incomeGradient: ["#e1f1e5", "#b9ddc7"],
    incomeInk: "#173c28",
    ...accentSet,
  };
}

export function cardShadow(dark: boolean) {
  return {
    shadowColor: dark ? "#000000" : "#121a2d",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: dark ? 0.35 : 0.1,
    shadowRadius: 12,
    elevation: 4,
  };
}

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return `rgba(238, 243, 250, ${alpha})`;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const AccentSurfaceGlow = React.memo(function AccentSurfaceGlow({
  theme,
  intensity = "soft",
}: {
  theme: ThemeColors;
  intensity?: "soft" | "medium";
}) {
  const startAlpha =
    intensity === "medium"
      ? theme.dark
        ? 0.13
        : 0.18
      : theme.dark
        ? 0.08
        : 0.13;
  const midAlpha = startAlpha * 0.36;
  return (
    <LinearGradient
      pointerEvents="none"
      colors={[
        hexToRgba(theme.accent, startAlpha),
        hexToRgba(theme.accent, midAlpha),
        hexToRgba(theme.accent, 0),
      ]}
      locations={[0, 0.45, 0.92]}
      start={{ x: 0, y: 1 }}
      end={{ x: 0.9, y: 0.1 }}
      style={StyleSheet.absoluteFill}
    />
  );
});

export function EdgeFade({
  position,
  color,
  size = 28,
  opacity,
}: {
  position: "top" | "bottom" | "left" | "right";
  color: string;
  size?: number;
  opacity?: number | Animated.Value | Animated.AnimatedInterpolation<number>;
}) {
  const solid = hexToRgba(color, 0.98);
  const high = hexToRgba(color, 0.72);
  const low = hexToRgba(color, 0.28);
  const clear = hexToRgba(color, 0);

  const isVertical = position === "top" || position === "bottom";
  const isStartEdge = position === "top" || position === "left";
  const colors: [string, string, string, string] = isStartEdge
    ? [solid, high, low, clear]
    : [clear, low, high, solid];

  const start = isVertical ? { x: 0, y: 0 } : { x: 0, y: 0 };
  const end = isVertical ? { x: 0, y: 1 } : { x: 1, y: 0 };

  const posStyle =
    position === "top"
      ? { top: 0, left: 0, right: 0, height: size }
      : position === "bottom"
        ? { bottom: 0, left: 0, right: 0, height: size }
        : position === "left"
          ? { top: 0, bottom: 0, left: 0, width: size }
          : { top: 0, bottom: 0, right: 0, width: size };

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: "absolute", zIndex: 15 },
        posStyle,
        opacity !== undefined ? { opacity } : null,
      ]}
    >
      <LinearGradient
        pointerEvents="none"
        colors={colors}
        locations={isStartEdge ? [0, 0.28, 0.65, 1] : [0, 0.35, 0.72, 1]}
        start={start}
        end={end}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

export function bevelStyle(dark: boolean) {
  return dark
    ? {
        borderTopWidth: 1,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderBottomWidth: 1,
        borderTopColor: "rgba(255, 255, 255, 0.13)",
        borderLeftColor: "rgba(255, 255, 255, 0.09)",
        borderRightColor: "rgba(255, 255, 255, 0.07)",
        borderBottomColor: "rgba(255, 255, 255, 0.05)",
      }
    : {
        borderTopWidth: 1.5,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderBottomWidth: 2,
        borderTopColor: "rgba(255, 255, 255, 0.92)",
        borderLeftColor: "rgba(255, 255, 255, 0.78)",
        borderRightColor: "rgba(255, 255, 255, 0.55)",
        borderBottomColor: "rgba(18, 26, 45, 0.12)",
      };
}

export function TxRow({
  item,
  dateLabel,
  hidden,
  onPress,
  theme,
}: {
  item: ActivityItem;
  dateLabel?: string;
  hidden: boolean;
  onPress?: () => void;
  theme: ThemeColors;
}) {
  const isPositive = item.amount > 0;
  const iconColor = theme.muted;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.txRow,
        {
          backgroundColor: theme.card,
          overflow: "hidden",
          transform: [{ scale: pressed && onPress ? 0.985 : 1 }],
        },
        theme.dark ? bevelStyle(true) : styles.lightTxLift,
      ]}
    >
      <AccentSurfaceGlow theme={theme} />
      <View style={[styles.txIcon, { backgroundColor: theme.soft }]}>
        <Icon name={item.icon} size={25} strokeWidth={2.05} color={iconColor} />
      </View>
      <View style={styles.rowMain}>
        <Text
          style={[styles.rowTitle, { color: theme.ink }]}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        <Text
          style={[styles.rowSub, { color: theme.muted }]}
          numberOfLines={1}
        >
          {item.kind} · {item.wallet}
        </Text>
      </View>
      <View style={styles.txValue}>
        <Text
          style={[
            styles.txAmount,
            { color: isPositive ? theme.positive : theme.ink },
          ]}
        >
          {hidden
            ? "••••"
            : `${isPositive ? "+" : "-"} ${money(Math.abs(item.amount))}`}
        </Text>
        <Text style={[styles.txDate, { color: theme.muted }]}>
          {dateLabel ?? item.date.split(",")[0]}
        </Text>
      </View>
    </Pressable>
  );
}

export function heroControlStyle(theme: ThemeColors) {
  return { backgroundColor: theme.heroControl, borderColor: theme.heroLine };
}

export const ActionButton = React.memo(function ActionButton({
  icon,
  label,
  onPress,
  theme,
}: {
  icon: string;
  label: string;
  tone?: Tone;
  onPress: () => void;
  theme: ThemeColors;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.actionButton,
        { transform: [{ scale: pressed ? 0.94 : 1 }] },
      ]}
    >
      <View style={[styles.actionPill, heroControlStyle(theme)]}>
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(255, 255, 255, 0.09)", "rgba(255, 255, 255, 0.01)"]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Icon name={icon} size={19} strokeWidth={2.15} color={theme.heroInk} />
      </View>
      <Text style={[styles.actionLabel, { color: theme.heroInk }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
});

export function SectionTitle({
  title,
  action,
  actionIcon = "down",
  actionColor,
  onPress,
  theme,
}: {
  title: string;
  action?: string;
  actionIcon?: string | null;
  actionColor?: string;
  onPress?: () => void;
  theme: ThemeColors;
}) {
  const resolvedColor = actionColor ?? theme.muted;
  return (
    <View style={styles.sectionTitle}>
      <Text style={[styles.sectionTitleText, { color: theme.ink }]}>
        {title}
      </Text>
      {action ? (
        <Pressable
          onPress={onPress}
          disabled={!onPress}
          hitSlop={8}
          style={({ pressed }) => [
            styles.sectionActionBtn,
            pressed && onPress ? { opacity: 0.7 } : null,
          ]}
        >
          <Text style={[styles.sectionActionText, { color: resolvedColor }]}>
            {action}
          </Text>
          {actionIcon ? (
            <Icon name={actionIcon} size={14} color={resolvedColor} />
          ) : null}
        </Pressable>
      ) : null}
    </View>
  );
}

export function TopBar({
  title,
  onBack,
  right,
  theme,
  noMargin,
}: {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
  theme: ThemeColors;
  noMargin?: boolean;
}) {
  return (
    <View style={[styles.topBar, noMargin && { marginBottom: 0 }]}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          style={[
            styles.roundButton,
            {
              backgroundColor: theme.card,
              overflow: "hidden",
            },
            bevelStyle(theme.dark),
            cardShadow(theme.dark),
          ]}
        >
          <AccentSurfaceGlow theme={theme} intensity="medium" />
          <Icon name="back" size={20} color={theme.accentText} />
        </Pressable>
      ) : (
        <View style={{ width: 42 }} />
      )}
      <Text
        style={[styles.topBarTitle, { color: theme.ink }]}
        numberOfLines={1}
      >
        {title}
      </Text>
      {right ? right : <View style={{ width: 42 }} />}
    </View>
  );
}

export function SwitchControl({
  on,
  onPress,
  theme,
}: {
  on: boolean;
  onPress: () => void;
  theme: ThemeColors;
}) {
  const thumbX = useRef(new Animated.Value(on ? 18 : 0)).current;

  useEffect(() => {
    Animated.spring(thumbX, {
      toValue: on ? 18 : 0,
      useNativeDriver: true,
      speed: 24,
      bounciness: 8,
    }).start();
  }, [on, thumbX]);

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.switchTrack,
        {
          backgroundColor: on ? theme.accent : theme.soft2,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.switchThumb,
          {
            transform: [{ translateX: thumbX }],
          },
        ]}
      />
    </Pressable>
  );
}

function NavLeatherSurface({ theme, round = false }: { theme: ThemeColors; round?: boolean }) {
  const grainId = round ? "navAddGrain" : "navBarGrain";
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={theme.leather.colors} style={StyleSheet.absoluteFill} />
      <Svg width="100%" height="100%" viewBox={round ? "0 0 62 62" : "0 0 300 62"} preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
        <Defs>
          <Pattern id={grainId} width={6} height={6} patternUnits="userSpaceOnUse">
            <SvgPath d="M1 1l1.4 .5m2 3l1 .6M1 5l.6 -.3" stroke="#071522" strokeWidth=".7" opacity=".45" />
            <SvgPath d="M2 2l1 .5m-2 3l1 .4M4 2l.9 -.3" stroke={theme.leather.thread} strokeWidth=".65" opacity=".26" />
          </Pattern>
        </Defs>
        {round ? (
          <>
            <SvgCircle cx="31" cy="31" r="31" fill={`url(#${grainId})`} />
            <SvgCircle cx="31" cy="31" r="26" fill="none" stroke={theme.leather.thread} strokeWidth="1" strokeDasharray="3.5 3" opacity=".85" />
            <SvgCircle cx="31" cy="31" r="22" fill="none" stroke={theme.leather.thread} strokeWidth=".7" strokeDasharray="2 3" opacity=".48" />
          </>
        ) : (
          <>
            <Rect width="300" height="62" fill={`url(#${grainId})`} />
            <Rect x="4" y="4" width="292" height="54" rx="27" fill="none" stroke={theme.leather.thread} strokeWidth="1" strokeDasharray="3.5 3" opacity=".85" />
            <Rect x="8" y="8" width="284" height="46" rx="23" fill="none" stroke={theme.leather.thread} strokeWidth=".7" strokeDasharray="2 3" opacity=".48" />
          </>
        )}
      </Svg>
    </View>
  );
}

export function BottomNav({
  tab,
  setTab,
  onAdd,
  navAnim,
  visible = true,
  theme,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  onAdd: () => void;
  navAnim?: Animated.Value;
  visible?: boolean;
  theme: ThemeColors;
}) {
  const items: { id: Tab; icon: string; label: string }[] = [
    { id: "home", icon: "home", label: "Home" },
    { id: "wallets", icon: "wallet", label: "Wallets" },
    { id: "activity", icon: "transactions", label: "Transactions" },
    { id: "statistics", icon: "activity", label: "Statistics" },
  ];

  const translateY = navAnim
    ? navAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [100, 0],
      })
    : 0;
  const opacity = navAnim ?? 1;

  const renderNavItem = (item: { id: Tab; icon: string; label: string }) => {
    const active = tab === item.id;
    return (
      <Pressable
        key={item.id}
        onPress={() => setTab(item.id)}
        accessibilityRole="tab"
        accessibilityLabel={item.label}
        accessibilityState={{ selected: active }}
        style={({ pressed }) => [
          styles.navItem,
          { transform: [{ scale: pressed ? 0.92 : 1 }] },
        ]}
      >
        <Icon
          name={item.icon}
          size={22}
          strokeWidth={active ? 2.65 : 2.25}
          color={active ? "#ffffff" : theme.leather.thread}
        />
        {active ? (
          <View
            style={[
              styles.navIndicator,
              { backgroundColor: "#ffffff" },
            ]}
          />
        ) : null}
      </Pressable>
    );
  };

  return (
    <Animated.View
      pointerEvents={visible ? "auto" : "none"}
      style={[
        styles.bottomNav,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={[styles.navLeatherBar, { backgroundColor: theme.leather.edge, borderColor: theme.leather.edge }]}>
        <NavLeatherSurface theme={theme} />
        {items.map(renderNavItem)}
      </View>
      <Pressable
        onPress={onAdd}
        accessibilityRole="button"
        accessibilityLabel="Add transaction"
        style={({ pressed }) => [
          styles.navAddWrapper,
          {
            backgroundColor: theme.leather.edge,
            borderColor: theme.leather.edge,
            transform: [{ scale: pressed ? 0.92 : 1 }],
          },
        ]}
      >
        <NavLeatherSurface theme={theme} round />
        <Icon name="plus" size={25} strokeWidth={2.5} color="#ffffff" />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  txRow: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  lightTxLift: {
    borderWidth: 0,
    ...(Platform.OS === "android" && Platform.Version < 28
      ? { elevation: 3 }
      : { boxShadow: "0px 4px 9px rgba(24, 32, 54, 0.14)" }),
  },
  txIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  rowMain: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontFamily: "Poppins_500Medium",
    fontWeight: "500",
    fontSize: 13.5,
  },
  rowSub: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 11,
  },
  txValue: {
    alignItems: "flex-end",
    gap: 2,
  },
  txAmount: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 12.5,
    fontVariant: ["tabular-nums"],
  },
  txDate: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 11,
  },
  actionButton: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  actionPill: {
    width: "100%",
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.07)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 11.5,
    color: "rgba(255, 255, 255, 0.9)",
  },
  sectionTitle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitleText: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 19,
    letterSpacing: -0.4,
  },
  sectionActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  sectionActionText: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 12,
  },
  topBar: {
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  topBarTitle: {
    flex: 1,
    textAlign: "center",
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 22,
    letterSpacing: -0.6,
  },
  roundButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  switchTrack: {
    width: 44,
    height: 26,
    borderRadius: 15,
    padding: 3,
    justifyContent: "center",
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#ffffff",
  },
  bottomNav: {
    position: "absolute",
    zIndex: 30,
    left: 18,
    right: 18,
    bottom: 14,
    height: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  navLeatherBar: {
    flex: 1,
    height: 62,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 31,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
    elevation: 12,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  navIndicator: {
    position: "absolute",
    bottom: 8,
    width: 14,
    height: 3.5,
    borderRadius: 2,
  },
  navAddWrapper: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
    elevation: 12,
  },
});
