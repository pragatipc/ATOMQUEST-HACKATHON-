const BREVO_API_KEY = process.env.BREVO_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@goaltrack.com';
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'GoalTrack HR';
const TEAMS_WEBHOOK_URL = process.env.TEAMS_WEBHOOK_URL || '';
const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

// ─── Email via Brevo ────────────────────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string) {
  if (!BREVO_API_KEY) {
    console.log(`[Email skipped — no BREVO_API_KEY] To: ${to} | ${subject}`);
    return;
  }
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    console.log(`[Email skipped — invalid address] ${to}`);
    return;
  }
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: { name: EMAIL_FROM_NAME, email: EMAIL_FROM },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });
    if (!res.ok) console.error('Brevo error:', await res.text());
  } catch (err) {
    console.error('Email send error:', err);
  }
}

// ─── Teams Adaptive Card via Incoming Webhook ───────────────────────────────

async function sendTeamsCard(title: string, message: string, link?: string) {
  if (!TEAMS_WEBHOOK_URL) return;
  const body: Record<string, unknown> = {
    '@type': 'MessageCard',
    '@context': 'http://schema.org/extensions',
    themeColor: '4F46E5',
    summary: title,
    sections: [{ activityTitle: `**GoalTrack** — ${title}`, activityText: message }],
  };
  if (link) {
    body.potentialAction = [{
      '@type': 'OpenUri',
      name: 'Open in GoalTrack',
      targets: [{ os: 'default', uri: `${APP_URL}${link}` }],
    }];
  }
  try {
    await fetch(TEAMS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error('Teams webhook error:', err);
  }
}

// ─── Public functions ───────────────────────────────────────────────────────

export async function sendGoalSubmissionEmail(managerEmail: string, managerName: string, employeeName: string) {
  await sendEmail(
    managerEmail,
    `[GoalTrack] Goal submission from ${employeeName}`,
    `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
      <div style="background:#4F46E5;padding:24px;border-radius:8px 8px 0 0">
        <h2 style="color:#fff;margin:0">GoalTrack</h2>
      </div>
      <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-radius:0 0 8px 8px">
        <p>Hi <strong>${managerName}</strong>,</p>
        <p><strong>${employeeName}</strong> has submitted their annual goals for your review and approval.</p>
        <p><a href="${APP_URL}/manager/approvals" style="background:#4F46E5;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">Review goals →</a></p>
      </div>
    </div>`
  );
  await sendTeamsCard(
    `Goal submission from ${employeeName}`,
    `${employeeName} has submitted their goals for your review.`,
    '/manager/approvals'
  );
}

export async function sendGoalApprovalEmail(employeeEmail: string, employeeName: string, managerName: string) {
  await sendEmail(
    employeeEmail,
    '[GoalTrack] Your goals have been approved',
    `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
      <div style="background:#059669;padding:24px;border-radius:8px 8px 0 0">
        <h2 style="color:#fff;margin:0">GoalTrack</h2>
      </div>
      <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-radius:0 0 8px 8px">
        <p>Hi <strong>${employeeName}</strong>,</p>
        <p>Great news! <strong>${managerName}</strong> has approved your goals. They are now locked and ready for quarterly tracking.</p>
        <p><a href="${APP_URL}/goals" style="background:#059669;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">View my goals →</a></p>
      </div>
    </div>`
  );
  await sendTeamsCard('Your goals have been approved', `${managerName} approved your goals. Start logging achievements in Check-ins.`, '/goals');
}

export async function sendGoalReworkEmail(employeeEmail: string, employeeName: string, managerName: string, comment: string) {
  await sendEmail(
    employeeEmail,
    '[GoalTrack] Your goals need revision',
    `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
      <div style="background:#D97706;padding:24px;border-radius:8px 8px 0 0">
        <h2 style="color:#fff;margin:0">GoalTrack</h2>
      </div>
      <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-radius:0 0 8px 8px">
        <p>Hi <strong>${employeeName}</strong>,</p>
        <p><strong>${managerName}</strong> has returned your goals for revision.</p>
        <blockquote style="border-left:4px solid #D97706;margin:16px 0;padding:12px 16px;background:#fffbeb;border-radius:0 6px 6px 0">
          ${comment}
        </blockquote>
        <p><a href="${APP_URL}/goals" style="background:#D97706;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">Update my goals →</a></p>
      </div>
    </div>`
  );
  await sendTeamsCard('Goal revision requested', `${managerName}: "${comment}"`, '/goals');
}

export async function sendCheckInWindowEmail(employeeEmail: string, employeeName: string, quarter: string) {
  await sendEmail(
    employeeEmail,
    `[GoalTrack] ${quarter} check-in window is open`,
    `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
      <div style="background:#4F46E5;padding:24px;border-radius:8px 8px 0 0">
        <h2 style="color:#fff;margin:0">GoalTrack</h2>
      </div>
      <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-radius:0 0 8px 8px">
        <p>Hi <strong>${employeeName}</strong>,</p>
        <p>The <strong>${quarter}</strong> check-in window is now open. Please log your actual achievements against your targets.</p>
        <p><a href="${APP_URL}/checkins" style="background:#4F46E5;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">Log achievements →</a></p>
      </div>
    </div>`
  );
  await sendTeamsCard(`${quarter} check-in window open`, `Hi ${employeeName}, please log your ${quarter} actuals.`, '/checkins');
}

export async function sendEscalationEmail(to: string, toName: string, subject: string, body: string) {
  await sendEmail(to, `[GoalTrack Escalation] ${subject}`, `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
      <div style="background:#DC2626;padding:24px;border-radius:8px 8px 0 0">
        <h2 style="color:#fff;margin:0">GoalTrack — Escalation Alert</h2>
      </div>
      <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-radius:0 0 8px 8px">
        <p>Hi <strong>${toName}</strong>,</p>
        <p>${body}</p>
        <p><a href="${APP_URL}" style="background:#DC2626;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">Open GoalTrack →</a></p>
      </div>
    </div>`
  );
  await sendTeamsCard(`Escalation: ${subject}`, body);
}
