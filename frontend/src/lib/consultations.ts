// Server-side data access and validation for skincare consultation requests.
//
// Nothing the client sends is trusted: the skin type and every concern have to
// be one of the keys the form offers, and free text is trimmed and capped so
// the table can't be used as a dumping ground.

import { query, ensureSchema } from "./db";
import {
  Consultation,
  ConsultationCreate,
  ConsultationStatus,
  SKIN_CONCERNS,
  SKIN_TYPES,
  SkinConcern,
  SkinType,
} from "@/types";

export class ConsultationValidationError extends Error {}

/** Long enough for a real name or number, short enough to stay a field. */
const MAX_FIELD = 300;
/** The shopper's own description of their skin. A paragraph, not an essay. */
const MAX_NOTES = 2000;

function text(v: unknown, max = MAX_FIELD): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/** The same rule checkout uses: anything under seven digits is a typo. */
function digitsIn(phone: string): number {
  return phone.match(/\d/g)?.length ?? 0;
}

export function validateConsultation(body: unknown): ConsultationCreate {
  if (!body || typeof body !== "object")
    throw new ConsultationValidationError("Invalid request body.");
  const b = body as Record<string, unknown>;

  const name = text(b.name);
  if (!name) throw new ConsultationValidationError("A name is required.");

  const phone = text(b.phone);
  if (digitsIn(phone) < 7)
    throw new ConsultationValidationError("A valid phone number is required.");

  const skin = text(b.skin_type);
  if (!SKIN_TYPES.includes(skin as SkinType))
    throw new ConsultationValidationError("Choose a skin type.");

  // Unknown concerns are dropped rather than refused: a stale client sending
  // one the form no longer offers should still get its consultation booked.
  const raw = Array.isArray(b.concerns) ? b.concerns : [];
  const concerns = [
    ...new Set(
      raw.filter((c): c is SkinConcern =>
        SKIN_CONCERNS.includes(c as SkinConcern),
      ),
    ),
  ];

  return {
    name,
    phone,
    age: text(b.age, 40),
    skin_type: skin as SkinType,
    concerns,
    notes: text(b.notes, MAX_NOTES),
  };
}

interface Row {
  id: string | number;
  name: string;
  phone: string;
  age: string;
  skin_type: string;
  concerns: unknown;
  notes: string;
  status: string;
  created_at: Date | string;
}

function toConsultation(r: Row): Consultation {
  return {
    id: Number(r.id),
    name: r.name,
    phone: r.phone,
    age: r.age,
    skin_type: r.skin_type as SkinType,
    concerns: Array.isArray(r.concerns) ? (r.concerns as SkinConcern[]) : [],
    notes: r.notes,
    status: r.status as ConsultationStatus,
    created_at:
      r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
  };
}

export async function createConsultation(
  input: ConsultationCreate,
): Promise<Consultation> {
  await ensureSchema();
  const { rows } = await query<Row>(
    `INSERT INTO consultations (name, phone, age, skin_type, concerns, notes)
     VALUES ($1,$2,$3,$4,$5::jsonb,$6)
     RETURNING *`,
    [
      input.name,
      input.phone,
      input.age,
      input.skin_type,
      JSON.stringify(input.concerns),
      input.notes,
    ],
  );
  return toConsultation(rows[0]);
}

/** Newest first — the one that just came in is the one being answered. */
export async function listConsultations(): Promise<Consultation[]> {
  await ensureSchema();
  const { rows } = await query<Row>(
    `SELECT * FROM consultations ORDER BY created_at DESC, id DESC`,
  );
  return rows.map(toConsultation);
}

export async function setConsultationStatus(
  id: number,
  status: ConsultationStatus,
): Promise<Consultation | null> {
  await ensureSchema();
  const { rows } = await query<Row>(
    `UPDATE consultations SET status = $2 WHERE id = $1 RETURNING *`,
    [id, status],
  );
  return rows[0] ? toConsultation(rows[0]) : null;
}

export async function deleteConsultation(id: number): Promise<boolean> {
  await ensureSchema();
  const { rowCount } = await query(`DELETE FROM consultations WHERE id = $1`, [
    id,
  ]);
  return (rowCount ?? 0) > 0;
}
