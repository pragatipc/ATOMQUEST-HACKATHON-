'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { getDashboardPath } from '@/lib/routes';
import { Target, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

function validate(pw: string) {
  if (pw.length < 8) return 'At least 8 characters required';
  if (!/\d/.test(pw)) return 'Must include at least one number';
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(pw)) return 'Must include a special character (!@#$ etc.)';
  return null;
}

export default function ChangePasswordPage() {
  const { data: session, update } = useSession();
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);

  const rules = [
    { label: '8+ characters',          ok: password.length >= 8 },
    { label: 'One number',             ok: /\d/.test(password) },
    { label: 'One special character',  ok: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
    { label: 'Passwords match',        ok: password.length > 0 && password === confirm },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const err = validate(password);
    if (err) { setError(err); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, confirmPassword: confirm }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to update password'); return; }

      // Update the JWT token first
      await update({ mustChangePassword: false });

      // Hard redirect so middleware reads the fresh JWT cookie — no race condition
      const dest = getDashboardPath(session?.user?.role || 'employee');
      window.location.href = dest;
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Card */}
        <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">

          {/* Header */}
          <div className="bg-[#1e2d4f] px-8 py-6">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500">
                <Target className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-sm font-bold text-white">GoalTrack</span>
            </div>
            <h1 className="text-lg font-bold text-white">Set your password</h1>
            <p className="text-sm text-slate-300 mt-1">
              Your account was created by HR Admin. Set a new password before you continue.
            </p>
          </div>

          {/* Form */}
          <div className="px-8 py-7 space-y-5">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">New password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  required
                  autoFocus
                  className="block w-full rounded-lg border border-slate-200 px-4 py-2.5 pr-11 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm password</label>
              <input
                type={showPw ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Re-enter your password"
                required
                className="block w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Live rules */}
            {password.length > 0 && (
              <div className="rounded-lg bg-slate-50 border border-slate-100 p-4 space-y-2">
                {rules.map(r => (
                  <div key={r.label} className="flex items-center gap-2">
                    <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-colors ${r.ok ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                      <CheckCircle2 className="h-2.5 w-2.5 text-white" />
                    </div>
                    <span className={`text-xs font-medium ${r.ok ? 'text-emerald-700' : 'text-slate-400'}`}>{r.label}</span>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmit as unknown as React.MouseEventHandler}
              disabled={loading || rules.some(r => !r.ok)}
              className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Updating…' : 'Set password & continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
