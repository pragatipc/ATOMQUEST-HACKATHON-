import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import Goal from '@/models/Goal';
import User from '@/models/User';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const status = searchParams.get('status');

    let query: any = {};

    if (employeeId) {
      query.employeeId = employeeId;
    } else if (session.user.role === 'employee') {
      query.employeeId = session.user.id;
    }

    if (status) {
      query.status = status;
    }

    const goals = await Goal.find(query)
      .populate('employeeId', 'name email')
      .populate('sharedBy', 'name')
      .populate('primaryOwnerId', 'name')
      .sort({ createdAt: -1 });

    return NextResponse.json(goals);
  } catch (error) {
    console.error('GET /api/goals error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    await dbConnect();

    // Validation
    const { thrustArea, title, description, uomType, target, weightage } = body;

    if (!thrustArea || !title || !description || !uomType || target === undefined || !weightage) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (weightage < 10 || weightage > 100) {
      return NextResponse.json({ error: 'Weightage must be between 10 and 100' }, { status: 400 });
    }

    // Check total weightage — count ALL active goals including rework (BRD: total must = 100%)
    const existingGoals = await Goal.find({ employeeId: session.user.id });

    const totalWeightage = existingGoals.reduce((sum, g) => sum + g.weightage, 0) + weightage;

    if (totalWeightage > 100) {
      return NextResponse.json(
        { error: `Total weightage would be ${totalWeightage}%, maximum is 100%` },
        { status: 400 }
      );
    }

    // Check max goals limit — count ALL goals (BRD: max 8 per employee)
    if (existingGoals.length >= 8) {
      return NextResponse.json({ error: 'Maximum 8 goals per employee' }, { status: 400 });
    }

    const goal = new Goal({
      employeeId: session.user.id,
      thrustArea,
      title,
      description,
      uomType,
      target,
      weightage,
      status: 'draft',
    });

    await goal.save();
    await goal.populate('employeeId', 'name email');

    return NextResponse.json(goal, { status: 201 });
  } catch (error) {
    console.error('POST /api/goals error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
