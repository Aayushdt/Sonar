import express from 'express';
import { getCallHistory } from '../controllers/callController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/calls — returns call history for the authenticated user
router.get('/', authMiddleware, getCallHistory);

export default router;
