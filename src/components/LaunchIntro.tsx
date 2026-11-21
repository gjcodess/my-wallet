import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import Svg, {
  Defs,
  RadialGradient as SvgRadialGradient,
  Rect as SvgRect,
  Stop,
} from "react-native-svg";
import { hexToRgba, ThemeColors } from "./SharedUI";

const PITAKA_MARK_WHITE = require("../../assets/brand/pitaka-mark-white.png");
const PITAKA_MARK_DARK = require("../../assets/brand/pitaka-mark-dark.png");
const PITAKA_TITLE_WHITE = require("../../assets/brand/pitaka-title-white.png");
const PITAKA_TITLE_DARK = require("../../assets/brand/pitaka-title-dark.png");

export const LaunchIntro = React.memo(function LaunchIntro({
  theme,
  onFinish,
}: {
  theme: ThemeColors;
  onFinish: () => void;
}) {
  const [exiting, setExiting] = useState(false);

  const [anims] = useState(() => ({
    overlayOpacity: new Animated.Value(1),
    overlayScale: new Animated.Value(1),
    badgeOpacity: new Animated.Value(0),
    badgeScale: new Animated.Value(0.76),
    badgeTranslateY: new Animated.Value(10),
    titleOpacity: new Animated.Value(0),
    titleTranslateY: new Animated.Value(10),
    ringScale: new Animated.Value(0.75),
    ringOpacity: new Animated.Value(0),
  }));

  const dismissingRef = useRef(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runDismiss = useCallback(
    (fast: boolean) => {
      if (dismissingRef.current) return;
      dismissingRef.current = true;
      setExiting(true);

      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }

      anims.badgeOpacity.stopAnimation();
      anims.badgeScale.stopAnimation();
      anims.badgeTranslateY.stopAnimation();
      anims.titleOpacity.stopAnimation();
      anims.titleTranslateY.stopAnimation();
      anims.ringScale.stopAnimation();
      anims.ringOpacity.stopAnimation();

      const duration = fast ? 120 : 230;
      Animated.parallel([
        Animated.timing(anims.overlayOpacity, {
          toValue: 0,
          duration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(anims.overlayScale, {
          toValue: fast ? 1.02 : 1.045,
          duration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        onFinish();
      });
    },
    [anims, onFinish]
  );

  useEffect(() => {
    Animated.parallel([
      // 1. Icon badge spring in
      Animated.timing(anims.badgeOpacity, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(anims.badgeScale, {
        toValue: 1,
        speed: 22,
        bounciness: 6,
        useNativeDriver: true,
      }),
      Animated.timing(anims.badgeTranslateY, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      // 2. Subtle pulse ring
      Animated.sequence([
        Animated.timing(anims.ringOpacity, {
          toValue: 0.42,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(anims.ringOpacity, {
          toValue: 0,
          duration: 520,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(anims.ringScale, {
        toValue: 1.55,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      // 3. Wordmark glide up slightly staggered
      Animated.sequence([
        Animated.delay(130),
        Animated.parallel([
          Animated.timing(anims.titleOpacity, {
            toValue: 1,
            duration: 250,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(anims.titleTranslateY, {
            toValue: 0,
            duration: 270,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start(({ finished }) => {
      if (!finished || dismissingRef.current) return;
      holdTimerRef.current = setTimeout(() => {
        holdTimerRef.current = null;
        runDismiss(false);
      }, 320);
    });

    return () => {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
      }
    };
  }, [anims, runDismiss]);

  const handleSkip = useCallback(() => {
    runDismiss(true);
  }, [runDismiss]);

  const bgColor = theme.dark ? "#08090b" : theme.page;
  const glowColor = theme.dark ? theme.heroGlow : theme.accent;
  const badgeBg = theme.dark ? "#111827" : "#ffffff";
  const badgeBorder = theme.dark
    ? "rgba(255, 255, 255, 0.14)"
    : "rgba(17, 24, 39, 0.10)";
  const markSource = theme.dark ? PITAKA_MARK_WHITE : PITAKA_MARK_DARK;
  const titleSource = theme.dark ? PITAKA_TITLE_WHITE : PITAKA_TITLE_DARK;

  return (
    <Animated.View
      pointerEvents={exiting ? "none" : "auto"}
      style={[
        StyleSheet.absoluteFill,
        styles.overlay,
        {
          backgroundColor: bgColor,
          opacity: anims.overlayOpacity,
          transform: [{ scale: anims.overlayScale }],
        },
      ]}
    >
      {/* Ambient radial glow */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width="100%" height="100%">
          <Defs>
            <SvgRadialGradient id="introGlow" cx="50%" cy="47%" rx="58%" ry="42%">
              <Stop
                offset="0%"
                stopColor={glowColor}
                stopOpacity={theme.dark ? "0.24" : "0.20"}
              />
              <Stop
                offset="55%"
                stopColor={glowColor}
                stopOpacity={theme.dark ? "0.08" : "0.06"}
              />
              <Stop offset="100%" stopColor={glowColor} stopOpacity="0" />
            </SvgRadialGradient>
          </Defs>
          <SvgRect x="0" y="0" width="100%" height="100%" fill="url(#introGlow)" />
        </Svg>
      </View>

      <Pressable
        onPressIn={handleSkip}
        onPress={handleSkip}
        accessibilityRole="button"
        accessibilityLabel="Skip intro animation"
        style={styles.touchArea}
      >
        <View style={styles.centerLockup}>
          <View style={styles.badgeStage}>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.pulseRing,
                {
                  borderColor: hexToRgba(
                    theme.dark ? "#ffffff" : "#111827",
                    theme.dark ? 0.24 : 0.16
                  ),
                  opacity: anims.ringOpacity,
                  transform: [{ scale: anims.ringScale }],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.iconBadge,
                {
                  backgroundColor: badgeBg,
                  borderColor: badgeBorder,
                  shadowColor: theme.dark ? "#000000" : "#111827",
                  shadowOpacity: theme.dark ? 0.34 : 0.12,
                  opacity: anims.badgeOpacity,
                  transform: [
                    { translateY: anims.badgeTranslateY },
                    { scale: anims.badgeScale },
                  ],
                },
              ]}
            >
              <Image
                source={markSource}
                style={styles.iconMark}
                resizeMode="contain"
              />
            </Animated.View>
          </View>

          <Animated.View
            style={{
              opacity: anims.titleOpacity,
              transform: [{ translateY: anims.titleTranslateY }],
            }}
          >
            <Image
              source={titleSource}
              style={styles.titleWordmark}
              resizeMode="contain"
            />
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  overlay: {
    zIndex: 999,
  },
  touchArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  centerLockup: {
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  badgeStage: {
    width: 84,
    height: 84,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseRing: {
    position: "absolute",
    width: 78,
    height: 78,
    borderRadius: 23,
    borderWidth: 1.5,
  },
  iconBadge: {
    width: 76,
    height: 76,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 10,
  },
  iconMark: {
    width: 42,
    height: 48,
  },
  titleWordmark: {
    width: 118,
    height: 41,
  },
});
