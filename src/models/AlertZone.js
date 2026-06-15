import { DataTypes } from 'sequelize';
import sequelize from '../configs/db.js';

const AlertZone = sequelize.define('AlertZone', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true
    },
    polygon: {
        type: DataTypes.GEOGRAPHY('POLYGON', 4326),
        allowNull: false
    },
    warningRadius: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 200,
        validate: {
            min: 50,
            max: 5000
        }
    }
}, {
    indexes: [
        {
            name: 'idx_alert_zones_polygon',
            using: 'GIST',
            fields: ['polygon']
        }
    ]
});

export default AlertZone;
