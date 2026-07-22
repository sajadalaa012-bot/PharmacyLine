"use client";

// The interactive map behind /admin/map. Leaflet with OpenStreetMap tiles —
// no API key, no billing. Leaflet touches `window` on import, so it is pulled
// in lazily inside the mount effect rather than at module scope.

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, LayerGroup, Marker, Circle } from "leaflet";
import "leaflet/dist/leaflet.css";
import { MappedPharmacy } from "@/types";
import { pinColor, directionsUrl } from "@/lib/geo";
import { Crosshair, Maximize2 } from "lucide-react";

interface Props {
  points: MappedPharmacy[];
  /** Pharmacy to fly to; cleared by the parent once handled. */
  focusId: number | null;
  folderName: (id: number | null) => string;
  onSelect: (id: number) => void;
  /** Fired when a pin is dragged to a new position. */
  onMove: (p: MappedPharmacy, lat: number, lng: number) => void;
  /** Pins can be repositioned by dragging. */
  draggable: boolean;
}

/** Popup body built as DOM so pharmacy text is never parsed as HTML. */
function popupNode(
  p: MappedPharmacy,
  folder: string,
  draggable: boolean,
): HTMLElement {
  const root = document.createElement("div");
  root.className = "map-popup";

  const title = document.createElement("p");
  title.className = "map-popup-title";
  title.textContent = p.name;
  root.appendChild(title);

  const meta = document.createElement("p");
  meta.className = "map-popup-meta";
  meta.textContent = folder;
  root.appendChild(meta);

  if (p.phone) {
    const tel = document.createElement("a");
    tel.className = "map-popup-link";
    tel.href = `tel:${p.phone.replace(/\s+/g, "")}`;
    tel.textContent = p.phone;
    root.appendChild(tel);
  }

  const dir = document.createElement("a");
  dir.className = "map-popup-link";
  dir.href = directionsUrl({ lat: p.lat, lng: p.lng });
  dir.target = "_blank";
  dir.rel = "noopener noreferrer";
  dir.textContent = "Directions ↗";
  root.appendChild(dir);

  if (p.notes) {
    const notes = document.createElement("p");
    notes.className = "map-popup-notes";
    notes.textContent = p.notes;
    root.appendChild(notes);
  }

  if (draggable) {
    const hint = document.createElement("p");
    hint.className = "map-popup-meta";
    hint.textContent = "Drag the pin to correct it";
    root.appendChild(hint);
  }

  return root;
}

export default function PharmacyMap({
  points,
  focusId,
  folderName,
  onSelect,
  onMove,
  draggable,
}: Props) {
  const holder = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const leaflet = useRef<typeof import("leaflet") | null>(null);
  const layer = useRef<LayerGroup | null>(null);
  const markers = useRef(new Map<number, Marker>());
  const meMarker = useRef<Circle | null>(null);
  // Signature of the pins currently framed, so filtering reframes the map but
  // dragging a pin (or picking one from the list) leaves the viewport alone.
  const framed = useRef("");

  const [ready, setReady] = useState(false);
  const [locating, setLocating] = useState(false);

  // ── Mount ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const markerStore = markers.current;

    (async () => {
      const L = await import("leaflet");
      if (cancelled || !holder.current || map.current) return;

      leaflet.current = L;
      const m = L.map(holder.current, {
        center: [33.3152, 44.3661], // Baghdad — replaced by fitBounds
        zoom: 11,
        zoomControl: true,
        attributionControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(m);

      layer.current = L.layerGroup().addTo(m);
      map.current = m;
      setReady(true);
    })();

    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      layer.current = null;
      markerStore.clear();
      framed.current = "";
    };
  }, []);

  // ── Pins ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const L = leaflet.current;
    const m = map.current;
    const group = layer.current;
    if (!ready || !L || !m || !group) return;

    group.clearLayers();
    markers.current.clear();

    for (const p of points) {
      const color = pinColor(p.folder_id);
      const marker = L.marker([p.lat, p.lng], {
        draggable,
        title: p.name,
        icon: L.divIcon({
          className: "pin-marker",
          html: `<span class="pin-dot" style="background:${color}"></span>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
          popupAnchor: [0, -12],
        }),
      });

      marker.bindPopup(() =>
        popupNode(p, folderName(p.folder_id), draggable),
      );
      marker.on("click", () => onSelect(p.id));
      if (draggable) {
        marker.on("dragend", () => {
          const { lat, lng } = marker.getLatLng();
          onMove(p, Number(lat.toFixed(6)), Number(lng.toFixed(6)));
        });
      }
      marker.addTo(group);
      markers.current.set(p.id, marker);
    }

    // Reframe when *which* pharmacies are shown changes — first load and every
    // folder/search change — but not when a pin simply moves.
    const signature = points.map((p) => p.id).join(",");
    if (signature !== framed.current && points.length > 0) {
      framed.current = signature;
      fitAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, ready, draggable]);

  // ── Fly to the selected pharmacy ─────────────────────────────────────
  useEffect(() => {
    if (!ready || focusId == null) return;
    const marker = markers.current.get(focusId);
    const m = map.current;
    if (!marker || !m) return;
    m.flyTo(marker.getLatLng(), Math.max(m.getZoom(), 15), { duration: 0.6 });
    marker.openPopup();
  }, [focusId, ready]);

  function fitAll() {
    const L = leaflet.current;
    const m = map.current;
    if (!L || !m || points.length === 0) return;
    if (points.length === 1) {
      m.setView([points[0].lat, points[0].lng], 15);
      return;
    }
    m.fitBounds(
      L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number])),
      { padding: [48, 48], maxZoom: 16 },
    );
  }

  function locateMe() {
    const L = leaflet.current;
    const m = map.current;
    if (!L || !m || !navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        const here: [number, number] = [coords.latitude, coords.longitude];
        meMarker.current?.remove();
        meMarker.current = L.circle(here, {
          radius: Math.max(coords.accuracy, 25),
          color: "#3b6ea8",
          fillColor: "#3b6ea8",
          fillOpacity: 0.18,
          weight: 2,
        }).addTo(m);
        m.flyTo(here, Math.max(m.getZoom(), 14), { duration: 0.6 });
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg border border-line bg-sunken">
      <div ref={holder} className="h-full w-full" />

      {/* Map controls, floating over the canvas */}
      <div className="absolute right-3 top-3 z-[500] flex flex-col gap-2">
        <button
          type="button"
          onClick={fitAll}
          title="Fit all pharmacies"
          className="flex h-9 w-9 items-center justify-center rounded-md border border-line bg-surface text-ink-2 shadow-sm transition hover:bg-sunken hover:text-ink"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={locateMe}
          title="Show my location"
          className="flex h-9 w-9 items-center justify-center rounded-md border border-line bg-surface text-ink-2 shadow-sm transition hover:bg-sunken hover:text-ink"
        >
          <Crosshair className={`h-4 w-4 ${locating ? "animate-spin" : ""}`} />
        </button>
      </div>

      {!ready && (
        <div className="absolute inset-0 z-[400] flex items-center justify-center bg-sunken">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand/25 border-t-brand" />
        </div>
      )}
    </div>
  );
}
