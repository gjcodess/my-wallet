import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { money } from "../types/wallet";
import { Icon } from "./Icon";
import { bevelStyle, cardShadow, ThemeColors } from "./SharedUI";

const KEYPAD_ROWS: string[][] = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  [".", "0", "backspace"],
];

/**
 * Formats a raw numeric string (e.g. "12500.5") with comma thousands separators
 * while preserving trailing decimals as the user types.
 */
export function formatAmountInput(raw: string): string {
  if (!raw) return "";
  const [intRaw, decRaw] = raw.split(".");
  const intNum = Number(intRaw || "0");
  const formattedInt = Number.isFinite(intNum)
    ? intNum.toLocaleString("en-US")
    : intRaw;
  if (raw.includes(".")) {
    return `${formattedInt}.${decRaw ?? ""}`;
  }
  return formattedInt;
}

export function applyKeypadKey(current: string, key: string): string {
  if (key === "backspace") {
    return current.slice(0, -1);
  }
  if (key === "clear") {
    return "";
  }
  if (key === ".") {
    if (current.includes(".")) return current;
    return current === "" ? "0." : `${current}.`;
  }
  // Digit 0-9
  const dotIdx = current.indexOf(".");
  if (dotIdx !== -1) {
    const decimals = current.slice(dotIdx + 1);
    if (decimals.length >= 2) return current;
    return `${current}${key}`;
  }
  if (current === "0") {
    return key === "0" ? "0" : key;
  }
  if (current.length >= 9) return current;
  return `${current}${key}`;
}

export const AmountKeypad = React.memo(function AmountKeypad({
  value,
  onChange,
  quickAmounts,
  quickBase = 0,
  compact = false,
  theme,
}: {
  value: string;
  onChange: (next: string) => void;
  quickAmounts?: number[];
  quickBase?: number;
  compact?: boolean;
  theme: ThemeColors;
}) {
  const handleQuickAdd = (delta: number) => {
    const base = value ? Number(value) || 0 : quickBase;
    const next = Number((base + delta).toFixed(2));
    onChange(String(next));
  };

  const keyHeight = compact ? 43 : 49;

  return (
    <View style={styles.wrapper}>
      {quickAmounts && quickAmounts.length > 0 ? (
        <View style={styles.quickRow}>
          {quickAmounts.map((amt) => (
            <Pressable
              key={amt}
              onPress={() => handleQuickAdd(amt)}
              style={({ pressed }) => [
                styles.quickChip,
                {
                  backgroundColor: theme.soft,
                  borderColor: theme.line,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                },
              ]}
            >
              <Text style={[styles.quickChipText, { color: theme.ink }]}>
                +{money(amt, true)}
              </Text>
            </Pressable>
          ))}
          {value ? (
            <Pressable
              onPress={() => onChange("")}
              style={({ pressed }) => [
                styles.clearChip,
                {
                  backgroundColor: theme.accentSoft,
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                },
              ]}
            >
              <Text style={[styles.clearChipText, { color: theme.accentText }]}>
                Clear
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={styles.grid}>
        {KEYPAD_ROWS.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.row}>
            {row.map((key) => {
              const isBack = key === "backspace";
              return (
                <Pressable
                  key={key}
                  onPress={() => onChange(applyKeypadKey(value, key))}
                  onLongPress={isBack ? () => onChange("") : undefined}
                  delayLongPress={320}
                  style={({ pressed }) => [
                    styles.keyBtn,
                    {
                      height: keyHeight,
                      backgroundColor: pressed
                        ? theme.soft2
                        : isBack
                          ? theme.soft
                          : theme.card,
                      transform: [{ scale: pressed ? 0.95 : 1 }],
                    },
                    bevelStyle(theme.dark),
                    cardShadow(theme.dark),
                  ]}
                >
                  {isBack ? (
                    <Icon name="backspace" size={20} color={theme.ink} />
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
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 10,
    marginBottom: 14,
  },
  quickRow: {
    flexDirection: "row",
    gap: 7,
    marginBottom: 10,
  },
  quickChip: {
    flex: 1,
    height: 36,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  quickChipText: {
    fontFamily: "Poppins_800ExtraBold",
    fontWeight: "800",
    fontSize: 11,
  },
  clearChip: {
    paddingHorizontal: 13,
    height: 36,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  clearChipText: {
    fontFamily: "Poppins_800ExtraBold",
    fontWeight: "800",
    fontSize: 11,
  },
  grid: {
    gap: 8,
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  keyBtn: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  keyText: {
    fontFamily: "Poppins_800ExtraBold",
    fontWeight: "800",
    fontSize: 20,
  },
});
