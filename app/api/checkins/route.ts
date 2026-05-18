import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import CheckIn from '@/models/CheckIn';
import { sendNotification } from '@/lib/notify';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const quarter = searchParams.get('quarter');
    const year = searchParams.get('year');
    const employeeId = searchParams.get('employeeId');

    const query: Record<string, unknown> = {};

    if (session.user.role === 'manager') {
      query.managerId = session.user.id;
      if (employeeId) query.employeeId = employeeId;
    } else if (session.user.role === 'admin') {
      if (employeeId) query.employeeId = employeeId;
    } else {
      query.employeeId = session.user.id;
    }

    if (quarter) query.quarter = quarter;
    if (year) query.year = parseInt(year);

    const checkIns = await CheckIn.find(query)
      .populate('managerId', 'name email')
      .populate('employeeId', 'name email')
      .sort({ createdAt: -1 });

    return NextResponse.json(checkIns);
  } catch (error) {
    console.error('GET /api/checkins error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'manager') {
      return NextResponse.json({ error: 'Only managers can create check-ins' }, { status: 403 });
    }

    const body = await req.json();
    const { employeeId, quarter, year, comment } = body;

    await dbConnect();

    if (!employeeId || !quarter || !year) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Upsert: update existing check-in for same manager+employee+quarter+year
    const checkIn = await CheckIn.findOneAndUpdate(
      { managerId: session.user.id, employeeId, quarter, year },
      { comment: comment || '', completedAt: new Date() },
      { new: true, upsert: true }
    ).populate('managerId', 'name email').populate('employeeId', 'name email');

    // Notify the employee that their check-in has been recorded
    await sendNotification({
      userId: employeeId,
      title: 'Check-in completed',
      message: `Your ${quarter} check-in has been recorded by your manager${comment ? ': "' + comment.slice(0, 80) + (comment.length > 80 ? '…' : '') + '"' : '.'}`,
      type: 'checkin_recorded',
      link: '/checkins',
    });

    return NextResponse.json(checkIn, { status: 201 });
  } catch (error) {
    console.error('POST /api/checkins error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
