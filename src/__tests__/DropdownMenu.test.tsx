import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DropdownMenu, type DropdownItem } from "../DropdownMenu.js";

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

describe("DropdownMenu", () => {
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

  it("moves active item down with ArrowDown and skips disabled items", () => {
    const { trigger } = setup();
    fireEvent.click(trigger);
    const menu = screen.getByRole("menu");
    // Opened -> Cut active. Down -> Copy. Down -> skip Paste (disabled) -> Delete.
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

  it("moves active item up with ArrowUp", () => {
    const { trigger } = setup();
    fireEvent.click(trigger);
    const menu = screen.getByRole("menu");
    // Cut active -> Up wraps (loop default) to last enabled = Delete.
    fireEvent.keyDown(menu, { key: "ArrowUp" });
    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveAttribute(
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

  it("fires onSelect with the item id when Enter is pressed", () => {
    const { trigger, onSelect } = setup();
    fireEvent.click(trigger);
    const menu = screen.getByRole("menu");
    // Cut active -> Down -> Copy active -> Enter selects "copy".
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    fireEvent.keyDown(menu, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("copy");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("fires onSelect when an item is clicked", () => {
    const { trigger, onSelect } = setup();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
    expect(onSelect).toHaveBeenCalledWith("delete");
  });

  it("does not select a disabled item on click", () => {
    const { trigger, onSelect } = setup();
    fireEvent.click(trigger);
    const paste = screen.getByRole("menuitem", { name: "Paste" });
    fireEvent.click(paste);
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
});
