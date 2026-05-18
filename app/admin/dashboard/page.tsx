'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  Users, Target, FileText, ClipboardList, BarChart3, AlertTriangle,
  CheckCircle2, ArrowRight, UserCog, RefreshCw, PieChart,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Stats {
  totalEmployees: number; approvedGoalsCount: number;
  submittedGoalsCount: number; checkInPercentage: number;
  departments: { _id: string; count: number }[];
}
interface CompletionData {
  summary: { totalEmployees: number; achievementLoggedCount: number; fullyCompletedCount: number; completedManagers: number; totalManagers: number; completionRate: number };
  employees: { _id: string; name: string; department: string; lockedGoals: number; achievementLogged: boolean; managerCheckinDone: boolean; fullyComplete: boolean }[];
}

const QUARTERS = ['Q1','Q2','Q3','Q4'] as const;

export default function AdminDashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats]           = useState<Stats | null>(null);
  const [completion, setCompletion] = useState<CompletionData | null>(null);
  const [quarter, setQuarter]       = useState(`Q${Math.ceil((new Date().getMonth() + 1) / 3)}`);
  const [year]                      = useState(new Date().getFullYear());
  const [loading, setLoading]       = useState(true);

  useEffect(() => { fetch('/api/admin/stats').then(r => r.json()).then(setStats).finally(() => setLoading(false)); }, []);
  useEffect(() => { fetch(`/api/admin/completion?quarter=${quarter}&year=${year}`).then(r => r.json()).then(setCompletion); }, [quarter, year]);

  if (loading) return (
    <div className="space-y-5 animate-pulse">
      <div className="h-8 w-48 rounded bg-slate-200" />
      <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-24 rounded-xl bg-slate-200" />)}</div>
      <div className="h-72 rounded-xl bg-slate-200" />
    </div>
  );

  const firstName = session?.user?.name?.split(' ')[0] || 'Admin';
  const rate      = completion?.summary.completionRate ?? 0;

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Hello, {firstName} 👋</h1>
          <p className="text-sm text-slate-500 mt-0.5">HR Admin · Organisation overview {year}</p>
        </div>
        {(stats?.submittedGoalsCount ?? 0) > 0 && (
          <Link href="/admin/goals"
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors bg-[#6366f1] hover:bg-[#4f46e5]">
            <AlertTriangle className="h-3.5 w-3.5" />
            {stats!.submittedGoalsCount} goals awaiting approval
          </Link>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total employees',   value: stats?.totalEmployees ?? 0,         sub: 'Active accounts'      },
          { label: 'Locked goals',      value: stats?.approvedGoalsCount ?? 0,     sub: 'Manager approved'     },
          { label: 'Awaiting approval', value: stats?.submittedGoalsCount ?? 0,    sub: 'Needs manager action' },
          { label: 'Check-in rate',     value: `${stats?.checkInPercentage ?? 0}%`,sub: 'Current quarter'      },
        ].map(s => (
          <div key={s.label} className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm" style={{ borderTop: '3px solid #6366f1' }}>
            <p className="text-2xl font-bold text-slate-900">{s.value}</p>
            <p className="text-xs font-medium text-slate-500 mt-1">{s.label}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">

        {/* Left: nav links + departments */}
        <div className="space-y-4">
          <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Admin tools</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { href: '/admin/users',       icon: UserCog,       label: 'Users',       cls: 'bg-indigo-50 text-indigo-600'   },
                { href: '/admin/cycles',      icon: RefreshCw,     label: 'Cycles',      cls: 'bg-violet-50 text-violet-600'   },
                { href: '/admin/goals',       icon: Target,        label: 'All Goals',   cls: 'bg-cyan-50 text-cyan-600'       },
                { href: '/admin/reports',     icon: FileText,      label: 'Reports',     cls: 'bg-emerald-50 text-emerald-600' },
                { href: '/admin/completion',  icon: PieChart,      label: 'Completion',  cls: 'bg-amber-50 text-amber-600'     },
                { href: '/admin/analytics',   icon: BarChart3,     label: 'Analytics',   cls: 'bg-sky-50 text-sky-600'         },
                { href: '/admin/audit',       icon: ClipboardList, label: 'Audit Log',   cls: 'bg-slate-100 text-slate-600'    },
                { href: '/admin/escalations', icon: AlertTriangle, label: 'Escalations', cls: 'bg-rose-50 text-rose-600'       },
              ].map(a => {
                const Icon = a.icon;
                return (
                  <Link key={a.href} href={a.href}
                    className="group flex flex-col items-start gap-1.5 rounded-lg border border-slate-100 p-3 hover:border-slate-200 hover:shadow-sm transition-all bg-slate-50">
                    <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg', a.cls)}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-700">{a.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Departments */}
          {(stats?.departments?.length ?? 0) > 0 && (
            <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">By department</p>
              <div className="space-y-3">
                {stats!.departments.slice(0, 5).map(d => {
                  const pct = stats!.totalEmployees ? Math.round((d.count / stats!.totalEmployees) * 100) : 0;
                  return (
                    <div key={d._id || 'none'}>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs text-slate-700 font-medium truncate max-w-[120px]">{d._id || 'Unassigned'}</span>
                        <span className="text-xs font-bold text-slate-900 shrink-0">{d.count}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full bg-indigo-400 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right: completion tracker */}
        <div className="lg:col-span-2 rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Check-in completion</h2>
              <p className="text-xs text-slate-400 mt-0.5">Track actuals logged this quarter</p>
            </div>
            <div className="flex gap-1">
              {QUARTERS.map(q => (
                <button key={q} onClick={() => setQuarter(q)}
                  className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors', quarter === q ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
                  {q}
                </button>
              ))}
            </div>
          </div>

          {completion ? (
            <div className="p-5 space-y-4">
              {/* Progress */}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between mb-1.5">
                    <span className="text-xs text-slate-500">Overall completion</span>
                    <span className={cn('text-xs font-bold', rate >= 80 ? 'text-emerald-600' : 'text-amber-600')}>{rate}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className={cn('h-full rounded-full transition-all duration-500', rate >= 80 ? 'bg-emerald-500' : 'bg-amber-400')} style={{ width: `${rate}%` }} />
                  </div>
                </div>
              </div>

              {/* Mini stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Actuals logged', value: `${completion.summary.achievementLoggedCount}/${completion.summary.totalEmployees}`, cls: 'bg-indigo-50 text-indigo-700' },
                  { label: 'Fully done',     value: completion.summary.fullyCompletedCount, cls: 'bg-emerald-50 text-emerald-700' },
                  { label: 'Managers done',  value: `${completion.summary.completedManagers}/${completion.summary.totalManagers}`,      cls: 'bg-violet-50 text-violet-700'  },
                ].map(s => (
                  <div key={s.label} className={cn('rounded-lg p-3 text-center', s.cls)}>
                    <p className="text-lg font-bold">{s.value}</p>
                    <p className="text-[11px] font-semibold opacity-80 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Table */}
              <div className="rounded-lg border border-slate-100 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-semibold text-slate-500">Employee</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-slate-500">Dept</th>
                      <th className="px-4 py-2.5 text-center font-semibold text-slate-500">Goals</th>
                      <th className="px-4 py-2.5 text-center font-semibold text-slate-500">Actuals</th>
                      <th className="px-4 py-2.5 text-center font-semibold text-slate-500">Check-in</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {completion.employees.slice(0, 7).map(emp => (
                      <tr key={emp._id} className={cn('hover:bg-slate-50 transition-colors', emp.fullyComplete && 'bg-emerald-50/30')}>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">
                              {emp.name.charAt(0)}
                            </div>
                            <span className="font-semibold text-slate-900">{emp.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-slate-500">{emp.department || '—'}</td>
                        <td className="px-4 py-2.5 text-center font-bold text-slate-900">{emp.lockedGoals}</td>
                        <td className="px-4 py-2.5 text-center"><Dot done={emp.achievementLogged} /></td>
                        <td className="px-4 py-2.5 text-center"><Dot done={emp.managerCheckinDone} /></td>
                      </tr>
                    ))}
                    {completion.employees.length === 0 && (
                      <tr><td colSpan={5} className="py-10 text-center text-slate-400">No employee data for {quarter}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {completion.employees.length > 7 && (
                <Link href="/admin/completion" className="flex items-center justify-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 pt-1">
                  View all {completion.employees.length} employees <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-16 text-sm text-slate-400">Loading…</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Dot({ done }: { done: boolean }) {
  return done
    ? <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-600">✓</span>
    : <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] text-slate-300">–</span>;
}
