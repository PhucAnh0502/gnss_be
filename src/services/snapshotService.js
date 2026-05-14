import fs from 'fs';
import path from 'path';
import { Op } from 'sequelize';
import { supabase } from '../configs/supabaseClient.js';
import { Device, Tracking, TrackingSnapshot } from '../models/index.js';

export class ServiceError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.name = 'ServiceError';
        this.statusCode = statusCode;
    }
}

const SNAPSHOT_BUCKET = 'tracking-snapshots';

const toGeoPoint = (lat, lng) => {
    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
        return null;
    }
    return { type: 'Point', coordinates: [Number(lng), Number(lat)] };
};

const mapSnapshot = async (snapshot) => {
    if (!snapshot) {
        return null;
    }

    let imageUrl = null;
    if (snapshot.imagePath) {
        try {
            const bucket = snapshot.imageBucket || SNAPSHOT_BUCKET;
            const { data, error } = await supabase.storage
                .from(bucket)
                .createSignedUrl(snapshot.imagePath, 60 * 60);

            if (error) {
                console.warn(`[Snapshot] Failed to create signed URL for ${snapshot.imagePath}:`, error.message);
            } else {
                imageUrl = data?.signedUrl || null;
            }
        } catch (err) {
            console.warn(`[Snapshot] Error generating signed URL:`, err.message);
        }
    }

    // Handle PostGIS GEOGRAPHY field — Sequelize may return it as:
    // 1. GeoJSON object: { type: 'Point', coordinates: [lng, lat] }
    // 2. Object with nested coordinates
    // 3. null
    const location = snapshot.location;
    let longitude = null;
    let latitude = null;

    if (location) {
        const coordinates = location.coordinates || location?.geometry?.coordinates;
        if (Array.isArray(coordinates) && coordinates.length >= 2) {
            longitude = Number(coordinates[0]);
            latitude = Number(coordinates[1]);
        }
    }

    return {
        id: snapshot.id,
        deviceId: snapshot.deviceId,
        trackingId: snapshot.trackingId,
        capturedAt: snapshot.capturedAt,
        captureMode: snapshot.captureMode,
        latitude,
        longitude,
        altitude: snapshot.altitude,
        speed: snapshot.speed,
        heading: snapshot.heading,
        hdop: snapshot.hdop,
        satellites_count: snapshot.satellites_count,
        satellites_used: snapshot.satellites_used,
        avg_cn0: snapshot.avg_cn0,
        imageBucket: snapshot.imageBucket,
        imagePath: snapshot.imagePath,
        imageUrl,
        mimeType: snapshot.mimeType,
        fileSizeBytes: snapshot.fileSizeBytes,
        note: snapshot.note,
        syncStatus: snapshot.syncStatus,
        createdAt: snapshot.createdAt,
        updatedAt: snapshot.updatedAt,
    };
};

const resolveUploadPath = (deviceId, snapshotId, mimeType) => {
    const dateFolder = new Date().toISOString().slice(0, 10).replaceAll('-', '/');
    const ext = mimeType?.includes('png') ? 'png' : mimeType?.includes('webp') ? 'webp' : 'jpg';
    return `${deviceId}/${dateFolder}/${snapshotId}.${ext}`;
};

const findDeviceForUser = async (deviceId, userId) => {
    const device = await Device.findOne({ where: { id: deviceId, userId } });
    if (!device) {
        throw new ServiceError('Device not found', 404);
    }
    return device;
};

export const createSnapshotRecord = async (payload, userId) => {
    const device = await findDeviceForUser(payload.deviceId, userId);
    const location = toGeoPoint(payload.latitude, payload.longitude);

    const snapshot = await TrackingSnapshot.create({
        deviceId: device.id,
        trackingId: payload.trackingId || null,
        capturedAt: payload.capturedAt ? new Date(payload.capturedAt) : new Date(),
        captureMode: payload.captureMode === 'auto' ? 'auto' : 'manual',
        location,
        altitude: payload.altitude ?? 0,
        speed: payload.speed ?? 0,
        heading: payload.heading ?? 0,
        hdop: payload.hdop ?? 0,
        satellites_count: payload.satellitesCount ?? payload.satellites_count ?? 0,
        satellites_used: payload.satellitesUsed ?? payload.satellites_used ?? 0,
        avg_cn0: payload.avgCn0 ?? payload.avg_cn0 ?? 0,
        note: payload.note ?? null,
        syncStatus: 'pending',
    });

    return {
        snapshot: await mapSnapshot(snapshot),
        uploadPath: resolveUploadPath(device.id, snapshot.id, payload.mimeType || 'image/jpeg'),
    };
};

export const uploadSnapshotFile = async (snapshotId, file, userId) => {
    const snapshot = await TrackingSnapshot.findByPk(snapshotId);
    if (!snapshot) {
        throw new ServiceError('Snapshot not found', 404);
    }

    await findDeviceForUser(snapshot.deviceId, userId);

    if (!file) {
        throw new ServiceError('Missing file upload', 400);
    }

    const uploadPath = resolveUploadPath(snapshot.deviceId, snapshot.id, file.mimetype);
    const { error } = await supabase.storage
        .from(SNAPSHOT_BUCKET)
        .upload(uploadPath, file.buffer, {
            contentType: file.mimetype,
            upsert: false,
        });

    if (error) {
        await snapshot.update({ syncStatus: 'failed' });
        throw new ServiceError(error.message || 'Failed to upload snapshot file', 500);
    }

    await snapshot.update({
        imageBucket: SNAPSHOT_BUCKET,
        imagePath: uploadPath,
        mimeType: file.mimetype,
        fileSizeBytes: file.size,
        syncStatus: 'uploaded',
    });

    const refreshed = await TrackingSnapshot.findByPk(snapshot.id);
    return await mapSnapshot(refreshed);
};

export const listSnapshotsByDevice = async (deviceId, userId, from, to, syncStatus) => {
    await findDeviceForUser(deviceId, userId);

    const where = { deviceId };
    if (from && to) {
        where.capturedAt = { [Op.between]: [new Date(from), new Date(to)] };
    } else if (from) {
        where.capturedAt = { [Op.gte]: new Date(from) };
    } else if (to) {
        where.capturedAt = { [Op.lte]: new Date(to) };
    }
    if (syncStatus) {
        where.syncStatus = syncStatus;
    }

    const snapshots = await TrackingSnapshot.findAll({
        where,
        order: [['capturedAt', 'DESC']],
        limit: 100,
    });

    const mapped = [];
    for (const snapshot of snapshots) {
        const result = await mapSnapshot(snapshot);
        if (result) {
            mapped.push(result);
        }
    }

    return mapped;
};

export const attachSnapshotToTracking = async (snapshotId, trackingId, userId) => {
    const snapshot = await TrackingSnapshot.findByPk(snapshotId);
    if (!snapshot) {
        throw new ServiceError('Snapshot not found', 404);
    }

    await findDeviceForUser(snapshot.deviceId, userId);

    const tracking = await Tracking.findOne({ where: { id: trackingId, deviceId: snapshot.deviceId } });
    if (!tracking) {
        throw new ServiceError('Tracking point not found for this device', 404);
    }

    await snapshot.update({ trackingId: tracking.id, syncStatus: 'synced' });
    const refreshed = await TrackingSnapshot.findByPk(snapshot.id);
    return await mapSnapshot(refreshed);
};

export const createMultipartBuffer = (filePath) => {
    return fs.readFileSync(path.resolve(filePath));
};