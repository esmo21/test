import { describe, expect, it } from 'vitest';
import { historicalSessions2025, historicalSessions2026 } from './historicalSessions';
import { calculateSessionScore, createEmptyCounts, validateCounts } from './scoring';

describe('Boulder scoring', () => {
  it('keine Boulder ergibt 0 Punkte', () => expect(calculateSessionScore(createEmptyCounts())).toBe(0));
  it('ein normaler Grad 4 ergibt 0,5 Punkte', () => { const c = createEmptyCounts(); c[4].completed = 1; expect(calculateSessionScore(c)).toBe(0.5); });
  it('ein geflashter Grad 4 ergibt 0,625 Punkte', () => { const c = createEmptyCounts(); c[4] = { completed: 1, flashed: 1 }; expect(calculateSessionScore(c)).toBe(0.625); });
  it('ein normaler Grad 5 ergibt 1 Punkt', () => { const c = createEmptyCounts(); c[5].completed = 1; expect(calculateSessionScore(c)).toBe(1); });
  it('ein geflashter Grad 5 ergibt 1,25 Punkte', () => { const c = createEmptyCounts(); c[5] = { completed: 1, flashed: 1 }; expect(calculateSessionScore(c)).toBe(1.25); });
  it('Grad 6 bis 9 werden korrekt verdoppelt', () => { for (const [grade, score] of [[6,2],[7,4],[8,8],[9,16]] as const) { const c = createEmptyCounts(); c[grade].completed = 1; expect(calculateSessionScore(c)).toBe(score); } });
  it('mehrere Schwierigkeitsgrade werden korrekt summiert', () => { const c = createEmptyCounts(); c[4].completed=2; c[5]={completed:2,flashed:1}; c[7].completed=1; expect(calculateSessionScore(c)).toBe(7.25); });
  it('geflashte Boulder werden nicht doppelt gezählt', () => { const c = createEmptyCounts(); c[7]={completed:3,flashed:2}; expect(calculateSessionScore(c)).toBe(14); });
  it('ungültige Eingaben werden erkannt', () => { const c = createEmptyCounts(); c[5]={completed:1,flashed:2}; expect(validateCounts(c).valid).toBe(false); c[5]={completed:-1,flashed:0}; expect(validateCounts(c).valid).toBe(false); c[5]={completed:1.5,flashed:0}; expect(validateCounts(c).valid).toBe(false); });

  it('erlaubt Trainingseinheiten ohne geschaffte Boulder', () => {
    const c = createEmptyCounts();
    expect(validateCounts(c).valid).toBe(true);
    expect(calculateSessionScore(c)).toBe(0);
  });
});

describe('Historische Importdaten', () => {
  it('enthält alle Trainingseinheiten und Summen aus der 2025-Vorlage', () => {
    expect(historicalSessions2025).toHaveLength(73);
    expect(historicalSessions2025.reduce((sum, session) => sum + session.score, 0)).toBe(64.5);
    expect(historicalSessions2025.reduce((sum, session) => sum + session.counts[4].completed, 0)).toBe(102);
    expect(historicalSessions2025.reduce((sum, session) => sum + session.counts[5].completed, 0)).toBe(10);
  });

  it('enthält alle Trainingseinheiten und Summen aus der 2026-Vorlage', () => {
    expect(historicalSessions2026).toHaveLength(48);
    expect(historicalSessions2026.reduce((sum, session) => sum + session.score, 0)).toBe(84.625);
    expect(historicalSessions2026.reduce((sum, session) => sum + session.counts[4].completed, 0)).toBe(108);
    expect(historicalSessions2026.reduce((sum, session) => sum + session.counts[5].completed, 0)).toBe(23);
  });

  it('berechnet die fehlenden Flash-Anzahlen passend zu den Punkten', () => {
    for (const historicalSessions of [historicalSessions2025, historicalSessions2026]) {
      expect(
        historicalSessions.every(
          (session) => calculateSessionScore(session.counts) === session.score,
        ),
      ).toBe(true);
    }
  });
});
