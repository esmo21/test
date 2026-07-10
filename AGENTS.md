# Projektregeln

- TypeScript strikt verwenden.
- Keine Secrets einchecken; `.env` bleibt lokal und ist in `.gitignore` ausgeschlossen.
- Supabase Row Level Security niemals deaktivieren.
- Punkteberechnung zentral in `src/lib/scoring.ts` halten.
- Neue Berechnungslogik immer mit Vitest-Tests absichern.
- Vor Abschluss `npm test`, `npm run lint` und `npm run build` ausführen.
- Mobile Darstellung und Barrierefreiheit bei UI-Änderungen berücksichtigen.
