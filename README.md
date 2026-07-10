# Boulder Tracker

Boulder Tracker ist eine responsive React-/TypeScript-Single-Page-App zum Dokumentieren von Boulder-Trainingseinheiten. Die App läuft statisch auf GitHub Pages und nutzt Supabase Auth sowie Row Level Security für nutzerbezogene Daten.

## Architektur

- **Frontend:** React, TypeScript und Vite als statische SPA ohne Browser-Router.
- **Datenbank/Auth:** Supabase mit Tabelle `boulder_sessions`, Supabase Auth und RLS-Policies.
- **Scoring:** Zentrale reine Funktionen in `src/lib/scoring.ts`, abgesichert mit Vitest.
- **Deployment:** GitHub Actions baut `dist` und veröffentlicht über offizielle GitHub-Pages-Actions.

## Punkteberechnung

Erfasst werden ausschließlich Grade 4 bis 9. Basispunkte: `0.5 * 2 ** (Schwierigkeitsgrad - 4)`. Flashes erhalten 25 % Bonus und sind Teil der geschafften Boulder, werden also nicht doppelt gezählt.

## Voraussetzungen installieren

1. Installiere [Node.js](https://nodejs.org/) in einer aktuellen LTS-Version.
2. Erstelle ein GitHub-Konto.
3. Erstelle ein Supabase-Konto unter <https://supabase.com/>.

## Repository klonen

```bash
git clone https://github.com/USERNAME/boulder-tracker.git
cd boulder-tracker
```

## Abhängigkeiten installieren

```bash
npm install
```

## Supabase-Projekt erstellen

1. Öffne Supabase und erstelle ein neues Projekt.
2. Notiere die Project URL.
3. Notiere den Publishable-/Anon-Key. Dieser Key darf im Browser sichtbar sein, ist aber nur sicher, wenn RLS korrekt aktiv ist.

## Datenbankschema einrichten

1. Öffne im Supabase-Dashboard den SQL Editor.
2. Kopiere den Inhalt von `supabase/schema.sql` hinein.
3. Führe das Skript aus.
4. Prüfe, dass RLS für `boulder_sessions` aktiv ist und Policies existieren.

## Supabase Authentication konfigurieren

1. Öffne **Authentication** in Supabase.
2. Aktiviere E-Mail/Passwort-Anmeldung.
3. Lege bei Bedarf fest, ob E-Mail-Bestätigung erforderlich ist.
4. Trage für Produktion die GitHub-Pages-URL als erlaubte Redirect-/Site-URL ein.

## Lokale Umgebung konfigurieren

Kopiere die Beispieldatei und trage deine Werte ein:

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://dein-projekt.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=dein-publishable-key
```

Wichtig:

- `VITE_SUPABASE_PUBLISHABLE_KEY` kann im gebauten Browsercode sichtbar sein. Deshalb ist Row Level Security zwingend erforderlich.
- Ein Supabase Service-Role-Key darf niemals im Frontend, in `.env`, in GitHub Secrets für den Frontend-Build oder im Repository gespeichert werden.
- `.env` ist über `.gitignore` ausgeschlossen und darf nicht eingecheckt werden.

## Lokal starten

```bash
npm run dev
```

Öffne danach die im Terminal angezeigte lokale URL.

## Tests, Lint und Build

```bash
npm test
npm run lint
npm run build
```

## Projekt zu GitHub pushen

```bash
git add .
git commit -m "Initial Boulder Tracker app"
git branch -M main
git remote add origin https://github.com/USERNAME/boulder-tracker.git
git push -u origin main
```

## GitHub Actions Secrets oder Variables einrichten

Lege in GitHub unter **Settings → Secrets and variables → Actions** folgende Werte als Secret oder Variable an:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

## GitHub Pages aktivieren

1. Öffne **Settings → Pages** im Repository.
2. Wähle als Source **GitHub Actions**.
3. Speichere die Einstellung.
4. Pushe auf `main` oder starte den Workflow manuell.

## Deployment prüfen

1. Öffne den Tab **Actions**.
2. Warte, bis der Workflow erfolgreich abgeschlossen ist.
3. Öffne den Deployment-Link im Workflow oder unter **Settings → Pages**.

## Veröffentlichte URL finden

Bei einem Projekt-Repository ist die URL typischerweise:

```text
https://USERNAME.github.io/boulder-tracker/
```

Die Vite-Base-Konfiguration ist auf `/boulder-tracker/` für Produktions-Builds gesetzt.

## Optional eigene Domain verbinden

1. Trage unter **Settings → Pages** deine Domain ein.
2. Setze die DNS-Einträge nach GitHub-Anleitung.
3. Aktiviere HTTPS, sobald GitHub das Zertifikat bereitstellt.

## Typische Fehler beheben

- **Leere Seite auf GitHub Pages:** Prüfe, ob das Repository wirklich `boulder-tracker` heißt oder passe `base` in `vite.config.ts` an.
- **Supabase-Fehler beim Laden:** Prüfe `VITE_SUPABASE_URL` und `VITE_SUPABASE_PUBLISHABLE_KEY` in GitHub Actions und lokal in `.env`.
- **Keine Daten sichtbar:** Prüfe, ob du angemeldet bist und RLS-Policies ausgeführt wurden.
- **Insert schlägt fehl:** Das Schema verlangt mindestens einen geschafften Boulder und Flash-Anzahlen dürfen nicht größer als Geschafft sein.
- **Login funktioniert lokal, aber nicht produktiv:** Prüfe Site URL und Redirect URLs in Supabase Authentication.

## Manuelle Schritte nach dem Klonen

Du musst Supabase erstellen, `supabase/schema.sql` ausführen, `.env` lokal anlegen, GitHub Secrets/Variables konfigurieren und GitHub Pages auf GitHub Actions umstellen.
