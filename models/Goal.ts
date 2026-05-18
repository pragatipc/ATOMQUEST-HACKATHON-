import mongoose, { Schema, Document } from 'mongoose';

export interface IGoal extends Document {
  employeeId: mongoose.Types.ObjectId;
  thrustArea: string;
  title: string;
  description: string;
  uomType: 'numeric_min' | 'numeric_max' | 'timeline' | 'zero';
  target: number | Date;
  weightage: number;
  status: 'draft' | 'submitted' | 'approved' | 'rework' | 'locked';
  isShared: boolean;
  sharedBy?: mongoose.Types.ObjectId;
  primaryOwnerId?: mongoose.Types.ObjectId;
  linkedEmployeeIds?: mongoose.Types.ObjectId[];
  managerComment?: string;
  createdAt: Date;
  updatedAt: Date;
}

const goalSchema = new Schema<IGoal>(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    thrustArea: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    uomType: {
      type: String,
      enum: ['numeric_min', 'numeric_max', 'timeline', 'zero'],
      required: true,
    },
    target: {
      type: Schema.Types.Mixed,
      required: true,
    },
    weightage: {
      type: Number,
      required: true,
      min: 10,
      max: 100,
    },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'approved', 'rework', 'locked'],
      default: 'draft',
    },
    isShared: {
      type: Boolean,
      default: false,
    },
    sharedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    primaryOwnerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    linkedEmployeeIds: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    managerComment: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// ── Indexes for fast queries (BIG win on Atlas reads) ─────────────────────
goalSchema.index({ employeeId: 1, status: 1 });
goalSchema.index({ status: 1 });
goalSchema.index({ employeeId: 1, createdAt: -1 });

export default mongoose.models.Goal || mongoose.model<IGoal>('Goal', goalSchema);
