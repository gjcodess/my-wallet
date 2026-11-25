import { Platform, Share } from "react-native";
import { File, Paths } from "expo-file-system";
import type { CategoryLimits } from "../types/budget";
import type { Favorite } from "../types/favorite";
import type { Schedule } from "../types/schedule";
import type { ActivityItem, UserProfile, Wallet } from "../types/wallet";

export type PitakaBackupPayload = {
  app: "pitaka";
  version: 1;
  exportedAt: string;
  data: {
    wallets: Wallet[];
    activities: ActivityItem[];
    schedules: Schedule[];
    profile: UserProfile;
    leatherFinish: string;
    hidden: boolean;
    monthlyBudget: number | null;
    categoryLimits: CategoryLimits;
    favorites: Favorite[];
  };
};

export function buildBackupPayload(params: PitakaBackupPayload["data"]): PitakaBackupPayload {
  return {
    app: "pitaka",
    version: 1,
    exportedAt: new Date().toISOString(),
    data: params,
  };
}

export async function exportBackupJsonFile(
  payload: PitakaBackupPayload
): Promise<{ ok: boolean; error?: string }> {
  const datePart = payload.exportedAt.slice(0, 10);
  const filename = `pitaka-backup-${datePart}.json`;
  const json = JSON.stringify(payload, null, 2);

  try {
    if (Platform.OS === "web") {
      if (typeof document !== "undefined" && typeof Blob !== "undefined") {
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
        return { ok: true };
      }
      await Share.share({ message: json, title: filename });
      return { ok: true };
    }

    const file = new File(Paths.cache, filename);
    if (file.exists) {
      file.delete();
    }
    file.create({ overwrite: true });
    await file.write(json);

    let sharedViaExpo = false;
    try {
      // Lazy-load so dev builds without ExpoSharing compiled in don't crash on startup.
      const Sharing = require("expo-sharing") as typeof import("expo-sharing");
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: "application/json",
          dialogTitle: "Export Pitaka Backup",
          UTI: "public.json",
        });
        sharedViaExpo = true;
      }
    } catch {
      sharedViaExpo = false;
    }

    if (sharedViaExpo) {
      return { ok: true };
    }

    await Share.share({
      message: json,
      title: filename,
      ...(Platform.OS === "ios" ? { url: file.uri } : {}),
    });
    return { ok: true };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || "Could not export backup file.",
    };
  }
}

export type PickBackupOutcome = {
  canceled: boolean;
  payload?: PitakaBackupPayload;
  fileName?: string;
  error?: string;
};

export async function pickAndParseBackupFile(): Promise<PickBackupOutcome> {
  try {
    const picked = await File.pickFileAsync({
      multipleFiles: false,
      mimeTypes: ["application/json", "text/plain", "*/*"],
    });

    if (picked.canceled || !picked.result) {
      return { canceled: true };
    }

    const rawText = await picked.result.text();
    const parsed = JSON.parse(rawText);
    const dataNode = parsed?.data && typeof parsed.data === "object" ? parsed.data : parsed;

    if (
      !dataNode ||
      !Array.isArray(dataNode.wallets) ||
      !Array.isArray(dataNode.activities)
    ) {
      return {
        canceled: false,
        error: "Invalid backup file. Choose a Pitaka JSON backup.",
      };
    }

    const wallets: Wallet[] = dataNode.wallets
      .filter((w: any) => w && typeof w.name === "string")
      .map((w: any, idx: number) => ({
        id: Number(w.id) || Date.now() + idx,
        localId: typeof w.localId === "string" ? w.localId : `wallet-${w.id || idx + 1}`,
        name: String(w.name),
        type: typeof w.type === "string" ? w.type : "E-wallet",
        balance: Number(w.balance) || 0,
        mark: typeof w.mark === "string" ? w.mark : String(w.name).slice(0, 2).toUpperCase(),
        tone: typeof w.tone === "string" ? (w.tone as Wallet["tone"]) : "blue",
        account: typeof w.account === "string" ? w.account : "Personal",
        logoKey: typeof w.logoKey === "string" ? w.logoKey : undefined,
        isHidden: Boolean(w.isHidden),
        updatedAt: typeof w.updatedAt === "string" ? w.updatedAt : new Date().toISOString(),
        synced: false,
      }));

    const activities: ActivityItem[] = dataNode.activities
      .filter((a: any) => a && typeof a.title === "string")
      .map((a: any, idx: number) => ({
        id: Number(a.id) || Date.now() + idx,
        localId: typeof a.localId === "string" ? a.localId : `tx-${a.id || idx + 1}`,
        walletLocalId: typeof a.walletLocalId === "string" ? a.walletLocalId : undefined,
        destWalletLocalId:
          typeof a.destWalletLocalId === "string" ? a.destWalletLocalId : undefined,
        title: String(a.title),
        wallet: typeof a.wallet === "string" ? a.wallet : "",
        date: typeof a.date === "string" ? a.date : "Today",
        amount: Number(a.amount) || 0,
        icon: typeof a.icon === "string" ? a.icon : "adjust",
        kind: typeof a.kind === "string" ? a.kind : "Other",
        attachments: Array.isArray(a.attachments)
          ? a.attachments.filter((x: unknown): x is string => typeof x === "string" && x.length > 0)
          : undefined,
        occurredAt: typeof a.occurredAt === "string" ? a.occurredAt : new Date().toISOString(),
        updatedAt: typeof a.updatedAt === "string" ? a.updatedAt : new Date().toISOString(),
        synced: false,
      }));

    const schedules: Schedule[] = Array.isArray(dataNode.schedules)
      ? dataNode.schedules.filter((s: any) => s && typeof s.id === "string" && typeof s.title === "string")
      : [];

    const rawProfile = dataNode.profile;
    const fullName =
      rawProfile && typeof rawProfile.fullName === "string" && rawProfile.fullName.trim()
        ? rawProfile.fullName.trim()
        : "Justin Santos";
    const parts = fullName.split(/\s+/);
    const initials =
      rawProfile && typeof rawProfile.initials === "string" && rawProfile.initials.trim()
        ? rawProfile.initials.trim().slice(0, 2).toUpperCase()
        : parts.length >= 2
          ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
          : fullName.slice(0, 2).toUpperCase();

    const rawBudget = Number(dataNode.monthlyBudget);
    const monthlyBudget = Number.isFinite(rawBudget) && rawBudget > 0 ? rawBudget : null;

    const categoryLimits: CategoryLimits =
      dataNode.categoryLimits && typeof dataNode.categoryLimits === "object"
        ? Object.fromEntries(
            Object.entries(dataNode.categoryLimits).filter(
              (entry): entry is [string, number] =>
                typeof entry[0] === "string" &&
                typeof entry[1] === "number" &&
                Number.isFinite(entry[1]) &&
                entry[1] > 0
            )
          )
        : {};

    const favorites: Favorite[] = Array.isArray(dataNode.favorites)
      ? dataNode.favorites.filter((f: any) => f && typeof f.id === "string" && typeof f.name === "string")
      : [];

    const payload: PitakaBackupPayload = {
      app: "pitaka",
      version: 1,
      exportedAt:
        typeof parsed?.exportedAt === "string"
          ? parsed.exportedAt
          : new Date().toISOString(),
      data: {
        wallets,
        activities,
        schedules,
        profile: { fullName, initials },
        leatherFinish:
          typeof dataNode.leatherFinish === "string" ? dataNode.leatherFinish : "navy",
        hidden: Boolean(dataNode.hidden),
        monthlyBudget,
        categoryLimits,
        favorites,
      },
    };

    return {
      canceled: false,
      payload,
      fileName: picked.result.name || "backup.json",
    };
  } catch (err: any) {
    return {
      canceled: false,
      error: err?.message || "Could not read backup file. Make sure it is valid JSON.",
    };
  }
}
