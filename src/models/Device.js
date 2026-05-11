import {DataTypes} from 'sequelize';
import sequelize from  '../configs/db.js'

const Device = sequelize.define('Device', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    deviceName: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    deviceCode: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive'),
        defaultValue: 'inactive'
    },
    lastPing: {
        type: DataTypes.DATE,
        allowNull: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'Users',
            key: 'id'
        }
    }
});

export default Device;