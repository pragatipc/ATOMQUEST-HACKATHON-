'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { formatDate } from '@/lib/utils';
import { ChevronRight, Lock, CheckCircle2, Send, Clock, FileEdit, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Goal {
  _id: string;
  title: string;
  description: string;
  thrustArea: string;
  uomType: string;
  target: number | string;
  weightage: number;
  status: string;
  managerComment?: string;
  isShared?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Achievement {
  quarter: string;
  computedScore: number;
  actualValue: number | string;
  progressStatus: string;
}

const UOM_LABELS: Record<string, string> = {
  numeric_min: 'Higher is better',
  numeric_max: 'Lower is better',
  timeline: 'Complete by date',
  zero: 'Target is zero',
};

const STATUS_TIMELINE = [
  { key: 'created',   icon: FileEdit,    label: 'Created'   },
  { key: 'submitted', icon: Send,        label: 'Submitted' },
  { key: 'approved',  icon: CheckCircle2,label: 'Approved'  },
  { key: 'locked',    icon: Lock,        label: 'Locked'    },
];

const PROGRESS_LABELS: Record<string, string> = {
  not_started: 'Not started',
  on_track: 'On track',
  completed: 'Completed',
};

function getTimelineStep(status: string) {
  if (status === 'locked') return 4;
  if (status === 'approved') return 3;
  if (status === 'submitted') return 2;
  if (status === 'rework') return 1.5;
  return 1;
}

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

export default function GoalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', target: '', weightage: 0 });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const year = new Date().getFullYear();

  useEffect(() => {
    async function load() {
      const [gRes, aRes] = await Promise.all([
        fetch(`/api/goals/${id}`),
        fetch(`/api/achievements?year=${year}`),
      ]);
      const gData = await gRes.json();
      const aData = await aRes.json();
      setGoal(gData);
      setForm({ title: gData.title, description: gData.description, target: String(gData.target), weightage: gData.weightage });
      if (Array.isArray(aData)) {
        setAchievements(aData.filter((a: { goalId: { _id: string } | string }) => {
          const gid = typeof a.goalId === 'object' ? a.goalId._id : a.goalId;
          return gid === id;
        }));
      }
      setLoading(false);
    }
    load();
  }, [id, year]);

  const canEdit = goal && (goal.status === 'draft' || goal.status === 'rework');
  const isShared = goal?.isShared;
  const timelineStep = goal ? getTimelineStep(goal.status) : 0;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const payload: Record<string, unknown> = { weightage: form.weightage };
      if (!isShared) { payload.title = form.title; payload.description = form.description; payload.target = goal?.uomType === 'timeline' ? form.target : parseFloat(form.target); }
      const res = await fetch(`/api/goals/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Update failed'); return; }
      setGoal(data); setEditing(false);
    } catch { setError('Failed to save'); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!confirm('Delete this goal?')) return;
    const res = await fetch(`/api/goals/${id}`, { method: 'DELETE' });
    if (res.ok) router.push('/goals');
    else { const d = await res.json(); setError(d.error || 'Cannot delete'); }
  }

  if (loading) return (
    <div className="mx-auto max-w-2xl space-y-4 animate-pulse">
      <div className="h-6 w-48 rounded bg-slate-100" />
      <div className="h-48 rounded-xl bg-white" />
      <div className="h-32 rounded-xl bg-white" />
    </div>
  );
  if (!goal) return <div className="py-12 text-center text-slate-500">Goal not found</div>;

  // Sort achievements by quarter order
  const sortedAchievements = [...achievements].sort(
    (a, b) => QUARTERS.indexOf(a.quarter) - QUARTERS.indexOf(b.quarter)
  );

  return (
    <div className="mx-auto max-w-2xl space-y-5">

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-slate-500">
        <button onClick={() => router.push('/goals')} className="hover:text-indigo-600 font-medium transition-colors">My Goals</button>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-slate-900 font-semibold truncate max-w-[200px]">{goal.title}</span>
        <div className="ml-2"><Badge status={goal.status} /></div>
      </div>

      {/* Rework feedback */}
      {goal.managerComment && goal.status === 'rework' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <p className="text-sm font-bold text-amber-900">Manager feedback</p>
          </div>
          <p className="text-sm text-amber-800">{goal.managerComment}</p>
        </div>
      )}

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* Status timeline */}
      <div className="rounded-xl bg-white border border-slate-100 shadow-sm p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Goal timeline</p>
        <div className="flex items-center">
          {STATUS_TIMELINE.map((st, idx) => {
            const done = timelineStep > idx + 1 || (goal.status === st.key);
            const active = goal.status === st.key || (goal.status === 'rework' && st.key === 'submitted');
            const Icon = st.icon;
            return (
              <div key={st.key} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1">
                  <div className={cn('flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all',
                    done || active ? 'text-white' : 'border-slate-200 bg-white text-slate-300')}
                    style={done || active ? { borderColor: '#6366f1', backgroundColor: '#6366f1' } : {}}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <span className={cn('text-[10px] font-semibold whitespace-nowrap',
                    done || active ? 'text-[#6366f1]' : 'text-slate-400')}>{st.label}</span>
                  {active && goal.updatedAt && (
                    <span className="text-[9px] text-slate-400">{formatDate(goal.updatedAt)}</span>
                  )}
                </div>
                {idx < STATUS_TIMELINE.length - 1 && (
                  <div className="flex-1 h-0.5 mx-1 mb-4"
                    style={{ backgroundColor: timelineStep > idx + 1 ? '#6366f1' : '#e2e8f0' }} />
                )}
              </div>
            );
          })}
        </div>
        {goal.status === 'rework' && (
          <p className="mt-3 text-xs text-amber-600 font-medium flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> Rework requested — edit and resubmit
          </p>
        )}
      </div>

      {/* Goal details */}
      <div className="rounded-xl bg-white border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
          <h2 className="text-sm font-bold text-slate-900">Goal details</h2>
          {canEdit && !editing && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                {isShared ? 'Edit weightage' : 'Edit'}
              </Button>
              {!isShared && <Button size="sm" variant="destructive" onClick={handleDelete}>Delete</Button>}
            </div>
          )}
        </div>
        <div className="p-6">
          {editing ? (
            <form onSubmit={handleSave} className="space-y-4">
              {!isShared && (
                <>
                  <div className="space-y-2"><Label>Title</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required /></div>
                  <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} /></div>
                  <div className="space-y-2">
                    <Label>Target</Label>
                    <Input type={goal.uomType === 'timeline' ? 'date' : 'number'} value={form.target} onChange={e => setForm({...form, target: e.target.value})} required />
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label>Weightage (10–100)</Label>
                <div className="flex items-center gap-3">
                  <Input type="number" min={10} max={100} step={5} value={form.weightage} onChange={e => setForm({...form, weightage: parseInt(e.target.value) || 0})} />
                  <span className="font-bold text-slate-900">{form.weightage}%</span>
                </div>
              </div>
              <div className="flex gap-2"><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button><Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button></div>
            </form>
          ) : (
            <dl className="space-y-3 text-sm">
              {[
                { dt: 'Thrust area',      dd: goal.thrustArea },
                { dt: 'Unit of measure',  dd: UOM_LABELS[goal.uomType] || goal.uomType },
                { dt: 'Target',           dd: goal.uomType === 'timeline' ? new Date(String(goal.target)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : String(goal.target) },
                { dt: 'Weightage',        dd: `${goal.weightage}%` },
              ].map(r => (
                <div key={r.dt} className="flex justify-between border-b border-slate-50 pb-2">
                  <dt className="text-slate-500">{r.dt}</dt>
                  <dd className={cn('font-semibold', r.dt === 'Weightage' ? 'text-[#6366f1]' : 'text-slate-900')}>{r.dd}</dd>
                </div>
              ))}
              <div>
                <dt className="text-slate-500 mb-1">Description</dt>
                <dd className="text-slate-800 leading-relaxed">{goal.description}</dd>
              </div>
            </dl>
          )}
        </div>
      </div>

      {/* Achievement history table */}
      <div className="rounded-xl bg-white border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-50">
          <h2 className="text-sm font-bold text-slate-900">Achievement history</h2>
        </div>
        {sortedAchievements.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <Clock className="mx-auto h-8 w-8 text-slate-300 mb-2" />
            <p className="text-sm text-slate-400">No achievements logged yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Quarter</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">Target</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">Actual</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">Score</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sortedAchievements.map(ach => {
                  const score = Math.round(ach.computedScore);
                  const scoreClr = score >= 80 ? '#15803d' : score >= 50 ? '#d97706' : '#dc2626';
                  return (
                    <tr key={ach.quarter} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-900">{ach.quarter}</td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {goal.uomType === 'timeline'
                          ? new Date(String(goal.target)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                          : String(goal.target)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-800">
                        {goal.uomType === 'timeline'
                          ? new Date(String(ach.actualValue)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                          : String(ach.actualValue)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-extrabold text-base" style={{ color: scoreClr }}>{score}%</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                          ach.progressStatus === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                          ach.progressStatus === 'on_track'  ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-500')}>
                          {PROGRESS_LABELS[ach.progressStatus] || ach.progressStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log achievement CTA — only when locked */}
      {goal.status === 'locked' && (
        <div className="flex justify-end">
          <Button
            onClick={() => router.push('/checkins')}
            className="gap-2 text-white"
            style={{ backgroundColor: '#6366f1' }}
          >
            Log achievement →
          </Button>
        </div>
      )}

    </div>
  );
}
