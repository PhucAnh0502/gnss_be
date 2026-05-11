import express from 'express';
import * as telemetryController from '../controllers/telemetryController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/ingest', authenticateToken, telemetryController.ingestData);
router.get('/raw/:trackingId', authenticateToken, telemetryController.getRawData);

export default router;