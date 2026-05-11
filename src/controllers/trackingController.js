import * as trackingService from '../services/trackingService.js';
import { ServiceError } from '../services/trackingService.js';

const handleControllerError = (error, res, context) => {
    console.error(`${context} error:`, error);

    if (error instanceof ServiceError) {
        return res.status(error.statusCode).json({ message: error.message });
    }

    return res.status(500).json({ message: "Internal server error" });
};

export const getDeviceHistory = async (req, res) => {
    try {
        const {deviceId} = req.params;
        const {from, to} = req.query;
        const isAdmin = req.user.role === 'admin';
        if(!from || !to) {
            return res.status(400).json({ message: "Missing 'from' or 'to' query parameters" });
        }
        const result = await trackingService.getHistoryWithDistance(deviceId, req.user.id, isAdmin, from, to);
        return res.status(200).json({
            success: true,
            data: result.history,
            summary: {
                totalDistanceMeter: result.totalDistance,
                points: result.history.length
            }
        });
    } catch (error) {
        return handleControllerError(error, res, "Get Device History");
    }
}

export const getLatestDeviceLocation = async (req, res) => {
    try {
        const { deviceId } = req.params;
        const isAdmin = req.user.role === 'admin';
        const result = await trackingService.getLatestPointByDevice(deviceId, req.user.id, isAdmin);

        return res.status(200).json({
            success: true,
            data: result.latest,
        });
    } catch (error) {
        return handleControllerError(error, res, "Get Latest Device Location");
    }
}
