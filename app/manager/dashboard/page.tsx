'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Users, CheckCircle2, Target, ClipboardList, ArrowRight, Clock, Link2, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeamMember { _id: string; name: string; email: string; department?: string; lockedGoals?: number; }
interface PendingGroup { employeeId: string; employeeName: string; goals: { _id: string; title: string }[]; }

const AVATAR_COLORS = ['bg-indigo-100 text-indigo-700', 'bg-violet-100 text-violet-700', 'bg-cyan-100 text-cyan-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700'];

export default function ManagerDashboardPage() {
  const { data: session } = useSession();
  const [team, setTeam]       = useState<TeamMember[]>([]);
  const [pending, setPending] = useState<PendingGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetch('/api/manager/team'), fetch('/api/manager/approvals')])
      .then(async ([tr, ar]) => {
        const td = await tr.json(); const ad = await ar.json();
        setTeam(Array.isArray(td) ? td : []);
        setPending(Array.isArray(ad) ? ad : []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 w-56 rounded-lg bg-white" />
      <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-28 rounded-xl bg-white" />)}</div>
      <div className="h-72 rounded-xl bg-white" />
    </div>
  );

  const name         = session?.user?.name?.split(' ')[0] || 'there';
  const lockedTotal  = team.reduce((s, m) => s + (m.lockedGoals || 0), 0);
  const pendingCount = pending.reduce((s, p) => s + p.goals.length, 0);
  const doneCount    = team.filter(m => (m.lockedGoals || 0) > 0).length;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900">Hello, {name} 👋</h1>
          <p className="text-sm text-slate-500 mt-0.5">{new Date().getFullYear()} · Manager view</p>
        </div>
        {pendingCount > 0 && (
          <Link href="/manager/approvals"
            className="flex items-center gap-2 rounded-lg bg-[#6366f1] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#4f46e5] transition-colors shadow-sm">
            <Clock className="h-4 w-4" /> {pendingCount} pending review{pendingCount !== 1 ? 's' : ''}
          </Link>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { icon: Users,        label: 'Team members',     value: team.length,    sub: 'Direct reports',                    iconBg: 'bg-indigo-50', iconCl: 'text-indigo-600', ring: 'ring-indigo-100',  bar: 1,                             barCl: 'bg-indigo-400'  },
          { icon: Clock,        label: 'Pending approvals',value: pendingCount,   sub: pendingCount > 0 ? 'Action required' : 'All reviewed', iconBg: pendingCount > 0 ? 'bg-amber-50' : 'bg-slate-50', iconCl: pendingCount > 0 ? 'text-amber-600' : 'text-slate-400', ring: pendingCount > 0 ? 'ring-amber-100' : 'ring-slate-100', bar: team.length ? pendingCount / team.length : 0, barCl: 'bg-amber-400'   },
          { icon: Target,       label: 'Locked goals',     value: lockedTotal,    sub: 'Manager approved',                  iconBg: 'bg-emerald-50',iconCl: 'text-emerald-600',ring: 'ring-emerald-100', bar: 1,                             barCl: 'bg-emerald-500' },
          { icon: TrendingUp,   label: 'Team on track',    value: `${doneCount}/${team.length}`, sub: 'Members with locked goals', iconBg: 'bg-violet-50', iconCl: 'text-violet-600', ring: 'ring-violet-100', bar: team.length ? doneCount / team.length : 0, barCl: 'bg-violet-500'  },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={cn('rounded-xl bg-white p-5 ring-1 shadow-sm', s.ring)}>
              <div className="flex items-start justify-between mb-4">
                <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', s.iconBg)}>
                  <Icon className={cn('h-[18px] w-[18px]', s.iconCl)} />
                </div>
                <span className="text-2xl font-extrabold text-slate-900">{s.value}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden mb-2.5">
                <div className={cn('h-full rounded-full', s.barCl)} style={{ width: `${Math.min(s.bar * 100, 100)}%` }} />
              </div>
              <p className="text-xs font-semibold text-slate-500">{s.label}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{s.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Pending alert */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-4 rounded-xl border border-[#6366f1] bg-[#6366f1] px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
            <Clock className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-white">{pendingCount} goal{pendingCount !== 1 ? 's' : ''} waiting for your approval</p>
            <p className="text-xs text-white/80 mt-0.5">From: {pending.slice(0, 3).map(p => p.employeeName).join(', ')}{pending.length > 3 ? ` +${pending.length - 3} more` : ''}</p>
          </div>
          <Link href="/manager/approvals" className="shrink-0 rounded-lg bg-white px-4 py-2 text-sm font-bold text-[#6366f1] hover:bg-white/90">Review now →</Link>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">

        {/* Actions */}
        <div className="space-y-3">
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <h2 className="text-sm font-bold text-slate-900 mb-4">Quick actions</h2>
            <div className="space-y-1.5">
              {[
                { href: '/manager/approvals',    icon: CheckCircle2,  label: 'Goal Approvals',  sub: `${pendingCount} pending`,   badge: pendingCount, cls: 'bg-amber-50 text-amber-600'    },
                { href: '/manager/checkins',     icon: ClipboardList, label: 'Team Check-ins',  sub: 'Planned vs actual',         badge: 0,            cls: 'bg-indigo-50 text-indigo-600'  },
                { href: '/manager/team',         icon: Users,         label: 'My Team',          sub: `${team.length} members`,    badge: 0,            cls: 'bg-violet-50 text-violet-600'  },
                { href: '/manager/shared-goals', icon: Link2,         label: 'Shared Goals',     sub: 'Push KPIs to your team',    badge: 0,            cls: 'bg-emerald-50 text-emerald-600'},
              ].map(a => {
                const Icon = a.icon;
                return (
                  <Link key={a.href} href={a.href}
                    className="group flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-slate-50 transition-colors">
                    <div className={cn('relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', a.cls)}>
                      <Icon className="h-4 w-4" />
                      {a.badge > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                          {a.badge > 9 ? '9+' : a.badge}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{a.label}</p>
                      <p className="text-xs text-slate-400">{a.sub}</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Team table */}
        <div className="lg:col-span-2 rounded-xl bg-white shadow-sm ring-1 ring-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">Team overview</h2>
            <Link href="/manager/team" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              Full view <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {team.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                <Users className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-600">No team members yet</p>
              <p className="text-xs text-slate-400">Ask HR Admin to assign employees to you</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {team.map((m, idx) => {
                const hasPending = pending.some(p => p.employeeId === m._id);
                const initials   = m.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                const avCls      = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                return (
                  <div key={m._id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50/60 transition-colors">
                    <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold', avCls)}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900 truncate">{m.name}</p>
                        {hasPending && (
                          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">Pending</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">{m.department || 'No department'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-slate-900">{m.lockedGoals ?? 0}</p>
                      <p className="text-[11px] text-slate-400">locked</p>
                    </div>
                    <div className="shrink-0">
                      {(m.lockedGoals ?? 0) > 0 ? (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        </div>
                      ) : (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100">
                          <Clock className="h-4 w-4 text-slate-400" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
