import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Generate a signed JWT for a user
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// POST /api/auth/register
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword });

    const token = generateToken(user);

    res.status(201).json({
      token,
      user: { _id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error('[registerUser]', err);
    res.status(500).json({ message: 'Server error during registration.' });
  }
};

// POST /api/auth/login
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const token = generateToken(user);

    res.json({
      token,
      user: { _id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error('[loginUser]', err);
    res.status(500).json({ message: 'Server error during login.' });
  }
};

// GET /api/auth/me  (protected by authMiddleware)
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        friends: user.friends || [],
      },
    });
  } catch (err) {
    console.error('[getMe]', err);
    res.status(500).json({ message: 'Server error fetching user.' });
  }
};

// GET /api/auth/users  (protected by authMiddleware)
export const getUsers = async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user.id } }).select('_id name email');
    res.json({ users });
  } catch (err) {
    console.error('[getUsers]', err);
    res.status(500).json({ message: 'Server error fetching users.' });
  }
};

// GET /api/auth/friends  (protected by authMiddleware)
export const getFriends = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('friends', '_id name email');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json({ friends: user.friends || [] });
  } catch (err) {
    console.error('[getFriends]', err);
    res.status(500).json({ message: 'Server error fetching friends.' });
  }
};

// POST /api/auth/friends/:friendId  (toggle friend)
export const toggleFriend = async (req, res) => {
  try {
    const { friendId } = req.params;
    const userId = req.user.id;

    if (friendId === userId) {
      return res.status(400).json({ message: 'Cannot add yourself as a friend.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const friendIndex = user.friends.indexOf(friendId);
    let isFriend = false;

    if (friendIndex > -1) {
      // Remove friend
      user.friends.splice(friendIndex, 1);
      isFriend = false;
    } else {
      // Add friend
      user.friends.push(friendId);
      isFriend = true;
    }

    await user.save();
    res.json({
      success: true,
      isFriend,
      friends: user.friends,
      message: isFriend ? 'Contact added to favorites.' : 'Contact removed from favorites.',
    });
  } catch (err) {
    console.error('[toggleFriend]', err);
    res.status(500).json({ message: 'Server error updating friends list.' });
  }
};
