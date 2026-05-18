'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  link?: string;
  createdAt: string;
}

const TYPE_COLORS: Record<string, string> = {
  goal_locked: 'bg-emerald-500',
  goal_approved: 'bg-emerald-500',
  goal_rework: 'bg-amber-500',
  goal_submitted: 'bg-indigo-500',
  checkin_recorded: 'bg-cyan-500',
  goal_unlocked: 'bg-violet-500',
  system: 'bg-slate-500',
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0 });

  function openPanel() {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setDropPos({ top: rect.top, left: rect.right + 12 });
    }
    setOpen((o) => !o);
  }

  async function fetchNotifications() {
    try {
      const res = await fetch('/api/notifications?limit=15');
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnread(data.unreadCount || 0);
    } catch {
      // silently fail — non-critical
    }
  }

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function markAllRead() {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllRead: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
  }

  async function markRead(id: string) {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, read: true } : n));
    setUnread((prev) => Math.max(0, prev - 1));
  }

  return (
    <div ref={ref} className="relative">
      <button
        ref={btnRef}
        onClick={openPanel}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-4.5 w-4.5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed z-[9999] w-80 rounded-2xl border border-slate-200 bg-white shadow-2xl"
          style={{ top: Math.min(dropPos.top, window.innerHeight - 440), left: dropPos.left }}
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="font-semibold text-slate-900 text-sm">Notifications</p>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
                >
                  <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-slate-50">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => {
                const content = (
                  <div
                    key={n._id}
                    onClick={() => !n.read && markRead(n._id)}
                    className={cn(
                      'flex items-start gap-3 px-4 py-3 transition-colors',
                      !n.read ? 'bg-indigo-50/60 hover:bg-indigo-50' : 'hover:bg-slate-50'
                    )}
                  >
                    <div className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', TYPE_COLORS[n.type] || 'bg-slate-400')} />
                    <div className="min-w-0 flex-1">
                      <p className={cn('text-sm font-medium text-slate-900', !n.read && 'font-semibold')}>{n.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{n.message}</p>
                      <p className="mt-1 text-[10px] text-slate-400">{timeAgo(n.createdAt)}</p>
                    </div>
                    {n.link && <ChevronRight className="h-3.5 w-3.5 shrink-0 mt-1 text-slate-300" />}
                  </div>
                );

                return n.link ? (
                  <Link key={n._id} href={n.link} onClick={() => { markRead(n._id); setOpen(false); }}>
                    {content}
                  </Link>
                ) : (
                  <div key={n._id}>{content}</div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
