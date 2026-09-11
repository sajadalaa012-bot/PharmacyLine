// The wheel's geometry: how many wedges to draw, where each one is, and where
// the wheel has to stop for a given wedge to be under the pointer.
//
// Kept out of the component because none of it is React - it is arithmetic
// that can be checked on its own, and the spin is only correct if the wheel
// stops exactly where the server said it would. See components/PrizeWheel.tsx.

/**
 * The wedge colours: deep enough, all of them, to carry white type.
 *
 * Not theme tokens. A wheel is an object sitting on the page rather than part
 * of its surface, and it should be the same wheel in either theme.
 */
export const WHEEL_COLORS = [
  "#c62a6c",
  "#a51f57",
  "#d4456b",
  "#8f1b56",
  "#e05c7e",
  "#b3306b",
];

/** Always positive, unlike `%` on a negative number. */
export const mod360 = (deg: number) => ((deg % 360) + 360) % 360;

/** A label has to fit inside a wedge, so a long prize name is trimmed to
 *  something the eye can catch as it goes past. The result card underneath
 *  always shows the name in full. */
export function shortLabel(name: string): string {
  const clean = name.trim();
  return clean.length > 14 ? `${clean.slice(0, 13)}…` : clean;
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
