import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ActivityItem, money, Tab, Tone, tonePalette } from "../types/wallet";
import { Icon } from "./Icon";

export type ThemeColors = {
  dark: boolean;
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

export function getThemeColors(dark: boolean): ThemeColors {
  if (dark) {
    return {
      dark: true,
      page: "#090d12",
      surface: "#121821",
      card: "#161f2c",
      soft: "#18212c",
      soft2: "#253140",
      ink: "#f4f7ef",
      muted: "#8f9aa8",
      line: "rgba(255, 255, 255, 0.08)",
      navy: "#1b2a48",
      accent: "#60a5fa",
      accentSoft: "rgba(96, 165, 250, 0.14)",
      accentInk: "#06111f",
      accentText: "#93c5fd",
      accentGradient: ["#93ddff", "#3b82f6"],
    };
  }
  return {
    dark: false,
    page: "#e8eff8",
    surface: "#f8fbff",
    card: "#ffffff",
    soft: "#dfe8f4",
    soft2: "#d3dfef",
    ink: "#121a2d",
    muted: "#6c7a91",
    line: "rgba(18, 26, 45, 0.08)",
    navy: "#172442",
    accent: "#2563eb",
    accentSoft: "#dcebff",
    accentInk: "#ffffff",
    accentText: "#1d4ed8",
    accentGradient: ["#8fd0ff", "#2563eb"],
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

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return `rgba(238, 243, 250, ${alpha})`;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function EdgeFade({
  position,
  color,
  size = 28,
}: {
  position: "top" | "bottom" | "left" | "right";
  color: string;
  size?: number;
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
    <LinearGradient
      pointerEvents="none"
      colors={colors}
      locations={isStartEdge ? [0, 0.28, 0.65, 1] : [0, 0.35, 0.72, 1]}
      start={start}
      end={end}
      style={[{ position: "absolute", zIndex: 15 }, posStyle]}
    />
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
  theme,
}: {
  item: ActivityItem;
  hidden: boolean;
  theme: ThemeColors;
}) {
  const isPositive = item.amount > 0;
  const iconBg = isPositive
    ? theme.dark
      ? "rgba(247, 220, 25, 0.14)"
      : "rgba(247, 220, 25, 0.32)"
    : theme.accentSoft;
  const iconColor = isPositive
    ? theme.dark
      ? "#ffe75e"
      : "#806e00"
    : theme.accentText;

  return (
    <View
      style={[
        styles.txRow,
        {
          backgroundColor: theme.card,
        },
        bevelStyle(theme.dark),
        cardShadow(theme.dark),
      ]}
    >
      <View style={[styles.txIcon, { backgroundColor: iconBg }]}>
        <Icon name={item.icon} size={18} color={iconColor} />
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
    </View>
  );
}

export function ActionButton({
  icon,
  label,
  tone,
  onPress,
  theme,
}: {
  icon: string;
  label: string;
  tone: Tone;
  onPress: () => void;
  theme: ThemeColors;
}) {
  const palette = tonePalette[tone] || tonePalette.blue;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        {
          backgroundColor: theme.card,
          transform: [{ scale: pressed ? 0.95 : 1 }],
        },
        bevelStyle(theme.dark),
        cardShadow(theme.dark),
      ]}
    >
      <LinearGradient
        colors={[palette.from, palette.to]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.actionIconBadge}
      >
        <Icon name={icon} size={18} color={palette.ink} />
      </LinearGradient>
      <Text style={[styles.actionLabel, { color: theme.ink }]}>{label}</Text>
    </Pressable>
  );
}

export function SectionTitle({
  title,
  action,
  onPress,
  theme,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
  theme: ThemeColors;
}) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={[styles.sectionTitleText, { color: theme.ink }]}>
        {title}
      </Text>
      {action ? (
        <Pressable onPress={onPress} style={styles.sectionActionBtn}>
          <Text style={[styles.sectionActionText, { color: theme.muted }]}>
            {action}
          </Text>
          <Icon name="down" size={14} color={theme.muted} />
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
            },
            bevelStyle(theme.dark),
            cardShadow(theme.dark),
          ]}
        >
          <Icon name="back" size={20} color={theme.ink} />
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

  return (
    <Animated.View
      pointerEvents={visible ? "auto" : "none"}
      style={[
        styles.bottomNav,
        {
          backgroundColor: theme.dark ? "#121821" : "#f8fbff",
          opacity,
          transform: [{ translateY }],
        },
        bevelStyle(theme.dark),
      ]}
    >
      {items.slice(0, 2).map((item) => {
        const active = tab === item.id;
        return (
          <Pressable
            key={item.id}
            onPress={() => setTab(item.id)}
            style={styles.navItem}
          >
            <Icon
              name={item.icon}
              size={20}
              color={active ? theme.accent : theme.muted}
            />
            <Text
              style={[
                styles.navLabel,
                { color: active ? theme.ink : theme.muted },
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}

      <Pressable
        onPress={onAdd}
        style={({ pressed }) => [
          styles.navAddWrapper,
          { transform: [{ scale: pressed ? 0.92 : 1 }] },
        ]}
      >
        <LinearGradient
          colors={theme.accentGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.navAdd}
        >
          <Icon name="plus" size={22} color={theme.accentInk} />
        </LinearGradient>
      </Pressable>

      {items.slice(2).map((item) => {
        const active = tab === item.id;
        return (
          <Pressable
            key={item.id}
            onPress={() => setTab(item.id)}
            style={styles.navItem}
          >
            <Icon
              name={item.icon}
              size={20}
              color={active ? theme.accent : theme.muted}
            />
            <Text
              style={[
                styles.navLabel,
                { color: active ? theme.ink : theme.muted },
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  txRow: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#121a2d",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
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
    height: 78,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 9,
    paddingHorizontal: 5,
  },
  actionIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#121a2d",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  actionLabel: {
    fontFamily: "Urbanist_800ExtraBold",
    fontWeight: "800",
    fontSize: 11,
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
    left: 12,
    right: 12,
    bottom: 12,
    height: 66,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    borderRadius: 25,
    borderWidth: 1,
    shadowColor: "#121a2d",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 12,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    height: "100%",
  },
  navLabel: {
    fontFamily: "Urbanist_700Bold",
    fontWeight: "700",
    fontSize: 10,
  },
  navAddWrapper: {
    width: 58,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#121a2d",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  navAdd: {
    width: 50,
    height: 50,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#121a2d",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
});
