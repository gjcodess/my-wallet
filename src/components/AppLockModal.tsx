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
import { Icon } from "./Icon";
import { bevelStyle, cardShadow, ThemeColors } from "./SharedUI";

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
  }, [visible, mode, biometricsEnabled]);

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
    <>
      <View style={styles.headerBlock}>
          <LinearGradient
            colors={theme.accentGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.lockBadge}
          >
            <Icon name="lock" size={26} color={theme.accentInk} />
          </LinearGradient>
          <Text style={[styles.title, { color: theme.ink }]}>{titleText}</Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>
            {subText}
          </Text>

          <Animated.View
            style={[styles.dotsRow, { transform: [{ translateX: shakeX }] }]}
          >
            {[0, 1, 2, 3].map((idx) => {
              const filled = idx < digits.length;
              return (
                <View
                  key={idx}
                  style={[
                    styles.pinDot,
                    {
                      backgroundColor: filled ? theme.accent : theme.soft2,
                      borderColor: error
                        ? "#c04444"
                        : filled
                          ? theme.accent
                          : theme.line,
                      transform: [{ scale: filled ? 1.12 : 1 }],
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
                        <Pressable
                          key={key}
                          onPress={triggerBiometrics}
                          style={({ pressed }) => [
                            styles.keyBtn,
                            {
                              backgroundColor: pressed
                                ? theme.soft2
                                : theme.accentSoft,
                              transform: [{ scale: pressed ? 0.94 : 1 }],
                            },
                            bevelStyle(theme.dark),
                            cardShadow(theme.dark),
                          ]}
                        >
                          <Icon
                            name="fingerprint"
                            size={24}
                            color={theme.accentText}
                          />
                        </Pressable>
                      );
                    }
                    return <View key={key} style={styles.keySpacer} />;
                  }
                  return (
                    <Pressable
                      key={key}
                      onPress={() => handlePressKey(key)}
                      style={({ pressed }) => [
                        styles.keyGhost,
                        { opacity: pressed ? 0.6 : 1 },
                      ]}
                    >
                      <Text
                        style={[styles.cancelText, { color: theme.muted }]}
                      >
                        Cancel
                      </Text>
                    </Pressable>
                  );
                }
                const isBack = key === "backspace";
                return (
                  <Pressable
                    key={key}
                    onPress={() => handlePressKey(key)}
                    style={({ pressed }) => [
                      styles.keyBtn,
                      {
                        backgroundColor: pressed
                          ? theme.soft2
                          : isBack
                            ? theme.soft
                            : theme.card,
                        transform: [{ scale: pressed ? 0.94 : 1 }],
                      },
                      bevelStyle(theme.dark),
                      cardShadow(theme.dark),
                    ]}
                  >
                    {isBack ? (
                      <Icon name="backspace" size={22} color={theme.ink} />
                    ) : (
                      <Text style={[styles.keyText, { color: theme.ink }]}>
                        {key}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
    </>
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
        {content}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 28,
    paddingVertical: 32,
  },
  headerBlock: {
    alignItems: "center",
    marginTop: 28,
  },
  lockBadge: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  title: {
    fontFamily: "Poppins_800ExtraBold",
    fontWeight: "800",
    fontSize: 24,
    letterSpacing: -0.6,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 18,
    marginTop: 30,
    marginBottom: 14,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  errorText: {
    minHeight: 18,
    color: "#c04444",
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 12,
    textAlign: "center",
  },
  keypad: {
    gap: 12,
    marginBottom: 12,
  },
  keypadRow: {
    flexDirection: "row",
    gap: 14,
  },
  keyBtn: {
    flex: 1,
    height: 62,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  keySpacer: {
    flex: 1,
    height: 62,
  },
  keyGhost: {
    flex: 1,
    height: 62,
    alignItems: "center",
    justifyContent: "center",
  },
  keyText: {
    fontFamily: "Poppins_800ExtraBold",
    fontWeight: "800",
    fontSize: 24,
  },
  cancelText: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 14,
  },
});
