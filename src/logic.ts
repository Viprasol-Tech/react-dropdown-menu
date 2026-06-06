/**
 * Direction of keyboard navigation within the menu.
 * `1` moves toward the end of the list, `-1` toward the start.
 */
export type NavDirection = 1 | -1;

/**
 * Where the menu surface is anchored relative to its trigger.
 *
 * The first segment is the side, the optional second segment is the alignment
 * along that side. `"bottom"` is shorthand for `"bottom-start"`.
 */
export type Placement =
  | "bottom"
  | "bottom-start"
  | "bottom-end"
  | "top"
  | "top-start"
  | "top-end";

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

/**
 * Internal accumulator for type-ahead matching. Callers persist this between
 * keystrokes (e.g. in a ref) and feed it back into {@link typeahead}.
 */
export interface TypeaheadState {
  /** The characters typed within the timeout window, lower-cased. */
  query: string;
  /** Timestamp (ms) of the most recent keystroke. */
  lastTime: number;
}

/** A fresh, empty type-ahead state. */
export function emptyTypeahead(): TypeaheadState {
  return { query: "", lastTime: 0 };
}

/** Result of a {@link typeahead} step. */
export interface TypeaheadResult {
  /** The carry-forward state to store for the next keystroke. */
  state: TypeaheadState;
  /** The index to focus, or `-1` when nothing matched. */
  matchIndex: number;
}

/**
 * Advance the WAI-ARIA type-ahead matcher by a single printable character.
 *
 * Behaviour mirrors native `<select>` / menu type-ahead:
 * - Characters typed within `timeoutMs` accumulate into a query and match by
 *   prefix (`"fi"` matches `"File"`).
 * - Repeatedly pressing the *same* key cycles through items that start with
 *   that character (`"s" "s"` → second `"s..."` item).
 * - After the timeout the buffer resets and a single character is used.
 *
 * The search starts *after* the current index and wraps, so the next match is
 * always selected even when several items share a prefix.
 *
 * @param state - The previous {@link TypeaheadState} (use {@link emptyTypeahead}).
 * @param char - The printable character that was typed.
 * @param labels - Lower-cased, navigable item labels in display order.
 *   Non-matchable slots (separators, disabled items) should be passed as `null`.
 * @param current - The currently active index (or `-1`).
 * @param now - Current time in ms (injectable for tests). Defaults to `Date.now()`.
 * @param timeoutMs - Idle window before the buffer resets. Defaults to `500`.
 */
export function typeahead(
  state: TypeaheadState,
  char: string,
  labels: ReadonlyArray<string | null>,
  current: number,
  now: number = Date.now(),
  timeoutMs = 500,
): TypeaheadResult {
  const lower = char.toLowerCase();
  const expired = now - state.lastTime > timeoutMs;
  const prevQuery = expired ? "" : state.query;

  // "ss" where both chars are identical means "cycle through s-items", so we
  // search by the single repeated character starting after the current item.
  const allSame =
    prevQuery.length > 0 && prevQuery.split("").every((c) => c === lower);
  const query = allSame ? lower : prevQuery + lower;
  const nextState: TypeaheadState = { query, lastTime: now };

  if (labels.length === 0) {
    return { state: nextState, matchIndex: -1 };
  }

  // When cycling on a repeated key, begin the search one past the current item;
  // otherwise re-match from the current item so an extended prefix can refine
  // the existing selection in place.
  const start = allSame ? current + 1 : current;

  for (let offset = 0; offset < labels.length; offset++) {
    const idx = (((start + offset) % labels.length) + labels.length) %
      labels.length;
    const label = labels[idx];
    if (label != null && label.startsWith(query)) {
      return { state: nextState, matchIndex: idx };
    }
  }

  return { state: nextState, matchIndex: -1 };
}

/**
 * Resolve the side of a {@link Placement}.
 * @returns `"top"` or `"bottom"`.
 */
export function placementSide(placement: Placement): "top" | "bottom" {
  return placement.startsWith("top") ? "top" : "bottom";
}

/**
 * Resolve the alignment of a {@link Placement}. Bare `"top"`/`"bottom"` align
 * to the start edge.
 * @returns `"start"` or `"end"`.
 */
export function placementAlign(placement: Placement): "start" | "end" {
  return placement.endsWith("end") ? "end" : "start";
}
