'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface TeamMember {
  _id: string;
  name: string;
  email: string;
  department?: string;
  goalCount: number;
  lockedGoals: number;
  pendingApproval: boolean;
}

export default function ManagerTeamPage() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/manager/team')
      .then((r) => r.json())
      .then((data) => setTeam(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-slate-500">Loading team...</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">My team</h1>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Name</th>
                <th className="px-4 py-3 text-left font-semibold">Email</th>
                <th className="px-4 py-3 text-left font-semibold">Department</th>
                <th className="px-4 py-3 text-left font-semibold">Goals</th>
                <th className="px-4 py-3 text-left font-semibold">Locked</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {team.map((m) => (
                <tr key={m._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{m.name}</td>
                  <td className="px-4 py-3 text-slate-600">{m.email}</td>
                  <td className="px-4 py-3 text-slate-600">{m.department || '—'}</td>
                  <td className="px-4 py-3">{m.goalCount}</td>
                  <td className="px-4 py-3">{m.lockedGoals}</td>
                  <td className="px-4 py-3">
                    {m.pendingApproval ? (
                      <Badge status="submitted" />
                    ) : (
                      <Badge status="approved" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {team.length === 0 && (
          <CardContent className="py-12 text-center text-slate-600">No direct reports assigned.</CardContent>
        )}
      </Card>
    </div>
  );
}
