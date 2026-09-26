import Call from '../models/Call.js';

// GET /api/calls  (protected)
// Query params: ?page=1&limit=10
export const getCallHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const query = {
      $or: [{ caller: userId }, { receiver: userId }],
    };

    const [calls, total] = await Promise.all([
      Call.find(query)
        .populate('caller', 'name email')
        .populate('receiver', 'name email')
        .sort({ createdAt: -1, startedAt: -1 })
        .skip(skip)
        .limit(limit),
      Call.countDocuments(query),
    ]);

    res.json({
      calls,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        hasMore: skip + calls.length < total,
      },
    });
  } catch (err) {
    console.error('[getCallHistory]', err);
    res.status(500).json({ message: 'Server error fetching call history.' });
  }
};
