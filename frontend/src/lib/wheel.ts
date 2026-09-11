// The wheel's geometry: how many wedges to draw, where each one is, and where
// the wheel has to stop for a given wedge to be under the pointer.
//
// Kept out of the component because none of it is React - it is arithmetic
// that can be checked on its own, and the spin is only correct if the wheel
// stops exactly where the server said it would. See components/PrizeWheel.tsx.

/**
 * The wedges: a deep rose, then a peach, all the way round, each with the ink
 * that can actually be read on it - cream on the deep ones, plum on the pale
 * ones. Alternating is the whole effect, so the list is read in pairs and an
 * odd number of wedges simply meets itself at the seam.
 *
 * Not theme tokens. A wheel is an object sitting on the page rather than part
 * of its surface, and it should be the same wheel in either theme.
 */
export const WHEEL_WEDGES: { fill: string; ink: string }[] = [
  { fill: "#c01f61", ink: "#fff6f8" },
  { fill: "#f7ab8d", ink: "#8d1b4b" },
  { fill: "#e0517a", ink: "#fff6f8" },
  { fill: "#f9c3a7", ink: "#8d1b4b" },
  { fill: "#a81a54", ink: "#fff6f8" },
  { fill: "#f59a86", ink: "#7e1744" },
];

/** Always positive, unlike `%` on a negative number. */
export const mod360 = (deg: number) => ((deg % 360) + 360) % 360;

/**
 * A prize name broken into the lines one wedge can hold.
 *
 * Wrapped rather than truncated, because the names on this wheel are mostly
 * products - "COSRX Aloe Soothing Sun Cream" - and the first twelve letters
 * of one are the brand, which is the half that says least. Three short lines
 * carry the whole name; anything past them ends in an ellipsis, and the card
 * that announces the win always shows the name in full anyway.
 */
export function wrapLabel(
  name: string,
  perLine = 13,
  maxLines = 3,
): string[] {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const lines: string[] = [];
  for (const word of words) {
    const last = lines[lines.length - 1];
    // A word that would not fit starts the next line - unless the line is
    // empty, in which case it is simply a long word and gets clipped below.
    if (last && `${last} ${word}`.length <= perLine) {
      lines[lines.length - 1] = `${last} ${word}`;
    } else {
      lines.push(word);
    }
  }

  const clip = (line: string) =>
    line.length > perLine + 1 ? `${line.slice(0, perLine)}…` : line;
  const kept = lines.slice(0, maxLines).map(clip);
  if (lines.length > maxLines) {
    const last = kept[maxLines - 1];
    kept[maxLines - 1] = last.endsWith("…") ? last : `${last.trim()}…`;
  }
  return kept;
}

/** Where a stud sits on the rim: the boundary between two wedges, out past
 *  the paint. Decoration, and the only thing that marks the seams from the
 *  outside. */
export function rimStud(index: number, segments: number, r = 92) {
  const rad = ((index * (360 / segments) - 90) * Math.PI) / 180;
  return { cx: 100 + r * Math.cos(rad), cy: 100 + r * Math.sin(rad) };
}

/**
 * The wedges to draw for a list of prizes.
 *
 * A range with two prizes in it would otherwise be a wheel cut in half, which
 * reads as a coin toss rather than a wheel. Short lists are repeated around
 * the rim instead - the same prizes, more wedges - so every wheel looks like
 * one. It changes nothing about the odds: the winner is chosen before the
 * wheel moves, and the animation simply picks one of the wedges showing it.
 */
export function segmentsFor<T>(prizes: T[]): T[] {
  if (prizes.length === 0) return [];
  let reps = 1;
  while (prizes.length * (reps + 1) <= 12 && prizes.length * reps < 8) reps++;
  return Array.from(
    { length: prizes.length * reps },
    (_, i) => prizes[i % prizes.length],
  );
}

/** One wedge, as an SVG path in a 200×200 box. Angles run clockwise from 12
 *  o'clock, which is where the pointer is. */
export function wedgePath(from: number, to: number, r = 96): string {
  const point = (deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [100 + r * Math.cos(rad), 100 + r * Math.sin(rad)];
  };
  const [x1, y1] = point(from);
  const [x2, y2] = point(to);
  const large = to - from > 180 ? 1 : 0;
  return `M100,100 L${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${large},1 ${x2.toFixed(2)},${y2.toFixed(2)} Z`;
}

/**
 * Where to turn the wheel to so that `index` ends up under the pointer.
 *
 * Always forwards from where it is now - a wheel that jumps backwards to get
 * to its answer gives the game away - and never a whole number of turns, so
 * it settles a little off centre like a real one. `turns` full revolutions are
 * added for the show.
 */
export function landingAngle(
  current: number,
  index: number,
  segments: number,
  turns: number,
  jitter = 0,
): number {
  const step = 360 / segments;
  const target = -(index * step + step / 2) + jitter * step * 0.6;
  return current + turns * 360 + mod360(target - current);
}
