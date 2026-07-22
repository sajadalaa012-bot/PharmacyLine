// Turning the free-text "location" field of a pharmacy into map coordinates.
// The field may hold GPS coordinates, a plain address, or any flavour of
// Google Maps link — this module handles everything that can be read straight
// out of the string. Anything that needs a network lookup lives in
// lib/geocode.ts (server only).

export interface LatLng {
  lat: number;
  lng: number;
}

const NUM = String.raw`-?\d{1,3}(?:\.\d+)?`;

function valid(lat: number, lng: number): LatLng | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  // "0,0" is what a failed export writes; treat it as no location.
  if (lat === 0 && lng === 0) return null;
  return { lat, lng };
}

function pair(m: RegExpMatchArray | null): LatLng | null {
  return m ? valid(parseFloat(m[1]), parseFloat(m[2])) : null;
}

/**
 * Read coordinates out of a location string without hitting the network.
 * Returns null when the string is an address or an unresolvable short link.
 */
export function parseLatLng(input: string): LatLng | null {
  if (!input) return null;
  const raw = input.trim();
  if (!raw) return null;

  let s = raw;
  try {
    s = decodeURIComponent(raw);
  } catch {
    /* keep the raw string when it has stray % characters */
  }

  return (
    // Google "place" payload — the pin itself, not the viewport centre.
    pair(s.match(new RegExp(`!3d(${NUM})!4d(${NUM})`))) ??
    // ?q= / ?query= / ?ll= / &destination= …
    pair(
      s.match(
        new RegExp(
          `[?&](?:q|query|ll|sll|mlat|daddr|saddr|destination|center)=(${NUM})\\s*,\\s*(${NUM})`,
          "i",
        ),
      ),
    ) ??
    // /@lat,lng,17z — the map viewport centre.
    pair(s.match(new RegExp(`@(${NUM}),(${NUM})`))) ??
    // geo:lat,lng (Android intent links)
    pair(s.match(new RegExp(`geo:(${NUM}),(${NUM})`, "i"))) ??
    // /place/33.31,44.36
    pair(s.match(new RegExp(`/(?:place|dir)/(${NUM}),(${NUM})`))) ??
    // A bare "33.3152, 44.3661" typed into the field.
    pair(s.match(new RegExp(`^\\s*(${NUM})\\s*[,;\\s]\\s*(${NUM})\\s*$`)))
  );
}

/** Google Maps deep link for turn-by-turn directions to a point. */
export function directionsUrl({ lat, lng }: LatLng): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

/** Distance in kilometres between two points (haversine). */
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Six pin colours, assigned per folder so the map reads at a glance. */
export const PIN_COLORS = [
  "#b25c38", // brand terracotta
  "#2f7d63", // green
  "#3b6ea8", // blue
  "#8a5cb2", // violet
  "#b58a1e", // amber
  "#b4453a", // rose
];

export function pinColor(folderId: number | null): string {
  if (folderId == null) return "#948b7d"; // unfiled → muted clay
  return PIN_COLORS[Math.abs(folderId) % PIN_COLORS.length];
}
