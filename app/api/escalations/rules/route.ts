import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import EscalationRule from '@/models/EscalationRule';

const DEFAULT_RULES = [
  {
    triggerEvent: 'goal_not_submitted',
    description: 'Employee has not submitted goals after cycle opened',
    daysThreshold: 7,
    notifyRole: 'employee',
    notifyRoles: ['employee'],
    isActive: true,
  },
  {
    triggerEvent: 'goal_not_approved',
    description: 'Manager has not approved goals after employee submitted',
    daysThreshold: 5,
    notifyRole: 'manager',
    notifyRoles: ['manager'],
    isActive: true,
  },
  {
    triggerEvent: 'checkin_not_done',
    description: 'Employee has not logged actuals in active quarter',
    daysThreshold: 3,
    notifyRole: 'employee',
    notifyRoles: ['employee'],
    isActive: true,
  },
];

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admins only' }, { status: 403 });
    }

    await dbConnect();

    let rules = await EscalationRule.find().sort({ createdAt: 1 });

    // Seed defaults if DB is empty
    if (rules.length === 0) {
      rules = await EscalationRule.insertMany(DEFAULT_RULES);
    }

    // ── Deduplicate: keep only the oldest rule per triggerEvent ───────────────
    const seen = new Set<string>();
    const unique: typeof rules = [];
    const duplicateIds: unknown[] = [];
    for (const r of rules) {
      if (seen.has(r.triggerEvent)) {
        duplicateIds.push(r._id);
      } else {
        seen.add(r.triggerEvent);
        unique.push(r);
      }
    }
    if (duplicateIds.length > 0) {
      await EscalationRule.deleteMany({ _id: { $in: duplicateIds } });
    }

    // Ensure all 3 default triggers exist (in case some were deleted manually)
    for (const def of DEFAULT_RULES) {
      if (!seen.has(def.triggerEvent)) {
        const created = await EscalationRule.create(def);
        unique.push(created);
      }
    }

    // Return in stable order: submitted → approved → checkin
    const order = ['goal_not_submitted', 'goal_not_approved', 'checkin_not_done'];
    unique.sort((a, b) => order.indexOf(a.triggerEvent) - order.indexOf(b.triggerEvent));

    return NextResponse.json(unique);
  } catch (error) {
    console.error('GET /api/escalations/rules error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
