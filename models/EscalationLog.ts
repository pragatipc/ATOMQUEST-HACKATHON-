import mongoose, { Schema, Document } from 'mongoose';

export interface IEscalationHop {
  level: number;
  role: string;       // 'employee' | 'manager' | 'admin'
  emailedAt: Date;
  emailTo: string;    // email address that received the notification
}

export interface IEscalationLog extends Document {
  ruleId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  triggerEvent: string;
  triggeredAt: Date;
  daysOverdue: number;
  emailSent: boolean;
  resolvedAt?: Date;
  status: 'pending' | 'resolved';
  // ── Escalation chain fields ─────────────────────────────────────────────
  currentLevel: number;             // 1 = first role, 2 = next, etc.
  nextEscalationAt: Date | null;    // when the chain should advance (null = chain exhausted)
  escalationHistory: IEscalationHop[];
}

const escalationLogSchema = new Schema<IEscalationLog>(
  {
    ruleId: { type: Schema.Types.ObjectId, ref: 'EscalationRule', required: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    triggerEvent: { type: String, default: '' },
    triggeredAt: { type: Date, default: Date.now },
    daysOverdue: { type: Number, default: 0 },
    emailSent: { type: Boolean, default: false },
    resolvedAt: { type: Date, default: null },
    status: { type: String, enum: ['pending', 'resolved'], default: 'pending' },
    // ── Chain fields ──
    currentLevel: { type: Number, default: 1 },
    nextEscalationAt: { type: Date, default: null },
    escalationHistory: [{
      level: { type: Number, required: true },
      role: { type: String, required: true },
      emailedAt: { type: Date, default: Date.now },
      emailTo: { type: String, default: '' },
    }],
  },
  { timestamps: true }
);

export default mongoose.models.EscalationLog ||
  mongoose.model<IEscalationLog>('EscalationLog', escalationLogSchema);
