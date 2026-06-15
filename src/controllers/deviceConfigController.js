import * as deviceConfigService from '../services/deviceConfigService.js';

export const getConfig = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const userId = req.user.id;

    const config = await deviceConfigService.getDeviceConfig(deviceId, userId);
    return res.json({ success: true, data: config });
  } catch (error) {
    if (error.name === 'ServiceError') {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error('[DeviceConfig] getConfig error:', error.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getConfigByCode = async (req, res) => {
  try {
    const { deviceCode } = req.params;
    const config = await deviceConfigService.getConfigByDeviceCode(deviceCode);
    return res.json({ success: true, data: config });
  } catch (error) {
    if (error.name === 'ServiceError') {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error('[DeviceConfig] getConfigByCode error:', error.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateConfig = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const userId = req.user.id;

    const config = await deviceConfigService.updateDeviceConfig(deviceId, userId, req.body);

    // Emit Socket.IO event to push config to device in real-time
    const io = req.app.get('io');
    if (io && config.deviceCode) {
      io.emit(`config:${config.deviceCode}`, config);
    }

    return res.json({ success: true, data: config });
  } catch (error) {
    if (error.name === 'ServiceError') {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error('[DeviceConfig] updateConfig error:', error.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateConfigByCode = async (req, res) => {
  try {
    const { deviceCode } = req.params;
    const userId = req.user.id;

    const config = await deviceConfigService.updateConfigByDeviceCode(deviceCode, userId, req.body);

    // Emit Socket.IO event so web dashboard can refetch
    const io = req.app.get('io');
    if (io && config.deviceCode) {
      io.emit(`config:${config.deviceCode}`, config);
    }

    return res.json({ success: true, data: config });
  } catch (error) {
    if (error.name === 'ServiceError') {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error('[DeviceConfig] updateConfigByCode error:', error.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
