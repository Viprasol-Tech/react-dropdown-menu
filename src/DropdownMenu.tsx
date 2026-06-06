import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { edgeIndex, nextIndex } from "./logic.js";

/**
 * A single selectable entry in the dropdown menu.
 */
export interface DropdownItem {
  /** Stable, unique identifier returned to `onSelect`. */
  id: string;
  /** Visible label rendered inside the menu item. */
  label: ReactNode;
  /** When `true`, the item is shown but cannot be activated or focused. */
  disabled?: boolean;
}

/**
 * Props for {@link DropdownMenu}.
 */
export interface DropdownMenuProps {
  /** Text or node shown on the trigger button. */
  label: ReactNode;
  /** The list of selectable items. */
  items: DropdownItem[];
  /** Fired with the item `id` when an item is activated via click or Enter/Space. */
  onSelect?: (id: string) => void;
  /** Wrap navigation around the ends with Arrow keys. Defaults to `true`. */
  loop?: boolean;
  /** Optional accessible label for the trigger if `label` is non-textual. */
  ariaLabel?: string;
  /** Optional class applied to the root wrapper element. */
  className?: string;
}

/**
 * An accessible dropdown menu following the WAI-ARIA menu-button pattern.
 *
 * Behaviour:
 * - Click (or Enter/Space/ArrowDown/ArrowUp on the trigger) opens the menu.
 * - ArrowDown / ArrowUp move the active item; Home / End jump to the ends.
 * - Enter / Space activate the current item and fire `onSelect`.
 * - Escape closes the menu and returns focus to the trigger.
 * - Disabled items are skipped during navigation and cannot be activated.
 * - Clicking outside the menu closes it.
 */
export function DropdownMenu({
  label,
  items,
  onSelect,
  loop = true,
  ariaLabel,
  className,
}: DropdownMenuProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const baseId = useId();
  const menuId = `${baseId}-menu`;
  const triggerId = `${baseId}-trigger`;

  /** Indices of items that are actually navigable (not disabled). */
  const enabledIndices = useMemo(
    () =>
      items.reduce<number[]>((acc, item, idx) => {
        if (!item.disabled) acc.push(idx);
        return acc;
      }, []),
    [items],
  );

  const openMenu = useCallback(
    (edge: "first" | "last") => {
      setOpen(true);
      // Land on the first/last *enabled* item.
      if (enabledIndices.length === 0) {
        setActiveIndex(-1);
        return;
      }
      const target =
        edge === "first"
          ? enabledIndices[0]
          : enabledIndices[enabledIndices.length - 1];
      setActiveIndex(target);
    },
    [enabledIndices],
  );

  const closeMenu = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    setActiveIndex(-1);
    if (restoreFocus) {
      triggerRef.current?.focus();
    }
  }, []);

  /** Move the active item by `dir`, skipping disabled entries. */
  const move = useCallback(
    (dir: 1 | -1) => {
      if (enabledIndices.length === 0) return;
      // Find current position within the enabled list.
      const pos = enabledIndices.indexOf(activeIndex);
      const nextPos = nextIndex(pos, enabledIndices.length, dir, loop);
      if (nextPos < 0) return;
      setActiveIndex(enabledIndices[nextPos]);
    },
    [activeIndex, enabledIndices, loop],
  );

  const jump = useCallback(
    (edge: "first" | "last") => {
      if (enabledIndices.length === 0) return;
      const pos = edgeIndex(edge, enabledIndices.length);
      if (pos < 0) return;
      setActiveIndex(enabledIndices[pos]);
    },
    [enabledIndices],
  );

  const activate = useCallback(
    (index: number) => {
      const item = items[index];
      if (!item || item.disabled) return;
      onSelect?.(item.id);
      closeMenu(true);
    },
    [items, onSelect, closeMenu],
  );

  // Keep focus synced with the active item while open.
  useEffect(() => {
    if (!open) return;
    if (activeIndex < 0) return;
    itemRefs.current[activeIndex]?.focus();
  }, [open, activeIndex]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        closeMenu(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, closeMenu]);

  const onTriggerKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      switch (event.key) {
        case "ArrowDown":
        case "Enter":
        case " ":
          event.preventDefault();
          openMenu("first");
          break;
        case "ArrowUp":
          event.preventDefault();
          openMenu("last");
          break;
        default:
          break;
      }
    },
    [openMenu],
  );

  const onMenuKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          move(1);
          break;
        case "ArrowUp":
          event.preventDefault();
          move(-1);
          break;
        case "Home":
          event.preventDefault();
          jump("first");
          break;
        case "End":
          event.preventDefault();
          jump("last");
          break;
        case "Escape":
          event.preventDefault();
          closeMenu(true);
          break;
        case "Tab":
          // Tabbing away dismisses the menu without trapping focus.
          closeMenu(false);
          break;
        case "Enter":
        case " ":
          event.preventDefault();
          activate(activeIndex);
          break;
        default:
          break;
      }
    },
    [move, jump, closeMenu, activate, activeIndex],
  );

  return (
    <div ref={rootRef} className={className} data-rdm-root="">
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={ariaLabel}
        onClick={() => (open ? closeMenu(false) : openMenu("first"))}
        onKeyDown={onTriggerKeyDown}
      >
        {label}
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-labelledby={triggerId}
          tabIndex={-1}
          onKeyDown={onMenuKeyDown}
        >
          {items.map((item, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={item.id}
                ref={(el) => {
                  itemRefs.current[idx] = el;
                }}
                role="menuitem"
                type="button"
                tabIndex={isActive ? 0 : -1}
                aria-disabled={item.disabled || undefined}
                data-active={isActive ? "" : undefined}
                disabled={item.disabled}
                onClick={() => activate(idx)}
                onMouseEnter={() => {
                  if (!item.disabled) setActiveIndex(idx);
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
