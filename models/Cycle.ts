import mongoose, { Schema, Document } from 'mongoose';

export interface ICycle extends Document {
  year: number;
  phase: 'goal_setting' | 'Q1' | 'Q2' | 'Q3' | 'Q4';
  windowOpen: Date;
  windowClose: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const cycleSchema = new Schema<ICycle>(
  {
    year: {
      type: Number,
      required: true,
    },
    phase: {
      type: String,
      enum: ['goal_setting', 'Q1', 'Q2', 'Q3', 'Q4'],
      required: true,
    },
    windowOpen: {
      type: Date,
      required: true,
    },
    windowClose: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

cycleSchema.index({ year: 1, phase: 1 }, { unique: true });

export default mongoose.models.Cycle || mongoose.model<ICycle>('Cycle', cycleSchema);
