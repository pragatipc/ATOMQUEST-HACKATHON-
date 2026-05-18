'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ReportRow {
  employee: string;
  email: string;
  department: string;
  goalTitle: string;
  thrustArea: string;
  uomType: string;
  target: string;
  weightage: number;
  Q1_actual: string;
  Q1_score: string;
  Q2_actual: string;
  Q2_score: string;
  Q3_actual: string;
  Q3_score: string;
  Q4_actual: string;
  Q4_score: string;
  avgScore: string;
}

interface GoalRow {
  _id: string;
  title: string;
  status: string;
  weightage: number;
  thrustArea: string;
  employeeId?: { name: string; email: string; department?: string };
}

export default function AdminReportsPage() {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [goalRows, setGoalRows] = useState<GoalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'achievement' | 'goals'>('achievement');
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const year = new Date().getFullYear();

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/reports?year=${year}`).then((r) => r.json()),
      fetch('/api/goals').then((r) => r.json()),
    ]).then(([reportData, goalsData]) => {
      setRows(reportData.rows || []);
      setGoalRows(Array.isArray(goalsData) ? goalsData : []);
    }).finally(() => setLoading(false));
  }, [year]);

  const departments = [...new Set(rows.map((r) => r.department).filter(Boolean))];

  const filteredRows = rows.filter((r) => {
    return (!deptFilter || r.department === deptFilter);
  });

  const filteredGoals = goalRows.filter((g) => {
    const matchStatus = !statusFilter || g.status === statusFilter;
    const matchDept = !deptFilter || g.employeeId?.department === deptFilter;
    return matchStatus && matchDept;
  });

  function exportCsv(data: Record<string, unknown>[], filename: string) {
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map((row) =>
        headers.map((h) => JSON.stringify(String(row[h] ?? ''))).join(',')
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportAchievementReport() {
    exportCsv(filteredRows as unknown as Record<string, unknown>[], `achievement-report-${year}.csv`);
  }

  function exportGoalsReport() {
    exportCsv(
      filteredGoals.map((g) => ({
        employee: g.employeeId?.name || '—',
        email: g.employeeId?.email || '—',
        department: g.employeeId?.department || '—',
        goalTitle: g.title,
        thrustArea: g.thrustArea,
        weightage: g.weightage,
        status: g.status,
      })),
      `goals-report-${year}.csv`
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-sm text-slate-500">Planned target vs actual achievement — {year}</p>
        </div>
        <Button
          variant="outline"
          onClick={tab === 'achievement' ? exportAchievementReport : exportGoalsReport}
          disabled={loading}
        >
          Export CSV
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 w-fit">
        {(['achievement', 'goals'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'rounded-md px-4 py-1.5 text-sm font-medium transition-colors capitalize',
              tab === t ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            {t === 'achievement' ? 'Achievement Report' : 'Goals Summary'}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {tab === 'goals' && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="locked">Locked</option>
            <option value="rework">Rework</option>
          </select>
        )}
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">All departments</option>
          {departments.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : tab === 'achievement' ? (
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base">
              Planned vs Actual Achievement ({filteredRows.length} goal{filteredRows.length !== 1 ? 's' : ''})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-slate-50">
                  <tr>
                    <th className="px-3 py-3 text-left font-semibold">Employee</th>
                    <th className="px-3 py-3 text-left font-semibold">Goal</th>
                    <th className="px-3 py-3 text-left font-semibold">Thrust</th>
                    <th className="px-3 py-3 text-left font-semibold">UoM</th>
                    <th className="px-3 py-3 text-right font-semibold">Target</th>
                    <th className="px-3 py-3 text-right font-semibold">Wt.</th>
                    <th className="px-3 py-3 text-center font-semibold border-l border-slate-200 bg-blue-50">Q1 Actual</th>
                    <th className="px-3 py-3 text-center font-semibold bg-blue-50">Q1 Score</th>
                    <th className="px-3 py-3 text-center font-semibold border-l border-slate-200">Q2 Actual</th>
                    <th className="px-3 py-3 text-center font-semibold">Q2 Score</th>
                    <th className="px-3 py-3 text-center font-semibold border-l border-slate-200">Q3 Actual</th>
                    <th className="px-3 py-3 text-center font-semibold">Q3 Score</th>
                    <th className="px-3 py-3 text-center font-semibold border-l border-slate-200">Q4 Actual</th>
                    <th className="px-3 py-3 text-center font-semibold">Q4 Score</th>
                    <th className="px-3 py-3 text-center font-semibold border-l border-slate-200 bg-emerald-50">Avg Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={15} className="px-4 py-12 text-center text-slate-500">
                        No achievement data found. Employees need to enter quarterly actuals first.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-3 py-2">
                          <p className="font-medium text-slate-900">{row.employee}</p>
                          <p className="text-xs text-slate-500">{row.department}</p>
                        </td>
                        <td className="px-3 py-2 text-slate-800 max-w-[180px]">
                          <span title={row.goalTitle} className="line-clamp-2">{row.goalTitle}</span>
                        </td>
                        <td className="px-3 py-2 text-slate-500 text-xs">{row.thrustArea}</td>
                        <td className="px-3 py-2 text-slate-500 text-xs">{row.uomType.replace('_', ' ')}</td>
                        <td className="px-3 py-2 text-right font-medium">{row.target}</td>
                        <td className="px-3 py-2 text-right text-slate-600">{row.weightage}%</td>
                        <td className="px-3 py-2 text-center border-l border-slate-100 bg-blue-50/30">{row.Q1_actual}</td>
                        <td className="px-3 py-2 text-center font-medium bg-blue-50/30" style={{ color: row.Q1_score !== '—' ? '#4f46e5' : undefined }}>{row.Q1_score}</td>
                        <td className="px-3 py-2 text-center border-l border-slate-100">{row.Q2_actual}</td>
                        <td className="px-3 py-2 text-center font-medium" style={{ color: row.Q2_score !== '—' ? '#4f46e5' : undefined }}>{row.Q2_score}</td>
                        <td className="px-3 py-2 text-center border-l border-slate-100">{row.Q3_actual}</td>
                        <td className="px-3 py-2 text-center font-medium" style={{ color: row.Q3_score !== '—' ? '#4f46e5' : undefined }}>{row.Q3_score}</td>
                        <td className="px-3 py-2 text-center border-l border-slate-100">{row.Q4_actual}</td>
                        <td className="px-3 py-2 text-center font-medium" style={{ color: row.Q4_score !== '—' ? '#4f46e5' : undefined }}>{row.Q4_score}</td>
                        <td className="px-3 py-2 text-center border-l border-slate-100 bg-emerald-50/50 font-bold text-emerald-700">{row.avgScore}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base">
              Goals Summary ({filteredGoals.length} goal{filteredGoals.length !== 1 ? 's' : ''})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Employee</th>
                  <th className="px-4 py-3 text-left font-semibold">Goal</th>
                  <th className="px-4 py-3 text-left font-semibold">Department</th>
                  <th className="px-4 py-3 text-right font-semibold">Weight</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredGoals.map((g) => (
                  <tr key={g._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{g.employeeId?.name || '—'}</td>
                    <td className="px-4 py-3">{g.title}</td>
                    <td className="px-4 py-3 text-slate-600">{g.employeeId?.department || '—'}</td>
                    <td className="px-4 py-3 text-right">{g.weightage}%</td>
                    <td className="px-4 py-3"><Badge status={g.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
