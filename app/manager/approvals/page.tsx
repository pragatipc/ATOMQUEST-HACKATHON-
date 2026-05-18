'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/input';
import { formatDate } from '@/lib/utils';

interface GoalRow {
  _id: string;
  title: string;
  weightage: number;
  target: number | string;
  thrustArea: string;
  uomType: string;
  description: string;
}

interface ApprovalItem {
  employee: { _id: string; name: string; email: string; department?: string };
  goals: GoalRow[];
  totalWeightage: number;
  submittedAt?: string;
}

interface GoalEdit {
  weightage: number;
  target: string | number;
}

export default function ManagerApprovalsPage() {
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, Record<string, GoalEdit>>>({});
  const [editMode, setEditMode] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/manager/approvals');
    const data = await res.json();
    const items = Array.isArray(data) ? data : [];
    setItems(items);
    // init edits from current goal values
    const initEdits: Record<string, Record<string, GoalEdit>> = {};
    items.forEach((item: ApprovalItem) => {
      initEdits[item.employee._id] = {};
      item.goals.forEach((g) => {
        initEdits[item.employee._id][g._id] = { weightage: g.weightage, target: g.target };
      });
    });
    setEdits(initEdits);
    setLoading(false);
  }

  function updateEdit(empId: string, goalId: string, field: keyof GoalEdit, value: string | number) {
    setEdits((prev) => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        [goalId]: { ...prev[empId]?.[goalId], [field]: value },
      },
    }));
  }

  function computeEditedTotal(empId: string, goals: GoalRow[]) {
    return goals.reduce((sum, g) => sum + (Number(edits[empId]?.[g._id]?.weightage) || g.weightage), 0);
  }

  async function handleAction(item: ApprovalItem, action: 'approve' | 'rework') {
    const empId = item.employee._id;
    setProcessing(empId);
    try {
      const goalEdits = item.goals.map((g) => ({
        goalId: g._id,
        weightage: Number(edits[empId]?.[g._id]?.weightage ?? g.weightage),
        target: edits[empId]?.[g._id]?.target ?? g.target,
      }));

      const editedTotal = goalEdits.reduce((s, e) => s + e.weightage, 0);
      if (action === 'approve' && editedTotal !== 100) {
        setToast(`Total weightage must equal 100% before approving (currently ${editedTotal}%)`);
        setTimeout(() => setToast(''), 4000);
        setProcessing(null);
        return;
      }

      for (const goal of item.goals) {
        await fetch('/api/admin/goals/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            goalId: goal._id,
            action,
            comment: comment[empId] || '',
            goalEdits,
          }),
        });
      }
      setToast(action === 'approve' ? `Goals approved for ${item.employee.name}` : `Rework requested for ${item.employee.name}`);
      setTimeout(() => setToast(''), 3000);
      await load();
    } finally {
      setProcessing(null);
    }
  }

  if (loading) return <p className="text-slate-500">Loading...</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Pending approvals</h1>

      {toast && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
          {toast}
        </div>
      )}

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-600">No pending goal submissions.</CardContent>
        </Card>
      ) : (
        items.map((item) => {
          const empId = item.employee._id;
          const isEditing = editMode[empId];
          const editedTotal = computeEditedTotal(empId, item.goals);

          return (
            <Card key={empId}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-lg">{item.employee.name}</span>
                    {item.employee.department && (
                      <span className="ml-2 text-sm font-normal text-slate-500">{item.employee.department}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm font-normal">
                    <span className={`font-semibold ${editedTotal === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      Total: {editedTotal}%
                    </span>
                    {item.submittedAt && (
                      <span className="text-slate-400">Submitted {formatDate(item.submittedAt)}</span>
                    )}
                    <button
                      onClick={() => setEditMode((prev) => ({ ...prev, [empId]: !prev[empId] }))}
                      className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      {isEditing ? 'Cancel edit' : 'Edit inline'}
                    </button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="overflow-x-auto rounded-lg border border-slate-100">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-slate-600">Goal title</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-600">Thrust area</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-600">UoM</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-600">Target</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-600">Weight</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {item.goals.map((g) => (
                        <tr key={g._id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-medium text-slate-900">{g.title}</td>
                          <td className="px-3 py-2 text-slate-600">{g.thrustArea}</td>
                          <td className="px-3 py-2 text-slate-500 text-xs">{g.uomType.replace('_', ' ')}</td>
                          <td className="px-3 py-2">
                            {isEditing ? (
                              <Input
                                type={g.uomType === 'timeline' ? 'date' : 'number'}
                                value={String(edits[empId]?.[g._id]?.target ?? g.target)}
                                onChange={(e) => updateEdit(empId, g._id, 'target', e.target.value)}
                                className="h-7 w-32 text-xs px-2"
                              />
                            ) : (
                              <span>{String(g.target)}</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {isEditing ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  min={10}
                                  max={100}
                                  value={edits[empId]?.[g._id]?.weightage ?? g.weightage}
                                  onChange={(e) => updateEdit(empId, g._id, 'weightage', parseInt(e.target.value) || 0)}
                                  className="h-7 w-20 text-xs px-2"
                                />
                                <span className="text-slate-500">%</span>
                              </div>
                            ) : (
                              <span className="font-semibold">{edits[empId]?.[g._id]?.weightage ?? g.weightage}%</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Feedback / Rework comment
                  </label>
                  <Textarea
                    placeholder="Add feedback or rework instructions (optional for approval, required intent for rework)..."
                    value={comment[empId] || ''}
                    onChange={(e) => setComment({ ...comment, [empId]: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    disabled={processing === empId}
                    onClick={() => handleAction(item, 'approve')}
                  >
                    {processing === empId ? 'Processing...' : 'Approve all'}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={processing === empId}
                    onClick={() => handleAction(item, 'rework')}
                  >
                    Request rework
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
