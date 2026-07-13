"use client";

import { useState, useEffect, useCallback } from "react";
import { Pharmacy } from "@/types";
import {
  fetchPharmacies,
  createPharmacy,
  updatePharmacy,
  deletePharmacy,
} from "@/lib/api";
import {
  Plus,
  Edit3,
  Trash2,
  Check,
  X,
  Phone,
  MapPin,
  ExternalLink,
  StickyNote,
} from "lucide-react";

/** Build a keyless Google Maps embed URL from an address, coordinates, or link. */
function mapEmbedUrl(location: string): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(
    location,
  )}&z=15&output=embed`;
}

/** Build an "open in Google Maps" link from the same location string. */
function mapLinkUrl(location: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    location,
  )}`;
}

const EMPTY = { name: "", phone: "", location: "", notes: "" };

export default function AdminPharmaciesPage() {
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The add/edit form. editingId === null while adding a new entry.
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setPharmacies(await fetchPharmacies());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = useCallback(
    async (fn: () => Promise<void>) => {
      setBusy(true);
      setError(null);
      try {
        await fn();
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [load],
  );

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY);
    setFormOpen(true);
  };

  const openEdit = (p: Pharmacy) => {
    setEditingId(p.id);
    setForm({ name: p.name, phone: p.phone, location: p.location, notes: p.notes });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) return;
    const payload = {
      name,
      phone: form.phone.trim(),
      location: form.location.trim(),
      notes: form.notes.trim(),
    };
    run(async () => {
      if (editingId === null) await createPharmacy(payload);
      else await updatePharmacy(editingId, payload);
      closeForm();
    });
  };

  const handleDelete = (p: Pharmacy) => {
    if (pendingDelete !== p.id) {
      setPendingDelete(p.id);
      setTimeout(
        () => setPendingDelete((cur) => (cur === p.id ? null : cur)),
        3500,
      );
      return;
    }
    setPendingDelete(null);
    run(async () => {
      await deletePharmacy(p.id);
    });
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand/25 border-t-brand" />
      </div>
    );
  }

  const field =
    "h-10 w-full rounded-md border border-line bg-sunken px-3.5 text-sm text-ink outline-none transition placeholder:text-ink-3 focus:border-brand/50 focus:ring-1 focus:ring-brand/25";

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6 sm:py-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
            Pharmacies
          </h1>
          <p className="mt-1 text-xs text-ink-3">
            Directory board — name, phone, map location, and notes
          </p>
        </div>
        {!formOpen && (
          <button
            type="button"
            onClick={openAdd}
            className="label-caps flex h-10 shrink-0 items-center gap-1.5 rounded-md bg-brand px-4 text-on-brand transition hover:bg-brand-deep active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            Add pharmacy
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-rose/30 bg-rose/10 p-3 text-xs text-rose">
          {error}
        </div>
      )}

      {/* Add / edit form */}
      {formOpen && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-lg border border-line bg-surface p-5"
        >
          <div className="flex items-center justify-between">
            <h2 className="label-caps text-ink-2">
              {editingId === null ? "New pharmacy" : "Edit pharmacy"}
            </h2>
            <button
              type="button"
              onClick={closeForm}
              aria-label="Close form"
              className="flex h-8 w-8 items-center justify-center rounded-md text-ink-3 transition hover:bg-sunken hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="label-caps text-ink-3">Pharmacy name</span>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Al-Shifa Pharmacy"
                autoFocus
                disabled={busy}
                className={field}
              />
            </label>

            <label className="space-y-1.5">
              <span className="label-caps text-ink-3">Phone number</span>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="e.g. +964 770 000 0000"
                disabled={busy}
                className={field}
              />
            </label>
          </div>

          <label className="block space-y-1.5">
            <span className="label-caps text-ink-3">Map location</span>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Address, coordinates, or a Google Maps link"
              disabled={busy}
              className={field}
            />
            <span className="text-[11px] text-ink-3">
              Paste an address, GPS coordinates (e.g. 33.3152, 44.3661), or a
              Google Maps link — a map preview appears on the card.
            </span>
          </label>

          <label className="block space-y-1.5">
            <span className="label-caps text-ink-3">Notes</span>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Opening hours, contact person, delivery notes…"
              rows={3}
              disabled={busy}
              className="w-full resize-y rounded-md border border-line bg-sunken px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink-3 focus:border-brand/50 focus:ring-1 focus:ring-brand/25"
            />
          </label>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeForm}
              disabled={busy}
              className="label-caps flex h-10 items-center rounded-md px-4 text-ink-2 transition hover:bg-sunken"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !form.name.trim()}
              className="label-caps flex h-10 items-center gap-1.5 rounded-md bg-brand px-4 text-on-brand transition hover:bg-brand-deep active:scale-[0.98] disabled:opacity-40"
            >
              <Check className="h-4 w-4" />
              {editingId === null ? "Save pharmacy" : "Save changes"}
            </button>
          </div>
        </form>
      )}

      {/* Board */}
      {pharmacies.length === 0 && !formOpen ? (
        <div className="rounded-lg border border-dashed border-line bg-surface px-6 py-16 text-center">
          <MapPin className="mx-auto h-8 w-8 text-ink-3" />
          <p className="mt-3 text-sm font-semibold text-ink">
            No pharmacies yet
          </p>
          <p className="mt-1 text-xs text-ink-3">
            Add a pharmacy to start building your directory board.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {pharmacies.map((p) => (
            <article
              key={p.id}
              className="flex flex-col overflow-hidden rounded-lg border border-line bg-surface"
            >
              {/* Map preview */}
              {p.location ? (
                <iframe
                  title={`Map — ${p.name}`}
                  src={mapEmbedUrl(p.location)}
                  loading="lazy"
                  className="h-40 w-full border-0"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : (
                <div className="flex h-40 w-full items-center justify-center bg-sunken">
                  <span className="label-caps text-ink-3">No location set</span>
                </div>
              )}

              <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="min-w-0 truncate font-display text-lg font-semibold tracking-tight text-ink">
                    {p.name}
                  </h3>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => openEdit(p)}
                      disabled={busy}
                      title="Edit pharmacy"
                      className="flex h-8 w-8 items-center justify-center rounded-md text-ink-2 transition hover:bg-brand/15 hover:text-brand"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(p)}
                      disabled={busy}
                      title={
                        pendingDelete === p.id
                          ? "Click again to confirm"
                          : "Delete pharmacy"
                      }
                      className={`flex h-8 items-center justify-center gap-1 rounded-md transition ${
                        pendingDelete === p.id
                          ? "label-caps animate-pulse bg-rose px-2 text-white"
                          : "w-8 text-ink-2 hover:bg-rose/15 hover:text-rose"
                      }`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {pendingDelete === p.id && "Sure?"}
                    </button>
                  </div>
                </div>

                {p.phone && (
                  <a
                    href={`tel:${p.phone.replace(/\s+/g, "")}`}
                    className="flex items-center gap-2 text-sm font-medium text-ink-2 transition hover:text-brand"
                  >
                    <Phone className="h-3.5 w-3.5 shrink-0 text-brand" />
                    <span className="truncate tabular-nums">{p.phone}</span>
                  </a>
                )}

                {p.location && (
                  <a
                    href={mapLinkUrl(p.location)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-ink-2 transition hover:text-brand"
                  >
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-brand" />
                    <span className="min-w-0 truncate">{p.location}</span>
                    <ExternalLink className="h-3 w-3 shrink-0 text-ink-3" />
                  </a>
                )}

                {p.notes && (
                  <div className="mt-auto flex gap-2 rounded-md bg-sunken/60 p-3">
                    <StickyNote className="h-3.5 w-3.5 shrink-0 text-ink-3" />
                    <p className="whitespace-pre-wrap text-xs leading-relaxed text-ink-2">
                      {p.notes}
                    </p>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
