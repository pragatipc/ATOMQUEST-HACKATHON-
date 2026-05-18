import mongoose, { Schema, Document } from 'mongoose';

export interface IAchievement extends Document {
  goalId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  year: number;
  actualValue: number | Date;
  progressStatus: 'not_started' | 'on_track' | 'completed';
  computedScore: number;
  updatedAt: Date;
}

const achievementSchema = new Schema<IAchievement>(
  {
    goalId: {
      type: Schema.Types.ObjectId,
      ref: 'Goal',
      required: true,
    },
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    quarter: {
      type: String,
      enum: ['Q1', 'Q2', 'Q3', 'Q4'],
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    actualValue: {
      type: Schema.Types.Mixed,
      required: true,
    },
    progressStatus: {
      type: String,
      enum: ['not_started', 'on_track', 'completed'],
      default: 'not_started',
    },
    computedScore: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

achievementSchema.index({ goalId: 1, quarter: 1, year: 1 }, { unique: true });
achievementSchema.index({ employeeId: 1, year: 1 });
achievementSchema.index({ employeeId: 1, quarter: 1, year: 1 });

export default mongoose.models.Achievement || mongoose.model<IAchievement>('Achievement', achievementSchema);
