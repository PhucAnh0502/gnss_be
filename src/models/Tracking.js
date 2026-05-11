import {DataTypes} from 'sequelize';
import sequelize from '../configs/db.js';

const Tracking = sequelize.define('Tracking', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    location: {
        type: DataTypes.GEOGRAPHY('POINT', 4326),
        allowNull: false
    },
    altitude: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    speed: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    heading: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    hdop: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    satellites_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    satellites_used: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    avg_cn0: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    deviceId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'Devices',
            key: 'id'
        },
    }
}, {
    indexes: [
        {fields : ['deviceId']},
        {fields : ['timestamp']},
        {fields : ['location'], using: 'GIST'}
    ]
});

export default Tracking;