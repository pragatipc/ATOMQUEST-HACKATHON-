import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  submitted: 'bg-blue-50 text-blue-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rework: 'bg-amber-50 text-amber-700',
  locked: 'bg-indigo-50 text-indigo-700',
  rejected: 'bg-red-50 text-red-700',
};

const STATUS_DOTS: Record<string, string> = {
  draft: 'bg-slate-400',
  submitted: 'bg-blue-500',
  approved: 'bg-emerald-500',
  rework: 'bg-amber-500',
  locked: 'bg-indigo-500',
  rejected: 'bg-red-500',
};

export function Badge({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize',
      STATUS_STYLES[status] || STATUS_STYLES.draft,
      className
    )}>
      <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOTS[status] || STATUS_DOTS.draft)} />
      {status}
    </span>
  );
}

const ICON_BG: Record<string, string> = {
  brand: 'bg-indigo-50 text-indigo-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  violet: 'bg-violet-50 text-violet-600',
  rose: 'bg-rose-50 text-rose-600',
};

const VALUE_COLORS: Record<string, string> = {
  brand: 'text-indigo-600',
  emerald: 'text-emerald-600',
  amber: 'text-amber-600',
  violet: 'text-violet-600',
  rose: 'text-rose-600',
};

export function StatCard({
  label,
  value,
  sub,
  icon,
  color = 'brand',
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon | string;
  color?: 'brand' | 'emerald' | 'amber' | 'violet' | 'rose';
  accent?: string;
}) {
  const c = (['brand','emerald','amber','violet','rose'].includes(accent || '') ? accent : color) as 'brand' | 'emerald' | 'amber' | 'violet' | 'rose';
  const IconComp = typeof icon === 'string' ? null : icon;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
          <p className={cn('mt-2 text-2xl font-bold', VALUE_COLORS[c])}>{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
        </div>
        <div className={cn('ml-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', ICON_BG[c])}>
          {IconComp ? <IconComp className="h-5 w-5" /> : <span className="text-lg">{icon as string}</span>}
        </div>
      </div>
    </div>
  );
}
