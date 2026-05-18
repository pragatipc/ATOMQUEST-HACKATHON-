'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import {
  TrendingUp, TrendingDown, Calendar, ShieldCheck,
  AlertCircle, CheckCircle2, ChevronRight,
} from 'lucide-react';

const MAX_GOALS = 8;

const DEFAULT_AREAS = [
  'Strategy', 'Operations', 'Finance', 'People',
  'Customer', 'Innovation', 'Quality', 'Safety', 'Revenue', 'Process',
];

const UOM_OPTIONS = [
  { value: 'numeric_min', icon: TrendingUp,   label: 'Higher is better', desc: 'e.g. Revenue, Sales, Leads' },
  { value: 'numeric_max', icon: TrendingDown, label: 'Lower is better',  desc: 'e.g. Cost, TAT, Errors'    },
  { value: 'timeline',    icon: Calendar,     label: 'Date based',       desc: 'e.g. Project delivery'      },
  { value: 'zero',        icon: ShieldCheck,  label: 'Zero = success',   desc: 'e.g. Safety incidents'      },
];

const STEPS = ['Details', 'Target & Weight', 'Review'];

// ── Thrust area combobox ────────────────────────────────────────────────────
function ThrustAreaCombobox({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = value
    ? DEFAULT_AREAS.filter(a => a.toLowerCase().includes(value.toLowerCase()))
    : DEFAULT_AREAS;

  // Custom mode = user typed something that is not one of the preset options
  const isCustom =
    value.length > 0 &&
    !DEFAULT_AREAS.some(a => a.toLowerCase() === value.toLowerCase());

  function selectOption(area: string) {
    onChange(area);
    setOpen(false);
  }

  function resetToList() {
    onChange('');
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search or type a thrust area…"
        className="flex h-10 w-full rounded-lg border px-3 text-sm focus:outline-none focus:ring-2 transition-colors"
        style={{
          borderColor: open || value ? '#6366f1' : '#e2e8f0',
          boxShadow: open ? '0 0 0 2px rgba(99,102,241,0.15)' : undefined,
        }}
        required
      />

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg overflow-hidden">
          <div className="max-h-44 overflow-y-auto py-1">
            {filtered.map(area => (
              <button
                key={area}
                type="button"
                onMouseDown={e => { e.preventDefault(); selectOption(area); }}
                className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-slate-50 transition-colors"
                style={{ color: value === area ? '#6366f1' : '#374151' }}
              >
                {area}
                {value === area && (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: '#6366f1' }} />
                )}
              </button>
            ))}
            {filtered.length === 0 && value && (
              <p className="px-3 py-2 text-xs text-slate-400">
                Press Enter to use &quot;{value}&quot;
              </p>
            )}
          </div>
          {/* Add custom option */}
          <div className="border-t border-slate-100">
            <button
              type="button"
              onMouseDown={e => {
                e.preventDefault();
                onChange('');
                setOpen(false);
                setTimeout(() => inputRef.current?.focus(), 50);
              }}
              className="w-full px-3 py-2 text-left text-sm font-medium hover:bg-slate-50 transition-colors"
              style={{ color: '#6366f1' }}
            >
              + Add custom thrust area
            </button>
          </div>
        </div>
      )}

      {/* Back to list — shown when user has typed a custom value */}
      {isCustom && !open && (
        <button
          type="button"
          onClick={resetToList}
          className="mt-1.5 text-xs font-medium underline-offset-2 hover:underline"
          style={{ color: '#6366f1' }}
        >
          ← back to list
        </button>
      )}
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function NewGoalPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    thrustArea: '', title: '', description: '',
    uomType: 'numeric_min', target: '', weightage: 20,
  });
  const [existingCount, setExistingCount] = useState(0);
  const [existingWeight, setExistingWeight] = useState(0);
  const [countLoaded, setCountLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) return;
    fetch('/api/goals').then(r => r.json()).then(data => {
      if (Array.isArray(data)) {
        setExistingWeight(data.reduce((s: number, g: { weightage: number }) => s + g.weightage, 0));
        setExistingCount(data.length);
      }
      setCountLoaded(true);
    });
  }, [session?.user?.id]);

  // Redirect if already at max goals
  useEffect(() => {
    if (countLoaded && existingCount >= MAX_GOALS) {
      router.replace('/goals');
    }
  }, [countLoaded, existingCount, router]);

  const projected = existingWeight + form.weightage;

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: name === 'weightage' ? parseInt(value) || 0 : value }));
  }

  function canProceed() {
    if (step === 0) return form.thrustArea.trim() && form.title && form.description;
    if (step === 1) return form.target && form.weightage >= 10 && projected <= 100;
    return true;
  }

  async function handleSubmit() {
    if (form.weightage < 10) { toast.error('Minimum weightage is 10%'); return; }
    if (projected > 100) { toast.error(`Exceeds 100% by ${projected - 100}%`); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed to create goal'); return; }
      toast.success('Goal created successfully');
      router.push('/goals');
    } catch { toast.error('Something went wrong.'); }
    finally { setLoading(false); }
  }

  // Show nothing while we're checking the goal count (avoids flash)
  if (!countLoaded) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-slate-500">
        <button
          onClick={() => router.push('/goals')}
          className="hover:text-indigo-600 font-medium transition-colors"
        >
          My Goals
        </button>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-slate-900 font-semibold">Create goal</span>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all',
              i < step ? 'bg-emerald-500 text-white' :
              i === step ? 'text-white shadow-sm' :
              'bg-slate-100 text-slate-400',
            )} style={i === step ? { backgroundColor: '#6366f1' } : {}}>
              {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
            <span className={cn('text-sm font-medium', i === step ? 'text-slate-900' : 'text-slate-400')}>
              {s}
            </span>
            {i < STEPS.length - 1 && (
              <div className={cn('flex-1 h-px w-8', i < step ? 'bg-emerald-300' : 'bg-slate-200')} />
            )}
          </div>
        ))}
      </div>

      {/* Step 0 — Details */}
      {step === 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900">Goal details</h2>

          {/* Thrust area combobox */}
          <div className="space-y-2">
            <Label>Thrust area *</Label>
            <ThrustAreaCombobox
              value={form.thrustArea}
              onChange={v => setForm(prev => ({ ...prev, thrustArea: v }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Title *</Label>
            <Input
              name="title"
              value={form.title}
              onChange={handleChange}
              required
              placeholder="e.g. Increase quarterly sales by 20%"
            />
          </div>

          <div className="space-y-2">
            <Label>Description *</Label>
            <Textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              required
              rows={3}
              placeholder="How will this be measured? What does success look like?"
            />
          </div>
        </div>
      )}

      {/* Step 1 — UoM + Target + Weightage */}
      {step === 1 && (
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-6 space-y-5">
          <h2 className="text-base font-bold text-slate-900">Target &amp; weightage</h2>

          {/* UoM cards */}
          <div>
            <Label className="mb-3 block">Unit of measure *</Label>
            <div className="grid grid-cols-2 gap-3">
              {UOM_OPTIONS.map(opt => {
                const Icon = opt.icon;
                const selected = form.uomType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, uomType: opt.value }))}
                    style={{
                      borderRadius: '12px',
                      padding: '16px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'border-color 0.15s',
                      border: selected ? '2px solid #6366f1' : '1px solid #e5e7eb',
                      background: selected ? '#eef2ff' : 'white',
                    }}
                    className="relative flex flex-col items-start gap-1 w-full"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" style={{ color: selected ? '#6366f1' : '#94a3b8' }} />
                      <span className="text-sm font-bold" style={{ color: selected ? '#6366f1' : '#374151' }}>
                        {opt.label}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: selected ? '#6366f1' : '#9ca3af', opacity: selected ? 0.8 : 1 }}>
                      {opt.desc}
                    </p>
                    {selected && (
                      <CheckCircle2
                        className="absolute top-2 right-2 h-4 w-4"
                        style={{ color: '#6366f1', opacity: 0.7 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Target *</Label>
            <Input
              name="target"
              type={form.uomType === 'timeline' ? 'date' : 'number'}
              value={form.target}
              onChange={handleChange}
              required
              placeholder={form.uomType === 'timeline' ? '' : 'Enter your target value'}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Weightage *</Label>
              <span className="text-xs text-slate-500">
                Min 10% · Remaining: {100 - existingWeight}%
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Input
                name="weightage"
                type="number"
                min={10}
                max={100 - existingWeight}
                step={5}
                value={form.weightage}
                onChange={handleChange}
                className={form.weightage < 10 ? 'border-red-300' : ''}
              />
              <span className="text-lg font-bold text-slate-900 min-w-[3rem]">{form.weightage}%</span>
            </div>

            {/* Weightage summary */}
            <div className={cn('rounded-xl border p-4 text-sm mt-2',
              projected === 100 ? 'border-emerald-200 bg-emerald-50' :
              projected > 100  ? 'border-red-200 bg-red-50'       : 'border-indigo-100 bg-indigo-50')}>
              <div className="flex justify-between">
                <span className="text-slate-600">Existing</span>
                <span className="font-semibold">{existingWeight}%</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-slate-600">This goal</span>
                <span className="font-semibold">+{form.weightage}%</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-current/10 pt-2">
                <span className="font-semibold text-slate-900">Total</span>
                <span className={cn('font-bold flex items-center gap-1',
                  projected === 100 ? 'text-emerald-600' : projected > 100 ? 'text-red-600' : 'text-amber-600')}>
                  {projected > 100 && <AlertCircle className="h-3.5 w-3.5" />}
                  {projected}%
                  {projected > 100 && <span className="font-normal text-xs">(over by {projected - 100}%)</span>}
                  {projected === 100 && <span className="font-normal text-xs">✓ perfect</span>}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2 — Review */}
      {step === 2 && (
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900">Review &amp; confirm</h2>
          <dl className="space-y-3 text-sm">
            {[
              { label: 'Thrust area',     value: form.thrustArea },
              { label: 'Title',           value: form.title },
              { label: 'Description',     value: form.description },
              { label: 'Unit of measure', value: UOM_OPTIONS.find(o => o.value === form.uomType)?.label || form.uomType },
              { label: 'Target',          value: form.uomType === 'timeline'
                  ? new Date(form.target).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                  : form.target },
              { label: 'Weightage',       value: `${form.weightage}%` },
            ].map(row => (
              <div key={row.label} className="flex justify-between border-b border-slate-50 pb-2">
                <dt className="text-slate-500">{row.label}</dt>
                <dd className="font-semibold text-slate-900 text-right max-w-[60%]">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() => step > 0 ? setStep(s => s - 1) : router.push('/goals')}
        >
          {step === 0 ? 'Cancel' : '← Back'}
        </Button>
        {step < 2 ? (
          <Button type="button" disabled={!canProceed()} onClick={() => setStep(s => s + 1)}>
            Continue →
          </Button>
        ) : (
          <Button
            type="button"
            disabled={loading || projected > 100 || form.weightage < 10}
            onClick={handleSubmit}
          >
            {loading ? 'Creating…' : 'Create goal'}
          </Button>
        )}
      </div>
    </div>
  );
}
