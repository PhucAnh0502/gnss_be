import { DataTypes } from 'sequelize';
import sequelize from '../configs/db.js';

const AlertEvent = sequelize.define('AlertEvent', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    deviceCode: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    zoneId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    zoneName: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    alertType: {
        type: DataTypes.ENUM('proximity', 'breach', 'exit'),
        allowNull: false
    },
    distance: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    deviceLat: {
        type: DataTypes.DOUBLE,
        allowNull: true
    },
    deviceLng: {
        type: DataTypes.DOUBLE,
        allowNull: true
    },
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    indexes: [
        { fields: ['deviceCode'] },
        { fields: ['zoneId'] },
        { fields: ['timestamp'] },
        { fields: ['alertType'] }
    ]
});

export default AlertEvent;
