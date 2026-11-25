import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getAttachmentSizeLabel,
  MAX_ATTACHMENTS,
  pickImageAttachments,
  resolveAttachmentUri,
} from "../lib/attachments";
import { ScalePressable } from "../lib/motion";
import { Icon } from "./Icon";
import {
  cardShadow,
  DarkLeatherSurface,
  hexToRgba,
  LightLeatherSurface,
  ThemeColors,
} from "./SharedUI";

export const TransactionAttachmentsSection = React.memo(
  function TransactionAttachmentsSection({
    attachments,
    canEdit = true,
    onChange,
    onRemoveExisting,
    emptyActionLabel = "Attach a receipt or photo for proof",
    compact = false,
    theme,
  }: {
    attachments: string[];
    canEdit?: boolean;
    onChange?: (next: string[]) => void;
    onRemoveExisting?: (removedRef: string) => void;
    emptyActionLabel?: string;
    compact?: boolean;
    theme: ThemeColors;
  }) {
    const insets = useSafeAreaInsets();
    const [busySource, setBusySource] = useState<"library" | "camera" | null>(
      null
    );
    const [statusNote, setStatusNote] = useState("");
    const [previewIndex, setPreviewIndex] = useState<number | null>(null);

    const remaining = Math.max(0, MAX_ATTACHMENTS - attachments.length);

    const resolvedItems = useMemo(
      () =>
        attachments.map((ref) => ({
          ref,
          uri: resolveAttachmentUri(ref),
          sizeLabel: getAttachmentSizeLabel(ref),
        })),
      [attachments]
    );

    const handlePick = async (source: "library" | "camera") => {
      if (!canEdit || !onChange || busySource || remaining <= 0) return;
      setStatusNote("");
      setBusySource(source);
      try {
        const res = await pickImageAttachments(source, remaining);
        if (res.permissionDenied) {
          setStatusNote(
            source === "camera"
              ? "Camera permission is required to capture receipts."
              : "Photo library permission is required to attach images."
          );
          return;
        }
        if (res.error) {
          setStatusNote(res.error);
          return;
        }
        if (res.skippedNonImages > 0) {
          setStatusNote("Only image files are supported.");
        }
        if (res.added.length > 0) {
          onChange([...attachments, ...res.added].slice(0, MAX_ATTACHMENTS));
        }
      } finally {
        setBusySource(null);
      }
    };

    const handleRemoveAt = (index: number) => {
      if (!canEdit || !onChange) return;
      const target = attachments[index];
      const next = attachments.filter((_, idx) => idx !== index);
      if (previewIndex !== null) {
        if (next.length === 0) setPreviewIndex(null);
        else if (previewIndex >= next.length) setPreviewIndex(next.length - 1);
      }
      onChange(next);
      if (target) onRemoveExisting?.(target);
    };

    if (!canEdit && resolvedItems.length === 0) {
      return null;
    }

    const activePreview =
      previewIndex !== null && resolvedItems[previewIndex]
        ? resolvedItems[previewIndex]
        : null;

    return (
      <View
        style={[
          styles.card,
          compact && { marginTop: 10, marginBottom: 0 },
          {
            overflow: "hidden",
            backgroundColor: theme.card,
            borderColor: hexToRgba(theme.leather.accent, 0.24),
          },
          !compact && cardShadow(theme.dark),
        ]}
      >
        <LightLeatherSurface theme={theme} radius={18} />
        <View style={styles.headerRow}>
          <View style={styles.titleRow}>
            <Icon name="paperclip" size={15} color={theme.leather.accent} />
            <Text style={[styles.titleText, { color: theme.ink }]}>
              Receipts & photos
            </Text>
          </View>
          <View style={styles.metaBadge}>
            <Text style={[styles.metaText, { color: theme.muted }]}>
              {attachments.length}/{MAX_ATTACHMENTS} · Proof
            </Text>
          </View>
        </View>

        {resolvedItems.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbRow}
          >
            {resolvedItems.map((item, idx) => (
              <View key={`${item.ref}-${idx}`} style={styles.thumbWrap}>
                <ScalePressable
                  onPress={() => setPreviewIndex(idx)}
                  scaleTo={0.95}
                  accessibilityRole="button"
                  accessibilityLabel={`Preview attachment ${idx + 1}`}
                  style={[
                    styles.thumbTile,
                    {
                      borderColor: hexToRgba(theme.leather.accent, 0.28),
                      backgroundColor: theme.soft,
                    },
                  ]}
                >
                  <Image
                    source={{ uri: item.uri }}
                    style={styles.thumbImage}
                    resizeMode="cover"
                  />
                  {item.sizeLabel ? (
                    <View style={styles.sizeBadge}>
                      <Text style={styles.sizeBadgeText}>
                        {item.sizeLabel}
                      </Text>
                    </View>
                  ) : null}
                </ScalePressable>
                {canEdit ? (
                  <Pressable
                    onPress={() => handleRemoveAt(idx)}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove attachment ${idx + 1}`}
                    style={({ pressed }) => [
                      styles.removeBtn,
                      {
                        backgroundColor: theme.leather.colors[1],
                        borderColor: "#ffffff",
                        transform: [{ scale: pressed ? 0.9 : 1 }],
                      },
                    ]}
                  >
                    <Icon name="close" size={11} strokeWidth={2.5} color="#ffffff" />
                  </Pressable>
                ) : null}
              </View>
            ))}
          </ScrollView>
        ) : canEdit ? (
          <Text style={[styles.emptyHint, { color: theme.muted }]}>
            {emptyActionLabel}
          </Text>
        ) : null}

        {canEdit && remaining > 0 ? (
          <View style={styles.actionsRow}>
            <ScalePressable
              onPress={() => handlePick("library")}
              disabled={busySource !== null}
              scaleTo={0.965}
              style={[
                styles.actionBtn,
                {
                  overflow: "hidden",
                  backgroundColor: theme.leather.colors[1],
                  borderColor: theme.leather.edge,
                  opacity: busySource === "camera" ? 0.5 : 1,
                },
                cardShadow(theme.dark),
              ]}
            >
              <DarkLeatherSurface theme={theme} radius={12} />
              {busySource === "library" ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Icon name="image" size={15} color="#ffffff" />
              )}
              <Text style={[styles.actionBtnText, { color: "#ffffff" }]}>
                {busySource === "library" ? "Attaching…" : "Gallery"}
              </Text>
            </ScalePressable>

            <ScalePressable
              onPress={() => handlePick("camera")}
              disabled={busySource !== null}
              scaleTo={0.965}
              style={[
                styles.actionBtn,
                {
                  overflow: "hidden",
                  backgroundColor: theme.leather.colors[1],
                  borderColor: theme.leather.edge,
                  opacity: busySource === "library" ? 0.5 : 1,
                },
                cardShadow(theme.dark),
              ]}
            >
              <DarkLeatherSurface theme={theme} radius={12} />
              {busySource === "camera" ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Icon name="camera" size={15} color="#ffffff" />
              )}
              <Text style={[styles.actionBtnText, { color: "#ffffff" }]}>
                {busySource === "camera" ? "Attaching…" : "Camera"}
              </Text>
            </ScalePressable>
          </View>
        ) : null}

        {statusNote ? (
          <Text
            style={[
              styles.statusText,
              { color: theme.dark ? "#fda4af" : "#9e3c42" },
            ]}
          >
            {statusNote}
          </Text>
        ) : null}

        <Modal
          visible={activePreview !== null}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => setPreviewIndex(null)}
        >
          <View style={styles.lightboxRoot}>
            <View
              style={[
                styles.lightboxHeader,
                { paddingTop: Math.max(18, insets.top + 10) },
              ]}
            >
              <View>
                <Text style={styles.lightboxTitle}>
                  Attachment {(previewIndex ?? 0) + 1} of {resolvedItems.length}
                </Text>
                {activePreview?.sizeLabel ? (
                  <Text style={styles.lightboxSub}>
                    Transaction proof · {activePreview.sizeLabel}
                  </Text>
                ) : null}
              </View>
              <ScalePressable
                onPress={() => setPreviewIndex(null)}
                scaleTo={0.92}
                accessibilityRole="button"
                accessibilityLabel="Close image preview"
                style={styles.lightboxCloseBtn}
              >
                <Icon name="close" size={18} strokeWidth={2.4} color="#ffffff" />
              </ScalePressable>
            </View>

            <View style={styles.lightboxStage}>
              {activePreview ? (
                <Image
                  source={{ uri: activePreview.uri }}
                  style={styles.lightboxImage}
                  resizeMode="contain"
                />
              ) : null}
            </View>

            {canEdit && previewIndex !== null ? (
              <View
                style={[
                  styles.lightboxFooter,
                  { paddingBottom: Math.max(24, insets.bottom + 12) },
                ]}
              >
                <ScalePressable
                  onPress={() => handleRemoveAt(previewIndex)}
                  scaleTo={0.96}
                  style={styles.lightboxDeleteBtn}
                >
                  <Icon name="trash" size={16} color="#fda4af" />
                  <Text style={styles.lightboxDeleteText}>Remove photo</Text>
                </ScalePressable>
              </View>
            ) : null}
          </View>
        </Modal>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    gap: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  titleText: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 13,
    includeFontPadding: false,
    marginTop: 1,
  },
  metaBadge: {
    flexShrink: 0,
  },
  metaText: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 11,
  },
  emptyHint: {
    fontFamily: "Poppins_500Medium",
    fontWeight: "500",
    fontSize: 11.5,
    lineHeight: 16,
  },
  thumbRow: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 4,
    paddingBottom: 2,
  },
  thumbWrap: {
    position: "relative",
    paddingTop: 4,
    paddingRight: 4,
  },
  thumbTile: {
    width: 74,
    height: 74,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },
  sizeBadge: {
    position: "absolute",
    left: 4,
    bottom: 4,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 6,
    backgroundColor: "rgba(10, 15, 24, 0.72)",
  },
  sizeBadgeText: {
    color: "#ffffff",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 9,
    includeFontPadding: false,
  },
  removeBtn: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  actionBtnText: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 12.5,
    includeFontPadding: false,
    marginTop: 1,
  },
  statusText: {
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    fontSize: 11.5,
  },
  lightboxRoot: {
    flex: 1,
    backgroundColor: "rgba(8, 12, 20, 0.96)",
  },
  lightboxHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  lightboxTitle: {
    color: "#ffffff",
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 15,
  },
  lightboxSub: {
    color: "rgba(255, 255, 255, 0.7)",
    fontFamily: "Poppins_500Medium",
    fontSize: 11.5,
    marginTop: 1,
  },
  lightboxCloseBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  lightboxStage: {
    flex: 1,
    paddingHorizontal: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  lightboxImage: {
    width: "100%",
    height: "100%",
  },
  lightboxFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    alignItems: "center",
  },
  lightboxDeleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: "rgba(225, 29, 72, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(253, 164, 175, 0.35)",
  },
  lightboxDeleteText: {
    color: "#fda4af",
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    fontSize: 13,
    includeFontPadding: false,
    marginTop: 1,
  },
});
