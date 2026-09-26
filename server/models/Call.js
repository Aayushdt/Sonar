import mongoose from 'mongoose';

const callSchema = new mongoose.Schema(
  {
    caller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // startedAt: when remote media connects or when invite was dispatched
    startedAt: { type: Date, default: Date.now },
    // endedAt: when call terminates or times out
    endedAt: { type: Date, default: Date.now },
    durationSeconds: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['completed', 'missed', 'rejected'],
      default: 'completed',
    },
  },
  { timestamps: true }
);

// ─────────────────────────────────────────────────────────────────────────────
// Indexes for fast history queries and user pair lookups
// ─────────────────────────────────────────────────────────────────────────────
callSchema.index({ caller: 1, receiver: 1, createdAt: -1 });
callSchema.index({ caller: 1, createdAt: -1 });
callSchema.index({ receiver: 1, createdAt: -1 });

const Call = mongoose.model('Call', callSchema);
export default Call;
