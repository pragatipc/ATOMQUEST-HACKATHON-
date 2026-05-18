'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { getDashboardPath } from '@/lib/routes';
import { Target, Eye, EyeOff, ArrowLeft, Users, ShieldCheck, Briefcase, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

const QUICK_LOGIN = [
  {
    label: 'Employee',
    name: 'Amit Singh · Goals locked',
    email: 'amit@company.com',
    password: 'Emp@123',
    icon: Users,
    color: 'border-indigo-200 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-300',
    iconBg: 'bg-indigo-100 text-indigo-600',
    badge: 'text-indigo-700',
  },
  {
    label: 'Fresh Employee',
    name: 'Sneha Joshi · No goals yet',
    email: 'sneha@company.com',
    password: 'Emp@123',
    icon: Users,
    color: 'border-cyan-200 bg-cyan-50 hover:bg-cyan-100 hover:border-cyan-300',
    iconBg: 'bg-cyan-100 text-cyan-600',
    badge: 'text-cyan-700',
  },
  {
    label: 'Manager',
    name: 'Rajesh Kumar',
    email: 'rajesh@company.com',
    password: 'Manager@123',
    icon: Briefcase,
    color: 'border-violet-200 bg-violet-50 hover:bg-violet-100 hover:border-violet-300',
    iconBg: 'bg-violet-100 text-violet-600',
    badge: 'text-violet-700',
  },
  {
    label: 'HR Admin',
    name: 'HR Admin',
    email: 'admin@company.com',
    password: 'Admin@123',
    icon: ShieldCheck,
    color: 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300',
    iconBg: 'bg-emerald-100 text-emerald-600',
    badge: 'text-emerald-700',
  },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeDemo, setActiveDemo] = useState<string | null>(null);

  async function doLogin(loginEmail: string, loginPassword: string, demoLabel?: string) {
    setLoading(true);
    setError('');
    if (demoLabel) setActiveDemo(demoLabel);
    try {
      const verify = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await verify.json();
      if (!verify.ok) {
        setError(data.error || 'Login failed');
        return;
      }
      const result = await signIn('credentials', {
        email: loginEmail,
        password: loginPassword,
        redirect: false,
      });
      if (result?.error) {
        setError('Sign in failed. Please check your credentials.');
        return;
      }
      const dest = data.mustChangePassword
        ? '/change-password'
        : getDashboardPath(data.role || 'employee');
      window.location.href = dest;
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
      setActiveDemo(null);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-white flex items-center justify-center p-4">

      <Link href="/" className="absolute top-6 left-6 flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div className="w-full max-w-md">

        <div className="rounded-3xl bg-white shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden">

          {/* Card header */}
          <div className="px-8 pt-8 pb-6 border-b border-slate-50">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 shadow-md shadow-indigo-200">
                <Target className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-base font-bold text-slate-900 leading-none">GoalTrack</p>
                <p className="text-xs text-slate-400 mt-0.5">Enterprise HR Portal</p>
              </div>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">Welcome back</h1>
            <p className="mt-1 text-sm text-slate-500">Sign in to access your dashboard</p>
          </div>

          <div className="px-8 py-6 space-y-6">

            {/* Quick demo */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">Quick Demo Access</p>
              <div className="space-y-2">
                {QUICK_LOGIN.map((q) => {
                  const Icon = q.icon;
                  const isActive = activeDemo === q.label && loading;
                  return (
                    <button
                      key={q.label}
                      type="button"
                      disabled={loading}
                      onClick={() => doLogin(q.email, q.password, q.label)}
                      className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all disabled:opacity-60 cursor-pointer ${q.color}`}
                    >
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${q.iconBg}`}>
                        {isActive
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Icon className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold ${q.badge}`}>{q.label}</p>
                        <p className="text-xs text-slate-400 truncate">{q.name}</p>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-xs text-slate-400 font-medium">or sign in manually</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={(e) => { e.preventDefault(); doLogin(email.trim(), password); }} className="space-y-4">
              <div>
                <label className="block mb-1.5 text-sm font-semibold text-slate-700">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="block w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>
              <div>
                <label className="block mb-1.5 text-sm font-semibold text-slate-700">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="block w-full rounded-xl border border-slate-200 px-4 py-2.5 pr-11 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 transition-all shadow-sm hover:shadow-md hover:shadow-indigo-200 disabled:opacity-60"
              >
                {loading && !activeDemo
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</>
                  : 'Sign in'
                }
              </button>
            </form>

          </div>

          {/* Card footer */}
          <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 rounded-b-3xl">
            <p className="text-center text-xs text-slate-400">
              No account? Contact your <span className="font-semibold text-slate-600">HR Admin</span> for access.
            </p>
          </div>
        </div>

        <p className="mt-5 text-center text-[11px] text-slate-400">GoalTrack · AtomQuest Hackathon 1.0</p>
      </div>
    </div>
  );
}
