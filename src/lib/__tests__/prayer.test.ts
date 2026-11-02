import { describe, expect, it } from "vitest";
import { findLocation } from "../../data/locations";
import { fromAdhan, fromDiyanet, getDayTimes } from "../providers";
import { currentPrayer, formatRemaining, nextPrayer } from "../prayer";
import { addDays, isoDateInZone, zonedDateTime } from "../tz";
import { loadSettings, saveSettings } from "../settings";
import { speechText, turkishNumber } from "../speech";

const nbg = findLocation("nuernberg");
const ist = findLocation("istanbul");

/** Hilfe: Zeitpunkt aus Wanduhrzeit am Standort. */
const at = (loc = nbg, date: string, hhmm: string) => zonedDateTime(date, hhmm, loc.tz);

describe("Zeitzonen", () => {
  it("rechnet Wanduhrzeit korrekt um (Winterzeit)", () => {
    expect(at(nbg, "2027-01-15", "12:00").toISOString()).toBe("2027-01-15T11:00:00.000Z");
  });
  it("rechnet Wanduhrzeit korrekt um (Sommerzeit)", () => {
    expect(at(nbg, "2027-06-21", "12:00").toISOString()).toBe("2027-06-21T10:00:00.000Z");
  });
  it("Istanbul ist ganzjährig UTC+3", () => {
    expect(at(ist, "2027-01-15", "12:00").toISOString()).toBe("2027-01-15T09:00:00.000Z");
    expect(at(ist, "2027-06-21", "12:00").toISOString()).toBe("2027-06-21T09:00:00.000Z");
  });
  it("Datum in Zone über Mitternacht", () => {
    // 23:30 UTC am 1.1. ist in Berlin schon der 2.1.
    expect(isoDateInZone(new Date("2027-01-01T23:30:00Z"), nbg.tz)).toBe("2027-01-02");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("Diyanet-Tabellen", () => {
  it("liefert die offiziellen Werte für Nürnberg", () => {
    const d = fromDiyanet(nbg, "2027-01-01");
    expect(d?.source).toBe("diyanet");
    expect(d?.times.imsak).toBe("06:15");
    expect(d?.times.yatsi).toBe("18:11");
  });
  it("liefert null statt erfundener Zeiten außerhalb der Tabelle", () => {
    expect(fromDiyanet(nbg, "2031-01-01")).toBeNull();
  });
  it("fällt außerhalb der Tabelle gekennzeichnet auf die Berechnung zurück", () => {
    const d = getDayTimes(nbg, "2031-01-01");
    expect(d.source).toBe("hesaplama");
    expect(d.times.ogle).toMatch(/^\d{2}:\d{2}$/);
  });
  it("Berechnung liegt im Winter nahe an Diyanet (Öğle/Akşam)", () => {
    const a = fromAdhan(nbg, "2027-01-15");
    const d = fromDiyanet(nbg, "2027-01-15")!;
    expect(a.times.ogle).toBe(d.times.ogle);
    expect(a.times.imsak).toBe(d.times.imsak);
  });
});

describe("Nächstes Gebet", () => {
  it("mittags ist İkindi das nächste", () => {
    const n = nextPrayer(nbg, at(nbg, "2027-01-15", "13:00"), getDayTimes);
    expect(n.key).toBe("ikindi");
    expect(n.time).toBe("14:28");
    expect(n.remainingMinutes).toBe(88);
  });
  it("nach Yatsı ist İmsak von morgen das nächste (über Mitternacht)", () => {
    const n = nextPrayer(nbg, at(nbg, "2027-01-15", "23:30"), getDayTimes);
    expect(n.key).toBe("imsak");
    expect(n.date).toBe("2027-01-16");
  });
  it("kurz nach Mitternacht bleibt İmsak von heute das nächste", () => {
    const n = nextPrayer(nbg, at(nbg, "2027-01-16", "00:30"), getDayTimes);
    expect(n.key).toBe("imsak");
    expect(n.date).toBe("2027-01-16");
  });
  it("Jahreswechsel: Yatsı am 31.12. -> İmsak 1.1.", () => {
    const n = nextPrayer(nbg, at(nbg, "2026-12-31", "23:59"), getDayTimes);
    expect(n.date).toBe("2027-01-01");
    expect(n.time).toBe("06:15");
  });
  it("Sommerzeit-Umstellung (28.3.2027, 02:00 -> 03:00) verschiebt keine Zeiten falsch", () => {
    const n = nextPrayer(nbg, at(nbg, "2027-03-28", "04:00"), getDayTimes);
    expect(n.key).toBe("imsak");
    expect(n.at.getTime()).toBeGreaterThan(at(nbg, "2027-03-28", "04:00").getTime());
    expect(n.remainingMinutes).toBeLessThan(120);
  });
  it("Standortwechsel nach Istanbul nutzt Istanbul-Zeitzone und -Tabelle", () => {
    const n = nextPrayer(ist, new Date("2027-03-15T10:00:00Z"), getDayTimes); // 13:00 in Istanbul
    expect(n.key).toBe("ogle");
    expect(n.time).toBe("13:18");
    expect(n.source).toBe("diyanet");
  });
  it("aktuelle Gebetszeit", () => {
    expect(currentPrayer(nbg, at(nbg, "2027-01-15", "13:00"), getDayTimes)).toBe("ogle");
    expect(currentPrayer(nbg, at(nbg, "2027-01-15", "03:00"), getDayTimes)).toBe("yatsi");
  });
  it("Restzeit-Text", () => {
    expect(formatRemaining(5)).toBe("5 dakika");
    expect(formatRemaining(60)).toBe("1 saat");
    expect(formatRemaining(88)).toBe("1 saat 28 dakika");
  });
});

describe("Einstellungen", () => {
  it("werden gespeichert und wieder geladen", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    } as unknown as Storage;
    saveSettings({ locationId: "istanbul", theme: "dark", highContrast: true, fontScale: 3, speech: false }, storage);
    const s = loadSettings(storage);
    expect(s.locationId).toBe("istanbul");
    expect(s.theme).toBe("dark");
    expect(s.fontScale).toBe(3);
  });
  it("ignoriert kaputte Werte", () => {
    const storage = { getItem: () => '{"theme":"neon","fontScale":99}', setItem: () => {} } as unknown as Storage;
    const s = loadSettings(storage);
    expect(s.theme).toBe("dark");
    expect(s.fontScale).toBe(2);
  });
});

describe("Vorlesen", () => {
  it("türkische Zahlen", () => {
    expect(turkishNumber(15)).toBe("on beş");
    expect(turkishNumber(42)).toBe("kırk iki");
    expect(turkishNumber(0)).toBe("sıfır");
  });
  it("Satz", () => {
    const n = nextPrayer(nbg, at(nbg, "2027-01-15", "13:00"), getDayTimes);
    expect(speechText(n)).toBe("Bir sonraki vakit İkindi. Saat on dört yirmi sekiz.");
  });
});

describe("Tabellenabdeckung", () => {
  it("deckt heute und die nächsten 60 Tage lückenlos für alle Standorte ab", () => {
    for (const id of ["nuernberg", "fuerth", "istanbul"]) {
      const loc = findLocation(id);
      let d = isoDateInZone(new Date(), loc.tz);
      for (let i = 0; i < 60; i++) {
        expect(fromDiyanet(loc, d), `${id} ${d}`).not.toBeNull();
        d = addDays(d, 1);
      }
    }
  });
});
