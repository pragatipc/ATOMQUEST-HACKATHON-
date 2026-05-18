import mongoose, { Schema, Document } from 'mongoose';

export interface IEscalationRule extends Document {
  triggerEvent: 'goal_not_submitted' | 'goal_not_approved' | 'checkin_not_done';
  description: string;
  daysThreshold: number;
  notifyRole: string;
  notifyRoles: string[];  // kept for backward compat
  isActive: boolean;
}

const escalationRuleSchema = new Schema<IEscalationRule>(
  {
    triggerEvent: {
      type: String,
      enum: ['goal_not_submitted', 'goal_not_approved', 'checkin_not_done'],
      required: true,
    },
    description: { type: String, default: '' },
    daysThreshold: { type: Number, required: true },
    notifyRole: { type: String, default: 'employee' },
    notifyRoles: [{ type: String }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.EscalationRule ||
  mongoose.model<IEscalationRule>('EscalationRule', escalationRuleSchema);
