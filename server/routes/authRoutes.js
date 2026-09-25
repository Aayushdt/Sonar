import express from 'express';
import { registerUser, loginUser, getMe, getUsers } from '../controllers/authController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', authMiddleware, getMe);
router.get('/users', authMiddleware, getUsers);

export default router;
