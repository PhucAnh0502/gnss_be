import User from './User.js';
import Device from './Device.js';
import Tracking from './Tracking.js';
import RawGnss from './RawGnss.js';

// User - Device : 1 - N
User.hasMany(Device, { foreignKey: 'userId', as: 'devices', onDelete: 'CASCADE' });
Device.belongsTo(User, { foreignKey: 'userId', as: 'owner' });

// Device - Tracking : 1 - N
Device.hasMany(Tracking, { foreignKey: 'deviceId', as: 'trackings', onDelete: 'CASCADE' });
Tracking.belongsTo(Device, { foreignKey: 'deviceId', as: 'device' });

// Tracking - RawGnss : 1 - 1
Tracking.hasOne(RawGnss, { foreignKey: 'trackingId', as: 'rawGnss', onDelete: 'CASCADE' });
RawGnss.belongsTo(Tracking, { foreignKey: 'trackingId', as: 'tracking' });

export { User, Device, Tracking, RawGnss };