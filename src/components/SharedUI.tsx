import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, {
  Circle as SvgCircle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Path as SvgPath,
  Stop,
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
      accent: "#2563eb",
      accentSoft: "#dcebff",
      accentInk: "#ffffff",
      accentText: "#1d4ed8",
      accentGradient: ["#8fd0ff", "#2563eb"],
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
      accent: "#059669",
      accentSoft: "#d1fae5",
      accentInk: "#ffffff",
      accentText: "#047857",
      accentGradient: ["#34d399", "#059669"],
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
      accent: "#7c3aed",
      accentSoft: "#ede9fe",
      accentInk: "#ffffff",
      accentText: "#6d28d9",
      accentGradient: ["#a78bfa", "#6d28d9"],
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
      accent: "#e11d48",
      accentSoft: "#ffe4e6",
      accentInk: "#ffffff",
      accentText: "#be123c",
      accentGradient: ["#fb7185", "#e11d48"],
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
      accent: "#d97706",
      accentSoft: "#fef3c7",
      accentInk: "#ffffff",
      accentText: "#b45309",
      accentGradient: ["#f59e0b", "#b45309"],
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
      accent: "#0d9488",
      accentSoft: "#ccfbf1",
      accentInk: "#ffffff",
      accentText: "#0f766e",
      accentGradient: ["#2dd4bf", "#0d9488"],
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
    label: "Coral",
    swatch: ["#fdba74", "#ea580c"],
    light: {
      accent: "#ea580c",
      accentSoft: "#ffedd5",
      accentInk: "#ffffff",
      accentText: "#c2410c",
      accentGradient: ["#fb923c", "#ea580c"],
    },
    dark: {
      accent: "#fb923c",
      accentSoft: "rgba(251, 146, 60, 0.15)",
      accentInk: "#291003",
      accentText: "#fed7aa",
      accentGradient: ["#fed7aa", "#fb923c"],
    },
  },
  {
    id: "indigo",
    label: "Indigo",
    swatch: ["#a5b4fc", "#4f46e5"],
    light: {
      accent: "#4f46e5",
      accentSoft: "#e0e7ff",
      accentInk: "#ffffff",
      accentText: "#4338ca",
      accentGradient: ["#818cf8", "#4338ca"],
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

export type ThemeColors = {
  dark: boolean;
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
};

export function getThemeColors(
  dark: boolean,
  accentId: AccentPaletteId = "blue"
): ThemeColors {
  const spec = getAccentPalette(accentId);
  const accentSet = dark ? spec.dark : spec.light;

  if (dark) {
    return {
      dark: true,
      accentId: spec.id,
      page: "#090d12",
      surface: "#121821",
      card: "#161f2c",
      soft: "#18212c",
      soft2: "#253140",
      ink: "#f4f7ef",
      muted: "#8f9aa8",
      line: "rgba(255, 255, 255, 0.08)",
      navy: "#1b2a48",
      ...accentSet,
    };
  }
  return {
    dark: false,
    accentId: spec.id,
    page: "#e8eff8",
    surface: "#f8fbff",
    card: "#ffffff",
    soft: "#dfe8f4",
    soft2: "#d3dfef",
    ink: "#121a2d",
    muted: "#6c7a91",
    line: "rgba(18, 26, 45, 0.08)",
    navy: "#172442",
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
        ? 0.19
        : 0.18
      : theme.dark
        ? 0.14
        : 0.13;
  const midAlpha = startAlpha * 0.36;
  return (
    <LinearGradient
      pointerEvents="none"
      colors={[
        hexToRgba(theme.accent, startAlpha),
        hexToRgba(theme.accent, midAlpha),
        "transparent",
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
        borderTopWidth: 1.25,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderBottomWidth: 2,
        borderTopColor: "rgba(255, 255, 255, 0.14)",
        borderLeftColor: "rgba(255, 255, 255, 0.09)",
        borderRightColor: "rgba(255, 255, 255, 0.06)",
        borderBottomColor: "rgba(0, 0, 0, 0.45)",
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
  hidden,
  onPress,
  theme,
}: {
  item: ActivityItem;
  hidden: boolean;
  onPress?: () => void;
  theme: ThemeColors;
}) {
  const isPositive = item.amount > 0;
  const iconColor = isPositive
    ? theme.dark
      ? "#fde047"
      : "#b45309"
    : theme.accentText;

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
        bevelStyle(theme.dark),
        cardShadow(theme.dark),
      ]}
    >
      <AccentSurfaceGlow theme={theme} />
      <View style={styles.txIcon}>
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
            { color: isPositive ? theme.accentText : theme.ink },
          ]}
        >
          {hidden
            ? "••••"
            : `${isPositive ? "+" : "-"} ${money(Math.abs(item.amount))}`}
        </Text>
        <Text style={[styles.txDate, { color: theme.muted }]}>
          {item.date.split(",")[0]}
        </Text>
      </View>
    </Pressable>
  );
}

export const ActionButton = React.memo(function ActionButton({
  icon,
  label,
  onPress,
}: {
  icon: string;
  label: string;
  tone?: Tone;
  onPress: () => void;
  theme?: ThemeColors;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        { transform: [{ scale: pressed ? 0.94 : 1 }] },
      ]}
    >
      <View style={styles.actionPill}>
        <Icon name={icon} size={19} strokeWidth={2.15} color="#ffffff" />
      </View>
      <Text style={styles.actionLabel} numberOfLines={1}>
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
    { id: "activity", icon: "activity", label: "Activity" },
    { id: "settings", icon: "settings", label: "Settings" },
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
          color={active ? theme.accent : theme.muted}
        />
        {active ? (
          <View
            style={[
              styles.navIndicator,
              { backgroundColor: theme.accent },
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
          backgroundColor: theme.dark
            ? "rgba(18, 24, 33, 0.96)"
            : "rgba(248, 251, 255, 0.96)",
          overflow: "hidden",
          opacity,
          transform: [{ translateY }],
        },
        bevelStyle(theme.dark),
      ]}
    >
      <AccentSurfaceGlow theme={theme} />
      {items.slice(0, 2).map(renderNavItem)}

      <Pressable
        onPress={onAdd}
        accessibilityRole="button"
        accessibilityLabel="Add transaction"
        style={({ pressed }) => [
          styles.navAddWrapper,
          {
            transform: [{ scale: pressed ? 0.92 : 1 }],
          },
        ]}
      >
        <View style={styles.navAdd}>
          <Svg width={48} height={48} viewBox="0 0 48 48">
            <Defs>
              <SvgLinearGradient
                id="navAddRing"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <Stop offset="0%" stopColor={theme.accentGradient[1]} />
                <Stop offset="28%" stopColor={theme.accentGradient[0]} />
                <Stop
                  offset="50%"
                  stopColor={theme.dark ? "#ffffff" : theme.accentSoft}
                />
                <Stop offset="72%" stopColor={theme.accentGradient[0]} />
                <Stop offset="100%" stopColor={theme.accentGradient[1]} />
              </SvgLinearGradient>
              <SvgLinearGradient
                id="navAddStar"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <Stop offset="0%" stopColor={theme.accentGradient[0]} />
                <Stop offset="100%" stopColor={theme.accentGradient[1]} />
              </SvgLinearGradient>
            </Defs>
            <SvgCircle
              cx="24"
              cy="24"
              r="20.5"
              stroke="url(#navAddRing)"
              strokeWidth="3.4"
              fill="none"
            />
            <SvgPath
              d="M 23.3 14.8 Q 24 14.3 24.7 14.8 Q 25.6 22.4 33.2 23.3 Q 33.7 24 33.2 24.7 Q 25.6 25.6 24.7 33.2 Q 24 33.7 23.3 33.2 Q 22.4 25.6 14.8 24.7 Q 14.3 24 14.8 23.3 Q 22.4 22.4 23.3 14.8 Z"
              fill="url(#navAddStar)"
            />
          </Svg>
        </View>
      </Pressable>

      {items.slice(2).map(renderNavItem)}
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
    borderRadius: 20,
    borderWidth: 1,
  },
  txIcon: {
    width: 32,
    height: 32,
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
  txValue: {
    alignItems: "flex-end",
    gap: 2,
  },
  txAmount: {
    fontFamily: "Urbanist_800ExtraBold",
    fontWeight: "800",
    fontSize: 12.5,
  },
  txDate: {
    fontFamily: "Urbanist_600SemiBold",
    fontWeight: "600",
    fontSize: 10,
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
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.24)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    fontFamily: "Urbanist_600SemiBold",
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
    fontFamily: "Urbanist_700Bold",
    fontWeight: "700",
    fontSize: 21,
    letterSpacing: -0.6,
  },
  sectionActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  sectionActionText: {
    fontFamily: "Urbanist_700Bold",
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
    fontFamily: "Urbanist_700Bold",
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
    left: 20,
    right: 20,
    bottom: 14,
    height: 62,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    borderRadius: 31,
    borderWidth: 1,
    shadowColor: "#121a2d",
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
    width: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  navAdd: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});
