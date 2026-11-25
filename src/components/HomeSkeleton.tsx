import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  cardShadow,
  DarkLeatherSurface,
  hexToRgba,
  LightLeatherSurface,
  ThemeColors,
} from "./SharedUI";

export const HomeSkeleton = React.memo(function HomeSkeleton({
  theme,
}: {
  theme: ThemeColors;
}) {
  const insets = useSafeAreaInsets();
  const pulse = useRef(new Animated.Value(0.42)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.85,
          duration: 720,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.42,
          duration: 720,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const lightBone = hexToRgba(theme.leather.accent, 0.14);
  const darkBone = "rgba(255, 255, 255, 0.14)";

  return (
    <View style={[styles.root, { backgroundColor: theme.page }]}>
      {/* Hero Skeleton */}
      <View
        style={[
          styles.hero,
          {
            paddingTop: insets.top + 16,
            backgroundColor: theme.leather.colors[1],
            borderColor: theme.leather.edge,
          },
        ]}
      >
        <DarkLeatherSurface theme={theme} radius={26} />
        <View style={styles.heroTopRow}>
          <Animated.View
            style={[styles.brandBone, { backgroundColor: darkBone, opacity: pulse }]}
          />
          <View style={styles.heroBtns}>
            {[0, 1, 2].map((i) => (
              <Animated.View
                key={i}
                style={[styles.circleBone, { backgroundColor: darkBone, opacity: pulse }]}
              />
            ))}
          </View>
        </View>
        <View style={styles.heroGreetRow}>
          <Animated.View
            style={[styles.greetBone, { backgroundColor: darkBone, opacity: pulse }]}
          />
          <Animated.View
            style={[styles.dateBone, { backgroundColor: darkBone, opacity: pulse }]}
          />
        </View>
      </View>

      {/* Physical Wallet Silhouette Skeleton */}
      <View style={styles.body}>
        <View
          style={[
            styles.walletShell,
            {
              backgroundColor: theme.leather.colors[1],
              borderColor: theme.leather.edge,
            },
            cardShadow(theme.dark),
          ]}
        >
          <DarkLeatherSurface theme={theme} radius={26} />
          <View style={styles.cardTabsWrap}>
            {[0, 1, 2].map((i) => (
              <Animated.View
                key={i}
                style={[
                  styles.cardTabBone,
                  {
                    backgroundColor:
                      i === 0
                        ? "rgba(255, 255, 255, 0.12)"
                        : i === 1
                          ? "rgba(255, 255, 255, 0.18)"
                          : "rgba(255, 255, 255, 0.24)",
                    opacity: pulse,
                  },
                ]}
              >
                <View style={styles.cardTabLeft}>
                  <View style={[styles.miniSquare, { backgroundColor: darkBone }]} />
                  <View style={[styles.cardNameBone, { backgroundColor: darkBone }]} />
                </View>
                <View style={[styles.cardAmtBone, { backgroundColor: darkBone }]} />
              </Animated.View>
            ))}
          </View>
          <View
            style={[
              styles.pocketBox,
              { borderTopColor: "rgba(255, 255, 255, 0.14)" },
            ]}
          >
            <Animated.View
              style={[styles.pocketLabelBone, { backgroundColor: darkBone, opacity: pulse }]}
            />
            <Animated.View
              style={[styles.pocketTotalBone, { backgroundColor: darkBone, opacity: pulse }]}
            />
            <Animated.View
              style={[styles.pocketSubBone, { backgroundColor: darkBone, opacity: pulse }]}
            />
          </View>
        </View>

        {/* Cashflow Card Skeleton */}
        <View
          style={[
            styles.dashCard,
            {
              backgroundColor: theme.leather.colors[1],
              borderColor: theme.leather.edge,
            },
            cardShadow(theme.dark),
          ]}
        >
          <DarkLeatherSurface theme={theme} radius={20} />
          <View style={styles.pulseRow}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.pulseCol}>
                <Animated.View
                  style={[styles.pulseLabelBone, { backgroundColor: darkBone, opacity: pulse }]}
                />
                <Animated.View
                  style={[styles.pulseValBone, { backgroundColor: darkBone, opacity: pulse }]}
                />
              </View>
            ))}
          </View>
          <View
            style={[
              styles.budgetLine,
              { borderTopColor: "rgba(255, 255, 255, 0.14)" },
            ]}
          >
            <Animated.View
              style={[styles.budgetBone, { backgroundColor: darkBone, opacity: pulse }]}
            />
          </View>
        </View>

        {/* Section + Transaction Rows Skeleton */}
        <View style={styles.sectionHead}>
          <Animated.View
            style={[styles.secTitleBone, { backgroundColor: lightBone, opacity: pulse }]}
          />
          <Animated.View
            style={[styles.secActionBone, { backgroundColor: lightBone, opacity: pulse }]}
          />
        </View>

        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[
              styles.txRowBone,
              {
                backgroundColor: theme.card,
                borderColor: hexToRgba(theme.leather.accent, 0.18),
              },
              cardShadow(theme.dark),
            ]}
          >
            <LightLeatherSurface theme={theme} radius={16} />
            <Animated.View
              style={[styles.txIconBone, { backgroundColor: lightBone, opacity: pulse }]}
            />
            <View style={styles.txTextCol}>
              <Animated.View
                style={[styles.txTitleBone, { backgroundColor: lightBone, opacity: pulse }]}
              />
              <Animated.View
                style={[styles.txSubBone, { backgroundColor: lightBone, opacity: pulse }]}
              />
            </View>
            <Animated.View
              style={[styles.txAmtBone, { backgroundColor: lightBone, opacity: pulse }]}
            />
          </View>
        ))}
      </View>

      {/* Bottom Nav Skeleton */}
      <View
        style={[
          styles.bottomNavWrap,
          { paddingBottom: Math.max(12, insets.bottom) },
        ]}
      >
        <View
          style={[
            styles.navBarBone,
            {
              backgroundColor: theme.leather.colors[1],
              borderColor: theme.leather.edge,
            },
          ]}
        >
          <DarkLeatherSurface theme={theme} radius={31} />
        </View>
        <View
          style={[
            styles.fabBone,
            {
              backgroundColor: theme.card,
              borderColor: theme.leather.edge,
            },
          ]}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 26,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    borderWidth: 1,
    borderTopWidth: 0,
    overflow: "hidden",
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandBone: {
    width: 84,
    height: 24,
    borderRadius: 8,
  },
  heroBtns: {
    flexDirection: "row",
    gap: 8,
  },
  circleBone: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  heroGreetRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  greetBone: {
    width: 132,
    height: 18,
    borderRadius: 7,
  },
  dateBone: {
    width: 94,
    height: 12,
    borderRadius: 6,
  },
  body: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 14,
    gap: 12,
  },
  walletShell: {
    borderRadius: 26,
    borderWidth: 1,
    overflow: "hidden",
    paddingTop: 14,
  },
  cardTabsWrap: {
    paddingHorizontal: 14,
    gap: 6,
  },
  cardTabBone: {
    height: 30,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTabLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  miniSquare: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  cardNameBone: {
    width: 72,
    height: 10,
    borderRadius: 5,
  },
  cardAmtBone: {
    width: 62,
    height: 11,
    borderRadius: 5,
  },
  pocketBox: {
    marginTop: 10,
    borderTopWidth: 1,
    paddingVertical: 18,
    alignItems: "center",
    gap: 8,
  },
  pocketLabelBone: {
    width: 96,
    height: 9,
    borderRadius: 5,
  },
  pocketTotalBone: {
    width: 148,
    height: 26,
    borderRadius: 8,
  },
  pocketSubBone: {
    width: 110,
    height: 10,
    borderRadius: 5,
  },
  dashCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    padding: 16,
  },
  pulseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  pulseCol: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  pulseLabelBone: {
    width: 54,
    height: 9,
    borderRadius: 5,
  },
  pulseValBone: {
    width: 70,
    height: 15,
    borderRadius: 6,
  },
  budgetLine: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  budgetBone: {
    width: "65%",
    height: 11,
    borderRadius: 5,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  secTitleBone: {
    width: 120,
    height: 16,
    borderRadius: 6,
  },
  secActionBone: {
    width: 60,
    height: 12,
    borderRadius: 6,
  },
  txRowBone: {
    height: 66,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    overflow: "hidden",
  },
  txIconBone: {
    width: 30,
    height: 30,
    borderRadius: 10,
  },
  txTextCol: {
    flex: 1,
    gap: 6,
  },
  txTitleBone: {
    width: "56%",
    height: 12,
    borderRadius: 5,
  },
  txSubBone: {
    width: "38%",
    height: 9,
    borderRadius: 4,
  },
  txAmtBone: {
    width: 58,
    height: 13,
    borderRadius: 5,
  },
  bottomNavWrap: {
    paddingHorizontal: 18,
    paddingTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  navBarBone: {
    flex: 1,
    height: 62,
    borderRadius: 31,
    borderWidth: 1,
    overflow: "hidden",
  },
  fabBone: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 1,
  },
});
