import React from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { splitMoney, tonePalette, Wallet } from "../types/wallet";
import { FolderSurface } from "./FolderSurface";
import { Icon } from "./Icon";

export function Amount({
  value,
  hidden,
  size = "md",
  color = "#121a2d",
}: {
  value: number;
  hidden: boolean;
  size?: "sm" | "md" | "lg";
  color?: string;
}) {
  const fontSize = size === "sm" ? 21 : size === "md" ? 29 : 36;
  const subSize = Math.round(fontSize * 0.62);

  if (hidden) {
    return (
      <Text
        style={[
          styles.amountText,
          { fontSize, color, lineHeight: fontSize * 1.1 },
        ]}
      >
        ₱ ••••••
      </Text>
    );
  }

  const { whole, cents } = splitMoney(value);
  return (
    <Text
      style={[
        styles.amountText,
        { fontSize, color, lineHeight: fontSize * 1.1 },
      ]}
      numberOfLines={1}
      adjustsFontSizeToFit
    >
      <Text style={{ fontSize: subSize }}>₱</Text>
      {whole}
      <Text style={{ fontSize: subSize, opacity: 0.55 }}>.{cents}</Text>
    </Text>
  );
}

export function WalletFolder({
  wallet,
  hidden,
  onPress,
  onMenu,
  compact = false,
  style,
}: {
  wallet: Wallet;
  hidden: boolean;
  onPress?: () => void;
  onMenu?: () => void;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const palette = tonePalette[wallet.tone] || tonePalette.blue;
  const tabHeight = compact ? 40 : 44;
  const minHeight = compact ? 184 : 202;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.wrapper,
        { minHeight },
        pressed && onPress ? { transform: [{ scale: 0.99 }] } : null,
        style,
      ]}
    >
      <FolderSurface
        tab={0.6}
        tabHeight={tabHeight}
        radius={compact ? 25 : 28}
        notch
        fromColor={palette.from}
        toColor={palette.to}
        minHeight={minHeight}
      >
        {({ notchX, notchHeight }) => (
          <View style={{ minHeight }}>
            {/* Folder Tab */}
            <View
              style={[
                styles.folderTab,
                {
                  height: tabHeight,
                },
              ]}
            >
              <View style={styles.walletLogo}>
                <Text style={[styles.walletLogoText, { color: palette.ink }]}>
                  {wallet.mark}
                </Text>
              </View>
              <Text
                style={[
                  styles.folderName,
                  { color: palette.ink, fontSize: compact ? 17 : 18 },
                ]}
                numberOfLines={1}
              >
                {wallet.name}
              </Text>
            </View>

            {/* Folder Notch Menu Button */}
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onMenu?.();
              }}
              style={[
                styles.folderMenu,
                {
                  left: notchX,
                  height: notchHeight,
                },
              ]}
              hitSlop={8}
            >
              <Icon name="more" size={18} color={palette.ink} />
            </Pressable>

            {/* Folder Body */}
            <View
              style={[
                styles.folderBody,
                {
                  paddingTop: tabHeight + (compact ? 18 : 24),
                  paddingBottom: compact ? 18 : 22,
                },
              ]}
            >
              <Text style={[styles.folderLabel, { color: palette.ink }]}>
                Available balance
              </Text>
              <View style={{ marginTop: 2, marginBottom: compact ? 14 : 18 }}>
                <Amount
                  value={wallet.balance}
                  hidden={hidden}
                  size={compact ? "md" : "lg"}
                  color={palette.ink}
                />
              </View>
              <View style={styles.folderMeta}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.metaLabel, { color: palette.ink }]}>
                    Wallet type
                  </Text>
                  <Text
                    style={[styles.metaValue, { color: palette.ink }]}
                    numberOfLines={1}
                  >
                    {wallet.type}
                  </Text>
                </View>
                <View style={{ flex: 1, alignItems: "flex-end" }}>
                  <Text style={[styles.metaLabel, { color: palette.ink }]}>
                    Label
                  </Text>
                  <Text
                    style={[styles.metaValue, { color: palette.ink }]}
                    numberOfLines={1}
                  >
                    {wallet.account}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </FolderSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    shadowColor: "#1e2d0f",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 6,
  },
  amountText: {
    fontFamily: "Urbanist_800ExtraBold",
    fontWeight: "800",
    letterSpacing: -1,
  },
  folderTab: {
    position: "absolute",
    left: 0,
    top: 0,
    width: "58%",
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 20,
    paddingTop: 3,
    gap: 10,
  },
  walletLogo: {
    width: 31,
    height: 31,
    borderRadius: 11,
    backgroundColor: "rgba(255, 255, 255, 0.28)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  walletLogoText: {
    fontFamily: "Urbanist_800ExtraBold",
    fontWeight: "900",
    fontSize: 10,
  },
  folderName: {
    flex: 1,
    fontFamily: "Urbanist_800ExtraBold",
    fontWeight: "900",
    fontStyle: "italic",
    letterSpacing: -0.5,
  },
  folderMenu: {
    position: "absolute",
    top: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 6,
  },
  folderBody: {
    paddingHorizontal: 23,
  },
  folderLabel: {
    fontFamily: "Urbanist_700Bold",
    fontWeight: "700",
    fontSize: 11,
    opacity: 0.6,
  },
  folderMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 14,
  },
  metaLabel: {
    fontFamily: "Urbanist_700Bold",
    fontWeight: "700",
    fontSize: 10.5,
    opacity: 0.58,
  },
  metaValue: {
    fontFamily: "Urbanist_800ExtraBold",
    fontWeight: "800",
    fontSize: 14,
    marginTop: 2,
  },
});
