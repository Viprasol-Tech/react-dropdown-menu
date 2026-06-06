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
import {
  edgeIndex,
  emptyTypeahead,
  nextIndex,
  placementAlign,
  placementSide,
  typeahead,
  type Placement,
  type TypeaheadState,
} from "./logic.js";

/**
 * A normal, clickable command item. This is the default item kind, so the
 * `type` field may be omitted.
 */
export interface DropdownActionItem {
  /** Discriminant. Optional — omitting it is treated as `"action"`. */
  type?: "action";
  /** Stable, unique identifier returned to `onSelect`. */
  id: string;
  /** Visible label rendered inside the menu item. */
  label: ReactNode;
  /** Plain-text label used for type-ahead. Falls back to `label` when it is a string. */
  textValue?: string;
  /** When `true`, the item is shown but cannot be activated or focused. */
  disabled?: boolean;
  /** Optional leading node (icon, avatar). */
  icon?: ReactNode;
  /** Optional trailing hint, e.g. a keyboard shortcut. */
  shortcut?: ReactNode;
  /** When provided, this item opens a nested submenu instead of selecting. */
  submenu?: DropdownItem[];
}

/**
 * A toggleable checkbox item. Reports its next checked state to `onCheckedChange`.
 */
export interface DropdownCheckboxItem {
  type: "checkbox";
  id: string;
  label: ReactNode;
  textValue?: string;
  disabled?: boolean;
  icon?: ReactNode;
  shortcut?: ReactNode;
  /** Current checked state (controlled). */
  checked: boolean;
  /** Fired with the *next* checked state when toggled. */
  onCheckedChange?: (checked: boolean) => void;
}

/**
 * A radio item. Belongs to a {@link DropdownRadioGroup}; selecting it makes it
 * the group's active value.
 */
export interface DropdownRadioItem {
  type: "radio";
  id: string;
  label: ReactNode;
  textValue?: string;
  disabled?: boolean;
  icon?: ReactNode;
  shortcut?: ReactNode;
  /** The value this radio represents within its group. */
  value: string;
}

/**
 * Groups {@link DropdownRadioItem}s so exactly one is selected at a time.
 */
export interface DropdownRadioGroup {
  type: "radio-group";
  /** Stable id for the group. */
  id: string;
  /** Optional visible group label (rendered as a `group` heading). */
  label?: ReactNode;
  /** Currently selected value. */
  value: string;
  /** Fired with the chosen value when a radio in the group is activated. */
  onValueChange?: (value: string) => void;
  /** The radio items in this group. */
  items: DropdownRadioItem[];
}

/** A non-interactive divider between groups of items. */
export interface DropdownSeparator {
  type: "separator";
  /** Stable id for keying. */
  id: string;
}

/** A non-interactive label heading a section of items. */
export interface DropdownLabel {
  type: "label";
  id: string;
  label: ReactNode;
}

/**
 * Any entry that can appear in a {@link DropdownMenu}. Plain objects with
 * `id`/`label` are treated as {@link DropdownActionItem} for backward
 * compatibility with v0.1.
 */
export type DropdownItem =
  | DropdownActionItem
  | DropdownCheckboxItem
  | DropdownRadioItem
  | DropdownRadioGroup
  | DropdownSeparator
  | DropdownLabel;

/** Detail passed to `onSelect` when an item is activated. */
export interface SelectDetail {
  /** The id of the activated item. */
  id: string;
  /** The discriminated kind of the activated item. */
  type: "action" | "checkbox" | "radio";
  /** For checkbox items: the next checked state. */
  checked?: boolean;
  /** For radio items: the selected value. */
  value?: string;
}

/**
 * Props for {@link DropdownMenu}.
 */
export interface DropdownMenuProps {
  /** Text or node shown on the trigger button. */
  label: ReactNode;
  /** The list of menu entries. */
  items: DropdownItem[];
  /**
   * Fired when an item is activated via click or keyboard. Receives the item
   * id (string) plus a structured {@link SelectDetail} as a second argument.
   */
  onSelect?: (id: string, detail: SelectDetail) => void;
  /** Wrap navigation around the ends with Arrow keys. Defaults to `true`. */
  loop?: boolean;
  /** Where the menu opens relative to the trigger. Defaults to `"bottom-start"`. */
  placement?: Placement;
  /** Controlled open state. When provided the menu becomes controlled. */
  open?: boolean;
  /** Initial open state for the uncontrolled case. Defaults to `false`. */
  defaultOpen?: boolean;
  /** Notified whenever the menu wants to open or close. */
  onOpenChange?: (open: boolean) => void;
  /** Keep the menu open after activating an item. Defaults to `false`. */
  closeOnSelect?: boolean;
  /** Disable the whole trigger. */
  disabled?: boolean;
  /** Enable type-ahead matching by typing item labels. Defaults to `true`. */
  typeAhead?: boolean;
  /** Idle window (ms) before the type-ahead buffer resets. Defaults to `500`. */
  typeAheadTimeout?: number;
  /** Optional accessible label for the trigger if `label` is non-textual. */
  ariaLabel?: string;
  /** Optional class applied to the root wrapper element. */
  className?: string;
  /** Optional class applied to the menu surface. */
  menuClassName?: string;
}

/** A flattened, navigable row plus a pointer back to its source. */
interface FlatRow {
  /** The underlying item. */
  item:
    | DropdownActionItem
    | DropdownCheckboxItem
    | DropdownRadioItem;
  /** The radio group this row belongs to, if any. */
  group?: DropdownRadioGroup;
  /** Lower-cased text for type-ahead, or `null` when disabled. */
  matchText: string | null;
}

function itemType(
  item: DropdownItem,
): "action" | "checkbox" | "radio" | "radio-group" | "separator" | "label" {
  if (!("type" in item) || item.type === undefined) return "action";
  return item.type;
}

function plainText(node: ReactNode, fallback?: string): string {
  if (fallback != null) return fallback;
  return typeof node === "string" ? node : "";
}

/**
 * Build the flat list of navigable rows from the (possibly nested) item tree.
 * Separators, labels and radio-group headings are excluded; radio children are
 * flattened in place so arrow navigation crosses group boundaries naturally.
 */
function flattenRows(items: DropdownItem[]): FlatRow[] {
  const rows: FlatRow[] = [];
  for (const item of items) {
    const t = itemType(item);
    if (t === "separator" || t === "label") continue;
    if (t === "radio-group") {
      const group = item as DropdownRadioGroup;
      for (const radio of group.items) {
        rows.push({
          item: radio,
          group,
          matchText: radio.disabled
            ? null
            : plainText(radio.label, radio.textValue).toLowerCase(),
        });
      }
      continue;
    }
    const navItem = item as DropdownActionItem | DropdownCheckboxItem;
    rows.push({
      item: navItem,
      matchText: navItem.disabled
        ? null
        : plainText(navItem.label, navItem.textValue).toLowerCase(),
    });
  }
  return rows;
}

/**
 * An accessible dropdown menu implementing the WAI-ARIA menu-button pattern,
 * with submenus, separators, labels, checkbox/radio items, type-ahead,
 * placement, and controlled open state.
 *
 * Keyboard:
 * - Trigger: Enter/Space/ArrowDown open to first item; ArrowUp opens to last.
 * - Menu: ArrowUp/Down move (skipping disabled); Home/End jump; Escape closes.
 * - Type any printable character to jump to a matching item (type-ahead).
 * - ArrowRight on a submenu parent opens it; ArrowLeft closes a submenu.
 * - Enter/Space activate the active item.
 */
export function DropdownMenu({
  label,
  items,
  onSelect,
  loop = true,
  placement = "bottom-start",
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  closeOnSelect = true,
  disabled = false,
  typeAhead = true,
  typeAheadTimeout = 500,
  ariaLabel,
  className,
  menuClassName,
}: DropdownMenuProps): JSX.Element {
  const isControlled = controlledOpen !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const [activeIndex, setActiveIndex] = useState(-1);
  const [openSubmenuId, setOpenSubmenuId] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const typeaheadRef = useRef<TypeaheadState>(emptyTypeahead());

  const baseId = useId();
  const menuId = `${baseId}-menu`;
  const triggerId = `${baseId}-trigger`;

  const rows = useMemo(() => flattenRows(items), [items]);

  /** Indices into `rows` that are actually navigable (not disabled). */
  const enabledIndices = useMemo(
    () =>
      rows.reduce<number[]>((acc, row, idx) => {
        if (!row.item.disabled) acc.push(idx);
        return acc;
      }, []),
    [rows],
  );

  const matchLabels = useMemo(() => rows.map((r) => r.matchText), [rows]);

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  const openMenu = useCallback(
    (edge: "first" | "last") => {
      if (disabled) return;
      setOpen(true);
      setOpenSubmenuId(null);
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
    [disabled, enabledIndices, setOpen],
  );

  const closeMenu = useCallback(
    (restoreFocus: boolean) => {
      setOpen(false);
      setActiveIndex(-1);
      setOpenSubmenuId(null);
      typeaheadRef.current = emptyTypeahead();
      if (restoreFocus) triggerRef.current?.focus();
    },
    [setOpen],
  );

  /** Move the active item by `dir`, skipping disabled entries. */
  const move = useCallback(
    (dir: 1 | -1) => {
      if (enabledIndices.length === 0) return;
      const pos = enabledIndices.indexOf(activeIndex);
      const nextPos = nextIndex(pos, enabledIndices.length, dir, loop);
      if (nextPos < 0) return;
      setActiveIndex(enabledIndices[nextPos]);
      setOpenSubmenuId(null);
    },
    [activeIndex, enabledIndices, loop],
  );

  const jump = useCallback(
    (edge: "first" | "last") => {
      if (enabledIndices.length === 0) return;
      const pos = edgeIndex(edge, enabledIndices.length);
      if (pos < 0) return;
      setActiveIndex(enabledIndices[pos]);
      setOpenSubmenuId(null);
    },
    [enabledIndices],
  );

  const activate = useCallback(
    (index: number) => {
      const row = rows[index];
      if (!row || row.item.disabled) return;
      const { item, group } = row;
      const t = itemType(item);

      if (t === "action") {
        const action = item as DropdownActionItem;
        if (action.submenu && action.submenu.length > 0) {
          setOpenSubmenuId((cur) => (cur === action.id ? cur : action.id));
          return;
        }
        onSelect?.(action.id, { id: action.id, type: "action" });
        if (closeOnSelect) closeMenu(true);
        return;
      }

      if (t === "checkbox") {
        const cb = item as DropdownCheckboxItem;
        const next = !cb.checked;
        cb.onCheckedChange?.(next);
        onSelect?.(cb.id, { id: cb.id, type: "checkbox", checked: next });
        if (closeOnSelect) closeMenu(true);
        return;
      }

      // radio
      const radio = item as DropdownRadioItem;
      group?.onValueChange?.(radio.value);
      onSelect?.(radio.id, {
        id: radio.id,
        type: "radio",
        value: radio.value,
      });
      if (closeOnSelect) closeMenu(true);
    },
    [rows, onSelect, closeOnSelect, closeMenu],
  );

  // Keep DOM focus synced with the active item while open.
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

  const runTypeahead = useCallback(
    (char: string) => {
      if (!typeAhead) return;
      const now = Date.now();
      const result = typeahead(
        typeaheadRef.current,
        char,
        matchLabels,
        activeIndex,
        now,
        typeAheadTimeout,
      );
      typeaheadRef.current = result.state;
      if (result.matchIndex >= 0) {
        setActiveIndex(result.matchIndex);
        setOpenSubmenuId(null);
      }
    },
    [typeAhead, matchLabels, activeIndex, typeAheadTimeout],
  );

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
          return;
        case "ArrowUp":
          event.preventDefault();
          move(-1);
          return;
        case "Home":
          event.preventDefault();
          jump("first");
          return;
        case "End":
          event.preventDefault();
          jump("last");
          return;
        case "Escape":
          event.preventDefault();
          closeMenu(true);
          return;
        case "Tab":
          closeMenu(false);
          return;
        case "ArrowRight": {
          const row = rows[activeIndex];
          const action = row?.item as DropdownActionItem | undefined;
          if (action && action.submenu && action.submenu.length > 0) {
            event.preventDefault();
            setOpenSubmenuId(action.id);
          }
          return;
        }
        case "ArrowLeft":
          if (openSubmenuId) {
            event.preventDefault();
            setOpenSubmenuId(null);
          }
          return;
        case "Enter":
        case " ":
          event.preventDefault();
          activate(activeIndex);
          return;
        default:
          break;
      }

      // Type-ahead: single printable character, no modifier keys.
      if (
        typeAhead &&
        event.key.length === 1 &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        event.preventDefault();
        runTypeahead(event.key);
      }
    },
    [
      move,
      jump,
      closeMenu,
      activate,
      activeIndex,
      rows,
      openSubmenuId,
      typeAhead,
      runTypeahead,
    ],
  );

  const side = placementSide(placement);
  const align = placementAlign(placement);

  // Render each source item, threading roving-tabindex through `rows` order.
  let rowCursor = 0;
  const renderNavButton = (
    row: FlatRow,
    extraRole: "menuitem" | "menuitemcheckbox" | "menuitemradio",
    extras: {
      checked?: boolean;
      hasSubmenu?: boolean;
      submenuOpen?: boolean;
    } = {},
  ): JSX.Element => {
    const idx = rowCursor++;
    const { item } = row;
    const isActive = idx === activeIndex;
    const action = item as DropdownActionItem;
    return (
      <button
        key={item.id}
        ref={(el) => {
          itemRefs.current[idx] = el;
        }}
        role={extraRole}
        type="button"
        tabIndex={isActive ? 0 : -1}
        aria-disabled={item.disabled || undefined}
        aria-checked={
          extraRole === "menuitem" ? undefined : Boolean(extras.checked)
        }
        aria-haspopup={extras.hasSubmenu ? "menu" : undefined}
        aria-expanded={extras.hasSubmenu ? Boolean(extras.submenuOpen) : undefined}
        data-active={isActive ? "" : undefined}
        data-rdm-item=""
        disabled={item.disabled}
        onClick={() => activate(idx)}
        onMouseEnter={() => {
          if (!item.disabled) {
            setActiveIndex(idx);
            if (!extras.hasSubmenu) setOpenSubmenuId(null);
          }
        }}
      >
        {action.icon != null && (
          <span data-rdm-icon="" aria-hidden="true">
            {action.icon}
          </span>
        )}
        <span data-rdm-label="">{item.label}</span>
        {action.shortcut != null && (
          <span data-rdm-shortcut="" aria-hidden="true">
            {action.shortcut}
          </span>
        )}
        {extras.hasSubmenu && (
          <span data-rdm-submenu-indicator="" aria-hidden="true">
            {"›"}
          </span>
        )}
      </button>
    );
  };

  const renderItem = (item: DropdownItem): ReactNode => {
    const t = itemType(item);

    if (t === "separator") {
      return (
        <div
          key={item.id}
          role="separator"
          data-rdm-separator=""
          aria-orientation="horizontal"
        />
      );
    }

    if (t === "label") {
      const lbl = item as DropdownLabel;
      return (
        <div key={lbl.id} role="presentation" data-rdm-group-label="">
          {lbl.label}
        </div>
      );
    }

    if (t === "radio-group") {
      const group = item as DropdownRadioGroup;
      const labelId = group.label ? `${baseId}-${group.id}-label` : undefined;
      return (
        <div key={group.id} role="group" aria-labelledby={labelId}>
          {group.label != null && (
            <div id={labelId} role="presentation" data-rdm-group-label="">
              {group.label}
            </div>
          )}
          {group.items.map((radio) =>
            renderNavButton(
              { item: radio, group, matchText: null },
              "menuitemradio",
              { checked: radio.value === group.value },
            ),
          )}
        </div>
      );
    }

    if (t === "checkbox") {
      const cb = item as DropdownCheckboxItem;
      return renderNavButton({ item: cb, matchText: null }, "menuitemcheckbox", {
        checked: cb.checked,
      });
    }

    // action
    const action = item as DropdownActionItem;
    const hasSubmenu = Boolean(action.submenu && action.submenu.length > 0);
    const submenuOpen = hasSubmenu && openSubmenuId === action.id;
    const button = renderNavButton(
      { item: action, matchText: null },
      "menuitem",
      { hasSubmenu, submenuOpen },
    );

    if (!hasSubmenu) return button;

    return (
      <div key={action.id} data-rdm-submenu-wrapper="" style={{ position: "relative" }}>
        {button}
        {submenuOpen && (
          <div
            role="menu"
            aria-label={typeof action.label === "string" ? action.label : undefined}
            data-rdm-submenu=""
            data-rdm-side={side}
            style={{ position: "absolute", top: 0, left: "100%" }}
          >
            {action.submenu!.map((sub) => (
              <SubmenuItem
                key={sub.id}
                item={sub}
                onSelect={onSelect}
                onClose={() => closeMenu(true)}
                closeOnSelect={closeOnSelect}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      ref={rootRef}
      className={className}
      data-rdm-root=""
      data-rdm-placement={placement}
      style={{ position: "relative", display: "inline-block" }}
    >
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
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
          data-rdm-menu=""
          data-rdm-side={side}
          data-rdm-align={align}
          className={menuClassName}
          onKeyDown={onMenuKeyDown}
          style={{
            position: "absolute",
            [side === "top" ? "bottom" : "top"]: "100%",
            [align === "end" ? "right" : "left"]: 0,
          }}
        >
          {items.map((item) => renderItem(item))}
        </div>
      )}
    </div>
  );
}

/**
 * A leaf item rendered inside a submenu. Submenu items support the same item
 * kinds as the top level (minus further nesting, which collapses to a plain
 * action) and activate through the shared `onSelect`.
 */
function SubmenuItem({
  item,
  onSelect,
  onClose,
  closeOnSelect,
}: {
  item: DropdownItem;
  onSelect?: (id: string, detail: SelectDetail) => void;
  onClose: () => void;
  closeOnSelect: boolean;
}): JSX.Element | null {
  const t = itemType(item);

  if (t === "separator") {
    return <div role="separator" data-rdm-separator="" aria-orientation="horizontal" />;
  }
  if (t === "label") {
    const lbl = item as DropdownLabel;
    return (
      <div role="presentation" data-rdm-group-label="">
        {lbl.label}
      </div>
    );
  }
  if (t === "radio-group") {
    // Submenus flatten radio groups into individual radio buttons.
    const group = item as DropdownRadioGroup;
    return (
      <div role="group">
        {group.items.map((radio) => (
          <button
            key={radio.id}
            role="menuitemradio"
            type="button"
            aria-checked={radio.value === group.value}
            aria-disabled={radio.disabled || undefined}
            disabled={radio.disabled}
            data-rdm-item=""
            onClick={() => {
              if (radio.disabled) return;
              group.onValueChange?.(radio.value);
              onSelect?.(radio.id, {
                id: radio.id,
                type: "radio",
                value: radio.value,
              });
              if (closeOnSelect) onClose();
            }}
          >
            <span data-rdm-label="">{radio.label}</span>
          </button>
        ))}
      </div>
    );
  }

  if (t === "checkbox") {
    const cb = item as DropdownCheckboxItem;
    return (
      <button
        role="menuitemcheckbox"
        type="button"
        aria-checked={cb.checked}
        aria-disabled={cb.disabled || undefined}
        disabled={cb.disabled}
        data-rdm-item=""
        onClick={() => {
          if (cb.disabled) return;
          const next = !cb.checked;
          cb.onCheckedChange?.(next);
          onSelect?.(cb.id, { id: cb.id, type: "checkbox", checked: next });
          if (closeOnSelect) onClose();
        }}
      >
        <span data-rdm-label="">{cb.label}</span>
      </button>
    );
  }

  const action = item as DropdownActionItem;
  return (
    <button
      role="menuitem"
      type="button"
      aria-disabled={action.disabled || undefined}
      disabled={action.disabled}
      data-rdm-item=""
      onClick={() => {
        if (action.disabled) return;
        onSelect?.(action.id, { id: action.id, type: "action" });
        if (closeOnSelect) onClose();
      }}
    >
      {action.icon != null && (
        <span data-rdm-icon="" aria-hidden="true">
          {action.icon}
        </span>
      )}
      <span data-rdm-label="">{action.label}</span>
      {action.shortcut != null && (
        <span data-rdm-shortcut="" aria-hidden="true">
          {action.shortcut}
        </span>
      )}
    </button>
  );
}
