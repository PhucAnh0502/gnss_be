import sequelize from "../configs/db.js";
import {Tracking, RawGnss, Device} from "../models/index.js";

class ServiceError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.name = "ServiceError";
        this.statusCode = statusCode;
    }
}

const identityCache = new Map();


//Sync deviceCode - deviceId cache for faster lookup during telemetry processing
export const syncIdentityCache = async () => {
    try {
        const devices = await Device.findAll({
            attributes: ['id', 'deviceCode']
        })
        identityCache.clear();
        devices.forEach(d => identityCache.set(d.deviceCode, d.id));
        return {success: true, count: identityCache.size};
    } catch (error) {
        throw error;
    }
}

export const processTelemetry = async (payload) => {
    const {deviceCode, tracking, raw} = payload;
    const fallbackTrackingTimestamp = tracking?.ts ? new Date(tracking.ts * 1000) : new Date();

    let deviceId = identityCache.get(deviceCode);

    if(!deviceId) {
        const device = await Device.findOne({ where: { deviceCode }, attributes: ['id'] });
        if(!device) {
            throw new ServiceError("Device not registered", 404);
        }

        deviceId = device.id;
        identityCache.set(deviceCode, deviceId);
    }

    try {
        const result = await sequelize.transaction(async (t) => {
            const trackingTimestamp = fallbackTrackingTimestamp;

            const newTracking = await Tracking.create({
                deviceId: deviceId,
                location: {
                    type: "Point",
                    coordinates: [tracking.lng, tracking.lat]
                },
                speed: tracking.sp,
                heading: tracking.hd,
                altitude: tracking.alt,
                hdop: tracking.hdop ?? tracking.acc ?? 0,
                satellites_count: tracking.satCount ?? tracking.sat ?? 0,
                satellites_used: tracking.satUsed ?? 0,
                avg_cn0: tracking.avgCn0 ?? 0,
                timestamp: trackingTimestamp
            }, { transaction: t });

            await Device.update({
                lastPing: new Date(),
                status: 'active',
            }, {
                where: { id: deviceId },
                transaction: t
            });

            let rawData = null;
            if (raw && typeof raw === 'object') {
                rawData = await RawGnss.create({
                    trackingId: newTracking.id,
                    statusRaw: raw.status || null,
                    measurementsRaw: raw.measurements || null,
                    clockRaw: raw.clock || null
                }, { transaction: t });
            }

            return {tracking: newTracking, raw: rawData}
        })

        return {
            success: true,
            message: "Telemetry processed and saved successfully",
                        trackingId: result.tracking.id,
                        live: {
                                deviceCode,
                                lat: tracking.lat,
                                lng: tracking.lng,
                                ts: tracking.ts || Math.floor(fallbackTrackingTimestamp.getTime() / 1000),
                                sp: tracking.sp ?? 0,
                                hd: tracking.hd ?? 0,
                                alt: tracking.alt ?? 0,
                                hdop: tracking.hdop ?? tracking.acc ?? 0,
                                sat: tracking.satCount ?? tracking.sat ?? 0,
                                satUsed: tracking.satUsed ?? 0,
                                avgCn0: tracking.avgCn0 ?? 0,
                                raw: raw && typeof raw === 'object'
                                    ? {
                                            status: raw.status || [],
                                            clock: raw.clock || null,
                                        }
                                    : null,
                        },
        };
    } catch (error) {
        throw error;
    }
}


//Get raw data by tracking ID
export const getRawDataByTrackingId = async (trackingId, userId, isAdmin) => {
    try {
        // Quick ownership check first (simple query)
        if (!isAdmin) {
            const tracking = await Tracking.findOne({
                where: { id: trackingId },
                attributes: ['deviceId'],
            });
            if (!tracking) {
                throw new ServiceError("Tracking point not found", 404);
            }
            const device = await Device.findOne({
                where: { id: tracking.deviceId },
                attributes: ['userId'],
            });
            if (!device || device.userId !== userId) {
                throw new ServiceError("Access denied", 403);
            }
        }

        // Fetch raw data (simple, no joins)
        const data = await RawGnss.findOne({
            where: { trackingId },
            attributes: ['id', 'trackingId', 'statusRaw', 'measurementsRaw', 'clockRaw', 'createdAt'],
        });

        if (!data) {
            throw new ServiceError("Raw data not found for the given tracking ID", 404);
        }

        return { success: true, data: data.toJSON() };
    } catch (error) {
        throw error;
    }
}