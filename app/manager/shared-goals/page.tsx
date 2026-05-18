'use client';

import { useEffect, useState } from 'react';
import { THRUST_AREAS } from '@/lib/routes';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TeamMember {
  _id: string;
  name: string;
}

export default function SharedGoalsPage() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [form, setForm] = useState({
    thrustArea: '',
    title: '',
    description: '',
    uomType: 'numeric_min',
    target: '',
    weightage: 20,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetch('/api/manager/team').then((r) => r.json()).then((d) => setTeam(Array.isArray(d) ? d : []));
  }, []);

  function toggleMember(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/manager/shared-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, linkedEmployeeIds: selected, primaryOwnerId: selected[0] }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create shared goals');
        return;
      }
      setSuccess(`Created shared goal for ${selected.length} team member(s)`);
      setSelected([]);
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Shared goals</h1>
      <p className="text-sm text-slate-500">Assign the same KPI to multiple direct reports</p>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{success}</div>}

      <Card>
        <CardHeader><CardTitle>Team members</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {team.map((m) => (
            <button
              key={m._id}
              type="button"
              onClick={() => toggleMember(m._id)}
              className={`rounded-full border px-3 py-1 text-sm ${
                selected.includes(m._id)
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {m.name}
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Goal template</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Thrust area</Label>
              <select
                value={form.thrustArea}
                onChange={(e) => setForm({ ...form, thrustArea: e.target.value })}
                className="flex h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                required
              >
                <option value="">Select</option>
                {THRUST_AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required rows={2} />
            </div>
            <div className="space-y-2">
              <Label>UoM</Label>
              <select
                value={form.uomType}
                onChange={(e) => setForm({ ...form, uomType: e.target.value })}
                className="flex h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
              >
                <option value="numeric_min">Higher is better</option>
                <option value="numeric_max">Lower is better</option>
                <option value="timeline">Timeline</option>
                <option value="zero">Zero target</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target</Label>
                <Input
                  type={form.uomType === 'timeline' ? 'date' : 'number'}
                  value={form.target}
                  onChange={(e) => setForm({ ...form, target: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Weightage</Label>
                <Input
                  type="number"
                  min={10}
                  max={100}
                  value={form.weightage}
                  onChange={(e) => setForm({ ...form, weightage: parseInt(e.target.value) || 0 })}
                  required
                />
              </div>
            </div>
            <Button type="submit" disabled={loading || selected.length === 0}>
              {loading ? 'Creating...' : 'Assign to selected'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
