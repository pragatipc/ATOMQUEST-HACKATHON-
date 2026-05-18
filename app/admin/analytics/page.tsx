'use client';

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { Check, Clock, Award } from 'lucide-react';

interface Analytics {
  goalsByStatus: { status: string; count: number }[];
  quarterlyScores: { quarter: string; avgScore: number; count: number }[];
  qoqData: { quarter: string; thisYear: number; lastYear: number }[];
  thrustAreaPerf: { thrustArea: string; avgScore: number; goalCount: number }[];
  deptPerformance: { department: string; avgScore: number; employees: number }[];
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft', submitted: 'Submitted', approved: 'Approved',
  locked: 'Locked', rework: 'Rework', rejected: 'Rejected',
};
const STATUS_COLOR: Record<string, string> = {
  draft: '#94a3b8', submitted: '#60a5fa', approved: '#34d399',
  locked: '#818cf8', rework: '#fbbf24', rejected: '#f87171',
};

const CHART_COLORS = ['#4f46e5', '#7c3aed', '#0891b2', '#059669', '#d97706', '#dc2626'];

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-1">
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg text-xs">
      <p className="font-semibold text-slate-700 mb-1.5">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">
          {p.name}: <span className="text-slate-900">{typeof p.value === 'number' ? (p.name.includes('count') || p.name === 'count' ? p.value : `${p.value}%`) : p.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const year = new Date().getFullYear();

  useEffect(() => {
    fetch('/api/admin/analytics').then(r => r.json()).then(setData);
  }, []);

  if (!data) return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <p className="text-sm text-slate-500">Loading charts…</p>
      </div>
      <div className="grid gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-80 rounded-2xl border border-slate-200 bg-slate-50 animate-pulse" />
        ))}
      </div>
    </div>
  );

  const statusData = data.goalsByStatus.map(g => ({
    name: STATUS_LABEL[g.status] || g.status,
    count: g.count,
    fill: STATUS_COLOR[g.status] || '#818cf8',
  }));

  const hasQoQ = data.qoqData.some(d => d.thisYear > 0 || d.lastYear > 0);
  const hasThrustData = data.thrustAreaPerf.some(t => t.avgScore > 0);
  const hasDeptData = data.deptPerformance.some(d => d.avgScore > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <p className="text-sm text-slate-500">Organization-wide performance insights — {year}</p>
      </div>

      {/* Chart 1 — Goals by Status */}
      <ChartCard
        title="Goal distribution by status"
        subtitle="Count of all employee goals grouped by their current approval / tracking status"
      >
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={statusData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }} barSize={36}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                label={{ value: 'Goal status', position: 'insideBottom', offset: -2, fontSize: 11, fill: '#94a3b8' }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                label={{ value: 'Number of goals', angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: '#94a3b8' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Goals" radius={[6, 6, 0, 0]} fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Chart 2 — QoQ Trend */}
      <ChartCard
        title={`Quarter-on-Quarter score trend — ${year - 1} vs ${year}`}
        subtitle="Average achievement score per quarter comparing this year vs last year. Dashed line = previous year."
      >
        {!hasQoQ ? (
          <div className="flex h-72 items-center justify-center text-sm text-slate-400">
            No achievement data yet. Employees need to log check-in actuals first.
          </div>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.qoqData} margin={{ top: 4, right: 16, bottom: 24, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="quarter"
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  label={{ value: 'Quarter', position: 'insideBottom', offset: -12, fontSize: 11, fill: '#94a3b8' }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 100]}
                  tickFormatter={v => `${v}%`}
                  label={{ value: 'Avg Score (%)', angle: -90, position: 'insideLeft', offset: 12, fontSize: 11, fill: '#94a3b8' }}
                />
                <Tooltip content={<CustomTooltip />} formatter={(v: number) => `${v}%`} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 16 }} />
                <Line
                  type="monotone"
                  dataKey="thisYear"
                  name={`${year} (current)`}
                  stroke="#4f46e5"
                  strokeWidth={2.5}
                  dot={{ fill: '#4f46e5', r: 5 }}
                  activeDot={{ r: 7 }}
                />
                <Line
                  type="monotone"
                  dataKey="lastYear"
                  name={`${year - 1} (previous)`}
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={{ fill: '#94a3b8', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>

      {/* Chart 3 — Thrust Area Performance */}
      <ChartCard
        title="Average achievement score by thrust area"
        subtitle="Which organizational focus areas are performing best this year. Score = average across all linked goals."
      >
        {!hasThrustData ? (
          <div className="flex h-72 items-center justify-center text-sm text-slate-400">
            No achievement data yet for any thrust area.
          </div>
        ) : (
          <div style={{ height: Math.max(280, data.thrustAreaPerf.length * 48) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.thrustAreaPerf}
                layout="vertical"
                margin={{ top: 4, right: 48, bottom: 4, left: 8 }}
                barSize={22}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tickFormatter={v => `${v}%`}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  label={{ value: 'Average score (%)', position: 'insideBottom', offset: -2, fontSize: 11, fill: '#94a3b8' }}
                />
                <YAxis
                  type="category"
                  dataKey="thrustArea"
                  width={160}
                  tick={{ fontSize: 11, fill: '#475569' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  formatter={(v: number, _n: string, p: { payload?: { goalCount?: number } }) => [`${v}% avg (${p?.payload?.goalCount || 0} goals)`, 'Score']}
                />
                <Bar dataKey="avgScore" name="Avg score" radius={[0, 6, 6, 0]} fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>

      {/* Chart 4 — Department Performance */}
      <ChartCard
        title="Department performance comparison"
        subtitle="Average achievement score per department, based on all employees' check-in actuals this year."
      >
        {!hasDeptData ? (
          <div className="flex h-64 items-center justify-center text-sm text-slate-400">
            No department performance data yet.
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.deptPerformance}
                margin={{ top: 4, right: 16, bottom: 24, left: 0 }}
                barSize={40}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="department"
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  label={{ value: 'Department', position: 'insideBottom', offset: -12, fontSize: 11, fill: '#94a3b8' }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 100]}
                  tickFormatter={v => `${v}%`}
                  label={{ value: 'Avg Score (%)', angle: -90, position: 'insideLeft', offset: 12, fontSize: 11, fill: '#94a3b8' }}
                />
                <Tooltip content={<CustomTooltip />} formatter={(v: number, _n: string, p: { payload?: { employees?: number } }) => [`${v}% (${p?.payload?.employees || 0} employees)`, 'Avg Score']} />
                <Bar dataKey="avgScore" name="Avg score" radius={[6, 6, 0, 0]} fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>

      {/* Chart 5 — Quarterly avg this year */}
      <ChartCard
        title={`Quarterly average score — ${year}`}
        subtitle={`Average achievement score per quarter for ${year}. Each bar shows the mean score across all employees who logged actuals.`}
      >
        {data.quarterlyScores.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-sm text-slate-400">
            No check-in data submitted yet for {year}.
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.quarterlyScores}
                margin={{ top: 4, right: 16, bottom: 24, left: 0 }}
                barSize={52}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="quarter"
                  tick={{ fontSize: 13, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  label={{ value: 'Quarter', position: 'insideBottom', offset: -12, fontSize: 11, fill: '#94a3b8' }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 100]}
                  tickFormatter={v => `${v}%`}
                  label={{ value: 'Avg Score (%)', angle: -90, position: 'insideLeft', offset: 12, fontSize: 11, fill: '#94a3b8' }}
                />
                <Tooltip content={<CustomTooltip />} formatter={(v: number, _n: string, p: { payload?: { count?: number } }) => [`${v}% avg (${p?.payload?.count || 0} entries)`, 'Score']} />
                <Bar dataKey="avgScore" name="Avg score" radius={[6, 6, 0, 0]} fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>

      {/* ── NEW SECTION 1 — Completion Heatmap ── */}
      <CompletionHeatmapSection />

      {/* ── NEW SECTION 2 — Manager Effectiveness ── */}
      <ManagerEffectivenessSection />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  SECTION 1 — CHECK-IN COMPLETION HEATMAP
// ═══════════════════════════════════════════════════════════════════════════

interface HeatmapRow {
  employeeName: string;
  department: string;
  Q1: string;
  Q2: string;
  Q3: string;
  Q4: string;
}

const QUARTERS_LIST = ['Q1', 'Q2', 'Q3', 'Q4'] as const;

function HeatCell({ status }: { status: string }) {
  if (status === 'done') {
    return (
      <div className="inline-flex h-10 w-12 items-center justify-center rounded-lg font-bold"
        style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}>
        <Check className="h-4 w-4" strokeWidth={3} />
      </div>
    );
  }
  if (status === 'pending') {
    return (
      <div className="inline-flex h-10 w-16 items-center justify-center rounded-lg text-xs font-semibold gap-1"
        style={{ backgroundColor: '#fef9c3', color: '#ca8a04' }}>
        <Clock className="h-3 w-3" />
        Pending
      </div>
    );
  }
  return (
    <div className="inline-flex h-10 w-12 items-center justify-center rounded-lg font-bold"
      style={{ backgroundColor: '#f1f5f9', color: '#94a3b8' }}>
      —
    </div>
  );
}

function CompletionHeatmapSection() {
  const [data, setData] = useState<HeatmapRow[] | null>(null);
  const [deptFilter, setDeptFilter] = useState<string>('All');

  useEffect(() => {
    fetch('/api/analytics/heatmap')
      .then(r => r.json())
      .then(d => setData(Array.isArray(d) ? d : []))
      .catch(() => setData([]));
  }, []);

  const isLoading = data === null;
  const departments = data ? Array.from(new Set(data.map(r => r.department))).sort() : [];
  const filtered = data
    ? deptFilter === 'All' ? data : data.filter(r => r.department === deptFilter)
    : [];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
      style={{ borderRadius: '16px' }}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900">Check-in completion heatmap</h3>
          <p className="text-xs text-slate-500 mt-0.5">Which employees completed check-ins each quarter</p>
        </div>
        {!isLoading && data && data.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-500">Department:</label>
            <select
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': '#6366f1' } as React.CSSProperties}
            >
              <option value="All">All</option>
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="p-6 space-y-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-sm">No data available yet</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                  style={{ color: '#64748b' }}>
                  Employee
                </th>
                {QUARTERS_LIST.map(q => (
                  <th key={q}
                    className="py-3 text-center text-xs font-semibold uppercase tracking-wider"
                    style={{ color: '#64748b', width: '80px' }}>
                    {q}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, idx) => (
                <tr key={`${row.employeeName}-${idx}`}
                  style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                  <td className="px-6 py-3">
                    <p className="font-semibold text-slate-900">{row.employeeName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{row.department}</p>
                  </td>
                  {QUARTERS_LIST.map(q => (
                    <td key={q} className="py-3 text-center" style={{ width: '80px' }}>
                      <HeatCell status={row[q]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  SECTION 2 — MANAGER EFFECTIVENESS
// ═══════════════════════════════════════════════════════════════════════════

interface MgrRow {
  managerName: string;
  department: string;
  teamSize: number;
  goalsApproved: number;
  approvalRate: number;
  checkinsCompleted: number;
  checkinRate: number;
  avgTeamScore: number;
}

function rateColor(v: number): string {
  if (v > 80) return '#16a34a';   // green
  if (v >= 50) return '#ea580c';  // orange
  return '#dc2626';               // red
}

function scoreColor(v: number): string {
  if (v > 80) return '#16a34a';
  if (v >= 50) return '#ea580c';
  return '#dc2626';
}

function ProgressBar({ value }: { value: number }) {
  const color = rateColor(value);
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="h-2 flex-1 rounded-full overflow-hidden bg-slate-100">
        <div className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(value, 100)}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-bold shrink-0" style={{ color }}>{value}%</span>
    </div>
  );
}

function initialsOf(name: string): string {
  return name.split(' ').map(n => n[0] || '').join('').slice(0, 2).toUpperCase();
}

function ManagerEffectivenessSection() {
  const [data, setData] = useState<MgrRow[] | null>(null);

  useEffect(() => {
    fetch('/api/analytics/manager-effectiveness')
      .then(r => r.json())
      .then(d => setData(Array.isArray(d) ? d : []))
      .catch(() => setData([]));
  }, []);

  const isLoading = data === null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
      style={{ borderRadius: '16px' }}>
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-100">
        <h3 className="text-base font-bold text-slate-900">Manager effectiveness</h3>
        <p className="text-xs text-slate-500 mt-0.5">Check-in completion rates across all L1 managers</p>
      </div>

      {isLoading ? (
        <div className="p-6 space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : data!.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-sm">No data available yet</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ backgroundColor: '#f8fafc' }}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>Manager</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>Department</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>Team size</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>Goals approved</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>Approval rate</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>Check-ins done</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>Check-in rate</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>Avg team score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data!.map((mgr, idx) => (
                <tr key={`${mgr.managerName}-${idx}`} className="hover:bg-slate-50/60">
                  {/* Manager — name + avatar + best performer badge */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                        style={{ backgroundColor: '#eef2ff', color: '#4338ca' }}>
                        {initialsOf(mgr.managerName)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-slate-900 truncate">{mgr.managerName}</p>
                          {idx === 0 && (mgr.avgTeamScore > 0 || mgr.checkinRate > 0 || mgr.approvalRate > 0) && (
                            <span style={{
                              backgroundColor: '#eef2ff',
                              color: '#4338ca',
                              borderRadius: '20px',
                              fontSize: '11px',
                              padding: '2px 10px',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              whiteSpace: 'nowrap',
                            }}>
                              <Award className="h-3 w-3" /> Best performer
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Department */}
                  <td className="px-4 py-4 text-sm text-slate-600">{mgr.department}</td>

                  {/* Team size */}
                  <td className="px-4 py-4 text-center font-semibold text-slate-900">{mgr.teamSize}</td>

                  {/* Goals approved */}
                  <td className="px-4 py-4 text-center text-sm font-semibold text-slate-700">
                    {mgr.goalsApproved}/{mgr.teamSize}
                  </td>

                  {/* Approval rate */}
                  <td className="px-4 py-4">
                    <ProgressBar value={mgr.approvalRate} />
                  </td>

                  {/* Check-ins done */}
                  <td className="px-4 py-4 text-center text-sm font-semibold text-slate-700">
                    {mgr.checkinsCompleted}/{mgr.teamSize}
                  </td>

                  {/* Check-in rate */}
                  <td className="px-4 py-4">
                    <ProgressBar value={mgr.checkinRate} />
                  </td>

                  {/* Avg team score */}
                  <td className="px-4 py-4 text-center">
                    <span className="text-xl font-extrabold" style={{ color: scoreColor(mgr.avgTeamScore) }}>
                      {mgr.avgTeamScore}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
