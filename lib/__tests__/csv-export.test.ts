import { describe, expect, it } from "vitest";
import { escapeCsvField } from "@/lib/csv-export";

describe("escapeCsvField", () => {
  it("returns plain strings unchanged", () => {
    expect(escapeCsvField("Dragon")).toBe("Dragon");
    expect(escapeCsvField("Fireball")).toBe("Fireball");
  });

  it("returns plain numbers unchanged", () => {
    expect(escapeCsvField(42)).toBe("42");
    expect(escapeCsvField(3.14)).toBe("3.14");
  });

  it("escapes formula-triggering = prefix", () => {
    expect(escapeCsvField('=CMD("calc")')).toBe(`"'=CMD(""calc"")"`)
  });

  it("escapes formula-triggering + prefix", () => {
    expect(escapeCsvField("+SUM(A1:A100)")).toBe(`"'+SUM(A1:A100)"`);
  });

  it("escapes formula-triggering - prefix", () => {
    expect(escapeCsvField("-1+1")).toBe(`"'-1+1"`);
  });

  it("escapes formula-triggering @ prefix", () => {
    expect(escapeCsvField("@import")).toBe(`"'@import"`);
  });

  it("escapes formula-triggering tab prefix", () => {
    expect(escapeCsvField("\tcmd")).toBe(`"'\tcmd"`);
  });

  it("quotes fields containing commas", () => {
    expect(escapeCsvField("Dragon, Ancient")).toBe('"Dragon, Ancient"');
  });

  it("quotes and doubles internal double-quotes", () => {
    expect(escapeCsvField('He said "hello"')).toBe('"He said ""hello"""');
  });

  it("quotes fields containing newlines", () => {
    expect(escapeCsvField("line1\nline2")).toBe('"line1\nline2"');
  });

  it("handles formula prefix combined with quotes", () => {
    expect(escapeCsvField('=HYPERLINK("http://evil.com")')).toBe(`"'=HYPERLINK(""http://evil.com"")"`)
  });
});
