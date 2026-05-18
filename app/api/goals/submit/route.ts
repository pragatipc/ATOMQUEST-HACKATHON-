import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import Goal from '@/models/Goal';
import User from '@/models/User';
import { sendGoalSubmissionEmail } from '@/lib/email';
import { sendNotification } from '@/lib/notify';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Get all employee's goals
    const goals = await Goal.find({
      employeeId: session.user.id,
    });

    // Calculate total weightage
    const totalWeightage = goals.reduce((sum, g) => sum + g.weightage, 0);

    if (totalWeightage !== 100) {
      return NextResponse.json(
        { error: `Total weightage is ${totalWeightage}%, must be exactly 100%` },
        { status: 400 }
      );
    }

    // Update draft and rework goals to submitted
    await Goal.updateMany(
      { employeeId: session.user.id, status: { $in: ['draft', 'rework'] } },
      { status: 'submitted' }
    );

    // Notify manager
    const employee = await User.findById(session.user.id);
    const manager = employee?.managerId ? await User.findById(employee.managerId) : null;

    if (manager) {
      await sendGoalSubmissionEmail(manager.email, manager.name, employee?.name || 'Employee');
      await sendNotification({
        userId: manager._id,
        title: 'Goals submitted for approval',
        message: `${employee?.name || 'An employee'} has submitted their goals for your review.`,
        type: 'goal_submitted',
        link: '/manager/approvals',
      });
    }

    // Confirm to employee
    if (employee) {
      await sendNotification({
        userId: employee._id,
        title: 'Goals submitted successfully',
        message: 'Your goals have been sent to your manager for review. You will be notified once they are reviewed.',
        type: 'goal_submitted',
        link: '/goals',
      });
    }

    return NextResponse.json({ success: true, message: 'Goals submitted successfully' });
  } catch (error) {
    console.error('POST /api/goals/submit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
