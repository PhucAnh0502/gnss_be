import express from 'express';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { isAdmin } from '../middlewares/roleMiddleware.js';
import * as alertHistoryCtrl from '../controllers/alertHistoryController.js';

const router = express.Router();

router.use(authenticateToken);
router.get('/', isAdmin, alertHistoryCtrl.getAlertHistory);

export default router;
