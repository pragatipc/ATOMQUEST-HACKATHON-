import Notification from '@/models/Notification';
import mongoose from 'mongoose';

type NotificationType =
  | 'goal_submitted'
  | 'goal_approved'
  | 'goal_rework'
  | 'goal_locked'
  | 'checkin_recorded'
  | 'goal_unlocked'
  | 'system';

export async function sendNotification({
  userId,
  title,
  message,
  type,
  link,
}: {
  userId: string | mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
}) {
  try {
    await Notification.create({ userId, title, message, type, link });
  } catch (err) {
    console.error('sendNotification error:', err);
  }
}
