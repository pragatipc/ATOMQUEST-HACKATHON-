import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import User from '@/models/User';
import Cycle from '@/models/Cycle';
import Achievement from '@/models/Achievement';
import { getCurrentQuarter } from '@/lib/utils';

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'] as const;
type QuarterKey = typeof QUARTERS[number];

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admins only' }, { status: 403 });
    }

    await dbConnect();

    const year = new Date().getFullYear();
    const now = new Date();

    // Build status per quarter: 'active' (now within window) / 'past' / 'future'
    const cycles = (await Cycle.find({ year }).lean()) as unknown as {
      phase: string; windowOpen: Date; windowClose: Date; isActive: boolean;
    }[];

    const currentQ = getCurrentQuarter();
    const qStatus: Record<QuarterKey, 'active' | 'past' | 'future'> = {
      Q1: 'future', Q2: 'future', Q3: 'future', Q4: 'future',
    };

    // Determine quarter status — prefer cycle data if available, else use calendar
    const monthStart: Record<QuarterKey, number> = { Q1: 0, Q2: 3, Q3: 6, Q4: 9 };
    for (const q of QUARTERS) {
      const cycle = cycles.find(c => c.phase === q);
      if (cycle) {
        const open = new Date(cycle.windowOpen);
        const close = new Date(cycle.windowClose);
        if (now < open) qStatus[q] = 'future';
        else if (now > close) qStatus[q] = 'past';
        else qStatus[q] = 'active';
      } else {
        const startDate = new Date(year, monthStart[q], 1);
        const endDate = new Date(year, monthStart[q] + 3, 0);
        if (now < startDate) qStatus[q] = 'future';
        else if (now > endDate) qStatus[q] = 'past';
        else qStatus[q] = 'active';
      }
    }
    // Make sure current calendar quarter is at least active if nothing else says
    if (qStatus[currentQ] === 'future') qStatus[currentQ] = 'active';

    // Fetch employees
    const employees = (await User.find({ role: 'employee', isActive: true })
      .select('name department')
      .sort({ name: 1 })
      .lean()) as unknown as { _id: unknown; name: string; department?: string }[];

    // Fetch all achievements for the year
    const achievements = (await Achievement.find({ year }).select('employeeId quarter').lean()) as unknown as {
      employeeId: { toString(): string }; quarter: QuarterKey;
    }[];

    const doneSet = new Set<string>(
      achievements.map(a => `${a.employeeId.toString()}::${a.quarter}`)
    );

    const result = employees.map(emp => {
      const row: Record<string, string> = {
        employeeName: emp.name,
        department: emp.department || 'Unassigned',
      };
      const empIdStr = String(emp._id);
      for (const q of QUARTERS) {
        const has = doneSet.has(`${empIdStr}::${q}`);
        if (has) row[q] = 'done';
        else if (qStatus[q] === 'active' || qStatus[q] === 'past') row[q] = 'pending';
        else row[q] = 'na';
      }
      return row;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/analytics/heatmap error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
