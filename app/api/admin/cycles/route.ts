import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import Cycle from '@/models/Cycle';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can view cycles' }, { status: 403 });
    }

    await dbConnect();

    const cycles = await Cycle.find().sort({ year: -1, phase: -1 });

    return NextResponse.json(cycles);
  } catch (error) {
    console.error('GET /api/admin/cycles error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can create cycles' }, { status: 403 });
    }

    const body = await req.json();
    const { year, phase, windowOpen, windowClose, isActive } = body;

    if (!year || !phase || !windowOpen || !windowClose) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await dbConnect();

    const cycle = new Cycle({
      year,
      phase,
      windowOpen: new Date(windowOpen),
      windowClose: new Date(windowClose),
      isActive: isActive || false,
    });

    await cycle.save();

    return NextResponse.json(cycle, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/cycles error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can update cycles' }, { status: 403 });
    }

    const body = await req.json();
    const { id, windowOpen, windowClose, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing cycle ID' }, { status: 400 });
    }

    await dbConnect();

    const cycle = await Cycle.findByIdAndUpdate(
      id,
      {
        windowOpen: windowOpen ? new Date(windowOpen) : undefined,
        windowClose: windowClose ? new Date(windowClose) : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      },
      { new: true }
    );

    if (!cycle) {
      return NextResponse.json({ error: 'Cycle not found' }, { status: 404 });
    }

    return NextResponse.json(cycle);
  } catch (error) {
    console.error('PUT /api/admin/cycles error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
