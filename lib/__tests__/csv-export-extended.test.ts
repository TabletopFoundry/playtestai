import { describe, expect, it } from "vitest";
import { escapeCsvField } from "@/lib/csv-export";

describe("escapeCsvField edge cases", () => {
  it("handles empty string", () => {
    expect(escapeCsvField("")).toBe("");
  });

  it("handles carriage return prefix", () => {
    const result = escapeCsvField("\rcmd");
    expect(result.startsWith('"')).toBe(true);
    expect(result).toContain("'");
  });

  it("handles number zero", () => {
    expect(escapeCsvField(0)).toBe("0");
  });

  it("handles negative numbers (formula-triggering)", () => {
    const result = escapeCsvField(-42);
    expect(result).toContain("'");
  });

  it("handles string with only commas", () => {
    const result = escapeCsvField(",,,");
    expect(result.startsWith('"')).toBe(true);
    expect(result.endsWith('"')).toBe(true);
  });

  it("handles very long strings", () => {
    const long = "a".repeat(10_000);
    expect(escapeCsvField(long)).toBe(long);
  });

  it("handles string with mixed special characters", () => {
    const result = escapeCsvField('=FORMULA,"with quotes"');
    expect(result.startsWith('"')).toBe(true);
    expect(result).toContain("'=");
  });
});
