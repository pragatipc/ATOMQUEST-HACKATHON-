import Link from 'next/link';
import { Target, ArrowRight, Users, CheckCircle2, BarChart3, ShieldCheck, TrendingUp, Clock, Zap } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col overflow-x-hidden">

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-slate-100">
        <div className="mx-auto max-w-6xl flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 shadow-sm">
              <Target className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-bold text-slate-900">GoalTrack</span>
            <span className="hidden sm:inline ml-1 rounded-full bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 text-[11px] font-medium text-indigo-600">
              Enterprise HR
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-xs text-slate-400">AtomQuest Hackathon 1.0</span>
            <Link
              href="/login"
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-all shadow-sm hover:shadow-indigo-200 hover:shadow-md"
            >
              Sign in <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-white">
        {/* Gradient blobs */}
        <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-[500px] w-[900px] rounded-full bg-indigo-50 opacity-60 blur-3xl" />
        <div className="pointer-events-none absolute top-0 right-0 h-72 w-72 rounded-full bg-violet-50 opacity-50 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-1.5 text-xs font-semibold text-indigo-600 mb-8 shadow-sm">
            <Zap className="h-3 w-3" /> Built for AtomQuest Hackathon 1.0
          </div>

          <h1 className="text-5xl sm:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.1] max-w-3xl mx-auto">
            Enterprise Goal Tracking<br />
            <span className="text-indigo-600">for Modern Teams.</span>
          </h1>

          <p className="mt-6 text-lg text-slate-500 max-w-xl mx-auto leading-relaxed">
            Align your organisation around measurable goals. Employees set targets, managers approve, HR gets full visibility — all in one place.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 transition-all"
            >
              Get started <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-8 py-3.5 text-base font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
            >
              View demo
            </Link>
          </div>

          {/* Stats row */}
          <div className="mt-20 grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-100 rounded-2xl overflow-hidden shadow-sm border border-slate-100">
            {[
              { value: '3 Roles',   label: 'Employee · Manager · Admin' },
              { value: '100%',      label: 'Weightage-based scoring'    },
              { value: 'Q1–Q4',     label: 'Quarterly check-ins'        },
              { value: 'Real-time', label: 'Analytics & escalations'    },
            ].map(s => (
              <div key={s.label} className="bg-white px-6 py-6 text-center">
                <p className="text-2xl font-extrabold text-indigo-600">{s.value}</p>
                <p className="mt-1 text-xs text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="bg-slate-50 border-y border-slate-100 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-500 text-center mb-3">Platform Features</p>
          <h2 className="text-3xl font-extrabold text-slate-900 text-center mb-12">Everything your team needs</h2>

          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                icon: Target,
                title: 'Smart Goal Setting',
                desc: 'Employees create goals with thrust areas, UOM types, targets and weightage. Auto-validates 100% total allocation.',
                color: 'bg-indigo-50 text-indigo-600',
              },
              {
                icon: CheckCircle2,
                title: 'Manager Approvals',
                desc: 'Managers review, comment, approve or request rework. Goals get locked once approved — full audit trail.',
                color: 'bg-violet-50 text-violet-600',
              },
              {
                icon: BarChart3,
                title: 'Analytics & Reports',
                desc: 'HR gets department-wise completion rates, escalation triggers, and exportable reports in one dashboard.',
                color: 'bg-emerald-50 text-emerald-600',
              },
              {
                icon: TrendingUp,
                title: 'Quarterly Check-ins',
                desc: 'Log actuals every quarter. Score is auto-computed based on UOM type. Track progress over the full year.',
                color: 'bg-amber-50 text-amber-600',
              },
              {
                icon: Clock,
                title: 'Escalation Engine',
                desc: 'Automated alerts when goals are not submitted or approved within deadlines. Notify managers and HR instantly.',
                color: 'bg-rose-50 text-rose-600',
              },
              {
                icon: ShieldCheck,
                title: 'Role-Based Access',
                desc: 'Strict separation — employees only see their goals, managers see their team, HR Admin sees everything.',
                color: 'bg-cyan-50 text-cyan-600',
              },
            ].map(f => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="group bg-white rounded-2xl border border-slate-100 p-6 hover:shadow-md hover:border-slate-200 transition-all">
                  <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl mb-4 ${f.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Role Workflow ── */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-500 text-center mb-3">How It Works</p>
          <h2 className="text-3xl font-extrabold text-slate-900 text-center mb-12">Three roles. One workflow.</h2>

          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                role: 'Employee',
                color: 'border-indigo-200 bg-indigo-50',
                textColor: 'text-indigo-700',
                numColor: 'text-indigo-200',
                actions: ['Create annual goals with thrust areas', 'Set targets & weightage (must total 100%)', 'Submit for manager approval', 'Log quarterly actuals'],
              },
              {
                step: '02',
                role: 'Manager',
                color: 'border-violet-200 bg-violet-50',
                textColor: 'text-violet-700',
                numColor: 'text-violet-200',
                actions: ['Review submitted goals', 'Approve, reject or request rework', 'Lock approved goals', 'Conduct quarterly check-ins'],
              },
              {
                step: '03',
                role: 'HR Admin',
                color: 'border-emerald-200 bg-emerald-50',
                textColor: 'text-emerald-700',
                numColor: 'text-emerald-200',
                actions: ['Manage all users & cycles', 'Monitor organisation-wide progress', 'View analytics & reports', 'Run escalation checks'],
              },
            ].map(r => (
              <div key={r.role} className={`relative rounded-2xl border p-6 ${r.color} overflow-hidden`}>
                <span className={`absolute top-4 right-5 text-5xl font-black ${r.numColor} select-none`}>{r.step}</span>
                <p className={`text-sm font-bold mb-4 ${r.textColor}`}>{r.role}</p>
                <ul className="space-y-2.5">
                  {r.actions.map(a => (
                    <li key={a} className="flex items-start gap-2 text-sm text-slate-600">
                      <CheckCircle2 className={`h-4 w-4 shrink-0 mt-0.5 ${r.textColor}`} />
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="bg-indigo-600 py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-extrabold text-white mb-4">Ready to see it in action?</h2>
          <p className="text-indigo-200 mb-8 text-base">Use the demo credentials to explore all three role dashboards instantly.</p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-sm font-bold text-indigo-600 hover:bg-indigo-50 transition-all shadow-lg"
          >
            Open demo portal <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-slate-900 px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500">
                <Target className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-sm font-bold text-white">GoalTrack</span>
              <span className="text-slate-500 text-xs ml-2">· AtomQuest Hackathon 1.0</span>
            </div>

            {/* Demo creds */}
            <div className="flex gap-3 flex-wrap justify-center">
              {[
                { role: 'Employee', email: 'amit@company.com',   pass: 'Emp@123'     },
                { role: 'Manager',  email: 'rajesh@company.com', pass: 'Manager@123' },
                { role: 'Admin',    email: 'admin@company.com',  pass: 'Admin@123'   },
              ].map(c => (
                <div key={c.role} className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-center min-w-[130px]">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{c.role}</p>
                  <p className="font-mono text-[11px] text-slate-300 mt-1">{c.email}</p>
                  <p className="font-mono text-[11px] text-slate-500">{c.pass}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-8 text-center text-[11px] text-slate-600">© 2026 GoalTrack. Built with Next.js · Tailwind CSS · MongoDB</p>
        </div>
      </footer>

    </div>
  );
}
