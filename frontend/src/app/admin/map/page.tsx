"use client";

// Visit map — every pharmacy in the directory on one map, so the round can be
// planned (and remembered) at a glance.

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Pharmacy, PharmacyFolder, MappedPharmacy } from "@/types";
import {
  fetchPharmacies,
  fetchPharmacyFolders,
  locatePharmacy,
  movePharmacyPin,
} from "@/lib/api";
import { pinColor, directionsUrl } from "@/lib/geo";
import PharmacyMap from "@/components/admin/PharmacyMap";
import {
  MapPin,
  Search,
  Phone,
  Navigation,
  Move,
  Lock,
  RefreshCw,
  AlertTriangle,
  Layers,
  Folder,
} from "lucide-react";

const ALL = "all";
const UNFILED = "unfiled";

const isMapped = (p: Pharmacy): p is MappedPharmacy =>
  p.lat != null && p.lng != null;

export default function AdminMapPage() {
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [folders, setFolders] = useState<PharmacyFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<string | number>(ALL);
  const [search, setSearch] = useState("");
  const [focusId, setFocusId] = useState<number | null>(null);
  const [editPins, setEditPins] = useState(false);

  // ids currently being geocoded, so each row can show its own spinner
  const [locating, setLocating] = useState<number[]>([]);

  const load = useCallback(async () => {
    try {
      const [ph, fo] = await Promise.all([
        fetchPharmacies(),
        fetchPharmacyFolders(),
      ]);
      setPharmacies(ph);
      setFolders(fo);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const folderName = useCallback(
    (id: number | null) =>
      id == null
        ? "Unfiled"
        : folders.find((f) => f.id === id)?.name ?? "Unfiled",
    [folders],
  );

  const inFolder = useCallback(
    (p: Pharmacy) => {
      if (selected === ALL) return true;
      if (selected === UNFILED) return p.folder_id == null;
      return p.folder_id === selected;
    },
    [selected],
  );

  const matches = useCallback(
    (p: Pharmacy) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q) ||
        p.notes.toLowerCase().includes(q) ||
        p.phone.includes(q)
      );
    },
    [search],
  );

  const visible = useMemo(
    () => pharmacies.filter((p) => inFolder(p) && matches(p)),
    [pharmacies, inFolder, matches],
  );

  const pinned = useMemo(() => visible.filter(isMapped), [visible]);
  const unpinned = useMemo(() => visible.filter((p) => !isMapped(p)), [visible]);
  const totalPinned = useMemo(
    () => pharmacies.filter(isMapped).length,
    [pharmacies],
  );

  // ── Actions ──────────────────────────────────────────────────────────

  /** Ask the server to resolve a pharmacy's location text into a pin. */
  const locate = useCallback(async (p: Pharmacy) => {
    setLocating((cur) => [...cur, p.id]);
    setError(null);
    try {
      const updated = await locatePharmacy(p);
      setPharmacies((cur) =>
        cur.map((x) => (x.id === updated.id ? updated : x)),
      );
      if (updated.lat == null) {
        setError(
          `Couldn't place "${p.name}" from "${p.location || "no location"}". ` +
            "Try pasting a Google Maps link or coordinates on the Pharmacies page.",
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLocating((cur) => cur.filter((id) => id !== p.id));
    }
  }, []);

  /** Resolve every unpinned pharmacy, one at a time (geocoder rate limit). */
  const locateAll = useCallback(async () => {
    for (const p of unpinned) {
      if (!p.location) continue;
      await locate(p);
    }
  }, [unpinned, locate]);

  /** Persist a pin the admin dragged to a new spot. */
  const handleMove = useCallback(
    async (p: MappedPharmacy, lat: number, lng: number) => {
      setPharmacies((cur) =>
        cur.map((x) => (x.id === p.id ? { ...x, lat, lng } : x)),
      );
      try {
        await movePharmacyPin(p, lat, lng);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        load(); // roll back to whatever the server has
      }
    },
    [load],
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand/25 border-t-brand" />
      </div>
    );
  }

  const chip = (value: string | number, label: string, count: number) => {
    const active = selected === value;
    return (
      <button
        key={String(value)}
        type="button"
        onClick={() => setSelected(value)}
        className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition ${
          active
            ? "border-brand bg-brand text-on-brand"
            : "border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink"
        }`}
      >
        {value === ALL ? (
          <Layers className="h-3.5 w-3.5" />
        ) : (
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{
              background: pinColor(typeof value === "number" ? value : null),
            }}
          />
        )}
        {label}
        <span className={active ? "opacity-80" : "text-ink-3"}>{count}</span>
      </button>
    );
  };

  const countIn = (fn: (p: Pharmacy) => boolean) => pharmacies.filter(fn).length;

  return (
    <div className="mx-auto flex h-full max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 sm:py-7">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
            Visit map
          </h1>
          <p className="mt-1 text-xs text-ink-3">
            {totalPinned} of {pharmacies.length} pharmacies pinned
            {pharmacies.length > totalPinned && " — the rest need a location"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setEditPins((v) => !v)}
            title={
              editPins
                ? "Pins are draggable — click to lock"
                : "Unlock pins to drag them"
            }
            className={`label-caps flex h-9 items-center gap-1.5 rounded-md border px-3 transition ${
              editPins
                ? "border-brand bg-brand text-on-brand"
                : "border-line bg-surface text-ink-2 hover:text-ink"
            }`}
          >
            {editPins ? (
              <Move className="h-3.5 w-3.5" />
            ) : (
              <Lock className="h-3.5 w-3.5" />
            )}
            {editPins ? "Moving pins" : "Pins locked"}
          </button>
          <Link
            href="/admin/pharmacies"
            className="label-caps flex h-9 items-center gap-1.5 rounded-md border border-line bg-surface px-3 text-ink-2 transition hover:text-ink"
          >
            <MapPin className="h-3.5 w-3.5" />
            Directory
          </Link>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-rose/30 bg-rose/10 p-3 text-xs text-rose">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="scroll-thin flex gap-2 overflow-x-auto pb-1">
          {chip(ALL, "All", pharmacies.length)}
          {folders.map((f) =>
            chip(f.id, f.name, countIn((p) => p.folder_id === f.id)),
          )}
          {chip(UNFILED, "Unfiled", countIn((p) => p.folder_id == null))}
        </div>
        <div className="relative lg:ml-auto lg:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search pharmacies…"
            className="h-9 w-full rounded-md border border-line bg-surface pl-9 pr-3 text-sm text-ink outline-none transition placeholder:text-ink-3 focus:border-brand/50 focus:ring-1 focus:ring-brand/25"
          />
        </div>
      </div>

      {/* Map + list */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="h-[55vh] min-h-[20rem] lg:h-auto">
          {pinned.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-line bg-surface px-6 text-center">
              <MapPin className="h-8 w-8 text-ink-3" />
              <p className="mt-3 text-sm font-semibold text-ink">
                Nothing to show on the map yet
              </p>
              <p className="mt-1 max-w-sm text-xs text-ink-3">
                Add a location to your pharmacies — an address, GPS coordinates,
                or a Google Maps link — and they will appear here.
              </p>
              <Link
                href="/admin/pharmacies"
                className="label-caps mt-4 flex h-9 items-center rounded-md bg-brand px-4 text-on-brand transition hover:bg-brand-deep"
              >
                Go to pharmacies
              </Link>
            </div>
          ) : (
            <PharmacyMap
              points={pinned}
              focusId={focusId}
              folderName={folderName}
              onSelect={setFocusId}
              onMove={handleMove}
              draggable={editPins}
            />
          )}
        </div>

        {/* Side list */}
        <aside className="scroll-thin flex max-h-[60vh] min-h-0 flex-col gap-3 overflow-y-auto lg:max-h-none">
          {unpinned.length > 0 && (
            <div className="rounded-lg border border-copper/30 bg-copper/10 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="label-caps text-copper">
                  {unpinned.length} not pinned
                </p>
                {unpinned.some((p) => p.location) && (
                  <button
                    type="button"
                    onClick={locateAll}
                    disabled={locating.length > 0}
                    className="label-caps flex h-7 items-center gap-1.5 rounded-md bg-copper px-2.5 text-white transition hover:opacity-90 disabled:opacity-40"
                  >
                    <RefreshCw
                      className={`h-3 w-3 ${locating.length ? "animate-spin" : ""}`}
                    />
                    Locate all
                  </button>
                )}
              </div>
              <ul className="mt-2 space-y-1.5">
                {unpinned.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-2 rounded-md bg-surface/70 px-2.5 py-2"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-ink">
                        {p.name}
                      </span>
                      <span className="block truncate text-[11px] text-ink-3">
                        {p.location || "No location set"}
                      </span>
                    </span>
                    {p.location ? (
                      <button
                        type="button"
                        onClick={() => locate(p)}
                        disabled={locating.includes(p.id)}
                        title="Find on the map"
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-copper transition hover:bg-copper/15 disabled:opacity-40"
                      >
                        <RefreshCw
                          className={`h-3.5 w-3.5 ${
                            locating.includes(p.id) ? "animate-spin" : ""
                          }`}
                        />
                      </button>
                    ) : (
                      <Link
                        href="/admin/pharmacies"
                        title="Add a location"
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-copper transition hover:bg-copper/15"
                      >
                        <MapPin className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {pinned.map((p) => (
            <article
              key={p.id}
              onClick={() => setFocusId(p.id)}
              className={`cursor-pointer rounded-lg border p-3 transition ${
                focusId === p.id
                  ? "border-brand bg-brand/5"
                  : "border-line bg-surface hover:border-line-strong"
              }`}
            >
              <div className="flex items-start gap-2.5">
                <span
                  className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: pinColor(p.folder_id) }}
                />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[13px] font-semibold text-ink">
                    {p.name}
                  </h3>
                  <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-ink-3">
                    <Folder className="h-3 w-3 shrink-0" />
                    {folderName(p.folder_id)}
                  </p>
                </div>
              </div>

              <div className="mt-2 flex items-center gap-3 pl-5">
                {p.phone && (
                  <a
                    href={`tel:${p.phone.replace(/\s+/g, "")}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 text-[11px] text-ink-2 transition hover:text-brand"
                  >
                    <Phone className="h-3 w-3 text-brand" />
                    <span className="tabular-nums">{p.phone}</span>
                  </a>
                )}
                <a
                  href={directionsUrl(p)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 text-[11px] text-ink-2 transition hover:text-brand"
                >
                  <Navigation className="h-3 w-3 text-brand" />
                  Directions
                </a>
              </div>
            </article>
          ))}

          {visible.length === 0 && (
            <p className="rounded-lg border border-dashed border-line bg-surface px-4 py-8 text-center text-xs text-ink-3">
              No pharmacies match this filter.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
