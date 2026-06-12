import { base44 } from '@/api/base44Client';

export async function createNotification({ user_email, title, body, type = 'info', link = '' }) {
  return base44.entities.Notification.create({ user_email, title, body, type, link });
}

export async function sendEmailSafe(to, subject, body) {
  try {
    await base44.integrations.Core.SendEmail({ to, subject, body });
  } catch (e) { /* non-blocking */ }
}

export function percent(score, max) {
  if (!max) return 0;
  return Math.round((score / max) * 100);
}

export function gradeLetter(pct) {
  if (pct >= 90) return 'A';
  if (pct >= 80) return 'B';
  if (pct >= 70) return 'C';
  if (pct >= 60) return 'D';
  return 'F';
}
