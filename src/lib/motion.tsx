import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  LayoutChangeEvent,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from "react-native";

/** Primary fintech ease curve: swift launch with a silky deceleration settle. */
export const MOTION_EASE = Easing.bezier(0.22, 1, 0.36, 1);

/** Crisp ease-in curve for dismiss and exit transitions. */
export const MOTION_EASE_EXIT = Easing.in(Easing.cubic);

/** Gentle ease for soft continuous crossfades. */
export const MOTION_EASE_IN_OUT = Easing.inOut(Easing.cubic);

export const MOTION_DURATIONS = {
  fast: 165,
  base: 230,
  enter: 270,
  detailIn: 275,
  detailOut: 195,
  sheetIn: 255,
  sheetOut: 185,
  stagger: 46,
} as const;

export const MOTION_SPRING = {
  tension: 280,
  friction: 24,
  useNativeDriver: true,
} as const;

export const MOTION_SPRING_SNAPPY = {
  speed: 26,
  bounciness: 6,
  useNativeDriver: true,
} as const;

let cachedReduceMotion = false;

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(cachedReduceMotion);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        cachedReduceMotion = Boolean(enabled);
        if (mounted) setReduced(cachedReduceMotion);
      })
      .catch(() => {});

    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (enabled) => {
        cachedReduceMotion = Boolean(enabled);
        setReduced(cachedReduceMotion);
      }
    );

    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return reduced;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface ScalePressableProps extends Omit<PressableProps, "style"> {
  /** Scale applied while finger is pressed (default 0.965). */
  scaleTo?: number;
  /** Subtle opacity reduction on press (default 1 = transform-only). */
  pressOpacity?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/**
 * Tactile spring-scaled Pressable running entirely on the native driver.
 */
export const ScalePressable = React.memo(function ScalePressable({
  scaleTo = 0.965,
  pressOpacity = 1,
  style,
  disabled,
  onPressIn,
  onPressOut,
  children,
  ...rest
}: ScalePressableProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const reducedMotion = useReducedMotion();

  const handlePressIn = useCallback<NonNullable<PressableProps["onPressIn"]>>(
    (e) => {
      if (!disabled && !reducedMotion) {
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: scaleTo,
            duration: 95,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          ...(pressOpacity < 1
            ? [
                Animated.timing(opacityAnim, {
                  toValue: pressOpacity,
                  duration: 95,
                  easing: Easing.out(Easing.quad),
                  useNativeDriver: true,
                }),
              ]
            : []),
        ]).start();
      }
      onPressIn?.(e);
    },
    [disabled, reducedMotion, scaleAnim, opacityAnim, scaleTo, pressOpacity, onPressIn]
  );

  const handlePressOut = useCallback<NonNullable<PressableProps["onPressOut"]>>(
    (e) => {
      if (!reducedMotion) {
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            speed: 28,
            bounciness: 5,
            useNativeDriver: true,
          }),
          ...(pressOpacity < 1
            ? [
                Animated.timing(opacityAnim, {
                  toValue: 1,
                  duration: 140,
                  easing: MOTION_EASE,
                  useNativeDriver: true,
                }),
              ]
            : []),
        ]).start();
      }
      onPressOut?.(e);
    },
    [reducedMotion, scaleAnim, opacityAnim, pressOpacity, onPressOut]
  );

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        style,
        pressOpacity < 1
          ? { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }
          : { transform: [{ scale: scaleAnim }] },
      ]}
    >
      {children}
    </AnimatedPressable>
  );
});

/**
 * Coordinates a subtle, one-shot staggered entrance for UI sections and cards.
 * Only plays when `active` flips true (or when `replayKey` changes).
 */
export const StaggerReveal = React.memo(function StaggerReveal({
  active = true,
  index = 0,
  delayMs = 0,
  staggerMs = MOTION_DURATIONS.stagger,
  offsetY = 12,
  startOpacity = 0.01,
  duration = MOTION_DURATIONS.enter,
  replayKey = 0,
  style,
  children,
}: {
  active?: boolean;
  index?: number;
  delayMs?: number;
  staggerMs?: number;
  offsetY?: number;
  startOpacity?: number;
  duration?: number;
  replayKey?: number | string;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const reducedMotion = useReducedMotion();
  const progress = useRef(
    new Animated.Value(reducedMotion ? 1 : 0)
  ).current;
  const playedKeyRef = useRef<number | string | null>(null);

  useEffect(() => {
    if (reducedMotion) {
      progress.setValue(1);
      playedKeyRef.current = replayKey;
      return;
    }
    if (!active) {
      if (playedKeyRef.current !== replayKey) {
        progress.setValue(0);
      }
      return;
    }
    if (playedKeyRef.current === replayKey) {
      return;
    }
    playedKeyRef.current = replayKey;
    progress.setValue(0);

    const anim = Animated.sequence([
      ...(delayMs + index * staggerMs > 0
        ? [Animated.delay(delayMs + index * staggerMs)]
        : []),
      Animated.timing(progress, {
        toValue: 1,
        duration,
        easing: MOTION_EASE,
        useNativeDriver: true,
      }),
    ]);
    anim.start();

    return () => anim.stop();
  }, [active, delayMs, duration, index, progress, reducedMotion, replayKey, staggerMs]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [startOpacity, 1],
          }),
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [offsetY, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
});

/**
 * Native-driver horizontal progress bar fill (`scaleX` + left-edge anchor compensation).
 */
export const AnimatedBarFill = React.memo(function AnimatedBarFill({
  pct,
  active = true,
  delayMs = 80,
  duration = 420,
  animateKey,
  style,
}: {
  pct: number;
  active?: boolean;
  delayMs?: number;
  duration?: number;
  animateKey?: string | number;
  style?: StyleProp<ViewStyle>;
}) {
  const reducedMotion = useReducedMotion();
  const fillProgress = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  const [barWidth, setBarWidth] = useState(0);

  useEffect(() => {
    if (reducedMotion) {
      fillProgress.setValue(1);
      return;
    }
    if (!active) {
      fillProgress.setValue(0);
      return;
    }
    fillProgress.setValue(0);
    const anim = Animated.sequence([
      ...(delayMs > 0 ? [Animated.delay(delayMs)] : []),
      Animated.timing(fillProgress, {
        toValue: 1,
        duration,
        easing: MOTION_EASE,
        useNativeDriver: true,
      }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [active, animateKey, delayMs, duration, fillProgress, pct, reducedMotion]);

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) {
      setBarWidth((prev) => (Math.abs(w - prev) > 0.5 ? w : prev));
    }
  }, []);

  const clampedPct = Math.min(100, Math.max(0, pct));

  return (
    <Animated.View
      onLayout={handleLayout}
      style={[
        style,
        {
          width: `${clampedPct}%`,
          transform:
            barWidth > 0
              ? [
                  {
                    translateX: fillProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-barWidth / 2, 0],
                    }),
                  },
                  { scaleX: fillProgress },
                ]
              : [{ scaleX: fillProgress }],
        },
      ]}
    />
  );
});
