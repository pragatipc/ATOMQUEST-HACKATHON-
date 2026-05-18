'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCurrentQuarter, cn } from '@/lib/utils';
import { Target, CalendarCheck, Plus, ArrowRight, CheckCircle2, AlertCircle, Send, TrendingUp, Lock, Zap } from 'lucide-react';

interface Goal { _id: string; title: string; status: string; weightage: number; thrustArea: string; uomType?: string; }

const STATUS: Record<string, { label: string; cls: string; dot: string }> = {
  draft:     { label: 'Draft',     cls: 'bg-slate-100 text-slate-500',   dot: 'bg-slate-400'   },
  submitted: { label: 'Submitted', cls: 'bg-blue-50 text-blue-700',      dot: 'bg-blue-500'    },
  approved:  { label: 'Approved',  cls: 'bg-emerald-50 text-emerald-700',dot: 'bg-emerald-500' },
  locked:    { label: 'Locked',    cls: 'bg-violet-50 text-violet-700',  dot: 'bg-violet-500'  },
  rework:    { label: 'Rework',    cls: 'bg-amber-50 text-amber-700',    dot: 'bg-amber-500'   },
};

const THRUST_COLORS: Record<string, string> = {
  Strategy:   'bg-indigo-500',
  Operations: 'bg-cyan-500',
  Finance:    'bg-emerald-500',
  People:     'bg-violet-500',
  Customer:   'bg-amber-500',
  Innovation: 'bg-rose-500',
  Revenue:    'bg-blue-500',
  Process:    'bg-orange-500',
  Quality:    'bg-teal-500',
  Safety:     'bg-red-400',
};

// Mini circular progress ring
function ScoreRing({ score }: { score: number }) {
  const r = 28, cx = 32, cy = 32;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#f97316';
  return (
    <svg width={64} height={64} className="rotate-[-90deg]">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth={7} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={7}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }} />
    </svg>
  );
}

export default function EmployeeDashboardPage() {
  const { data: session } = useSession();
  const [goals, setGoals]           = useState<Goal[]>([]);
  const [avgScore, setAvgScore]     = useState(0);
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const quarter = getCurrentQuarter();
  const year    = new Date().getFullYear();

  useEffect(() => {
    if (!session?.user?.id) return;
    Promise.all([fetch('/api/goals'), fetch(`/api/achievements?quarter=${quarter}&year=${year}`)])
      .then(async ([g, a]) => {
        const gd = await g.json(); const ad = await a.json();
        setGoals(Array.isArray(gd) ? gd : []);
        const sc = Array.isArray(ad) ? ad : [];
        setAvgScore(sc.length ? Math.round(sc.reduce((s: number, x: { computedScore: number }) => s + x.computedScore, 0) / sc.length) : 0);
      })
      .finally(() => setLoading(false));
  }, [session?.user?.id]);

  async function handleSubmit() {
    setSubmitting(true);
    const r = await fetch('/api/goals/submit', { method: 'POST' });
    if (r.ok) setGoals(await (await fetch('/api/goals')).json());
    setSubmitting(false);
  }

  if (loading) return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 w-56 rounded-lg bg-white" />
      <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-28 rounded-xl bg-white" />)}</div>
      <div className="grid grid-cols-3 gap-5"><div className="col-span-2 h-72 rounded-xl bg-white" /><div className="h-72 rounded-xl bg-white" /></div>
    </div>
  );

  const name      = session?.user?.name?.split(' ')[0] || 'there';
  const totalW    = goals.reduce((s, g) => s + g.weightage, 0);
  const locked    = goals.filter(g => ['locked', 'approved'].includes(g.status));
  const submitted = goals.filter(g => ['submitted', 'locked', 'approved'].includes(g.status));
  const canSubmit = totalW === 100 && goals.some(g => ['draft', 'rework'].includes(g.status));
  const hasRework = goals.some(g => g.status === 'rework');

  const steps = [
    { label: 'Add at least one goal',   done: goals.length > 0     },
    { label: 'Total weightage = 100%',  done: totalW === 100       },
    { label: 'Submit for approval',     done: submitted.length > 0 },
    { label: 'Goals locked by manager', done: locked.length > 0    },
    { label: 'Log quarterly actuals',   done: avgScore > 0         },
  ];
  const allDone = steps.every(s => s.done);

  const scoreColor = avgScore >= 80 ? 'text-emerald-600' : avgScore >= 50 ? 'text-amber-500' : 'text-orange-500';

  // KPI cards config
  const kpis = [
    { icon: Target,       label: 'Goals',      value: goals.length, suffix: '/ 8',
      sub: goals.length >= 8 ? 'Max reached' : `${8 - goals.length} slots left`,
      border: 'border-l-blue-500', iconBg: 'bg-blue-50', iconColor: 'text-blue-600',
      bar: goals.length / 8, barColor: 'bg-blue-500' },
    { icon: TrendingUp,   label: 'Weightage',  value: totalW, suffix: '%',
      sub: totalW === 100 ? '✓ Ready to submit' : `${100 - totalW}% remaining`,
      border: 'border-l-emerald-500', iconBg: totalW === 100 ? 'bg-emerald-50' : 'bg-amber-50', iconColor: totalW === 100 ? 'text-emerald-600' : 'text-amber-600',
      bar: Math.min(totalW / 100, 1), barColor: totalW === 100 ? 'bg-emerald-500' : 'bg-amber-400' },
    { icon: Lock,         label: 'Locked',     value: locked.length, suffix: '',
      sub: locked.length > 0 ? 'Manager approved' : 'Awaiting approval',
      border: 'border-l-violet-500', iconBg: 'bg-violet-50', iconColor: 'text-violet-600',
      bar: goals.length ? locked.length / goals.length : 0, barColor: 'bg-violet-500' },
  ];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900">Hello, {name} 👋</h1>
          <p className="text-sm text-slate-500 mt-0.5">{quarter} {year} · Annual Goal Tracking</p>
        </div>
        <div className="flex gap-2.5">
          {canSubmit && (
            <button onClick={handleSubmit} disabled={submitting}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-60">
              <Send className="h-3.5 w-3.5" />{submitting ? 'Submitting…' : 'Submit all goals'}
            </button>
          )}
          {goals.length < 8 ? (
            <Link href="/goals/new"
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
              <Plus className="h-4 w-4" /> Add goal
            </Link>
          ) : (
            <button disabled
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-400 shadow-sm opacity-50 cursor-not-allowed">
              <Plus className="h-4 w-4" /> Add goal
            </button>
          )}
        </div>
      </div>

      {/* Motivational banner */}
      {!hasRework && (
        <div className={cn('flex items-center gap-3 rounded-xl px-4 py-3 text-sm',
          allDone ? 'bg-emerald-50 border border-emerald-200' : 'bg-indigo-50 border border-indigo-100')}>
          <Zap className={cn('h-4 w-4 shrink-0', allDone ? 'text-emerald-500' : 'text-indigo-500')} />
          <p className={cn('font-medium', allDone ? 'text-emerald-800' : 'text-indigo-700')}>
            {allDone
              ? '🎉 All steps complete! You\'re fully on track for this quarter.'
              : goals.length === 0
                ? 'Start by creating your first goal for the year.'
                : totalW < 100
                  ? `Add ${100 - totalW}% more weightage, then submit your goals for approval.`
                  : submitted.length === 0
                    ? 'Total weightage is 100% — submit your goals for manager approval!'
                    : locked.length === 0
                      ? 'Goals submitted! Waiting for manager to approve and lock them.'
                      : 'Goals locked. Log your quarterly actuals to track your score.'}
          </p>
        </div>
      )}

      {/* Rework alert */}
      {hasRework && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
          <p className="flex-1 text-sm font-medium text-amber-900">Manager requested changes on some goals. Update and resubmit.</p>
          <Link href="/goals" className="text-xs font-bold text-amber-700 hover:underline">Fix now →</Link>
        </div>
      )}

      {/* KPI cards — 3 normal + 1 score ring card */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {kpis.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={cn('rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-100 border-l-4', s.border)}>
              <div className="flex items-start justify-between mb-4">
                <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', s.iconBg)}>
                  <Icon className={cn('h-[18px] w-[18px]', s.iconColor)} />
                </div>
                <span className="text-2xl font-extrabold text-slate-900">{s.value}<span className="text-base font-semibold text-slate-400">{s.suffix}</span></span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden mb-2.5">
                <div className={cn('h-full rounded-full transition-all duration-500', s.barColor)} style={{ width: `${s.bar * 100}%` }} />
              </div>
              <p className="text-xs font-semibold text-slate-500">{s.label}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{s.sub}</p>
            </div>
          );
        })}

        {/* Q Score card with ring */}
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-100 border-l-4 border-l-orange-400 flex items-center gap-3">
          <div className="relative shrink-0">
            <ScoreRing score={avgScore} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={cn('text-sm font-extrabold rotate-90', scoreColor)}>
                {avgScore > 0 ? `${avgScore}%` : '—'}
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">{quarter} Score</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {avgScore > 0
                ? avgScore >= 80 ? 'Excellent' : avgScore >= 50 ? 'On track' : 'Needs work'
                : 'Log actuals'}
            </p>
            <Link href="/checkins" className="mt-1 inline-block text-[11px] font-bold text-indigo-600 hover:underline">
              {avgScore > 0 ? 'Update →' : 'Log now →'}
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Goals table */}
        <div className="lg:col-span-2 rounded-xl bg-white shadow-sm ring-1 ring-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">My Goals</h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">{goals.length}/8 goals · {totalW}% weightage</span>
              {goals.length < 8 ? (
                <Link href="/goals/new" className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700">
                  <Plus className="h-3.5 w-3.5" /> Add
                </Link>
              ) : (
                <button disabled className="flex items-center gap-1 text-xs font-bold text-slate-300 opacity-50 cursor-not-allowed">
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              )}
            </div>
          </div>
          {goals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50">
                <Target className="h-7 w-7 text-indigo-400" />
              </div>
              <p className="text-sm font-semibold text-slate-700">No goals yet</p>
              <p className="text-xs text-slate-400 max-w-xs">Create goals — min 10% weightage each, total must equal 100%</p>
              <Link href="/goals/new" className="mt-1 flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                <Plus className="h-4 w-4" /> Create first goal
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500">Goal title</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 hidden md:table-cell">Thrust area</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500">Weight</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {goals.map(g => {
                  const s = STATUS[g.status] || STATUS.draft;
                  const thrustColor = THRUST_COLORS[g.thrustArea] || 'bg-slate-400';
                  return (
                    <tr key={g._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className={cn('w-1 h-8 rounded-full shrink-0', thrustColor)} />
                          <span className="font-medium text-slate-900 truncate max-w-[160px]">{g.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500 hidden md:table-cell">{g.thrustArea}</td>
                      <td className="px-4 py-3.5 text-center"><span className="font-bold text-slate-900">{g.weightage}%</span></td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold', s.cls)}>
                          {g.status === 'locked' && <Lock className="h-2.5 w-2.5" />}
                          {s.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right pr-5">
                        <Link href={`/goals/${g._id}`} className="text-xs font-bold text-indigo-600 hover:text-indigo-700">View →</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">

          {/* Weightage gauge */}
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900">Weightage</h3>
              <span className={cn('text-base font-extrabold', totalW === 100 ? 'text-emerald-600' : totalW > 100 ? 'text-red-500' : 'text-amber-500')}>
                {totalW}%
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
              <div className={cn('h-full rounded-full transition-all duration-700', totalW === 100 ? 'bg-emerald-500' : totalW > 100 ? 'bg-red-500' : 'bg-indigo-500')}
                style={{ width: `${Math.min(totalW, 100)}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {totalW === 100 ? '✓ Ready — click Submit all goals' : totalW > 100 ? `Over by ${totalW - 100}%` : `Add ${100 - totalW}% more`}
            </p>
          </div>

          {/* Progress checklist */}
          <div className={cn('rounded-xl p-5 shadow-sm ring-1', allDone ? 'bg-emerald-50 ring-emerald-100' : 'bg-white ring-slate-100')}>
            <h3 className={cn('text-sm font-bold mb-4', allDone ? 'text-emerald-800' : 'text-slate-900')}>
              {allDone ? '🏆 All steps complete!' : 'Your progress'}
            </h3>
            <ol className="space-y-3">
              {steps.map((step, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors',
                    step.done ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400')}>
                    {step.done ? '✓' : i + 1}
                  </div>
                  <span className={cn('text-xs', step.done ? 'text-slate-400 line-through' : 'text-slate-700 font-medium')}>{step.label}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Score or CTA */}
          {avgScore > 0 ? (
            <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-bold text-slate-900">{quarter} Score</h3>
                <Link href="/checkins" className="text-xs font-bold text-indigo-600 hover:underline">Update →</Link>
              </div>
              <p className={cn('text-4xl font-extrabold mt-1', scoreColor)}>{avgScore}%</p>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className={cn('h-full rounded-full', avgScore >= 80 ? 'bg-emerald-500' : avgScore >= 50 ? 'bg-amber-400' : 'bg-orange-400')}
                  style={{ width: `${avgScore}%` }} />
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                {avgScore >= 80 ? 'Excellent — on track for top rating' : avgScore >= 50 ? 'Good — keep logging actuals' : 'Needs attention'}
              </p>
            </div>
          ) : (
            <Link href="/checkins"
              className="flex items-center gap-3 rounded-xl bg-indigo-600 p-5 shadow-sm hover:bg-indigo-700 transition-colors">
              <CalendarCheck className="h-6 w-6 text-white shrink-0" />
              <div>
                <p className="text-sm font-bold text-white">Log {quarter} actuals</p>
                <p className="text-xs text-indigo-200 mt-0.5">Record your achievement for this quarter</p>
              </div>
              <ArrowRight className="h-4 w-4 text-indigo-300 ml-auto" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
