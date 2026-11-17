import * as SQLite from "expo-sqlite";
import { supabase } from "./supabase";
import {
  ActivityItem,
  initialActivities,
  initialWallets,
  Tone,
  UserProfile,
  Wallet,
} from "../types/wallet";

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  dbInstance = await SQLite.openDatabaseAsync("my_wallet_v2.db");
  await dbInstance.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS kv_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS wallets (
      id INTEGER PRIMARY KEY NOT NULL,
      local_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      balance REAL NOT NULL DEFAULT 0,
      mark TEXT NOT NULL,
      tone TEXT NOT NULL DEFAULT 'blue',
      account TEXT NOT NULL DEFAULT 'Personal',
      logo_key TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY NOT NULL,
      local_id TEXT UNIQUE NOT NULL,
      wallet_local_id TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL,
      wallet TEXT NOT NULL,
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      icon TEXT NOT NULL,
      kind TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0
    );
  `);

  try {
    await dbInstance.execAsync(
      "ALTER TABLE wallets ADD COLUMN logo_key TEXT NOT NULL DEFAULT '';"
    );
  } catch {
    // Column already exists on fresh DBs
  }

  const countRow = await dbInstance.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM wallets"
  );
  if (!countRow || countRow.count === 0) {
    const now = new Date().toISOString();
    for (let i = 0; i < initialWallets.length; i++) {
      const w = initialWallets[i];
      await dbInstance.runAsync(
        `INSERT OR IGNORE INTO wallets (id, local_id, name, type, balance, mark, tone, account, logo_key, sort_order, updated_at, synced)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          w.id,
          w.localId || `wallet-${w.id}`,
          w.name,
          w.type,
          w.balance,
          w.mark,
          w.tone,
          w.account,
          w.logoKey || "",
          i,
          now,
        ]
      );
    }
    for (let i = 0; i < initialActivities.length; i++) {
      const a = initialActivities[i];
      await dbInstance.runAsync(
        `INSERT OR IGNORE INTO activities (id, local_id, wallet_local_id, title, wallet, date, amount, icon, kind, occurred_at, updated_at, synced)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          a.id,
          a.localId || `tx-${a.id}`,
          a.walletLocalId || "",
          a.title,
          a.wallet,
          a.date,
          a.amount,
          a.icon,
          a.kind,
          now,
          now,
        ]
      );
    }
  }

  return dbInstance;
}

export async function loadLocalState(): Promise<{
  wallets: Wallet[];
  activities: ActivityItem[];
  dark: boolean;
  hidden: boolean;
  profile: UserProfile;
  lastSyncedAt: string | null;
}> {
  const db = await getDb();
  const walletRows = await db.getAllAsync<{
    id: number;
    local_id: string;
    name: string;
    type: string;
    balance: number;
    mark: string;
    tone: string;
    account: string;
    logo_key?: string;
    updated_at: string;
    synced: number;
  }>("SELECT * FROM wallets ORDER BY sort_order ASC, id ASC");

  const activityRows = await db.getAllAsync<{
    id: number;
    local_id: string;
    wallet_local_id: string;
    title: string;
    wallet: string;
    date: string;
    amount: number;
    icon: string;
    kind: string;
    occurred_at: string;
    updated_at: string;
    synced: number;
  }>("SELECT * FROM activities ORDER BY id DESC");

  const settingsRows = await db.getAllAsync<{ key: string; value: string }>(
    "SELECT key, value FROM kv_settings"
  );
  const settingsMap = new Map(settingsRows.map((r) => [r.key, r.value]));

  const wallets: Wallet[] = walletRows.map((r) => ({
    id: r.id,
    localId: r.local_id,
    name: r.name,
    type: r.type,
    balance: Number(r.balance),
    mark: r.mark,
    tone: (r.tone as Tone) || "blue",
    account: r.account,
    logoKey: r.logo_key || undefined,
    updatedAt: r.updated_at,
    synced: r.synced === 1,
  }));

  const activities: ActivityItem[] = activityRows.map((r) => ({
    id: r.id,
    localId: r.local_id,
    walletLocalId: r.wallet_local_id,
    title: r.title,
    wallet: r.wallet,
    date: r.date,
    amount: Number(r.amount),
    icon: r.icon,
    kind: r.kind,
    occurredAt: r.occurred_at,
    updatedAt: r.updated_at,
    synced: r.synced === 1,
  }));

  return {
    wallets: wallets.length ? wallets : initialWallets,
    activities: activities.length ? activities : initialActivities,
    dark: settingsMap.get("dark_mode") === "true",
    hidden: settingsMap.get("hide_balances") === "true",
    profile: {
      fullName: settingsMap.get("full_name") || "Justin Santos",
      initials: settingsMap.get("initials") || "JS",
    },
    lastSyncedAt: settingsMap.get("last_synced_at") || null,
  };
}

export async function saveSettingToSQLite(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "INSERT OR REPLACE INTO kv_settings (key, value) VALUES (?, ?)",
    [key, value]
  );
}

export async function saveWalletsToSQLite(wallets: Wallet[]): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  for (let i = 0; i < wallets.length; i++) {
    const w = wallets[i];
    const localId = w.localId || `wallet-${w.id}`;
    await db.runAsync(
      `INSERT OR REPLACE INTO wallets (id, local_id, name, type, balance, mark, tone, account, logo_key, sort_order, updated_at, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        w.id,
        localId,
        w.name,
        w.type,
        w.balance,
        w.mark,
        w.tone,
        w.account,
        w.logoKey || "",
        i,
        w.updatedAt || now,
        w.synced ? 1 : 0,
      ]
    );
  }
}

export async function saveActivitiesToSQLite(activities: ActivityItem[]): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  for (const a of activities) {
    const localId = a.localId || `tx-${a.id}`;
    await db.runAsync(
      `INSERT OR REPLACE INTO activities (id, local_id, wallet_local_id, title, wallet, date, amount, icon, kind, occurred_at, updated_at, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        a.id,
        localId,
        a.walletLocalId || "",
        a.title,
        a.wallet,
        a.date,
        a.amount,
        a.icon,
        a.kind,
        a.occurredAt || now,
        a.updatedAt || now,
        a.synced ? 1 : 0,
      ]
    );
  }
}

export async function syncWithSupabase(params: {
  userId: string;
  wallets: Wallet[];
  activities: ActivityItem[];
  dark: boolean;
  hidden: boolean;
  profile: UserProfile;
}): Promise<{
  ok: boolean;
  message: string;
  wallets?: Wallet[];
  activities?: ActivityItem[];
  syncedAt?: string;
}> {
  const { userId, wallets, activities, dark, hidden, profile } = params;
  const now = new Date().toISOString();

  try {
    // 1. Upsert user profile
    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: userId,
        full_name: profile.fullName,
        initials: profile.initials,
        dark_mode: dark,
        hide_balances: hidden,
        updated_at: now,
      },
      { onConflict: "id" }
    );
    if (profileError) throw profileError;

    // 2. Upsert local wallets to Supabase PostgreSQL
    const walletPayload = wallets.map((w, index) => ({
      user_id: userId,
      local_id: w.localId || `wallet-${w.id}`,
      name: w.name,
      type: w.type,
      balance: w.balance,
      mark: w.mark,
      tone: w.tone,
      account: w.account,
      logo_key: w.logoKey || "",
      sort_order: index,
      updated_at: w.updatedAt || now,
    }));

    if (walletPayload.length > 0) {
      const { error: walletError } = await supabase
        .from("wallets")
        .upsert(walletPayload, { onConflict: "user_id,local_id" });
      if (walletError) throw walletError;
    }

    // 3. Upsert local activities to Supabase PostgreSQL
    const activityPayload = activities.map((a) => ({
      user_id: userId,
      local_id: a.localId || `tx-${a.id}`,
      wallet_local_id: a.walletLocalId || "",
      title: a.title,
      wallet: a.wallet,
      date_label: a.date,
      amount: a.amount,
      icon: a.icon,
      kind: a.kind,
      occurred_at: a.occurredAt || now,
      updated_at: a.updatedAt || now,
    }));

    if (activityPayload.length > 0) {
      const { error: activityError } = await supabase
        .from("activities")
        .upsert(activityPayload, { onConflict: "user_id,local_id" });
      if (activityError) throw activityError;
    }

    // 4. Fetch canonical merged wallets & activities from Supabase PostgreSQL
    const { data: remoteWallets, error: fetchWalletsErr } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("sort_order", { ascending: true });
    if (fetchWalletsErr) throw fetchWalletsErr;

    const { data: remoteActivities, error: fetchActErr } = await supabase
      .from("activities")
      .select("*")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("occurred_at", { ascending: false });
    if (fetchActErr) throw fetchActErr;

    const mergedWallets: Wallet[] = (remoteWallets || []).map((rw, idx) => {
      const existing = wallets.find(
        (lw) => (lw.localId || `wallet-${lw.id}`) === rw.local_id
      );
      return {
        id: existing ? existing.id : idx + 100,
        localId: rw.local_id,
        name: rw.name,
        type: rw.type,
        balance: Number(rw.balance),
        mark: rw.mark,
        tone: (rw.tone as Tone) || "blue",
        account: rw.account,
        logoKey: rw.logo_key || undefined,
        updatedAt: rw.updated_at,
        synced: true,
      };
    });

    const mergedActivities: ActivityItem[] = (remoteActivities || []).map(
      (ra, idx) => {
        const existing = activities.find(
          (la) => (la.localId || `tx-${la.id}`) === ra.local_id
        );
        return {
          id: existing ? existing.id : Date.now() + idx,
          localId: ra.local_id,
          walletLocalId: ra.wallet_local_id,
          title: ra.title,
          wallet: ra.wallet,
          date: ra.date_label,
          amount: Number(ra.amount),
          icon: ra.icon,
          kind: ra.kind,
          occurredAt: ra.occurred_at,
          updatedAt: ra.updated_at,
          synced: true,
        };
      }
    );

    if (mergedWallets.length > 0) {
      await saveWalletsToSQLite(mergedWallets);
    }
    if (mergedActivities.length > 0) {
      await saveActivitiesToSQLite(mergedActivities);
    }

    const syncedTimeLabel = new Intl.DateTimeFormat("en-PH", {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date());
    await saveSettingToSQLite("last_synced_at", syncedTimeLabel);

    return {
      ok: true,
      message: "Synced with Supabase Cloud",
      wallets: mergedWallets.length ? mergedWallets : wallets,
      activities: mergedActivities.length ? mergedActivities : activities,
      syncedAt: syncedTimeLabel,
    };
  } catch (err: any) {
    return {
      ok: false,
      message: err?.message || "Saved offline to SQLite",
    };
  }
}
