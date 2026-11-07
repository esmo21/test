export type BoulderGrade = 4 | 5 | 6 | 7 | 8 | 9;
export const GRADES = [4, 5, 6, 7, 8, 9] as const satisfies readonly BoulderGrade[];

export type GradeCounts = Record<BoulderGrade, { completed: number; flashed: number }>;

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface ScoredSessionSummary {
  sessionDate: string;
  score: number;
  counts: GradeCounts;
}

export interface BoulderStatistics {
  completed: number;
  flashed: number;
  completedByGrade: Record<BoulderGrade, number>;
  total: number;
  avg: number;
}

export interface YearlyBoulderStatistics extends BoulderStatistics {
  year: string;
  sessions: number;
}

export interface YearToDateComparison {
  currentYear: string;
  previousYear: string;
  comparisonDate: string;
  current: BoulderStatistics;
  currentSessions: number;
  previous: BoulderStatistics;
  previousSessions: number;
  improvementPercent: number | null;
}

export const basePointsForGrade = (grade: BoulderGrade): number => 0.5 * 2 ** (grade - 4);

export const createEmptyCounts = (): GradeCounts => ({
  4: { completed: 0, flashed: 0 },
  5: { completed: 0, flashed: 0 },
  6: { completed: 0, flashed: 0 },
  7: { completed: 0, flashed: 0 },
  8: { completed: 0, flashed: 0 },
  9: { completed: 0, flashed: 0 },
});

const createEmptyCompletedByGrade = (): Record<BoulderGrade, number> =>
  Object.fromEntries(GRADES.map((grade) => [grade, 0])) as Record<BoulderGrade, number>;

export function validateCounts(counts: GradeCounts, requireCompleted = false): ValidationResult {
  const errors: string[] = [];
  let totalCompleted = 0;

  for (const grade of GRADES) {
    const { completed, flashed } = counts[grade];
    if (!Number.isInteger(completed) || completed < 0) {
      errors.push(`Grad ${grade}: Geschafft muss eine ganze Zahl größer oder gleich 0 sein.`);
    }
    if (!Number.isInteger(flashed) || flashed < 0) {
      errors.push(`Grad ${grade}: Davon geflasht muss eine ganze Zahl größer oder gleich 0 sein.`);
    }
    if (Number.isInteger(completed) && Number.isInteger(flashed) && flashed > completed) {
      errors.push(`Grad ${grade}: Geflashte Boulder dürfen nicht größer als geschaffte Boulder sein.`);
    }
    if (Number.isInteger(completed) && completed > 0) totalCompleted += completed;
  }

  if (requireCompleted && totalCompleted === 0) {
    errors.push('Mindestens ein geschaffter Boulder muss eingetragen werden.');
  }

  return { valid: errors.length === 0, errors };
}

export function calculateGradeScore(grade: BoulderGrade, completed: number, flashed: number): number {
  const base = basePointsForGrade(grade);
  return (completed - flashed) * base + flashed * base * 1.25;
}

export function calculateSessionScore(counts: GradeCounts): number {
  const validation = validateCounts(counts, false);
  if (!validation.valid) {
    throw new Error(validation.errors.join(' '));
  }
  return GRADES.reduce((sum, grade) => {
    const { completed, flashed } = counts[grade];
    return sum + calculateGradeScore(grade, completed, flashed);
  }, 0);
}

export function calculateBoulderStatistics(sessions: readonly ScoredSessionSummary[]): BoulderStatistics {
  const completedByGrade = createEmptyCompletedByGrade();
  let completed = 0;
  let flashed = 0;
  let total = 0;

  for (const session of sessions) {
    total += Number(session.score);
    for (const grade of GRADES) {
      const gradeCompleted = session.counts[grade].completed;
      completedByGrade[grade] += gradeCompleted;
      completed += gradeCompleted;
      flashed += session.counts[grade].flashed;
    }
  }

  return {
    completed,
    flashed,
    completedByGrade,
    total,
    avg: sessions.length ? total / sessions.length : 0,
  };
}

export function calculateYearlyBoulderStatistics(
  sessions: readonly ScoredSessionSummary[],
): YearlyBoulderStatistics[] {
  const sessionsByYear = new Map<string, ScoredSessionSummary[]>();

  for (const session of sessions) {
    const year = session.sessionDate.slice(0, 4);
    if (!/^\d{4}$/.test(year)) continue;
    sessionsByYear.set(year, [...(sessionsByYear.get(year) ?? []), session]);
  }

  return [...sessionsByYear.entries()]
    .sort(([leftYear], [rightYear]) => Number(rightYear) - Number(leftYear))
    .map(([year, yearSessions]) => ({
      year,
      sessions: yearSessions.length,
      ...calculateBoulderStatistics(yearSessions),
    }));
}

const isValidDateOnly = (date: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(date);

const toDateOnly = (date: Date): string => date.toISOString().slice(0, 10);

const compareDateOnly = (left: string, right: string): number => left.localeCompare(right);

function previousYearDate(date: string): string {
  const year = Number(date.slice(0, 4));
  const monthDay = date.slice(5);
  const candidate = `${year - 1}-${monthDay}`;

  if (isValidDateOnly(candidate) && !Number.isNaN(new Date(`${candidate}T00:00:00.000Z`).getTime())) {
    const parsedCandidate = new Date(`${candidate}T00:00:00.000Z`);
    if (toDateOnly(parsedCandidate) === candidate) return candidate;
  }

  return `${year - 1}-02-28`;
}

export function calculateYearToDateComparison(
  sessions: readonly ScoredSessionSummary[],
  currentDate = toDateOnly(new Date()),
): YearToDateComparison | null {
  if (!isValidDateOnly(currentDate)) {
    throw new Error('currentDate must use YYYY-MM-DD format.');
  }

  const currentYear = currentDate.slice(0, 4);
  const previousComparisonDate = previousYearDate(currentDate);
  const previousYear = previousComparisonDate.slice(0, 4);
  const currentYearStart = `${currentYear}-01-01`;
  const previousYearStart = `${previousYear}-01-01`;
  const currentSessions = sessions.filter(
    (session) =>
      compareDateOnly(session.sessionDate, currentYearStart) >= 0 &&
      compareDateOnly(session.sessionDate, currentDate) <= 0,
  );
  const previousSessions = sessions.filter(
    (session) =>
      compareDateOnly(session.sessionDate, previousYearStart) >= 0 &&
      compareDateOnly(session.sessionDate, previousComparisonDate) <= 0,
  );

  if (currentSessions.length === 0 && previousSessions.length === 0) return null;

  const current = calculateBoulderStatistics(currentSessions);
  const previous = calculateBoulderStatistics(previousSessions);

  return {
    currentYear,
    previousYear,
    comparisonDate: previousComparisonDate,
    current,
    currentSessions: currentSessions.length,
    previous,
    previousSessions: previousSessions.length,
    improvementPercent: previous.total === 0 ? null : ((current.total - previous.total) / previous.total) * 100,
  };
}

export function formatScore(score: number): string {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 3 }).format(score);
}

export interface YearlyScoreSeries {
  year: string;
  points: { date: string; day: number; total: number }[];
}

// Use a shared leap year so the same month/day aligns across all years.
export function calendarDayIndex(monthDay: string): number {
  return (Date.parse(`2000-${monthDay}T00:00:00Z`) - Date.UTC(2000, 0, 1)) / 86_400_000;
}

export function calculateYearlyScoreSeries(
  sessions: readonly Pick<ScoredSessionSummary, 'sessionDate' | 'score'>[],
  currentDate = toDateOnly(new Date()),
): YearlyScoreSeries[] {
  const byYear = new Map<string, Map<string, number>>();
  for (const { sessionDate, score } of sessions) {
    const parsed = new Date(`${sessionDate}T00:00:00Z`);
    if (!isValidDateOnly(sessionDate) || Number.isNaN(parsed.getTime()) ||
        toDateOnly(parsed) !== sessionDate || sessionDate > currentDate || !Number.isFinite(score)) continue;
    const year = sessionDate.slice(0, 4);
    const daily = byYear.get(year) ?? new Map<string, number>();
    daily.set(sessionDate, (daily.get(sessionDate) ?? 0) + score);
    byYear.set(year, daily);
  }
  return [...byYear.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([year, daily]) => {
      const end = year === currentDate.slice(0, 4) ? currentDate : `${year}-12-31`;
      const cursor = new Date(`${year}-01-01T00:00:00Z`);
      const points: YearlyScoreSeries['points'] = [];
      let total = 0;
      while (toDateOnly(cursor) <= end) {
        const date = toDateOnly(cursor);
        total += daily.get(date) ?? 0;
        points.push({ date, day: calendarDayIndex(date.slice(5)), total });
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
      return { year, points };
    });
}
