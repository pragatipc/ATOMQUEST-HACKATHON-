'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { Plus, Send, Target, AlertCircle, AlertTriangle, CheckCircle2, Lock } from 'lucide-react';

const MAX_GOALS = 8;

const THRUST_COLORS: Record<string, string> = {
  Strategy: 'bg-indigo-500', Operations: 'bg-cyan-500', Finance: 'bg-emerald-500',
  People: 'bg-violet-500', Customer: 'bg-amber-500', Innovation: 'bg-rose-500',
  Revenue: 'bg-blue-500', Process: 'bg-orange-500', Quality: 'bg-teal-500', Safety: 'bg-red-400',
};

const UOM_SHORT: Record<string, string> = {
  numeric_min: '↑ Higher', numeric_max: '↓ Lower', timeline: '📅 Date', zero: '0 Zero',
};

interface Goal {
  _id: string;
  title: string;
  status: string;
  weightage: number;
  target: number | string;
  uomType: string;
  thrustArea: string;
}

export default function GoalsPage() {
  const { data: session } = useSession();
  const toast = useToast();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const totalWeightage = goals.reduce((sum, g) => sum + g.weightage, 0);
  const draftOrRework = goals.filter((g) => g.status === 'draft' || g.status === 'rework');
  const canSubmit = totalWeightage === 100 && draftOrRework.length > 0;
  const goalCount = goals.length;
  const canAddMore = goalCount < MAX_GOALS;

  useEffect(() => {
    async function load() {
      if (!session?.user?.id) return;
      try {
        const res = await fetch('/api/goals');
        const data = await res.json();
        setGoals(Array.isArray(data) ? data : []);
      } catch {
        toast.error('Failed to load goals');
      } finally {
        setLoading(false);
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  async function handleSubmitAll() {
    setSubmitting(true);
    try {
      const res = await fetch('/api/goals/submit', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Submit failed');
        return;
      }
      toast.success('Goals submitted for manager approval');
      const refreshed = await fetch('/api/goals');
      setGoals(await refreshed.json());
    } catch {
      toast.error('Failed to submit goals');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="py-12 text-center text-slate-500">Loading goals...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Goals</h1>
          <p className="text-sm text-slate-500">Manage and submit your annual objectives</p>
        </div>
        <div className="flex gap-2">
          {canAddMore ? (
            <Link href="/goals/new">
              <Button>
                <Plus className="mr-1.5 h-4 w-4" />
                Create goal
              </Button>
            </Link>
          ) : (
            <Button disabled title="Maximum 8 goals allowed">
              <Plus className="mr-1.5 h-4 w-4" />
              Create goal
            </Button>
          )}
          <Button
            variant="secondary"
            disabled={!canSubmit || submitting}
            onClick={handleSubmitAll}
          >
            <Send className="mr-1.5 h-4 w-4" />
            {submitting ? 'Submitting...' : 'Submit all'}
          </Button>
        </div>
      </div>

      {/* Max goals warning banner */}
      {goalCount >= MAX_GOALS && (
        <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '8px', padding: '12px 16px', color: '#92400e' }}
          className="flex items-center gap-3">
          <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: '#92400e' }} />
          <p className="text-sm font-medium">You have reached the maximum limit of 8 goals. No more goals can be added.</p>
        </div>
      )}

      {/* Goal counter + rules info */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span>Goals used</span>
              <span className={cn(
                'text-2xl font-bold',
                goalCount >= MAX_GOALS ? 'text-red-600' : goalCount >= 6 ? 'text-amber-600' : 'text-slate-900'
              )}>
                {goalCount} / {MAX_GOALS}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  goalCount >= MAX_GOALS ? 'bg-red-500' : goalCount >= 6 ? 'bg-amber-500' : 'bg-indigo-500'
                )}
                style={{ width: `${(goalCount / MAX_GOALS) * 100}%` }}
              />
            </div>
            {goalCount >= MAX_GOALS && (
              <p className="mt-2 flex items-center gap-1 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" /> Maximum 8 goals reached
              </p>
            )}
            {canAddMore && (
              <p className="mt-2 text-sm text-slate-500">{MAX_GOALS - goalCount} more goal{MAX_GOALS - goalCount !== 1 ? 's' : ''} allowed</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span>Total weightage</span>
              <span className={cn(
                'text-2xl font-bold',
                totalWeightage === 100 ? 'text-emerald-600' : totalWeightage > 100 ? 'text-red-600' : 'text-amber-600'
              )}>
                {totalWeightage}%
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  totalWeightage === 100 ? 'bg-emerald-500' : totalWeightage > 100 ? 'bg-red-500' : 'bg-amber-500'
                )}
                style={{ width: `${Math.min(totalWeightage, 100)}%` }}
              />
            </div>
            {totalWeightage < 100 && (
              <p className="mt-2 text-sm text-slate-500">{100 - totalWeightage}% remaining to reach 100%</p>
            )}
            {totalWeightage === 100 && (
              <p className="mt-2 flex items-center gap-1 text-sm text-emerald-600">
                <CheckCircle2 className="h-4 w-4" /> Ready to submit
              </p>
            )}
            {totalWeightage > 100 && (
              <p className="mt-2 flex items-center gap-1 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" /> Over by {totalWeightage - 100}% — reduce some goals
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Submission rules reminder */}
      {draftOrRework.length > 0 && totalWeightage !== 100 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Not ready to submit yet</p>
            <p>Total weightage must equal exactly 100%. Each goal must be at least 10%.</p>
          </div>
        </div>
      )}

      {goals.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500 mb-4">
              <Target className="h-8 w-8" />
            </div>
            <p className="text-lg font-semibold text-slate-800">No goals yet</p>
            <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
              Create your first goal. Remember: total weightage must equal 100% and each goal needs at least 10%.
            </p>
            <Link href="/goals/new" className="mt-6 inline-block">
              <Button>
                <Plus className="mr-1.5 h-4 w-4" />
                Create your first goal
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Title</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Thrust</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">UoM</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Target</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Weight</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {goals.map((goal) => {
                  const thrustColor = THRUST_COLORS[goal.thrustArea] || 'bg-slate-400';
                  return (
                    <tr key={goal._id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 pl-0 pr-4">
                        <div className="flex items-center gap-2">
                          <div className={cn('w-1 h-9 rounded-full shrink-0', thrustColor)} />
                          <span className="font-medium text-slate-900">{goal.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">{goal.thrustArea}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          {UOM_SHORT[goal.uomType] || goal.uomType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {goal.uomType === 'timeline'
                          ? new Date(String(goal.target)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                          : String(goal.target)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('font-semibold', goal.weightage < 10 ? 'text-red-600' : 'text-slate-900')}>
                          {goal.weightage}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border',
                          goal.status === 'locked'    ? 'bg-violet-50 text-violet-700 border-violet-200' :
                          goal.status === 'approved'  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          goal.status === 'submitted' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          goal.status === 'rework'    ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-slate-100 text-slate-500 border-slate-200')}>
                          {goal.status === 'locked' && <Lock className="h-2.5 w-2.5" />}
                          {goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/goals/${goal._id}`} className="font-medium text-indigo-600 hover:text-indigo-800 text-sm">
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {/* Dashed empty slots */}
                {Array.from({ length: MAX_GOALS - goals.length }).map((_, i) => (
                  <tr key={`empty-${i}`}>
                    <td colSpan={7} className="px-4 py-2.5">
                      <Link href="/goals/new"
                        className="flex items-center gap-2 rounded-lg border-2 border-dashed border-slate-200 px-4 py-2 text-xs text-slate-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors">
                        <Plus className="h-3.5 w-3.5" /> Empty slot — click to add a goal
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
