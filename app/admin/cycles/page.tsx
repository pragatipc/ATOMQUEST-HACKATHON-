'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';

interface Cycle {
  _id: string;
  year: number;
  phase: string;
  windowOpen: string;
  windowClose: string;
  isActive: boolean;
}

export default function AdminCyclesPage() {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    year: new Date().getFullYear(),
    phase: 'goal_setting',
    windowOpen: '',
    windowClose: '',
    isActive: true,
  });

  async function load() {
    const res = await fetch('/api/admin/cycles');
    setCycles(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await fetch('/api/admin/cycles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setShowForm(false);
    load();
  }

  async function toggleActive(id: string, isActive: boolean) {
    await fetch('/api/admin/cycles', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, isActive: !isActive }),
    });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Performance cycles</h1>
        <Button onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : 'New cycle'}</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Create cycle</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Year</Label>
                <Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) })} required />
              </div>
              <div className="space-y-1">
                <Label>Phase</Label>
                <select
                  value={form.phase}
                  onChange={(e) => setForm({ ...form, phase: e.target.value })}
                  className="flex h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                >
                  <option value="goal_setting">Goal setting</option>
                  <option value="Q1">Q1</option>
                  <option value="Q2">Q2</option>
                  <option value="Q3">Q3</option>
                  <option value="Q4">Q4</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>Window open</Label>
                <Input type="date" value={form.windowOpen} onChange={(e) => setForm({ ...form, windowOpen: e.target.value })} required />
              </div>
              <div className="space-y-1">
                <Label>Window close</Label>
                <Input type="date" value={form.windowClose} onChange={(e) => setForm({ ...form, windowClose: e.target.value })} required />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit">Create</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Year</th>
              <th className="px-4 py-3 text-left font-semibold">Phase</th>
              <th className="px-4 py-3 text-left font-semibold">Open</th>
              <th className="px-4 py-3 text-left font-semibold">Close</th>
              <th className="px-4 py-3 text-left font-semibold">Active</th>
              <th className="px-4 py-3 text-left font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {cycles.map((c) => (
              <tr key={c._id}>
                <td className="px-4 py-3">{c.year}</td>
                <td className="px-4 py-3 capitalize">{c.phase.replace('_', ' ')}</td>
                <td className="px-4 py-3">{formatDate(c.windowOpen)}</td>
                <td className="px-4 py-3">{formatDate(c.windowClose)}</td>
                <td className="px-4 py-3">{c.isActive ? 'Yes' : 'No'}</td>
                <td className="px-4 py-3">
                  <Button size="sm" variant="outline" onClick={() => toggleActive(c._id, c.isActive)}>
                    {c.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

