import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import EscalationLog from '@/models/EscalationLog';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admins only' }, { status: 403 });
    }

    await dbConnect();

    const logs = await EscalationLog.find()
      .populate('employeeId', 'name email department')
      .populate('ruleId', 'triggerEvent description')
      .sort({ triggeredAt: -1 });

    // ── Clean up orphaned logs (employee or rule was deleted) ───────────────
    // These show up as "—" rows on the UI and are confusing.
    const orphanIds: unknown[] = [];
    const valid = logs.filter(log => {
      const hasEmployee = !!log.employeeId;
      const hasRule = !!log.ruleId;
      if (!hasEmployee || !hasRule) {
        orphanIds.push(log._id);
        return false;
      }
      return true;
    });

    // Fire-and-forget cleanup so the list stays tidy on subsequent loads
    if (orphanIds.length > 0) {
      EscalationLog.deleteMany({ _id: { $in: orphanIds } }).catch(err =>
        console.error('Orphan log cleanup error:', err)
      );
    }

    return NextResponse.json(valid);
  } catch (error) {
    console.error('GET /api/escalations/logs error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
