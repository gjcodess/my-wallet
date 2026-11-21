import { Platform } from "react-native";
import { getReminderOccurrences } from "../types/schedule";
import type { Schedule } from "../types/schedule";
import type { ActivityItem } from "../types/wallet";

const channelId = "scheduled-wallet-reminders";
const prefix = "wallet-reminder-";
let pending = Promise.resolve();

export const supportsReminders = Platform.OS === "android" || Platform.OS === "ios";

async function notifications() {
  const api = await import("expo-notifications");
  if (Platform.OS === "android") {
    await api.setNotificationChannelAsync(channelId, {
      name: "Bills and paydays",
      importance: api.AndroidImportance.DEFAULT,
    });
  }
  api.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false,
    }),
  });
  return api;
}

export async function requestReminderPermission(): Promise<boolean> {
  if (!supportsReminders) return false;
  try {
    const api = await notifications();
    const current = await api.getPermissionsAsync();
    const allowed = (status: typeof current) => status.granted ||
      status.ios?.status === api.IosAuthorizationStatus.PROVISIONAL;
    return allowed(current) || (current.canAskAgain && allowed(await api.requestPermissionsAsync()));
  } catch {
    return false;
  }
}

export function refreshReminders(schedules: Schedule[], activities: ActivityItem[]): Promise<void> {
  if (!supportsReminders) return Promise.resolve();
  const refresh = pending.catch(() => {}).then(async () => {
    const api = await notifications();
    const permissions = await api.getPermissionsAsync();
    const eligible = permissions.granted || permissions.ios?.status === api.IosAuthorizationStatus.PROVISIONAL;
    const occurrences = eligible ? getReminderOccurrences(schedules, activities) : [];
    const desired = new Map(occurrences.map((item) => [`${prefix}${item.id}-${item.direction}-${item.date.getTime()}`, item]));
    for (const { identifier } of await api.getAllScheduledNotificationsAsync()) {
      if (!identifier.startsWith(prefix)) continue;
      if (!desired.delete(identifier)) await api.cancelScheduledNotificationAsync(identifier);
    }
    for (const [identifier, { date, direction }] of desired) {
      await api.scheduleNotificationAsync({
        identifier,
        content: {
          title: "My Wallet reminder",
          body: direction === "expense" ? "You have a bill due today." : "You have income scheduled today.",
        },
        trigger: { type: api.SchedulableTriggerInputTypes.DATE, date, channelId },
      });
    }
  });
  pending = refresh;
  return refresh;
}
