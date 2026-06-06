import { describe, expect, it } from "vitest";
import {
  edgeIndex,
  emptyTypeahead,
  nextIndex,
  placementAlign,
  placementSide,
  typeahead,
} from "../logic.js";

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

  it("returns -1 for non-finite lengths", () => {
    expect(nextIndex(0, Number.NaN, 1, true)).toBe(-1);
    expect(nextIndex(0, Number.POSITIVE_INFINITY, 1, true)).toBe(-1);
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

  it("returns -1 for non-finite lengths", () => {
    expect(edgeIndex("first", Number.NaN)).toBe(-1);
  });
});

describe("typeahead", () => {
  const labels = ["file", "format", "find", "save"];

  it("matches a single character by prefix from the start", () => {
    const r = typeahead(emptyTypeahead(), "s", labels, -1, 1000);
    expect(r.matchIndex).toBe(3); // "save"
    expect(r.state.query).toBe("s");
  });

  it("accumulates a prefix within the timeout window", () => {
    let state = emptyTypeahead();
    let r = typeahead(state, "f", labels, -1, 1000);
    expect(r.matchIndex).toBe(0); // "file"
    state = r.state;
    r = typeahead(state, "o", labels, 0, 1100);
    expect(r.matchIndex).toBe(1); // "format" (prefix "fo")
    expect(r.state.query).toBe("fo");
  });

  it("cycles through items sharing a first letter on repeated key", () => {
    let r = typeahead(emptyTypeahead(), "f", labels, -1, 1000);
    expect(r.matchIndex).toBe(0); // file
    r = typeahead(r.state, "f", labels, 0, 1100);
    expect(r.matchIndex).toBe(1); // format
    r = typeahead(r.state, "f", labels, 1, 1200);
    expect(r.matchIndex).toBe(2); // find
    r = typeahead(r.state, "f", labels, 2, 1300);
    expect(r.matchIndex).toBe(0); // wraps back to file
  });

  it("resets the buffer after the timeout window", () => {
    let r = typeahead(emptyTypeahead(), "f", labels, -1, 1000);
    expect(r.state.query).toBe("f");
    // Long gap -> buffer expires, "s" matches as a fresh single char.
    r = typeahead(r.state, "s", labels, 0, 5000);
    expect(r.matchIndex).toBe(3); // save
    expect(r.state.query).toBe("s");
  });

  it("returns -1 when nothing matches", () => {
    const r = typeahead(emptyTypeahead(), "z", labels, -1, 1000);
    expect(r.matchIndex).toBe(-1);
  });

  it("is case-insensitive", () => {
    const r = typeahead(emptyTypeahead(), "S", labels, -1, 1000);
    expect(r.matchIndex).toBe(3);
  });

  it("skips null (disabled) slots", () => {
    const withHole = ["file", null, "find", "save"];
    const r = typeahead(emptyTypeahead(), "f", withHole, -1, 1000);
    expect(r.matchIndex).toBe(0);
    const r2 = typeahead(r.state, "f", withHole, 0, 1100);
    // Next "f..." after index 0, skipping the null at 1 -> "find" at 2.
    expect(r2.matchIndex).toBe(2);
  });

  it("returns -1 for an empty label set", () => {
    const r = typeahead(emptyTypeahead(), "a", [], -1, 1000);
    expect(r.matchIndex).toBe(-1);
  });
});

describe("placementSide / placementAlign", () => {
  it("resolves sides", () => {
    expect(placementSide("bottom")).toBe("bottom");
    expect(placementSide("bottom-end")).toBe("bottom");
    expect(placementSide("top")).toBe("top");
    expect(placementSide("top-start")).toBe("top");
  });

  it("resolves alignment with start as default", () => {
    expect(placementAlign("bottom")).toBe("start");
    expect(placementAlign("bottom-start")).toBe("start");
    expect(placementAlign("bottom-end")).toBe("end");
    expect(placementAlign("top-end")).toBe("end");
  });
});
