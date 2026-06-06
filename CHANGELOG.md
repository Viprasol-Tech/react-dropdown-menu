# Changelog

Format based on [Keep a Changelog](https://keepachangelog.com/); versioning
follows [SemVer](https://semver.org/).

## [0.2.0] - 2025

### Added
- **Submenus** — action items can declare a nested `submenu`; opened with
  `ArrowRight` / click and closed with `ArrowLeft`, with `aria-haspopup` and
  `aria-expanded` on the parent.
- **Checkbox items** (`type: "checkbox"`) rendered as `menuitemcheckbox` with
  `aria-checked` and an `onCheckedChange` callback.
- **Radio groups** (`type: "radio-group"` + `type: "radio"`) rendered as
  `menuitemradio` inside a labelled `role="group"`, with `onValueChange`.
- **Separators** (`type: "separator"`) and **section labels** (`type: "label"`)
  that are skipped by keyboard navigation.
- **Type-ahead** — type printable characters to jump to matching items; repeated
  keys cycle through items sharing a prefix. Configurable via `typeAhead` and
  `typeAheadTimeout`. Backed by a new pure `typeahead()` helper.
- **Controlled open state** — `open` / `defaultOpen` / `onOpenChange`.
- **Placement** — `placement` prop (`bottom-start`, `bottom-end`, `top-start`,
  `top-end`, …) with `placementSide` / `placementAlign` helpers and
  `data-rdm-side` / `data-rdm-align` hooks.
- `closeOnSelect`, `disabled`, `menuClassName`, plus per-item `icon` and
  `shortcut` slots and a `textValue` override for type-ahead.
- Structured `onSelect(id, detail)` payload describing the activated item.

### Changed
- `onSelect` now receives a second `SelectDetail` argument.
- `DropdownItem` is now a discriminated union; plain `{ id, label }` objects keep
  working as action items for backward compatibility.

## [0.1.0] - 2025

### Added
- Initial release of react-dropdown-menu: Accessible dropdown menu component for React with keyboard nav.
