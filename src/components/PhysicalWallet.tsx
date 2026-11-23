import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient as CardGradient } from "expo-linear-gradient";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Image as SvgImage,
  Path,
  Pattern,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";
import { resolveWalletCardDesign } from "../data/walletPresets";
import { money, tonePalette, type Wallet } from "../types/wallet";
import { Icon } from "./Icon";
import type { ThemeColors } from "./SharedUI";
import { Amount, WalletLogoBadge } from "./WalletFolder";

const WIDTH = 350;
const HEIGHT = 410;
const HINGE_Y = 153;
const POCKET_Y = 245;
const BOTTOM_Y = 403;
const CARD_HEIGHT = 166;
const CARD_STEP = 32;
const STOWED_Y = 210;
const TARGET_Y = 7;
const VISIBLE_CARDS = 6;

const leather = {
  shell: {
    height: 250,
    outline: "M1 1H349V223Q349 249 323 249H27Q1 249 1 223Z",
    seam: "M8 2V223Q8 242 27 242H323Q342 242 342 223V2",
  },
  flap: {
    height: 143,
    outline:
      "M1 1H349V98Q349 119 326 119H234C210 119 201 141 175 141C149 141 140 119 116 119H24Q1 119 1 98Z",
    seam: "M8 5V97Q8 112 25 112H116C142 112 151 134 175 134C199 134 208 112 234 112H325Q342 112 342 97V5",
    inner:
      "M13 5V96Q13 107 26 107H116C144 107 153 129 175 129C197 129 206 107 234 107H324Q337 107 337 96V5",
  },
  pocket: {
    height: 158,
    outline:
      "M1 26Q1 2 25 2C48 2 54 15 78 15H272C296 15 302 2 325 2Q349 2 349 26V131Q349 157 323 157H27Q1 157 1 131Z",
    seam: "M8 26Q8 9 26 9C48 9 55 22 78 22H272C295 22 302 9 324 9Q342 9 342 26V130Q342 150 322 150H28Q8 150 8 130Z",
    inner:
      "M13 27Q13 14 27 14C48 14 55 27 78 27H272C295 27 302 14 323 14Q337 14 337 27V129Q337 145 321 145H29Q13 145 13 129Z",
  },
};

const LeatherPanel = React.memo(function LeatherPanel({
  part,
  lining = false,
}: {
  part: keyof typeof leather;
  lining?: boolean;
}) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const surface = leather[part];
  const light = "walletLight" + id;
  const grain = "walletGrain" + id;
  const fastener = "walletStud" + id;

  return (
    <Svg
      width="100%"
      height="100%"
      viewBox={"0 0 350 " + surface.height}
      preserveAspectRatio="none"
    >
      <Defs>
        <LinearGradient id={light} x1="10%" y1="0%" x2="90%" y2="100%">
          <Stop offset="0" stopColor={lining ? "#4a6176" : "#486077"} />
          <Stop offset=".42" stopColor={lining ? "#293f53" : "#243b50"} />
          <Stop offset="1" stopColor={lining ? "#1a2d3d" : "#142638"} />
        </LinearGradient>
        <Pattern id={grain} width={6} height={6} patternUnits="userSpaceOnUse">
          <Path
            d="M1 1l1.4 .5m2 3l1 .6M1 5l.6 -.3"
            stroke="#071522"
            strokeWidth=".7"
            opacity=".45"
          />
          <Path
            d="M2 2l1 .5m-2 3l1 .4M4 2l.9 -.3"
            stroke="#a2b0bd"
            strokeWidth=".65"
            opacity=".26"
          />
        </Pattern>
        {part === "flap" && (
          <LinearGradient id={fastener} x1="0%" y1="0%" x2="80%" y2="100%">
            <Stop offset="0" stopColor="#e1e4e3" />
            <Stop offset=".45" stopColor="#949c9f" />
            <Stop offset="1" stopColor="#333c42" />
          </LinearGradient>
        )}
      </Defs>
      <Path
        d={surface.outline}
        fill={"url(#" + light + ")"}
        stroke="#132536"
        strokeWidth="1.5"
      />
      <Path d={surface.outline} fill={"url(#" + grain + ")"} />
      <Path
        d={surface.seam}
        fill="none"
        stroke="#a2b0bd"
        strokeWidth="1.05"
        strokeDasharray="3.5 3"
        strokeLinecap="round"
        opacity=".82"
      />
      {"inner" in surface && (
        <Path
          d={surface.inner}
          fill="none"
          stroke="#a2b0bd"
          strokeWidth=".8"
          strokeDasharray="3.5 3"
          strokeLinecap="round"
          opacity=".43"
        />
      )}
      {part === "flap" && (
        <>
          <Circle
            cx="175"
            cy="121"
            r="9"
            fill={lining ? "#14212b" : "url(#" + fastener + ")"}
            stroke="#071522"
          />
          {lining && (
            <Circle
              cx="175"
              cy="121"
              r="5.5"
              fill="none"
              stroke="#a2b0bd"
              opacity=".5"
            />
          )}
        </>
      )}
    </Svg>
  );
});

const AccountCard = React.memo(function AccountCard({
  wallet,
  hidden,
  lifted,
  disabled,
  tabHeight,
  cardHeight,
  focused = false,
  onPress,
}: {
  wallet: Wallet;
  hidden: boolean;
  lifted: boolean;
  disabled: boolean;
  tabHeight: number;
  cardHeight: number;
  focused?: boolean;
  onPress: () => void;
}) {
  const fadeId = "balanceFade" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const palette = tonePalette[wallet.tone] || tonePalette.blue;
  const design = resolveWalletCardDesign(wallet.logoKey, wallet.name);
  const ink = design?.ink ?? palette.ink;
  const balance = hidden ? "Balance hidden" : money(wallet.balance);

  return (
    <>
      <View
        pointerEvents="none"
        style={[styles.cardFace, { backgroundColor: palette.to }]}
      >
        {design ? (
          <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
            <SvgImage href={design.source} width="100%" height="100%" preserveAspectRatio="xMaxYMid slice" />
          </Svg>
        ) : (
          <>
            <CardGradient
              style={StyleSheet.absoluteFill}
              colors={["#ffffff25", "#ffffff00", "#00000015"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <View style={styles.cardWatermark} />
          </>
        )}
        <Svg pointerEvents="none" width="100%" height={tabHeight * 2} style={styles.cardAmountFade}>
          <Defs>
            <RadialGradient id={fadeId} cx="100%" cy="0%" rx="58%" ry="100%">
              <Stop offset="0" stopColor={ink === "#ffffff" ? "#000000" : "#ffffff"} stopOpacity="0.62" />
              <Stop offset="1" stopColor={ink === "#ffffff" ? "#000000" : "#ffffff"} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${fadeId})`} />
        </Svg>
        <View style={[styles.cardRow, { height: tabHeight }]}>
          <WalletLogoBadge
            logoKey={wallet.logoKey}
            name={wallet.name}
            mark={wallet.mark}
            size={19}
            radius={5}
            ink={ink}
          />
          <Text
            style={[styles.cardName, { color: ink }]}
            numberOfLines={1}
          >
            {wallet.name}
          </Text>
          <Text style={[styles.cardBalance, { color: ink }]} numberOfLines={1} adjustsFontSizeToFit>
            {hidden ? "₱ ••••••" : balance}
          </Text>
        </View>
        {lifted && (
          <>
            <View style={styles.cardBody}>
              <Text
                style={[styles.cardType, { color: ink }]}
                numberOfLines={1}
              >
                {wallet.type}
              </Text>
              <Amount
                value={wallet.balance}
                hidden={hidden}
                size="md"
                color={ink}
              />
            </View>
            <View style={styles.cardFooter}>
              <Text
                style={[
                  styles.cardType,
                  styles.cardLabel,
                  { color: ink },
                ]}
                numberOfLines={1}
              >
                {wallet.account || "Personal wallet"}
              </Text>
              {!focused && <Text style={[styles.cardType, { color: ink }]}>PHP</Text>}
            </View>
          </>
        )}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={wallet.name + ", " + balance}
        accessibilityHint={
          lifted
            ? "Returns this card to the pocket"
            : "Pulls this card out of the pocket"
        }
        accessibilityState={{ selected: lifted, disabled }}
        disabled={disabled}
        onPress={onPress}
        style={[styles.cardTouch, focused ? { bottom: 0 } : { height: lifted ? cardHeight : tabHeight }]}
      />
    </>
  );
});

export const PhysicalWallet = React.memo(function PhysicalWallet({
  shouldOpen,
  wallets,
  total,
  hidden,
  monthlySummary,
  theme,
  onWallet,
  onOpenAdd,
  onOpenMenu,
  onFrontChange,
  onStackDragChange,
}: {
  shouldOpen: boolean;
  wallets: Wallet[];
  total: number;
  hidden: boolean;
  monthlySummary: { monthLabel: string; earned: number; spent: number };
  theme: ThemeColors;
  onWallet: (wallet: Wallet) => void;
  onOpenAdd: () => void;
  onOpenMenu: (wallet: Wallet) => void;
  onFrontChange: (index: number) => void;
  onStackDragChange?: (dragging: boolean) => void;
}) {
  const [scale, setScale] = useState(1);
  const [open, setOpen] = useState(true);
  const [busy, setBusy] = useState(false);
  const [activeId, setActiveId] = useState<Wallet["id"] | null>(null);
  const [liftedId, setLiftedId] = useState<Wallet["id"] | null>(null);
  const stow = useRef(new Animated.Value(0)).current;
  const flap = useRef(new Animated.Value(1)).current;
  const lift = useRef(new Animated.Value(0)).current;
  const compact = useRef(new Animated.Value(0)).current;
  const running = useRef<Animated.CompositeAnimation | null>(null);
  const moving = useRef(false);
  const mounted = useRef(false);
  const reduceMotion = useRef(false);
  const dragging = useRef(false);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    mounted.current = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted.current) reduceMotion.current = enabled;
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (enabled) => {
        reduceMotion.current = enabled;
      },
    );
    return () => {
      mounted.current = false;
      running.current?.stop();
      subscription.remove();
    };
  }, []);

  useEffect(
    () => () => {
      if (dragging.current) onStackDragChange?.(false);
    },
    [onStackDragChange],
  );

  const activeIndex = wallets.findIndex((wallet) => wallet.id === activeId);
  const liftedWallet = open
    ? wallets.find((wallet) => wallet.id === liftedId)
    : undefined;
  const pageStart = Math.min(
    Math.floor(Math.max(activeIndex, 0) / VISIBLE_CARDS) * VISIBLE_CARDS,
    Math.max(wallets.length - VISIBLE_CARDS, 0),
  );
  const page = wallets.slice(pageStart, pageStart + VISIBLE_CARDS);

  useEffect(() => {
    onFrontChange(Math.max(activeIndex, 0));
  }, [activeIndex, onFrontChange]);

  const play = useCallback(
    (value: Animated.Value, toValue: number, duration: number) => {
      if (reduceMotion.current) {
        value.setValue(toValue);
        if (value === flap) compact.setValue(1 - toValue);
        return Promise.resolve(true);
      }
      return new Promise<boolean>((resolve) => {
        const motion = Animated.timing(value, {
          toValue,
          duration,
          easing: value === lift ? (toValue === 1 ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic)) : Easing.inOut(Easing.cubic),
          useNativeDriver: Platform.OS !== "web",
        });
        const animation = value === flap
          ? Animated.parallel([
              motion,
              Animated.timing(compact, {
                toValue: 1 - toValue,
                duration,
                easing: Easing.inOut(Easing.cubic),
                useNativeDriver: false,
              }),
            ])
          : motion;
        running.current = animation;
        animation.start(({ finished }) => {
          running.current = null;
          resolve(finished);
        });
      });
    },
    [compact, flap, lift],
  );

  const move = useCallback(async (action: () => Promise<void>) => {
    if (moving.current) return;
    moving.current = true;
    setBusy(true);
    try {
      await action();
    } finally {
      moving.current = false;
      if (mounted.current) setBusy(false);
    }
  }, []);

  const pull = useCallback(
    (wallet: Wallet) => {
      if (!open) return;
      void move(async () => {
        if (liftedId !== null && !(await play(lift, 0, 260))) return;
        if (liftedId === wallet.id) {
          setLiftedId(null);
          return;
        }
        setActiveId(wallet.id);
        setLiftedId(wallet.id);
        await play(lift, 1, 400);
      });
    },
    [lift, liftedId, move, open, play],
  );

  const toggle = useCallback(() => {
    void move(async () => {
      if (open) {
        if (liftedId !== null && !(await play(lift, 0, 260))) return;
        setLiftedId(null);
        if (!(await play(stow, 1, 500))) return;
        if (!(await play(flap, 0, 440))) return;
      } else {
        if (!(await play(flap, 1, 440))) return;
        if (!(await play(stow, 0, 500))) return;
      }
      setOpen(!open);
    });
  }, [flap, lift, liftedId, move, open, play, stow]);

  useEffect(() => {
    if (!busy && open !== shouldOpen) toggle();
  }, [busy, open, shouldOpen, toggle]);

  const cycle = useCallback(
    (direction: number) => {
      if (!wallets.length) return;
      const current = activeIndex < 0 && direction < 0 ? 0 : activeIndex;
      const index = (current + direction + wallets.length) % wallets.length;
      pull(wallets[index]);
    },
    [activeIndex, pull, wallets],
  );

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponderCapture: ({ nativeEvent }) => {
          swipeStart.current = { x: nativeEvent.pageX, y: nativeEvent.pageY };
          return false;
        },
        onMoveShouldSetPanResponderCapture: (_, gesture) =>
          open &&
          !moving.current &&
          wallets.length > 1 &&
          gesture.numberActiveTouches === 1 &&
          Math.abs(gesture.dx) > 16 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.3,
        onPanResponderGrant: () => {
          dragging.current = true;
          onStackDragChange?.(true);
        },
        onPanResponderRelease: ({ nativeEvent }, gesture) => {
          const start = swipeStart.current;
          swipeStart.current = null;
          dragging.current = false;
          onStackDragChange?.(false);
          // PanResponder resets its deltas when it takes over from the card.
          const dx = start ? nativeEvent.pageX - start.x : gesture.dx;
          const dy = start ? nativeEvent.pageY - start.y : gesture.dy;
          if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy)) {
            cycle(dx < 0 ? 1 : -1);
          }
        },
        onPanResponderTerminate: () => {
          swipeStart.current = null;
          dragging.current = false;
          onStackDragChange?.(false);
        },
      }),
    [cycle, onStackDragChange, open, wallets.length],
  );

  const flapHeight = leather.flap.height * scale;
  // Put the hinge at the native rotation center so perspective cannot shift the fold.
  const flapMotion = {
    top: HINGE_Y * scale - flapHeight,
    height: 2 * flapHeight,
    transform: [
      { perspective: 1000 },
      {
        rotateX: flap.interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", "178deg"],
        }),
      },
    ],
  };

  return (
    <View style={styles.wallet}>
      <Animated.View style={{ height: compact.interpolate({ inputRange: [0, 1], outputRange: [HEIGHT * scale, (HEIGHT - HINGE_Y) * scale] }) }}>
      <Animated.View
        onLayout={(event) => {
          const width = event.nativeEvent.layout.width;
          if (width > 0) setScale(width / WIDTH);
        }}
        style={[styles.stage, { height: HEIGHT * scale, marginTop: compact.interpolate({ inputRange: [0, 1], outputRange: [0, -HINGE_Y * scale] }) }]}
        {...pan.panHandlers}
      >
        <View
          pointerEvents="none"
          style={[
            styles.shell,
            { top: HINGE_Y * scale, height: leather.shell.height * scale },
          ]}
        >
          <LeatherPanel part="shell" />
        </View>

        <Animated.View
          pointerEvents="none"
          style={[
            styles.flap,
            flapMotion,
            {
              zIndex: 2,
              opacity: flap.interpolate({
                inputRange: [0, 0.499, 0.5, 1],
                outputRange: [0, 0, 1, 1],
              }),
            },
          ]}
        >
          <View style={styles.flapFace}>
            <LeatherPanel part="flap" lining />
          </View>
        </Animated.View>

        <CardGradient
          pointerEvents="none"
          colors={["#2b4054", "#203449", "#293e53"]}
          style={[styles.hinge, { top: (HINGE_Y - 2) * scale, height: 6 * scale }]}
        />

        <View
          pointerEvents={open && !busy ? "box-none" : "none"}
          accessibilityElementsHidden={!open}
          importantForAccessibility={open ? "auto" : "no-hide-descendants"}
          style={[styles.bay, { height: BOTTOM_Y * scale }]}
        >
          {page.map((wallet, slot) => {
            const restY = (200 - (page.length - 1 - slot) * CARD_STEP) * scale;
            const lifted = wallet.id === liftedId;
            const delay = slot * 0.04;
            const translateY = lifted
              ? lift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [restY, TARGET_Y * scale],
                })
              : stow.interpolate({
                  inputRange: [delay, delay + 0.8],
                  outputRange: [restY, STOWED_Y * scale],
                  extrapolate: "clamp",
                });
            return (
              <Animated.View
                key={`${wallet.id}-${scale}`}
                pointerEvents="box-none"
                style={[
                  styles.card,
                  {
                    height: CARD_HEIGHT * scale,
                    opacity: lifted ? 0 : 1,
                    transform: [{ translateY }],
                    zIndex: lifted ? VISIBLE_CARDS + 1 : slot + 1,
                  },
                ]}
              >
                <AccountCard
                  wallet={wallet}
                  hidden={hidden}
                  lifted={lifted}
                  disabled={busy}
                  tabHeight={CARD_STEP * scale}
                  cardHeight={CARD_HEIGHT * scale}
                  onPress={() => pull(wallet)}
                />
              </Animated.View>
            );
          })}
        </View>

        <View
          pointerEvents="none"
          style={[
            styles.pocket,
            { top: POCKET_Y * scale, height: leather.pocket.height * scale },
          ]}
        >
          <LeatherPanel part="pocket" />
        </View>

        <Animated.View
          pointerEvents="none"
          renderToHardwareTextureAndroid
          style={[styles.closedSummary, {
            top: (HINGE_Y + leather.flap.height) * scale,
            height: (BOTTOM_Y - HINGE_Y - leather.flap.height) * scale,
          }]}
        >
          <Text style={styles.pocketLabel}>Available funds</Text>
          <Amount value={total} hidden={hidden} size="md" color="#f0f1eb" />
          <Text style={styles.pocketCount}>{wallets.length} {wallets.length === 1 ? "card" : "cards"} in your wallet</Text>
          <View style={styles.monthlyFlow}>
            <View style={styles.monthlyItem}>
              <Text style={styles.monthlyLabel}>{monthlySummary.monthLabel} in</Text>
              <Text style={styles.monthlyValue} numberOfLines={1} adjustsFontSizeToFit>{hidden ? "••••" : money(monthlySummary.earned)}</Text>
            </View>
            <View style={styles.monthlyDivider} />
            <View style={styles.monthlyItem}>
              <Text style={styles.monthlyLabel}>{monthlySummary.monthLabel} out</Text>
              <Text style={styles.monthlyValue} numberOfLines={1} adjustsFontSizeToFit>{hidden ? "••••" : money(monthlySummary.spent)}</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[
            styles.flap,
            flapMotion,
            {
              zIndex: 7,
              opacity: flap.interpolate({
                inputRange: [0, 0.499, 0.5, 1],
                outputRange: [1, 1, 0, 0],
              }),
            },
          ]}
        >
          <View style={styles.flapFace}>
            <LeatherPanel part="flap" />
            <View pointerEvents="none" style={styles.flapText}>
              <Icon name="lock" size={14} color="#e3e9e9" />
              <Text style={styles.flapLabel}>Scroll up to open</Text>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
      </Animated.View>

      {!wallets.length && (
      <View style={styles.controls}>
          <Pressable
            accessibilityRole="button"
            onPress={onOpenAdd}
            style={[
              styles.control,
              { borderColor: theme.line, borderWidth: 1 },
            ]}
          >
            <Text style={[styles.controlText, { color: theme.ink }]}>
              Add wallet
            </Text>
          </Pressable>
      </View>
      )}

      <Modal transparent visible={!!liftedWallet} animationType="none" statusBarTranslucent onRequestClose={() => liftedWallet && pull(liftedWallet)}>
        {liftedWallet && (
          <View style={styles.focusOverlay} accessibilityViewIsModal>
            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "#000000", opacity: lift.interpolate({ inputRange: [0, 1], outputRange: [0, 0.7] }) }]} />
            <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Close selected card" onPress={() => pull(liftedWallet)} />
            <Animated.View style={[styles.focusCard, { opacity: lift, transform: [{ translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [65, 0] }) }, { scale: lift.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }]}>
              <AccountCard wallet={liftedWallet} hidden={hidden} lifted focused disabled={busy} tabHeight={38} cardHeight={190} onPress={() => { const wallet = liftedWallet; void move(async () => { if (await play(lift, 0, 260)) { setLiftedId(null); onWallet(wallet); } }); }} />
              <Pressable accessibilityRole="button" accessibilityLabel={"Update " + liftedWallet.name} disabled={busy} style={styles.focusMenu} onPress={() => { const wallet = liftedWallet; void move(async () => { if (await play(lift, 0, 260)) { setLiftedId(null); onOpenMenu(wallet); } }); }}>
                <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
                  <Defs>
                    <LinearGradient id="updateLeather" x1="0%" y1="0%" x2="100%" y2="100%"><Stop offset="0" stopColor="#486077" /><Stop offset=".42" stopColor="#243b50" /><Stop offset="1" stopColor="#142638" /></LinearGradient>
                    <Pattern id="updateGrain" width={6} height={6} patternUnits="userSpaceOnUse"><Path d="M1 1l1.4 .5m2 3l1 .6M1 5l.6 -.3" stroke="#071522" strokeWidth=".7" opacity=".45" /><Path d="M2 2l1 .5m-2 3l1 .4M4 2l.9 -.3" stroke="#a2b0bd" strokeWidth=".65" opacity=".26" /></Pattern>
                  </Defs>
                  <Rect x="1" y="1" width="98%" height="96%" rx="16" fill="url(#updateLeather)" stroke="#132536" strokeWidth="1.5" />
                  <Rect x="1" y="1" width="98%" height="96%" rx="16" fill="url(#updateGrain)" />
                  <Rect x="5" y="5" width="90%" height="76%" rx="12" fill="none" stroke="#a2b0bd" strokeWidth="1" strokeDasharray="3.5 3" opacity=".82" />
                </Svg>
                <Icon name="edit" size={14} color="#ffffff" />
                <Text style={styles.focusMenuText}>Update</Text>
              </Pressable>
            </Animated.View>
          </View>
        )}
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  wallet: { marginBottom: 14 },
  stage: {
    position: "relative",
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
  },
  shell: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 1,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    boxShadow: "0px 6px 11px #0b182c42",
  },
  flap: { position: "absolute", left: 0, right: 0 },
  flapFace: { position: "absolute", top: "50%", left: 0, right: 0, bottom: 0 },
  hinge: { position: "absolute", left: 1, right: 1, zIndex: 3 },
  bay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 4,
    overflow: "hidden",
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  card: { position: "absolute", top: 0, left: "5%", right: "5%" },
  cardFace: {
    ...StyleSheet.absoluteFill,
    overflow: "hidden",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ffffff61",
    boxShadow: "0px 2px 5px #101e3040",
  },
  cardTouch: { position: "absolute", top: 0, left: 0, right: 0 },
  cardWatermark: {
    position: "absolute",
    top: 30,
    right: -76,
    width: 195,
    height: 195,
    borderRadius: 98,
    borderWidth: 22,
    borderColor: "#ffffff1a",
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 7,
  },
  cardName: { flex: 1, fontFamily: "Poppins_700Bold", fontSize: 12 },
  cardAmountFade: { position: "absolute", top: 0, left: 0 },
  cardBalance: {
    maxWidth: "42%",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
  },
  cardBody: { paddingHorizontal: 15, marginTop: 13, gap: 3 },
  cardType: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 9.5,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  cardFooter: {
    position: "absolute",
    bottom: 11,
    left: 15,
    right: 15,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  cardLabel: { flex: 1 },
  pocket: { position: "absolute", left: 0, right: 0, zIndex: 6 },
  pocketCopy: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 18,
    paddingBottom: 4,
    gap: 0,
    paddingHorizontal: 20,
  },
  pocketLabel: {
    color: "#c3ced7",
    fontFamily: "Poppins_600SemiBold",
    textTransform: "uppercase",
    fontSize: 10,
    letterSpacing: 2,
  },
  pocketCount: {
    color: "#bac9d5",
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
  },
  closedSummary: { position: "absolute", left: 20, right: 20, zIndex: 8, alignItems: "center", justifyContent: "center", paddingBottom: 16 },
  monthlyFlow: { flexDirection: "row", alignItems: "center", width: "100%", marginTop: 2 },
  monthlyItem: { flex: 1, alignItems: "center" },
  monthlyDivider: { width: 1, height: 28, backgroundColor: "#a2b0bd55" },
  monthlyLabel: { color: "#bac9d5", fontFamily: "Poppins_500Medium", fontSize: 9 },
  monthlyValue: { color: "#f0f1eb", fontFamily: "Poppins_700Bold", fontSize: 13, maxWidth: "100%" },
  flapText: {
    position: "absolute",
    top: "29%",
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  flapLabel: {
    color: "#e3e9e9",
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
  },
  controls: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 9,
    marginTop: 8,
  },
  control: {
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 24,
    paddingHorizontal: 18,
  },
  controlText: { fontFamily: "Poppins_600SemiBold", fontSize: 12 },
  focusOverlay: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24 },
  focusCard: { width: "100%", maxWidth: 400, aspectRatio: 85.6 / 53.98, borderRadius: 14, elevation: 12 },
  focusMenu: { position: "absolute", right: 10, bottom: 8, width: 102, height: 44, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", elevation: 3 },
  focusMenuText: { color: "#ffffff", fontFamily: "Poppins_700Bold", fontSize: 12 },
  details: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  detailLink: {
    flex: 1,
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 11,
  },
  detailCopy: { flex: 1 },
  detailName: { fontFamily: "Poppins_700Bold", fontSize: 12 },
  detailType: { fontFamily: "Poppins_500Medium", fontSize: 10 },
  detailMenu: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
});





