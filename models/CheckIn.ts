import mongoose, { Schema, Document } from 'mongoose';

export interface ICheckIn extends Document {
  managerId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  year: number;
  comment: string;
  completedAt: Date;
}

const checkInSchema = new Schema<ICheckIn>(
  {
    managerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
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
    comment: {
      type: String,
      default: '',
    },
    completedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

checkInSchema.index({ managerId: 1, employeeId: 1, quarter: 1, year: 1 }, { unique: true });

export default mongoose.models.CheckIn || mongoose.model<ICheckIn>('CheckIn', checkInSchema);
