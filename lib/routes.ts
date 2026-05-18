export type UserRole = 'employee' | 'manager' | 'admin';

export function getDashboardPath(role: UserRole): string {
  switch (role) {
    case 'admin':
      return '/admin/dashboard';
    case 'manager':
      return '/manager/dashboard';
    default:
      return '/dashboard';
  }
}

export const THRUST_AREAS = [
  'Strategy',
  'Operations',
  'Finance',
  'People',
  'Customer',
  'Innovation',
] as const;

export const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  submitted: 'bg-blue-50 text-blue-700 border-blue-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rework: 'bg-amber-50 text-amber-700 border-amber-200',
  locked: 'bg-violet-50 text-violet-700 border-violet-200',
};
