import mongoose from 'mongoose';

// Only connected calls that complete are logged. Rejected calls are never persisted.
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
    // startedAt: when remote participant joins the Daily room and remote media tracks begin
    startedAt: { type: Date, required: true },
    // endedAt: when either peer hangs up or disconnects
    endedAt: { type: Date, required: true },
    durationSeconds: { type: Number, required: true },
  },
  { timestamps: true }
);

const Call = mongoose.model('Call', callSchema);
export default Call;
