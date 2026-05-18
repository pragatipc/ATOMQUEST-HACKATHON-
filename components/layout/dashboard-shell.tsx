'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { NotificationBell } from '@/components/ui/notification-bell';
import {
  LayoutDashboard, Target, CalendarCheck, Users, CheckCircle2,
  Link2, UserCog, RefreshCw, FileText, ClipboardList, BarChart3,
  AlertTriangle, LogOut, PieChart,
} from 'lucide-react';

type NavItem = { href: string; label: string; icon: React.ElementType };

const employeeNav: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/goals',     label: 'My Goals',  icon: Target          },
  { href: '/checkins',  label: 'Check-ins', icon: CalendarCheck   },
];
const managerNav: NavItem[] = [
  { href: '/manager/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/manager/approvals',    label: 'Approvals',    icon: CheckCircle2    },
  { href: '/manager/team',         label: 'My Team',      icon: Users           },
  { href: '/manager/checkins',     label: 'Check-ins',    icon: CalendarCheck   },
  { href: '/manager/shared-goals', label: 'Shared Goals', icon: Link2           },
];
const adminNav: NavItem[] = [
  { href: '/admin/dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/admin/users',       label: 'Users',       icon: UserCog         },
  { href: '/admin/cycles',      label: 'Cycles',      icon: RefreshCw       },
  { href: '/admin/goals',       label: 'All Goals',   icon: Target          },
  { href: '/admin/reports',     label: 'Reports',     icon: FileText        },
  { href: '/admin/completion',  label: 'Completion',  icon: PieChart        },
  { href: '/admin/audit',       label: 'Audit Log',   icon: ClipboardList   },
  { href: '/admin/analytics',   label: 'Analytics',   icon: BarChart3       },
  { href: '/admin/escalations', label: 'Escalations', icon: AlertTriangle   },
];

const ROLE_META: Record<string, { label: string; dot: string }> = {
  employee: { label: 'Employee', dot: 'bg-sky-400'     },
  manager:  { label: 'Manager',  dot: 'bg-violet-400'  },
  admin:    { label: 'HR Admin', dot: 'bg-emerald-400' },
};

export function DashboardShell({ children, role }: {
  children: React.ReactNode;
  role: 'employee' | 'manager' | 'admin';
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const nav  = role === 'admin' ? adminNav : role === 'manager' ? managerNav : employeeNav;
  const meta = ROLE_META[role];
  const initials = (session?.user?.name ?? '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-screen bg-slate-100">

      {/* ── Sidebar ── */}
      <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-[#1e2d4f]">

        {/* Logo */}
        <div className="flex h-14 items-center gap-3 border-b border-white/10 px-5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500 shadow">
            <Target className="h-4 w-4 text-white" />
          </div>
          <span className="text-[15px] font-bold text-white tracking-tight">GoalTrack</span>
        </div>

        {/* Role */}
        <div className="px-5 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <div className={cn('h-2 w-2 rounded-full', meta.dot)} />
            <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">{meta.label}</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
          {nav.map(item => {
            const isActive = pathname === item.href ||
              (item.href.length > 1 && pathname.startsWith(item.href + '/'));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all',
                  isActive
                    ? 'bg-white/15 text-white'
                    : 'text-slate-400 hover:bg-white/8 hover:text-slate-200'
                )}
              >
                <Icon className={cn('h-4 w-4 shrink-0 flex-shrink-0', isActive ? 'text-white' : 'text-slate-500')} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="border-t border-white/10 p-4 space-y-1">
          <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-[11px] font-bold text-white">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-[12px] font-semibold text-white">{session?.user?.name}</p>
              <p className="truncate text-[10px] text-slate-400">{session?.user?.email}</p>
            </div>
            <NotificationBell />
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-medium text-slate-400 hover:bg-white/8 hover:text-white transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="ml-64 flex-1 min-h-screen bg-slate-100">
        <div className="px-8 py-7 max-w-[1200px]">{children}</div>
      </main>
    </div>
  );
}
