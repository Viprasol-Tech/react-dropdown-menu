import { describe, expect, it } from "vitest";
import { edgeIndex, nextIndex } from "../logic.js";

describe("nextIndex", () => {
  it("returns first item when nothing active and moving down", () => {
    expect(nextIndex(-1, 4, 1, true)).toBe(0);
  });

  it("returns last item when nothing active and moving up", () => {
    expect(nextIndex(-1, 4, -1, true)).toBe(3);
  });

  it("moves forward within range", () => {
    expect(nextIndex(1, 4, 1, true)).toBe(2);
  });

  it("moves backward within range", () => {
    expect(nextIndex(2, 4, -1, true)).toBe(1);
  });

  it("wraps from last to first when looping forward", () => {
    expect(nextIndex(3, 4, 1, true)).toBe(0);
  });

  it("wraps from first to last when looping backward", () => {
    expect(nextIndex(0, 4, -1, true)).toBe(3);
  });

  it("clamps at the last item when not looping", () => {
    expect(nextIndex(3, 4, 1, false)).toBe(3);
  });

  it("clamps at the first item when not looping", () => {
    expect(nextIndex(0, 4, -1, false)).toBe(0);
  });

  it("clamps a stale out-of-range current into the window", () => {
    expect(nextIndex(99, 4, 1, false)).toBe(3);
    expect(nextIndex(99, 4, -1, true)).toBe(2);
  });

  it("returns -1 when there are no items", () => {
    expect(nextIndex(0, 0, 1, true)).toBe(-1);
    expect(nextIndex(-1, 0, -1, false)).toBe(-1);
  });

  it("handles a single-item list with wrap", () => {
    expect(nextIndex(0, 1, 1, true)).toBe(0);
    expect(nextIndex(0, 1, -1, true)).toBe(0);
  });
});

describe("edgeIndex", () => {
  it("returns 0 for the first edge", () => {
    expect(edgeIndex("first", 5)).toBe(0);
  });

  it("returns len-1 for the last edge", () => {
    expect(edgeIndex("last", 5)).toBe(4);
  });

  it("returns -1 for an empty list", () => {
    expect(edgeIndex("first", 0)).toBe(-1);
    expect(edgeIndex("last", 0)).toBe(-1);
  });
});
