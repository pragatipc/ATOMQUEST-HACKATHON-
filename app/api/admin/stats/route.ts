import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import User from '@/models/User';
import Goal from '@/models/Goal';
import CheckIn from '@/models/CheckIn';
import Achievement from '@/models/Achievement';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can view stats' }, { status: 403 });
    }

    await dbConnect();

    const currentYear = new Date().getFullYear();
    const currentQuarter = `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;

    // Get stats
    const totalEmployees = await User.countDocuments({ role: 'employee' });
    const approvedGoalsCount = await Goal.countDocuments({ status: 'locked' });
    const submittedGoalsCount = await Goal.countDocuments({ status: 'submitted' });
    const checkInsCompleted = await CheckIn.countDocuments({
      quarter: currentQuarter,
      year: currentYear,
    });
    const checkInsRequired = totalEmployees;

    // Department breakdown
    const departments = await User.aggregate([
      { $match: { role: 'employee' } },
      { $group: { _id: '$department', count: { $sum: 1 } } },
    ]);

    // Average score by department
    const scoreByDept = await Achievement.aggregate([
      { $match: { quarter: currentQuarter, year: currentYear } },
      {
        $lookup: {
          from: 'goals',
          localField: 'goalId',
          foreignField: '_id',
          as: 'goal',
        },
      },
      { $unwind: '$goal' },
      {
        $lookup: {
          from: 'users',
          localField: 'employeeId',
          foreignField: '_id',
          as: 'employee',
        },
      },
      { $unwind: '$employee' },
      {
        $group: {
          _id: '$employee.department',
          avgScore: { $avg: '$computedScore' },
        },
      },
    ]);

    return NextResponse.json({
      totalEmployees,
      approvedGoalsCount,
      submittedGoalsCount,
      checkInsCompleted,
      checkInsRequired,
      checkInPercentage:
        checkInsRequired > 0 ? Math.round((checkInsCompleted / checkInsRequired) * 100) : 0,
      departments,
      scoreByDept,
    });
  } catch (error) {
    console.error('GET /api/admin/stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
