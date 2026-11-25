import { Platform } from "react-native";
import { Directory, File, Paths } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

export const MAX_ATTACHMENTS = 4;
const MAX_DIMENSION = 1280;
const FALLBACK_DIMENSION = 1024;
const PRIMARY_QUALITY = 0.68;
const FALLBACK_QUALITY = 0.52;
const TARGET_MAX_BYTES = 350 * 1024;
const ATTACHMENTS_DIR_NAME = "attachments";

function getAttachmentsDir(): Directory {
  return new Directory(Paths.document, ATTACHMENTS_DIR_NAME);
}

function ensureAttachmentsDir(): Directory {
  const dir = getAttachmentsDir();
  if (!dir.exists) {
    dir.create({ idempotent: true, intermediates: true });
  }
  return dir;
}

export function resolveAttachmentUri(ref: string): string {
  if (!ref) return "";
  if (
    ref.startsWith("file://") ||
    ref.startsWith("content://") ||
    ref.startsWith("http://") ||
    ref.startsWith("https://") ||
    ref.startsWith("data:") ||
    ref.startsWith("blob:")
  ) {
    return ref;
  }
  return new File(getAttachmentsDir(), ref).uri;
}

export function getAttachmentSizeLabel(ref: string): string | null {
  if (Platform.OS === "web" || !ref) return null;
  try {
    const file = ref.includes("/") ? new File(ref) : new File(getAttachmentsDir(), ref);
    if (!file.exists || !file.size) return null;
    const kb = Math.round(file.size / 1024);
    if (kb >= 1024) {
      return `${(kb / 1024).toFixed(1)} MB`;
    }
    return `${Math.max(1, kb)} KB`;
  } catch {
    return null;
  }
}

export function deleteAttachmentFiles(refs?: string[]): void {
  if (!refs?.length || Platform.OS === "web") return;
  for (const ref of refs) {
    if (!ref || ref.startsWith("http://") || ref.startsWith("https://") || ref.startsWith("data:")) {
      continue;
    }
    try {
      const file = ref.includes("/") ? new File(ref) : new File(getAttachmentsDir(), ref);
      if (file.exists) {
        file.delete();
      }
    } catch {
      // Ignore cleanup errors for missing/temp files
    }
  }
}

function isImageAsset(asset: ImagePicker.ImagePickerAsset): boolean {
  if (asset.type === "video" || asset.type === "pairedVideo") return false;
  if (asset.mimeType && !asset.mimeType.toLowerCase().startsWith("image/")) {
    return false;
  }
  if (asset.type === "image") return true;
  if (asset.mimeType?.toLowerCase().startsWith("image/")) return true;
  return /\.(jpe?g|png|webp|heic|heif|bmp|gif)$/i.test(asset.uri);
}

async function compressImagePass(
  uri: string,
  width: number,
  height: number,
  maxDim: number,
  compress: number
) {
  const ctx = ImageManipulator.manipulate(uri);
  if (width > maxDim || height > maxDim) {
    if (width >= height) {
      ctx.resize({ width: maxDim });
    } else {
      ctx.resize({ height: maxDim });
    }
  }
  const rendered = await ctx.renderAsync();
  try {
    return await rendered.saveAsync({
      format: SaveFormat.JPEG,
      compress,
    });
  } finally {
    rendered.release();
    ctx.release();
  }
}

async function compressAndStoreAsset(
  asset: ImagePicker.ImagePickerAsset,
  suffixIndex: number
): Promise<string> {
  let result = await compressImagePass(
    asset.uri,
    asset.width || 0,
    asset.height || 0,
    MAX_DIMENSION,
    PRIMARY_QUALITY
  );

  if (Platform.OS !== "web") {
    try {
      const firstFile = new File(result.uri);
      if (firstFile.exists && firstFile.size > TARGET_MAX_BYTES) {
        const second = await compressImagePass(
          result.uri,
          result.width,
          result.height,
          FALLBACK_DIMENSION,
          FALLBACK_QUALITY
        );
        try {
          if (firstFile.exists) firstFile.delete();
        } catch {
          // ignore temp cleanup failure
        }
        result = second;
      }
    } catch {
      // Keep first compressed output if size check fails
    }

    const dir = ensureAttachmentsDir();
    const filename = `att-${Date.now()}-${suffixIndex}-${Math.random()
      .toString(36)
      .slice(2, 7)}.jpg`;
    const dest = new File(dir, filename);
    const src = new File(result.uri);
    await src.copy(dest);
    try {
      if (src.exists) src.delete();
    } catch {
      // ignore cache file deletion error
    }
    return filename;
  }

  return result.uri;
}

export type PickAttachmentsOutcome = {
  added: string[];
  canceled: boolean;
  permissionDenied?: boolean;
  skippedNonImages: number;
  error?: string;
};

/**
 * Picks image-only receipts/photos from Library or Camera, compresses them into
 * compact JPEGs, and stores them inside the app document `attachments/` directory.
 */
export async function pickImageAttachments(
  source: "library" | "camera",
  maxCount: number
): Promise<PickAttachmentsOutcome> {
  const limit = Math.max(0, maxCount);
  if (limit === 0) {
    return { added: [], canceled: true, skippedNonImages: 0 };
  }

  try {
    if (source === "camera") {
      const camPerm = await ImagePicker.requestCameraPermissionsAsync();
      if (!camPerm.granted) {
        return {
          added: [],
          canceled: true,
          permissionDenied: true,
          skippedNonImages: 0,
        };
      }
    } else if (Platform.OS !== "web") {
      const libPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!libPerm.granted) {
        return {
          added: [],
          canceled: true,
          permissionDenied: true,
          skippedNonImages: 0,
        };
      }
    }

    const pickerResult =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ["images"],
            allowsEditing: false,
            quality: 0.85,
            exif: false,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsMultipleSelection: limit > 1,
            selectionLimit: limit,
            allowsEditing: false,
            quality: 0.85,
            exif: false,
          });

    if (pickerResult.canceled || !pickerResult.assets?.length) {
      return { added: [], canceled: true, skippedNonImages: 0 };
    }

    const imageAssets = pickerResult.assets.filter(isImageAsset).slice(0, limit);
    const skippedNonImages = pickerResult.assets.length - imageAssets.length;
    const added: string[] = [];

    for (let i = 0; i < imageAssets.length; i++) {
      const storedRef = await compressAndStoreAsset(imageAssets[i], i);
      added.push(storedRef);
    }

    return {
      added,
      canceled: false,
      skippedNonImages,
    };
  } catch (err: any) {
    return {
      added: [],
      canceled: true,
      skippedNonImages: 0,
      error: err?.message || "Could not attach image.",
    };
  }
}
