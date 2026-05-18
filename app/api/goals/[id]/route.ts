import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import Goal from '@/models/Goal';
import AuditLog from '@/models/AuditLog';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const goal = await Goal.findById(params.id)
      .populate('employeeId', 'name email')
      .populate('sharedBy', 'name')
      .populate('primaryOwnerId', 'name');

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    return NextResponse.json(goal);
  } catch (error) {
    console.error('GET /api/goals/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    await dbConnect();

    const goal = await Goal.findById(params.id);
    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    const wasLocked = goal.status === 'locked' || goal.status === 'approved';
    const isAdmin = session.user.role === 'admin';

    // Only admins can edit locked/approved goals; everyone else is blocked
    if (wasLocked && !isAdmin) {
      return NextResponse.json({ error: 'Cannot edit locked/approved goals — contact admin' }, { status: 403 });
    }

    // Store previous values for audit
    const previousValues = {
      title: goal.title,
      description: goal.description,
      target: goal.target,
      weightage: goal.weightage,
      status: goal.status,
    };

    // Update allowed fields
    if (body.target !== undefined) goal.target = body.target;
    if (body.weightage !== undefined) goal.weightage = body.weightage;
    if (body.description !== undefined) goal.description = body.description;
    if (body.title !== undefined) goal.title = body.title;

    const updatedGoal = await goal.save();

    // ─── Audit: log post-lock admin edits ───────────────────────────────────
    if (wasLocked && isAdmin) {
      await AuditLog.create({
        goalId: goal._id,
        changedBy: session.user.id,
        changeType: 'post_lock_admin_edit',
        previousValue: previousValues,
        newValue: {
          title: updatedGoal.title,
          description: updatedGoal.description,
          target: updatedGoal.target,
          weightage: updatedGoal.weightage,
          status: updatedGoal.status,
        },
      });
    }

    await updatedGoal.populate('employeeId', 'name email');

    return NextResponse.json(updatedGoal);
  } catch (error) {
    console.error('PUT /api/goals/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const goal = await Goal.findById(params.id);
    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    if (goal.status !== 'draft' && goal.status !== 'rework') {
      return NextResponse.json(
        { error: 'Can only delete draft or rework goals' },
        { status: 403 }
      );
    }

    await Goal.findByIdAndDelete(params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/goals/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
