import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import Goal from '@/models/Goal';
import User from '@/models/User';
import AuditLog from '@/models/AuditLog';
import { sendGoalApprovalEmail, sendGoalReworkEmail } from '@/lib/email';
import { sendNotification } from '@/lib/notify';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['manager', 'admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Only managers or admins can approve goals' }, { status: 403 });
    }

    const body = await req.json();
    // goalEdits: optional array of { goalId, target?, weightage? } for inline edits before approval
    const { goalId, action, comment, goalEdits } = body;

    if (!goalId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['approve', 'rework'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    await dbConnect();

    const goal = await Goal.findById(goalId);
    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    if (goal.status !== 'submitted') {
      return NextResponse.json({ error: 'Goal must be in submitted state to approve/rework' }, { status: 400 });
    }

    const employee = await User.findById(goal.employeeId);
    const approver = await User.findById(session.user.id);

    // Apply inline edits from manager review (before locking)
    if (goalEdits && Array.isArray(goalEdits)) {
      const edit = goalEdits.find((e: { goalId: string }) => String(e.goalId) === String(goalId));
      if (edit) {
        const prev = { target: goal.target, weightage: goal.weightage };
        if (edit.target !== undefined) goal.target = edit.target;
        if (edit.weightage !== undefined) goal.weightage = Number(edit.weightage);

        await AuditLog.create({
          goalId: goal._id,
          changedBy: session.user.id,
          changeType: 'manager_inline_edit',
          previousValue: prev,
          newValue: { target: goal.target, weightage: goal.weightage },
        });
      }
    }

    if (action === 'approve') {
      goal.status = 'locked';
      goal.managerComment = comment || null;
      await goal.save();

      await AuditLog.create({
        goalId: goal._id,
        changedBy: session.user.id,
        changeType: 'approved',
        previousValue: { status: 'submitted' },
        newValue: { status: 'locked' },
      });

      if (employee) {
        await sendGoalApprovalEmail(
          employee.email,
          employee.name,
          approver?.name || 'Your Manager'
        );
        await sendNotification({
          userId: employee._id,
          title: 'Goal approved & locked',
          message: `"${goal.title}" has been approved by ${approver?.name || 'your manager'}. You can now log check-in achievements.`,
          type: 'goal_locked',
          link: `/goals/${goal._id}`,
        });
      }
    } else if (action === 'rework') {
      goal.status = 'rework';
      goal.managerComment = comment || 'Please revise your goals';
      await goal.save();

      await AuditLog.create({
        goalId: goal._id,
        changedBy: session.user.id,
        changeType: 'rework_requested',
        previousValue: { status: 'submitted' },
        newValue: { status: 'rework', comment: goal.managerComment },
      });

      if (employee) {
        await sendGoalReworkEmail(
          employee.email,
          employee.name,
          approver?.name || 'Your Manager',
          comment || 'Please revise your goals'
        );
        await sendNotification({
          userId: employee._id,
          title: 'Goal needs revision',
          message: `"${goal.title}" was sent back for rework. Feedback: ${comment || 'Please revise your goals'}`,
          type: 'goal_rework',
          link: `/goals/${goal._id}`,
        });
      }
    }

    return NextResponse.json({ success: true, goal });
  } catch (error) {
    console.error('POST /api/admin/goals/approve error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
