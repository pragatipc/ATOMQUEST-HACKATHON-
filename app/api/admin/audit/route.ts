import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import AuditLog from '@/models/AuditLog';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can view audit logs' }, { status: 403 });
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const goalId = searchParams.get('goalId');
    const limit = parseInt(searchParams.get('limit') || '100');
    const skip = parseInt(searchParams.get('skip') || '0');

    let query: any = {};
    if (goalId) query.goalId = goalId;

    const logs = await AuditLog.find(query)
      .populate('goalId')
      .populate('changedBy', 'name email')
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(skip);

    const total = await AuditLog.countDocuments(query);

    return NextResponse.json({ logs, total });
  } catch (error) {
    console.error('GET /api/admin/audit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
