import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import Goal from '@/models/Goal';
import AuditLog from '@/models/AuditLog';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can unlock goals' }, { status: 403 });
    }

    const body = await req.json();
    const { goalId, reason } = body;

    if (!goalId) {
      return NextResponse.json({ error: 'goalId is required' }, { status: 400 });
    }

    await dbConnect();

    const goal = await Goal.findById(goalId);
    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    if (goal.status !== 'locked') {
      return NextResponse.json({ error: 'Only locked goals can be unlocked' }, { status: 400 });
    }

    const previousStatus = goal.status;
    goal.status = 'rework';
    goal.managerComment = reason || 'Unlocked by admin for revision';
    await goal.save();

    await AuditLog.create({
      goalId: goal._id,
      changedBy: session.user.id,
      changeType: 'admin_unlock',
      previousValue: { status: previousStatus },
      newValue: { status: 'rework', reason: goal.managerComment },
    });

    return NextResponse.json({ success: true, goal });
  } catch (error) {
    console.error('POST /api/admin/goals/unlock error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
