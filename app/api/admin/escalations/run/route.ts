import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import EscalationRule from '@/models/EscalationRule';
import EscalationLog from '@/models/EscalationLog';
import User from '@/models/User';
import Goal from '@/models/Goal';
import CheckIn from '@/models/CheckIn';
import { sendEscalationEmail } from '@/lib/email';

function daysAgo(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function currentQuarter(): string {
  const month = new Date().getMonth(); // 0-indexed
  if (month < 3) return 'Q1';
  if (month < 6) return 'Q2';
  if (month < 9) return 'Q3';
  return 'Q4';
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    await dbConnect();

    const rules = await EscalationRule.find({ isActive: true });
    if (rules.length === 0) {
      return NextResponse.json({ triggered: 0, message: 'No active rules to run' });
    }

    const employees = await User.find({ role: 'employee' }).lean();
    if (employees.length === 0) {
      return NextResponse.json({ triggered: 0, message: 'No employees found' });
    }

    const year = new Date().getFullYear();
    const quarter = currentQuarter();
    let triggered = 0;

    for (const rule of rules) {
      for (const emp of employees) {
        const empId = emp._id;
        let shouldEscalate = false;
        let alertSubject = '';
        let alertBody = '';

        // ── goal_not_submitted ────────────────────────────────────────────────
        if (rule.triggerEvent === 'goal_not_submitted') {
          const goals = await Goal.find({ employeeId: empId }).lean();
          const hasSubmitted = goals.some(g =>
            ['submitted', 'approved', 'locked'].includes(g.status)
          );
          if (!hasSubmitted) {
            // Check oldest draft or if no goals at all
            const oldestGoal = goals.sort(
              (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            )[0];
            const refDate = oldestGoal ? new Date(oldestGoal.createdAt) : new Date(emp.createdAt as Date);
            if (daysAgo(refDate) >= rule.daysThreshold) {
              shouldEscalate = true;
              alertSubject = `Goals not submitted — ${emp.name}`;
              alertBody = `${emp.name} has not submitted their annual goals after ${daysAgo(refDate)} days. Please follow up.`;
            }
          }
        }

        // ── goal_not_approved ─────────────────────────────────────────────────
        else if (rule.triggerEvent === 'goal_not_approved') {
          const submittedGoals = await Goal.find({
            employeeId: empId,
            status: 'submitted',
          }).lean();
          for (const g of submittedGoals) {
            if (daysAgo(new Date(g.updatedAt)) >= rule.daysThreshold) {
              shouldEscalate = true;
              alertSubject = `Goal awaiting approval — ${emp.name}`;
              alertBody = `${emp.name} submitted goals ${daysAgo(new Date(g.updatedAt))} days ago but they have not been approved yet.`;
              break;
            }
          }
        }

        // ── checkin_not_done ──────────────────────────────────────────────────
        else if (rule.triggerEvent === 'checkin_not_done') {
          const hasLockedGoals = await Goal.exists({ employeeId: empId, status: 'locked' });
          if (hasLockedGoals) {
            const checkIn = await CheckIn.findOne({
              employeeId: empId,
              quarter,
              year,
            }).lean();
            if (!checkIn) {
              // Use quarter start date as reference
              const quarterStartMonth = { Q1: 0, Q2: 3, Q3: 6, Q4: 9 }[quarter] ?? 0;
              const quarterStart = new Date(year, quarterStartMonth, 1);
              if (daysAgo(quarterStart) >= rule.daysThreshold) {
                shouldEscalate = true;
                alertSubject = `${quarter} check-in not submitted — ${emp.name}`;
                alertBody = `${emp.name} has not completed their ${quarter} ${year} check-in. The quarter started ${daysAgo(quarterStart)} days ago.`;
              }
            }
          }
        }

        if (!shouldEscalate) continue;

        // Avoid duplicate pending logs for same rule + employee
        const existing = await EscalationLog.findOne({
          ruleId: rule._id,
          employeeId: empId,
          status: 'pending',
        });
        if (existing) continue;

        await EscalationLog.create({
          ruleId: rule._id,
          employeeId: empId,
          triggeredAt: new Date(),
          status: 'pending',
        });
        triggered++;

        // Send notifications to relevant roles
        if (rule.notifyRoles.includes('admin')) {
          const admins = await User.find({ role: 'admin' }).lean();
          for (const admin of admins) {
            if (admin.email) {
              await sendEscalationEmail(admin.email, admin.name || 'Admin', alertSubject, alertBody);
            }
          }
        }

        if (rule.notifyRoles.includes('manager')) {
          const mgr = (emp as { managerId?: unknown }).managerId;
          if (mgr) {
            const manager = await User.findById(mgr).lean() as { email?: string; name?: string } | null;
            if (manager?.email) {
              await sendEscalationEmail(manager.email, manager.name || 'Manager', alertSubject, alertBody);
            }
          }
        }
      }
    }

    return NextResponse.json({
      triggered,
      message: triggered === 0
        ? 'All employees are on track — no escalations triggered'
        : `${triggered} escalation alert${triggered !== 1 ? 's' : ''} triggered`,
    });
  } catch (error) {
    console.error('POST /api/admin/escalations/run error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
