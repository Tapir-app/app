# Schrankblick – Test-App

Installierbare Web-App (PWA) für den digitalen Kleiderschrank. Läuft komplett im Browser, Daten bleiben auf dem Gerät.

## Für Tester:innen
1. Link öffnen (iPhone: in **Safari**, Android: in **Chrome**).
2. iPhone: unten auf **Teilen** → **Zum Home-Bildschirm**. Android: Menü (⋮) → **App installieren**.
3. App vom Home-Bildschirm starten. Der Beispielschrank zeigt, wie alles funktioniert. „Als Start übernehmen“ oder eigenes Teil hinzufügen.
4. Daten bleiben nur auf deinem Handy. Sicherung: Einstellungen (Regler-Symbol oben) → „Sicherung speichern“.

## Veröffentlichen (GitHub Pages)
Dateien in ein öffentliches Repository legen → Settings → Pages → Branch `main`, Ordner `/ (root)` → Save. Nach 1–2 Minuten läuft die App unter `https://<name>.github.io/<repo>/`.

## Dateien
- `index.html` – die App
- `shim.js` – lokaler Speicher (localStorage + IndexedDB für Fotos), Sicherung, optionale KI mit eigenem Schlüssel
- `sw.js` – Offline-Betrieb
- `manifest.webmanifest`, `icons/` – App-Symbol und Installation

## Feedback und Warteliste einstellen
Oben in `index.html` steht `const CONTACT = { email, feedbackForm, waitlistForm }`. Leer = Feedback und Wartelisten-Anmeldung gehen über das Teilen-Menü des Handys (WhatsApp, Mail …). Mit E-Mail-Adresse oder Formular-Link gehen sie direkt dorthin.
Nutzungszahlen zählt die App nur lokal auf dem Gerät (`schrankblick:meta`). Sie werden nur mitgeschickt, wenn Tester:innen Feedback senden und das Häkchen drin lassen. Keine Tracker.

## Sicherung (Datenformat)
Einstellungen → „Deine Daten“ → **Sicherung speichern** legt eine JSON-Datei `schrankblick-sicherung-JJJJ-MM-TT.json` an. Damit kommen die Daten auf ein neues Handy oder später in die richtige App.

```
{
  "app": "schrankblick", "version": 1, "exportedAt": "ISO-Datum",
  "settings": { "palette", "city": { "name", "lat", "lon" }, "view", "lastOcc", "trip", "avatar", "appVersion" },
  "data": {
    "items":    { "<id>": { name, cat, type, color, brand, size, pattern, color2, material[], care, origin, fit, neck, basic, occasions[], status, wears, lastWorn, price, lentTo, lentUntil, photo … } },
    "listings": { "<id>": Verkaufs-Inserate },
    "plan":     Wochenplan
  },
  "photos": { "<foto-schlüssel>": "data:image/jpeg;base64,…" }
}
```
- `cat`: `top`, `bottom`, `dress`, `suit` (Anzug & Kostüm), `jacket`, `shoes`, `swim` (Bademode), `acc`, `bag` (Tasche & Gepäck), `jewelry`
- `status`: `schrank`, `waesche`, `reinigung`, `verliehen`, `koffer` (Reise, wird nicht eingeplant) oder `eingelagert` (Saisonwechsel, wird nicht eingeplant)
- `settings.trip`: laufende Reise `{ kind, days, weather, bag, packedAt }` oder `null`
- `settings.avatar`: deine Figur `{ skin, hair, hairColor, beard, glasses, build }` oder `null` (neutrale Figur). `skin`: `neutral`, `s1` … `s5`; `hair`: `none`, `kurz`, `mittel`, `lang`, `zopf`, `dutt`; `hairColor`: `schwarz`, `braun`, `blond`, `rot`, `grau`; `beard`: `none`, `stoppeln`, `kurz`, `voll`; `glasses`: `none`, `rund`, `eckig`; `build`: `schmal`, `normal`, `kraeftig`
- `settings.catOrder`: eigene Reihenfolge der Kategorien im Schrank (Liste von Kategorie-Schlüsseln) oder `null` (Standard). `settings.catFold`: eingeklappte Kategorien (`top`, `bottom`, … sowie `stored` für „Eingelagert“)
- `pattern`: `streifen`, `karo`, `punkte` oder `blumen` (fehlt = uni), `color2` ist die zweite Farbe des Musters
- `material`: Liste wie `[{ "m": "Baumwolle", "p": 95 }, { "m": "Elastan", "p": 5 }]`, `p` in Prozent (optional), `a: true` heißt „Rest automatisch aufgefüllt“
- `size`: freier Text, z. B. `M`, `38`, `W32/L32`
- `care`: Pflegeetikett, z. B. `{ "wash": "40", "mode": "schon", "bleach": "no", "dry": "1", "iron": "2", "pro": "P" }`. `wash`: `30`, `40`, `60`, `95`, `hand` oder `no`; `mode`: `schon` oder `fein` (fehlt = normal); `bleach`: `any`, `oxy`, `no`; `dry`: `1`, `2`, `no`; `iron`: `1`, `2`, `3`, `no`; `pro`: `P`, `F`, `W`, `no`. Fehlende Felder = nicht angegeben.
- `origin`: Herstellungsland als Text, z. B. `Portugal` („Made in …“)

Fotos stehen als Data-URL unter `photos`, die Teile verweisen per Schlüssel darauf. „Sicherung laden“ ersetzt alle Teile, Fotos, Inserate und den Wochenplan auf dem Gerät.

Bei Änderungen in `sw.js` die `VERSION` hochzählen, damit Handys die neue Version laden.
