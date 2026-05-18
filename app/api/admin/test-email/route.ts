import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const { to } = await req.json();
    if (!to) return NextResponse.json({ error: 'to email required' }, { status: 400 });

    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@company.com';

    if (!BREVO_API_KEY) {
      return NextResponse.json({ error: 'BREVO_API_KEY not set in .env.local' }, { status: 400 });
    }

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: { name: 'GoalTrack HR', email: EMAIL_FROM },
        to: [{ email: to }],
        subject: 'GoalTrack — Test Email ✓',
        htmlContent: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <div style="background:#4F46E5;padding:20px;border-radius:8px 8px 0 0">
            <h2 style="color:#fff;margin:0">GoalTrack</h2>
          </div>
          <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-radius:0 0 8px 8px">
            <p>✅ <strong>Email integration is working!</strong></p>
            <p>This test was sent from the GoalTrack admin panel to verify Brevo is configured correctly.</p>
            <p style="color:#94a3b8;font-size:12px">Sender: ${EMAIL_FROM} · Time: ${new Date().toISOString()}</p>
          </div>
        </div>`,
      }),
    });

    const body = await res.text();
    if (!res.ok) {
      return NextResponse.json({ error: `Brevo error (${res.status}): ${body}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: `Test email sent to ${to}`, brevoResponse: body });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
