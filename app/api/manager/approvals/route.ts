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
      return NextResponse.json({ error: 'Only managers can view approvals' }, { status: 403 });
    }

    await dbConnect();

    const reports = await User.find({ managerId: session.user.id, role: 'employee' }).select(
      '-password'
    );

    const pending = await Promise.all(
      reports.map(async (employee) => {
        const goals = await Goal.find({
          employeeId: employee._id,
          status: 'submitted',
        }).sort({ createdAt: -1 });
        if (goals.length === 0) return null;
        const totalWeightage = goals.reduce((sum, g) => sum + g.weightage, 0);
        return {
          employee: {
            _id: employee._id,
            name: employee.name,
            email: employee.email,
            department: employee.department,
          },
          goals,
          totalWeightage,
          submittedAt: goals[0]?.updatedAt,
        };
      })
    );

    return NextResponse.json(pending.filter(Boolean));
  } catch (error) {
    console.error('GET /api/manager/approvals error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
