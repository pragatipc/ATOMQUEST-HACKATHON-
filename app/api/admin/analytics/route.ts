import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import Goal from '@/models/Goal';
import Achievement from '@/models/Achievement';
import User from '@/models/User';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can view analytics' }, { status: 403 });
    }

    await dbConnect();
    const year = new Date().getFullYear();

    const goalsByStatus = await Goal.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const quarterlyScores = await Achievement.aggregate([
      { $match: { year } },
      {
        $group: {
          _id: '$quarter',
          avgScore: { $avg: '$computedScore' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // QoQ trend: compare this year vs last year per quarter
    const qoqTrend = await Achievement.aggregate([
      { $match: { year: { $in: [year - 1, year] } } },
      {
        $group: {
          _id: { quarter: '$quarter', year: '$year' },
          avgScore: { $avg: '$computedScore' },
        },
      },
      { $sort: { '_id.year': 1, '_id.quarter': 1 } },
    ]);

    // Thrust area performance
    const thrustAreaPerf = await Goal.aggregate([
      { $match: { status: { $in: ['locked', 'approved'] } } },
      {
        $lookup: {
          from: 'achievements',
          let: { gid: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$goalId', '$$gid'] }, year } },
            { $group: { _id: null, avg: { $avg: '$computedScore' } } },
          ],
          as: 'scores',
        },
      },
      {
        $group: {
          _id: '$thrustArea',
          avgScore: { $avg: { $ifNull: [{ $arrayElemAt: ['$scores.avg', 0] }, 0] } },
          goalCount: { $sum: 1 },
        },
      },
      { $sort: { avgScore: -1 } },
    ]);

    const monthlySubmissions = await Goal.aggregate([
      {
        $match: {
          status: { $in: ['submitted', 'locked', 'approved'] },
          createdAt: { $gte: new Date(year, 0, 1) },
        },
      },
      {
        $group: {
          _id: { $month: '$updatedAt' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const deptPerformance = await User.aggregate([
      { $match: { role: 'employee' } },
      {
        $lookup: {
          from: 'achievements',
          let: { uid: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$employeeId', '$$uid'] }, year } },
            { $group: { _id: null, avg: { $avg: '$computedScore' } } },
          ],
          as: 'scores',
        },
      },
      {
        $project: {
          department: { $ifNull: ['$department', 'Unassigned'] },
          avgScore: { $ifNull: [{ $arrayElemAt: ['$scores.avg', 0] }, 0] },
        },
      },
      {
        $group: {
          _id: '$department',
          avgScore: { $avg: '$avgScore' },
          employees: { $sum: 1 },
        },
      },
    ]);

    // Build QoQ structure: {quarter, thisYear, lastYear}
    const qoqMap: Record<string, { thisYear: number; lastYear: number }> = {};
    for (const q of qoqTrend) {
      const key = q._id.quarter as string;
      if (!qoqMap[key]) qoqMap[key] = { thisYear: 0, lastYear: 0 };
      if (q._id.year === year) qoqMap[key].thisYear = Math.round(q.avgScore || 0);
      else qoqMap[key].lastYear = Math.round(q.avgScore || 0);
    }
    const qoqData = ['Q1', 'Q2', 'Q3', 'Q4'].map((q) => ({
      quarter: q,
      thisYear: qoqMap[q]?.thisYear || 0,
      lastYear: qoqMap[q]?.lastYear || 0,
    }));

    return NextResponse.json({
      goalsByStatus: goalsByStatus.map((g) => ({ status: g._id, count: g.count })),
      quarterlyScores: quarterlyScores.map((q) => ({
        quarter: q._id,
        avgScore: Math.round(q.avgScore || 0),
        count: q.count,
      })),
      qoqData,
      thrustAreaPerf: thrustAreaPerf.map((t) => ({
        thrustArea: t._id,
        avgScore: Math.round(t.avgScore || 0),
        goalCount: t.goalCount,
      })),
      monthlySubmissions: monthlySubmissions.map((m) => ({
        month: m._id,
        count: m.count,
      })),
      deptPerformance: deptPerformance.map((d) => ({
        department: d._id,
        avgScore: Math.round(d.avgScore || 0),
        employees: d.employees,
      })),
    });
  } catch (error) {
    console.error('GET /api/admin/analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
