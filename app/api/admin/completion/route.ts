import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import User from '@/models/User';
import Achievement from '@/models/Achievement';
import CheckIn from '@/models/CheckIn';
import Goal from '@/models/Goal';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const quarter = searchParams.get('quarter') || `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

    const employees = await User.find({ role: 'employee', isActive: { $ne: false } })
      .select('name email department managerId')
      .populate('managerId', 'name');

    const managers = await User.find({ role: 'manager', isActive: { $ne: false } })
      .select('name email department');

    const lockedGoalsByEmployee = await Goal.aggregate([
      { $match: { status: { $in: ['locked', 'approved'] } } },
      { $group: { _id: '$employeeId', count: { $sum: 1 } } },
    ]);
    const lockedGoalMap = new Map(lockedGoalsByEmployee.map((r) => [String(r._id), r.count]));

    const achievements = await Achievement.find({ quarter, year }).distinct('employeeId');
    const achSet = new Set(achievements.map(String));

    const checkins = await CheckIn.find({ quarter, year });
    const checkinEmployeeSet = new Set(checkins.map((c) => String(c.employeeId)));
    const checkinManagerSet = new Set(checkins.map((c) => String(c.managerId)));

    const employeeStatus = employees.map((emp) => {
      const eid = String(emp._id);
      const hasGoals = (lockedGoalMap.get(eid) || 0) > 0;
      const hasAchievements = achSet.has(eid);
      const hasManagerCheckin = checkinEmployeeSet.has(eid);
      const mgr = emp.managerId as { name?: string } | null;
      return {
        _id: eid,
        name: emp.name,
        email: emp.email,
        department: emp.department || '—',
        manager: mgr?.name || '—',
        lockedGoals: lockedGoalMap.get(eid) || 0,
        hasGoals,
        achievementLogged: hasAchievements,
        managerCheckinDone: hasManagerCheckin,
        fullyComplete: hasGoals && hasAchievements && hasManagerCheckin,
      };
    });

    const managerStatus = managers.map((mgr) => {
      const mid = String(mgr._id);
      const hasCheckin = checkinManagerSet.has(mid);
      const teamCount = employees.filter((e) => String((e.managerId as { _id?: string } | null)?._id || e.managerId) === mid).length;
      const checkinsDone = checkins.filter((c) => String(c.managerId) === mid).length;
      return {
        _id: mid,
        name: mgr.name,
        email: mgr.email,
        teamCount,
        checkinsDone,
        fullyComplete: hasCheckin,
      };
    });

    const totalEmployees = employeeStatus.length;
    const completedEmployees = employeeStatus.filter((e) => e.achievementLogged).length;
    const fullyCompleted = employeeStatus.filter((e) => e.fullyComplete).length;
    const completedManagers = managerStatus.filter((m) => m.fullyComplete).length;

    return NextResponse.json({
      quarter,
      year,
      summary: {
        totalEmployees,
        achievementLoggedCount: completedEmployees,
        fullyCompletedCount: fullyCompleted,
        completedManagers,
        totalManagers: managerStatus.length,
        completionRate: totalEmployees > 0 ? Math.round((completedEmployees / totalEmployees) * 100) : 0,
      },
      employees: employeeStatus,
      managers: managerStatus,
    });
  } catch (error) {
    console.error('GET /api/admin/completion error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
