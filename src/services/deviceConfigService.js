import { Device, DeviceConfig } from '../models/index.js';
import User from '../models/User.js';

class ServiceError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = 'ServiceError';
    this.statusCode = statusCode;
  }
}

const ALLOWED_FIELDS = [
  'trackingEnabled',
  'publishIntervalMoving',
  'publishIntervalStationary',
  'autoCaptureEnabled',
  'autoCaptureMode',
  'autoCaptureInterval',
  'autoCaptureDistance',
];

const resolveDevice = async (deviceId, userId) => {
  // First check if user is admin
  const user = await User.findByPk(userId, { attributes: ['id', 'role'] });
  const isAdmin = user?.role === 'admin';

  const where = isAdmin ? { id: deviceId } : { id: deviceId, userId };
  const device = await Device.findOne({ where, attributes: ['id', 'deviceCode', 'userId'] });
  if (!device) {
    throw new ServiceError('Device not found', 404);
  }
  return device;
};

export const getDeviceConfig = async (deviceId, userId) => {
  const device = await resolveDevice(deviceId, userId);

  let config = await DeviceConfig.findOne({ where: { deviceId: device.id } });

  // Auto-create config with defaults if not exists
  if (!config) {
    config = await DeviceConfig.create({ deviceId: device.id });
  }

  return {
    deviceId: device.id,
    deviceCode: device.deviceCode,
    ...config.toJSON(),
  };
};

/**
 * Get config by deviceCode (used by mobile app polling on startup).
 * No userId check — app authenticates via JWT, and device ownership
 * is implicitly verified because the app only knows its own deviceCode.
 */
export const getConfigByDeviceCode = async (deviceCode) => {
  const device = await Device.findOne({
    where: { deviceCode },
    attributes: ['id', 'deviceCode'],
  });
  if (!device) {
    throw new ServiceError('Device not found', 404);
  }

  let config = await DeviceConfig.findOne({ where: { deviceId: device.id } });
  if (!config) {
    config = await DeviceConfig.create({ deviceId: device.id });
  }

  return {
    deviceId: device.id,
    deviceCode: device.deviceCode,
    ...config.toJSON(),
  };
};

export const updateDeviceConfig = async (deviceId, userId, updates) => {
  const device = await resolveDevice(deviceId, userId);

  // Filter only allowed fields
  const sanitized = {};
  for (const key of ALLOWED_FIELDS) {
    if (updates[key] !== undefined) {
      sanitized[key] = updates[key];
    }
  }

  if (Object.keys(sanitized).length === 0) {
    throw new ServiceError('No valid fields to update', 400);
  }

  // Validate values
  if (sanitized.publishIntervalMoving !== undefined) {
    const val = Number(sanitized.publishIntervalMoving);
    if (!Number.isFinite(val) || val < 1 || val > 300) {
      throw new ServiceError('publishIntervalMoving must be between 1 and 300 seconds', 400);
    }
    sanitized.publishIntervalMoving = val;
  }

  if (sanitized.publishIntervalStationary !== undefined) {
    const val = Number(sanitized.publishIntervalStationary);
    if (!Number.isFinite(val) || val < 5 || val > 600) {
      throw new ServiceError('publishIntervalStationary must be between 5 and 600 seconds', 400);
    }
    sanitized.publishIntervalStationary = val;
  }

  if (sanitized.autoCaptureInterval !== undefined) {
    const val = Number(sanitized.autoCaptureInterval);
    if (!Number.isFinite(val) || val < 10 || val > 3600) {
      throw new ServiceError('autoCaptureInterval must be between 10 and 3600 seconds', 400);
    }
    sanitized.autoCaptureInterval = val;
  }

  if (sanitized.autoCaptureDistance !== undefined) {
    const val = Number(sanitized.autoCaptureDistance);
    if (!Number.isFinite(val) || val < 10 || val > 10000) {
      throw new ServiceError('autoCaptureDistance must be between 10 and 10000 meters', 400);
    }
    sanitized.autoCaptureDistance = val;
  }

  if (sanitized.autoCaptureMode !== undefined) {
    if (!['timer', 'distance'].includes(sanitized.autoCaptureMode)) {
      throw new ServiceError('autoCaptureMode must be "timer" or "distance"', 400);
    }
  }

  sanitized.updatedBy = userId;

  // Upsert: create if not exists, update if exists
  let config = await DeviceConfig.findOne({ where: { deviceId: device.id } });
  if (!config) {
    config = await DeviceConfig.create({ deviceId: device.id, ...sanitized });
  } else {
    await config.update(sanitized);
    await config.reload();
  }

  return {
    deviceId: device.id,
    deviceCode: device.deviceCode,
    ...config.toJSON(),
  };
};

/**
 * Update config by deviceCode (used by mobile app syncing state back to server).
 * Permission: device must belong to the user (checked via userId on Device).
 */
export const updateConfigByDeviceCode = async (deviceCode, userId, updates) => {
  const device = await Device.findOne({
    where: { deviceCode },
    attributes: ['id', 'deviceCode', 'userId'],
  });
  if (!device) {
    throw new ServiceError('Device not found', 404);
  }

  // Check ownership (admin bypass via User role)
  const user = await User.findByPk(userId, { attributes: ['id', 'role'] });
  const isAdmin = user?.role === 'admin';
  if (!isAdmin && device.userId !== userId) {
    throw new ServiceError('Access denied', 403);
  }

  // Filter allowed fields
  const sanitized = {};
  for (const key of ALLOWED_FIELDS) {
    if (updates[key] !== undefined) {
      sanitized[key] = updates[key];
    }
  }

  if (Object.keys(sanitized).length === 0) {
    throw new ServiceError('No valid fields to update', 400);
  }

  sanitized.updatedBy = userId;

  let config = await DeviceConfig.findOne({ where: { deviceId: device.id } });
  if (!config) {
    config = await DeviceConfig.create({ deviceId: device.id, ...sanitized });
  } else {
    await config.update(sanitized);
    await config.reload();
  }

  return {
    deviceId: device.id,
    deviceCode: device.deviceCode,
    ...config.toJSON(),
  };
};
