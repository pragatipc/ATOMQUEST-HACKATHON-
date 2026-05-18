import mongoose, { Schema, models } from 'mongoose';

const NotificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ['goal_submitted', 'goal_approved', 'goal_rework', 'goal_locked', 'checkin_recorded', 'goal_unlocked', 'system'],
      default: 'system',
    },
    read: { type: Boolean, default: false },
    link: { type: String },
  },
  { timestamps: true }
);

export default models.Notification || mongoose.model('Notification', NotificationSchema);
