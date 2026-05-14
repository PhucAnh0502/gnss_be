import { DataTypes } from 'sequelize';
import sequelize from '../configs/db.js';

const TrackingSnapshot = sequelize.define('TrackingSnapshot', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    deviceId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'deviceId',
        references: {
            model: 'Devices',
            key: 'id',
        },
    },
    trackingId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'trackingId',
        references: {
            model: 'Trackings',
            key: 'id',
        },
    },
    capturedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'capturedAt',
    },
    captureMode: {
        type: DataTypes.ENUM('manual', 'auto'),
        allowNull: false,
        defaultValue: 'manual',
        field: 'captureMode',
    },
    location: {
        type: DataTypes.GEOGRAPHY('POINT', 4326),
        allowNull: true,
    },
    altitude: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
    },
    speed: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
    },
    heading: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
    },
    hdop: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
    },
    satellites_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    satellites_used: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    avg_cn0: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
    },
    imageBucket: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'imageBucket',
    },
    imagePath: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'imagePath',
    },
    mimeType: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'mimeType',
    },
    fileSizeBytes: {
        type: DataTypes.BIGINT,
        allowNull: true,
        field: 'fileSizeBytes',
    },
    note: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    syncStatus: {
        type: DataTypes.ENUM('pending', 'uploaded', 'synced', 'failed'),
        allowNull: false,
        defaultValue: 'pending',
        field: 'syncStatus',
    },
}, {
    indexes: [
        { fields: ['deviceId'] },
        { fields: ['capturedAt'] },
        { fields: ['syncStatus'] },
        { fields: ['location'], using: 'GIST' },
    ],
});

export default TrackingSnapshot;