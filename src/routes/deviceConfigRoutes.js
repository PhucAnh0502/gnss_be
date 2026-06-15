import express from 'express';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { getConfig, updateConfig, getConfigByCode, updateConfigByCode } from '../controllers/deviceConfigController.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/:deviceId/config', getConfig);
router.put('/:deviceId/config', updateConfig);
router.get('/by-code/:deviceCode/config', getConfigByCode);
router.put('/by-code/:deviceCode/config', updateConfigByCode);

export default router;
