import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as LocalAuthentication from "expo-local-authentication";
import { MOTION_EASE, MOTION_SPRING_SNAPPY, ScalePressable } from "../lib/motion";
import { Icon } from "./Icon";
import {
  cardShadow,
  DarkLeatherSurface,
  hexToRgba,
  LightLeatherSurface,
  SaffianoSheetSurface,
  ThemeColors,
} from "./SharedUI";

export type AppLockMode = "unlock" | "setup" | "change" | "disable";

const PIN_ROWS: string[][] = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["cancel", "0", "backspace"],
];

export function AppLockModal({
  visible,
  inline = false,
  mode,
  expectedPin,
  biometricsEnabled = false,
  onUnlock,
  onSavePin,
  onDisable,
  onCancel,
  theme,
}: {
  visible: boolean;
  inline?: boolean;
  mode: AppLockMode;
  expectedPin: string | null;
  biometricsEnabled?: boolean;
  onUnlock?: () => void;
  onSavePin?: (pin: string) => void;
  onDisable?: () => void;
  onCancel?: () => void;
  theme: ThemeColors;
}) {
  const insets = useSafeAreaInsets();
  const [digits, setDigits] = useState("");
  const [step, setStep] = useState<"verify" | "enter" | "confirm">(
    mode === "setup" ? "enter" : "verify"
  );
  const [draftPin, setDraftPin] = useState("");
  const [error, setError] = useState("");
  const shakeX = useRef(new Animated.Value(0)).current;
  const enterAnim = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const dotAnims = useRef([0, 1, 2, 3].map(() => new Animated.Value(0))).current;
  const biometricBusyRef = useRef(false);

  const triggerBiometrics = async () => {
    if (biometricBusyRef.current || !biometricsEnabled) return;
    biometricBusyRef.current = true;
    try {
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock My Wallet",
        promptSubtitle: "Verify with Fingerprint or Face ID",
        cancelLabel: "Use PIN",
        disableDeviceFallback: true,
      });
      if (res.success) {
        setDigits("");
        setError("");
        onUnlock?.();
      }
    } catch {
      // Fall back silently to 4-digit PIN keypad
    } finally {
      biometricBusyRef.current = false;
    }
  };

  useEffect(() => {
    if (!visible) return;
    setDigits("");
    setDraftPin("");
    setError("");
    enterAnim.setValue(0);
    Animated.timing(enterAnim, {
      toValue: 1,
      duration: 240,
      easing: MOTION_EASE,
      useNativeDriver: true,
    }).start();
    if (mode === "unlock" || mode === "disable" || mode === "change") {
      setStep("verify");
    } else {
      setStep("enter");
    }
    if (mode === "unlock" && biometricsEnabled) {
      const t = setTimeout(() => {
        triggerBiometrics();
      }, 150);
      return () => clearTimeout(t);
    }
  }, [visible, mode, biometricsEnabled, enterAnim]);

  useEffect(() => {
    dotAnims.forEach((dotAnim, idx) => {
      Animated.spring(dotAnim, {
        toValue: idx < digits.length ? 1 : 0,
        ...MOTION_SPRING_SNAPPY,
      }).start();
    });
  }, [digits.length, dotAnims]);

  const triggerShake = (message: string) => {
    setError(message);
    setDigits("");
    shakeX.setValue(0);
    Animated.sequence([
      Animated.timing(shakeX, {
        toValue: -12,
        duration: 55,
        useNativeDriver: true,
      }),
      Animated.timing(shakeX, {
        toValue: 12,
        duration: 55,
        useNativeDriver: true,
      }),
      Animated.timing(shakeX, {
        toValue: -8,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeX, {
        toValue: 8,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeX, {
        toValue: 0,
        duration: 45,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const evaluatePin = (completed: string) => {
    if (step === "verify") {
      if (completed !== expectedPin) {
        triggerShake("Incorrect PIN. Please try again.");
        return;
      }
      if (mode === "unlock") {
        setDigits("");
        setError("");
        onUnlock?.();
      } else if (mode === "disable") {
        setDigits("");
        setError("");
        onDisable?.();
      } else if (mode === "change") {
        setDigits("");
        setError("");
        setStep("enter");
      }
      return;
    }

    if (step === "enter") {
      setDraftPin(completed);
      setDigits("");
      setError("");
      setStep("confirm");
      return;
    }

    if (step === "confirm") {
      if (completed !== draftPin) {
        triggerShake("PINs did not match. Try again.");
        setDraftPin("");
        setStep("enter");
        return;
      }
      setDigits("");
      setError("");
      onSavePin?.(completed);
    }
  };

  const handlePressKey = (key: string) => {
    if (key === "cancel") {
      if (mode !== "unlock") {
        onCancel?.();
      }
      return;
    }
    if (key === "backspace") {
      setError("");
      setDigits((prev) => prev.slice(0, -1));
      return;
    }
    if (digits.length >= 4) return;
    const next = `${digits}${key}`;
    setError("");
    setDigits(next);
    if (next.length === 4) {
      setTimeout(() => evaluatePin(next), 90);
    }
  };

  const titleText = (() => {
    if (mode === "unlock") return "My Wallet Locked";
    if (mode === "disable") return "Disable App Lock";
    if (mode === "change") {
      if (step === "verify") return "Verify Current PIN";
      if (step === "enter") return "Choose New PIN";
      return "Confirm New PIN";
    }
    return step === "enter" ? "Set App Lock PIN" : "Confirm 4-Digit PIN";
  })();

  const subText = (() => {
    if (mode === "unlock") return "Enter your 4-digit PIN to unlock";
    if (mode === "disable") return "Enter your PIN to turn off App Lock";
    if (mode === "change") {
      if (step === "verify") return "Enter your existing 4-digit PIN";
      if (step === "enter") return "Enter a new 4-digit PIN";
      return "Re-enter your new 4-digit PIN";
    }
    return step === "enter"
      ? "Protect your wallets and balances with a 4-digit PIN"
      : "Re-enter the 4-digit PIN to confirm";
  })();

  const content = (
    <Animated.View
      style={[
        styles.contentWrap,
        {
          opacity: enterAnim,
          transform: [
            {
              translateY: enterAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [14, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View
        style={[
          styles.vaultCard,
          {
            overflow: "hidden",
            backgroundColor: theme.leather.colors[1],
            borderColor: theme.leather.edge,
          },
          cardShadow(theme.dark),
        ]}
      >
        <DarkLeatherSurface theme={theme} radius={26} />
        <View style={styles.lockBadge}>
          <Icon name="lock" size={24} color="#ffffff" />
        </View>
        <Text style={styles.title}>{titleText}</Text>
        <Text style={[styles.subtitle, { color: theme.heroMuted }]}>
          {subText}
        </Text>

        <Animated.View
          style={[styles.dotsRow, { transform: [{ translateX: shakeX }] }]}
        >
          {[0, 1, 2, 3].map((idx) => {
            const filled = idx < digits.length;
            const dotScale = dotAnims[idx].interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1.24],
            });
            return (
              <Animated.View
                key={idx}
                style={[
                  styles.pinDot,
                  {
                    backgroundColor: error
                      ? "#f87171"
                      : filled
                        ? "#ffffff"
                        : "rgba(255, 255, 255, 0.14)",
                    borderColor: error
                      ? "#f87171"
                      : filled
                        ? "#ffffff"
                        : "rgba(255, 255, 255, 0.32)",
                    transform: [{ scale: dotScale }],
                  },
                ]}
              />
            );
          })}
        </Animated.View>

        <Text style={styles.errorText}>{error || " "}</Text>
      </View>

      <View style={styles.keypad}>
        {PIN_ROWS.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.keypadRow}>
            {row.map((key) => {
              if (key === "cancel") {
                if (mode === "unlock") {
                  if (biometricsEnabled) {
                    return (
                      <ScalePressable
                        key={key}
                        onPress={triggerBiometrics}
                        scaleTo={0.93}
                        style={[
                          styles.keyBtn,
                          {
                            overflow: "hidden",
                            backgroundColor: theme.card,
                            borderColor: hexToRgba(theme.leather.accent, 0.28),
                          },
                          cardShadow(theme.dark),
                        ]}
                      >
                        <LightLeatherSurface theme={theme} radius={18} />
                        <Icon
                          name="fingerprint"
                          size={24}
                          color={theme.leather.accent}
                        />
                      </ScalePressable>
                    );
                  }
                  return <View key={key} style={styles.keySpacer} />;
                }
                return (
                  <ScalePressable
                    key={key}
                    onPress={() => handlePressKey(key)}
                    scaleTo={0.93}
                    style={[
                      styles.keyBtn,
                      {
                        overflow: "hidden",
                        backgroundColor: theme.dark
                          ? theme.soft
                          : theme.leather.soft,
                        borderColor: hexToRgba(theme.leather.accent, 0.32),
                      },
                      cardShadow(theme.dark),
                    ]}
                  >
                    <View
                      pointerEvents="none"
                      style={[
                        styles.actionKeyStitch,
                        { borderColor: hexToRgba(theme.leather.accent, 0.24) },
                      ]}
                    />
                    <Text style={[styles.cancelText, { color: theme.leather.accent }]}>
                      Cancel
                    </Text>
                  </ScalePressable>
                );
              }
              const isBack = key === "backspace";
              return (
                <ScalePressable
                  key={key}
                  onPress={() => handlePressKey(key)}
                  scaleTo={0.93}
                  style={[
                    styles.keyBtn,
                    {
                      overflow: "hidden",
                      backgroundColor: isBack
                        ? theme.leather.colors[1]
                        : theme.card,
                      borderColor: isBack
                        ? theme.leather.edge
                        : hexToRgba(theme.leather.accent, 0.24),
                    },
                    cardShadow(theme.dark),
                  ]}
                >
                  {isBack ? (
                    <DarkLeatherSurface theme={theme} radius={18} />
                  ) : (
                    <LightLeatherSurface theme={theme} radius={18} />
                  )}
                  {isBack ? (
                    <Icon name="backspace" size={21} color="#ffffff" />
                  ) : (
                    <Text style={[styles.keyText, { color: theme.ink }]}>
                      {key}
                    </Text>
                  )}
                </ScalePressable>
              );
            })}
          </View>
        ))}
      </View>
    </Animated.View>
  );

  if (inline) {
    if (!visible) return null;
    return (
      <View style={[styles.container, { paddingTop: 32 + insets.top }]}>
        {content}
      </View>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={() => {
        if (mode !== "unlock") onCancel?.();
      }}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.page }]}
        edges={["top", "left", "right", "bottom"]}
      >
        <SaffianoSheetSurface theme={theme} radius={0} />
        {content}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 22,
    paddingVertical: 20,
  },
  contentWrap: {
    flex: 1,
    justifyContent: "space-between",
    paddingTop: 12,
    paddingBottom: 8,
  },
  vaultCard: {
    borderRadius: 26,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 20,
    alignItems: "center",
  },
  lockBadge: {
    width: 56,
    height: 56,
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderColor: "rgba(255, 255, 255, 0.22)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    color: "#ffffff",
    fontFamily: "Poppins_800ExtraBold",
    fontWeight: "800",
    fontSize: 22,
    letterSpacing: -0.4,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 12.5,
    textAlign: "center",
    marginTop: 4,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 18,
    marginTop: 24,
    marginBottom: 12,
  },
  pinDot: {
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  errorText: {
    minHeight: 18,
    color: "#fca5a5",
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 12,
    textAlign: "center",
  },
  keypad: {
    gap: 11,
  },
  keypadRow: {
    flexDirection: "row",
    gap: 12,
  },
  keyBtn: {
    flex: 1,
    height: 60,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  actionKeyStitch: {
    position: "absolute",
    top: 4,
    bottom: 4,
    left: 4,
    right: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  keySpacer: {
    flex: 1,
    height: 60,
  },
  keyText: {
    fontFamily: "Poppins_800ExtraBold",
    fontWeight: "800",
    fontSize: 23,
    lineHeight: 28,
    includeFontPadding: false,
    marginTop: 2,
  },
  cancelText: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 13.5,
    lineHeight: 18,
    includeFontPadding: false,
    marginTop: 1.5,
  },
});
