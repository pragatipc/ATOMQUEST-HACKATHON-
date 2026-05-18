import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import EscalationRule from '@/models/EscalationRule';
import EscalationLog from '@/models/EscalationLog';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can view escalations' }, { status: 403 });
    }

    await dbConnect();

    const [rules, logs] = await Promise.all([
      EscalationRule.find().sort({ createdAt: -1 }),
      EscalationLog.find()
        .populate('ruleId')
        .populate('employeeId', 'name email department')
        .sort({ triggeredAt: -1 })
        .limit(50),
    ]);

    return NextResponse.json({ rules, logs });
  } catch (error) {
    console.error('GET /api/admin/escalations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can manage escalations' }, { status: 403 });
    }

    const body = await req.json();
    await dbConnect();

    if (body.id) {
      const rule = await EscalationRule.findByIdAndUpdate(
        body.id,
        {
          triggerEvent: body.triggerEvent,
          daysThreshold: body.daysThreshold,
          notifyRoles: body.notifyRoles,
          isActive: body.isActive,
        },
        { new: true }
      );
      return NextResponse.json(rule);
    }

    const rule = await EscalationRule.create({
      triggerEvent: body.triggerEvent,
      daysThreshold: body.daysThreshold,
      notifyRoles: body.notifyRoles || ['manager', 'admin'],
      isActive: body.isActive !== false,
    });

    return NextResponse.json(rule, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/escalations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can manage escalations' }, { status: 403 });
    }

    const { logId, status } = await req.json();
    await dbConnect();

    const log = await EscalationLog.findByIdAndUpdate(
      logId,
      {
        status,
        resolvedAt: status === 'resolved' ? new Date() : null,
      },
      { new: true }
    )
      .populate('ruleId')
      .populate('employeeId', 'name email');

    return NextResponse.json(log);
  } catch (error) {
    console.error('PUT /api/admin/escalations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
