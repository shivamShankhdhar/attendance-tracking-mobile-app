/** Return one adjacent page only for a deliberate horizontal swipe. */
export function swipeTabIndex(index: number, count: number, x: number, y: number, velocityX: number): number {
  'worklet';
  if (index < 0 || count < 2 || Math.abs(x) < 20 || Math.abs(x) < Math.abs(y) * 1.5) return index;
  if (Math.abs(x) < 60 && (Math.abs(velocityX) < 650 || Math.sign(velocityX) !== Math.sign(x))) return index;
  return Math.max(0, Math.min(count - 1, index + (x < 0 ? 1 : -1)));
}
