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
  "settings": { "palette", "city": { "name", "lat", "lon" }, "view", "lastOcc", "appVersion" },
  "data": {
    "items":    { "<id>": { name, cat, type, color, brand, fit, neck, basic, occasions[], status, wears, lastWorn, price, lentTo, lentUntil, photo … } },
    "listings": { "<id>": Verkaufs-Inserate },
    "plan":     Wochenplan
  },
  "photos": { "<foto-schlüssel>": "data:image/jpeg;base64,…" }
}
```
Fotos stehen als Data-URL unter `photos`, die Teile verweisen per Schlüssel darauf. „Sicherung laden“ ersetzt alle Teile, Fotos, Inserate und den Wochenplan auf dem Gerät.

Bei Änderungen in `sw.js` die `VERSION` hochzählen, damit Handys die neue Version laden.
