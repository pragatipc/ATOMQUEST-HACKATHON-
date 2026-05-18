'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { getCurrentQuarter, cn } from '@/lib/utils';
import { TrendingUp, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface Goal {
  _id: string;
  title: string;
  target: number | string;
  uomType: string;
  weightage: number;
  status: string;
}

interface AchievementRow {
  goalId: string;
  actualValue: number | string;
  progressStatus: string;
}

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'] as const;

const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'on_track',    label: 'On Track'    },
  { value: 'completed',   label: 'Completed'   },
];

// ── Inline score formula ──────────────────────────────────────────────────────
function computeScoreLocal(
  uomType: string,
  target: number | string,
  actualValue: number | string
): number | null {
  if (actualValue === '' || actualValue === undefined || actualValue === null) return null;

  let score = 0;

  switch (uomType) {
    case 'numeric_min': {
      const t = parseFloat(String(target));
      const a = parseFloat(String(actualValue));
      if (isNaN(t) || isNaN(a) || t === 0) return null;
      score = (a / t) * 100;
      break;
    }
    case 'numeric_max': {
      const t = parseFloat(String(target));
      const a = parseFloat(String(actualValue));
      if (isNaN(t) || isNaN(a) || a === 0) return null;
      score = (t / a) * 100;
      break;
    }
    case 'timeline': {
      const targetDate = new Date(String(target)).getTime();
      const actualDate = new Date(String(actualValue)).getTime();
      if (isNaN(targetDate) || isNaN(actualDate)) return null;
      score = actualDate <= targetDate ? 100 : 0;
      break;
    }
    case 'zero': {
      const a = parseFloat(String(actualValue));
      if (isNaN(a)) return null;
      score = a === 0 ? 100 : 0;
      break;
    }
    default:
      return null;
  }

  return Math.min(100, Math.max(0, Math.round(score * 10) / 10));
}

function scoreColor(score: number): string {
  if (score >= 80) return '#15803d';
  if (score >= 50) return '#d97706';
  return '#dc2626';
}

function scoreBg(score: number) {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 50) return 'bg-amber-400';
  return 'bg-red-400';
}

// SVG Donut chart for weighted score
function DonutScore({ score }: { score: number }) {
  const r = 36, cx = 44, cy = 44;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = scoreColor(score);
  return (
    <svg width={88} height={88} className="rotate-[-90deg]">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth={10} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={10}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }} />
    </svg>
  );
}

export default function CheckinsPage() {
  const { data: session } = useSession();
  const toast = useToast();
  const [quarter, setQuarter] = useState(getCurrentQuarter());
  const [year, setYear] = useState(new Date().getFullYear());
  const [goals, setGoals] = useState<Goal[]>([]);
  const [rows, setRows] = useState<Record<string, AchievementRow>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) return;
    async function load() {
      setLoading(true);
      try {
        const [goalsRes, achRes] = await Promise.all([
          fetch('/api/goals'),
          fetch(`/api/achievements?quarter=${quarter}&year=${year}`),
        ]);
        const goalsData = await goalsRes.json();
        const achData = await achRes.json();
        const locked = (Array.isArray(goalsData) ? goalsData : []).filter(
          (g: Goal) => g.status === 'locked' || g.status === 'approved'
        );
        setGoals(locked);
        const map: Record<string, AchievementRow> = {};
        if (Array.isArray(achData)) {
          achData.forEach((a: { goalId: { _id: string; uomType?: string } | string; actualValue: number | string; progressStatus: string }) => {
            const goalObj = typeof a.goalId === 'object' ? a.goalId : null;
            const gid = goalObj ? goalObj._id : String(a.goalId);
            let val = a.actualValue;
            if (goalObj?.uomType === 'timeline' && val) {
              val = new Date(String(val)).toISOString().split('T')[0];
            }
            map[gid] = { goalId: gid, actualValue: val, progressStatus: a.progressStatus };
          });
        }
        locked.forEach((g: Goal) => {
          if (!map[g._id]) map[g._id] = { goalId: g._id, actualValue: '', progressStatus: 'on_track' };
        });
        setRows(map);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [session?.user?.id, quarter, year]);

  function updateRow(goalId: string, field: keyof AchievementRow, value: string | number) {
    setRows((prev) => ({ ...prev, [goalId]: { ...prev[goalId], [field]: value } }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const results = await Promise.all(
        Object.values(rows).map((row) =>
          fetch('/api/achievements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ goalId: row.goalId, quarter, year, actualValue: row.actualValue, progressStatus: row.progressStatus }),
          })
        )
      );
      if (results.every((r) => r.ok)) toast.success(`${quarter} ${year} actuals saved!`);
      else toast.error('Some saves failed');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  }

  // Live weighted score using inline formula
  const weightedTotal = goals.reduce((sum, g) => {
    const row = rows[g._id];
    if (row?.actualValue === '' || row?.actualValue === undefined) return sum;
    const score = computeScoreLocal(g.uomType, g.target, row.actualValue);
    if (score === null) return sum;
    return sum + (score * g.weightage) / 100;
  }, 0);
  const roundedScore = Math.round(weightedTotal * 10) / 10;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900">Quarterly Check-ins</h1>
          <p className="text-sm text-slate-500 mt-0.5">Log actuals for each locked goal · scores update live</p>
        </div>
      </div>

      {/* Quarter selector */}
      <div className="flex flex-wrap items-center gap-2">
        {QUARTERS.map((q) => (
          <button key={q} type="button" onClick={() => setQuarter(q)}
            className={cn('rounded-lg px-4 py-2 text-sm font-semibold transition-all',
              quarter === q ? 'text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50')}
            style={quarter === q ? { backgroundColor: '#6366f1' } : {}}>
            {q}
          </button>
        ))}
        <select value={year} onChange={(e) => setYear(parseInt(e.target.value))}
          className="ml-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 bg-white">
          {[year - 1, year, year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-white animate-pulse" />)}</div>
      ) : goals.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-16 text-center">
          <TrendingUp className="mx-auto h-10 w-10 text-slate-300 mb-3" />
          <p className="font-semibold text-slate-700">No locked goals to track</p>
          <p className="text-sm text-slate-400 mt-1">Submit your goals and get manager approval first.</p>
        </div>
      ) : (
        <>
          {/* Donut score card */}
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6 flex items-center gap-6">
            <div className="relative shrink-0">
              <DonutScore score={roundedScore} />
              <div className="absolute inset-0 flex items-center justify-center rotate-90">
                <span className="text-xl font-extrabold" style={{ color: scoreColor(roundedScore) }}>{roundedScore}%</span>
              </div>
            </div>
            <div>
              <p className="text-base font-bold text-slate-900">{quarter} {year} Score</p>
              <p className="text-sm text-slate-500 mt-0.5">Weighted score across all {goals.length} goals</p>
              <p className="text-xs font-semibold mt-2" style={{ color: scoreColor(roundedScore) }}>
                {roundedScore >= 80 ? '🎉 Excellent performance!' : roundedScore >= 50 ? '📈 Good — keep pushing!' : '⚡ Needs improvement'}
              </p>
            </div>
          </div>

          {/* Goal rows */}
          <div className="space-y-3">
            {goals.map((goal) => {
              const row = rows[goal._id];
              const hasActual = row?.actualValue !== '' && row?.actualValue !== undefined;
              const score = hasActual ? computeScoreLocal(goal.uomType, goal.target, row.actualValue) : null;

              return (
                <div key={goal._id} className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-slate-900 truncate">{goal.title}</p>
                          <span className="shrink-0 text-xs text-slate-400 font-medium">{goal.weightage}%</span>
                        </div>
                        <p className="text-xs text-slate-400">
                          Target: <span className="font-medium text-slate-600">
                            {goal.uomType === 'timeline'
                              ? new Date(String(goal.target)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                              : String(goal.target)}
                          </span>
                          <span className="mx-1.5">·</span>
                          {goal.uomType === 'numeric_min' ? 'Higher is better' :
                           goal.uomType === 'numeric_max' ? 'Lower is better' :
                           goal.uomType === 'timeline' ? 'Complete by date' : 'Target = zero'}
                        </p>
                      </div>
                      {score !== null && (
                        <div className="shrink-0 text-right">
                          <span className="text-2xl font-extrabold" style={{ color: scoreColor(score) }}>{score}%</span>
                          <p className="text-[10px] text-slate-400">score</p>
                        </div>
                      )}
                    </div>

                    {/* Inputs row */}
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      {/* Actual value input */}
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-slate-500 shrink-0">Actual</label>
                        <input
                          type={goal.uomType === 'timeline' ? 'date' : 'number'}
                          value={row?.actualValue ?? ''}
                          onChange={(e) => updateRow(goal._id, 'actualValue',
                            goal.uomType === 'timeline' ? e.target.value : (e.target.value === '' ? '' : parseFloat(e.target.value))
                          )}
                          className="w-32 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2"
                          style={{ ['--tw-ring-color' as string]: '#6366f1' } as React.CSSProperties}
                          placeholder="Enter value"
                        />
                      </div>

                      {/* Status — styled select */}
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-slate-500 shrink-0">Status</label>
                        <div className="relative">
                          <select
                            value={row?.progressStatus ?? 'on_track'}
                            onChange={(e) => updateRow(goal._id, 'progressStatus', e.target.value)}
                            className="appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 cursor-pointer"
                            style={{ ['--tw-ring-color' as string]: '#6366f1' } as React.CSSProperties}
                          >
                            {STATUS_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                            <svg className="h-3 w-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  {score !== null && (
                    <div className="h-1.5 bg-slate-100">
                      <div className={cn('h-full transition-all duration-500', scoreBg(score))}
                        style={{ width: `${Math.min(score, 100)}%` }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Save button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="px-8"
              style={{ backgroundColor: '#6366f1' }}>
              {saving ? 'Saving…' : `Save ${quarter} actuals`}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
