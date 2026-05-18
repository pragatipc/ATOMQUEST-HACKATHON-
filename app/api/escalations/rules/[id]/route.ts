import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import EscalationRule from '@/models/EscalationRule';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admins only' }, { status: 403 });
    }

    const { daysThreshold, isActive } = await req.json();

    if (daysThreshold !== undefined && (isNaN(daysThreshold) || daysThreshold < 1)) {
      return NextResponse.json({ error: 'daysThreshold must be >= 1' }, { status: 400 });
    }

    await dbConnect();

    const rule = await EscalationRule.findByIdAndUpdate(
      params.id,
      {
        ...(daysThreshold !== undefined && { daysThreshold: Number(daysThreshold) }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
      { new: true }
    );

    if (!rule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    return NextResponse.json(rule);
  } catch (error) {
    console.error('PUT /api/escalations/rules/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
