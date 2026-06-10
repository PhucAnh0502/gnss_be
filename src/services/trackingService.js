import {Tracking, Device} from '../models/index.js';
import sequelize from '../configs/db.js';
import {Op} from 'sequelize';
import { GET_TRACKING_DISTANCE_QUERY } from '../queries/trackingQueries.js';

export class ServiceError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.name = "ServiceError";
        this.statusCode = statusCode;
    }
}

export const getHistoryWithDistance = async (deviceId, userId, isAdmin, from, to) => {
    const deviceWhere = isAdmin ? { id: deviceId } : { id: deviceId, userId };
    const device = await Device.findOne({ where: deviceWhere });
    if (!device) {
        throw new ServiceError("Device not found", 404);
    }

    const history = await Tracking.findAll({
        where: {
            deviceId,
            timestamp: {[Op.between]: [new Date(from), new Date(to)]}
        },
        order: [['timestamp', 'ASC']]
    });

    const [result] = await sequelize.query(GET_TRACKING_DISTANCE_QUERY, {
        replacements: {deviceId, from, to},
        type: sequelize.QueryTypes.SELECT
    });

    return {
        history,
        totalDistance: Math.round(result?.distance || 0)
    }
}

export const getLatestPointByDevice = async (deviceId, userId, isAdmin) => {
    const deviceWhere = isAdmin ? { id: deviceId } : { id: deviceId, userId };
    const device = await Device.findOne({ where: deviceWhere });
    if (!device) {
        throw new ServiceError("Device not found", 404);
    }

    const latest = await Tracking.findOne({
        where: { deviceId },
        order: [['timestamp', 'DESC']]
    });

    return {
        latest,
    };
}