'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { cn, formatDate } from '@/lib/utils';
import { CheckCircle2, Clock, Play, AlertTriangle } from 'lucide-react';

// ── Static rule metadata ──────────────────────────────────────────────────────
const RULE_META: Record<string, { name: string; notifies: string }> = {
  goal_not_submitted: { name: 'Goal Not Submitted',      notifies: 'Employee'              },
  goal_not_approved:  { name: 'Goal Not Approved',       notifies: 'Manager'               },
  checkin_not_done:   { name: 'Check-in Not Completed',  notifies: 'Employee then Manager' },
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface Rule {
  _id: string;
  triggerEvent: string;
  description: string;
  daysThreshold: number;
  isActive: boolean;
}

interface LocalRule {
  daysThreshold: number;
  isActive: boolean;
}

interface EscalationHop {
  level: number;
  role: string;
  emailedAt: string;
  emailTo: string;
}

interface LogEntry {
  _id: string;
  employeeId?: { name: string; email: string; department?: string };
  ruleId?: { triggerEvent: string; description: string };
  triggerEvent: string;
  triggeredAt: string;
  daysOverdue: number;
  emailSent: boolean;
  status: 'pending' | 'resolved';
  currentLevel?: number;
  nextEscalationAt?: string | null;
  escalationHistory?: EscalationHop[];
}

const ROLE_LABEL: Record<string, string> = {
  employee: 'Employee',
  manager: 'Manager',
  admin: 'HR Admin',
};

type FilterKey = 'all' | 'pending' | 'resolved';

// ── Page ──────────────────────────────────────────────────────────────────────
export default function EscalationsPage() {
  const toast = useToast();

  const [rules, setRules]           = useState<Rule[]>([]);
  const [local, setLocal]           = useState<Record<string, LocalRule>>({});
  const [logs, setLogs]             = useState<LogEntry[]>([]);
  const [filter, setFilter]         = useState<FilterKey>('all');
  const [running, setRunning]       = useState(false);
  const [saving, setSaving]         = useState<Record<string, boolean>>({});
  const [loadingRules, setLoadingRules] = useState(true);
  const [loadingLogs, setLoadingLogs]   = useState(true);

  // ── Data loaders ─────────────────────────────────────────────────────────
  async function loadRules() {
    setLoadingRules(true);
    try {
      const res  = await fetch('/api/escalations/rules');
      const data = await res.json();
      const arr: Rule[] = Array.isArray(data) ? data : [];
      setRules(arr);
      const map: Record<string, LocalRule> = {};
      arr.forEach(r => { map[r._id] = { daysThreshold: r.daysThreshold, isActive: r.isActive }; });
      setLocal(map);
    } finally {
      setLoadingRules(false);
    }
  }

  async function loadLogs() {
    setLoadingLogs(true);
    try {
      const res  = await fetch('/api/escalations/logs');
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } finally {
      setLoadingLogs(false);
    }
  }

  useEffect(() => { loadRules(); loadLogs(); }, []);

  // ── Save a single rule ────────────────────────────────────────────────────
  async function saveRule(ruleId: string) {
    setSaving(prev => ({ ...prev, [ruleId]: true }));
    try {
      const payload = local[ruleId];
      const res = await fetch(`/api/escalations/rules/${ruleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success('Rule saved successfully');
        await loadRules();
      } else {
        toast.error('Failed to save rule');
      }
    } catch {
      toast.error('Failed to save rule');
    } finally {
      setSaving(prev => ({ ...prev, [ruleId]: false }));
    }
  }

  // ── Run escalation check ──────────────────────────────────────────────────
  async function runCheck() {
    setRunning(true);
    try {
      const res  = await fetch('/api/escalations/run', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        const newOnes = data.escalated ?? 0;
        const advanced = data.advanced ?? 0;
        const total = data.emails ?? newOnes;
        toast.success(
          `Check complete: ${newOnes} new, ${advanced} escalated to next level. ${total} email${total !== 1 ? 's' : ''} sent.`
        );
        await loadLogs();
      } else {
        toast.error(data.error || 'Run failed');
      }
    } catch {
      toast.error('Run failed');
    } finally {
      setRunning(false);
    }
  }

  // ── Mark log as resolved ──────────────────────────────────────────────────
  async function markResolved(logId: string) {
    const res = await fetch(`/api/escalations/logs/${logId}/resolve`, { method: 'PUT' });
    if (res.ok) {
      toast.success('Marked as resolved');
      await loadLogs();
    } else {
      toast.error('Failed to resolve');
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const pendingCount  = logs.filter(l => l.status === 'pending').length;
  const resolvedCount = logs.filter(l => l.status === 'resolved').length;
  const filteredLogs  = logs.filter(l => filter === 'all' || l.status === filter);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Escalation Management</h1>
        <p className="text-sm text-slate-500 mt-0.5">Configure rules and track automated escalation alerts</p>
      </div>

      {/* ── Section 1: Active Rules ── */}
      <div>
        <h2 className="text-base font-bold text-slate-900 mb-4">Active Rules</h2>

        {loadingRules ? (
          <div className="grid gap-4 sm:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-52 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            {rules.map(rule => {
              const meta    = RULE_META[rule.triggerEvent];
              const lc      = local[rule._id] ?? { daysThreshold: rule.daysThreshold, isActive: rule.isActive };
              const isSaving = saving[rule._id];

              return (
                <div
                  key={rule._id}
                  className="bg-white flex flex-col gap-3"
                  style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px' }}
                >
                  {/* Name + status badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 leading-snug">
                        {meta?.name || rule.triggerEvent}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {rule.description}
                      </p>
                    </div>
                    <span className={cn(
                      'shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                      lc.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    )}>
                      {lc.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Notifies */}
                  <p className="text-xs text-slate-400">
                    Notifies: <span className="font-semibold text-slate-600">{meta?.notifies}</span>
                  </p>

                  {/* Days threshold input */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-slate-500 shrink-0">
                      Days threshold
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={90}
                      value={lc.daysThreshold}
                      onChange={e =>
                        setLocal(prev => ({
                          ...prev,
                          [rule._id]: { ...prev[rule._id], daysThreshold: parseInt(e.target.value) || 1 },
                        }))
                      }
                      className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2"
                      style={{ '--tw-ring-color': '#6366f1' } as React.CSSProperties}
                    />
                    <span className="text-xs text-slate-400">days</span>
                  </div>

                  {/* Toggle + Save button */}
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100">
                    {/* Toggle */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setLocal(prev => ({
                            ...prev,
                            [rule._id]: { ...prev[rule._id], isActive: !prev[rule._id].isActive },
                          }))
                        }
                        className={cn(
                          'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none',
                          lc.isActive ? 'bg-[#6366f1]' : 'bg-slate-200'
                        )}
                      >
                        <span className={cn(
                          'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform',
                          lc.isActive ? 'translate-x-4' : 'translate-x-1'
                        )} />
                      </button>
                      <span className="text-xs text-slate-500">{lc.isActive ? 'On' : 'Off'}</span>
                    </div>

                    {/* Save */}
                    <button
                      type="button"
                      onClick={() => saveRule(rule._id)}
                      disabled={isSaving}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-60"
                      style={{ backgroundColor: '#6366f1' }}
                    >
                      {isSaving ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Section 2: Run Check ── */}
      <div>
        <button
          type="button"
          onClick={runCheck}
          disabled={running}
          className="w-full flex items-center justify-center gap-3 text-white font-bold text-base transition-opacity disabled:opacity-60"
          style={{ backgroundColor: '#6366f1', borderRadius: '10px', padding: '14px', cursor: running ? 'not-allowed' : 'pointer' }}
        >
          {running ? (
            <>
              <svg className="animate-spin h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Running check…
            </>
          ) : (
            <>
              <Play className="h-5 w-5 shrink-0" />
              Run Escalation Check Now
            </>
          )}
        </button>
      </div>

      {/* ── Section 3: Escalation Log ── */}
      <div>
        <div className="mb-4">
          <h2 className="text-base font-bold text-slate-900">Escalation Log</h2>
          <p className="text-xs text-slate-500 mt-0.5">All triggered escalations</p>
        </div>

        {/* Filter buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          {([
            { key: 'all',      label: `All (${logs.length})`          },
            { key: 'pending',  label: `Pending (${pendingCount})`     },
            { key: 'resolved', label: `Resolved (${resolvedCount})`   },
          ] as { key: FilterKey; label: string }[]).map(f => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-semibold transition-all',
                filter === f.key
                  ? 'text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              )}
              style={filter === f.key ? { backgroundColor: '#6366f1' } : {}}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Log table */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          {loadingLogs ? (
            <div className="py-12 text-center">
              <Clock className="mx-auto h-8 w-8 text-slate-300 mb-2 animate-pulse" />
              <p className="text-sm text-slate-400">Loading logs…</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-16 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-slate-300 mb-3" />
              <p className="text-sm font-semibold text-slate-600">
                {filter === 'all' ? 'No escalations triggered yet' : `No ${filter} escalations`}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Run a check to evaluate rules against current data
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">Employee</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">Department</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">Rule Triggered</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">Escalation level</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">Date</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500">Days Overdue</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500">Email Sent</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500">Status</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredLogs.map(log => {
                    const triggerKey = log.ruleId?.triggerEvent || log.triggerEvent;
                    const ruleName   = RULE_META[triggerKey]?.name || triggerKey || '—';
                    const daysOver   = log.daysOverdue ?? 0;

                    return (
                      <tr key={log._id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Employee */}
                        <td className="px-5 py-3">
                          <p className="font-semibold text-slate-900">{log.employeeId?.name || '—'}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{log.employeeId?.email || ''}</p>
                        </td>

                        {/* Department */}
                        <td className="px-5 py-3 text-sm text-slate-500">
                          {log.employeeId?.department || '—'}
                        </td>

                        {/* Rule triggered */}
                        <td className="px-5 py-3 text-sm text-slate-700">{ruleName}</td>

                        {/* Escalation level */}
                        <td className="px-5 py-3">
                          {(() => {
                            const lvl = log.currentLevel || 1;
                            const last = log.escalationHistory?.[log.escalationHistory.length - 1];
                            const currentRole = last?.role || 'employee';
                            return (
                              <div className="flex flex-col gap-0.5">
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                                  <span className="rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white"
                                    style={{ backgroundColor: lvl === 1 ? '#6366f1' : lvl === 2 ? '#ea580c' : '#dc2626' }}>
                                    L{lvl}
                                  </span>
                                  {ROLE_LABEL[currentRole] || currentRole}
                                </span>
                                {log.nextEscalationAt && log.status === 'pending' && (
                                  <span className="text-[10px] text-slate-400">
                                    Next: {formatDate(log.nextEscalationAt)}
                                  </span>
                                )}
                                {!log.nextEscalationAt && log.status === 'pending' && (
                                  <span className="text-[10px] font-semibold text-red-500">Chain exhausted</span>
                                )}
                              </div>
                            );
                          })()}
                        </td>

                        {/* Date */}
                        <td className="px-5 py-3 text-sm text-slate-500">
                          {formatDate(log.triggeredAt)}
                        </td>

                        {/* Days overdue */}
                        <td className="px-5 py-3 text-center">
                          <span className={cn('font-bold text-sm', daysOver > 7 ? 'text-orange-500' : 'text-slate-700')}>
                            {daysOver}
                          </span>
                        </td>

                        {/* Email sent */}
                        <td className="px-5 py-3 text-center">
                          <span className={cn(
                            'rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                            log.emailSent
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-red-100 text-red-600'
                          )}>
                            {log.emailSent ? 'Yes' : 'No'}
                          </span>
                        </td>

                        {/* Status badge */}
                        <td className="px-5 py-3 text-center">
                          <span className={cn(
                            'rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                            log.status === 'resolved'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          )}>
                            {log.status === 'resolved' ? 'Resolved' : 'Pending'}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="px-5 py-3 text-center">
                          {log.status === 'pending' && (
                            <button
                              type="button"
                              onClick={() => markResolved(log._id)}
                              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                              Mark Resolved
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
