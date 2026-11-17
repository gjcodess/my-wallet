import React from "react";
import {
  Animated,
  Image,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { resolveWalletLogo, resolveWalletPrintmark } from "../data/walletPresets";
import { splitMoney, tonePalette, Wallet } from "../types/wallet";
import { FolderSurface } from "./FolderSurface";
import { Icon } from "./Icon";

export function WalletLogoBadge({
  logoKey,
  name,
  mark,
  size = 31,
  radius = 11,
  ink = "#ffffff",
  fontSize = 10,
}: {
  logoKey?: string;
  name?: string;
  mark: string;
  size?: number;
  radius?: number;
  ink?: string;
  fontSize?: number;
}) {
  const logo = resolveWalletLogo(logoKey, name);
  if (logo) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          overflow: "hidden",
        }}
      >
        <Image
          source={logo}
          style={{ width: size, height: size }}
          resizeMode="cover"
        />
      </View>
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: "rgba(255, 255, 255, 0.28)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.3)",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontFamily: "Urbanist_800ExtraBold",
          fontWeight: "900",
          fontSize,
          color: ink,
        }}
      >
        {mark}
      </Text>
    </View>
  );
}

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
  topShadow = false,
  menuIcon = "more",
  notchProgress,
  style,
}: {
  wallet: Wallet;
  hidden: boolean;
  onPress?: () => void;
  onMenu?: () => void;
  compact?: boolean;
  topShadow?: boolean;
  menuIcon?: string;
  notchProgress?: Animated.AnimatedInterpolation<number>;
  style?: StyleProp<ViewStyle>;
}) {
  const palette = tonePalette[wallet.tone] || tonePalette.blue;
  const tabHeight = compact ? 40 : 44;
  const minHeight = compact ? 184 : 202;
  const radius = compact ? 25 : 28;
  const printmark = resolveWalletPrintmark(wallet.logoKey, wallet.name);
  const printSize = compact ? 88 : 104;
  const isLightInk = palette.ink === "#ffffff";

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
        radius={radius}
        notch
        topShadow={topShadow}
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
              <WalletLogoBadge
                logoKey={wallet.logoKey}
                name={wallet.name}
                mark={wallet.mark}
                size={31}
                radius={11}
                ink={palette.ink}
                fontSize={10}
              />
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
              {notchProgress ? (
                <View style={styles.notchIconStack} pointerEvents="none">
                  <Animated.View
                    style={[
                      styles.notchIconLayer,
                      {
                        opacity: notchProgress.interpolate({
                          inputRange: [0, 0.55, 1],
                          outputRange: [1, 0, 0],
                          extrapolate: "clamp",
                        }),
                        transform: [
                          {
                            scale: notchProgress.interpolate({
                              inputRange: [0, 1],
                              outputRange: [1, 0.65],
                              extrapolate: "clamp",
                            }),
                          },
                          {
                            rotate: notchProgress.interpolate({
                              inputRange: [0, 1],
                              outputRange: ["0deg", "25deg"],
                              extrapolate: "clamp",
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    <Icon name="swap" size={15} color={palette.ink} />
                  </Animated.View>
                  <Animated.View
                    style={[
                      styles.notchIconLayer,
                      {
                        opacity: notchProgress.interpolate({
                          inputRange: [0, 0.45, 1],
                          outputRange: [0, 0, 1],
                          extrapolate: "clamp",
                        }),
                        transform: [
                          {
                            scale: notchProgress.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.65, 1],
                              extrapolate: "clamp",
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    <Icon name="more" size={18} color={palette.ink} />
                  </Animated.View>
                </View>
              ) : (
                <Icon
                  name={menuIcon}
                  size={menuIcon === "swap" ? 15 : 18}
                  color={palette.ink}
                />
              )}
            </Pressable>

            {/* Subtle Lower-Right Printmark */}
            <View
              pointerEvents="none"
              style={[
                styles.printmarkLayer,
                {
                  top: tabHeight,
                  borderBottomLeftRadius: radius,
                  borderBottomRightRadius: radius,
                },
              ]}
            >
              {printmark ? (
                <Image
                  source={printmark}
                  style={[
                    styles.printmarkImage,
                    {
                      width: printSize,
                      height: printSize,
                      tintColor: palette.ink,
                      opacity: isLightInk ? 0.12 : 0.085,
                    },
                  ]}
                  resizeMode="contain"
                />
              ) : (
                <Text
                  style={[
                    styles.printmarkMonogram,
                    {
                      color: palette.ink,
                      fontSize: compact ? 76 : 88,
                      opacity: isLightInk ? 0.1 : 0.07,
                    },
                  ]}
                >
                  {wallet.mark}
                </Text>
              )}
            </View>

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
  notchIconStack: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  notchIconLayer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  folderBody: {
    paddingHorizontal: 23,
  },
  printmarkLayer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
    justifyContent: "flex-end",
    alignItems: "flex-end",
  },
  printmarkImage: {
    marginRight: -10,
    marginBottom: -12,
  },
  printmarkMonogram: {
    marginRight: 12,
    marginBottom: -14,
    fontFamily: "Urbanist_800ExtraBold",
    fontWeight: "900",
    letterSpacing: -2,
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
