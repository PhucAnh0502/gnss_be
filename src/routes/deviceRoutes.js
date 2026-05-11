import express from 'express';
import * as deviceCtrl from '../controllers/deviceController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { restrictAdminActions } from '../middlewares/roleMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', deviceCtrl.getDevices);
router.get('/:id', deviceCtrl.getDeviceDetail);
router.post('/', restrictAdminActions, deviceCtrl.createDevice);
router.put('/:id', restrictAdminActions, deviceCtrl.updateDevice);
router.delete('/:id', restrictAdminActions, deviceCtrl.deleteDevice);

export default router;