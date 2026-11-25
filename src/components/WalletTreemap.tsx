import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Image as SvgImage } from "react-native-svg";
import { resolveWalletCardDesign } from "../data/walletPresets";
import { money, tonePalette, Wallet } from "../types/wallet";
import { cardShadow, DarkLeatherSurface, hexToRgba, LightLeatherSurface, ThemeColors } from "./SharedUI";
import { Icon } from "./Icon";
import { WalletLogoBadge } from "./WalletFolder";

function blendHex(hexA: string, hexB: string, t: number): string {
  const parse = (h: string) => {
    const clean = h.replace("#", "");
    const full =
      clean.length === 3
        ? clean
            .split("")
            .map((c) => c + c)
            .join("")
        : clean;
    const n = parseInt(full, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const [r1, g1, b1] = parse(hexA);
  const [r2, g2, b2] = parse(hexB);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(r1 + (r2 - r1) * t);
  const g = clamp(g1 + (g2 - g1) * t);
  const b = clamp(b1 + (b2 - b1) * t);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export type SquarifiedItem<T> = {
  data: T;
  value: number;
};

export type SquarifiedRect<T> = {
  data: T;
  pct: number;
  rank: number;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type TreemapTileLayout = {
  wallet: Wallet;
  pct: number;
  x: number;
  y: number;
  w: number;
  h: number;
};

/**
 * Computes a Bruls-Huizing-van Wijk squarified treemap layout so every
 * tile's area is strictly proportional to its share of the total value.
 */
export function computeSquarifiedLayout<T>(
  rawItems: SquarifiedItem<T>[],
  width: number,
  height: number,
  gap = 7
): SquarifiedRect<T>[] {
  const positive = rawItems
    .filter((entry) => entry.value > 0)
    .sort((a, b) => b.value - a.value);
  if (!positive.length || width <= 0 || height <= 0) return [];

  const totalValue = positive.reduce((sum, entry) => sum + entry.value, 0);
  if (totalValue <= 0) return [];

  const totalArea = width * height;
  const items = positive.map((entry, rank) => ({
    data: entry.data,
    rank,
    pct: Math.round((entry.value / totalValue) * 100),
    area: (entry.value / totalValue) * totalArea,
  }));

  const rawRects: { item: (typeof items)[number]; x: number; y: number; w: number; h: number }[] = [];

  const worstRatio = (row: typeof items, side: number): number => {
    if (!row.length || side <= 0) return Infinity;
    const sum = row.reduce((s, r) => s + r.area, 0);
    if (sum <= 0) return Infinity;
    let maxA = 0;
    let minA = Infinity;
    for (const r of row) {
      if (r.area > maxA) maxA = r.area;
      if (r.area < minA) minA = r.area;
    }
    const sideSq = side * side;
    const sumSq = sum * sum;
    return Math.max((sideSq * maxA) / sumSq, sumSq / (sideSq * minA));
  };

  const layoutRow = (
    row: typeof items,
    rx: number,
    ry: number,
    rw: number,
    rh: number
  ): { nx: number; ny: number; nw: number; nh: number } => {
    const rowSum = row.reduce((s, r) => s + r.area, 0);
    if (rw >= rh) {
      const stripW = rh > 0 ? rowSum / rh : 0;
      let cy = ry;
      for (const item of row) {
        const itemH = stripW > 0 ? item.area / stripW : 0;
        rawRects.push({ item, x: rx, y: cy, w: stripW, h: itemH });
        cy += itemH;
      }
      return { nx: rx + stripW, ny: ry, nw: Math.max(0, rw - stripW), nh: rh };
    }
    const stripH = rw > 0 ? rowSum / rw : 0;
    let cx = rx;
    for (const item of row) {
      const itemW = stripH > 0 ? item.area / stripH : 0;
      rawRects.push({ item, x: cx, y: ry, w: itemW, h: stripH });
      cx += itemW;
    }
    return { nx: rx, ny: ry + stripH, nw: rw, nh: Math.max(0, rh - stripH) };
  };

  let remaining = items.slice();
  let rx = 0;
  let ry = 0;
  let rw = width;
  let rh = height;
  let currentRow: typeof items = [];

  while (remaining.length > 0) {
    const next = remaining[0];
    const shortSide = Math.min(rw, rh);
    if (currentRow.length === 0) {
      currentRow.push(next);
      remaining = remaining.slice(1);
    } else {
      const withNext = [...currentRow, next];
      if (worstRatio(withNext, shortSide) <= worstRatio(currentRow, shortSide)) {
        currentRow = withNext;
        remaining = remaining.slice(1);
      } else {
        const nextBox = layoutRow(currentRow, rx, ry, rw, rh);
        rx = nextBox.nx;
        ry = nextBox.ny;
        rw = nextBox.nw;
        rh = nextBox.nh;
        currentRow = [];
      }
    }
  }
  if (currentRow.length > 0) {
    layoutRow(currentRow, rx, ry, rw, rh);
  }

  const halfGap = gap / 2;
  return rawRects.map(({ item, x, y, w, h }) => {
    const left = x > 0.5 ? x + halfGap : x;
    const top = y > 0.5 ? y + halfGap : y;
    const right = x + w < width - 0.5 ? x + w - halfGap : x + w;
    const bottom = y + h < height - 0.5 ? y + h - halfGap : y + h;
    return {
      data: item.data,
      pct: item.pct,
      rank: item.rank,
      x: left,
      y: top,
      w: Math.max(0, right - left),
      h: Math.max(0, bottom - top),
    };
  });
}

export function computeSquarifiedTreemap(
  wallets: Wallet[],
  width: number,
  height: number,
  gap = 7
): TreemapTileLayout[] {
  return computeSquarifiedLayout(
    wallets.map((w) => ({ data: w, value: w.balance })),
    width,
    height,
    gap
  ).map((rect) => ({
    wallet: rect.data,
    pct: rect.pct,
    x: rect.x,
    y: rect.y,
    w: rect.w,
    h: rect.h,
  }));
}

type TileAnim = {
  x: Animated.Value;
  y: Animated.Value;
  w: Animated.Value;
  h: Animated.Value;
};

export const WalletTreemap = React.memo(function WalletTreemap({
  wallets,
  hidden,
  onSelectWallet,
  theme,
}: {
  wallets: Wallet[];
  hidden: boolean;
  onSelectWallet?: (wallet: Wallet) => void;
  theme: ThemeColors;
}) {
  const [canvasWidth, setCanvasWidth] = useState(320);
  const animMapRef = useRef<Map<number, TileAnim>>(new Map());
  const mountedIdsRef = useRef<Set<number>>(new Set());

  const positiveCount = useMemo(
    () => wallets.filter((w) => w.balance > 0).length,
    [wallets]
  );
  const zeroWallets = useMemo(
    () => wallets.filter((w) => w.balance <= 0),
    [wallets]
  );
  const canvasHeight = positiveCount > 4 ? 236 : positiveCount > 2 ? 196 : 148;

  const tiles = useMemo(
    () => computeSquarifiedTreemap(wallets, canvasWidth, canvasHeight, 7),
    [wallets, canvasWidth, canvasHeight]
  );

  const getAnim = (tile: TreemapTileLayout): TileAnim => {
    let entry = animMapRef.current.get(tile.wallet.id);
    if (!entry) {
      entry = {
        x: new Animated.Value(tile.x),
        y: new Animated.Value(tile.y),
        w: new Animated.Value(tile.w),
        h: new Animated.Value(tile.h),
      };
      animMapRef.current.set(tile.wallet.id, entry);
    }
    return entry;
  };

  useEffect(() => {
    const activeIds = new Set(tiles.map((t) => t.wallet.id));
    for (const id of Array.from(animMapRef.current.keys())) {
      if (!activeIds.has(id)) {
        animMapRef.current.delete(id);
        mountedIdsRef.current.delete(id);
      }
    }

    const animations: Animated.CompositeAnimation[] = [];
    const ease = Easing.bezier(0.22, 1, 0.36, 1);

    for (const tile of tiles) {
      const anim = getAnim(tile);
      if (!mountedIdsRef.current.has(tile.wallet.id)) {
        anim.x.setValue(tile.x);
        anim.y.setValue(tile.y);
        anim.w.setValue(tile.w);
        anim.h.setValue(tile.h);
        mountedIdsRef.current.add(tile.wallet.id);
      } else {
        animations.push(
          Animated.timing(anim.x, {
            toValue: tile.x,
            duration: 320,
            easing: ease,
            useNativeDriver: false,
          }),
          Animated.timing(anim.y, {
            toValue: tile.y,
            duration: 320,
            easing: ease,
            useNativeDriver: false,
          }),
          Animated.timing(anim.w, {
            toValue: tile.w,
            duration: 320,
            easing: ease,
            useNativeDriver: false,
          }),
          Animated.timing(anim.h, {
            toValue: tile.h,
            duration: 320,
            easing: ease,
            useNativeDriver: false,
          })
        );
      }
    }

    if (animations.length > 0) {
      Animated.parallel(animations).start();
    }
  }, [tiles]);

  if (tiles.length === 0) {
    return (
      <View
        style={[
          styles.emptyCard,
          {
            overflow: "hidden",
            backgroundColor: theme.card,
            borderColor: hexToRgba(theme.leather.accent, 0.24),
          },
          cardShadow(theme.dark),
        ]}
      >
        <LightLeatherSurface theme={theme} radius={20} />
        <Text style={[styles.emptyTitle, { color: theme.ink }]}>
          Wallet distribution
        </Text>
        <Text style={[styles.emptySub, { color: theme.muted }]}>
          Add positive balances to visualize your wallet share.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.ink }]}>
          Wallet distribution
        </Text>
        <Text style={[styles.sub, { color: theme.muted }]}>
          {tiles.length} {tiles.length === 1 ? "card" : "cards"}
        </Text>
      </View>

      <View
        onLayout={(e) => {
          const nextW = Math.round(e.nativeEvent.layout.width);
          if (nextW > 0 && Math.abs(nextW - canvasWidth) > 1) {
            setCanvasWidth(nextW);
          }
        }}
        style={[styles.canvas, { height: canvasHeight }]}
      >
        {tiles.map((tile) => {
          const { wallet, pct, w, h } = tile;
          const anim = getAnim(tile);
          const pal = tonePalette[wallet.tone] || tonePalette.blue;
          const cardDesign = resolveWalletCardDesign(wallet.logoKey, wallet.name);
          const ink = cardDesign ? cardDesign.ink : pal.ink;
          const isLightInk = ink === "#ffffff";
          const subInk = isLightInk
            ? "rgba(255, 255, 255, 0.8)"
            : "rgba(20, 32, 26, 0.72)";
          const pillBg = isLightInk
            ? "rgba(8, 12, 20, 0.36)"
            : "rgba(255, 255, 255, 0.68)";
          const borderCol = isLightInk
            ? "rgba(255, 255, 255, 0.2)"
            : "rgba(20, 32, 26, 0.14)";
          const isCompact = w < 120 || h < 84;
          const isTiny = w < 74 || h < 54;

          return (
            <Animated.View
              key={wallet.id}
              style={[
                styles.tileWrap,
                {
                  left: anim.x,
                  top: anim.y,
                  width: anim.w,
                  height: anim.h,
                },
                cardShadow(theme.dark),
              ]}
            >
              <Pressable
                onPress={onSelectWallet ? () => onSelectWallet(wallet) : undefined}
                disabled={!onSelectWallet}
                style={({ pressed }) => [
                  styles.tilePress,
                  {
                    backgroundColor: cardDesign
                      ? cardDesign.isDark
                        ? "#090e17"
                        : "#edf3ec"
                      : pal.to,
                    borderColor: borderCol,
                    transform: [{ scale: pressed && onSelectWallet ? 0.97 : 1 }],
                  },
                ]}
              >
                {cardDesign ? (
                  <>
                    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                      <Svg width={Math.max(1, Math.ceil(w))} height={Math.max(1, Math.ceil(h))}>
                        <SvgImage
                          href={cardDesign.source}
                          x={0}
                          y={0}
                          width={Math.max(1, Math.ceil(w))}
                          height={Math.max(1, Math.ceil(h))}
                          preserveAspectRatio="xMaxYMid slice"
                        />
                      </Svg>
                    </View>
                    <LinearGradient
                      pointerEvents="none"
                      colors={
                        cardDesign.isDark
                          ? ["rgba(8, 12, 20, 0.12)", "rgba(8, 12, 20, 0.48)", "rgba(8, 12, 20, 0.74)"]
                          : ["rgba(244, 248, 243, 0.12)", "rgba(232, 238, 230, 0.56)", "rgba(224, 232, 222, 0.82)"]
                      }
                      locations={[0.15, 0.62, 1]}
                      style={StyleSheet.absoluteFill}
                    />
                  </>
                ) : (
                  <LinearGradient
                    pointerEvents="none"
                    colors={[pal.from, pal.to]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                )}

                {isTiny ? (
                  <View style={styles.tinyCenter}>
                    <Text style={[styles.tinyPct, { color: ink }]} numberOfLines={1}>
                      {pct}%
                    </Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.tileTop}>
                      <WalletLogoBadge
                        logoKey={wallet.logoKey}
                        name={wallet.name}
                        mark={wallet.mark}
                        size={isCompact ? 22 : 28}
                        radius={isCompact ? 7 : 9}
                        ink={ink}
                        fontSize={isCompact ? 8 : 9.5}
                      />
                      <View style={[styles.pctPill, { backgroundColor: pillBg }]}>
                        <Text style={[styles.pctText, { color: ink }]}>
                          {pct}%
                        </Text>
                      </View>
                    </View>
                    <View style={{ gap: 1 }}>
                      {!isCompact || h >= 72 ? (
                        <Text
                          style={[
                            styles.tileName,
                            { color: subInk, fontSize: isCompact ? 10.5 : 12 },
                          ]}
                          numberOfLines={1}
                        >
                          {wallet.name}
                        </Text>
                      ) : null}
                      <Text
                        style={[
                          styles.tileBal,
                          { color: ink, fontSize: isCompact ? 12 : 14.5 },
                        ]}
                        numberOfLines={1}
                      >
                        {hidden ? "••••" : money(wallet.balance, isCompact)}
                      </Text>
                    </View>
                  </>
                )}
              </Pressable>
            </Animated.View>
          );
        })}
      </View>

      {zeroWallets.length > 0 ? (
        <Text style={[styles.zeroNote, { color: theme.muted }]}>
          ₱0.00 balance: {zeroWallets.map((w) => w.name).join(" · ")}
        </Text>
      ) : null}
    </View>
  );
});

export type CategoryTreemapItem = {
  icon: string;
  label: string;
  amount: number;
};

export const CategoryTreemap = React.memo(function CategoryTreemap({
  categories,
  mode,
  selectedCategory,
  hidden,
  onSelectCategory,
  onToggleMode,
  theme,
}: {
  categories: CategoryTreemapItem[];
  mode: "Expense" | "Income";
  selectedCategory: string | null;
  hidden: boolean;
  onSelectCategory: (label: string) => void;
  onToggleMode: () => void;
  theme: ThemeColors;
}) {
  const [canvasWidth, setCanvasWidth] = useState(320);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const animMapRef = useRef<Map<string, TileAnim>>(new Map());
  const mountedKeysRef = useRef<Set<string>>(new Set());

  const totalCategoryAmount = useMemo(
    () => categories.reduce((s, c) => s + Math.max(0, c.amount), 0),
    [categories]
  );

  const activeCategories = useMemo(() => {
    const pos = categories
      .filter((c) => c.amount > 0)
      .sort((a, b) => b.amount - a.amount);
    const total = pos.reduce((s, c) => s + c.amount, 0);
    if (total <= 0) return [];
    const major = pos.filter((c) => c.amount / total >= 0.02);
    const minor = pos.filter((c) => c.amount / total < 0.02);
    const minorTotal = minor.reduce((s, c) => s + c.amount, 0);
    if (major.length === 0) return pos;
    if (minorTotal / total >= 0.02) {
      return [...major, { icon: "tag", label: "Other", amount: minorTotal }];
    }
    return major;
  }, [categories]);
  const canvasHeight =
    activeCategories.length > 4 ? 236 : activeCategories.length > 2 ? 196 : 148;

  const rects = useMemo(
    () =>
      computeSquarifiedLayout(
        activeCategories.map((c) => ({ data: c, value: c.amount })),
        canvasWidth,
        canvasHeight,
        7
      ),
    [activeCategories, canvasWidth, canvasHeight]
  );

  const getAnim = (rect: SquarifiedRect<CategoryTreemapItem>): TileAnim => {
    let entry = animMapRef.current.get(rect.data.label);
    if (!entry) {
      entry = {
        x: new Animated.Value(rect.x),
        y: new Animated.Value(rect.y),
        w: new Animated.Value(rect.w),
        h: new Animated.Value(rect.h),
      };
      animMapRef.current.set(rect.data.label, entry);
    }
    return entry;
  };

  useEffect(() => {
    const activeKeys = new Set(rects.map((r) => r.data.label));
    for (const key of Array.from(animMapRef.current.keys())) {
      if (!activeKeys.has(key)) {
        animMapRef.current.delete(key);
        mountedKeysRef.current.delete(key);
      }
    }

    const animations: Animated.CompositeAnimation[] = [];
    const ease = Easing.bezier(0.22, 1, 0.36, 1);

    for (const rect of rects) {
      const anim = getAnim(rect);
      if (!mountedKeysRef.current.has(rect.data.label)) {
        anim.x.setValue(rect.x);
        anim.y.setValue(rect.y);
        anim.w.setValue(rect.w);
        anim.h.setValue(rect.h);
        mountedKeysRef.current.add(rect.data.label);
      } else {
        animations.push(
          Animated.timing(anim.x, {
            toValue: rect.x,
            duration: 320,
            easing: ease,
            useNativeDriver: false,
          }),
          Animated.timing(anim.y, {
            toValue: rect.y,
            duration: 320,
            easing: ease,
            useNativeDriver: false,
          }),
          Animated.timing(anim.w, {
            toValue: rect.w,
            duration: 320,
            easing: ease,
            useNativeDriver: false,
          }),
          Animated.timing(anim.h, {
            toValue: rect.h,
            duration: 320,
            easing: ease,
            useNativeDriver: false,
          })
        );
      }
    }

    if (animations.length > 0) {
      Animated.parallel(animations).start();
    }
  }, [rects]);

  const isIncomeMode = mode === "Income";
  const accentHex = isIncomeMode ? theme.positive : theme.leather.accent;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.ink }]}>Categories</Text>
        <View
          style={[
            styles.modeTogglePill,
            {
              backgroundColor: theme.card,
              borderColor: hexToRgba(theme.leather.accent, 0.24),
            },
          ]}
        >
          {(["Expense", "Income"] as const).map((opt) => {
            const isActive = mode === opt;
            const chipColor =
              opt === "Income" ? theme.positive : theme.leather.accent;
            return (
              <Pressable
                key={opt}
                onPress={() => {
                  if (!isActive) onToggleMode();
                }}
                style={[
                  styles.modeToggleChip,
                  isActive && { backgroundColor: chipColor },
                ]}
              >
                <Text
                  style={[
                    styles.modeToggleText,
                    { color: isActive ? "#ffffff" : theme.muted },
                  ]}
                >
                  {opt}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {rects.length > 0 ? (
        <View
          onLayout={(e) => {
            const nextW = Math.round(e.nativeEvent.layout.width);
            if (nextW > 0 && Math.abs(nextW - canvasWidth) > 1) {
              setCanvasWidth(nextW);
            }
          }}
          style={[styles.canvas, { height: canvasHeight }]}
        >
          {rects.map((rect) => {
            const { data, pct, rank, w, h } = rect;
            const anim = getAnim(rect);
            const active = selectedCategory === data.label;
            const isCompact = w < 118 || h < 82;
            const isTiny = w < 74 || h < 54;

            // Graduated opaque hex palette by rank (no alpha on elevated Android cards)
            let tileBg = theme.card;
            let tileBorder = hexToRgba(accentHex, 0.24);
            let useLightText = false;

            if (active || rank === 0) {
              tileBg = isIncomeMode ? "#047857" : theme.leather.colors[1];
              tileBorder = isIncomeMode ? "#065f46" : theme.leather.edge;
              useLightText = true;
            } else if (rank === 1) {
              tileBg = isIncomeMode ? "#059669" : theme.leather.colors[0];
              tileBorder = isIncomeMode ? "#047857" : hexToRgba(theme.leather.edge, 0.7);
              useLightText = true;
            } else if (rank === 2) {
              tileBg = isIncomeMode
                ? blendHex(theme.card, "#10b981", theme.dark ? 0.34 : 0.22)
                : blendHex(theme.card, theme.leather.accent, theme.dark ? 0.45 : 0.24);
              tileBorder = hexToRgba(accentHex, 0.34);
              useLightText = theme.dark;
            } else if (rank === 3) {
              tileBg = isIncomeMode
                ? blendHex(theme.card, "#10b981", theme.dark ? 0.2 : 0.12)
                : blendHex(theme.card, theme.leather.accent, theme.dark ? 0.26 : 0.12);
              tileBorder = hexToRgba(accentHex, 0.26);
              useLightText = theme.dark;
            } else {
              tileBg = theme.card;
              tileBorder = hexToRgba(accentHex, 0.22);
              useLightText = theme.dark;
            }

            const titleColor = useLightText ? "#ffffff" : theme.ink;
            const subColor = useLightText ? "rgba(255, 255, 255, 0.84)" : theme.muted;
            const pillBg = useLightText
              ? "rgba(255, 255, 255, 0.18)"
              : hexToRgba(accentHex, 0.12);
            const pillTextColor = useLightText ? "#ffffff" : accentHex;

            return (
              <Animated.View
                key={data.label}
                style={[
                  styles.tileWrap,
                  {
                    left: anim.x,
                    top: anim.y,
                    width: anim.w,
                    height: anim.h,
                  },
                  cardShadow(theme.dark),
                ]}
              >
                <Pressable
                  onPress={() => onSelectCategory(data.label)}
                  style={({ pressed }) => [
                    styles.tilePress,
                    {
                      padding: isTiny ? 4 : isCompact ? 8 : 11,
                      backgroundColor: tileBg,
                      borderColor: tileBorder,
                      transform: [{ scale: pressed ? 0.97 : 1 }],
                    },
                  ]}
                >
                  <View
                    pointerEvents="none"
                    style={[
                      styles.tileInnerStitch,
                      {
                        borderColor: useLightText
                          ? "rgba(255, 255, 255, 0.22)"
                          : hexToRgba(accentHex, 0.18),
                      },
                    ]}
                  />

                  {isTiny ? (
                    <View style={styles.tinyCenter}>
                      <Text
                        style={[styles.tinyPct, { color: titleColor }]}
                        numberOfLines={1}
                      >
                        {pct}%
                      </Text>
                    </View>
                  ) : (
                    <>
                      <View style={styles.tileTop}>
                        <Icon
                          name={data.icon}
                          size={isCompact ? 15 : 18}
                          color={useLightText ? "#ffffff" : accentHex}
                        />
                        <View style={[styles.pctPill, { backgroundColor: pillBg }]}>
                          <Text style={[styles.pctText, { color: pillTextColor }]}>
                            {pct}%
                          </Text>
                        </View>
                      </View>
                      <View style={{ gap: 1 }}>
                        <Text
                          style={[
                            styles.tileName,
                            {
                              color: subColor,
                              fontSize: isCompact ? 10.5 : 12,
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {data.label}
                        </Text>
                        <Text
                          style={[
                            styles.tileBal,
                            {
                              color: titleColor,
                              fontSize: isCompact ? 12 : 14.5,
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {hidden ? "••••" : money(data.amount, isCompact)}
                        </Text>
                      </View>
                    </>
                  )}
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      ) : (
        <View
          style={[
            styles.emptyCard,
            {
              overflow: "hidden",
              backgroundColor: theme.card,
              borderColor: hexToRgba(accentHex, 0.24),
              marginBottom: 0,
            },
          ]}
        >
          <LightLeatherSurface theme={theme} radius={20} />
          <Text style={[styles.emptySub, { color: theme.muted }]}>
            No {mode.toLowerCase()} categories recorded yet.
          </Text>
        </View>
      )}

      {categories.length > 0 ? (
        <View style={{ marginTop: 10, gap: 8 }}>
          <Pressable
            onPress={() => setShowAllCategories((prev) => !prev)}
            style={({ pressed }) => [
              styles.viewAllBtn,
              {
                overflow: "hidden",
                backgroundColor: theme.card,
                borderColor: hexToRgba(theme.leather.accent, 0.24),
                transform: [{ scale: pressed ? 0.985 : 1 }],
              },
              cardShadow(theme.dark),
            ]}
          >
            <LightLeatherSurface theme={theme} radius={14} />
            <Text style={[styles.viewAllText, { color: theme.ink }]}>
              {showAllCategories
                ? "Hide all categories"
                : `View all categories (${categories.length})`}
            </Text>
            <Icon
              name={showAllCategories ? "up" : "down"}
              size={14}
              color={theme.muted}
            />
          </Pressable>

          {showAllCategories ? (
            <View
              style={[
                styles.allCategoriesCard,
                {
                  overflow: "hidden",
                  backgroundColor: theme.card,
                  borderColor: hexToRgba(theme.leather.accent, 0.22),
                },
                cardShadow(theme.dark),
              ]}
            >
              <LightLeatherSurface theme={theme} radius={18} />
              {categories.map((cat, idx) => {
                const pct =
                  totalCategoryAmount > 0
                    ? Math.round((cat.amount / totalCategoryAmount) * 100)
                    : 0;
                const active = selectedCategory === cat.label;
                return (
                  <View key={cat.label}>
                    {idx > 0 ? (
                      <View
                        style={[
                          styles.allCatDivider,
                          {
                            backgroundColor: hexToRgba(
                              theme.leather.accent,
                              0.12
                            ),
                          },
                        ]}
                      />
                    ) : null}
                    <Pressable
                      onPress={() => onSelectCategory(cat.label)}
                      style={({ pressed }) => [
                        styles.allCatRow,
                        { opacity: pressed ? 0.75 : 1 },
                      ]}
                    >
                      <Icon
                        name={cat.icon}
                        size={16}
                        color={active ? theme.leather.accent : accentHex}
                      />
                      <Text
                        style={[styles.allCatName, { color: theme.ink }]}
                        numberOfLines={1}
                      >
                        {cat.label}
                      </Text>
                      <Text style={[styles.allCatPct, { color: theme.muted }]}>
                        {pct}%
                      </Text>
                      <Text style={[styles.allCatAmt, { color: theme.ink }]}>
                        {hidden ? "••••" : money(cat.amount)}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  title: {
    fontFamily: "Poppins_800ExtraBold",
    fontWeight: "800",
    fontSize: 16,
  },
  sub: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 11.5,
  },
  canvas: {
    position: "relative",
    width: "100%",
  },
  tileWrap: {
    position: "absolute",
    borderRadius: 18,
  },
  tilePress: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 11,
    overflow: "hidden",
    justifyContent: "space-between",
  },
  tileInnerStitch: {
    position: "absolute",
    top: 4,
    bottom: 4,
    left: 4,
    right: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  tileTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
  },
  pctPill: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 99,
  },
  pctText: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 10,
    includeFontPadding: false,
  },
  tileName: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    includeFontPadding: false,
  },
  tileBal: {
    fontFamily: "Poppins_800ExtraBold",
    fontWeight: "800",
    includeFontPadding: false,
  },
  tinyCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tinyPct: {
    fontFamily: "Poppins_800ExtraBold",
    fontWeight: "800",
    fontSize: 11,
    includeFontPadding: false,
  },
  zeroNote: {
    marginTop: 8,
    fontFamily: "Poppins_500Medium",
    fontWeight: "500",
    fontSize: 11,
    paddingHorizontal: 2,
  },
  emptyCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    gap: 4,
  },
  emptyTitle: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 14,
  },
  emptySub: {
    fontFamily: "Poppins_500Medium",
    fontWeight: "500",
    fontSize: 12,
  },
  modeTogglePill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    gap: 2,
  },
  modeToggleChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9,
  },
  modeToggleText: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 11,
    includeFontPadding: false,
  },
  viewAllBtn: {
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  viewAllText: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 12,
    includeFontPadding: false,
    marginTop: 1,
  },
  allCategoriesCard: {
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 4,
  },
  allCatDivider: {
    height: 1,
    marginHorizontal: 14,
  },
  allCatRow: {
    minHeight: 44,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  allCatName: {
    flex: 1,
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 13,
    includeFontPadding: false,
  },
  allCatPct: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 11.5,
    includeFontPadding: false,
  },
  allCatAmt: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 13,
    includeFontPadding: false,
  },
});
