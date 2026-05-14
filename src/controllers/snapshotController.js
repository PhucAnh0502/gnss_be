import * as snapshotService from '../services/snapshotService.js';
import { ServiceError } from '../services/snapshotService.js';

const handleControllerError = (error, res, context) => {
    console.error(`${context} error:`, error);

    if (error instanceof ServiceError) {
        return res.status(error.statusCode).json({ message: error.message });
    }

    return res.status(500).json({ message: 'Internal server error' });
};

export const initSnapshot = async (req, res) => {
    try {
        const result = await snapshotService.createSnapshotRecord(req.body, req.user.id);
        return res.status(201).json({ success: true, data: result.snapshot, uploadPath: result.uploadPath });
    } catch (error) {
        return handleControllerError(error, res, 'Init Snapshot');
    }
};

export const uploadSnapshot = async (req, res) => {
    try {
        const result = await snapshotService.uploadSnapshotFile(req.params.id, req.file, req.user.id);
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        return handleControllerError(error, res, 'Upload Snapshot');
    }
};

export const getDeviceSnapshots = async (req, res) => {
    try {
        const { deviceId } = req.params;
        const { from, to, status } = req.query;
        const snapshots = await snapshotService.listSnapshotsByDevice(deviceId, req.user.id, from, to, status);
        return res.status(200).json({ success: true, data: snapshots });
    } catch (error) {
        return handleControllerError(error, res, 'Get Device Snapshots');
    }
};

export const attachToTracking = async (req, res) => {
    try {
        const { snapshotId, trackingId } = req.body;
        if (!snapshotId || !trackingId) {
            return res.status(400).json({ message: 'Missing snapshotId or trackingId' });
        }

        const snapshot = await snapshotService.attachSnapshotToTracking(snapshotId, trackingId, req.user.id);
        return res.status(200).json({ success: true, data: snapshot });
    } catch (error) {
        return handleControllerError(error, res, 'Attach Snapshot To Tracking');
    }
};