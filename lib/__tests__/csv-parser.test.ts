import { describe, expect, it } from "vitest";
import { parseCsvCards } from "@/components/projects/workbench/types";

describe("parseCsvCards", () => {
  it("parses valid CSV text", () => {
    const csv = `name,cost,power,quantity,damage,draw
Rune Wolf,3,3,2,2,0
Arc Bolt,2,2,4,2,0`;

    const cards = parseCsvCards(csv);
    expect(cards).toHaveLength(2);
    expect(cards[0]!.name).toBe("Rune Wolf");
    expect(cards[0]!.cost).toBe(3);
    expect(cards[0]!.power).toBe(3);
    expect(cards[0]!.quantity).toBe(2);
    expect(cards[0]!.stats).toEqual({ damage: 2, draw: 0 });
    expect(cards[1]!.name).toBe("Arc Bolt");
  });

  it("throws on insufficient rows", () => {
    expect(() => parseCsvCards("name,cost")).toThrow("header row and at least one data row");
  });

  it("generates default name for missing name column", () => {
    const csv = `cost,power,quantity
3,3,2`;
    const cards = parseCsvCards(csv);
    expect(cards[0]!.name).toBe("Imported card 1");
  });

  it("handles extra stat columns", () => {
    const csv = `name,cost,power,quantity,shield,economy
Guard,3,3,2,2,1`;
    const cards = parseCsvCards(csv);
    expect(cards[0]!.stats).toEqual({ shield: 2, economy: 1 });
  });

  it("handles Windows-style line endings", () => {
    const csv = "name,cost,power,quantity\r\nWolf,3,3,2\r\nBolt,2,2,4";
    const cards = parseCsvCards(csv);
    expect(cards).toHaveLength(2);
  });

  it("handles whitespace in cells", () => {
    const csv = `name, cost, power, quantity
  Rune Wolf , 3 , 3 , 2 `;
    const cards = parseCsvCards(csv);
    expect(cards[0]!.name).toBe("Rune Wolf");
    expect(cards[0]!.cost).toBe(3);
  });
});
