import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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

const PITAKA_TITLE_WHITE = require("../../assets/brand/pitaka-title-white.webp");
const PITAKA_MARK_WHITE = require("../../assets/brand/pitaka-mark-white.webp");

const APP_VERSION = "1.0.0";

type AboutPage = "about" | "terms" | "privacy";

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
  visible,
  theme,
  onClose,
}: {
  visible: boolean;
  theme: ThemeColors;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [renderedVisible, setRenderedVisible] = useState(visible);
  const [page, setPage] = useState<AboutPage>("about");
  const sheetAnim = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const closingRef = useRef(false);
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);

  useEffect(() => {
    if (visible) {
      closingRef.current = false;
      setRenderedVisible(true);
      setPage("about");
      sheetAnim.stopAnimation();
      sheetAnim.setValue(0);
      Animated.timing(sheetAnim, {
        toValue: 1,
        duration: 270,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else if (renderedVisible && !closingRef.current) {
      closingRef.current = true;
      sheetAnim.stopAnimation();
      Animated.timing(sheetAnim, {
        toValue: 0,
        duration: 210,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          closingRef.current = false;
          setRenderedVisible(false);
        }
      });
    }
  }, [visible, renderedVisible, sheetAnim]);

  const navigatePage = useCallback((next: AboutPage) => {
    setPage(next);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []);

  const handleRequestClose = useCallback(() => {
    if (page !== "about") {
      navigatePage("about");
      return;
    }
    onClose();
  }, [navigatePage, onClose, page]);

  if (!renderedVisible) return null;

  const headerTitle =
    page === "terms"
      ? "Terms & Conditions"
      : page === "privacy"
        ? "Data Privacy Policy"
        : "About Pitaka";

  return (
    <Modal
      visible={renderedVisible}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={handleRequestClose}
    >
      <View style={styles.modalRoot}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.backdrop,
            { opacity: sheetAnim },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.page,
              borderColor: hexToRgba(theme.leather.accent, 0.24),
              paddingBottom: Math.max(insets.bottom, 16),
              transform: [
                {
                  translateY: sheetAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [48, 0],
                  }),
                },
              ],
              opacity: sheetAnim,
            },
          ]}
        >
          <SaffianoSheetSurface theme={theme} radius={28} />

          {/* Sheet Header */}
          <View style={styles.headerRow}>
            {page !== "about" ? (
              <ScalePressable
                onPress={() => navigatePage("about")}
                accessibilityRole="button"
                accessibilityLabel="Back to About Pitaka"
                scaleTo={0.92}
                style={[
                  styles.headerBtn,
                  {
                    backgroundColor: theme.card,
                    borderColor: hexToRgba(theme.leather.accent, 0.22),
                  },
                ]}
              >
                <Icon name="back" size={17} color={theme.leather.accent} />
              </ScalePressable>
            ) : (
              <View style={styles.headerBtnPlaceholder} />
            )}

            <Text
              style={[styles.headerTitle, { color: theme.ink }]}
              numberOfLines={1}
            >
              {headerTitle}
            </Text>

            <ScalePressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              scaleTo={0.92}
              style={[
                styles.headerBtn,
                {
                  backgroundColor: theme.card,
                  borderColor: hexToRgba(theme.leather.accent, 0.22),
                },
              ]}
            >
              <Icon name="close" size={16} color={theme.leather.accent} />
            </ScalePressable>
          </View>

          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
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
                        styles.cardBox,
                        {
                          backgroundColor: theme.card,
                          borderColor: hexToRgba(theme.leather.accent, 0.22),
                        },
                        cardShadow(theme.dark),
                      ]}
                    >
                      <LightLeatherSurface theme={theme} radius={20} />
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
                  ))}
                </View>

                {/* Legal Section */}
                <View style={styles.sectionBlock}>
                  <Text style={[styles.sectionLabel, { color: theme.ink }]}>
                    Legal & privacy
                  </Text>
                  <View
                    style={[
                      styles.legalCard,
                      {
                        backgroundColor: theme.card,
                        borderColor: hexToRgba(theme.leather.accent, 0.22),
                      },
                      cardShadow(theme.dark),
                    ]}
                  >
                    <LightLeatherSurface theme={theme} radius={20} />
                    <Pressable
                      onPress={() => navigatePage("terms")}
                      accessibilityRole="button"
                      style={({ pressed }) => [
                        styles.legalRow,
                        pressed && {
                          backgroundColor: hexToRgba(theme.leather.accent, 0.06),
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.legalIconWrap,
                          {
                            backgroundColor: hexToRgba(
                              theme.leather.accent,
                              0.12
                            ),
                          },
                        ]}
                      >
                        <Icon name="book" size={16} color={theme.leather.accent} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.legalTitle, { color: theme.ink }]}>
                          Terms & Conditions
                        </Text>
                        <Text style={[styles.legalSub, { color: theme.muted }]}>
                          Usage terms, offline data & disclaimers
                        </Text>
                      </View>
                      <Icon name="chevron" size={15} color={theme.muted} />
                    </Pressable>

                    <View
                      style={[
                        styles.legalDivider,
                        {
                          backgroundColor: hexToRgba(
                            theme.leather.accent,
                            0.14
                          ),
                        },
                      ]}
                    />

                    <Pressable
                      onPress={() => navigatePage("privacy")}
                      accessibilityRole="button"
                      style={({ pressed }) => [
                        styles.legalRow,
                        pressed && {
                          backgroundColor: hexToRgba(theme.leather.accent, 0.06),
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.legalIconWrap,
                          {
                            backgroundColor: hexToRgba(
                              theme.leather.accent,
                              0.12
                            ),
                          },
                        ]}
                      >
                        <Icon name="shield" size={16} color={theme.leather.accent} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.legalTitle, { color: theme.ink }]}>
                          Data Privacy Policy
                        </Text>
                        <Text style={[styles.legalSub, { color: theme.muted }]}>
                          How your data stays private on device
                        </Text>
                      </View>
                      <Icon name="chevron" size={15} color={theme.muted} />
                    </Pressable>
                  </View>
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
                    styles.cardBox,
                    {
                      backgroundColor: theme.card,
                      borderColor: hexToRgba(theme.leather.accent, 0.22),
                    },
                    cardShadow(theme.dark),
                  ]}
                >
                  <LightLeatherSurface theme={theme} radius={20} />
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
              </>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    backgroundColor: "rgba(9, 14, 24, 0.56)",
  },
  sheet: {
    maxHeight: "88%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    overflow: "hidden",
    paddingTop: 14,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBtnPlaceholder: {
    width: 36,
    height: 36,
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
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 20,
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
  cardBox: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    padding: 16,
    gap: 10,
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
  legalCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  legalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  legalIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  legalTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 13.5,
    lineHeight: 18,
    includeFontPadding: false,
  },
  legalSub: {
    fontFamily: "Poppins_400Regular",
    fontWeight: "400",
    fontSize: 11.5,
    lineHeight: 15,
    includeFontPadding: false,
    marginTop: 2,
  },
  legalDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 14,
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
