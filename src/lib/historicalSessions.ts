import { calculateSessionScore, createEmptyCounts, type GradeCounts } from "./scoring";

export type HistoricalSession = {
  date: string;
  score: number;
  counts: GradeCounts;
};

type RawHistoricalSession = {
  date: string;
  score: number;
  completed4: number;
  completed5: number;
};

const raw2025Sessions = [
  { date: "2025-01-02", score: 0, completed4: 0, completed5: 0 },
  { date: "2025-01-07", score: 0.5, completed4: 1, completed5: 0 },
  { date: "2025-01-09", score: 0.5, completed4: 1, completed5: 0 },
  { date: "2025-01-14", score: 2, completed4: 4, completed5: 0 },
  { date: "2025-01-18", score: 0.5, completed4: 1, completed5: 0 },
  { date: "2025-01-23", score: 2.25, completed4: 4, completed5: 0 },
  { date: "2025-02-10", score: 0, completed4: 0, completed5: 0 },
  { date: "2025-02-15", score: 2.125, completed4: 4, completed5: 0 },
  { date: "2025-02-17", score: 2.625, completed4: 5, completed5: 0 },
  { date: "2025-02-22", score: 0.5, completed4: 1, completed5: 0 },
  { date: "2025-02-25", score: 0, completed4: 0, completed5: 0 },
  { date: "2025-03-01", score: 0.625, completed4: 1, completed5: 0 },
  { date: "2025-03-07", score: 1.625, completed4: 3, completed5: 0 },
  { date: "2025-03-09", score: 0.5, completed4: 1, completed5: 0 },
  { date: "2025-03-11", score: 0.5, completed4: 1, completed5: 0 },
  { date: "2025-03-14", score: 0.5, completed4: 1, completed5: 0 },
  { date: "2025-03-25", score: 0.5, completed4: 1, completed5: 0 },
  { date: "2025-03-30", score: 0.5, completed4: 1, completed5: 0 },
  { date: "2025-04-01", score: 0, completed4: 0, completed5: 0 },
  { date: "2025-04-04", score: 1.625, completed4: 3, completed5: 0 },
  { date: "2025-04-06", score: 0.5, completed4: 1, completed5: 0 },
  { date: "2025-04-08", score: 1.5, completed4: 1, completed5: 1 },
  { date: "2025-04-11", score: 1.125, completed4: 2, completed5: 0 },
  { date: "2025-04-14", score: 1, completed4: 0, completed5: 1 },
  { date: "2025-04-15", score: 0.5, completed4: 1, completed5: 0 },
  { date: "2025-04-18", score: 1, completed4: 2, completed5: 0 },
  { date: "2025-04-20", score: 0, completed4: 0, completed5: 0 },
  { date: "2025-04-25", score: 0, completed4: 0, completed5: 0 },
  { date: "2025-05-04", score: 0, completed4: 0, completed5: 0 },
  { date: "2025-05-06", score: 0, completed4: 0, completed5: 0 },
  { date: "2025-05-09", score: 2.125, completed4: 2, completed5: 1 },
  { date: "2025-05-11", score: 0.5, completed4: 1, completed5: 0 },
  { date: "2025-05-13", score: 0.5, completed4: 1, completed5: 0 },
  { date: "2025-05-16", score: 1.75, completed4: 3, completed5: 0 },
  { date: "2025-05-20", score: 0.5, completed4: 1, completed5: 0 },
  { date: "2025-05-23", score: 0.5, completed4: 1, completed5: 0 },
  { date: "2025-05-26", score: 0.5, completed4: 1, completed5: 0 },
  { date: "2025-06-03", score: 1.5, completed4: 3, completed5: 0 },
  { date: "2025-06-08", score: 1.875, completed4: 3, completed5: 0 },
  { date: "2025-07-08", score: 1, completed4: 2, completed5: 0 },
  { date: "2025-07-21", score: 1, completed4: 2, completed5: 0 },
  { date: "2025-07-28", score: 0, completed4: 0, completed5: 0 },
  { date: "2025-08-02", score: 2.5, completed4: 3, completed5: 1 },
  { date: "2025-08-09", score: 0.625, completed4: 1, completed5: 0 },
  { date: "2025-08-28", score: 1, completed4: 0, completed5: 1 },
  { date: "2025-09-02", score: 0, completed4: 0, completed5: 0 },
  { date: "2025-09-05", score: 0.5, completed4: 1, completed5: 0 },
  { date: "2025-09-09", score: 0.5, completed4: 1, completed5: 0 },
  { date: "2025-09-12", score: 1.625, completed4: 3, completed5: 0 },
  { date: "2025-09-16", score: 0, completed4: 0, completed5: 0 },
  { date: "2025-09-22", score: 1, completed4: 2, completed5: 0 },
  { date: "2025-09-24", score: 0, completed4: 0, completed5: 0 },
  { date: "2025-09-30", score: 0.625, completed4: 1, completed5: 0 },
  { date: "2025-10-02", score: 0.5, completed4: 1, completed5: 0 },
  { date: "2025-10-04", score: 1.25, completed4: 2, completed5: 0 },
  { date: "2025-10-07", score: 1, completed4: 0, completed5: 1 },
  { date: "2025-10-10", score: 1, completed4: 2, completed5: 0 },
  { date: "2025-10-14", score: 0, completed4: 0, completed5: 0 },
  { date: "2025-10-17", score: 1, completed4: 0, completed5: 1 },
  { date: "2025-10-28", score: 1.125, completed4: 2, completed5: 0 },
  { date: "2025-10-31", score: 2.25, completed4: 4, completed5: 0 },
  { date: "2025-11-04", score: 0, completed4: 0, completed5: 0 },
  { date: "2025-11-07", score: 2.125, completed4: 4, completed5: 0 },
  { date: "2025-11-10", score: 1.25, completed4: 0, completed5: 1 },
  { date: "2025-11-12", score: 1, completed4: 0, completed5: 1 },
  { date: "2025-11-21", score: 1, completed4: 2, completed5: 0 },
  { date: "2025-11-23", score: 0, completed4: 0, completed5: 0 },
  { date: "2025-11-27", score: 3.375, completed4: 4, completed5: 1 },
  { date: "2025-12-01", score: 1, completed4: 2, completed5: 0 },
  { date: "2025-12-04", score: 0.5, completed4: 1, completed5: 0 },
  { date: "2025-12-09", score: 0, completed4: 0, completed5: 0 },
  { date: "2025-12-12", score: 1, completed4: 2, completed5: 0 },
  { date: "2025-12-22", score: 2, completed4: 4, completed5: 0 },
] as const satisfies readonly RawHistoricalSession[];

const raw2026Sessions = [
  { date: "2026-01-08", score: 2.25, completed4: 4, completed5: 0 },
  { date: "2026-01-11", score: 1.125, completed4: 2, completed5: 0 },
  { date: "2026-01-13", score: 0.5, completed4: 1, completed5: 0 },
  { date: "2026-01-16", score: 1.625, completed4: 3, completed5: 0 },
  { date: "2026-01-19", score: 1, completed4: 0, completed5: 1 },
  { date: "2026-01-23", score: 3.25, completed4: 6, completed5: 0 },
  { date: "2026-01-25", score: 0, completed4: 0, completed5: 0 },
  { date: "2026-01-27", score: 0, completed4: 0, completed5: 0 },
  { date: "2026-01-30", score: 3.25, completed4: 4, completed5: 1 },
  { date: "2026-02-02", score: 0, completed4: 0, completed5: 0 },
  { date: "2026-02-04", score: 0, completed4: 0, completed5: 0 },
  { date: "2026-02-06", score: 2.375, completed4: 4, completed5: 0 },
  { date: "2026-02-08", score: 1.625, completed4: 3, completed5: 0 },
  { date: "2026-02-12", score: 1, completed4: 0, completed5: 1 },
  { date: "2026-02-15", score: 1.625, completed4: 3, completed5: 0 },
  { date: "2026-02-17", score: 0, completed4: 0, completed5: 0 },
  { date: "2026-02-19", score: 2.625, completed4: 5, completed5: 0 },
  { date: "2026-02-22", score: 1, completed4: 0, completed5: 1 },
  { date: "2026-02-28", score: 4.125, completed4: 3, completed5: 2 },
  { date: "2026-03-02", score: 1.125, completed4: 2, completed5: 0 },
  { date: "2026-03-06", score: 2.125, completed4: 4, completed5: 0 },
  { date: "2026-03-08", score: 0, completed4: 0, completed5: 0 },
  { date: "2026-03-12", score: 1, completed4: 0, completed5: 1 },
  { date: "2026-03-15", score: 0, completed4: 0, completed5: 0 },
  { date: "2026-03-20", score: 4.5, completed4: 6, completed5: 1 },
  { date: "2026-03-22", score: 0, completed4: 0, completed5: 0 },
  { date: "2026-03-29", score: 2.875, completed4: 5, completed5: 0 },
  { date: "2026-03-31", score: 1, completed4: 0, completed5: 1 },
  { date: "2026-04-08", score: 0.625, completed4: 1, completed5: 0 },
  { date: "2026-04-13", score: 5.25, completed4: 5, completed5: 2 },
  { date: "2026-04-15", score: 1.5, completed4: 1, completed5: 1 },
  { date: "2026-04-20", score: 3.875, completed4: 5, completed5: 1 },
  { date: "2026-04-23", score: 0, completed4: 0, completed5: 0 },
  { date: "2026-04-26", score: 1.5, completed4: 1, completed5: 1 },
  { date: "2026-05-01", score: 3, completed4: 4, completed5: 1 },
  { date: "2026-05-03", score: 1, completed4: 0, completed5: 1 },
  { date: "2026-05-11", score: 2.25, completed4: 4, completed5: 0 },
  { date: "2026-05-14", score: 0, completed4: 0, completed5: 0 },
  { date: "2026-05-15", score: 1, completed4: 2, completed5: 0 },
  { date: "2026-05-17", score: 1, completed4: 2, completed5: 0 },
  { date: "2026-05-19", score: 1, completed4: 0, completed5: 1 },
  { date: "2026-05-22", score: 3.375, completed4: 4, completed5: 1 },
  { date: "2026-05-29", score: 5.25, completed4: 7, completed5: 1 },
  { date: "2026-06-12", score: 4.75, completed4: 8, completed5: 0 },
  { date: "2026-06-15", score: 3, completed4: 0, completed5: 3 },
  { date: "2026-06-19", score: 1.125, completed4: 2, completed5: 0 },
  { date: "2026-06-29", score: 2.75, completed4: 3, completed5: 1 },
  { date: "2026-07-05", score: 2.375, completed4: 4, completed5: 0 },
] as const satisfies readonly RawHistoricalSession[];

function inferFlashCounts({ score, completed4, completed5 }: RawHistoricalSession) {
  for (let flashed4 = completed4; flashed4 >= 0; flashed4 -= 1) {
    for (let flashed5 = 0; flashed5 <= completed5; flashed5 += 1) {
      const inferredScore =
        (completed4 - flashed4) * 0.5 +
        flashed4 * 0.625 +
        (completed5 - flashed5) * 1 +
        flashed5 * 1.25;
      if (Math.abs(inferredScore - score) < 0.0001) {
        return { flashed4, flashed5 };
      }
    }
  }

  throw new Error(`Keine Flash-Kombination für ${score} Punkte gefunden.`);
}

function toHistoricalSession(raw: RawHistoricalSession): HistoricalSession {
  const counts = createEmptyCounts();
  const { flashed4, flashed5 } = inferFlashCounts(raw);
  counts[4] = { completed: raw.completed4, flashed: flashed4 };
  counts[5] = { completed: raw.completed5, flashed: flashed5 };

  const score = calculateSessionScore(counts);
  if (Math.abs(score - raw.score) > 0.0001) {
    throw new Error(`Importdaten für ${raw.date} ergeben ${score} statt ${raw.score} Punkte.`);
  }

  return { date: raw.date, score, counts };
}

export const historicalSessions2025 = raw2025Sessions.map(toHistoricalSession);
export const historicalSessions2026 = raw2026Sessions.map(toHistoricalSession);
