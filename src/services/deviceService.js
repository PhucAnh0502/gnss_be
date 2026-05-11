import {Device, User} from '../models/index.js';

const STATUS_THRESHOLD_MS = 5 * 60 * 1000;

const resolveRuntimeStatus = (lastPing) => {
    if (!lastPing) {
        return 'inactive';
    }

    const lastPingTime = new Date(lastPing).getTime();
    if (Number.isNaN(lastPingTime)) {
        return 'inactive';
    }

    return (Date.now() - lastPingTime) <= STATUS_THRESHOLD_MS ? 'active' : 'inactive';
};

class ServiceError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.name = "ServiceError";
        this.statusCode = statusCode;
    }
}

//Get all devices
export const findAllDevices = async (isAdmin, userId) => {
    try {
        const whereClause = isAdmin ? {} : { userId };
        const devices = await Device.findAll({
            where: whereClause,
            include: isAdmin ? [{
                model: User,
                as: 'owner',
                attributes: ['id', 'username', 'email']
            }] : [],
            order: [['lastPing', 'DESC']]
        });

        const result = devices.map(d => {
            const data = d.toJSON();
            return { ...data, status: resolveRuntimeStatus(data.lastPing) };
        });

        return {success: true, data: result};
    } catch (error) {
        throw error;
    }
}

//Get one device detail
export const findDeviceById = async (id, isAdmin, userId) => {
    const whereClause = isAdmin ? { id } : { id, userId };

    const device = await Device.findOne({
        where: whereClause,
        include: isAdmin ? [{
            model: User,
            as: 'owner',
            attributes: ['id', 'username', 'email'],
        }] : [],
    });

    if (!device) {
        throw new ServiceError("Device not found", 404);
    }

    const data = device.toJSON();
    return {
        success: true,
        data: { ...data, status: resolveRuntimeStatus(data.lastPing) },
    };
}

//register a new device
export const registerNewDevice = async (deviceData, userId) => {
    const { deviceName, deviceCode } = deviceData;

    if (!deviceName || !deviceCode) {
        throw new ServiceError("Device name and code are required", 400);
    }

    const existingDevice = await Device.findOne({ where: { deviceCode } });
    if (existingDevice) {
        throw new ServiceError("Device code already registered", 400);
    }

    const newDevice = await Device.create({
        deviceName,
        deviceCode,
        userId,
        status: 'inactive',
        // Device is inactive by default until first telemetry/tracking packet updates lastPing.
        lastPing: null,
    });

    const newDeviceData = newDevice.toJSON();
    return {
        message: "Device registered successfully",
        data: { ...newDeviceData, status: resolveRuntimeStatus(newDeviceData.lastPing) },
        statusCode: 201,
    }
}

//Update device Info
export const updateExistingDevice = async (id, userId, updateData) => {
    const device = await Device.findOne({ where: { id, userId } });
    if (!device) {
        throw new ServiceError("Device not found", 404);
    }
    await device.update(updateData);
    const data = device.toJSON();
    return {
        message: "Device updated successfully",
        data: { ...data, status: resolveRuntimeStatus(data.lastPing) },
    };
}

//Remove device
export const removeDevice = async (id, userId) => {
    const device = await Device.findOne({ where: { id, userId } });
    if (!device) {
        throw new ServiceError("Device not found", 404);
    }

    await device.destroy();
    return { message: "Device removed successfully" };
}

export {ServiceError};