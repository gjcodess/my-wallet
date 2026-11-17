import React, { useState } from "react";
import { LayoutChangeEvent, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import Svg, {
  ClipPath,
  Defs,
  G,
  LinearGradient,
  Path,
  Stop,
} from "react-native-svg";

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

function isDarkHex(hex: string): boolean {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return false;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.45;
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
  notchGloss,
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
  notchGloss?: string;
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
  const darkSurface = isDarkHex(toColor);
  const resolvedGloss =
    notchGloss ??
    (darkSurface
      ? "rgba(255, 255, 255, 0.05)"
      : "rgba(255, 255, 255, 0.16)");
  const bevelHighlight = darkSurface
    ? "rgba(255, 255, 255, 0.16)"
    : "rgba(255, 255, 255, 0.42)";
  const bevelShadow = darkSurface
    ? "rgba(0, 0, 0, 0.16)"
    : "rgba(18, 26, 45, 0.07)";

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
          height={effectiveHeight + 16}
          viewBox={`0 0 ${size.width} ${effectiveHeight + 16}`}
        >
          <Defs>
            <LinearGradient id="folderGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor={fromColor} />
              <Stop offset="100%" stopColor={toColor} />
            </LinearGradient>
            <ClipPath id="folderClip">
              <Path d={geometry.folder} />
            </ClipPath>
            <ClipPath id="notchClip">
              <Path d={geometry.notch} />
            </ClipPath>
          </Defs>
          {/* Soft diffused multi-step drop shadow */}
          {[
            { y: 15, op: 0.015 },
            { y: 12, op: 0.022 },
            { y: 10, op: 0.028 },
            { y: 8, op: 0.034 },
            { y: 6, op: 0.04 },
            { y: 4, op: 0.046 },
            { y: 2, op: 0.05 },
          ].map((s, idx) => (
            <G key={idx} transform={`translate(0, ${s.y})`}>
              <Path d={geometry.folder} fill={`rgba(15, 23, 42, ${s.op})`} />
            </G>
          ))}
          <Path d={geometry.folder} fill="url(#folderGrad)" />
          {/* Subtle inner bevel highlight (top-left) & soft rim (bottom-right) */}
          <G clipPath="url(#folderClip)">
            <Path
              d={geometry.folder}
              fill="none"
              stroke={bevelHighlight}
              strokeWidth={1.6}
              transform="translate(0.4, 0.8)"
            />
            <Path
              d={geometry.folder}
              fill="none"
              stroke={bevelShadow}
              strokeWidth={1.4}
              transform="translate(-0.4, -0.8)"
            />
          </G>
          {notch && (
            <>
              <Path d={geometry.notch} fill="url(#folderGrad)" />
              <Path d={geometry.notch} fill={resolvedGloss} />
              <G clipPath="url(#notchClip)">
                <Path
                  d={geometry.notch}
                  fill="none"
                  stroke={bevelHighlight}
                  strokeWidth={1.4}
                  transform="translate(0.4, 0.7)"
                />
                <Path
                  d={geometry.notch}
                  fill="none"
                  stroke={bevelShadow}
                  strokeWidth={1.2}
                  transform="translate(-0.4, -0.7)"
                />
              </G>
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
