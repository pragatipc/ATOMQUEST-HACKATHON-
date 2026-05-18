import { IGoal } from '@/models/Goal';

export function computeScore(goal: IGoal, actualValue: number | Date): number {
  const target = goal.target;
  let score = 0;

  switch (goal.uomType) {
    case 'numeric_min': {
      const t = typeof target === 'number' ? target : parseFloat(String(target));
      const a = typeof actualValue === 'number' ? actualValue : parseFloat(String(actualValue));
      if (!isNaN(t) && !isNaN(a) && t > 0) score = (a / t) * 100;
      break;
    }
    case 'numeric_max': {
      const t = typeof target === 'number' ? target : parseFloat(String(target));
      const a = typeof actualValue === 'number' ? actualValue : parseFloat(String(actualValue));
      if (!isNaN(t) && !isNaN(a)) score = a === 0 ? 100 : (t / a) * 100;
      break;
    }
    case 'timeline': {
      const actual = actualValue instanceof Date ? actualValue : new Date(String(actualValue));
      const targetDate = target instanceof Date ? target : new Date(String(target));
      score = actual <= targetDate ? 100 : 0;
      break;
    }
    case 'zero': {
      const a = typeof actualValue === 'number' ? actualValue : parseFloat(String(actualValue));
      score = (!isNaN(a) && a === 0) ? 100 : 0;
      break;
    }
  }

  return Math.round(Math.min(100, Math.max(0, score)) * 100) / 100;
}

export function calculateWeightedScore(goals: Array<{ score: number; weightage: number }>): number {
  const total = goals.reduce((sum, g) => sum + g.weightage, 0);
  if (total === 0) return 0;
  const weighted = goals.reduce((sum, g) => sum + g.score * (g.weightage / 100), 0);
  return Math.round(weighted * 100) / 100;
}
