import * as telemetryService from '../services/telemetryService.js';

const handleControllerError = (error, res, context) => {
    console.error(`${context} error:`, error);

    if (error instanceof ServiceError) {
        return res.status(error.statusCode).json({ message: error.message });
    }

    return res.status(500).json({ message: "Internal server error" });
};

export const getRawData = async (req, res) => {
    try {
        const { trackingId } = req.params;
        const isAdmin = req.user.role === 'admin';
        const result = await telemetryService.getRawDataByTrackingId(trackingId, req.user.id, isAdmin);
        return res.status(200).json(result);
    } catch (error) {
        handleControllerError(error, res, "Get Raw Data");
    }
}

export const ingestData = async (req, res) => {
    try {
        const result = await telemetryService.processTelemetry(req.body);
        return res.status(201).json(result);
    } catch (error) {
        return handleControllerError(error, res, "Ingest Telemetry Data");
    }
}

export const handleMqttData = async (mqttData) => {
    try {
        await telemetryService.processTelemetry(mqttData);
    } catch (error) {
        console.error("[MQTT Controller Error]:", error.message);
    }
}