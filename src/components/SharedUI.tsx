import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ActivityItem, money, Tab, Tone, tonePalette } from "../types/wallet";
import { Icon } from "./Icon";

export type ThemeColors = {
  dark: boolean;
  page: string;
  surface: string;
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
    page: "#edf2e9",
    surface: "#f8fbf5",
    soft: "#e2e9dc",
    soft2: "#d8e1d1",
    ink: "#121a2d",
    muted: "#7c8578",
    line: "rgba(18, 26, 45, 0.08)",
    navy: "#172442",
    accent: "#2563eb",
    accentSoft: "#dcebff",
    accentInk: "#ffffff",
    accentText: "#1d4ed8",
    accentGradient: ["#8fd0ff", "#2563eb"],
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
          backgroundColor: theme.soft,
          borderColor: theme.dark ? theme.line : "rgba(255, 255, 255, 0.65)",
        },
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
          backgroundColor: theme.soft,
          borderColor: theme.dark ? theme.line : "rgba(255, 255, 255, 0.7)",
          transform: [{ scale: pressed ? 0.95 : 1 }],
        },
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
}: {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
  theme: ThemeColors;
}) {
  return (
    <View style={styles.topBar}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          style={[
            styles.roundButton,
            {
              backgroundColor: theme.soft,
              borderColor: theme.dark ? theme.line : "rgba(255,255,255,0.65)",
            },
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
      <View
        style={[
          styles.switchThumb,
          {
            transform: [{ translateX: on ? 18 : 0 }],
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
  theme,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  onAdd: () => void;
  theme: ThemeColors;
}) {
  const items: { id: Tab; icon: string; label: string }[] = [
    { id: "home", icon: "home", label: "Home" },
    { id: "wallets", icon: "wallet", label: "Wallets" },
    { id: "activity", icon: "activity", label: "Activity" },
    { id: "settings", icon: "settings", label: "Settings" },
  ];

  return (
    <View
      style={[
        styles.bottomNav,
        {
          backgroundColor: theme.dark
            ? "rgba(18, 24, 33, 0.96)"
            : "rgba(248, 251, 245, 0.96)",
          borderColor: theme.line,
        },
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
    </View>
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
    elevation: 10,
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
  },
  navAdd: {
    width: 50,
    height: 50,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
