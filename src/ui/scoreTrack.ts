// A 100-space physical-style loop. Total scores remain unbounded; markers wrap.
export function scoreTrackIndex(points: number) {
  return ((points % 100) + 100) % 100;
}
export function scoreTrackPosition(
  points: number,
  width: number,
  height: number,
) {
  const n = scoreTrackIndex(points),
    x0 = 30,
    y0 = 30,
    x1 = width - 30,
    y1 = height - 30;
  if (n < 30) return { x: x0 + ((x1 - x0) * n) / 30, y: y1 };
  if (n < 50) return { x: x1, y: y1 - ((y1 - y0) * (n - 30)) / 20 };
  if (n < 80) return { x: x1 - ((x1 - x0) * (n - 50)) / 30, y: y0 };
  return { x: x0, y: y0 + ((y1 - y0) * (n - 80)) / 20 };
}
