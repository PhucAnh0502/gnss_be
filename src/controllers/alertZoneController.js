import {
    createZone,
    updateZone,
    deleteZone,
    getAllZones,
    getZoneById,
    ServiceError,
} from "../services/alertZoneService.js";

const handleControllerError = (error, res, context) => {
    console.error(`${context} error:`, error);

    if (error instanceof ServiceError) {
        return res.status(error.statusCode).json({ message: error.message });
    }

    return res.status(500).json({ message: "Internal server error" });
};

export const createZoneHandler = async (req, res) => {
    try {
        const zone = await createZone(req.body);
        return res.status(201).json({ success: true, data: zone });
    } catch (error) {
        return handleControllerError(error, res, "Create Alert Zone");
    }
};

export const getAllZonesHandler = async (req, res) => {
    try {
        const zones = await getAllZones();
        return res.status(200).json({ success: true, data: zones });
    } catch (error) {
        return handleControllerError(error, res, "Get All Alert Zones");
    }
};

export const getZoneByIdHandler = async (req, res) => {
    try {
        const zone = await getZoneById(req.params.id);
        return res.status(200).json({ success: true, data: zone });
    } catch (error) {
        return handleControllerError(error, res, "Get Alert Zone By ID");
    }
};

export const updateZoneHandler = async (req, res) => {
    try {
        const zone = await updateZone(req.params.id, req.body);
        return res.status(200).json({ success: true, data: zone });
    } catch (error) {
        return handleControllerError(error, res, "Update Alert Zone");
    }
};

export const deleteZoneHandler = async (req, res) => {
    try {
        await deleteZone(req.params.id);
        return res.status(200).json({ success: true, data: null });
    } catch (error) {
        return handleControllerError(error, res, "Delete Alert Zone");
    }
};
