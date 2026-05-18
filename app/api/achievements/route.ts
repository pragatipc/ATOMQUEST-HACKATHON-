import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import Achievement from '@/models/Achievement';
import Goal from '@/models/Goal';
import Cycle from '@/models/Cycle';
import { computeScore } from '@/lib/scoring';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const quarter = searchParams.get('quarter');
    const year = searchParams.get('year');
    const employeeId = searchParams.get('employeeId');

    const query: Record<string, unknown> = {};

    if (session.user.role === 'employee') {
      query.employeeId = session.user.id;
    } else if (employeeId) {
      query.employeeId = employeeId;
    }

    if (quarter) query.quarter = quarter;
    if (year) query.year = parseInt(year);

    const achievements = await Achievement.find(query)
      .populate('goalId')
      .populate('employeeId', 'name email')
      .sort({ createdAt: -1 });

    return NextResponse.json(achievements);
  } catch (error) {
    console.error('GET /api/achievements error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { goalId, quarter, year, actualValue, progressStatus } = body;

    await dbConnect();

    if (!goalId || !quarter || !year || actualValue === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const goal = await Goal.findById(goalId);
    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    // ─── Check-in window enforcement ────────────────────────────────────────
    // BRD §2.3: quarterly check-ins must happen within the active Cycle window.
    // We only enforce when a Cycle is explicitly marked ACTIVE — admins can
    // deactivate cycles to allow off-window entry. Admins always bypass.
    if (session.user.role !== 'admin') {
      const cycle = await Cycle.findOne({ year: Number(year), phase: quarter, isActive: true });
      if (cycle) {
        const now = Date.now();
        const open = new Date(cycle.windowOpen).getTime();
        const close = new Date(cycle.windowClose).getTime();
        if (now < open) {
          return NextResponse.json(
            { error: `${quarter} ${year} check-in window opens on ${new Date(open).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.` },
            { status: 403 }
          );
        }
        if (now > close) {
          return NextResponse.json(
            { error: `${quarter} ${year} check-in window closed on ${new Date(close).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}. Contact admin to reopen.` },
            { status: 403 }
          );
        }
      }
      // If no ACTIVE Cycle for this quarter → allow (admin can deactivate to allow ad-hoc entry).
    }

    const computedScore = computeScore(goal, actualValue);

    const achievement = await Achievement.findOneAndUpdate(
      { goalId, quarter, year, employeeId: session.user.id },
      { actualValue, progressStatus: progressStatus || 'on_track', computedScore },
      { new: true, upsert: true }
    ).populate('goalId').populate('employeeId', 'name email');

    // Sync to linked employees if this is a shared goal and the current user is the primary owner
    if (
      goal.isShared &&
      goal.primaryOwnerId &&
      String(goal.primaryOwnerId) === String(session.user.id) &&
      goal.linkedEmployeeIds?.length
    ) {
      // Find all goals linked to this shared goal (same primary owner, title, same shared group)
      const linkedGoals = await Goal.find({
        isShared: true,
        primaryOwnerId: goal.primaryOwnerId,
        title: goal.title,
        employeeId: { $in: goal.linkedEmployeeIds, $ne: session.user.id },
      });

      await Promise.all(
        linkedGoals.map((linkedGoal) =>
          Achievement.findOneAndUpdate(
            { goalId: linkedGoal._id, quarter, year, employeeId: linkedGoal.employeeId },
            { actualValue, progressStatus: progressStatus || 'on_track', computedScore },
            { new: true, upsert: true }
          )
        )
      );
    }

    return NextResponse.json(achievement, { status: 201 });
  } catch (error) {
    console.error('POST /api/achievements error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
