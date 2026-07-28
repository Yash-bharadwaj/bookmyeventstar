import { describe, it, expect } from "vitest";
import { formatCurrency, getInitials, getStatusColor, getStatusLabel, EVENT_TYPES } from "@/lib/utils";

describe("formatCurrency", () => {
  it("formats a whole-number amount as INR with no decimals", () => {
    expect(formatCurrency(50000)).toBe("₹50,000");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("₹0");
  });

  it("uses Indian digit grouping for large amounts", () => {
    expect(formatCurrency(1000000)).toBe("₹10,00,000");
  });
});

describe("getInitials", () => {
  it("takes the first letter of the first two words", () => {
    expect(getInitials("Priya Sharma")).toBe("PS");
  });

  it("uppercases a single-word name to a single initial", () => {
    expect(getInitials("Madonna")).toBe("M");
  });
});

describe("getStatusColor", () => {
  it("returns a known mapping for a recognized status", () => {
    expect(getStatusColor("confirmed")).toBe("bg-green-100 text-green-700");
  });

  it("falls back to a neutral gray for an unrecognized status", () => {
    expect(getStatusColor("totally_made_up_status")).toBe("bg-gray-100 text-gray-700");
  });
});

describe("getStatusLabel", () => {
  it("title-cases and de-underscores a snake_case status", () => {
    expect(getStatusLabel("requirement_gathering")).toBe("Requirement Gathering");
  });

  it("passes through a single-word status unchanged (title-cased)", () => {
    expect(getStatusLabel("new")).toBe("New");
  });
});

describe("static data sanity", () => {
  it("EVENT_TYPES has no duplicates", () => {
    expect(new Set(EVENT_TYPES).size).toBe(EVENT_TYPES.length);
  });
});
