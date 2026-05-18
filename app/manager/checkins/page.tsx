'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label, Textarea } from '@/components/ui/input';
import { getCurrentQuarter, cn } from '@/lib/utils';

interface TeamMember {
  _id: string;
  name: string;
  email: string;
  department?: string;
}

interface Goal {
  _id: string;
  title: string;
  target: number | string;
  uomType: string;
  weightage: number;
  thrustArea: string;
  status: string;
}

interface AchievementRow {
  goalId: { _id: string; title: string; target: number | string; uomType: string; weightage: number } | string;
  actualValue: number | string;
  computedScore: number;
  progressStatus: string;
}

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'] as const;
const STATUS_LABELS: Record<string, string> = {
  not_started: 'Not started',
  on_track: 'On track',
  completed: 'Completed',
};

export default function ManagerCheckinsPage() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<TeamMember | null>(null);
  const [quarter, setQuarter] = useState(getCurrentQuarter());
  const [year, setYear] = useState(new Date().getFullYear());
  const [goals, setGoals] = useState<Goal[]>([]);
  const [achievements, setAchievements] = useState<AchievementRow[]>([]);
  const [comment, setComment] = useState('');
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [existingCheckin, setExistingCheckin] = useState<{ comment?: string } | null>(null);

  useEffect(() => {
    fetch('/api/manager/team')
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : [];
        setTeam(list);
        if (list[0]) setSelectedEmployee(list[0]);
      });
  }, []);

  useEffect(() => {
    if (!selectedEmployee) return;
    loadEmployeeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEmployee, quarter, year]);

  async function loadEmployeeData() {
    if (!selectedEmployee) return;
    setLoadingData(true);
    setMessage({ text: '', type: '' });
    try {
      const [goalsRes, achRes, checkinRes] = await Promise.all([
        fetch(`/api/goals?employeeId=${selectedEmployee._id}`),
        fetch(`/api/achievements?employeeId=${selectedEmployee._id}&quarter=${quarter}&year=${year}`),
        fetch(`/api/checkins?employeeId=${selectedEmployee._id}&quarter=${quarter}&year=${year}`),
      ]);
      const goalsData = await goalsRes.json();
      const achData = await achRes.json();
      const checkinData = await checkinRes.json();

      const locked = Array.isArray(goalsData)
        ? goalsData.filter((g: Goal) => g.status === 'locked' || g.status === 'approved')
        : [];
      setGoals(locked);
      setAchievements(Array.isArray(achData) ? achData : []);

      const existing = Array.isArray(checkinData) ? checkinData[0] : null;
      setExistingCheckin(existing);
      setComment(existing?.comment || '');
    } finally {
      setLoadingData(false);
    }
  }

  function getAchievement(goalId: string) {
    return achievements.find((a) => {
      const gid = typeof a.goalId === 'object' ? a.goalId._id : a.goalId;
      return String(gid) === goalId;
    });
  }

  function getScoreColor(score: number) {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-red-600';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEmployee) return;
    setSaving(true);
    setMessage({ text: '', type: '' });
    try {
      const res = await fetch('/api/checkins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedEmployee._id,
          quarter,
          year,
          comment,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ text: data.error || 'Failed to save check-in', type: 'error' });
        return;
      }
      setMessage({ text: `Check-in recorded for ${selectedEmployee.name} — ${quarter} ${year}`, type: 'success' });
      setExistingCheckin(data);
    } catch {
      setMessage({ text: 'Failed to save', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  const weightedScore = achievements.reduce((sum, a) => {
    const goal = goals.find((g) => {
      const gid = typeof a.goalId === 'object' ? a.goalId._id : a.goalId;
      return String(g._id) === String(gid);
    });
    if (!goal) return sum;
    return sum + (a.computedScore * goal.weightage) / 100;
  }, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Team check-ins</h1>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Employee</label>
          <select
            value={selectedEmployee?._id || ''}
            onChange={(e) => {
              const emp = team.find((m) => m._id === e.target.value);
              setSelectedEmployee(emp || null);
            }}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm min-w-[180px]"
          >
            {team.map((m) => (
              <option key={m._id} value={m._id}>{m.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Quarter</label>
          <div className="flex gap-1">
            {QUARTERS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setQuarter(q)}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  quarter === q ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                )}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Year</label>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            {[year - 1, year, year + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedEmployee && (
        <div className="space-y-4">
          {/* Employee info */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4">
            <div>
              <p className="font-semibold text-slate-900">{selectedEmployee.name}</p>
              <p className="text-sm text-slate-500">{selectedEmployee.email}{selectedEmployee.department && ` · ${selectedEmployee.department}`}</p>
            </div>
            {achievements.length > 0 && (
              <div className="text-right">
                <p className="text-2xl font-bold text-indigo-600">{Math.round(weightedScore)}%</p>
                <p className="text-xs text-slate-500">Weighted score — {quarter} {year}</p>
              </div>
            )}
          </div>

          {/* Planned vs Actual table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span>Planned vs Actual — {quarter} {year}</span>
                {existingCheckin && (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                    Check-in recorded
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loadingData ? (
                <p className="px-4 py-8 text-center text-slate-500">Loading...</p>
              ) : goals.length === 0 ? (
                <p className="px-4 py-8 text-center text-slate-500">No locked goals found for this employee.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Goal</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Thrust area</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-700">Weight</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-700">Planned target</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-700">Actual</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-700">Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {goals.map((goal) => {
                        const ach = getAchievement(goal._id);
                        return (
                          <tr key={goal._id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium text-slate-900">{goal.title}</td>
                            <td className="px-4 py-3 text-slate-500 text-xs">{goal.thrustArea}</td>
                            <td className="px-4 py-3 text-right text-slate-600">{goal.weightage}%</td>
                            <td className="px-4 py-3 text-right font-medium">
                              {goal.uomType === 'timeline'
                                ? new Date(String(goal.target)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                : String(goal.target)}
                              <span className="ml-1 text-xs text-slate-400">({goal.uomType.replace('_', ' ')})</span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              {ach ? (
                                <span className="font-medium">
                                  {goal.uomType === 'timeline'
                                    ? new Date(String(ach.actualValue)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                    : String(ach.actualValue)}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-xs">Not entered</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {ach ? (
                                <span className={cn(
                                  'rounded-full px-2 py-0.5 text-xs font-medium',
                                  ach.progressStatus === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                  ach.progressStatus === 'on_track' ? 'bg-blue-100 text-blue-700' :
                                  'bg-slate-100 text-slate-600'
                                )}>
                                  {STATUS_LABELS[ach.progressStatus] || ach.progressStatus}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-xs">—</span>
                              )}
                            </td>
                            <td className={cn('px-4 py-3 text-right font-bold', ach ? getScoreColor(ach.computedScore) : 'text-slate-400')}>
                              {ach ? `${ach.computedScore}%` : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Check-in comment form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {existingCheckin ? 'Update check-in notes' : 'Record check-in'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Discussion notes & feedback</Label>
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                    placeholder="Document key discussion points, feedback given, action items agreed upon..."
                  />
                </div>

                {message.text && (
                  <div className={cn(
                    'rounded-lg border px-4 py-3 text-sm',
                    message.type === 'success'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-red-200 bg-red-50 text-red-700'
                  )}>
                    {message.text}
                  </div>
                )}

                <Button type="submit" disabled={saving || !selectedEmployee}>
                  {saving ? 'Saving...' : existingCheckin ? 'Update check-in' : 'Save check-in'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
