import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import Goal from '@/models/Goal';
import Achievement from '@/models/Achievement';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const quarter = searchParams.get('quarter') || '';
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

    const goals = await Goal.find({ status: { $in: ['locked', 'approved'] } })
      .populate('employeeId', 'name email department managerId')
      .sort({ 'employeeId': 1, createdAt: 1 });

    const achievementQuery: Record<string, unknown> = { year };
    if (quarter) achievementQuery.quarter = quarter;

    const achievements = await Achievement.find(achievementQuery)
      .populate('goalId', 'title weightage uomType target');

    const achMap = new Map<string, Record<string, { actualValue: number | string; computedScore: number; progressStatus: string }>>();
    for (const a of achievements) {
      const gid = String(a.goalId?._id || a.goalId);
      if (!achMap.has(gid)) achMap.set(gid, {});
      achMap.get(gid)![a.quarter] = {
        actualValue: a.actualValue,
        computedScore: a.computedScore,
        progressStatus: a.progressStatus,
      };
    }

    const rows = goals.map((g) => {
      const emp = g.employeeId as { name?: string; email?: string; department?: string } | null;
      const goalAch = achMap.get(String(g._id)) || {};
      const quarters = quarter ? [quarter] : ['Q1', 'Q2', 'Q3', 'Q4'];

      const result: Record<string, unknown> = {
        employee: emp?.name || '—',
        email: emp?.email || '—',
        department: emp?.department || '—',
        goalTitle: g.title,
        thrustArea: g.thrustArea,
        uomType: g.uomType,
        target: String(g.target),
        weightage: g.weightage,
      };

      let totalScore = 0;
      let scoreCount = 0;
      for (const q of ['Q1', 'Q2', 'Q3', 'Q4']) {
        const qd = goalAch[q];
        result[`${q}_actual`] = qd ? String(qd.actualValue) : '—';
        result[`${q}_score`] = qd ? `${qd.computedScore}%` : '—';
        if (qd) { totalScore += qd.computedScore; scoreCount++; }
      }

      result.avgScore = scoreCount > 0 ? `${Math.round(totalScore / scoreCount)}%` : '—';

      return result;
    });

    return NextResponse.json({ rows, total: rows.length });
  } catch (error) {
    console.error('GET /api/admin/reports error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
