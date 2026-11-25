import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  DEFAULT_HOME_SECTIONS,
  HOME_SECTION_META,
  type HomeSectionConfig,
  type HomeSectionId,
} from "../types/homeLayout";
import { ScalePressable } from "../lib/motion";
import { Icon } from "./Icon";
import {
  cardShadow,
  DarkLeatherSurface,
  hexToRgba,
  LightLeatherSurface,
  SaffianoSheetSurface,
  type ThemeColors,
} from "./SharedUI";

const ROW_HEIGHT = 64;
const ROW_GAP = 10;
const SLOT_HEIGHT = ROW_HEIGHT + ROW_GAP;

export const CustomizeHomeModal = React.memo(function CustomizeHomeModal({
  visible,
  sections,
  theme,
  onSave,
  onClose,
}: {
  visible: boolean;
  sections: HomeSectionConfig[];
  theme: ThemeColors;
  onSave: (next: HomeSectionConfig[]) => void;
  onClose: () => void;
}) {
  const [renderedVisible, setRenderedVisible] = useState(visible);
  const [draft, setDraft] = useState<HomeSectionConfig[]>(sections);
  const [dragId, setDragId] = useState<HomeSectionId | null>(null);

  const sheetAnim = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const closingRef = useRef(false);
  const liftAnim = useRef(new Animated.Value(0)).current;
  const shiftMapRef = useRef<Map<HomeSectionId, Animated.Value>>(new Map());
  const dragIndexRef = useRef<number | null>(null);
  const dragIdRef = useRef<HomeSectionId | null>(null);
  const hoverIndexRef = useRef<number | null>(null);
  const isDroppingRef = useRef(false);

  const draftRef = useRef(draft);
  draftRef.current = draft;

  const stableIdsRef = useRef<HomeSectionId[]>(sections.map((s) => s.id));

  const getShiftAnim = (id: HomeSectionId) => {
    let anim = shiftMapRef.current.get(id);
    if (!anim) {
      anim = new Animated.Value(0);
      shiftMapRef.current.set(id, anim);
    }
    return anim;
  };

  useEffect(() => {
    if (visible) {
      closingRef.current = false;
      setRenderedVisible(true);
      const nextDraft = sections.map((s) => ({ ...s }));
      setDraft(nextDraft);
      stableIdsRef.current = nextDraft.map((s) => s.id);
      setDragId(null);
      dragIndexRef.current = null;
      dragIdRef.current = null;
      hoverIndexRef.current = null;
      isDroppingRef.current = false;
      liftAnim.setValue(0);
      nextDraft.forEach((s, idx) => {
        getShiftAnim(s.id).setValue(idx * SLOT_HEIGHT);
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
  }, [visible, renderedVisible, sections, liftAnim, sheetAnim]);

  useEffect(() => {
    if (!visible || dragId !== null || isDroppingRef.current) return;
    draft.forEach((s, idx) => {
      getShiftAnim(s.id).setValue(idx * SLOT_HEIGHT);
    });
  }, [visible, draft, dragId]);

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

  const panResponders = useMemo(() => {
    const map = new Map<HomeSectionId, ReturnType<typeof PanResponder.create>>();
    for (const s of draft) {
      const sectionId = s.id;
      const responder = PanResponder.create({
        onStartShouldSetPanResponder: () =>
          dragIndexRef.current === null && !isDroppingRef.current,
        onMoveShouldSetPanResponder: () =>
          dragIndexRef.current === null && !isDroppingRef.current,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          const list = draftRef.current;
          const idx = list.findIndex((item) => item.id === sectionId);
          if (idx < 0) return;

          dragIndexRef.current = idx;
          dragIdRef.current = sectionId;
          hoverIndexRef.current = idx;
          setDragId(sectionId);

          Animated.spring(liftAnim, {
            toValue: 1,
            useNativeDriver: true,
            speed: 28,
            bounciness: 6,
          }).start();
        },
        onPanResponderMove: (_evt, gestureState) => {
          const fromIdx = dragIndexRef.current;
          const id = dragIdRef.current;
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
          const id = dragIdRef.current;
          if (fromIdx === null || toIdx === null || id === null) return;

          const list = draftRef.current;
          isDroppingRef.current = true;

          Animated.parallel([
            Animated.timing(getShiftAnim(id), {
              toValue: toIdx * SLOT_HEIGHT,
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
            dragIdRef.current = null;
            hoverIndexRef.current = null;
            setDragId(null);
            if (fromIdx !== toIdx) {
              const next = [...list];
              const [moved] = next.splice(fromIdx, 1);
              next.splice(toIdx, 0, moved);
              setDraft(next);
            }
          });
        },
        onPanResponderTerminate: () => {
          const fromIdx = dragIndexRef.current;
          const id = dragIdRef.current;
          if (fromIdx === null || id === null) return;
          isDroppingRef.current = true;
          Animated.parallel([
            Animated.timing(getShiftAnim(id), {
              toValue: fromIdx * SLOT_HEIGHT,
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
            dragIdRef.current = null;
            hoverIndexRef.current = null;
            setDragId(null);
          });
        },
      });
      map.set(sectionId, responder);
    }
    return map;
  }, [draft, liftAnim]);

  const toggleVisible = useCallback((id: HomeSectionId) => {
    setDraft((prev) =>
      prev.map((s) => (s.id === id ? { ...s, visible: !s.visible } : s))
    );
  }, []);

  const handleReset = useCallback(() => {
    const reset = DEFAULT_HOME_SECTIONS.map((s) => ({ ...s }));
    setDraft(reset);
    reset.forEach((s, idx) => {
      Animated.timing(getShiftAnim(s.id), {
        toValue: idx * SLOT_HEIGHT,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
  }, []);

  const byId = useMemo(
    () => new Map(draft.map((s) => [s.id, s])),
    [draft]
  );
  const renderList = useMemo(
    () =>
      stableIdsRef.current
        .map((id) => byId.get(id))
        .filter((s): s is HomeSectionConfig => Boolean(s)),
    [byId]
  );

  const listHeight = Math.max(0, draft.length * SLOT_HEIGHT - ROW_GAP);

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
                Customize Home
              </Text>
              <Text style={[styles.subtitle, { color: theme.muted }]}>
                Drag handles to reorder · Tap eye to hide or show
              </Text>
            </View>
            <Pressable
              onPress={handleReset}
              hitSlop={8}
              style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}
            >
              <Text style={[styles.resetText, { color: theme.leather.accent }]}>
                Reset
              </Text>
            </Pressable>
          </View>

          <View style={{ height: listHeight, position: "relative", marginVertical: 4 }}>
            {renderList.map((item) => {
              const meta = HOME_SECTION_META[item.id];
              const isDragged = dragId === item.id;
              const shiftAnim = getShiftAnim(item.id);
              const pan = panResponders.get(item.id);

              return (
                <Animated.View
                  key={item.id}
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
                        overflow: "hidden",
                        backgroundColor: theme.card,
                        borderColor: isDragged
                          ? theme.leather.accent
                          : hexToRgba(theme.leather.accent, 0.24),
                        opacity: item.visible ? 1 : 0.62,
                      },
                      cardShadow(theme.dark),
                    ]}
                  >
                    <LightLeatherSurface theme={theme} radius={16} />
                    <View
                      style={[
                        styles.iconBox,
                        {
                          backgroundColor: hexToRgba(
                            theme.leather.accent,
                            theme.dark ? 0.2 : 0.12
                          ),
                        },
                      ]}
                    >
                      <Icon
                        name={meta.icon}
                        size={16}
                        color={theme.leather.accent}
                      />
                    </View>

                    <View style={{ flex: 1, justifyContent: "center" }}>
                      <Text
                        style={[styles.rowName, { color: theme.ink }]}
                        numberOfLines={1}
                      >
                        {meta.label}
                      </Text>
                      <Text
                        style={[styles.rowSub, { color: theme.muted }]}
                        numberOfLines={1}
                      >
                        {meta.description}
                      </Text>
                    </View>

                    <Pressable
                      onPress={() => toggleVisible(item.id)}
                      hitSlop={6}
                      accessibilityRole="switch"
                      accessibilityState={{ checked: item.visible }}
                      accessibilityLabel={`${item.visible ? "Hide" : "Show"} ${meta.label}`}
                      style={({ pressed }) => [
                        styles.eyeBtn,
                        {
                          backgroundColor: hexToRgba(
                            theme.leather.accent,
                            item.visible
                              ? theme.dark
                                ? 0.22
                                : 0.12
                              : 0.06
                          ),
                          transform: [{ scale: pressed ? 0.92 : 1 }],
                        },
                      ]}
                    >
                      <Icon
                        name={item.visible ? "eye" : "eye-off"}
                        size={16}
                        color={item.visible ? theme.leather.accent : theme.muted}
                      />
                    </Pressable>

                    <View
                      {...(pan ? pan.panHandlers : {})}
                      style={[
                        styles.gripBtn,
                        {
                          backgroundColor: hexToRgba(
                            theme.leather.accent,
                            theme.dark ? 0.16 : 0.08
                          ),
                        },
                      ]}
                    >
                      <Icon name="grip" size={16} color={theme.ink} />
                    </View>
                  </View>
                </Animated.View>
              );
            })}
          </View>

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
              onPress={() => dismiss(() => onSave(draft))}
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
              <Text style={styles.saveText}>Save layout</Text>
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
    gap: 10,
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
  resetText: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 12.5,
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
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
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
    fontFamily: "Poppins_500Medium",
    fontWeight: "500",
    fontSize: 11,
    lineHeight: 14,
    includeFontPadding: false,
    marginTop: 1.5,
  },
  eyeBtn: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
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
