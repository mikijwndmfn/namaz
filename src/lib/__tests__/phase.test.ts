import { describe, expect, it } from "vitest";
import { findLocation } from "../../data/locations";
import { getDayTimes } from "../providers";
import { currentPhase, windowEnd } from "../phase";
import { zonedDateTime } from "../tz";

const nbg = findLocation("nuernberg");
const at = (date: string, hhmm: string) => zonedDateTime(date, hhmm, nbg.tz);
// Diyanet Nürnberg 15.01.2027: 06:12 08:00 12:30 14:28 16:50 18:25 ; 16.01.: İmsak 06:12

describe("Tagesphasen", () => {
  it("Sabah zwischen İmsak und Güneş", () => {
    const p = currentPhase(nbg, at("2027-01-15", "07:00"), getDayTimes);
    expect(p.kind).toBe("prayer");
    expect(p.title).toBe("Sabah");
    expect(p.endTime).toBe("08:00");
    expect(p.remainingMinutes).toBe(60);
    expect(p.progress).toBeCloseTo(48 / 108, 2);
  });
  it("Kerahat 45 Minuten nach Sonnenaufgang", () => {
    const p = currentPhase(nbg, at("2027-01-15", "08:20"), getDayTimes);
    expect(p.kind).toBe("kerahat");
    expect(p.endTime).toBe("08:45");
    expect(p.nextTime).toBe("12:30");
  });
  it("freie Zeit vor Öğle", () => {
    const p = currentPhase(nbg, at("2027-01-15", "10:00"), getDayTimes);
    expect(p.kind).toBe("free");
    expect(p.nextPrayer).toBe("ogle");
    expect(p.endTime).toBe("12:20");
  });
  it("istiva kurz vor Öğle", () => {
    const p = currentPhase(nbg, at("2027-01-15", "12:25"), getDayTimes);
    expect(p.kind).toBe("kerahat");
    expect(p.nextTime).toBe("12:30");
  });
  it("Öğle läuft bis İkindi", () => {
    const p = currentPhase(nbg, at("2027-01-15", "13:00"), getDayTimes);
    expect(p.kind).toBe("prayer");
    expect(p.prayer).toBe("ogle");
    expect(p.endTime).toBe("14:28");
    expect(p.urgent).toBe(false);
  });
  it("İkindi wird dringend und endet 45 Minuten vor Akşam", () => {
    const p = currentPhase(nbg, at("2027-01-15", "15:50"), getDayTimes);
    expect(p.prayer).toBe("ikindi");
    expect(p.endTime).toBe("16:05");
    expect(p.urgent).toBe(true);
    const k = currentPhase(nbg, at("2027-01-15", "16:30"), getDayTimes);
    expect(k.kind).toBe("kerahat");
    expect(k.nextTime).toBe("16:50");
  });
  it("Yatsı läuft über Mitternacht bis İmsak morgen", () => {
    const p = currentPhase(nbg, at("2027-01-15", "23:30"), getDayTimes);
    expect(p.prayer).toBe("yatsi");
    expect(p.endTime).toBe("06:12");
    const q = currentPhase(nbg, at("2027-01-16", "02:00"), getDayTimes);
    expect(q.prayer).toBe("yatsi");
    expect(q.endTime).toBe("06:12");
    expect(q.remainingMinutes).toBe(252);
  });
  it("Fensterende in der Liste", () => {
    const T = getDayTimes(nbg, "2027-01-15").times;
    expect(windowEnd("imsak", T, "06:11")).toBe("08:00");
    expect(windowEnd("gunes", T, "06:11")).toBeNull();
    expect(windowEnd("yatsi", T, "06:11")).toBe("06:11");
  });
});
