import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    await dbConnect();
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return NextResponse.json({
        error: 'Account not found. Contact your HR Admin to get access.',
      }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'Account deactivated. Contact HR admin.' }, { status: 403 });
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      return NextResponse.json({ error: 'Wrong password. Check caps lock and try again.' }, { status: 401 });
    }

    return NextResponse.json({
      ok: true,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    });
  } catch {
    return NextResponse.json({ error: 'Server error. Is MongoDB running?' }, { status: 500 });
  }
}
