// Server-only location resolution. Runs when a pharmacy is saved so the
// visit map has coordinates without the admin ever typing any.
//
// Three strategies, cheapest first:
//   1. coordinates already present in the string          (no network)
//   2. a maps.app.goo.gl short link → follow the redirect (1 request)
//   3. a plain address → OpenStreetMap Nominatim          (1 request)
//
// Every path is best-effort: a failure returns null and the pharmacy is
// simply saved without a pin, which the map page offers to retry.

import { parseLatLng, LatLng } from "./geo";

const TIMEOUT_MS = 7000;
const UA = "PharmacyLine/1.0 (pharmacy visit map)";

const isUrl = (s: string) => /^https?:\/\//i.test(s);

/** Follow up to 5 redirects by hand, checking each hop for coordinates. */
async function expandLink(url: string): Promise<LatLng | null> {
  let current = url;
  for (let hop = 0; hop < 5; hop++) {
    const res = await fetch(current, {
      redirect: "manual",
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const next = res.headers.get("location");
    if (!next) {
      // Last hop — Google sometimes only reveals the pin in the HTML body.
      if (res.ok) {
        const body = await res.text();
        const found =
          parseLatLng(body.slice(0, 200_000)) ?? parseLatLng(res.url || current);
        if (found) return found;
      }
      return parseLatLng(res.url || current);
    }
    current = new URL(next, current).toString();
    const found = parseLatLng(current);
    if (found) return found;
  }
  return null;
}

/** Free-form address → coordinates via OpenStreetMap. */
async function nominatim(query: string): Promise<LatLng | null> {
  const q = query.trim();
  if (q.length < 3) return null;
  const url =
    "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=" +
    encodeURIComponent(q);
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Language": "en,ar" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as Array<{ lat?: string; lon?: string }>;
  const hit = Array.isArray(data) ? data[0] : undefined;
  if (!hit?.lat || !hit?.lon) return null;
  return parseLatLng(`${hit.lat},${hit.lon}`);
}

/**
 * Best-effort coordinates for a pharmacy's location field.
 * Never throws — returns null when the place cannot be pinned.
 */
export async function resolveLocation(raw: string): Promise<LatLng | null> {
  const s = (raw ?? "").trim();
  if (!s) return null;

  const direct = parseLatLng(s);
  if (direct) return direct;

  try {
    if (isUrl(s)) {
      const followed = await expandLink(s);
      if (followed) return followed;
      // A /place/Some+Pharmacy link with no coordinates — geocode the name.
      const named = decodeURIComponent(s).match(/\/place\/([^/@?]+)/);
      if (named) return await nominatim(named[1].replace(/\+/g, " "));
      return null;
    }
    return await nominatim(s);
  } catch (err) {
    console.warn("Geocode failed for", s, err);
    return null;
  }
}
