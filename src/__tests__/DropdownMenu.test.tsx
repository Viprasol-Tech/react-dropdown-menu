import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  DropdownMenu,
  type DropdownItem,
} from "../DropdownMenu.js";

const items: DropdownItem[] = [
  { id: "cut", label: "Cut" },
  { id: "copy", label: "Copy" },
  { id: "paste", label: "Paste", disabled: true },
  { id: "delete", label: "Delete" },
];

function setup(onSelect = vi.fn()) {
  render(<DropdownMenu label="Edit" items={items} onSelect={onSelect} />);
  const trigger = screen.getByRole("button", { name: "Edit" });
  return { trigger, onSelect };
}

describe("DropdownMenu — core behaviour", () => {
  it("is closed initially with aria-expanded=false", () => {
    setup();
    const trigger = screen.getByRole("button", { name: "Edit" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("opens on click and renders the menu", () => {
    const { trigger } = setup();
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getAllByRole("menuitem")).toHaveLength(4);
  });

  it("activates the first enabled item when opened with ArrowDown on trigger", () => {
    const { trigger } = setup();
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    const first = screen.getByRole("menuitem", { name: "Cut" });
    expect(first).toHaveAttribute("data-active", "");
  });

  it("opens to the last enabled item with ArrowUp on the trigger", () => {
    const { trigger } = setup();
    fireEvent.keyDown(trigger, { key: "ArrowUp" });
    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveAttribute(
      "data-active",
      "",
    );
  });

  it("moves active item down with ArrowDown and skips disabled items", () => {
    const { trigger } = setup();
    fireEvent.click(trigger);
    const menu = screen.getByRole("menu");
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(screen.getByRole("menuitem", { name: "Copy" })).toHaveAttribute(
      "data-active",
      "",
    );
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveAttribute(
      "data-active",
      "",
    );
    expect(screen.getByRole("menuitem", { name: "Paste" })).not.toHaveAttribute(
      "data-active",
    );
  });

  it("moves active item up with ArrowUp (wrapping by default)", () => {
    const { trigger } = setup();
    fireEvent.click(trigger);
    const menu = screen.getByRole("menu");
    fireEvent.keyDown(menu, { key: "ArrowUp" });
    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveAttribute(
      "data-active",
      "",
    );
  });

  it("does not wrap when loop is false", () => {
    render(<DropdownMenu label="Edit" items={items} loop={false} />);
    const trigger = screen.getByRole("button", { name: "Edit" });
    fireEvent.click(trigger);
    const menu = screen.getByRole("menu");
    // Opened on first (Cut). ArrowUp should clamp, staying on Cut.
    fireEvent.keyDown(menu, { key: "ArrowUp" });
    expect(screen.getByRole("menuitem", { name: "Cut" })).toHaveAttribute(
      "data-active",
      "",
    );
  });

  it("closes on Escape and restores focus to the trigger", () => {
    const { trigger } = setup();
    fireEvent.click(trigger);
    const menu = screen.getByRole("menu");
    fireEvent.keyDown(menu, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });

  it("closes on Tab without restoring focus to the trigger", () => {
    const { trigger } = setup();
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Tab" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("fires onSelect with id and detail when Enter is pressed", () => {
    const { trigger, onSelect } = setup();
    fireEvent.click(trigger);
    const menu = screen.getByRole("menu");
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    fireEvent.keyDown(menu, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("copy", {
      id: "copy",
      type: "action",
    });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("fires onSelect when an item is clicked", () => {
    const { trigger, onSelect } = setup();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
    expect(onSelect).toHaveBeenCalledWith("delete", {
      id: "delete",
      type: "action",
    });
  });

  it("does not select a disabled item on click", () => {
    const { trigger, onSelect } = setup();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("menuitem", { name: "Paste" }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("jumps to first and last enabled items with Home/End", () => {
    const { trigger } = setup();
    fireEvent.click(trigger);
    const menu = screen.getByRole("menu");
    fireEvent.keyDown(menu, { key: "End" });
    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveAttribute(
      "data-active",
      "",
    );
    fireEvent.keyDown(menu, { key: "Home" });
    expect(screen.getByRole("menuitem", { name: "Cut" })).toHaveAttribute(
      "data-active",
      "",
    );
  });

  it("closes when clicking outside the menu", () => {
    const { trigger } = setup();
    fireEvent.click(trigger);
    expect(screen.getByRole("menu")).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});

describe("DropdownMenu — disabled trigger", () => {
  it("does not open when the trigger is disabled", () => {
    render(<DropdownMenu label="Edit" items={items} disabled />);
    const trigger = screen.getByRole("button", { name: "Edit" });
    expect(trigger).toBeDisabled();
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});

describe("DropdownMenu — controlled open state", () => {
  it("renders open when open=true and reports requested changes", () => {
    const onOpenChange = vi.fn();
    render(
      <DropdownMenu
        label="Edit"
        items={items}
        open
        onOpenChange={onOpenChange}
      />,
    );
    expect(screen.getByRole("menu")).toBeInTheDocument();
    // Escape requests a close but the parent controls the state.
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    // Still open because the controlled prop did not change.
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("respects defaultOpen for uncontrolled usage", () => {
    render(<DropdownMenu label="Edit" items={items} defaultOpen />);
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });
});

describe("DropdownMenu — closeOnSelect", () => {
  it("keeps the menu open after selection when closeOnSelect is false", () => {
    const onSelect = vi.fn();
    render(
      <DropdownMenu
        label="Edit"
        items={items}
        onSelect={onSelect}
        closeOnSelect={false}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Cut" }));
    expect(onSelect).toHaveBeenCalledWith("cut", { id: "cut", type: "action" });
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });
});

describe("DropdownMenu — separators and labels", () => {
  const withMeta: DropdownItem[] = [
    { type: "label", id: "lbl", label: "Actions" },
    { id: "open", label: "Open" },
    { type: "separator", id: "sep" },
    { id: "quit", label: "Quit" },
  ];

  it("renders a separator and a presentational label", () => {
    render(<DropdownMenu label="File" items={withMeta} defaultOpen />);
    expect(screen.getByRole("separator")).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();
    // Only the two real commands are menuitems.
    expect(screen.getAllByRole("menuitem")).toHaveLength(2);
  });

  it("does not let arrow navigation land on separators or labels", () => {
    render(<DropdownMenu label="File" items={withMeta} defaultOpen />);
    const menu = screen.getByRole("menu");
    fireEvent.keyDown(menu, { key: "ArrowDown" }); // first -> Open
    fireEvent.keyDown(menu, { key: "ArrowDown" }); // -> Quit (skips separator)
    expect(screen.getByRole("menuitem", { name: "Quit" })).toHaveAttribute(
      "data-active",
      "",
    );
  });
});

describe("DropdownMenu — checkbox items", () => {
  it("renders menuitemcheckbox with aria-checked and toggles", () => {
    const onCheckedChange = vi.fn();
    const onSelect = vi.fn();
    const cbItems: DropdownItem[] = [
      {
        type: "checkbox",
        id: "wrap",
        label: "Word Wrap",
        checked: false,
        onCheckedChange,
      },
    ];
    render(
      <DropdownMenu
        label="View"
        items={cbItems}
        onSelect={onSelect}
        defaultOpen
      />,
    );
    const cb = screen.getByRole("menuitemcheckbox", { name: "Word Wrap" });
    expect(cb).toHaveAttribute("aria-checked", "false");
    fireEvent.click(cb);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(onSelect).toHaveBeenCalledWith("wrap", {
      id: "wrap",
      type: "checkbox",
      checked: true,
    });
  });
});

describe("DropdownMenu — radio groups", () => {
  const radioItems: DropdownItem[] = [
    {
      type: "radio-group",
      id: "theme",
      label: "Theme",
      value: "light",
      onValueChange: vi.fn(),
      items: [
        { type: "radio", id: "r-light", label: "Light", value: "light" },
        { type: "radio", id: "r-dark", label: "Dark", value: "dark" },
      ],
    },
  ];

  it("renders menuitemradio with the active value checked", () => {
    render(<DropdownMenu label="View" items={radioItems} defaultOpen />);
    expect(
      screen.getByRole("menuitemradio", { name: "Light" }),
    ).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("menuitemradio", { name: "Dark" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("fires onValueChange and onSelect when a radio is chosen", () => {
    const onValueChange = vi.fn();
    const onSelect = vi.fn();
    const groups: DropdownItem[] = [
      {
        type: "radio-group",
        id: "theme",
        value: "light",
        onValueChange,
        items: [
          { type: "radio", id: "r-light", label: "Light", value: "light" },
          { type: "radio", id: "r-dark", label: "Dark", value: "dark" },
        ],
      },
    ];
    render(
      <DropdownMenu
        label="View"
        items={groups}
        onSelect={onSelect}
        defaultOpen
      />,
    );
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Dark" }));
    expect(onValueChange).toHaveBeenCalledWith("dark");
    expect(onSelect).toHaveBeenCalledWith("r-dark", {
      id: "r-dark",
      type: "radio",
      value: "dark",
    });
  });
});

describe("DropdownMenu — submenus", () => {
  const nested: DropdownItem[] = [
    { id: "new", label: "New" },
    {
      id: "share",
      label: "Share",
      submenu: [
        { id: "email", label: "Email" },
        { id: "link", label: "Copy Link" },
      ],
    },
  ];

  it("marks submenu parents with aria-haspopup", () => {
    render(<DropdownMenu label="File" items={nested} defaultOpen />);
    const parent = screen.getByRole("menuitem", { name: /Share/ });
    expect(parent).toHaveAttribute("aria-haspopup", "menu");
    expect(parent).toHaveAttribute("aria-expanded", "false");
  });

  it("opens a submenu with ArrowRight and closes it with ArrowLeft", () => {
    render(<DropdownMenu label="File" items={nested} defaultOpen />);
    const menu = screen.getAllByRole("menu")[0];
    fireEvent.keyDown(menu, { key: "ArrowDown" }); // New
    fireEvent.keyDown(menu, { key: "ArrowDown" }); // Share
    fireEvent.keyDown(menu, { key: "ArrowRight" });
    expect(screen.getByRole("menuitem", { name: "Email" })).toBeInTheDocument();
    fireEvent.keyDown(menu, { key: "ArrowLeft" });
    expect(
      screen.queryByRole("menuitem", { name: "Email" }),
    ).not.toBeInTheDocument();
  });

  it("activating a submenu parent opens its submenu rather than selecting", () => {
    const onSelect = vi.fn();
    render(
      <DropdownMenu
        label="File"
        items={nested}
        onSelect={onSelect}
        defaultOpen
      />,
    );
    fireEvent.click(screen.getByRole("menuitem", { name: /Share/ }));
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByRole("menuitem", { name: "Email" })).toBeInTheDocument();
  });

  it("selecting a submenu leaf fires onSelect and closes everything", () => {
    const onSelect = vi.fn();
    render(
      <DropdownMenu
        label="File"
        items={nested}
        onSelect={onSelect}
        defaultOpen
      />,
    );
    fireEvent.click(screen.getByRole("menuitem", { name: /Share/ }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Email" }));
    expect(onSelect).toHaveBeenCalledWith("email", {
      id: "email",
      type: "action",
    });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});

describe("DropdownMenu — type-ahead", () => {
  const taItems: DropdownItem[] = [
    { id: "file", label: "File" },
    { id: "format", label: "Format" },
    { id: "find", label: "Find" },
    { id: "save", label: "Save" },
  ];

  it("focuses an item whose label starts with the typed character", () => {
    render(<DropdownMenu label="Menu" items={taItems} defaultOpen />);
    const menu = screen.getByRole("menu");
    fireEvent.keyDown(menu, { key: "s" });
    expect(screen.getByRole("menuitem", { name: "Save" })).toHaveAttribute(
      "data-active",
      "",
    );
  });

  it("cycles through items sharing a first letter", () => {
    render(<DropdownMenu label="Menu" items={taItems} defaultOpen />);
    const menu = screen.getByRole("menu");
    fireEvent.keyDown(menu, { key: "f" });
    expect(screen.getByRole("menuitem", { name: "File" })).toHaveAttribute(
      "data-active",
      "",
    );
    fireEvent.keyDown(menu, { key: "f" });
    expect(screen.getByRole("menuitem", { name: "Format" })).toHaveAttribute(
      "data-active",
      "",
    );
  });

  it("does nothing when typeAhead is disabled", () => {
    render(
      <DropdownMenu label="Menu" items={taItems} typeAhead={false} defaultOpen />,
    );
    const menu = screen.getByRole("menu");
    fireEvent.keyDown(menu, { key: "s" });
    expect(screen.getByRole("menuitem", { name: "Save" })).not.toHaveAttribute(
      "data-active",
    );
  });
});

describe("DropdownMenu — placement", () => {
  it("exposes placement on the root and side/align on the menu", () => {
    render(
      <DropdownMenu
        label="Menu"
        items={items}
        placement="top-end"
        defaultOpen
      />,
    );
    const menu = screen.getByRole("menu");
    expect(menu).toHaveAttribute("data-rdm-side", "top");
    expect(menu).toHaveAttribute("data-rdm-align", "end");
  });
});

describe("DropdownMenu — accessibility wiring", () => {
  it("links the trigger and menu via aria attributes", () => {
    const { trigger } = setup();
    fireEvent.click(trigger);
    const menu = screen.getByRole("menu");
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger).toHaveAttribute("aria-controls", menu.id);
    expect(menu).toHaveAttribute("aria-labelledby", trigger.id);
  });

  it("uses the provided ariaLabel on the trigger", () => {
    render(<DropdownMenu label={<span>icon</span>} items={items} ariaLabel="More actions" />);
    expect(
      screen.getByRole("button", { name: "More actions" }),
    ).toBeInTheDocument();
  });
});
