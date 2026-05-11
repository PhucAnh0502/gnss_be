import { DataTypes } from "sequelize";
import sequelize from "../configs/db.js";

const RawGnss = sequelize.define("RawGnss", {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    trackingId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: "Trackings",
            key: "id",
        }
    },
    statusRaw: {
        type: DataTypes.JSONB
    },
    measurementsRaw: {
        type: DataTypes.JSONB
    },
    clockRaw: {
        type: DataTypes.JSONB
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    timestamps: false,
    tableName: "RawGnss"
});

export default RawGnss;