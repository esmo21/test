export type BoulderGrade = 4 | 5 | 6 | 7 | 8 | 9;
export const GRADES = [4, 5, 6, 7, 8, 9] as const satisfies readonly BoulderGrade[];

export type GradeCounts = Record<BoulderGrade, { completed: number; flashed: number }>;

export interface ValidationResult {
  valid: boolean;
  errors: string[];
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

export function formatScore(score: number): string {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 3 }).format(score);
}
