// Small server-side key/value store for things an admin configures at
// runtime — settings that would otherwise need a redeploy to change.
//
// Deliberately not a place for secrets you can keep in the environment: the
// Telegram bot token is read from TELEGRAM_BOT_TOKEN first and only falls back
// to this table for shops with no way to set environment variables. See
// lib/telegram.ts.

import { ensureSchema, query } from "./db";

export async function getSetting(key: string): Promise<string | null> {
  await ensureSchema();
  const res = await query<{ value: string }>(
    "SELECT value FROM app_settings WHERE key = $1",
    [key],
  );
  return res.rows[0]?.value ?? null;
}

/** Writes a value, or clears it when `value` is null/empty. */
export async function setSetting(
  key: string,
  value: string | null,
): Promise<void> {
  await ensureSchema();
  if (value === null || value === "") {
    await query("DELETE FROM app_settings WHERE key = $1", [key]);
    return;
  }
  await query(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES ($1, $2, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [key, value],
  );
}

/** A setting holding a JSON array of strings — returns [] for anything else. */
export async function getStringList(key: string): Promise<string[]> {
  const raw = await getSetting(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === "string")
      : [];
  } catch {
    return [];
  }
}

export function setStringList(key: string, values: string[]): Promise<void> {
  return setSetting(key, JSON.stringify(values));
}
