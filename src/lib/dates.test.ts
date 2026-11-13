import { describe, expect, it } from "vitest";
import { addDays, calendarDays, displayDay, weekday } from "./dates";

describe("dates", () => {
  it("soma dias atravessando mês, ano e ano bissexto", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2027-01-01", -1)).toBe("2026-12-31");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("sabe o dia da semana e formata para exibição", () => {
    expect(weekday("2026-11-08")).toBe(0); // domingo
    expect(weekday("2026-11-12")).toBe(4); // quinta
    expect(displayDay("2026-11-12")).toBe("12/11/2026");
  });

  it("monta um calendário que começa no domingo e termina hoje", () => {
    const days = calendarDays("2026-11-12", 53);
    expect(days[days.length - 1]).toBe("2026-11-12");
    expect(weekday(days[0])).toBe(0);
    expect(days.length).toBe(52 * 7 + 5);
    expect(new Set(days).size).toBe(days.length);
  });
});
