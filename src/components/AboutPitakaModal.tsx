import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  BackHandler,
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MOTION_DURATIONS, MOTION_EASE, MOTION_EASE_EXIT, ScalePressable } from "../lib/motion";
import { Icon } from "./Icon";
import {
  cardShadow,
  DarkLeatherSurface,
  EdgeFade,
  hexToRgba,
  LightLeatherSurface,
  SaffianoSheetSurface,
  type ThemeColors,
} from "./SharedUI";

const PITAKA_TITLE_WHITE = require("../../assets/brand/pitaka-title-white.webp");
const PITAKA_MARK_WHITE = require("../../assets/brand/pitaka-mark-white.webp");

const APP_VERSION = "1.0.0";

export type AboutPage = "about" | "terms" | "privacy";

type ReleaseNote = {
  version: string;
  label: string;
  summary: string;
  items: string[];
};

const PATCH_NOTES: ReleaseNote[] = [
  {
    version: "v1.0.0",
    label: "Latest release",
    summary: "Crafted offline-first personal finance wallet.",
    items: [
      "Tactile leather wallet pockets for Cash, E-Wallets, and Bank accounts with 6 customizable leather finishes.",
      "Embroidered Pitaka wordmark, matching section headers, and an interactive 4-slide onboarding tour.",
      "Fast expense, income, and wallet-to-wallet transfer logging with receipt photo attachments.",
      "Monthly and per-category budgets, visual category treemaps, and wallet distribution insights.",
      "Recurring schedules, PayLater bill tracking, 4-digit PIN & biometric lock, and JSON backup & restore.",
    ],
  },
];

type LegalSection = {
  heading: string;
  body: string;
};

const TERMS_SECTIONS: LegalSection[] = [
  {
    heading: "1. Acceptance of Terms",
    body: "By using Pitaka, you agree to these Terms & Conditions. Pitaka is provided as a personal finance organizer to help you record and review your own balances, transactions, budgets, and bills.",
  },
  {
    heading: "2. Informational Use Only",
    body: "Pitaka is a personal tracking tool and does not provide financial, tax, legal, or investment advice. It does not connect to your bank accounts or move real money. All balances and entries reflect only the information you record.",
  },
  {
    heading: "3. Local Storage & Backups",
    body: "Your records are stored locally on your device. Because Pitaka operates offline-first, you are responsible for keeping periodic JSON backups if you switch devices, uninstall the app, or clear device storage.",
  },
  {
    heading: "4. Permissions & Security",
    body: "Optional features such as receipt photos, scheduled reminders, and PIN/biometric app lock rely on your device's operating system. Keep your device and backup files secure, as exported JSON files contain your financial records.",
  },
  {
    heading: "5. Acceptable Use & Ownership",
    body: "All Pitaka branding, artwork, embroidery assets, and interface designs remain the property of Pitaka. You retain full ownership of all financial data and backups you create within the app.",
  },
  {
    heading: "6. Changes to These Terms",
    body: "These terms may be updated alongside future app releases. Continued use of Pitaka after an update means you accept the revised terms.",
  },
];

const PRIVACY_SECTIONS: LegalSection[] = [
  {
    heading: "1. 100% On-Device Storage",
    body: "Pitaka stores your wallets, transactions, budgets, schedules, PayLater records, profile name, and theme preferences locally in an on-device SQLite database. We do not collect, upload, or store your financial records on external servers.",
  },
  {
    heading: "2. No Ads, Tracking, or Data Selling",
    body: "Pitaka does not sell your personal information, serve third-party behavioral ads, or share your financial activity with third-party data brokers.",
  },
  {
    heading: "3. Device Permissions",
    body: "Camera and Photo Library access are requested only when you choose to attach a receipt photo to a transaction; images stay saved locally on your device. Notification permission is used solely for your local bill and schedule reminders. Biometric unlock is handled entirely by your device's OS—Pitaka never sees or stores raw fingerprint or Face ID data.",
  },
  {
    heading: "4. Backups & Full Data Control",
    body: "When you export a JSON backup, the file is generated locally and shared only where you choose. You can delete individual records or permanently wipe all local data at any time from Settings → Erase all data.",
  },
  {
    heading: "5. Policy Updates",
    body: "If future versions introduce optional cloud sync or new permissions, this Data Privacy Policy will be updated clearly inside the app before any change takes effect.",
  },
];

export const AboutPitakaModal = React.memo(function AboutPitakaModal({
  initialPage = "about",
  theme,
  onClose,
}: {
  initialPage?: AboutPage;
  theme: ThemeColors;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const sheetStartY = Math.min(Math.max(windowHeight, 560), 760);
  const [page, setPage] = useState<AboutPage>(initialPage);
  const openAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const closingRef = useRef(false);
  const scrollRef = useRef<React.ComponentRef<typeof Animated.ScrollView>>(null);

  useEffect(() => {
    setPage(initialPage);
    scrollY.setValue(0);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [initialPage, scrollY]);

  useEffect(() => {
    closingRef.current = false;
    openAnim.setValue(0);
    const raf = requestAnimationFrame(() => {
      Animated.timing(openAnim, {
        toValue: 1,
        duration: MOTION_DURATIONS.sheetIn,
        easing: MOTION_EASE,
        useNativeDriver: true,
      }).start();
    });
    return () => cancelAnimationFrame(raf);
  }, [openAnim]);

  const dismiss = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    Animated.timing(openAnim, {
      toValue: 0,
      duration: MOTION_DURATIONS.sheetOut,
      easing: MOTION_EASE_EXIT,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  }, [onClose, openAnim]);

  const onScroll = useRef(
    Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
      useNativeDriver: true,
    })
  ).current;

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      dismiss();
      return true;
    });
    return () => sub.remove();
  }, [dismiss]);

  const headerTitle =
    page === "terms"
      ? "Terms & Conditions"
      : page === "privacy"
        ? "Data Privacy Policy"
        : "About Pitaka";

  return (
    <View style={[styles.overlayRoot, { paddingTop: insets.top }]}>
      <Animated.View
        pointerEvents="none"
        style={[styles.backdrop, { opacity: openAnim }]}
      />
      <View style={styles.sheetLayer}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
        <Animated.View
          renderToHardwareTextureAndroid
          style={[
            styles.sheet,
            {
              backgroundColor: theme.page,
              transform: [
                {
                  translateY: openAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [sheetStartY, 0],
                  }),
                },
                {
                  scale: openAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.982, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <View pointerEvents="none" style={styles.sheetTextureClip}>
            <SaffianoSheetSurface theme={theme} radius={32} />
          </View>
          <View
            style={[
              styles.handle,
              { backgroundColor: hexToRgba(theme.leather.accent, 0.25) },
            ]}
          />

          {/* Sheet Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerBtnPlaceholder} />

            <Text
              style={[styles.headerTitle, { color: theme.ink }]}
              numberOfLines={1}
            >
              {headerTitle}
            </Text>

            <ScalePressable
              onPress={dismiss}
              accessibilityRole="button"
              accessibilityLabel="Close"
              scaleTo={0.92}
              style={[
                styles.headerBtn,
                {
                  backgroundColor: theme.leather.edge,
                  borderColor: theme.leather.edge,
                },
                cardShadow(theme.dark),
              ]}
            >
              <DarkLeatherSurface theme={theme} radius={21} />
              <Icon name="close" size={17} strokeWidth={2.3} color="#ffffff" />
            </ScalePressable>
          </View>

          <View style={{ flexShrink: 1, position: "relative" }}>
            <Animated.ScrollView
              ref={scrollRef}
              showsVerticalScrollIndicator={false}
              onScroll={onScroll}
              scrollEventThrottle={16}
              contentContainerStyle={[
                styles.scrollContent,
                { paddingBottom: Math.max(32, insets.bottom + 20) },
              ]}
            >
            {page === "about" ? (
              <>
                {/* Branded Leather Hero Card */}
                <View
                  style={[
                    styles.brandCard,
                    {
                      backgroundColor: theme.leather.colors[1],
                      borderColor: theme.leather.edge,
                    },
                    cardShadow(theme.dark),
                  ]}
                >
                  <DarkLeatherSurface theme={theme} radius={22} />
                  <View style={styles.brandTop}>
                    <View style={styles.brandMarkWrap}>
                      <Image
                        source={PITAKA_MARK_WHITE}
                        style={styles.brandMark}
                        resizeMode="contain"
                      />
                    </View>
                    <View style={styles.brandMeta}>
                      <Image
                        source={PITAKA_TITLE_WHITE}
                        style={styles.brandWordmark}
                        resizeMode="contain"
                        accessibilityLabel="Pitaka"
                      />
                      <View style={styles.versionRow}>
                        <View style={styles.versionPill}>
                          <Text style={styles.versionPillText}>
                            Version {APP_VERSION}
                          </Text>
                        </View>
                        <View style={styles.devPill}>
                          <Icon name="user" size={10} color="#f6f7fb" />
                          <Text style={styles.devPillText}>gjcodes</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.brandDesc}>
                    Pitaka is a handcrafted, offline-first personal finance
                    wallet designed to keep your cash, e-wallets, bank cards,
                    budgets, and bills organized privately on your device.
                  </Text>
                </View>

                {/* Patch Notes Section */}
                <View style={styles.sectionBlock}>
                  <Text style={[styles.sectionLabel, { color: theme.ink }]}>
                    Patch notes
                  </Text>
                  {PATCH_NOTES.map((release) => (
                    <View
                      key={release.version}
                      style={[
                        styles.cardOuter,
                        {
                          backgroundColor: theme.card,
                          borderColor: hexToRgba(theme.leather.accent, 0.22),
                        },
                        styles.softCardShadow,
                      ]}
                    >
                      <View style={styles.cardInnerClip}>
                        <LightLeatherSurface theme={theme} radius={20} />
                        <View style={styles.cardBoxBody}>
                      <View style={styles.releaseHeader}>
                        <View style={styles.releaseTitleWrap}>
                          <Text style={[styles.releaseVer, { color: theme.ink }]}>
                            {release.version}
                          </Text>
                          <View
                            style={[
                              styles.releaseBadge,
                              {
                                backgroundColor: hexToRgba(
                                  theme.leather.accent,
                                  0.12
                                ),
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.releaseBadgeText,
                                { color: theme.leather.accent },
                              ]}
                            >
                              {release.label}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <Text style={[styles.releaseSummary, { color: theme.muted }]}>
                        {release.summary}
                      </Text>
                      <View style={styles.bulletList}>
                        {release.items.map((item) => (
                          <View key={item} style={styles.bulletRow}>
                            <View
                              style={[
                                styles.bulletDot,
                                { backgroundColor: theme.leather.accent },
                              ]}
                            />
                            <Text style={[styles.bulletText, { color: theme.ink }]}>
                              {item}
                            </Text>
                          </View>
                        ))}
                      </View>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <>
                {page === "privacy" ? (
                  <View
                    style={[
                      styles.privacyBanner,
                      {
                        backgroundColor: theme.leather.colors[1],
                        borderColor: theme.leather.edge,
                      },
                      cardShadow(theme.dark),
                    ]}
                  >
                    <DarkLeatherSurface theme={theme} radius={18} />
                    <Icon name="shield" size={18} color="#6ee7b7" />
                    <Text style={styles.privacyBannerText}>
                      100% On-Device · Zero Ad Tracking · Full Backup Control
                    </Text>
                  </View>
                ) : null}

                <View
                  style={[
                    styles.cardOuter,
                    {
                      backgroundColor: theme.card,
                      borderColor: hexToRgba(theme.leather.accent, 0.22),
                    },
                    styles.softCardShadow,
                  ]}
                >
                  <View style={styles.cardInnerClip}>
                    <LightLeatherSurface theme={theme} radius={20} />
                    <View style={styles.cardBoxBody}>
                      <Text style={[styles.docMeta, { color: theme.muted }]}>
                        Pitaka v{APP_VERSION} · Effective November 2026
                      </Text>
                      {(page === "terms" ? TERMS_SECTIONS : PRIVACY_SECTIONS).map(
                        (sec, idx) => (
                          <View
                            key={sec.heading}
                            style={[
                              styles.docSection,
                              idx > 0 && {
                                borderTopWidth: StyleSheet.hairlineWidth,
                                borderTopColor: hexToRgba(
                                  theme.leather.accent,
                                  0.14
                                ),
                                paddingTop: 12,
                              },
                            ]}
                          >
                            <Text style={[styles.docHeading, { color: theme.ink }]}>
                              {sec.heading}
                            </Text>
                            <Text style={[styles.docBody, { color: theme.muted }]}>
                              {sec.body}
                            </Text>
                          </View>
                        )
                      )}
                    </View>
                  </View>
                </View>
              </>
            )}
            </Animated.ScrollView>
            <EdgeFade
              position="top"
              color={theme.page}
              size={20}
              opacity={scrollY.interpolate({
                inputRange: [0, 14],
                outputRange: [0, 1],
                extrapolate: "clamp",
              })}
            />
            <EdgeFade
              position="bottom"
              color={theme.page}
              size={Math.max(32, insets.bottom + 18)}
            />
          </View>
        </Animated.View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  overlayRoot: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 80,
  },
  sheetLayer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.64)",
  },
  sheet: {
    width: "100%",
    maxHeight: "88%",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 20,
  },
  sheetTextureClip: {
    ...StyleSheet.absoluteFill,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: "hidden",
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingBottom: 12,
    gap: 10,
  },
  headerBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  headerBtnPlaceholder: {
    width: 42,
    height: 42,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 16.5,
    lineHeight: 22,
    letterSpacing: -0.3,
    includeFontPadding: false,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    gap: 16,
  },
  brandCard: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
    padding: 18,
    gap: 12,
  },
  brandTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  brandMarkWrap: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  brandMark: {
    width: 30,
    height: 34,
  },
  brandMeta: {
    flex: 1,
    gap: 5,
  },
  brandWordmark: {
    width: 108,
    height: 36,
  },
  versionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    flexWrap: "wrap",
  },
  versionPill: {
    height: 22,
    paddingHorizontal: 9,
    borderRadius: 99,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  versionPillText: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 10.5,
    lineHeight: 13,
    includeFontPadding: false,
    marginTop: 1,
    color: "#f6f7fb",
  },
  devPill: {
    height: 22,
    paddingHorizontal: 9,
    borderRadius: 99,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  devPillText: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 10.5,
    lineHeight: 13,
    includeFontPadding: false,
    marginTop: 1,
    color: "#f6f7fb",
  },
  brandDesc: {
    fontFamily: "Poppins_400Regular",
    fontWeight: "400",
    fontSize: 12.5,
    lineHeight: 19,
    color: "rgba(246, 247, 251, 0.84)",
  },
  sectionBlock: {
    gap: 8,
  },
  sectionLabel: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 16,
    letterSpacing: -0.3,
    paddingHorizontal: 2,
  },
  cardOuter: {
    borderRadius: 20,
    borderWidth: 1,
  },
  cardInnerClip: {
    borderRadius: 19,
    overflow: "hidden",
  },
  cardBoxBody: {
    padding: 16,
    gap: 10,
  },
  softCardShadow: {
    shadowColor: "#121a2d",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  releaseHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  releaseTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  releaseVer: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 15,
    lineHeight: 20,
    includeFontPadding: false,
  },
  releaseBadge: {
    height: 22,
    paddingHorizontal: 9,
    borderRadius: 99,
    alignItems: "center",
    justifyContent: "center",
  },
  releaseBadgeText: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 10.5,
    lineHeight: 13,
    includeFontPadding: false,
    marginTop: 1,
  },
  releaseSummary: {
    fontFamily: "Poppins_500Medium",
    fontWeight: "500",
    fontSize: 12.5,
    lineHeight: 18,
  },
  bulletList: {
    gap: 8,
    marginTop: 2,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 7,
  },
  bulletText: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontWeight: "400",
    fontSize: 12.5,
    lineHeight: 18.5,
  },
  privacyBanner: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  privacyBannerText: {
    flex: 1,
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 12,
    lineHeight: 16,
    includeFontPadding: false,
    marginTop: 1,
    color: "#f6f7fb",
  },
  docMeta: {
    fontFamily: "Poppins_500Medium",
    fontWeight: "500",
    fontSize: 11.5,
  },
  docSection: {
    gap: 4,
  },
  docHeading: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 13.5,
    lineHeight: 19,
  },
  docBody: {
    fontFamily: "Poppins_400Regular",
    fontWeight: "400",
    fontSize: 12.5,
    lineHeight: 19,
  },
});
