import User from './User.js';
import Device from './Device.js';
import Tracking from './Tracking.js';
import RawGnss from './RawGnss.js';
import TrackingSnapshot from './TrackingSnapshot.js';
import DeviceConfig from './DeviceConfig.js';
import AlertZone from './AlertZone.js';
import AlertEvent from './AlertEvent.js';

// User - Device : 1 - N
User.hasMany(Device, { foreignKey: 'userId', as: 'devices', onDelete: 'CASCADE' });
Device.belongsTo(User, { foreignKey: 'userId', as: 'owner' });

// Device - Tracking : 1 - N
Device.hasMany(Tracking, { foreignKey: 'deviceId', as: 'trackings', onDelete: 'CASCADE' });
Tracking.belongsTo(Device, { foreignKey: 'deviceId', as: 'device' });

// Tracking - RawGnss : 1 - 1
Tracking.hasOne(RawGnss, { foreignKey: 'trackingId', as: 'rawGnss', onDelete: 'CASCADE' });
RawGnss.belongsTo(Tracking, { foreignKey: 'trackingId', as: 'tracking' });

// Device - TrackingSnapshot : 1 - N
Device.hasMany(TrackingSnapshot, { foreignKey: 'deviceId', as: 'snapshots', onDelete: 'CASCADE' });
TrackingSnapshot.belongsTo(Device, { foreignKey: 'deviceId', as: 'device' });

// Device - DeviceConfig : 1 - 1
Device.hasOne(DeviceConfig, { foreignKey: 'deviceId', as: 'config', onDelete: 'CASCADE' });
DeviceConfig.belongsTo(Device, { foreignKey: 'deviceId', as: 'device' });

export { User, Device, Tracking, RawGnss, TrackingSnapshot, DeviceConfig, AlertZone, AlertEvent };