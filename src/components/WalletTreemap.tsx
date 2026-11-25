import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Image as SvgImage } from "react-native-svg";
import { resolveWalletCardDesign } from "../data/walletPresets";
import { money, tonePalette, Wallet } from "../types/wallet";
import { cardShadow, hexToRgba, LightLeatherSurface, ThemeColors } from "./SharedUI";
import { WalletLogoBadge } from "./WalletFolder";

export type TreemapTileLayout = {
  wallet: Wallet;
  pct: number;
  x: number;
  y: number;
  w: number;
  h: number;
};

type WeightedItem = {
  wallet: Wallet;
  pct: number;
  area: number;
};

/**
 * Computes a Bruls-Huizing-van Wijk squarified treemap layout so every
 * tile's area is strictly proportional to its share of the total balance.
 */
export function computeSquarifiedTreemap(
  wallets: Wallet[],
  width: number,
  height: number,
  gap = 7
): TreemapTileLayout[] {
  const positive = wallets
    .filter((w) => w.balance > 0)
    .sort((a, b) => b.balance - a.balance);
  if (!positive.length || width <= 0 || height <= 0) return [];

  const totalBalance = positive.reduce((sum, w) => sum + w.balance, 0);
  if (totalBalance <= 0) return [];

  const totalArea = width * height;
  const items: WeightedItem[] = positive.map((wallet) => ({
    wallet,
    pct: Math.round((wallet.balance / totalBalance) * 100),
    area: (wallet.balance / totalBalance) * totalArea,
  }));

  const rawRects: { item: WeightedItem; x: number; y: number; w: number; h: number }[] = [];

  const worstRatio = (row: WeightedItem[], side: number): number => {
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
    row: WeightedItem[],
    rx: number,
    ry: number,
    rw: number,
    rh: number
  ): { nx: number; ny: number; nw: number; nh: number } => {
    const rowSum = row.reduce((s, r) => s + r.area, 0);
    if (rw >= rh) {
      // Vertical strip along the left edge
      const stripW = rh > 0 ? rowSum / rh : 0;
      let cy = ry;
      for (const item of row) {
        const itemH = stripW > 0 ? item.area / stripW : 0;
        rawRects.push({ item, x: rx, y: cy, w: stripW, h: itemH });
        cy += itemH;
      }
      return { nx: rx + stripW, ny: ry, nw: Math.max(0, rw - stripW), nh: rh };
    }
    // Horizontal strip along the top edge
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
  let currentRow: WeightedItem[] = [];

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
      wallet: item.wallet,
      pct: item.pct,
      x: left,
      y: top,
      w: Math.max(0, right - left),
      h: Math.max(0, bottom - top),
    };
  });
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
});
