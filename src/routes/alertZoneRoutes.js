import express from 'express';
import * as alertZoneCtrl from '../controllers/alertZoneController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { isAdmin } from '../middlewares/roleMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

router.post('/', isAdmin, alertZoneCtrl.createZoneHandler);
router.get('/', alertZoneCtrl.getAllZonesHandler);
router.get('/:id', alertZoneCtrl.getZoneByIdHandler);
router.put('/:id', isAdmin, alertZoneCtrl.updateZoneHandler);
router.delete('/:id', isAdmin, alertZoneCtrl.deleteZoneHandler);

export default router;
