import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import User from '@/models/User';
import Goal from '@/models/Goal';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'manager') {
      return NextResponse.json({ error: 'Only managers can view team' }, { status: 403 });
    }

    await dbConnect();

    const team = await User.find({ managerId: session.user.id, role: 'employee' })
      .select('-password')
      .sort({ name: 1 });

    const teamWithStats = await Promise.all(
      team.map(async (member) => {
        const goals = await Goal.find({ employeeId: member._id });
        const locked = goals.filter((g) => g.status === 'locked').length;
        const submitted = goals.filter((g) => g.status === 'submitted').length;
        return {
          ...member.toObject(),
          goalCount: goals.length,
          lockedGoals: locked,
          pendingApproval: submitted > 0,
        };
      })
    );

    return NextResponse.json(teamWithStats);
  } catch (error) {
    console.error('GET /api/manager/team error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
