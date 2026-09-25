import Call from '../models/Call.js';

// GET /api/calls  (protected)
export const getCallHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    const calls = await Call.find({
      $or: [{ caller: userId }, { receiver: userId }],
    })
      .populate('caller', 'name email')
      .populate('receiver', 'name email')
      .sort({ startedAt: -1 });

    res.json({ calls });
  } catch (err) {
    console.error('[getCallHistory]', err);
    res.status(500).json({ message: 'Server error fetching call history.' });
  }
};
