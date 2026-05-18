'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Employee {
  _id: string;
  name: string;
  email: string;
  department: string;
  manager: string;
  lockedGoals: number;
  achievementLogged: boolean;
  managerCheckinDone: boolean;
  fullyComplete: boolean;
}

interface Manager {
  _id: string;
  name: string;
  email: string;
  teamCount: number;
  checkinsDone: number;
  fullyComplete: boolean;
}

interface CompletionData {
  quarter: string;
  year: number;
  summary: {
    totalEmployees: number;
    achievementLoggedCount: number;
    fullyCompletedCount: number;
    completedManagers: number;
    totalManagers: number;
    completionRate: number;
  };
  employees: Employee[];
  managers: Manager[];
}

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'] as const;

export default function CompletionPage() {
  const [data, setData] = useState<CompletionData | null>(null);
  const [quarter, setQuarter] = useState(`Q${Math.ceil((new Date().getMonth() + 1) / 3)}`);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'employees' | 'managers'>('employees');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/completion?quarter=${quarter}&year=${year}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [quarter, year]);

  function exportCsv() {
    if (!data) return;
    const rows = view === 'employees'
      ? data.employees.map((e) => ({
          name: e.name, email: e.email, department: e.department, manager: e.manager,
          locked_goals: e.lockedGoals, achievement_logged: e.achievementLogged ? 'Yes' : 'No',
          manager_checkin: e.managerCheckinDone ? 'Yes' : 'No', fully_complete: e.fullyComplete ? 'Yes' : 'No',
        }))
      : data.managers.map((m) => ({
          name: m.name, email: m.email, team_size: m.teamCount,
          checkins_done: m.checkinsDone, fully_complete: m.fullyComplete ? 'Yes' : 'No',
        }));

    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => JSON.stringify((r as Record<string, unknown>)[h] ?? '')).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `completion-${quarter}-${year}.csv`;
    a.click();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Completion Dashboard</h1>
          <p className="text-sm text-slate-500">Real-time view of quarterly check-in completion</p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={!data}>Export CSV</Button>
      </div>

      {/* Quarter / Year selectors */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1">
          {QUARTERS.map((q) => (
            <button
              key={q}
              onClick={() => setQuarter(q)}
              className={cn('rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                quarter === q ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              )}
            >
              {q}
            </button>
          ))}
        </div>
        <select
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value))}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          {[year - 1, year, year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : !data ? (
        <p className="text-red-600">Failed to load data.</p>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Total employees', value: data.summary.totalEmployees, bg: 'bg-indigo-50', text: 'text-indigo-700' },
              { label: 'Achievements logged', value: data.summary.achievementLoggedCount, bg: 'bg-emerald-50', text: 'text-emerald-700' },
              { label: 'Managers done', value: `${data.summary.completedManagers}/${data.summary.totalManagers}`, bg: 'bg-violet-50', text: 'text-violet-700' },
              { label: 'Completion rate', value: `${data.summary.completionRate}%`, bg: 'bg-amber-50', text: data.summary.completionRate >= 80 ? 'text-emerald-700' : 'text-amber-700' },
            ].map((s) => (
              <div key={s.label} className={`rounded-xl border border-slate-100 ${s.bg} p-4`}>
                <p className={`text-3xl font-bold ${s.text}`}>{s.value}</p>
                <p className="mt-1 text-sm text-slate-600">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Overall progress */}
          <Card>
            <CardContent className="py-4">
              <div className="mb-2 flex justify-between text-sm font-medium">
                <span className="text-slate-700">Overall achievement completion — {quarter} {year}</span>
                <span className={data.summary.completionRate >= 80 ? 'text-emerald-600' : 'text-amber-600'}>
                  {data.summary.achievementLoggedCount}/{data.summary.totalEmployees} employees
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={cn('h-full rounded-full transition-all', data.summary.completionRate >= 80 ? 'bg-emerald-500' : 'bg-amber-500')}
                  style={{ width: `${data.summary.completionRate}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* View toggle */}
          <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 w-fit">
            {(['employees', 'managers'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn('rounded-md px-4 py-1.5 text-sm font-medium transition-colors capitalize',
                  view === v ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
                )}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Table */}
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base capitalize">{view} status — {quarter} {year}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                {view === 'employees' ? (
                  <table className="w-full text-sm">
                    <thead className="border-b bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">Name</th>
                        <th className="px-4 py-3 text-left font-semibold">Department</th>
                        <th className="px-4 py-3 text-left font-semibold">Manager</th>
                        <th className="px-4 py-3 text-center font-semibold">Locked goals</th>
                        <th className="px-4 py-3 text-center font-semibold">Achievement logged</th>
                        <th className="px-4 py-3 text-center font-semibold">Manager check-in</th>
                        <th className="px-4 py-3 text-center font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.employees.map((emp) => (
                        <tr key={emp._id} className={cn('hover:bg-slate-50', emp.fullyComplete && 'bg-emerald-50/40')}>
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-900">{emp.name}</p>
                            <p className="text-xs text-slate-500">{emp.email}</p>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{emp.department}</td>
                          <td className="px-4 py-3 text-slate-600">{emp.manager}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={cn('font-bold text-lg', emp.lockedGoals > 0 ? 'text-emerald-600' : 'text-slate-300')}>
                              {emp.lockedGoals}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center"><Chip done={emp.achievementLogged} /></td>
                          <td className="px-4 py-3 text-center"><Chip done={emp.managerCheckinDone} /></td>
                          <td className="px-4 py-3 text-center">
                            <span className={cn('rounded-full px-2 py-1 text-xs font-semibold',
                              emp.fullyComplete ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            )}>
                              {emp.fullyComplete ? 'Complete' : 'Pending'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="border-b bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">Manager</th>
                        <th className="px-4 py-3 text-center font-semibold">Team size</th>
                        <th className="px-4 py-3 text-center font-semibold">Check-ins done</th>
                        <th className="px-4 py-3 text-center font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.managers.map((mgr) => (
                        <tr key={mgr._id} className={cn('hover:bg-slate-50', mgr.fullyComplete && 'bg-emerald-50/40')}>
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-900">{mgr.name}</p>
                            <p className="text-xs text-slate-500">{mgr.email}</p>
                          </td>
                          <td className="px-4 py-3 text-center font-semibold">{mgr.teamCount}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="font-semibold text-indigo-600">{mgr.checkinsDone}</span>
                            <span className="text-slate-400"> / {mgr.teamCount}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={cn('rounded-full px-2 py-1 text-xs font-semibold',
                              mgr.fullyComplete ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            )}>
                              {mgr.fullyComplete ? 'Done' : 'Pending'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Chip({ done }: { done: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
      done ? 'bg-emerald-100 text-emerald-700' : 'bg-red-50 text-red-500'
    )}>
      {done ? '✓ Yes' : '✗ No'}
    </span>
  );
}
