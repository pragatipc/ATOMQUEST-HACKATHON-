'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';

interface AuditLog {
  _id: string;
  changeType: string;
  timestamp: string;
  goalId?: { title: string };
  changedBy?: { name: string; email: string };
  previousValue?: unknown;
  newValue?: unknown;
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/audit')
      .then((r) => r.json())
      .then((data) => {
        setLogs(data.logs || []);
        setTotal(data.total || 0);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Audit log</h1>
        <p className="text-sm text-slate-500">{total} total entries</p>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">When</th>
                <th className="px-4 py-3 text-left font-semibold">Type</th>
                <th className="px-4 py-3 text-left font-semibold">Goal</th>
                <th className="px-4 py-3 text-left font-semibold">Changed by</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map((log) => (
                <tr key={log._id}>
                  <td className="px-4 py-3 text-slate-600">{formatDate(log.timestamp)}</td>
                  <td className="px-4 py-3 font-medium capitalize">{log.changeType.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3">{log.goalId?.title || '—'}</td>
                  <td className="px-4 py-3">{log.changedBy?.name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

