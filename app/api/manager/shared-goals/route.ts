import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import Goal from '@/models/Goal';
import User from '@/models/User';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'manager') {
      return NextResponse.json({ error: 'Only managers can create shared goals' }, { status: 403 });
    }

    const body = await req.json();
    const { thrustArea, title, description, uomType, target, weightage, linkedEmployeeIds, primaryOwnerId } =
      body;

    if (!thrustArea || !title || !description || !uomType || target === undefined || !weightage) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!linkedEmployeeIds?.length) {
      return NextResponse.json({ error: 'Select at least one team member' }, { status: 400 });
    }

    await dbConnect();

    const reports = await User.find({
      _id: { $in: linkedEmployeeIds },
      managerId: session.user.id,
    });

    if (reports.length !== linkedEmployeeIds.length) {
      return NextResponse.json({ error: 'Invalid team members selected' }, { status: 400 });
    }

    const created = await Promise.all(
      linkedEmployeeIds.map((empId: string) =>
        Goal.create({
          employeeId: empId,
          thrustArea,
          title,
          description,
          uomType,
          target,
          weightage,
          status: 'draft',
          isShared: true,
          sharedBy: session.user.id,
          primaryOwnerId: primaryOwnerId || empId,
          linkedEmployeeIds,
        })
      )
    );

    return NextResponse.json({ success: true, goals: created }, { status: 201 });
  } catch (error) {
    console.error('POST /api/manager/shared-goals error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
