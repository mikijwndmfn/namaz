# Namaz Vakitleri (PWA)

Private Gebetszeiten-App mit sehr großer Schrift für eine Nutzerin mit Makuladegeneration. Türkische Oberfläche, installierbar auf dem iPhone, läuft komplett offline.

## Was die App macht

- Zeigt sofort nach dem Öffnen das **nächste Gebet** (Name, Uhrzeit, Restzeit) sehr groß an, darunter alle sechs Zeiten des Tages (İmsak, Güneş, Öğle, İkindi, Akşam, Yatsı). Vergangene Zeiten sind abgehakt.
- **Offizielle Diyanet-Zeiten** für Nürnberg, Fürth und Istanbul sind als Tabellen eingebettet (`src/data/diyanet/*.json`). Das sind exakt die Zeiten von namazvakitleri.diyanet.gov.tr, also dieselben wie in der Moschee.
- Für Tage ohne Tabellenzeile rechnet die App lokal mit adhan-js (Methode "Turkey") und zeigt dann einen gut sichtbaren Hinweis. Es werden nie unbemerkt alte oder erfundene Zeiten angezeigt.
- Einstellungen (über den Button "Ayarlar" ganz unten): Standort, drei Schriftgrößen, Hell/Dunkel/Automatisch, Hochkontrast, Vorlesefunktion (Web Speech API, Türkisch), Infos zur Datenquelle.
- Keine Standortabfrage, kein Internet nötig, keine Konten, kein Tracking. Nichts verlässt das Telefon.

## Entscheidungen (und warum)

| Thema | Entscheidung |
|---|---|
| Geolocation | **Nicht verwendet.** iOS zeigt in Home-Screen-Web-Apps immer wieder Standortdialoge, die für die Nutzerin eine Hürde sind. Stattdessen feste Standorte mit großen Buttons. Neue Standorte: siehe unten. |
| AlAdhan API | **Nicht verwendet.** Externe Abhängigkeit ohne Mehrwert; Diyanet-Tabellen plus lokale Berechnung decken alles ab. |
| Zeitzone | Pro Standort fest hinterlegt (`src/data/locations.ts`). Zeiten werden als Wanduhrzeit des Standorts behandelt, Sommer-/Winterzeit via `Intl`. |
| Speicher | `localStorage` für Einstellungen. IndexedDB ist nicht nötig, weil die Tabellen im Bundle liegen. |
| Service Worker | vite-plugin-pwa (Precache des gesamten Bundles, Auto-Update). |

### Genauigkeit: Diyanet vs. adhan-js (gemessen am 01.11.2026)

Vergleich der eingebetteten Diyanet-Tabellen mit adhan-js `CalculationMethod.Turkey()`:

| Ort | Datum | Abweichung adhan-js (Minuten, İmsak Güneş Öğle İkindi Akşam Yatsı) |
|---|---|---|
| Nürnberg | 15.11.2026 | 0 0 0 -2 0 +6 |
| Nürnberg | 15.01.2027 | 0 -1 0 +1 +1 +7 |
| Nürnberg | 01.05.2027 | -13 -1 0 +1 +1 +13 |
| Nürnberg | 21.06.2027 | **-136 0 0 0 0 (Yatsı unbrauchbar)** |
| Nürnberg | 15.08.2027 | -6 0 0 -2 -2 +6 |
| Istanbul | 21.06.2027 | 0 0 0 0 0 0 |
| Istanbul | 15.10.2027 | 0 0 0 -2 -1 -1 |

Fazit: Für Istanbul ist die Berechnung praktisch identisch. **Für Nürnberg ist sie im Sommer unbrauchbar** (keine astronomische Dämmerung bei 49° Nord; Diyanet verwendet dort eine Sonderregel). Deshalb sind die Diyanet-Tabellen die Hauptquelle, die Berechnung nur ein gekennzeichneter Notnagel. Yatsı weicht ganzjährig 5 bis 7 Minuten ab.

### Tabellen aktuell halten

Die Diyanet-Seite liefert den laufenden Monat plus das kommende Jahr. Der GitHub-Actions-Workflow lädt die Tabellen **jeden Montag** neu, committet sie und deployt. Manuell: `npm run fetch-diyanet`.

Hinweis: Stand 01.11.2026 reichen die Tabellen bis 31.12.2027, mit einer Lücke 03.12. bis 31.12.2026, die der nächste wöchentliche Lauf schließt. In der Lücke greift die Berechnung (im Winter nur wenige Minuten Abweichung) mit Hinweis.

### Neuen Standort hinzufügen

1. Auf namazvakitleri.diyanet.gov.tr den Ort suchen, die ID aus der URL nehmen (z. B. `11024` für Nürnberg).
2. In `scripts/fetch-diyanet.mjs` zur Liste `LOCATIONS` hinzufügen, `npm run fetch-diyanet` ausführen.
3. In `src/data/locations.ts` ergänzen (Koordinaten, Zeitzone) und in `src/lib/providers.ts` die JSON-Datei importieren.

## Entwicklung

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 20 Tests (Zeitzonen, Mitternacht, Jahreswechsel, DST, Fallback, Einstellungen, Vorlesen)
npm run build      # Typecheck + Produktionsbuild nach dist/
npm run preview    # dist/ lokal ansehen
```

Getestet wurde: Vitest-Suite, `vue-tsc`-Typecheck, Vite-Produktionsbuild, Screenshots in Chromium bei 390×844 (hell, dunkel, Hochkontrast, Einstellungen). **Noch offen:** Test auf echtem iPhone (Safari, Home-Screen-Installation, VoiceOver, türkische Stimme).

## Hosting auf GitHub Pages (kostenlos)

1. Repository auf GitHub anlegen (z. B. `namaz`), Code pushen.
2. Im Repo: **Settings → Pages → Source: GitHub Actions**.
3. Der Workflow `.github/workflows/deploy.yml` baut und deployt automatisch. URL: `https://<user>.github.io/<repo>/`.

Alternativ Cloudflare Pages: Build-Befehl `npm run build`, Output `dist`, Umgebungsvariable `BASE_PATH=/`.

## Auf dem iPhone installieren

1. Die URL in **Safari** öffnen (nicht Chrome).
2. Teilen-Button (Quadrat mit Pfeil) → **"Zum Home-Bildschirm"** → Hinzufügen.
3. Das Icon "Namaz" liegt jetzt auf dem Home-Bildschirm und öffnet ohne Browserleiste.
4. Einmal mit Internet öffnen, danach funktioniert es auch offline.
5. In den Einstellungen der App Schriftgröße und Farben zusammen mit der Nutzerin wählen.

Tipp: Auf dem iPhone unter Einstellungen → Bedienungshilfen → Anzeige & Textgröße die Systemschrift vergrößern. Die App übernimmt das zusätzlich (Dynamic Type).

## Manuelle Testcheckliste iPhone

- [ ] App startet aus dem Home-Screen ohne Browserleiste
- [ ] Flugmodus an, App schließen und neu öffnen: Zeiten erscheinen
- [ ] Nach Yatsı: nächstes Gebet ist "İmsak" mit Hinweis "Yarın"
- [ ] Standort auf Istanbul wechseln: Zeiten und Datum ändern sich
- [ ] Schriftgröße "En büyük": kein horizontales Scrollen, alles erreichbar
- [ ] Dunkel + Hochkontrast: Lesbarkeit
- [ ] "Sesli oku" spricht Türkisch (Stimme unter Einstellungen → Bedienungshilfen → Gesprochene Inhalte → Stimmen → Türkisch laden)
- [ ] VoiceOver: Reihenfolge Datum → Ort → nächstes Gebet → Liste
- [ ] App einen Tag geöffnet lassen: Datum und Zeiten springen nach Mitternacht um
