/**
 * Direction of keyboard navigation within the menu.
 * `1` moves toward the end of the list, `-1` toward the start.
 */
export type NavDirection = 1 | -1;

/**
 * Compute the next active item index for keyboard navigation.
 *
 * This is the pure heart of the dropdown's roving-tabindex behaviour. It is
 * deliberately framework-agnostic so it can be unit tested in isolation.
 *
 * @param current - The currently active index. Use `-1` when nothing is active
 *   yet (e.g. the menu just opened); the first move then lands on a sensible
 *   edge item.
 * @param len - The total number of selectable items. Must be a non-negative
 *   integer.
 * @param dir - `1` to move down/forward, `-1` to move up/backward.
 * @param loop - When `true`, navigation wraps around the ends. When `false`,
 *   navigation clamps at the first/last item.
 * @returns The next active index, always within `[0, len - 1]`, or `-1` when
 *   there are no items.
 */
export function nextIndex(
  current: number,
  len: number,
  dir: NavDirection,
  loop: boolean,
): number {
  if (!Number.isFinite(len) || len <= 0) {
    return -1;
  }

  // Nothing active yet: entering with "down" selects the first item, entering
  // with "up" selects the last item.
  if (current < 0) {
    return dir === 1 ? 0 : len - 1;
  }

  // Clamp a stale/out-of-range current into the valid window first.
  const safeCurrent = Math.min(Math.max(current, 0), len - 1);
  const raw = safeCurrent + dir;

  if (loop) {
    // Modular wrap that stays correct for negative values.
    return ((raw % len) + len) % len;
  }

  return Math.min(Math.max(raw, 0), len - 1);
}

/**
 * Resolve the index that the Home/End keys should jump to.
 *
 * @param edge - `"first"` for the Home key, `"last"` for the End key.
 * @param len - Total number of selectable items.
 * @returns The target index, or `-1` when there are no items.
 */
export function edgeIndex(edge: "first" | "last", len: number): number {
  if (!Number.isFinite(len) || len <= 0) {
    return -1;
  }
  return edge === "first" ? 0 : len - 1;
}
