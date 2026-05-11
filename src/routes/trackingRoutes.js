import express from 'express';
import { getDeviceHistory, getLatestDeviceLocation } from '../controllers/trackingController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/history/:deviceId', authenticateToken, getDeviceHistory);
router.get('/latest/:deviceId', authenticateToken, getLatestDeviceLocation);

export default router;