import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Image as SvgImage } from "react-native-svg";
import { resolveWalletCardDesign } from "../data/walletPresets";
import { money, tonePalette, type Wallet } from "../types/wallet";
import { Icon } from "./Icon";
import { ScalePressable } from "../lib/motion";
import {
  cardShadow,
  DarkLeatherSurface,
  hexToRgba,
  LightLeatherSurface,
  SaffianoSheetSurface,
  type ThemeColors,
} from "./SharedUI";
import { WalletLogoBadge } from "./WalletFolder";

const ROW_HEIGHT = 60;
const ROW_GAP = 10;
const SLOT_HEIGHT = ROW_HEIGHT + ROW_GAP;

export const ReorderWalletsModal = React.memo(function ReorderWalletsModal({
  visible,
  wallets,
  hidden,
  title = "Reorder Home cards",
  subtitle,
  theme,
  onSaveOrder,
  onClose,
}: {
  visible: boolean;
  wallets: Wallet[];
  hidden: boolean;
  title?: string;
  subtitle?: string;
  theme: ThemeColors;
  onSaveOrder: (ordered: Wallet[]) => void;
  onClose: () => void;
}) {
  const [renderedVisible, setRenderedVisible] = useState(visible);
  const [draftWallets, setDraftWallets] = useState<Wallet[]>(wallets);
  const [listWidth, setListWidth] = useState(300);
  const [dragWalletId, setDragWalletId] = useState<number | null>(null);

  const sheetAnim = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const closingRef = useRef(false);
  const liftAnim = useRef(new Animated.Value(0)).current;
  const shiftMapRef = useRef<Map<number, Animated.Value>>(new Map());
  const dragIndexRef = useRef<number | null>(null);
  const dragWalletIdRef = useRef<number | null>(null);
  const hoverIndexRef = useRef<number | null>(null);
  const isDroppingRef = useRef(false);

  const draftRef = useRef(draftWallets);
  draftRef.current = draftWallets;

  const stableIdsRef = useRef<number[]>(wallets.map((w) => w.id));

  useEffect(() => {
    if (visible) {
      closingRef.current = false;
      setRenderedVisible(true);
      setDraftWallets(wallets);
      stableIdsRef.current = wallets.map((w) => w.id);
      setDragWalletId(null);
      dragIndexRef.current = null;
      dragWalletIdRef.current = null;
      hoverIndexRef.current = null;
      isDroppingRef.current = false;
      liftAnim.setValue(0);
      wallets.forEach((w, idx) => {
        getShiftAnim(w.id).setValue(idx * SLOT_HEIGHT);
      });
      sheetAnim.stopAnimation();
      sheetAnim.setValue(0);
      Animated.timing(sheetAnim, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else if (renderedVisible && !closingRef.current) {
      closingRef.current = true;
      sheetAnim.stopAnimation();
      Animated.timing(sheetAnim, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          closingRef.current = false;
          setRenderedVisible(false);
        }
      });
    }
  }, [visible, renderedVisible, wallets, liftAnim, sheetAnim]);

  const dismiss = useCallback(
    (after?: () => void) => {
      if (closingRef.current) return;
      closingRef.current = true;
      sheetAnim.stopAnimation();
      Animated.timing(sheetAnim, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        closingRef.current = false;
        if (finished) {
          setRenderedVisible(false);
          onClose();
          after?.();
        }
      });
    },
    [onClose, sheetAnim]
  );

  const getShiftAnim = (id: number) => {
    let anim = shiftMapRef.current.get(id);
    if (!anim) {
      anim = new Animated.Value(0);
      shiftMapRef.current.set(id, anim);
    }
    return anim;
  };

  useEffect(() => {
    if (!visible || dragWalletId !== null || isDroppingRef.current) return;
    draftWallets.forEach((w, idx) => {
      getShiftAnim(w.id).setValue(idx * SLOT_HEIGHT);
    });
  }, [visible, draftWallets, dragWalletId]);

  const panResponders = useMemo(() => {
    const map = new Map<number, ReturnType<typeof PanResponder.create>>();
    for (const w of draftWallets) {
      const walletId = w.id;
      const responder = PanResponder.create({
        onStartShouldSetPanResponder: () =>
          dragIndexRef.current === null && !isDroppingRef.current,
        onMoveShouldSetPanResponder: () =>
          dragIndexRef.current === null && !isDroppingRef.current,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          const list = draftRef.current;
          const idx = list.findIndex((item) => item.id === walletId);
          if (idx < 0) return;

          dragIndexRef.current = idx;
          dragWalletIdRef.current = walletId;
          hoverIndexRef.current = idx;
          setDragWalletId(walletId);

          Animated.spring(liftAnim, {
            toValue: 1,
            useNativeDriver: true,
            speed: 28,
            bounciness: 6,
          }).start();
        },
        onPanResponderMove: (_evt, gestureState) => {
          const fromIdx = dragIndexRef.current;
          const id = dragWalletIdRef.current;
          if (fromIdx === null || id === null) return;

          const list = draftRef.current;
          const maxTop = Math.max(0, (list.length - 1) * SLOT_HEIGHT);
          const clampedY = Math.max(
            0,
            Math.min(maxTop, fromIdx * SLOT_HEIGHT + gestureState.dy)
          );

          getShiftAnim(id).setValue(clampedY);

          const rawTarget = Math.round(clampedY / SLOT_HEIGHT);
          const clampedTarget = Math.max(0, Math.min(list.length - 1, rawTarget));

          if (clampedTarget !== hoverIndexRef.current) {
            hoverIndexRef.current = clampedTarget;
            list.forEach((item, idx) => {
              if (item.id === id) return;
              let newVisualIdx = idx;
              if (fromIdx < clampedTarget && idx > fromIdx && idx <= clampedTarget) {
                newVisualIdx = idx - 1;
              } else if (fromIdx > clampedTarget && idx >= clampedTarget && idx < fromIdx) {
                newVisualIdx = idx + 1;
              }
              Animated.timing(getShiftAnim(item.id), {
                toValue: newVisualIdx * SLOT_HEIGHT,
                duration: 180,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
              }).start();
            });
          }
        },
        onPanResponderRelease: () => {
          const fromIdx = dragIndexRef.current;
          const toIdx = hoverIndexRef.current;
          const id = dragWalletIdRef.current;
          if (fromIdx === null || toIdx === null || id === null) return;

          const list = draftRef.current;
          isDroppingRef.current = true;
          const finalOffset = toIdx * SLOT_HEIGHT;

          Animated.parallel([
            Animated.timing(getShiftAnim(id), {
              toValue: finalOffset,
              duration: 190,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(liftAnim, {
              toValue: 0,
              duration: 190,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ]).start(() => {
            isDroppingRef.current = false;
            dragIndexRef.current = null;
            dragWalletIdRef.current = null;
            hoverIndexRef.current = null;
            setDragWalletId(null);
            if (fromIdx !== toIdx) {
              const next = [...list];
              const [moved] = next.splice(fromIdx, 1);
              next.splice(toIdx, 0, moved);
              setDraftWallets(next);
            }
          });
        },
        onPanResponderTerminate: () => {
          const fromIdx = dragIndexRef.current;
          const id = dragWalletIdRef.current;
          if (fromIdx === null || id === null) return;
          isDroppingRef.current = true;
          const origOffset = fromIdx * SLOT_HEIGHT;

          Animated.parallel([
            Animated.timing(getShiftAnim(id), {
              toValue: origOffset,
              duration: 160,
              useNativeDriver: true,
            }),
            Animated.timing(liftAnim, {
              toValue: 0,
              duration: 160,
              useNativeDriver: true,
            }),
          ]).start(() => {
            isDroppingRef.current = false;
            dragIndexRef.current = null;
            dragWalletIdRef.current = null;
            hoverIndexRef.current = null;
            setDragWalletId(null);
          });
        },
      });
      map.set(walletId, responder);
    }
    return map;
  }, [draftWallets, liftAnim]);

  const listHeight = Math.max(0, draftWallets.length * SLOT_HEIGHT - ROW_GAP);
  const byId = useMemo(
    () => new Map(draftWallets.map((w) => [w.id, w])),
    [draftWallets]
  );
  const renderList = useMemo(
    () =>
      stableIdsRef.current
        .map((id) => byId.get(id))
        .filter((w): w is Wallet => Boolean(w)),
    [byId]
  );

  return (
    <Modal
      transparent
      visible={renderedVisible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => dismiss()}
    >
      <View style={styles.root}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: "rgba(8, 12, 20, 0.56)",
              opacity: sheetAnim,
            },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => dismiss()} />
        </Animated.View>
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: theme.page,
              borderColor: hexToRgba(theme.leather.accent, 0.24),
              transform: [
                {
                  translateY: sheetAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [540, 0],
                  }),
                },
              ],
            },
            cardShadow(theme.dark),
          ]}
        >
          <SaffianoSheetSurface theme={theme} radius={28} />
          <View
            style={[
              styles.handle,
              { backgroundColor: hexToRgba(theme.leather.accent, 0.26) },
            ]}
          />
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: theme.ink }]}>
                {title}
              </Text>
              <Text style={[styles.subtitle, { color: theme.muted }]}>
                {subtitle ??
                  (draftWallets.length > 6
                    ? "Drag handles to arrange · Top 6 show on Home"
                    : "Drag handles to change card order on Home")}
              </Text>
            </View>
          </View>

          <ScrollView
            scrollEnabled={dragWalletId === null}
            showsVerticalScrollIndicator={false}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
          >
            <View
              onLayout={(e) => {
                const w = Math.round(e.nativeEvent.layout.width);
                if (w > 0 && Math.abs(w - listWidth) > 1) setListWidth(w);
              }}
              style={{ height: listHeight, position: "relative" }}
            >
              {renderList.map((wallet) => {
                const idx = draftWallets.findIndex((w) => w.id === wallet.id);
                const pal = tonePalette[wallet.tone] || tonePalette.blue;
                const cardDesign = resolveWalletCardDesign(wallet.logoKey, wallet.name);
                const cardInk = cardDesign ? cardDesign.ink : pal.ink;
                const isLight = cardInk === "#ffffff";
                const isDragged = dragWalletId === wallet.id;
                const shiftAnim = getShiftAnim(wallet.id);
                const pan = panResponders.get(wallet.id);

                return (
                  <Animated.View
                    key={wallet.id}
                    renderToHardwareTextureAndroid
                    style={[
                      styles.rowWrap,
                      {
                        zIndex: isDragged ? 20 : 1,
                        elevation: isDragged ? 10 : 0,
                        transform: [
                          { translateY: shiftAnim },
                          {
                            scale: isDragged
                              ? liftAnim.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [1, 1.03],
                                })
                              : 1,
                          },
                        ],
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.rowCard,
                        {
                          backgroundColor: cardDesign
                            ? cardDesign.isDark
                              ? "#090e17"
                              : "#edf3ec"
                            : pal.to,
                          borderColor: isDragged
                            ? theme.leather.accent
                            : isLight
                              ? "rgba(255, 255, 255, 0.2)"
                              : "rgba(20, 32, 26, 0.14)",
                        },
                        cardShadow(theme.dark),
                      ]}
                    >
                      {cardDesign ? (
                        <>
                          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                            <Svg width={listWidth} height={ROW_HEIGHT}>
                              <SvgImage
                                href={cardDesign.source}
                                x={0}
                                y={0}
                                width={listWidth}
                                height={ROW_HEIGHT}
                                preserveAspectRatio="xMaxYMid slice"
                              />
                            </Svg>
                          </View>
                          <LinearGradient
                            pointerEvents="none"
                            colors={
                              cardDesign.isDark
                                ? ["rgba(8, 12, 20, 0.34)", "rgba(8, 12, 20, 0.44)"]
                                : ["rgba(244, 248, 243, 0.48)", "rgba(232, 238, 230, 0.56)"]
                            }
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

                      <View
                        style={[
                          styles.rankBadge,
                          {
                            backgroundColor: isLight
                              ? "rgba(8, 12, 20, 0.38)"
                              : "rgba(255, 255, 255, 0.65)",
                          },
                        ]}
                      >
                        <Text style={[styles.rankText, { color: cardInk }]}>
                          {idx + 1}
                        </Text>
                      </View>

                      <WalletLogoBadge
                        logoKey={wallet.logoKey}
                        name={wallet.name}
                        mark={wallet.mark}
                        size={26}
                      />

                      <View style={{ flex: 1, justifyContent: "center" }}>
                        <Text
                          style={[styles.rowName, { color: cardInk }]}
                          numberOfLines={1}
                        >
                          {wallet.name}
                        </Text>
                        <Text
                          style={[
                            styles.rowSub,
                            {
                              color: isLight
                                ? "rgba(255, 255, 255, 0.78)"
                                : "rgba(20, 32, 26, 0.68)",
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {wallet.type} · {hidden ? "••••" : money(wallet.balance)}
                        </Text>
                      </View>

                      <View
                        {...(pan ? pan.panHandlers : {})}
                        style={[
                          styles.gripBtn,
                          {
                            backgroundColor: isLight
                              ? "rgba(8, 12, 20, 0.36)"
                              : "rgba(255, 255, 255, 0.68)",
                          },
                        ]}
                      >
                        <Icon name="grip" size={16} color={cardInk} />
                      </View>
                    </View>
                  </Animated.View>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <ScalePressable
              onPress={() => dismiss()}
              scaleTo={0.965}
              style={[
                styles.footerBtn,
                {
                  overflow: "hidden",
                  backgroundColor: theme.card,
                  borderColor: hexToRgba(theme.leather.accent, 0.26),
                },
              ]}
            >
              <LightLeatherSurface theme={theme} radius={16} />
              <Text style={[styles.cancelText, { color: theme.ink }]}>
                Cancel
              </Text>
            </ScalePressable>
            <ScalePressable
              onPress={() => dismiss(() => onSaveOrder(draftWallets))}
              scaleTo={0.965}
              style={[
                styles.footerBtn,
                {
                  overflow: "hidden",
                  backgroundColor: theme.leather.colors[1],
                  borderColor: theme.leather.edge,
                },
                cardShadow(theme.dark),
              ]}
            >
              <DarkLeatherSurface theme={theme} radius={16} />
              <Text style={styles.saveText}>Save order</Text>
            </ScalePressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  card: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
    maxHeight: "82%",
    overflow: "hidden",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 99,
    alignSelf: "center",
    marginBottom: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  title: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 19,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: "Poppins_500Medium",
    fontWeight: "500",
    fontSize: 12,
    marginTop: 2,
  },
  scroll: {
    maxHeight: 420,
    marginHorizontal: -10,
  },
  scrollContent: {
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  rowWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
  },
  rowCard: {
    height: ROW_HEIGHT,
    borderRadius: 17,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    overflow: "hidden",
  },
  rankBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 11,
    lineHeight: 14,
    includeFontPadding: false,
    marginTop: 1,
  },
  rowName: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 13.5,
    lineHeight: 17,
    includeFontPadding: false,
    marginTop: 1,
  },
  rowSub: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 11,
    lineHeight: 14,
    includeFontPadding: false,
    marginTop: 1.5,
  },
  gripBtn: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  footerBtn: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 14,
    lineHeight: 18,
    includeFontPadding: false,
    marginTop: 1,
  },
  saveText: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 14,
    lineHeight: 18,
    includeFontPadding: false,
    marginTop: 1,
    color: "#ffffff",
  },
});
