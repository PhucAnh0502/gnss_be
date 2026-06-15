import { AlertEvent } from '../models/index.js';
import { Op } from 'sequelize';

export const getAlertHistory = async (req, res) => {
    try {
        const { page = 1, limit = 20, deviceCode, zoneId, alertType, startDate, endDate } = req.query;

        const pageNum = parseInt(page) || 1;
        const limitNum = Math.min(parseInt(limit) || 20, 100);
        const offset = (pageNum - 1) * limitNum;

        // Build where clause
        const where = {};
        if (deviceCode) where.deviceCode = deviceCode;
        if (zoneId) where.zoneId = zoneId;
        if (alertType) where.alertType = alertType;
        if (startDate || endDate) {
            where.timestamp = {};
            if (startDate) where.timestamp[Op.gte] = new Date(startDate);
            if (endDate) where.timestamp[Op.lte] = new Date(endDate);
        }

        // Validate max 90 days range
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const diffDays = (end - start) / (1000 * 60 * 60 * 24);
            if (diffDays > 90) {
                return res.status(400).json({ message: 'Date range must not exceed 90 days' });
            }
            if (diffDays < 0) {
                return res.status(400).json({ message: 'startDate must be before endDate' });
            }
        }

        const { count, rows } = await AlertEvent.findAndCountAll({
            where,
            order: [['timestamp', 'DESC']],
            limit: limitNum,
            offset,
        });

        return res.status(200).json({
            success: true,
            data: rows,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: count,
                totalPages: Math.ceil(count / limitNum),
            },
        });
    } catch (error) {
        console.error('Get Alert History error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
