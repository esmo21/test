import { describe, expect, it } from 'vitest';
import { calculateYearlyScoreSeries, calendarDayIndex } from './scoring';

describe('Jahresvergleich im Diagramm', () => {
  it('addiert unsortierte Trainings desselben Tages und führt trainingsfreie Tage fort', () => {
    const sessions = [
      { sessionDate: '2025-01-03', score: 2.625 },
      { sessionDate: '2025-01-01', score: 1 },
      { sessionDate: '2025-01-03', score: 4 },
      { sessionDate: '2026-01-02', score: 8 },
    ];
    const result = calculateYearlyScoreSeries(sessions, '2026-01-04');
    expect(result.map(({ year }) => year)).toEqual(['2026', '2025']);
    expect(result[1].points.slice(0, 4).map(({ total }) => total)).toEqual([1, 1, 7.625, 7.625]);
    expect(result[1].points.at(-1)).toMatchObject({ date: '2025-12-31', total: 7.625, day: 365 });
    expect(result[0].points.map(({ total }) => total)).toEqual([0, 8, 8, 8]);
    expect(sessions[0].sessionDate).toBe('2025-01-03');
  });

  it('richtet Kalendertage auch über Schaltjahre identisch aus', () => {
    const result = calculateYearlyScoreSeries([
      { sessionDate: '2024-02-29', score: 2 },
      { sessionDate: '2025-03-01', score: 3 },
    ], '2026-07-01');
    const leap = result.find(({ year }) => year === '2024')!;
    const normal = result.find(({ year }) => year === '2025')!;
    expect(leap.points).toHaveLength(366);
    expect(normal.points).toHaveLength(365);
    expect(leap.points.find(({ date }) => date.endsWith('02-29'))).toMatchObject({ day: 59, total: 2 });
    expect(leap.points.find(({ date }) => date.endsWith('03-01'))?.day).toBe(normal.points.find(({ date }) => date.endsWith('03-01'))?.day);
    expect(calendarDayIndex('12-31')).toBe(365);
  });

  it('endet für das laufende Jahr heute und ignoriert zukünftige oder ungültige Daten', () => {
    const result = calculateYearlyScoreSeries([
      { sessionDate: '2026-01-01', score: 0 },
      { sessionDate: '2026-02-01', score: 99 },
      { sessionDate: '2027-01-01', score: 99 },
      { sessionDate: '2025-02-29', score: 99 },
      { sessionDate: 'invalid', score: 99 },
      { sessionDate: '2025-01-01', score: NaN },
    ], '2026-01-01');
    expect(result).toEqual([{ year: '2026', points: [{ date: '2026-01-01', day: 0, total: 0 }] }]);
    expect(calculateYearlyScoreSeries([], '2026-01-01')).toEqual([]);
  });
});
