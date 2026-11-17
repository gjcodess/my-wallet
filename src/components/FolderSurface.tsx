import React, { useState } from "react";
import { LayoutChangeEvent, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

export function folderGeometry(
  width: number,
  height: number,
  tab: number,
  tabHeight: number,
  radius: number,
  gap: number
) {
  const w = Math.max(width, 1);
  const h = Math.max(height, tabHeight + radius * 2);
  const r = Math.min(radius, w / 5, h / 3);
  const tabEnd = Math.min(w - r * 2.4, w * tab);
  const shoulder = Math.min(32, w * 0.085);
  const shoulderStart = tabEnd - shoulder;
  const shoulderEnd = tabEnd + shoulder;
  const gapX = gap * 1.45;
  const notchHeight = tabHeight - gap;
  const notchRadius = Math.min(18, notchHeight / 2);
  const notchX = tabEnd + gapX + shoulder * 0.35;

  const folder = [
    `M0 ${r}`,
    `C0 ${r * 0.45} ${r * 0.45} 0 ${r} 0`,
    `H${shoulderStart}`,
    `C${tabEnd} 0 ${tabEnd} ${tabHeight} ${shoulderEnd} ${tabHeight}`,
    `H${w - r}`,
    `C${w - r * 0.45} ${tabHeight} ${w} ${tabHeight + r * 0.45} ${w} ${tabHeight + r}`,
    `V${h - r}`,
    `C${w} ${h - r * 0.45} ${w - r * 0.45} ${h} ${w - r} ${h}`,
    `H${r}`,
    `C${r * 0.45} ${h} 0 ${h - r * 0.45} 0 ${h - r}`,
    "Z",
  ].join(" ");

  const notch = [
    `M${shoulderStart + gapX} 0`,
    `H${w - notchRadius}`,
    `C${w - notchRadius * 0.45} 0 ${w} ${notchRadius * 0.45} ${w} ${notchRadius}`,
    `V${notchHeight - notchRadius}`,
    `C${w} ${notchHeight - notchRadius * 0.45} ${w - notchRadius * 0.45} ${notchHeight} ${w - notchRadius} ${notchHeight}`,
    `H${shoulderEnd + gapX}`,
    `C${tabEnd + gapX} ${notchHeight} ${tabEnd + gapX} 0 ${shoulderStart + gapX} 0`,
    "Z",
  ].join(" ");

  return { folder, notch, notchX, notchHeight };
}

export function FolderSurface({
  children,
  style,
  contentStyle,
  fromColor = "#8fd0ff",
  toColor = "#2563eb",
  tab = 0.62,
  tabHeight = 34,
  radius = 26,
  notch = false,
  gap = 7,
  minHeight = 190,
}: {
  children:
    | React.ReactNode
    | ((metrics: {
        width: number;
        height: number;
        tabHeight: number;
        notchX: number;
        notchHeight: number;
      }) => React.ReactNode);
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  fromColor?: string;
  toColor?: string;
  tab?: number;
  tabHeight?: number;
  radius?: number;
  notch?: boolean;
  gap?: number;
  minHeight?: number;
}) {
  const [size, setSize] = useState({ width: 350, height: minHeight });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      if (Math.abs(width - size.width) > 1 || Math.abs(height - size.height) > 1) {
        setSize({ width, height });
      }
    }
  };

  const geometry = folderGeometry(
    size.width,
    Math.max(size.height, minHeight),
    tab,
    tabHeight,
    radius,
    gap
  );

  const effectiveHeight = Math.max(size.height, minHeight);

  return (
    <View
      onLayout={onLayout}
      style={[
        styles.surface,
        { minHeight },
        style,
      ]}
    >
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg
          width={size.width}
          height={effectiveHeight}
          viewBox={`0 0 ${size.width} ${effectiveHeight}`}
        >
          <Defs>
            <LinearGradient id="folderGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor={fromColor} />
              <Stop offset="100%" stopColor={toColor} />
            </LinearGradient>
          </Defs>
          <Path d={geometry.folder} fill="url(#folderGrad)" />
          {notch && (
            <>
              <Path d={geometry.notch} fill="url(#folderGrad)" />
              <Path d={geometry.notch} fill="rgba(255, 255, 255, 0.18)" />
            </>
          )}
        </Svg>
      </View>
      <View style={[styles.content, { minHeight }, contentStyle]}>
        {typeof children === "function"
          ? children({
              width: size.width,
              height: effectiveHeight,
              tabHeight,
              notchX: geometry.notchX,
              notchHeight: geometry.notchHeight,
            })
          : children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    position: "relative",
    width: "100%",
  },
  content: {
    position: "relative",
    width: "100%",
  },
});
