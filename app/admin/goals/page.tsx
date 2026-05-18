'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Goal {
  _id: string;
  title: string;
  status: string;
  weightage: number;
  thrustArea: string;
  uomType: string;
  target: number | string;
  employeeId?: { _id: string; name: string; department?: string };
}

export default function AdminGoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    load();
  }, [statusFilter]);

  async function load() {
    setLoading(true);
    const url = statusFilter ? `/api/goals?status=${statusFilter}` : '/api/goals';
    const data = await fetch(url).then((r) => r.json());
    setGoals(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function handleUnlock(goalId: string, goalTitle: string) {
    const reason = prompt(`Unlock "${goalTitle}" for revision?\n\nEnter reason for unlocking:`);
    if (reason === null) return;

    setUnlocking(goalId);
    try {
      const res = await fetch('/api/admin/goals/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalId, reason: reason || 'Admin unlock for revision' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setToast(data.error || 'Failed to unlock goal');
      } else {
        setToast(`Goal unlocked — employee can now revise`);
        await load();
      }
      setTimeout(() => setToast(''), 3000);
    } finally {
      setUnlocking(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">All goals</h1>
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
          <option value="approved">Approved</option>
        </select>
      </div>

      {toast && (
        <div className={cn(
          'rounded-lg border px-4 py-3 text-sm',
          toast.includes('failed') || toast.includes('Failed')
            ? 'border-red-200 bg-red-50 text-red-700'
            : 'border-emerald-200 bg-emerald-50 text-emerald-800'
        )}>
          {toast}
        </div>
      )}

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Employee</th>
                  <th className="px-4 py-3 text-left font-semibold">Goal title</th>
                  <th className="px-4 py-3 text-left font-semibold">Thrust area</th>
                  <th className="px-4 py-3 text-left font-semibold">UoM</th>
                  <th className="px-4 py-3 text-right font-semibold">Target</th>
                  <th className="px-4 py-3 text-right font-semibold">Weight</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {goals.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-500">No goals found.</td>
                  </tr>
                ) : (
                  goals.map((g) => (
                    <tr key={g._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <span className="font-medium">{g.employeeId?.name || '—'}</span>
                        {g.employeeId?.department && (
                          <span className="block text-xs text-slate-500">{g.employeeId.department}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <span className="line-clamp-2">{g.title}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{g.thrustArea}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{g.uomType.replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{String(g.target)}</td>
                      <td className="px-4 py-3 text-right font-semibold">{g.weightage}%</td>
                      <td className="px-4 py-3"><Badge status={g.status} /></td>
                      <td className="px-4 py-3">
                        {g.status === 'locked' && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={unlocking === g._id}
                            onClick={() => handleUnlock(g._id, g.title)}
                            className="text-xs"
                          >
                            {unlocking === g._id ? 'Unlocking...' : 'Unlock'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
