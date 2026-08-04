"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Pharmacy, PharmacyFolder } from "@/types";
import {
  fetchPharmacies,
  createPharmacy,
  updatePharmacy,
  deletePharmacy,
  fetchPharmacyFolders,
  createPharmacyFolder,
  renamePharmacyFolder,
  deletePharmacyFolder,
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
  Folder,
  FolderPlus,
  Layers,
  Map as MapIcon,
} from "lucide-react";
import { useI18n } from "@/lib/LanguageProvider";

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

// Special filter values for the folder rail.
const ALL = "all";
const UNFILED = "unfiled";

export default function AdminPharmaciesPage() {
  const { t } = useI18n();
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [folders, setFolders] = useState<PharmacyFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Which folder the board is filtered to: ALL, UNFILED, or a folder id.
  const [selected, setSelected] = useState<string | number>(ALL);

  // The add/edit form. editingId === null while adding a new entry.
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [formFolder, setFormFolder] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);

  // Folder management UI.
  const [newFolderName, setNewFolderName] = useState("");
  const [addingFolder, setAddingFolder] = useState(false);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [pendingFolderDelete, setPendingFolderDelete] = useState<number | null>(
    null,
  );

  const load = useCallback(async () => {
    try {
      const [ph, fo] = await Promise.all([
        fetchPharmacies(),
        fetchPharmacyFolders(),
      ]);
      setPharmacies(ph);
      setFolders(fo);
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

  const folderName = useCallback(
    (id: number | null) =>
      id == null
        ? t("pharm.unfiled")
        : folders.find((f) => f.id === id)?.name ?? t("pharm.unfiled"),
    [folders, t],
  );

  const counts = useMemo(() => {
    const map = new Map<number | null, number>();
    for (const p of pharmacies)
      map.set(p.folder_id, (map.get(p.folder_id) ?? 0) + 1);
    return map;
  }, [pharmacies]);

  const visible = useMemo(() => {
    if (selected === ALL) return pharmacies;
    if (selected === UNFILED) return pharmacies.filter((p) => p.folder_id == null);
    return pharmacies.filter((p) => p.folder_id === selected);
  }, [pharmacies, selected]);

  // ── Pharmacy form ──────────────────────────────────────────────────

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY);
    // Default the new pharmacy into the folder currently being viewed.
    setFormFolder(typeof selected === "number" ? selected : null);
    setFormOpen(true);
  };

  const openEdit = (p: Pharmacy) => {
    setEditingId(p.id);
    setForm({ name: p.name, phone: p.phone, location: p.location, notes: p.notes });
    setFormFolder(p.folder_id);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY);
    setFormFolder(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) return;
    const payload = {
      folder_id: formFolder,
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

  // ── Folder management ──────────────────────────────────────────────

  const handleAddFolder = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newFolderName.trim();
    if (!name) return;
    run(async () => {
      const created = await createPharmacyFolder(name);
      setNewFolderName("");
      setAddingFolder(false);
      setSelected(created.id);
    });
  };

  const startRename = (f: PharmacyFolder) => {
    setRenamingId(f.id);
    setRenameValue(f.name);
  };

  const handleRename = (e: React.FormEvent) => {
    e.preventDefault();
    const id = renamingId;
    const name = renameValue.trim();
    if (id === null || !name) return;
    run(async () => {
      await renamePharmacyFolder(id, name);
      setRenamingId(null);
      setRenameValue("");
    });
  };

  const handleDeleteFolder = (f: PharmacyFolder) => {
    if (pendingFolderDelete !== f.id) {
      setPendingFolderDelete(f.id);
      setTimeout(
        () => setPendingFolderDelete((cur) => (cur === f.id ? null : cur)),
        3500,
      );
      return;
    }
    setPendingFolderDelete(null);
    run(async () => {
      await deletePharmacyFolder(f.id);
      setSelected((cur) => (cur === f.id ? ALL : cur));
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

  const unfiledCount = counts.get(null) ?? 0;

  // A folder chip/row in the rail.
  const railBtn = (
    key: string,
    value: string | number,
    icon: React.ReactNode,
    label: string,
    count: number,
  ) => {
    const active = selected === value;
    return (
      <button
        key={key}
        type="button"
        onClick={() => setSelected(value)}
        className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-start text-[13px] font-semibold transition-colors ${
          active
            ? "bg-brand text-on-brand"
            : "text-ink-2 hover:bg-sunken hover:text-ink"
        }`}
      >
        <span className="shrink-0">{icon}</span>
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <span
          className={`shrink-0 rounded-full px-1.5 text-[11px] tabular-nums ${
            active ? "bg-white/20 text-on-brand" : "bg-sunken text-ink-3"
          }`}
        >
          {count}
        </span>
      </button>
    );
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6 sm:py-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
            {t("pharm.title")}
          </h1>
          <p className="mt-1 text-xs text-ink-3">{t("pharm.subtitle")}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/admin/map"
            className="label-caps flex h-10 items-center gap-1.5 rounded-md border border-line bg-surface px-3 text-ink-2 transition hover:text-ink"
          >
            <MapIcon className="h-4 w-4" />
            {t("pharm.visitMap")}
          </Link>
          {!formOpen && (
            <button
              type="button"
              onClick={openAdd}
              className="label-caps flex h-10 items-center gap-1.5 rounded-md bg-brand px-4 text-on-brand transition hover:bg-brand-deep active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              {t("pharm.addPharmacy")}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-rose/30 bg-rose/10 p-3 text-xs text-rose">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[15rem_1fr]">
        {/* Folder rail */}
        <aside className="space-y-2 lg:sticky lg:top-6 lg:self-start">
          <div className="space-y-1 rounded-lg border border-line bg-surface p-2">
            {railBtn(
              ALL,
              ALL,
              <Layers className="h-4 w-4" />,
              t("pharm.allPharmacies"),
              pharmacies.length,
            )}
            {railBtn(
              UNFILED,
              UNFILED,
              <Folder className="h-4 w-4" />,
              t("pharm.unfiled"),
              unfiledCount,
            )}

            <div className="my-1 border-t border-line" />

            {folders.map((f) => (
              <div key={f.id} className="group/f">
                {renamingId === f.id ? (
                  <form
                    onSubmit={handleRename}
                    className="flex items-center gap-1 px-1 py-1"
                  >
                    <input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      autoFocus
                      disabled={busy}
                      className="h-8 w-full rounded-md border border-line bg-sunken px-2 text-[13px] text-ink outline-none focus:border-brand/50"
                    />
                    <button
                      type="submit"
                      disabled={busy || !renameValue.trim()}
                      aria-label={t("categories.saveName")}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-brand hover:bg-brand/15 disabled:opacity-40"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRenamingId(null)}
                      aria-label={t("categories.cancelRename")}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-3 hover:bg-sunken"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-1">
                    <div className="min-w-0 flex-1">
                      {railBtn(
                        `folder-${f.id}`,
                        f.id,
                        <Folder className="h-4 w-4" />,
                        f.name,
                        counts.get(f.id) ?? 0,
                      )}
                    </div>
                    <div className="flex shrink-0 items-center opacity-0 transition group-hover/f:opacity-100">
                      <button
                        type="button"
                        onClick={() => startRename(f)}
                        title={t("pharm.renameFolder")}
                        disabled={busy}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-ink-3 transition hover:bg-brand/15 hover:text-brand"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteFolder(f)}
                        title={
                          pendingFolderDelete === f.id
                            ? t("common.clickAgain")
                            : t("pharm.deleteFolder")
                        }
                        disabled={busy}
                        className={`flex h-7 items-center justify-center rounded-md transition ${
                          pendingFolderDelete === f.id
                            ? "w-auto animate-pulse bg-rose px-1.5 text-[10px] font-bold text-white"
                            : "w-7 text-ink-3 hover:bg-rose/15 hover:text-rose"
                        }`}
                      >
                        {pendingFolderDelete === f.id ? (
                          t("common.sure")
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Add folder */}
            {addingFolder ? (
              <form
                onSubmit={handleAddFolder}
                className="flex items-center gap-1 px-1 py-1"
              >
                <input
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder={t("pharm.folderName")}
                  autoFocus
                  disabled={busy}
                  className="h-8 w-full rounded-md border border-line bg-sunken px-2 text-[13px] text-ink outline-none placeholder:text-ink-3 focus:border-brand/50"
                />
                <button
                  type="submit"
                  disabled={busy || !newFolderName.trim()}
                  aria-label={t("pharm.createFolder")}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-brand hover:bg-brand/15 disabled:opacity-40"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddingFolder(false);
                    setNewFolderName("");
                  }}
                  aria-label={t("common.cancel")}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-3 hover:bg-sunken"
                >
                  <X className="h-4 w-4" />
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setAddingFolder(true)}
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-start text-[13px] font-semibold text-ink-3 transition-colors hover:bg-sunken hover:text-ink"
              >
                <FolderPlus className="h-4 w-4 shrink-0" />
                {t("pharm.newFolder")}
              </button>
            )}
          </div>
        </aside>

        {/* Main column */}
        <div className="space-y-5">
          {/* Add / edit form */}
          {formOpen && (
            <form
              onSubmit={handleSubmit}
              className="space-y-4 rounded-lg border border-line bg-surface p-5"
            >
              <div className="flex items-center justify-between">
                <h2 className="label-caps text-ink-2">
                  {editingId === null
                    ? t("pharm.newPharmacy")
                    : t("pharm.editPharmacy")}
                </h2>
                <button
                  type="button"
                  onClick={closeForm}
                  aria-label={t("pharm.closeForm")}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-ink-3 transition hover:bg-sunken hover:text-ink"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="label-caps text-ink-3">{t("pharm.name")}</span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder={t("pharm.namePlaceholder")}
                    autoFocus
                    disabled={busy}
                    className={field}
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="label-caps text-ink-3">{t("pharm.folder")}</span>
                  <select
                    value={formFolder ?? ""}
                    onChange={(e) =>
                      setFormFolder(
                        e.target.value === "" ? null : Number(e.target.value),
                      )
                    }
                    disabled={busy}
                    className={field}
                  >
                    <option value="">{t("pharm.unfiled")}</option>
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1.5 sm:col-span-2">
                  <span className="label-caps text-ink-3">{t("pharm.phone")}</span>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder={t("pharm.phonePlaceholder")}
                    disabled={busy}
                    dir="ltr"
                    className={field}
                  />
                </label>
              </div>

              <label className="block space-y-1.5">
                <span className="label-caps text-ink-3">{t("pharm.location")}</span>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) =>
                    setForm({ ...form, location: e.target.value })
                  }
                  placeholder={t("pharm.locationPlaceholder")}
                  disabled={busy}
                  className={field}
                />
                <span className="text-[11px] text-ink-3">
                  {t("pharm.locationHint")}
                </span>
              </label>

              <label className="block space-y-1.5">
                <span className="label-caps text-ink-3">{t("common.notes")}</span>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder={t("pharm.notesPlaceholder")}
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
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={busy || !form.name.trim()}
                  className="label-caps flex h-10 items-center gap-1.5 rounded-md bg-brand px-4 text-on-brand transition hover:bg-brand-deep active:scale-[0.98] disabled:opacity-40"
                >
                  <Check className="h-4 w-4" />
                  {editingId === null
                    ? t("pharm.savePharmacy")
                    : t("modal.saveChanges")}
                </button>
              </div>
            </form>
          )}

          {/* Board */}
          {visible.length === 0 && !formOpen ? (
            <div className="rounded-lg border border-dashed border-line bg-surface px-6 py-16 text-center">
              <MapPin className="mx-auto h-8 w-8 text-ink-3" />
              <p className="mt-3 text-sm font-semibold text-ink">
                {pharmacies.length === 0
                  ? t("pharm.none")
                  : t("pharm.folderEmpty")}
              </p>
              <p className="mt-1 text-xs text-ink-3">{t("pharm.emptyHint")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {visible.map((p) => (
                <article
                  key={p.id}
                  className="flex flex-col overflow-hidden rounded-lg border border-line bg-surface"
                >
                  {/* Map preview */}
                  {p.location ? (
                    <iframe
                      title={t("pharm.mapTitle", { name: p.name })}
                      src={mapEmbedUrl(p.location)}
                      loading="lazy"
                      className="h-40 w-full border-0"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  ) : (
                    <div className="flex h-40 w-full items-center justify-center bg-sunken">
                      <span className="label-caps text-ink-3">
                        {t("pharm.noLocation")}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-1 flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate font-display text-lg font-semibold tracking-tight text-ink">
                          <bdi>{p.name}</bdi>
                        </h3>
                        <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-ink-3">
                          <Folder className="h-3 w-3" />
                          {folderName(p.folder_id)}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={() => openEdit(p)}
                          disabled={busy}
                          title={t("pharm.editPharmacy")}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-ink-2 transition hover:bg-brand/15 hover:text-brand"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          disabled={busy}
                          title={
                            pendingDelete === p.id
                              ? t("common.clickAgain")
                              : t("pharm.deletePharmacy")
                          }
                          className={`flex h-8 items-center justify-center gap-1 rounded-md transition ${
                            pendingDelete === p.id
                              ? "label-caps animate-pulse bg-rose px-2 text-white"
                              : "w-8 text-ink-2 hover:bg-rose/15 hover:text-rose"
                          }`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {pendingDelete === p.id && t("common.sure")}
                        </button>
                      </div>
                    </div>

                    {p.phone && (
                      <a
                        href={`tel:${p.phone.replace(/\s+/g, "")}`}
                        className="flex items-center gap-2 text-sm font-medium text-ink-2 transition hover:text-brand"
                      >
                        <Phone className="h-3.5 w-3.5 shrink-0 text-brand" />
                        <span className="truncate tabular-nums" dir="ltr">
                          {p.phone}
                        </span>
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
      </div>
    </div>
  );
}
