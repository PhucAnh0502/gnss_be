import express from 'express';
import multer from 'multer';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { attachToTracking, getDeviceSnapshots, initSnapshot, uploadSnapshot } from '../controllers/snapshotController.js';

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 12 * 1024 * 1024 },
});

router.use(authenticateToken);

router.post('/init', initSnapshot);
router.get('/devices/:deviceId', getDeviceSnapshots);
router.post('/:id/upload', upload.single('file'), uploadSnapshot);
router.post('/attach-to-tracking', attachToTracking);

export default router;