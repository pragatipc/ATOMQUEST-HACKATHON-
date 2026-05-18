import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import EscalationRule from '@/models/EscalationRule';
import EscalationLog from '@/models/EscalationLog';
import User from '@/models/User';
import Goal from '@/models/Goal';
import Achievement from '@/models/Achievement';
import Cycle from '@/models/Cycle';
import { sendEscalationEmail } from '@/lib/email';
import { getCurrentQuarter } from '@/lib/utils';

// ── Escalation chains per rule type ───────────────────────────────────────
// BRD §5.3: "employee → manager → skip-level / HR after defined intervals"
const ESCALATION_CHAINS: Record<string, string[]> = {
  goal_not_submitted: ['employee', 'manager', 'admin'],
  goal_not_approved:  ['manager', 'admin'],
  checkin_not_done:   ['employee', 'manager', 'admin'],
};

function daysBetween(from: Date): number {
  return Math.floor((Date.now() - new Date(from).getTime()) / (1000 * 60 * 60 * 24));
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

interface UserLite { _id: unknown; name: string; email: string; managerId?: unknown }

// Resolve a recipient {email, name} for a given role + employee
async function resolveRecipient(role: string, employee: UserLite): Promise<{ email: string; name: string } | null> {
  if (role === 'employee') {
    return employee.email ? { email: employee.email, name: employee.name } : null;
  }
  if (role === 'manager') {
    if (!employee.managerId) return null;
    const mgr = (await User.findById(employee.managerId).lean()) as unknown as UserLite | null;
    return mgr?.email ? { email: mgr.email, name: mgr.name } : null;
  }
  if (role === 'admin') {
    const admin = (await User.findOne({ role: 'admin', isActive: true }).lean()) as unknown as UserLite | null;
    return admin?.email ? { email: admin.email, name: admin.name } : null;
  }
  return null;
}

function subjectBodyFor(triggerEvent: string, employeeName: string, daysOverdue: number, quarter: string, year: number) {
  if (triggerEvent === 'goal_not_submitted') {
    return {
      subject: 'Action Required: Submit your goals',
      body: `${employeeName} has not submitted goals yet (${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue). Please log in and submit goals as soon as possible.`,
    };
  }
  if (triggerEvent === 'goal_not_approved') {
    return {
      subject: 'Action Required: Approve team goals',
      body: `${employeeName} submitted goals ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} ago and they are still pending approval.`,
    };
  }
  return {
    subject: `Reminder: Log ${quarter} actuals`,
    body: `${employeeName}'s ${quarter} ${year} check-in is overdue by ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''}. Please log quarterly achievements.`,
  };
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admins only' }, { status: 403 });
    }

    await dbConnect();

    const rules = await EscalationRule.find({ isActive: true });
    if (!rules.length) {
      return NextResponse.json({ checked: 0, escalated: 0, emails: 0, advanced: 0 });
    }

    const year    = new Date().getFullYear();
    const quarter = getCurrentQuarter();

    let checked  = 0;
    let escalated = 0;   // brand-new logs created
    let emails    = 0;   // total emails sent (new + advancing hops)
    let advanced  = 0;   // existing logs that moved to next level

    // ── STEP A: Advance existing PENDING logs whose next-escalation time has arrived ──
    const dueLogs = await EscalationLog.find({
      status: 'pending',
      nextEscalationAt: { $ne: null, $lte: new Date() },
    });

    for (const log of dueLogs) {
      const rule = rules.find(r => String(r._id) === String(log.ruleId));
      if (!rule) continue;

      const chain = ESCALATION_CHAINS[rule.triggerEvent] || [rule.notifyRole || 'employee'];
      const nextLevel = log.currentLevel + 1;

      // Chain exhausted
      if (nextLevel > chain.length) {
        log.nextEscalationAt = null;
        await log.save();
        continue;
      }

      const employee = (await User.findById(log.employeeId).lean()) as unknown as UserLite | null;
      if (!employee) continue;

      const role = chain[nextLevel - 1];
      const recipient = await resolveRecipient(role, employee);

      const { subject, body } = subjectBodyFor(
        rule.triggerEvent, employee.name, log.daysOverdue + daysBetween(log.triggeredAt), quarter, year
      );

      let emailedOk = false;
      let emailedTo = '';
      if (recipient) {
        try {
          await sendEscalationEmail(
            recipient.email,
            recipient.name,
            `[Level ${nextLevel}] ${subject}`,
            `<strong>Escalation level ${nextLevel} of ${chain.length}.</strong> ${body}`
          );
          emailedOk = true;
          emailedTo = recipient.email;
          emails++;
        } catch (e) {
          console.error('Email error (advance):', e);
        }
      }

      log.currentLevel = nextLevel;
      log.escalationHistory.push({
        level: nextLevel,
        role,
        emailedAt: new Date(),
        emailTo: emailedTo,
      });
      // Schedule next hop, or null if chain finished
      log.nextEscalationAt = nextLevel < chain.length ? addDays(new Date(), rule.daysThreshold) : null;
      if (emailedOk) log.emailSent = true;
      await log.save();
      advanced++;
    }

    // ── STEP B: Detect new violations and create level-1 logs ──
    const goalSettingCycle = (await Cycle.findOne({ isActive: true, phase: 'goal_setting' }).lean()) as unknown as { windowOpen?: Date } | null;
    const quarterCycle     = (await Cycle.findOne({ isActive: true, phase: quarter }).lean())     as unknown as { windowOpen?: Date } | null;
    const employees = (await User.find({ role: 'employee', isActive: true }).lean()) as unknown as UserLite[];
    checked = employees.length;

    async function hasPendingLog(ruleId: unknown, employeeId: unknown): Promise<boolean> {
      return !!(await EscalationLog.findOne({ ruleId, employeeId, status: 'pending' }));
    }

    async function createLevelOneLog(
      rule: typeof rules[number],
      employee: UserLite,
      daysOverdue: number
    ) {
      const chain = ESCALATION_CHAINS[rule.triggerEvent] || [rule.notifyRole || 'employee'];
      const firstRole = chain[0];
      const recipient = await resolveRecipient(firstRole, employee);

      const { subject, body } = subjectBodyFor(rule.triggerEvent, employee.name, daysOverdue, quarter, year);

      let emailedOk = false;
      let emailedTo = '';
      if (recipient) {
        try {
          await sendEscalationEmail(
            recipient.email,
            recipient.name,
            `[Level 1] ${subject}`,
            `<strong>Escalation level 1 of ${chain.length}.</strong> ${body}`
          );
          emailedOk = true;
          emailedTo = recipient.email;
          emails++;
        } catch (e) {
          console.error('Email error (new):', e);
        }
      }

      await EscalationLog.create({
        ruleId: rule._id,
        employeeId: employee._id,
        triggerEvent: rule.triggerEvent,
        triggeredAt: new Date(),
        daysOverdue,
        emailSent: emailedOk,
        status: 'pending',
        currentLevel: 1,
        nextEscalationAt: chain.length > 1 ? addDays(new Date(), rule.daysThreshold) : null,
        escalationHistory: [{
          level: 1,
          role: firstRole,
          emailedAt: new Date(),
          emailTo: emailedTo,
        }],
      });
      escalated++;
    }

    // Rule 1: goal_not_submitted ----------------------------------------------
    const rule1 = rules.find(r => r.triggerEvent === 'goal_not_submitted');
    if (rule1) {
      const refDate = goalSettingCycle?.windowOpen ? new Date(goalSettingCycle.windowOpen) : null;
      for (const emp of employees) {
        const hasSubmitted = await Goal.exists({
          employeeId: emp._id,
          status: { $in: ['submitted', 'approved', 'locked'] },
        });
        if (hasSubmitted) continue;
        const fromDate = refDate ?? new Date((emp as unknown as { createdAt: Date }).createdAt);
        const daysOverdue = daysBetween(fromDate);
        if (daysOverdue < rule1.daysThreshold) continue;
        if (await hasPendingLog(rule1._id, emp._id)) continue;
        await createLevelOneLog(rule1, emp, daysOverdue);
      }
    }

    // Rule 2: goal_not_approved -----------------------------------------------
    const rule2 = rules.find(r => r.triggerEvent === 'goal_not_approved');
    if (rule2) {
      const submittedGoals = (await Goal.find({ status: 'submitted' }).lean()) as unknown as {
        _id: unknown; employeeId: unknown; updatedAt: Date;
      }[];
      for (const g of submittedGoals) {
        const daysOverdue = daysBetween(g.updatedAt);
        if (daysOverdue < rule2.daysThreshold) continue;
        if (await hasPendingLog(rule2._id, g.employeeId)) continue;
        const emp = (await User.findById(g.employeeId).lean()) as unknown as UserLite | null;
        if (!emp) continue;
        await createLevelOneLog(rule2, emp, daysOverdue);
      }
    }

    // Rule 3: checkin_not_done ------------------------------------------------
    const rule3 = rules.find(r => r.triggerEvent === 'checkin_not_done');
    if (rule3) {
      const qStart: Record<string, number> = { Q1: 0, Q2: 3, Q3: 6, Q4: 9 };
      const quarterStart = quarterCycle?.windowOpen
        ? new Date(quarterCycle.windowOpen)
        : new Date(year, qStart[quarter] ?? 0, 1);
      const daysOpen = daysBetween(quarterStart);
      if (daysOpen >= rule3.daysThreshold) {
        const empIdsWithLocked = await Goal.distinct('employeeId', { status: 'locked' });
        for (const empId of empIdsWithLocked) {
          const hasCheckin = await Achievement.exists({ employeeId: empId, quarter, year });
          if (hasCheckin) continue;
          if (await hasPendingLog(rule3._id, empId)) continue;
          const emp = (await User.findById(empId).lean()) as unknown as UserLite | null;
          if (!emp) continue;
          await createLevelOneLog(rule3, emp, daysOpen);
        }
      }
    }

    return NextResponse.json({ checked, escalated, emails, advanced });
  } catch (error) {
    console.error('POST /api/escalations/run error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
