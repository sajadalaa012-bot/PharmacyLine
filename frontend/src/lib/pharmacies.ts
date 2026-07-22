// Server-side data access for the pharmacy directory. Pharmacies and their
// folders live in the shared Postgres database, so the admin sees the same
// board on every device. All queries are parameterized; admin auth is enforced
// by the API routes that call these functions.

import { getPool, ensureSchema } from "./db";
import { Pharmacy, PharmacyFolder } from "@/types";
import { LatLng } from "./geo";
import { resolveLocation } from "./geocode";

export class PharmacyValidationError extends Error {}

type Row = Record<string, unknown>;

function mapFolder(r: Row): PharmacyFolder {
  return { id: Number(r.id), name: String(r.name) };
}

function mapPharmacy(r: Row): Pharmacy {
  return {
    id: Number(r.id),
    folder_id: r.folder_id == null ? null : Number(r.folder_id),
    name: String(r.name),
    phone: String(r.phone ?? ""),
    location: String(r.location ?? ""),
    notes: String(r.notes ?? ""),
    lat: r.lat == null ? null : Number(r.lat),
    lng: r.lng == null ? null : Number(r.lng),
  };
}

// ── Folders ──────────────────────────────────────────────────────────

export async function listFolders(): Promise<PharmacyFolder[]> {
  await ensureSchema();
  const res = await getPool().query(
    "SELECT id, name FROM pharmacy_folders ORDER BY name ASC, id ASC",
  );
  return res.rows.map(mapFolder);
}

export async function createFolder(name: string): Promise<PharmacyFolder> {
  const clean = name.trim();
  if (!clean) throw new PharmacyValidationError("Folder name is required.");
  await ensureSchema();
  const res = await getPool().query(
    "INSERT INTO pharmacy_folders (name) VALUES ($1) RETURNING id, name",
    [clean],
  );
  return mapFolder(res.rows[0]);
}

export async function renameFolder(
  id: number,
  name: string,
): Promise<PharmacyFolder | null> {
  const clean = name.trim();
  if (!clean) throw new PharmacyValidationError("Folder name is required.");
  await ensureSchema();
  const res = await getPool().query(
    "UPDATE pharmacy_folders SET name = $1 WHERE id = $2 RETURNING id, name",
    [clean, id],
  );
  return res.rows[0] ? mapFolder(res.rows[0]) : null;
}

/** Delete a folder; its pharmacies remain (folder_id set to NULL by the FK). */
export async function deleteFolder(id: number): Promise<boolean> {
  await ensureSchema();
  const res = await getPool().query(
    "DELETE FROM pharmacy_folders WHERE id = $1",
    [id],
  );
  return (res.rowCount ?? 0) > 0;
}

// ── Pharmacies ───────────────────────────────────────────────────────

export interface PharmacyInput {
  folder_id: number | null;
  name: string;
  phone: string;
  location: string;
  notes: string;
  /** An exact pin (dragged on the map). When set it wins over geocoding. */
  coords: LatLng | null;
}

export function validatePharmacyInput(body: unknown): PharmacyInput {
  if (!body || typeof body !== "object")
    throw new PharmacyValidationError("Invalid request body.");
  const b = body as Record<string, unknown>;
  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name) throw new PharmacyValidationError("Pharmacy name is required.");

  let folder_id: number | null = null;
  if (b.folder_id != null && b.folder_id !== "") {
    const n = Number(b.folder_id);
    folder_id = Number.isInteger(n) && n > 0 ? n : null;
  }

  let coords: LatLng | null = null;
  const lat = Number(b.lat);
  const lng = Number(b.lng);
  if (
    b.lat != null &&
    b.lng != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  ) {
    coords = { lat, lng };
  }

  return {
    folder_id,
    name,
    phone: typeof b.phone === "string" ? b.phone.trim() : "",
    location: typeof b.location === "string" ? b.location.trim() : "",
    notes: typeof b.notes === "string" ? b.notes.trim() : "",
    coords,
  };
}

export async function listPharmacies(): Promise<Pharmacy[]> {
  await ensureSchema();
  const res = await getPool().query(
    "SELECT * FROM pharmacies ORDER BY name ASC, id ASC",
  );
  return res.rows.map(mapPharmacy);
}

export async function createPharmacy(
  input: PharmacyInput,
): Promise<Pharmacy> {
  await ensureSchema();
  const pin = input.coords ?? (await resolveLocation(input.location));
  const res = await getPool().query(
    `INSERT INTO pharmacies (folder_id, name, phone, location, notes, lat, lng)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [
      input.folder_id,
      input.name,
      input.phone,
      input.location,
      input.notes,
      pin?.lat ?? null,
      pin?.lng ?? null,
    ],
  );
  return mapPharmacy(res.rows[0]);
}

export async function updatePharmacy(
  id: number,
  input: PharmacyInput,
): Promise<Pharmacy | null> {
  await ensureSchema();
  const before = await getPool().query(
    "SELECT location, lat, lng FROM pharmacies WHERE id = $1",
    [id],
  );
  if (!before.rows[0]) return null;
  const prev = before.rows[0] as { location: string; lat: unknown; lng: unknown };
  const hadPin = prev.lat != null && prev.lng != null;
  const sameLocation = String(prev.location ?? "") === input.location;

  // Re-geocode only when there is something new to resolve: an explicit pin
  // always wins, an unchanged location keeps the pin it already had.
  let pin: LatLng | null;
  if (input.coords) pin = input.coords;
  else if (sameLocation && hadPin)
    pin = { lat: Number(prev.lat), lng: Number(prev.lng) };
  else pin = await resolveLocation(input.location);

  const res = await getPool().query(
    `UPDATE pharmacies
       SET folder_id = $1, name = $2, phone = $3, location = $4, notes = $5,
           lat = $6, lng = $7
     WHERE id = $8 RETURNING *`,
    [
      input.folder_id,
      input.name,
      input.phone,
      input.location,
      input.notes,
      pin?.lat ?? null,
      pin?.lng ?? null,
      id,
    ],
  );
  return res.rows[0] ? mapPharmacy(res.rows[0]) : null;
}

export async function deletePharmacy(id: number): Promise<boolean> {
  await ensureSchema();
  const res = await getPool().query("DELETE FROM pharmacies WHERE id = $1", [id]);
  return (res.rowCount ?? 0) > 0;
}
