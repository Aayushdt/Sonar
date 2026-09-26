import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  registerUser,
  loginUser,
  getMe,
  getUsers,
  getFriends,
  toggleFriend,
} from '../controllers/authController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// Rate Limiter: Protect against brute-force attacks on auth endpoints
// 20 requests per 15 minutes window
// ─────────────────────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes.',
  },
});

router.post('/register', authLimiter, registerUser);
router.post('/login', authLimiter, loginUser);
router.get('/me', authMiddleware, getMe);
router.get('/users', authMiddleware, getUsers);
router.get('/friends', authMiddleware, getFriends);
router.post('/friends/:friendId', authMiddleware, toggleFriend);

export default router;
