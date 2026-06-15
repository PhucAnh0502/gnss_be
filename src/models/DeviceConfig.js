import { DataTypes } from 'sequelize';
import sequelize from '../configs/db.js';

const DeviceConfig = sequelize.define('DeviceConfig', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  deviceId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: {
      model: 'Devices',
      key: 'id',
    },
  },

  // Tracking config
  trackingEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  publishIntervalMoving: {
    type: DataTypes.INTEGER,
    defaultValue: 5,
    comment: 'Publish interval in seconds when device is moving',
  },
  publishIntervalStationary: {
    type: DataTypes.INTEGER,
    defaultValue: 15,
    comment: 'Publish interval in seconds when device is stationary',
  },

  // Auto-capture config
  autoCaptureEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  autoCaptureMode: {
    type: DataTypes.ENUM('timer', 'distance'),
    defaultValue: 'timer',
  },
  autoCaptureInterval: {
    type: DataTypes.INTEGER,
    defaultValue: 60,
    comment: 'Auto-capture interval in seconds (timer mode)',
  },
  autoCaptureDistance: {
    type: DataTypes.INTEGER,
    defaultValue: 100,
    comment: 'Auto-capture trigger distance in meters (distance mode)',
  },

  // Metadata
  updatedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'userId of the person who last updated this config',
  },
});

export default DeviceConfig;
