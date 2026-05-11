import {
  findAllDevices,
  findDeviceById,
  registerNewDevice,
  updateExistingDevice,
  removeDevice,
  ServiceError,
} from "../services/deviceService.js";

const handleControllerError = (error, res, context) => {
    console.error(`${context} error:`, error);

    if (error instanceof ServiceError) {
        return res.status(error.statusCode).json({ message: error.message });
    }

    return res.status(500).json({ message: "Internal server error" });
};

// Get all devices for the user (or all devices if admin)
export const getDevices = async (req, res) => {
    try {
        const isAdmin = req.user.role === "admin";
        const result = await findAllDevices(isAdmin, req.user.id);
        return res.status(200).json(result);
    } catch (error) {
        return handleControllerError(error, res, "Get Devices");
    }
}

// Get detail of one device
export const getDeviceDetail = async (req, res) => {
    try {
        const isAdmin = req.user.role === "admin";
        const result = await findDeviceById(req.params.id, isAdmin, req.user.id);
        return res.status(200).json(result);
    } catch (error) {
        return handleControllerError(error, res, "Get Device Detail");
    }
}

// Register a new device
export const createDevice = async (req, res) => {
    try {
        const result = await registerNewDevice(req.body, req.user.id);
        return res.status(result.statusCode).json({
            message: result.message,
            device: result.data,
        });
    } catch (error) {
        return handleControllerError(error, res, "Create Device");
    }
}

// Update device info
export const updateDevice = async (req, res) => {
    try {
        const result = await updateExistingDevice(req.params.id, req.user.id, req.body);
        return res.status(200).json(result);
    } catch (error) {
        return handleControllerError(error, res, "Update Device");
    }
}

// Remove a device
export const deleteDevice = async (req, res) => {
    try {
        const result = await removeDevice(req.params.id, req.user.id);
        return res.status(200).json(result);
    } catch (error) {
        return handleControllerError(error, res, "Delete Device");
    }
}

