import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  goalId: mongoose.Types.ObjectId;
  changedBy: mongoose.Types.ObjectId;
  changeType: string;
  previousValue: Record<string, any>;
  newValue: Record<string, any>;
  timestamp: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    goalId: {
      type: Schema.Types.ObjectId,
      ref: 'Goal',
      required: true,
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    changeType: {
      type: String,
      required: true,
    },
    previousValue: {
      type: Schema.Types.Mixed,
      default: {},
    },
    newValue: {
      type: Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

export default mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
