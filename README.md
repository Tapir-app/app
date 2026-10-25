# Schrankblick – Test-App

Installierbare Web-App (PWA) für den digitalen Kleiderschrank. Läuft komplett im Browser, Daten bleiben auf dem Gerät.

## Für Tester:innen
1. Link öffnen (iPhone: in **Safari**, Android: in **Chrome**).
2. iPhone: unten auf **Teilen** → **Zum Home-Bildschirm**. Android: Menü (⋮) → **App installieren**.
3. App vom Home-Bildschirm starten. Der Beispielschrank zeigt, wie alles funktioniert. „Als Start übernehmen“ oder eigenes Teil hinzufügen.
4. Daten bleiben nur auf deinem Handy. Sicherung: Zahnrad → „Sicherung speichern“.

## Veröffentlichen (GitHub Pages)
Dateien in ein öffentliches Repository legen → Settings → Pages → Branch `main`, Ordner `/ (root)` → Save. Nach 1–2 Minuten läuft die App unter `https://<name>.github.io/<repo>/`.

## Dateien
- `index.html` – die App
- `shim.js` – lokaler Speicher (localStorage + IndexedDB für Fotos), Sicherung, optionale KI mit eigenem Schlüssel
- `sw.js` – Offline-Betrieb
- `manifest.webmanifest`, `icons/` – App-Symbol und Installation

Bei Änderungen in `sw.js` die `VERSION` hochzählen, damit Handys die neue Version laden.
