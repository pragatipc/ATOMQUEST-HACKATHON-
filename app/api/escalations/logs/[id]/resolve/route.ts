import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import EscalationLog from '@/models/EscalationLog';

export async function PUT(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admins only' }, { status: 403 });
    }

    await dbConnect();

    const log = await EscalationLog.findByIdAndUpdate(
      params.id,
      { status: 'resolved', resolvedAt: new Date() },
      { new: true }
    )
      .populate('employeeId', 'name email department')
      .populate('ruleId', 'triggerEvent description');

    if (!log) {
      return NextResponse.json({ error: 'Log entry not found' }, { status: 404 });
    }

    return NextResponse.json(log);
  } catch (error) {
    console.error('PUT /api/escalations/logs/[id]/resolve error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
