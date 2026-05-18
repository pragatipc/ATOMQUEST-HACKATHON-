import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import User from '@/models/User';
import Goal from '@/models/Goal';
import CheckIn from '@/models/CheckIn';
import Achievement from '@/models/Achievement';
import { getCurrentQuarter } from '@/lib/utils';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admins only' }, { status: 403 });
    }

    await dbConnect();

    const year = new Date().getFullYear();
    const quarter = getCurrentQuarter();

    const managers = (await User.find({ role: 'manager', isActive: true })
      .select('name department')
      .lean()) as unknown as { _id: unknown; name: string; department?: string }[];

    const result = await Promise.all(
      managers.map(async (mgr) => {
        const teamMembers = (await User.find({ managerId: mgr._id, isActive: true })
          .select('_id')
          .lean()) as unknown as { _id: unknown }[];
        const teamSize = teamMembers.length;
        const teamIds = teamMembers.map(t => t._id);

        // Goals approved/locked
        let goalsApproved = 0;
        if (teamSize > 0) {
          const empsWithLocked = await Goal.distinct('employeeId', {
            employeeId: { $in: teamIds },
            status: { $in: ['locked', 'approved'] },
          });
          goalsApproved = empsWithLocked.length;
        }
        const approvalRate = teamSize > 0 ? Math.round((goalsApproved / teamSize) * 100) : 0;

        // Check-ins completed for current quarter by this manager
        let checkinsCompleted = 0;
        if (teamSize > 0) {
          checkinsCompleted = await CheckIn.countDocuments({
            managerId: mgr._id,
            employeeId: { $in: teamIds },
            quarter,
            year,
          });
        }
        const checkinRate = teamSize > 0 ? Math.round((checkinsCompleted / teamSize) * 100) : 0;

        // Avg team score from all Achievement records
        let avgTeamScore = 0;
        if (teamSize > 0) {
          const achievements = (await Achievement.find({ employeeId: { $in: teamIds } })
            .select('computedScore')
            .lean()) as unknown as { computedScore: number }[];
          if (achievements.length > 0) {
            const sum = achievements.reduce((s, a) => s + (a.computedScore || 0), 0);
            avgTeamScore = Math.round(sum / achievements.length);
          }
        }

        return {
          managerName: mgr.name,
          department: mgr.department || 'Unassigned',
          teamSize,
          goalsApproved,
          approvalRate,
          checkinsCompleted,
          checkinRate,
          avgTeamScore,
        };
      })
    );

    // Sort primarily by avg team score (best-performing team wins).
    // Tiebreakers: check-in rate, then approval rate.
    result.sort((a, b) => {
      if (b.avgTeamScore !== a.avgTeamScore) return b.avgTeamScore - a.avgTeamScore;
      if (b.checkinRate !== a.checkinRate)   return b.checkinRate - a.checkinRate;
      return b.approvalRate - a.approvalRate;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/analytics/manager-effectiveness error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
